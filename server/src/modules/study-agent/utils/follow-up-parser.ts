export function FALLBACK_FOLLOW_UPS(title: string): string[] {
  return [
    `「${title}」的典型例题有哪些？`,
    `「${title}」的常见易错点是什么？`,
    `如何进一步理解「${title}」？`,
  ];
}

export function parseFollowUps(text: string, title: string): string[] {
  const block = extractLastJsonBlock(text);
  if (!block) {
    return FALLBACK_FOLLOW_UPS(title);
  }

  try {
    const parsed = JSON.parse(block) as unknown;
    if (isValidFollowUps(parsed)) {
      return parsed.followUps;
    }
  } catch {
    // Fall through to fallback
  }

  return FALLBACK_FOLLOW_UPS(title);
}

export function stripJsonCodeBlock(text: string): string {
  const block = extractLastJsonBlock(text);
  if (!block) {
    return text.trim();
  }

  const marker = '```json';
  const lastOpenIndex = text.lastIndexOf(marker);
  if (lastOpenIndex === -1) {
    return text.trim();
  }

  const closeIndex = text.indexOf('```', lastOpenIndex + marker.length);
  if (closeIndex === -1) {
    return text.trim();
  }

  const before = text.slice(0, lastOpenIndex).trimEnd();
  const after = text.slice(closeIndex + 3).trimStart();
  const result = before + (before && after ? '\n\n' : '') + after;
  return result.trim();
}

function extractLastJsonBlock(text: string): string | null {
  const regex = /```json\s*([\s\S]*?)\s*```/g;
  let match: RegExpExecArray | null = null;
  let lastMatch: RegExpExecArray | null = null;

  while ((match = regex.exec(text)) !== null) {
    lastMatch = match;
  }

  return lastMatch?.[1] ?? null;
}

function isValidFollowUps(value: unknown): value is { followUps: string[] } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.followUps)) {
    return false;
  }

  if (candidate.followUps.length !== 3) {
    return false;
  }

  return candidate.followUps.every(
    (item): item is string =>
      typeof item === 'string' && item.trim().length > 0,
  );
}
