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
} from './types/textbook.types';
import * as fs from 'fs';

@Injectable()
export class TextbookService {
  private readonly logger = new Logger(TextbookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parserService: TextbookParserService,
    private readonly fileService: TextbookFileService,
  ) {}

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
    level3?: string | null,
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
        new RegExp(`^####\\s+知识点\\s+${this.escapeRegex(code)}\\s*[:：]`),
      );
      if (startMatch) {
        capturing = true;
        content = line + '\n';
        continue;
      }

      if (capturing) {
        const nextKpMatch = line.match(/^####\s+知识点\s+\d/);
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
        new RegExp(`^####\\s+知识点\\s+${this.escapeRegex(code)}\\s*[:：]`),
      );
      if (startMatch) {
        let endIndex = lines.length;
        for (let j = i + 1; j < lines.length; j++) {
          const nextKpMatch = lines[j].match(/^####\s+知识点\s+\d/);
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
