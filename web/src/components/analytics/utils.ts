export function getMasteryLevelOrder(level: string): number {
  const order: Record<string, number> = { E: 0, D: 1, C: 2, B: 3, A: 4 }
  return order[level] ?? 5
}

export function getImportanceLevelOrder(level: string): number {
  const order: Record<string, number> = { A: 0, B: 1, C: 2 }
  return order[level] ?? 3
}
