import { Injectable } from '@nestjs/common';
import { QaSkill } from './skills/qa.skill';

@Injectable()
export class StudySkillRegistry {
  constructor(private readonly qaSkill: QaSkill) {}

  getDefaultSkill(): QaSkill {
    return this.qaSkill;
  }
}
