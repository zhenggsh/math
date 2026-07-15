export interface ExpandKnowledgePointsResponse {
  success: boolean;
  message: string;
  data?: {
    addedCodes: string[];
    count: number;
  };
}

export interface ExpandKnowledgePointsErrorResponse {
  success: false;
  message: string;
  errors: string[];
}
