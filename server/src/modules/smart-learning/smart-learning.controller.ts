import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SmartLearningService } from './smart-learning.service';
import {
  WeakPointsQueryDto,
  ByImportanceQueryDto,
  RandomQueryDto,
} from './dto/smart-learning.dto';
import { WeakPointsResponse, ByImportanceResponse } from './dto/smart-learning-response.dto';

@ApiTags('smart-learning')
@Controller('smart-learning')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SmartLearningController {
  constructor(private readonly smartLearningService: SmartLearningService) {}

  @Get('weak-points')
  @ApiOperation({ summary: 'Get weak points for current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns weak points list with priority and recommendation reason',
    type: WeakPointsResponse,
  })
  async getWeakPoints(
    @CurrentUser('sub') userId: string,
    @Query(new ValidationPipe({ transform: true })) query: WeakPointsQueryDto,
  ) {
    const result = await this.smartLearningService.getWeakPoints(userId, query);
    return {
      success: true,
      data: result,
    };
  }

  @Get('by-importance')
  @ApiOperation({ summary: 'Get knowledge points by importance level' })
  @ApiResponse({
    status: 200,
    description: 'Returns knowledge points grouped by importance with recommendation reason',
    type: ByImportanceResponse,
  })
  async getByImportance(
    @CurrentUser('sub') userId: string,
    @Query(new ValidationPipe({ transform: true })) query: ByImportanceQueryDto,
  ) {
    const result = await this.smartLearningService.getByImportance(
      userId,
      query,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('random')
  @ApiOperation({ summary: 'Get random knowledge points' })
  @ApiResponse({
    status: 200,
    description: 'Returns random knowledge points',
  })
  async getRandomPoints(
    @CurrentUser('sub') userId: string,
    @Query(new ValidationPipe({ transform: true })) query: RandomQueryDto,
  ) {
    const result = await this.smartLearningService.getRandomPoints(
      userId,
      query,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get learning statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns learning statistics including weak point count',
  })
  async getLearningStats(@CurrentUser('sub') userId: string) {
    const result = await this.smartLearningService.getLearningStats(userId);
    return {
      success: true,
      data: result,
    };
  }
}
