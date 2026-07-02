import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class StudyAgentConfigService {
  private readonly identity: string;
  private readonly memory: string;
  private readonly soule: string;

  constructor() {
    const configDir = join(process.cwd(), 'study-agent-config');
    this.identity = readFileSync(join(configDir, 'Identity.md'), 'utf-8');
    this.memory = readFileSync(join(configDir, 'Memory.md'), 'utf-8');
    this.soule = readFileSync(join(configDir, 'SOULE.md'), 'utf-8');
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
