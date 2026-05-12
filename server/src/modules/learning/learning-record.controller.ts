import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LearningRecordService } from './learning-record.service';
import { CreateLearningRecordDto } from './dto/create-learning-record.dto';
import { QueryLearningRecordsDto } from './dto/query-learning-records.dto';
import {
  LearningRecordResponseDto,
  PaginatedLearningRecordsResponseDto,
} from './dto/learning-record-response.dto';

/**
 * 学习记录控制器
 * 提供学习记录的 RESTful API
 */
@ApiTags('learning-records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('learning-records')
export class LearningRecordController {
  constructor(private readonly service: LearningRecordService) {}

  /**
   * 创建学习记录
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建学习记录',
    description: '记录用户对知识点的学习反馈，包括掌握程度、学习时长等',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '学习记录创建成功',
    type: LearningRecordResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '知识点不存在',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  async create(
    @CurrentUser('userId') userId: string,
    @Body(new ValidationPipe({ transform: true })) dto: CreateLearningRecordDto,
  ): Promise<{ success: boolean; data: LearningRecordResponseDto }> {
    const record = await this.service.create(userId, dto);
    return { success: true, data: record };
  }

  /**
   * 查询用户的学习记录列表
   */
  @Get()
  @ApiOperation({
    summary: '查询学习记录列表',
    description: '查询当前用户的所有学习记录，支持按知识点过滤和分页',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    type: PaginatedLearningRecordsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query(new ValidationPipe({ transform: true }))
    query: QueryLearningRecordsDto,
  ): Promise<{
    success: boolean;
    data: PaginatedLearningRecordsResponseDto;
  }> {
    const result = await this.service.findAll(userId, query);
    return { success: true, data: result };
  }

  /**
   * 查询特定知识点的学习记录
   */
  @Get('knowledge-point/:knowledgePointId')
  @ApiOperation({
    summary: '查询知识点的学习记录',
    description: '查询当前用户对特定知识点的所有学习记录',
  })
  @ApiParam({
    name: 'knowledgePointId',
    description: '知识点ID',
    example: 'kp-123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    type: [LearningRecordResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '知识点不存在',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  async findByKnowledgePoint(
    @CurrentUser('userId') userId: string,
    @Param('knowledgePointId') knowledgePointId: string,
  ): Promise<{ success: boolean; data: LearningRecordResponseDto[] }> {
    const records = await this.service.findByKnowledgePoint(
      userId,
      knowledgePointId,
    );
    return { success: true, data: records };
  }
}
