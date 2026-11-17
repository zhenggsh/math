import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TextbookService } from './textbook.service';
import { CreateKnowledgePointDto } from './dto/create-knowledge-point.dto';
import { UpdateKnowledgePointDto } from './dto/update-knowledge-point.dto';

@Injectable()
export class KnowledgePointService {
  private readonly logger = new Logger(KnowledgePointService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly textbookService: TextbookService,
  ) {}

  async create(
    textbookId: string,
    dto: CreateKnowledgePointDto,
  ): Promise<{
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
  }> {
    const parent = await this.prisma.knowledgePoint.findUnique({
      where: { id: dto.parentId },
    });

    if (!parent) {
      throw new NotFoundException(`父知识点不存在: ${dto.parentId}`);
    }
    if (parent.textbookId !== textbookId) {
      throw new BadRequestException('父知识点不属于当前教材');
    }

    const parentDepth = parent.code.split('.').length;
    if (parentDepth >= 3) {
      throw new BadRequestException('三级知识点不能再添加子节点');
    }

    const childDepth = dto.code.split('.').length;
    if (childDepth !== parentDepth + 1) {
      throw new BadRequestException(
        `子知识点层级必须是 ${parentDepth + 1} 级，但收到 ${childDepth} 级`,
      );
    }
    if (!dto.code.startsWith(`${parent.code}.`)) {
      throw new BadRequestException(
        `子知识点编号必须以父节点编号 "${parent.code}." 开头`,
      );
    }

    const existing = await this.prisma.knowledgePoint.findUnique({
      where: {
        idx_knowledge_point_code_textbook: {
          code: dto.code,
          textbookId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `当前教材中已存在编号为 ${dto.code} 的知识点`,
      );
    }

    const codeParts = dto.code.split('.');
    const level1 = codeParts[0] ?? parent.level1;
    const level2 =
      codeParts.length > 1 ? codeParts.slice(0, 2).join('.') : null;
    const level3 = codeParts.length > 2 ? dto.code : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const point = await tx.knowledgePoint.create({
        data: {
          code: dto.code,
          name: dto.name,
          level1,
          level2,
          level3,
          definition: dto.definition ?? null,
          characteristics: dto.characteristics ?? null,
          importanceLevel: dto.importanceLevel,
          textbookId,
        },
      });

      await this.textbookService.appendChildKnowledgePointBlock(
        dto.parentId,
        dto.code,
        dto.name,
      );

      return point;
    });

    return {
      id: created.id,
      code: created.code,
      level1: created.level1,
      level2: created.level2,
      level3: created.level3,
      definition: created.definition,
      characteristics: created.characteristics,
      importanceLevel: created.importanceLevel,
      contentRef: created.contentRef,
      textbookId: created.textbookId,
    };
  }

