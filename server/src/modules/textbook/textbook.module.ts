import { Module } from '@nestjs/common';
import { TextbookController } from './textbook.controller';
import { TextbookService } from './textbook.service';
import { TextbookParserService } from './textbook-parser.service';
import { TextbookFileService } from './textbook-file.service';
import { KnowledgePointController } from './knowledge-point.controller';
import { KnowledgePointService } from './knowledge-point.service';

@Module({
  controllers: [TextbookController, KnowledgePointController],
  providers: [
    TextbookService,
    TextbookParserService,
    TextbookFileService,
    KnowledgePointService,
  ],
  exports: [TextbookService, TextbookFileService],
})
export class TextbookModule {}
