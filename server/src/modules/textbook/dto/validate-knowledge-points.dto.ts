import type { ValidationReport } from '../types/textbook.types';

export interface ValidateKnowledgePointsResponse {
  success: boolean;
  data: ValidationReport;
}
