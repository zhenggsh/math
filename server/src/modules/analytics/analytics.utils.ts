export function formatKnowledgePointName(
  level1: string,
  level2?: string | null,
  level3?: string | null,
): string {
  return [level1, level2, level3].filter(Boolean).join(' > ');
}
