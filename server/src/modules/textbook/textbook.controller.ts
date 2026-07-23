import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { TextbookService } from './textbook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FrameworkType } from './types/textbook.types';
import type {
  FrameworkFileContent,
  ContentFileContent,
} from './types/textbook.types';
import { ExpandKnowledgePointsResponse } from './dto/expand-knowledge-points.dto';
import { ValidateKnowledgePointsResponse } from './dto/validate-knowledge-points.dto';

interface FileFields {
  framework?: Express.Multer.File[];
  content?: Express.Multer.File[];
}

interface TextbookListResponse {
  id: string;
  name: string;
  fileName: string;
  frameworkType: FrameworkType;
  hasContent: boolean;
  knowledgePointCount: number;
  lastModifiedAt: Date;
  createdAt: Date;
}

interface TextbookDetailResponse extends TextbookListResponse {
  frameworkPath: string;
  contentPath: string | null;
}

interface SyncResponse {
  success: boolean;
  data: {
    added: string[];
    updated: string[];
    removed: string[];
  };
}

interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    fileName: string;
    frameworkType: FrameworkType;
  };
}

interface RefreshResponse {
  success: boolean;
  message: string;
}

interface KnowledgePointsResponse {
  success: boolean;
  data: {
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
  }[];
}

interface DeleteResponse {
  success: boolean;
  message: string;
}

