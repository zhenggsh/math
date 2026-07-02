import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { resolve } from 'path';

@Injectable()
export class KnowledgeContentService {
  private readonly logger = new Logger(KnowledgeContentService.name);

  async getSummary(
    contentRef: string | undefined,
    textbookContentPath: string | undefined,
    code: string,
    title: string,
  ): Promise<string> {
    const filePath = contentRef ?? textbookContentPath;

    if (!filePath) {
      return '';
    }

    const absolutePath = resolve(filePath);

    let content: string;
    try {
      content = await Promise.resolve(readFileSync(absolutePath, 'utf-8'));
    } catch {
      this.logger.warn(
        `Failed to read knowledge content file: ${absolutePath}`,
      );
      return '';
    }

    const section = this.extractSection(content, code, title);

    if (section) {
      return this.truncate(section, 2000);
    }

    return this.truncate(content, 2000);
  }

  private extractSection(
    content: string,
    code: string,
    title: string,
  ): string | null {
    const headingRegex = /^#{1,6}\s+.*$/gm;
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(content)) !== null) {
      const headingLine = match[0];

      if (headingLine.includes(code) || headingLine.includes(title)) {
        const level = headingLine.match(/^#{1,6}/)?.[0].length ?? 1;
        const start = match.index;
        const nextHeadingRegex = new RegExp(`^#{1,${level}}\\s+.*$`, 'gm');
        nextHeadingRegex.lastIndex = start + headingLine.length;
        const nextMatch = nextHeadingRegex.exec(content);
        const end = nextMatch ? nextMatch.index : content.length;

        return content.slice(start, end);
      }
    }

    return null;
  }

  private truncate(text: string, limit: number): string {
    if (text.length <= limit) {
      return text;
    }

    const searchStart = Math.max(0, limit - 500);

    const blankLineIndex = text.lastIndexOf('\n\n', limit);
    if (blankLineIndex >= searchStart) {
      return text.slice(0, blankLineIndex);
    }

    const newlineIndex = text.lastIndexOf('\n', limit);
    if (newlineIndex >= searchStart) {
      return text.slice(0, newlineIndex);
    }

    return text.slice(0, limit);
  }
}
