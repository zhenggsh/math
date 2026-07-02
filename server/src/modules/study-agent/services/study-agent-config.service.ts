import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class StudyAgentConfigService {
  private readonly logger = new Logger(StudyAgentConfigService.name);
  private readonly identity: string;
  private readonly memory: string;
  private readonly soule: string;

  constructor() {
    const configDir = join(process.cwd(), 'study-agent-config');
    this.identity = this.loadFile(configDir, 'Identity.md');
    this.memory = this.loadFile(configDir, 'Memory.md');
    this.soule = this.loadFile(configDir, 'SOULE.md');
  }

  private loadFile(configDir: string, fileName: string): string {
    const filePath = join(configDir, fileName);
    try {
      const content = readFileSync(filePath, 'utf-8');
      this.logger.log(`Loaded study agent config: ${fileName}`);
      return content;
    } catch (error) {
      this.logger.warn(
        `Failed to load ${fileName}: ${(error as Error).message}`,
      );
      return '';
    }
  }

  getIdentity(): string {
    return this.identity;
  }

  getMemory(): string {
    return this.memory;
  }

  getSoule(): string {
    return this.soule;
  }
}