  async update(
    textbookId: string,
    id: string,
    dto: UpdateKnowledgePointDto,
  ): Promise<{
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
    markdownUpdated: boolean;
    markdownMessage?: string;
  }> {
    const point = await this.prisma.knowledgePoint.findUnique({
      where: { id },
    });

    if (!point) {
      throw new NotFoundException(`知识点不存在: ${id}`);
    }
    if (point.textbookId !== textbookId) {
      throw new BadRequestException('知识点不属于当前教材');
    }

    const newCode = dto.code ?? point.code;
    if (dto.code !== undefined && dto.code !== point.code) {
      const existing = await this.prisma.knowledgePoint.findUnique({
        where: {
          idx_knowledge_point_code_textbook: {
            code: dto.code,
            textbookId,
          },
        },
      });
      if (existing) {
        throw new ConflictException(
          `当前教材中已存在编号为 ${dto.code} 的知识点`,
        );
      }
    }

    const codeParts = newCode.split('.');
    const level1 = codeParts[0] ?? point.level1;
    const level2 =
      codeParts.length > 1 ? codeParts.slice(0, 2).join('.') : null;
    const level3 = codeParts.length > 2 ? newCode : null;

    const definitionProvided = dto.definition !== undefined;
    const characteristicsProvided = dto.characteristics !== undefined;

    let oldBody: string | null = null;
    try {
      oldBody = await this.textbookService.readKnowledgePointContentBlock(
        id,
        point.code,
        point.level1,
        point.level2,
      );
    } catch (err) {
      this.logger.warn(
        `读取知识点 ${point.code} 的旧 Markdown 内容块失败: ${(err as Error).message}`,
      );
    }

    const updated = await this.prisma.knowledgePoint.update({
      where: { id },
      data: {
        code: newCode,
        level1,
        level2,
        level3,
        name: dto.name === undefined ? point.name : dto.name,
        definition:
          dto.definition === undefined ? point.definition : dto.definition,
        characteristics:
          dto.characteristics === undefined
            ? point.characteristics
            : dto.characteristics,
        importanceLevel:
          dto.importanceLevel === undefined
            ? point.importanceLevel
            : dto.importanceLevel,
      },
    });

    let markdownUpdated = false;
    let markdownMessage: string | undefined;

    if (oldBody === null) {
      markdownUpdated = false;
      markdownMessage = `未找到编号 ${point.code} 对应的 Markdown 内容块，数据库已更新，文件未同步`;
      this.logger.warn(markdownMessage);
    } else {
      const body =
        definitionProvided || characteristicsProvided
          ? this.buildBodyFromFields(updated)
          : oldBody;
      const newBlock = this.buildMarkdownBlock(updated, body);
      try {
        markdownUpdated = await this.textbookService.updateContentInFileByCode(
          id,
          point.code,
          point.level1,
          point.level2,
          newBlock,
        );
        if (!markdownUpdated) {
          markdownMessage = `未找到编号 ${point.code} 对应的 Markdown 内容块，数据库已更新，文件未同步`;
          this.logger.warn(markdownMessage);
        }
      } catch (err) {
        this.logger.error(
          `更新知识点 ${point.code} 的 Markdown 内容块失败: ${(err as Error).message}`,
        );
        // 补偿回滚：文件写入失败时恢复数据库到更新前状态
        await this.prisma.knowledgePoint.update({
          where: { id },
          data: {
            code: point.code,
            name: point.name,
            level1: point.level1,
            level2: point.level2,
            level3: point.level3,
            definition: point.definition,
            characteristics: point.characteristics,
            importanceLevel: point.importanceLevel,
          },
        });
        throw new InternalServerErrorException(
          'Markdown 文件更新失败，数据库已回滚',
        );
      }
    }

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      level1: updated.level1,
      level2: updated.level2,
      level3: updated.level3,
      definition: updated.definition,
      characteristics: updated.characteristics,
      importanceLevel: updated.importanceLevel,
      contentRef: updated.contentRef,
      textbookId: updated.textbookId,
      markdownUpdated,
      markdownMessage,
    };
  }

  /**
   * 根据知识点层级生成 Markdown 标题行
   */
  private buildMarkdownHeading(point: {
    code: string;
    name: string | null;
  }): string {
    const codeParts = point.code.split('.');
    if (codeParts.length === 1) {
      return `## ${point.code} ${point.name ?? ''}`.trim();
    }
    if (codeParts.length === 2) {
      return `### ${point.code} ${point.name ?? ''}`.trim();
    }
    return `#### 知识点 ${point.code}：${point.name ?? ''}`.trim();
  }

  /**
   * 使用知识点字段构建 Markdown 正文
   */
  private buildBodyFromFields(point: {
    definition: string | null;
    characteristics: string | null;
  }): string {
    const lines: string[] = [];
    if (point.definition) {
      lines.push(point.definition);
    }
    if (point.characteristics) {
      if (lines.length > 0) {
        lines.push('');
      }
      lines.push(point.characteristics);
    }
    return lines.join('\n');
  }

  /**
   * 构建完整的 Markdown 内容块（标题 + 正文）
   */
  private buildMarkdownBlock(
    point: {
      code: string;
      name: string | null;
    },
    body: string,
  ): string {
    const heading = this.buildMarkdownHeading(point);
    if (!body) {
      return heading;
    }
    return `${heading}\n\n${body}`;
  }

  async delete(
    textbookId: string,
    id: string,
  ): Promise<{
    id: string;
    code: string;
  }> {
    const point = await this.prisma.knowledgePoint.findUnique({
      where: { id },
    });

    if (!point) {
      throw new NotFoundException(`知识点不存在: ${id}`);
    }
    if (point.textbookId !== textbookId) {
      throw new BadRequestException('知识点不属于当前教材');
    }

    const childCount = await this.prisma.knowledgePoint.count({
      where: {
        textbookId,
        code: { startsWith: `${point.code}.` },
      },
    });
    if (childCount > 0) {
      throw new BadRequestException('该知识点存在子节点，不能删除');
    }

    await this.prisma.knowledgePoint.delete({
      where: { id },
    });

    await this.textbookService.removeKnowledgePointBlock(id);

    return { id: point.id, code: point.code };
  }
}
