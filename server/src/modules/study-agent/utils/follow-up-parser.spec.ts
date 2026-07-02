import {
  FALLBACK_FOLLOW_UPS,
  parseFollowUps,
  stripJsonCodeBlock,
} from './follow-up-parser';

const TITLE = '二次函数';

const buildJsonBlock = (followUps: string[]): string =>
  `\`\`\`json\n${JSON.stringify({ followUps })}\n\`\`\``;

const makeResponse = (answer: string, followUps: string[]): string =>
  `${answer}\n\n${buildJsonBlock(followUps)}`;

const defaultFollowUps = FALLBACK_FOLLOW_UPS(TITLE);

describe('FALLBACK_FOLLOW_UPS', () => {
  it('should return 3 Chinese question templates with the title', () => {
    const result = FALLBACK_FOLLOW_UPS(TITLE);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(`「${TITLE}」的典型例题有哪些？`);
    expect(result[1]).toBe(`「${TITLE}」的常见易错点是什么？`);
    expect(result[2]).toBe(`如何进一步理解「${TITLE}」？`);
  });
});

describe('parseFollowUps', () => {
  it('should extract the last JSON code block and return follow-ups', () => {
    const followUps = [
      '这道题的解法是什么？',
      '还有其他类似题型吗？',
      '应该注意哪些细节？',
    ];
    const response = makeResponse('这是答案。', followUps);
    const result = parseFollowUps(response, TITLE);
    expect(result).toEqual(followUps);
  });

  it('should use the last JSON block when multiple blocks are present', () => {
    const firstBlock = buildJsonBlock([
      '第一个问题',
      '第二个问题',
      '第三个问题',
    ]);
    const lastBlock = buildJsonBlock(['A', 'B', 'C']);
    const response = `${firstBlock}\n\n${lastBlock}`;
    const result = parseFollowUps(response, TITLE);
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('should fall back when the JSON block is missing', () => {
    const result = parseFollowUps('只有回答，没有 JSON 块。', TITLE);
    expect(result).toEqual(defaultFollowUps);
  });

  it('should fall back when the JSON is malformed', () => {
    const response = '```json\n{ not valid json\n```';
    const result = parseFollowUps(response, TITLE);
    expect(result).toEqual(defaultFollowUps);
  });

  it('should fall back when followUps count is not 3', () => {
    const response = makeResponse('答案', ['问题1']);
    const result = parseFollowUps(response, TITLE);
    expect(result).toEqual(defaultFollowUps);
  });

  it('should fall back when any follow-up is empty', () => {
    const response = makeResponse('答案', ['问题1', '   ', '问题3']);
    const result = parseFollowUps(response, TITLE);
    expect(result).toEqual(defaultFollowUps);
  });

  it('should fall back when the parsed value is not an object', () => {
    const response = '```json\n"not an object"\n```';
    const result = parseFollowUps(response, TITLE);
    expect(result).toEqual(defaultFollowUps);
  });
});

describe('stripJsonCodeBlock', () => {
  it('should remove the last JSON code block from the content', () => {
    const followUps = ['Q1', 'Q2', 'Q3'];
    const response = makeResponse('这是答案。', followUps);
    const result = stripJsonCodeBlock(response);
    expect(result).toBe('这是答案。');
  });

  it('should keep the original content when no JSON block exists', () => {
    const content = '只有答案，没有 JSON 块。';
    const result = stripJsonCodeBlock(content);
    expect(result).toBe(content);
  });
});
