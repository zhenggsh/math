import { Module } from '@nestjs/common';
import { TextbookController } from './textbook.controller';
import { TextbookService } from './textbook.service';
import { TextbookParserService } from './textbook-parser.service';
import { TextbookFileService } from './textbook-file.service';

@Module({
  controllers: [TextbookController],
  providers: [TextbookService, TextbookParserService, TextbookFileService],
  exports: [TextbookService],
})
export class TextbookModule {}
