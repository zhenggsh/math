import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
  Body,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { ExportService } from './export.service';
import { ExportDataDto } from './dto/export.dto';
import {
  LearningTrendQueryDto,
  WeakPointsQueryDto,
  KnowledgePointProgressQueryDto,
  ClassOverviewQueryDto,
  KnowledgeHeatQueryDto,
  StudentComparisonQueryDto,
} from './dto/query-params.dto';
import type {
  StudentOverviewDto,
  MasteryDistributionDto,
  LearningTrendDto,
  WeakPointsDto,
  KnowledgePointProgressDto,
  ClassOverviewDto,
  KnowledgeHeatDto,
  StudentComparisonDto,
  LearnedKnowledgePointsDto,
} from './interfaces/stats.interfaces';
import type { Response } from 'express';

/**
 * 数据分析控制器
 * 提供学习数据分析 API
 */
@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly service: AnalyticsService,
    private readonly exportService: ExportService,
  ) {}

  /**
   * 学生学习概览
   */
  @Get('student/overview')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: '学生学习概览' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStudentOverview(
    @CurrentUser('userId') userId: string,
  ): Promise<{ success: boolean; data: StudentOverviewDto }> {
    const data = await this.service.getStudentOverview(userId);
    return { success: true, data };
  }

  /**
   * 掌握程度分布
   */
  @Get('student/mastery-distribution')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: '掌握程度分布' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMasteryDistribution(
    @CurrentUser('userId') userId: string,
  ): Promise<{ success: boolean; data: MasteryDistributionDto }> {
    const data = await this.service.getMasteryDistribution(userId);
    return { success: true, data };
  }

  /**
   * 学习趋势
   */
  @Get('student/learning-trend')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: '学习趋势' })
  @ApiQuery({ name: 'days', required: false, description: '查询天数' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getLearningTrend(
    @CurrentUser('userId') userId: string,
    @Query(new ValidationPipe({ transform: true }))
    query: LearningTrendQueryDto,
  ): Promise<{ success: boolean; data: LearningTrendDto }> {
    const data = await this.service.getLearningTrend(userId, query.days || 30);
    return { success: true, data };
  }

  /**
   * 薄弱知识点
   */
  @Get('student/weak-points')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: '薄弱知识点' })
  @ApiQuery({ name: 'limit', required: false, description: '返回数量限制' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getWeakPoints(
    @CurrentUser('userId') userId: string,
    @Query(new ValidationPipe({ transform: true })) query: WeakPointsQueryDto,
  ): Promise<{ success: boolean; data: WeakPointsDto }> {
    const data = await this.service.getWeakPoints(userId, query.limit || 10);
    return { success: true, data };
  }

  /**
   * 已学知识点列表
   */
  @Get('student/learned-knowledge-points')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: '已学知识点列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getLearnedKnowledgePoints(
    @CurrentUser('userId') userId: string,
  ): Promise<{ success: boolean; data: LearnedKnowledgePointsDto }> {
    const data = await this.service.getLearnedKnowledgePoints(userId);
    return { success: true, data };
  }

  /**
   * 知识点掌握度进度
   */
  @Get('student/knowledge-point-progress')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: '知识点掌握度进度' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getKnowledgePointProgress(
    @CurrentUser('userId') userId: string,
    @Query(new ValidationPipe({ transform: true })) query: KnowledgePointProgressQueryDto,
  ): Promise<{ success: boolean; data: KnowledgePointProgressDto }> {
    const data = await this.service.getKnowledgePointProgress(userId, query.knowledgePointId, query.startDate, query.endDate);
    return { success: true, data };
  }

  /**
   * 班级概览（教师）
   */
  @Get('teacher/class-overview')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: '班级概览（教师）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getClassOverview(
    @Query(new ValidationPipe({ transform: true }))
    query: ClassOverviewQueryDto,
  ): Promise<{ success: boolean; data: ClassOverviewDto }> {
    const data = await this.service.getClassOverview(query.classId);
    return { success: true, data };
  }

  /**
   * 知识点热度（教师）
   */
  @Get('teacher/knowledge-heat')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: '知识点热度（教师）' })
  @ApiQuery({ name: 'limit', required: false, description: '返回数量限制' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getKnowledgeHeat(
    @Query(new ValidationPipe({ transform: true }))
    query: KnowledgeHeatQueryDto,
  ): Promise<{ success: boolean; data: KnowledgeHeatDto }> {
    const data = await this.service.getKnowledgeHeat(query.limit || 20);
    return { success: true, data };
  }

  /**
   * 学生对比（教师）
   */
  @Get('teacher/student-comparison')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: '学生对比（教师）' })
  @ApiQuery({
    name: 'studentIds',
    required: true,
    description: '学生ID列表（逗号分隔）',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStudentComparison(
    @Query(new ValidationPipe({ transform: true }))
    query: StudentComparisonQueryDto,
  ): Promise<{ success: boolean; data: StudentComparisonDto }> {
    const studentIds = query.studentIds?.split(',').filter(Boolean) || [];
    const data = await this.service.getStudentComparison(studentIds);
    return { success: true, data };
  }

  /**
   * 学生列表（教师）
   */
  @Get('teacher/students')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: '学生列表（教师）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStudents(): Promise<{
    success: boolean;
    data: Array<{ id: string; name: string }>;
  }> {
    const data = await this.service.getStudents();
    return { success: true, data };
  }

  /**
   * 数据导出（教师）
   */
  @Post('teacher/export')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: '导出学习记录（教师）' })
  @ApiResponse({ status: 200, description: '导出成功' })
  async exportData(
    @Body(new ValidationPipe({ transform: true })) dto: ExportDataDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportService.exportLearningRecords(dto);
    const extension = dto.format === 'csv' ? 'csv' : 'xlsx';
    const mimeType =
      dto.format === 'csv'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="learning-records-${new Date().toISOString().split('T')[0]}.${extension}"`,
    );
    res.send(buffer);
  }
}
