import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TextbookParserService } from './textbook-parser.service';
import { TextbookFileService } from './textbook-file.service';
import {
  TextbookFilePair,
  FrameworkType,
  RawKnowledgePoint,
  ValidationCheck,
  ValidationIssue,
  ValidationReport,
} from './types/textbook.types';
import type { ExpandKnowledgePointsResponse } from './dto/expand-knowledge-points.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TextbookService {
  private readonly logger = new Logger(TextbookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parserService: TextbookParserService,
    private readonly fileService: TextbookFileService,
  ) {}

  /**
   * 在 PostgreSQL 事务内为指定教材获取 advisory lock
   */
  private async withTextbookAdvisoryLock<T>(
    tx: any,
    textbookId: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    const key = this.hashTextbookId(textbookId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${key})`);
    return callback();
  }

  /**
   * 将教材 ID 哈希为一个 32 位正整数，用于 advisory lock key
   */
  private hashTextbookId(textbookId: string): number {
    let hash = 0;
    for (let i = 0; i < textbookId.length; i++) {
      const char = textbookId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * 同步所有教材
   * 扫描文件目录，与数据库同步
   */
  async syncAllTextbooks(): Promise<{
    added: string[];
    updated: string[];
    removed: string[];
  }> {
    this.logger.log('开始同步教材...');

    const result = {
      added: [] as string[],
      updated: [] as string[],
      removed: [] as string[],
    };

    // 1. 扫描文件目录
    const filePairs = this.fileService.scanTextbookFiles();

    // 2. 获取数据库中的教材
    const dbTextbooks = await this.prisma.textbook.findMany();
    const dbTextbookMap = new Map(dbTextbooks.map((t) => [t.fileName, t]));

    // 3. 处理新增和更新
    for (const [baseName, filePair] of filePairs) {
      const existing = dbTextbookMap.get(baseName);

      if (!existing) {
        // 新增教材
        await this.createTextbook(baseName, filePair);
        result.added.push(baseName);
      } else {
        // 检查是否需要更新（比较最后修改时间，或知识点数量为0时强制刷新）
        const dbModifiedAt = existing.lastModifiedAt.getTime();
        const fileModifiedAt = filePair.lastModifiedAt.getTime();
        const kpCount = await this.prisma.knowledgePoint.count({
          where: { textbookId: existing.id },
        });

        if (fileModifiedAt > dbModifiedAt || kpCount === 0) {
          await this.updateTextbook(existing.id, baseName, filePair);
          result.updated.push(baseName);
        }
      }

      // 从 map 中移除已处理的
      dbTextbookMap.delete(baseName);
    }

    // 4. 处理删除（数据库中有但文件目录中没有的）
    for (const [fileName, textbook] of dbTextbookMap) {
      await this.deleteTextbook(textbook.id);
      result.removed.push(fileName);
    }

    this.logger.log(
      `同步完成: 新增 ${result.added.length}, 更新 ${result.updated.length}, 删除 ${result.removed.length}`,
    );

    return result;
  }

  /**
   * 创建新教材
   */
  private async createTextbook(
    baseName: string,
    filePair: TextbookFilePair,
  ): Promise<void> {
    this.logger.log(`创建教材: ${baseName}`);

    // 解析框架文件
    const parseResult = this.parserService.parseFrameworkFile(
      this.fileService.getFilePath(filePair.frameworkPath),
      filePair.frameworkType,
    );

    if (!parseResult.success || !parseResult.data) {
      throw new BadRequestException(`解析框架文件失败: ${parseResult.error}`);
    }

    const knowledgePoints = parseResult.data;

    // 验证数据
    const validation =
      this.parserService.validateKnowledgePoints(knowledgePoints);
    if (!validation.valid) {
      throw new BadRequestException(
        `数据验证失败: ${validation.errors.join('; ')}`,
      );
    }

    // 创建教材和知识点（使用事务）
    await this.prisma.$transaction(async (tx) => {
      // 创建教材
      const textbook = await tx.textbook.create({
        data: {
          name: baseName,
          fileName: baseName,
          frameworkPath: filePair.frameworkPath,
          frameworkType: filePair.frameworkType,
          contentPath: filePair.contentPath,
          lastModifiedAt: filePair.lastModifiedAt,
        },
      });

      // 创建知识点
      await this.createKnowledgePoints(tx, textbook.id, knowledgePoints);
    });

    this.logger.log(`教材 ${baseName} 创建成功`);
  }

  /**
   * 更新教材
   */
  private async updateTextbook(
    textbookId: string,
    baseName: string,
    filePair: TextbookFilePair,
  ): Promise<void> {
    this.logger.log(`更新教材: ${baseName}`);

    // 解析框架文件
    const parseResult = this.parserService.parseFrameworkFile(
      this.fileService.getFilePath(filePair.frameworkPath),
      filePair.frameworkType,
    );

    if (!parseResult.success || !parseResult.data) {
      throw new BadRequestException(`解析框架文件失败: ${parseResult.error}`);
    }

    const knowledgePoints = parseResult.data;

    // 验证数据
    const validation =
      this.parserService.validateKnowledgePoints(knowledgePoints);
    if (!validation.valid) {
      throw new BadRequestException(
        `数据验证失败: ${validation.errors.join('; ')}`,
      );
    }

    // 更新教材和知识点（使用事务）
    await this.prisma.$transaction(async (tx) => {
      // 更新教材信息
      await tx.textbook.update({
        where: { id: textbookId },
        data: {
          frameworkPath: filePair.frameworkPath,
          frameworkType: filePair.frameworkType,
          contentPath: filePair.contentPath,
          lastModifiedAt: filePair.lastModifiedAt,
        },
      });

      // 删除旧的知识点
      await tx.knowledgePoint.deleteMany({
        where: { textbookId },
      });

      // 创建新的知识点
      await this.createKnowledgePoints(tx, textbookId, knowledgePoints);
    });

    this.logger.log(`教材 ${baseName} 更新成功`);
  }

  /**
   * 创建知识点
   */
  private async createKnowledgePoints(
    tx: any,
    textbookId: string,
    points: RawKnowledgePoint[],
  ): Promise<void> {
    if (points.length === 0) {
      return;
    }

    // 批量创建知识点
    const data = points.map((point) => ({
      code: point.code,
      name: point.name,
      level1: point.level1,
      level2: point.level2,
      level3: point.level3,
      definition: point.definition,
      characteristics: point.characteristics,
      importanceLevel: point.importanceLevel,
      textbookId,
    }));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await tx.knowledgePoint.createMany({
      data,
    });

    this.logger.log(`创建了 ${points.length} 个知识点`);
  }

  /**
   * 删除教材
   */
  private async deleteTextbook(textbookId: string): Promise<void> {
    this.logger.log(`删除教材: ${textbookId}`);

    await this.prisma.textbook.delete({
      where: { id: textbookId },
    });

    this.logger.log(`教材 ${textbookId} 删除成功`);
  }

  /**
   * 手动刷新指定教材
   */
  async refreshTextbook(textbookId: string): Promise<void> {
    const textbook = await this.prisma.textbook.findUnique({
      where: { id: textbookId },
    });

    if (!textbook) {
      throw new NotFoundException(`教材不存在: ${textbookId}`);
    }

    // 重新扫描文件
    const filePairs = this.fileService.scanTextbookFiles();
    const filePair = filePairs.get(textbook.fileName);

    if (!filePair) {
      throw new NotFoundException(`教材文件不存在: ${textbook.fileName}`);
    }

    await this.updateTextbook(textbookId, textbook.fileName, filePair);
  }

  /**
   * 获取所有教材列表
   */
  async findAll(): Promise<
    {
      id: string;
      name: string;
      fileName: string;
      frameworkType: FrameworkType;
      hasContent: boolean;
      knowledgePointCount: number;
      lastModifiedAt: Date;
      createdAt: Date;
    }[]
  > {
    const textbooks = await this.prisma.textbook.findMany({
      include: {
        _count: {
          select: {
            knowledgePoints: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return textbooks.map((t) => ({
      id: t.id,
      name: t.name,
      fileName: t.fileName,
      frameworkType: t.frameworkType as FrameworkType,
      hasContent: !!t.contentPath,
      knowledgePointCount: (
        t as unknown as { _count: { knowledgePoints: number } }
      )._count.knowledgePoints,
      lastModifiedAt: t.lastModifiedAt,
      createdAt: t.createdAt,
    }));
  }

  /**
   * 获取教材下的知识点列表
   */
  async getKnowledgePoints(textbookId: string): Promise<
    {
      id: string;
      code: string;
      name: string | null;
      level1: string;
      level2: string | null;
      level3: string | null;
      definition: string | null;
      characteristics: string | null;
      importanceLevel: string;
      contentRef: string | null;
      textbookId: string;
    }[]
  > {
    const textbook = await this.prisma.textbook.findUnique({
      where: { id: textbookId },
    });

    if (!textbook) {
      throw new NotFoundException(`教材不存在: ${textbookId}`);
    }

    const points = await this.prisma.knowledgePoint.findMany({
      where: { textbookId },
      orderBy: { code: 'asc' },
    });

    return points.map((point) => ({
      id: point.id,
      code: point.code,
      name: point.name,
      level1: point.level1,
      level2: point.level2,
      level3: point.level3,
      definition: point.definition,
      characteristics: point.characteristics,
      importanceLevel: point.importanceLevel,
      contentRef: point.contentRef,
      textbookId: point.textbookId,
    }));
  }

  /**
   * 获取知识点详情
   */
  async getKnowledgePointDetail(knowledgePointId: string): Promise<{
    id: string;
    code: string;
    name: string | null;
    level1: string;
    level2: string | null;
    level3: string | null;
    definition: string | null;
    characteristics: string | null;
    importanceLevel: string;
    contentRef: string | null;
    textbookId: string;
    content: string;
  }> {
    const point = await this.prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId },
    });

    if (!point) {
      throw new NotFoundException(`知识点不存在: ${knowledgePointId}`);
    }

    // 尝试从关联的教材内容文件中读取 Markdown 内容
    // 使用知识点编号（code）在 md 文件中定位对应内容块
    let content = await this.readContentFromFile(
      point.code,
      point.textbookId,
      point.level1,
      point.level2,
      point.level3,
    );

    // 如果文件内容为空，回退到 definition
    if (!content && point.definition) {
      content = point.definition;
    }

    return {
      id: point.id,
      code: point.code,
      name: point.name,
      level1: point.level1,
      level2: point.level2,
      level3: point.level3,
      definition: point.definition,
      characteristics: point.characteristics,
      importanceLevel: point.importanceLevel,
      contentRef: point.contentRef,
      textbookId: point.textbookId,
      content,
    };
  }

  /**
   * 从教材内容文件中读取知识点内容
   * 使用知识点编号（code）在 md 文件中匹配对应内容块
   * 支持一二级节点按 code 层级匹配（a / a.b / a.b.c）
   */

  private async readContentFromFile(
    code: string,
    textbookId: string,
    level1?: string | null,
    level2?: string | null,
    level3?: string | null, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<string> {
    try {
      const textbook = await this.prisma.textbook.findUnique({
        where: { id: textbookId },
      });

      if (!textbook || !textbook.contentPath) {
        return '';
      }

      const contentFilePath = this.fileService.getFilePath(
        textbook.contentPath,
      );
      if (!fs.existsSync(contentFilePath)) {
        return '';
      }

      const fileContent = fs.readFileSync(contentFilePath, 'utf-8');
      const lines = fileContent.split('\n');

      // 根据 code 层级选择匹配策略
      const codeParts = code.split('.');

      if (codeParts.length === 1) {
        // 一级知识点：先尝试 code 匹配，再回退到 level1 名称匹配
        return (
          this.matchByCodeLevel1(lines, code) ||
          this.matchByNameLevel1(lines, level1 || '')
        );
      }

      if (codeParts.length === 2) {
        // 二级知识点：先尝试 code 匹配，再回退到 level2 名称匹配
        return (
          this.matchByCodeLevel2(lines, code) ||
          this.matchByNameLevel2(lines, level2 || '')
        );
      }

      // 三级知识点：现有逻辑
      return this.matchByCodeLevel3(lines, code);
    } catch {
      return '';
    }
  }

  /**
   * 一级知识点：按 code 匹配（如 ## 第一章 / ## 1）
   */
  private matchByCodeLevel1(lines: string[], code: string): string {
    const patterns = [
      new RegExp(`^##\\s+.*第\\s*${this.escapeRegex(code)}\\s*章.*$`), // ## 第一章
      new RegExp(`^##\\s+${this.escapeRegex(code)}\\b.*$`), // ## 1 / ## 1.
    ];
    return this.matchByPatterns(lines, patterns, '##');
  }

  /**
   * 一级知识点：按名称匹配（如 ## 集合与函数概念）
   */
  private matchByNameLevel1(lines: string[], name: string): string {
    if (!name) return '';
    const patterns = [new RegExp(`^##\\s+.*${this.escapeRegex(name)}.*$`)];
    return this.matchByPatterns(lines, patterns, '##');
  }

  /**
   * 二级知识点：按 code 匹配（如 ### 1.1 集合）
   */
  private matchByCodeLevel2(lines: string[], code: string): string {
    const patterns = [
      new RegExp(`^###\\s+${this.escapeRegex(code)}\\b.*$`), // ### 1.1
    ];
    return this.matchByPatterns(lines, patterns, '###');
  }

  /**
   * 二级知识点：按名称匹配（如 ### 集合的概念）
   */
  private matchByNameLevel2(lines: string[], name: string): string {
    if (!name) return '';
    const patterns = [new RegExp(`^###\\s+.*${this.escapeRegex(name)}.*$`)];
    return this.matchByPatterns(lines, patterns, '###');
  }

  /**
   * 三级知识点：按 code 精确匹配（#### 知识点 1.1.1：标题）
   */
  private matchByCodeLevel3(lines: string[], code: string): string {
    let capturing = false;
    let content = '';

    for (const line of lines) {
      const startMatch = line.match(
        new RegExp(`^####\\s+(?:知识点\\s+)?${this.escapeRegex(code)}\\b`),
      );
      if (startMatch) {
        capturing = true;
        content = line + '\n';
        continue;
      }

      if (capturing) {
        const nextKpMatch = line.match(/^####\s+(?:知识点\s+)?\d/);
        const separatorMatch = line.match(/^---\s*$/);
        if (nextKpMatch || separatorMatch) {
          break;
        }
        content += line + '\n';
      }
    }

    return content.trim();
  }

  /**
   * 通用匹配：按正则模式匹配标题行，捕获到下一个同级或更高级标题
   */
  private matchByPatterns(
    lines: string[],
    patterns: RegExp[],
    currentLevel: string,
  ): string {
    let capturing = false;
    let content = '';
    const currentHashCount = currentLevel.length; // ## → 2, ### → 3

    for (const line of lines) {
      if (!capturing) {
        for (const pattern of patterns) {
          if (pattern.test(line)) {
            capturing = true;
            content = line + '\n';
            break;
          }
        }
        continue;
      }

      // 检测结束：下一个同级或更高级标题（# 数量 <= currentHashCount）
      const headingMatch = line.match(/^(#{1,6})\s+/);
      if (headingMatch && headingMatch[1].length <= currentHashCount) {
        break;
      }

      // 检测分隔线
      if (line.match(/^---\s*$/)) {
        break;
      }

      content += line + '\n';
    }

    return content.trim();
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 更新知识点在 MD 文件中的内容块
   * @param knowledgePointId 知识点ID
   * @param newContent 新内容（包含标题行）
   */
  async updateContentInFile(
    knowledgePointId: string,
    newContent: string,
  ): Promise<void> {
    const point = await this.prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId },
    });

    if (!point) {
      throw new NotFoundException(`知识点不存在: ${knowledgePointId}`);
    }

    const textbook = await this.prisma.textbook.findUnique({
      where: { id: point.textbookId },
    });

    if (!textbook || !textbook.contentPath) {
      throw new NotFoundException('教材内容文件不存在');
    }

    const filePath = this.fileService.getFilePath(textbook.contentPath);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('内容文件不存在');
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    const range = this.findContentBlockRange(
      lines,
      point.code,
      point.level1,
      point.level2,
    );

    if (!range) {
      throw new NotFoundException('无法在文件中找到对应内容块');
    }

    const newLines = [
      ...lines.slice(0, range.startIndex),
      newContent,
      ...lines.slice(range.endIndex),
    ];

    fs.writeFileSync(filePath, newLines.join('\n'));
    this.logger.log(`已更新知识点 ${point.code} 的内容`);
  }

  async removeKnowledgePointBlock(knowledgePointId: string): Promise<void> {
    const point = await this.prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId },
    });
    if (!point) {
      throw new NotFoundException(`知识点不存在: ${knowledgePointId}`);
    }

    const textbook = await this.prisma.textbook.findUnique({
      where: { id: point.textbookId },
    });
    if (!textbook || !textbook.contentPath) {
      throw new NotFoundException('教材内容文件不存在');
    }

    const filePath = this.fileService.getFilePath(textbook.contentPath);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('内容文件不存在');
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    const range = this.findContentBlockRange(
      lines,
      point.code,
      point.level1,
      point.level2,
    );

    if (!range) {
      this.logger.warn(`无法找到知识点 ${point.code} 的内容块，跳过文件清理`);
      return;
    }

    const newLines = [
      ...lines.slice(0, range.startIndex),
      ...lines.slice(range.endIndex),
    ];

    fs.writeFileSync(filePath, newLines.join('\n'));
    this.logger.log(`已删除知识点 ${point.code} 的内容块`);
  }

  /**
   * 在教材 MD 文件中为父知识点追加子知识点占位块
   */
  async appendChildKnowledgePointBlock(
    parentId: string,
    childCode: string,
    childName: string,
  ): Promise<void> {
    const parent = await this.prisma.knowledgePoint.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw new NotFoundException(`知识点不存在: ${parentId}`);
    }

    const textbook = await this.prisma.textbook.findUnique({
      where: { id: parent.textbookId },
    });
    if (!textbook || !textbook.contentPath) {
      throw new NotFoundException('教材内容文件不存在');
    }

    const filePath = this.fileService.getFilePath(textbook.contentPath);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('内容文件不存在');
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    const range = this.findContentBlockRange(
      lines,
      parent.code,
      parent.level1,
      parent.level2,
    );

    const codeParts = childCode.split('.');
    const placeholderLines: string[] = [];

    if (codeParts.length === 2) {
      // 二级知识点
      placeholderLines.push(
        `### ${childCode} ${childName}`,
        '',
        '[待输入]',
        '',
      );
    } else if (codeParts.length === 3) {
      // 三级知识点
      placeholderLines.push(
        `#### 知识点 ${childCode}：${childName}`,
        '',
        '[待输入]',
        '',
      );
    } else {
      throw new BadRequestException(`不支持的子知识点层级: ${childCode}`);
    }

    const insertIndex = range ? range.endIndex : lines.length;
    const newLines = [
      ...lines.slice(0, insertIndex),
      ...placeholderLines,
      ...lines.slice(insertIndex),
    ];

    fs.writeFileSync(filePath, newLines.join('\n'));
    this.logger.log(`已为知识点 ${parent.code} 追加子知识点 ${childCode}`);
  }

  /**
   * 查找内容块在文件中的起始和结束行索引
   * @returns { startIndex, endIndex }，endIndex 为不包含
   */
  private findContentBlockRange(
    lines: string[],
    code: string,
    level1?: string | null,
    level2?: string | null,
  ): { startIndex: number; endIndex: number } | null {
    const codeParts = code.split('.');

    if (codeParts.length === 1) {
      return (
        this.findBlockRangeByCodeLevel1(lines, code) ||
        this.findBlockRangeByNameLevel1(lines, level1 || '')
      );
    }

    if (codeParts.length === 2) {
      return (
        this.findBlockRangeByCodeLevel2(lines, code) ||
        this.findBlockRangeByNameLevel2(lines, level2 || '')
      );
    }

    return this.findBlockRangeByCodeLevel3(lines, code);
  }

  private findBlockRangeByCodeLevel1(
    lines: string[],
    code: string,
  ): { startIndex: number; endIndex: number } | null {
    const patterns = [
      new RegExp(`^##\\s+.*第\\s*${this.escapeRegex(code)}\\s*章.*$`),
      new RegExp(`^##\\s+${this.escapeRegex(code)}\\b.*$`),
    ];
    return this.findBlockRangeByPatterns(lines, patterns, '##');
  }

  private findBlockRangeByNameLevel1(
    lines: string[],
    name: string,
  ): { startIndex: number; endIndex: number } | null {
    if (!name) return null;
    const patterns = [new RegExp(`^##\\s+.*${this.escapeRegex(name)}.*$`)];
    return this.findBlockRangeByPatterns(lines, patterns, '##');
  }

  private findBlockRangeByCodeLevel2(
    lines: string[],
    code: string,
  ): { startIndex: number; endIndex: number } | null {
    const patterns = [new RegExp(`^###\\s+${this.escapeRegex(code)}\\b.*$`)];
    return this.findBlockRangeByPatterns(lines, patterns, '###');
  }

  private findBlockRangeByNameLevel2(
    lines: string[],
    name: string,
  ): { startIndex: number; endIndex: number } | null {
    if (!name) return null;
    const patterns = [new RegExp(`^###\\s+.*${this.escapeRegex(name)}.*$`)];
    return this.findBlockRangeByPatterns(lines, patterns, '###');
  }

  private findBlockRangeByCodeLevel3(
    lines: string[],
    code: string,
  ): { startIndex: number; endIndex: number } | null {
    for (let i = 0; i < lines.length; i++) {
      const startMatch = lines[i].match(
        new RegExp(`^####\\s+(?:知识点\\s+)?${this.escapeRegex(code)}\\b`),
      );
      if (startMatch) {
        let endIndex = lines.length;
        for (let j = i + 1; j < lines.length; j++) {
          const nextKpMatch = lines[j].match(/^####\s+(?:知识点\s+)?\d/);
          const separatorMatch = lines[j].match(/^---\s*$/);
          const headingMatch = lines[j].match(/^(#{1,3})\s+/);
          if (nextKpMatch || separatorMatch || headingMatch) {
            endIndex = j;
            break;
          }
        }
        return { startIndex: i, endIndex };
      }
    }
    return null;
  }

  private findBlockRangeByPatterns(
    lines: string[],
    patterns: RegExp[],
    currentLevel: string,
  ): { startIndex: number; endIndex: number } | null {
    const currentHashCount = currentLevel.length;
    for (let i = 0; i < lines.length; i++) {
      for (const pattern of patterns) {
        if (pattern.test(lines[i])) {
          let endIndex = lines.length;
          for (let j = i + 1; j < lines.length; j++) {
            const headingMatch = lines[j].match(/^(#{1,6})\s+/);
            if (headingMatch && headingMatch[1].length <= currentHashCount) {
              endIndex = j;
              break;
            }
            if (lines[j].match(/^---\s*$/)) {
              endIndex = j;
              break;
            }
          }
          return { startIndex: i, endIndex };
        }
      }
    }
    return null;
  }

  /**
   * 将新知识点内容块追加/插入到 md 内容中
   */
  private appendMdContent(
    fileContent: string,
    newBlocks: {
      code: string;
      level1: string;
      level2: string | null;
      level3: string | null;
      name: string;
      content: string;
    }[],
  ): string {
    const lines = fileContent.split('\n');

    for (const block of newBlocks) {
      const codeParts = block.code.split('.');
      const heading =
        codeParts.length === 1
          ? `## ${block.code} ${block.name}`
          : codeParts.length === 2
            ? `### ${block.code} ${block.name}`
            : `#### 知识点 ${block.code}：${block.name}`;
      const blockLines = [heading, '', block.content, ''];

      const insertIndex = this.findInsertIndexForCode(lines, block.code);
      lines.splice(insertIndex, 0, ...blockLines);
    }

    return lines.join('\n');
  }

  /**
   * 根据 code 层级找到最佳插入位置（父节点内容块结束之前）
   * 找不到父节点时返回文件末尾
   */
  private findInsertIndexForCode(lines: string[], code: string): number {
    const codeParts = code.split('.');

    // Level 3: insert before the end of the parent level-2 block
    if (codeParts.length >= 3) {
      const parentCode = codeParts.slice(0, 2).join('.');
      const parentRange = this.findBlockRangeByCodeLevel2(lines, parentCode);
      if (parentRange) {
        return parentRange.endIndex;
      }
    }

    // Level 2: insert before the end of the parent level-1 block
    if (codeParts.length === 2) {
      const parentCode = codeParts[0];
      const parentRange = this.findBlockRangeByCodeLevel1(lines, parentCode);
      if (parentRange) {
        return parentRange.endIndex;
      }
    }

    // Level 1 or parent not found: append to end
    return lines.length;
  }

  /**
   * 共享的解析与校验逻辑
   * 解析框架和 md 文件，执行所有校验，但不修改数据库或原文件
   */
  private async prepareExpansion(
    textbookId: string,
    frameworkFile: Express.Multer.File,
    contentFile: Express.Multer.File,
  ): Promise<{
    report: ValidationReport;
    textbook: {
      id: string;
      frameworkPath: string;
      contentPath: string | null;
      fileName: string;
    };
    frameworkType: FrameworkType;
    newPoints: RawKnowledgePoint[];
    explicitCodes: Set<string>;
    mdContent: string;
  }> {
    const textbook = await this.prisma.textbook.findUnique({
      where: { id: textbookId },
    });

    if (!textbook) {
      throw new NotFoundException(`教材不存在: ${textbookId}`);
    }

    const frameworkType = frameworkFile.originalname
      .toLowerCase()
      .endsWith('.xlsx')
      ? 'xlsx'
      : 'csv';

    const tempFrameworkPath = await this.fileService.saveTempFile(
      frameworkFile.buffer,
      path.extname(frameworkFile.originalname),
    );
    const tempContentPath = await this.fileService.saveTempFile(
      contentFile.buffer,
      '.md',
    );

    try {
      const parseResult = this.parserService.parseFrameworkFile(
        tempFrameworkPath,
        frameworkType,
      );

      const errors: ValidationIssue[] = [];
      const checks: ValidationCheck[] = [];
      const addCheck = (
        key: string,
        label: string,
        checkErrors: ValidationIssue[],
      ): void => {
        checks.push({
          key,
          label,
          passed: checkErrors.length === 0,
          errors: checkErrors,
        });
        errors.push(...checkErrors);
      };

      if (
        !parseResult.success ||
        !parseResult.data ||
        !parseResult.rawRecords
      ) {
        addCheck('parse', '框架文件可正常解析', [
          {
            type: 'xlsx',
            location: { file: 'xlsx' },
            message: `解析框架文件失败: ${parseResult.error}`,
          },
        ]);
        return {
          report: { valid: false, errors, checks },
          textbook: {
            id: textbook.id,
            frameworkPath: textbook.frameworkPath,
            contentPath: textbook.contentPath,
            fileName: textbook.fileName,
          },
          frameworkType,
          newPoints: [],
          explicitCodes: new Set<string>(),
          mdContent: '',
        };
      }

      checks.push({
        key: 'parse',
        label: '框架文件可正常解析',
        passed: true,
        errors: [],
      });

      const newPoints = parseResult.data;
      const explicitCodes = new Set(parseResult.explicitCodes ?? []);
      const rawRecords = parseResult.rawRecords;

      // 检查项：必需列完整
      const columnValidation =
        this.parserService.validateRequiredColumns(rawRecords);
      addCheck(
        'columns',
        '包含必需列（知识点编号、一级知识点）',
        columnValidation.valid
          ? []
          : columnValidation.errors.map((msg) => ({
              type: 'xlsx' as const,
              location: { file: 'xlsx' as const },
              message: msg,
            })),
      );

      // 检查项：行数据完整、编号格式正确 / 无重复编号
      // （validateExplicitRecords 与 validateKnowledgePoints 均可能产出"重复"类错误，
      //   按 message 分类归并到对应检查项）
      const recordErrors =
        this.parserService.validateExplicitRecords(rawRecords);
      const kpValidation =
        this.parserService.validateKnowledgePoints(newPoints);
      const kpIssues: ValidationIssue[] = kpValidation.errors.map((msg) => ({
        type: 'xlsx' as const,
        location: { file: 'xlsx' as const },
        message: msg,
      }));
      const formatIssues = [
        ...recordErrors.filter((e) => !e.message.includes('重复')),
        ...kpIssues.filter((e) => !e.message.includes('重复')),
      ];
      const duplicateIssues = [
        ...recordErrors.filter((e) => e.message.includes('重复')),
        ...kpIssues.filter((e) => e.message.includes('重复')),
      ];
      addCheck('code-format', '行数据完整且编号为数字层级格式', formatIssues);
      addCheck('duplicates', '无重复知识点编号', duplicateIssues);

      // 检查项：新编号不与数据库已有编号冲突（仅 explicit codes）
      const existingPoints = await this.prisma.knowledgePoint.findMany({
        where: { textbookId },
        select: { code: true },
      });
      const existingCodes = new Set(existingPoints.map((p) => p.code));
      const dbConflictIssues: ValidationIssue[] = [...explicitCodes]
        .filter((code) => existingCodes.has(code))
        .map((code) => ({
          type: 'xlsx' as const,
          location: { file: 'xlsx' as const, code },
          message: `知识点编号 "${code}" 已在当前教材中存在`,
        }));
      addCheck(
        'db-conflicts',
        '新编号不与当前教材已有编号冲突',
        dbConflictIssues,
      );

      // 检查项：上级编号已存在
      // 可用编号 = 数据库已有编号 ∪ 本次上传的 explicit 编号；
      // 本次上传自动生成的骨架父编号不计入（详见 design D4）
      const availableCodes = new Set([...existingCodes, ...explicitCodes]);
      const parentIssues: ValidationIssue[] = [];
      for (const code of explicitCodes) {
        const parts = code.split('.');
        if (parts.length >= 2) {
          const parentCode = parts.slice(0, -1).join('.');
          if (!availableCodes.has(parentCode)) {
            parentIssues.push({
              type: 'xlsx',
              location: { file: 'xlsx', code },
              message: `编号 "${code}" 的上级编号 "${parentCode}" 在当前教材中不存在`,
            });
          }
        }
      }
      addCheck('parents', '上级编号在当前教材中已存在', parentIssues);

      const mdContent = contentFile.buffer
        .toString('utf-8')
        .replace(new RegExp(`^${String.fromCharCode(0xfeff)}`), '');

      // 检查项：内容文件非空
      addCheck(
        'md-empty',
        '内容文件非空',
        mdContent.trim() === ''
          ? [
              {
                type: 'md',
                location: { file: 'md' },
                message: '内容文件为空',
              },
            ]
          : [],
      );

      // 检查项：md 编号均在框架文件中存在
      const mdCodes = this.parserService.extractMdCodes(mdContent);
      const xlsxCodes = new Set(newPoints.map((p) => p.code));
      const mdCodeIssues: ValidationIssue[] = mdCodes
        .filter((code) => !xlsxCodes.has(code))
        .map((code) => ({
          type: 'md' as const,
          location: { file: 'md' as const, code },
          message: `md 中的知识点编号 ${code} 在框架文件中不存在`,
        }));
      addCheck('md-codes', '内容文件编号均在框架文件中存在', mdCodeIssues);

      // 检查项：标题级别正确（一级 ##、二级 ###、三级 ####，即 # 数量 = 编号层级 + 1）
      // 统一匹配所有携带编号的标题行，避免漏检 ## 等错误层级
      const mdHeadingIssues: ValidationIssue[] = [];
      mdContent.split('\n').forEach((line, index) => {
        const heading = line.match(
          /^(#{2,6})\s+(?:知识点\s+)?(\d+(?:\.\d+)*)\b/,
        );
        if (!heading) {
          return;
        }
        const hashCount = heading[1].length;
        const code = heading[2];
        const codeLevel = code.split('.').length;
        const expectedHashCount = codeLevel + 1;
        if (hashCount !== expectedHashCount) {
          mdHeadingIssues.push({
            type: 'md',
            location: { file: 'md', row: index + 1, code },
            message: `第 ${index + 1} 行：编号 "${code}"（${codeLevel} 级）应使用 ${'#'.repeat(expectedHashCount)} 标题而非 ${heading[1]}`,
          });
        }
      });
      addCheck(
        'md-headings',
        '标题级别正确（一级 ##、二级 ###、三级 ####）',
        mdHeadingIssues,
      );

      const report: ValidationReport = {
        valid: errors.length === 0,
        errors,
        checks,
      };

      return {
        report,
        textbook: {
          id: textbook.id,
          frameworkPath: textbook.frameworkPath,
          contentPath: textbook.contentPath,
          fileName: textbook.fileName,
        },
        frameworkType,
        newPoints,
        explicitCodes,
        mdContent,
      };
    } finally {
      await this.fileService.deleteTempFile(tempFrameworkPath);
      await this.fileService.deleteTempFile(tempContentPath);
    }
  }

  /**
   * 校验扩充文件
   * 仅解析和校验，不修改数据库或文件
   */
  async validateExpansionFiles(
    textbookId: string,
    frameworkFile: Express.Multer.File,
    contentFile: Express.Multer.File,
  ): Promise<ValidationReport> {
    const { report } = await this.prepareExpansion(
      textbookId,
      frameworkFile,
      contentFile,
    );
    return report;
  }

  /**
   * 扩充教材知识点
   * 在编号不冲突的前提下，把新知识点写入 DB 并追加到原 xlsx/md 文件
   */
  async expandKnowledgePoints(
    textbookId: string,
    frameworkFile: Express.Multer.File,
    contentFile: Express.Multer.File,
  ): Promise<ExpandKnowledgePointsResponse> {
    const { report, textbook, newPoints, explicitCodes, mdContent } =
      await this.prepareExpansion(textbookId, frameworkFile, contentFile);

    if (!report.valid) {
      throw new BadRequestException(
        `数据校验失败: ${report.errors.map((e) => e.message).join('; ')}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      return this.withTextbookAdvisoryLock(tx, textbookId, async () => {
        const existingPoints = await tx.knowledgePoint.findMany({
          where: { textbookId },
          select: { code: true },
        });
        const existingCodes = new Set(existingPoints.map((p) => p.code));
        const conflicts = newPoints.filter(
          (p) => explicitCodes.has(p.code) && existingCodes.has(p.code),
        );

        if (conflicts.length > 0) {
          throw new ConflictException(
            `以下知识点编号已存在: ${conflicts.map((p) => p.code).join(', ')}`,
          );
        }

        const pointsToCreate = newPoints.filter(
          (p) => !existingCodes.has(p.code),
        );

        // 与真实教材框架 sheet 表头一致（编号在最后，无“知识点名称”列）
        const headers = [
          '一级知识点',
          '二级知识点',
          '三级知识点',
          '定义',
          '特性',
          '重要性级别',
          '知识点编号',
        ];
        const xlsxRows = pointsToCreate.map((p) => [
          p.level1,
          p.level2 || '',
          p.level3 || '',
          p.definition || '',
          p.characteristics || '',
          p.importanceLevel,
          p.code,
        ]);
        // 按原教材框架文件类型追加：xlsx 走 SheetJS，csv 走纯文本追加（避免编码损坏）
        if (this.fileService.getFileType(textbook.frameworkPath) === 'csv') {
          this.fileService.appendCsvRows(textbook.frameworkPath, xlsxRows);
        } else {
          this.fileService.appendXlsxRows(
            textbook.frameworkPath,
            headers,
            xlsxRows,
          );
        }

        let contentPath = textbook.contentPath;
        if (!contentPath) {
          contentPath = `${textbook.fileName}.md`;
          fs.writeFileSync(
            this.fileService.getFilePath(contentPath),
            mdContent,
          );
          await tx.textbook.update({
            where: { id: textbookId },
            data: { contentPath },
          });
        }

        const existingMdContent = fs.readFileSync(
          this.fileService.getFilePath(contentPath),
          'utf-8',
        );
        const mdBlocks = pointsToCreate
          .filter((p) => p.code.split('.').length >= 3)
          .map((p) => ({
            code: p.code,
            level1: p.level1,
            level2: p.level2 || p.level1,
            level3: p.level3 || p.code,
            name: p.name || p.level3 || p.code,
            content:
              this.extractMdContentForCode(mdContent, p.code) || '[待输入]',
          }));
        const newMdContent = this.appendMdContent(existingMdContent, mdBlocks);
        fs.writeFileSync(
          this.fileService.getFilePath(contentPath),
          newMdContent,
        );

        await tx.knowledgePoint.createMany({
          data: pointsToCreate.map((p) => ({
            code: p.code,
            name: p.name,
            level1: p.level1,
            level2: p.level2 || null,
            level3: p.level3 || null,
            definition: p.definition || null,
            characteristics: p.characteristics || null,
            importanceLevel: p.importanceLevel,
            textbookId,
          })),
        });

        await tx.textbook.update({
          where: { id: textbookId },
          data: { lastModifiedAt: new Date() },
        });

        return {
          success: true,
          message: `成功新增 ${pointsToCreate.length} 个知识点`,
          data: {
            addedCodes: pointsToCreate.map((p) => p.code),
            count: pointsToCreate.length,
          },
        };
      });
    });
  }

  /**
   * 从 md 内容中提取指定 code 的详细内容块
   */
  private extractMdContentForCode(
    mdContent: string,
    code: string,
  ): string | null {
    const lines = mdContent.split('\n');
    const codeParts = code.split('.');

    let startIndex = -1;
    if (codeParts.length >= 3) {
      const level3Pattern = new RegExp(
        `^####\\s+(?:知识点\\s+)?${this.escapeRegex(code)}\\b`,
      );
      for (let i = 0; i < lines.length; i++) {
        if (level3Pattern.test(lines[i])) {
          startIndex = i;
          break;
        }
      }
    } else if (codeParts.length === 2) {
      const level2Pattern = new RegExp(`^###\\s+${this.escapeRegex(code)}\\b`);
      for (let i = 0; i < lines.length; i++) {
        if (level2Pattern.test(lines[i])) {
          startIndex = i;
          break;
        }
      }
    } else {
      const level1Pattern = new RegExp(`^##\\s+${this.escapeRegex(code)}\\b`);
      for (let i = 0; i < lines.length; i++) {
        if (level1Pattern.test(lines[i])) {
          startIndex = i;
          break;
        }
      }
    }

    if (startIndex === -1) {
      return null;
    }

    const contentLines: string[] = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^(#{1,4})\s+/) || line.match(/^---\s*$/)) {
        break;
      }
      contentLines.push(line);
    }

    return contentLines.join('\n').trim() || null;
  }

  /**
   * 获取教材详情
   */
  async findOne(textbookId: string): Promise<{
    id: string;
    name: string;
    fileName: string;
    frameworkType: FrameworkType;
    frameworkPath: string;
    contentPath: string | null;
    hasContent: boolean;
    knowledgePointCount: number;
    lastModifiedAt: Date;
    createdAt: Date;
  }> {
    const textbook = await this.prisma.textbook.findUnique({
      where: { id: textbookId },
      include: {
        _count: {
          select: {
            knowledgePoints: true,
          },
        },
      },
    });

    if (!textbook) {
      throw new NotFoundException(`教材不存在: ${textbookId}`);
    }

    return {
      id: textbook.id,
      name: textbook.name,
      fileName: textbook.fileName,
      frameworkType: textbook.frameworkType as FrameworkType,
      frameworkPath: textbook.frameworkPath,
      contentPath: textbook.contentPath,
      hasContent: !!textbook.contentPath,
      knowledgePointCount: textbook._count.knowledgePoints,
      lastModifiedAt: textbook.lastModifiedAt,
      createdAt: textbook.createdAt,
    };
  }

  /**
   * 删除教材（带文件）
   */
  async remove(textbookId: string): Promise<void> {
    const textbook = await this.prisma.textbook.findUnique({
      where: { id: textbookId },
    });

    if (!textbook) {
      throw new NotFoundException(`教材不存在: ${textbookId}`);
    }

    // 删除关联的文件
    await this.fileService.deleteFile(textbook.frameworkPath);
    if (textbook.contentPath) {
      await this.fileService.deleteFile(textbook.contentPath);
    }

    // 删除数据库记录（知识点会通过级联删除自动删除）
    await this.prisma.textbook.delete({
      where: { id: textbookId },
    });

    this.logger.log(`教材 ${textbook.fileName} 及其文件已删除`);
  }

  /**
   * 处理文件上传
   */
  async handleFileUpload(
    baseName: string,
    frameworkFile: Express.Multer.File,
    contentFile?: Express.Multer.File,
  ): Promise<void> {
    // 检查是否已存在
    const existing = await this.prisma.textbook.findUnique({
      where: { fileName: baseName },
    });

    if (existing) {
      throw new ConflictException(`教材 ${baseName} 已存在`);
    }

    // 保存框架文件
    await this.fileService.saveFile(
      frameworkFile.originalname,
      frameworkFile.buffer,
    );

    // 保存内容文件（如果有）
    if (contentFile) {
      await this.fileService.saveFile(
        contentFile.originalname,
        contentFile.buffer,
      );
    }

    // 获取文件类型
    const frameworkType = this.fileService.getFileType(
      frameworkFile.originalname,
    );

    if (!frameworkType) {
      throw new BadRequestException('不支持的框架文件类型');
    }

    // 构建文件对
    const filePair: TextbookFilePair = {
      frameworkPath: frameworkFile.originalname,
      frameworkType,
      contentPath: contentFile?.originalname,
      lastModifiedAt: new Date(),
    };

    // 创建教材
    await this.createTextbook(baseName, filePair);
  }
}
