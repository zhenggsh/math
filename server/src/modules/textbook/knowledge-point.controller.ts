import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { KnowledgePointService } from './knowledge-point.service';
import { CreateKnowledgePointDto } from './dto/create-knowledge-point.dto';
import { UpdateKnowledgePointDto } from './dto/update-knowledge-point.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('textbooks/:textbookId/knowledge-points')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KnowledgePointController {
  constructor(private readonly knowledgePointService: KnowledgePointService) {}

  @Post()
  @Roles(Role.TEACHER, Role.ADMIN)
  async create(
    @Param('textbookId') textbookId: string,
    @Body(new ValidationPipe({ transform: true })) dto: CreateKnowledgePointDto,
  ): Promise<{
    success: boolean;
    data: {
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
    };
  }> {
    const point = await this.knowledgePointService.create(textbookId, dto);
    return {
      success: true,
      data: point,
    };
  }

  @Patch(':id')
  @Roles(Role.TEACHER, Role.ADMIN)
  async update(
    @Param('textbookId') textbookId: string,
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true })) dto: UpdateKnowledgePointDto,
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
    };
  }> {
    const point = await this.knowledgePointService.update(textbookId, id, dto);
    return {
      success: true,
      data: point,
    };
  }

  @Delete(':id')
  @Roles(Role.TEACHER, Role.ADMIN)
  async delete(
    @Param('textbookId') textbookId: string,
    @Param('id') id: string,
  ): Promise<{
    success: boolean;
    data: { id: string; code: string };
  }> {
    const point = await this.knowledgePointService.delete(textbookId, id);
    return {
      success: true,
      data: point,
    };
  }
}
