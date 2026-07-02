import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { resolve } from 'path';

@Injectable()
export class KnowledgeContentService {
  private readonly logger = new Logger(KnowledgeContentService.name);
  private readonly MAX_SUMMARY_LENGTH = 2000;
  private readonly TRUNCATION_WINDOW = 500;

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
      return this.truncate(section);
    }

    return this.truncate(content);
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
      const headingText = headingLine.replace(/^#{1,6}\s+/, '');

      if (this.matchesHeading(headingText, code, title)) {
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

  private matchesHeading(
    headingText: string,
    code: string,
    title: string,
  ): boolean {
    return (
      this.matchesToken(headingText, code) ||
      this.matchesToken(headingText, title)
    );
  }

  private matchesToken(text: string, token: string): boolean {
    if (!token) {
      return false;
    }

    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundaryClass = `\\s:：;；,、!?（）【】`;
    const regex = new RegExp(
      `(?:^|(?<=[${boundaryClass}]))${escaped}(?=[${boundaryClass}]|$)`,
    );
    return regex.test(text);
  }

  private truncate(text: string, limit = this.MAX_SUMMARY_LENGTH): string {
    if (text.length <= limit) {
      return text;
    }

    const searchStart = Math.max(0, limit - this.TRUNCATION_WINDOW);

    const blankLineIndex = text.lastIndexOf('\n\n', limit);
    if (blankLineIndex >= searchStart) {
      return text.slice(0, blankLineIndex);
    }

    const newlineIndex = text.lastIndexOf('\n', limit);
    if (newlineIndex >= searchStart) {
      return text.slice(0, newlineIndex);
    }

    const formulaBoundaryIndex = this.findLastFormulaBoundary(text, limit);
    if (formulaBoundaryIndex >= searchStart) {
      return text.slice(0, formulaBoundaryIndex);
    }

    const sentenceBoundaryIndex = this.findLastSentenceBoundary(text, limit);
    if (sentenceBoundaryIndex >= searchStart) {
      return text.slice(0, sentenceBoundaryIndex);
    }

    return text.slice(0, limit);
  }

  private findLastFormulaBoundary(text: string, limit: number): number {
    const searchStart = Math.max(0, limit - this.TRUNCATION_WINDOW);
    const regex = /(\$\$)|(?<!\$)\$(?!\$)/g;
    const boundaries: { start: number; end: number; isOpening: boolean }[] = [];
    let insideFormula = false;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      if (start > limit) {
        break;
      }
      const end = start + match[0].length;
      const isOpening = !insideFormula;
      insideFormula = !insideFormula;
      boundaries.push({ start, end, isOpening });
    }

    for (let i = boundaries.length - 1; i >= 0; i--) {
      const boundary = boundaries[i];
      if (boundary.start < searchStart) {
        break;
      }

      if (boundary.isOpening) {
        return boundary.start;
      }

      if (boundary.end <= limit) {
        return boundary.end;
      }

      return boundary.start;
    }

    return -1;
  }

  private findLastSentenceBoundary(text: string, limit: number): number {
    const searchStart = Math.max(0, limit - this.TRUNCATION_WINDOW);
    const periodIndex = text.lastIndexOf('。', limit);
    const semicolonIndex = text.lastIndexOf('；', limit);
    const boundaryIndex = Math.max(periodIndex, semicolonIndex);

    if (boundaryIndex >= searchStart) {
      return boundaryIndex + 1;
    }

    return -1;
  }
}