@Controller('textbooks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TextbookController {
  constructor(private readonly textbookService: TextbookService) {}

  /**
   * 获取所有教材列表
   */
  @Get()
  @Roles(Role.TEACHER, Role.ADMIN, Role.STUDENT)
  async findAll(): Promise<{ success: boolean; data: TextbookListResponse[] }> {
    const textbooks = await this.textbookService.findAll();
    return {
      success: true,
      data: textbooks,
    };
  }

  /**
   * 获取教材详情
   */
  @Get(':id')
  @Roles(Role.TEACHER, Role.ADMIN, Role.STUDENT)
  async findOne(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: TextbookDetailResponse }> {
    const textbook = await this.textbookService.findOne(id);
    return {
      success: true,
      data: textbook,
    };
  }

  /**
   * 获取教材框架文件内容（iksm 磁盘文件预览）
   */
  @Get(':id/framework-file')
  @Roles(Role.TEACHER, Role.ADMIN)
  async getFrameworkFile(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: FrameworkFileContent }> {
    const data = await this.textbookService.getFrameworkFileContent(id);
    return { success: true, data };
  }

  /**
   * 获取教材内容文件原文（iksm 磁盘 md 文件预览）
   */
  @Get(':id/content-file')
  @Roles(Role.TEACHER, Role.ADMIN)
  async getContentFile(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: ContentFileContent }> {
    const data = await this.textbookService.getContentFileContent(id);
    return { success: true, data };
  }

  /**
   * 同步所有教材
   * 扫描文件目录，与数据库同步
   */
  @Post('sync')
  @Roles(Role.TEACHER, Role.ADMIN)
  async syncAll(): Promise<SyncResponse> {
    const result = await this.textbookService.syncAllTextbooks();
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 刷新指定教材
   */
  @Post(':id/refresh')
  @Roles(Role.TEACHER, Role.ADMIN)
  async refresh(@Param('id') id: string): Promise<RefreshResponse> {
    await this.textbookService.refreshTextbook(id);
    return {
      success: true,
      message: '教材刷新成功',
    };
  }

  /**
   * 上传教材文件
   */
  @Post('upload')
  @Roles(Role.TEACHER, Role.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'framework', maxCount: 1 },
      { name: 'content', maxCount: 1 },
    ]),
  )
  async upload(
    @UploadedFiles() files: FileFields,
    @Body('baseName') baseName?: string,
  ): Promise<UploadResponse> {
    // 检查框架文件
    if (!files.framework || files.framework.length === 0) {
      throw new BadRequestException('必须上传框架文件 (.xlsx 或 .csv)');
    }

    const frameworkFile = files.framework[0];

    // 验证文件类型
    const validFrameworkTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!validFrameworkTypes.includes(frameworkFile.mimetype)) {
      throw new BadRequestException(
        '框架文件必须是 Excel (.xlsx) 或 CSV (.csv) 格式',
      );
    }

    // 验证内容文件类型（如果有）
    const contentFile = files.content?.[0];
    if (contentFile) {
      if (
        contentFile.mimetype !== 'text/markdown' &&
        !contentFile.originalname.endsWith('.md')
      ) {
        throw new BadRequestException('内容文件必须是 Markdown (.md) 格式');
      }
    }

    // 使用提供的 baseName 或从文件名提取
    const fileBaseName =
      baseName || this.extractBaseName(frameworkFile.originalname);

    if (!fileBaseName) {
      throw new BadRequestException(
        '无法从文件名提取教材名称，请提供 baseName 参数',
      );
    }

    // 处理上传
    await this.textbookService.handleFileUpload(
      fileBaseName,
      frameworkFile,
      contentFile,
    );

    // 确定框架类型
    const frameworkType: FrameworkType = frameworkFile.originalname
      .toLowerCase()
      .endsWith('.xlsx')
      ? 'xlsx'
      : 'csv';

    return {
      success: true,
      message: '教材上传成功',
      data: {
        fileName: fileBaseName,
        frameworkType,
      },
    };
  }

  /**
   * 扩充教材知识点
   */
  @Post(':id/expand')
  @Roles(Role.TEACHER, Role.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'framework', maxCount: 1 },
      { name: 'content', maxCount: 1 },
    ]),
  )
  async expand(
    @Param('id') id: string,
    @UploadedFiles() files: FileFields,
  ): Promise<ExpandKnowledgePointsResponse> {
    if (!files.framework || files.framework.length === 0) {
      throw new BadRequestException('必须上传框架文件 (.xlsx 或 .csv)');
    }
    if (!files.content || files.content.length === 0) {
      throw new BadRequestException('必须上传内容文件 (.md)');
    }

    const frameworkFile = files.framework[0];
    const contentFile = files.content[0];

    if (!this.isFrameworkFile(frameworkFile.originalname)) {
      throw new BadRequestException('框架文件必须是 .xlsx 或 .csv 格式');
    }
    if (!contentFile.originalname.toLowerCase().endsWith('.md')) {
      throw new BadRequestException('内容文件必须是 .md 格式');
    }

    return this.textbookService.expandKnowledgePoints(
      id,
      frameworkFile,
      contentFile,
    );
  }

  /**
   * 校验扩充文件
   */
  @Post(':id/validate')
  @Roles(Role.TEACHER, Role.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'framework', maxCount: 1 },
      { name: 'content', maxCount: 1 },
    ]),
  )
  async validate(
    @Param('id') id: string,
    @UploadedFiles() files: FileFields,
  ): Promise<ValidateKnowledgePointsResponse> {
    if (!files.framework || files.framework.length === 0) {
      throw new BadRequestException('必须上传框架文件 (.xlsx 或 .csv)');
    }
    if (!files.content || files.content.length === 0) {
      throw new BadRequestException('必须上传内容文件 (.md)');
    }

    const frameworkFile = files.framework[0];
    const contentFile = files.content[0];

    if (!this.isFrameworkFile(frameworkFile.originalname)) {
      throw new BadRequestException('框架文件必须是 .xlsx 或 .csv 格式');
    }
    if (!contentFile.originalname.toLowerCase().endsWith('.md')) {
      throw new BadRequestException('内容文件必须是 .md 格式');
    }

    const report = await this.textbookService.validateExpansionFiles(
      id,
      frameworkFile,
      contentFile,
    );

    return {
      success: true,
      data: report,
    };
  }

  /**
   * 获取教材下的知识点列表
   */
  @Get(':id/knowledge-points')
  @Roles(Role.TEACHER, Role.ADMIN, Role.STUDENT)
  async getKnowledgePoints(
    @Param('id') id: string,
  ): Promise<KnowledgePointsResponse> {
    const points = await this.textbookService.getKnowledgePoints(id);
    return {
      success: true,
      data: points,
    };
  }

  /**
   * 获取知识点详情
   */
  @Get('knowledge-points/:knowledgePointId')
  @Roles(Role.TEACHER, Role.ADMIN, Role.STUDENT)
  async getKnowledgePointDetail(
    @Param('knowledgePointId') knowledgePointId: string,
  ): Promise<{
    success: boolean;
    data: {
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
    };
  }> {
    const point =
      await this.textbookService.getKnowledgePointDetail(knowledgePointId);
    return {
      success: true,
      data: point,
    };
  }

  /**
   * 更新教材内容文件中的知识点内容块
   */
  @Put(':id/content')
  @Roles(Role.TEACHER, Role.ADMIN)
  async updateContent(
    @Param('id') id: string,
    @Body() body: { knowledgePointId: string; content: string },
  ): Promise<{ success: boolean; message: string }> {
    await this.textbookService.updateContentInFile(
      body.knowledgePointId,
      body.content,
    );
    return {
      success: true,
      message: '内容已保存',
    };
  }

  /**
   * 删除教材
   */
  @Delete(':id')
  @Roles(Role.TEACHER, Role.ADMIN)
  async remove(@Param('id') id: string): Promise<DeleteResponse> {
    await this.textbookService.remove(id);
    return {
      success: true,
      message: '教材删除成功',
    };
  }

  /**
   * 从文件名提取 baseName（去掉扩展名）
   */
  private extractBaseName(fileName: string): string | null {
    const match = fileName.match(/^(.+?)\.(xlsx|csv)$/i);
    return match ? match[1] : null;
  }

  /**
   * 检查文件名是否为支持的框架文件格式 (.xlsx 或 .csv)
   */
  private isFrameworkFile(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return lower.endsWith('.xlsx') || lower.endsWith('.csv');
  }
}
