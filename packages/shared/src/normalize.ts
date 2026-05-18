/**
 * 中文标题 / 作者归一化与相似度。
 * 设计文档 §10.2-10.4 + §11.2。
 */

/**
 * 中文标题归一化：
 * - 去括号副标题 / 版本标记
 * - 去标点和空白
 * - NFKC 全角→半角
 */
export function normalizeChineseTitle(title: string): string {
  return title
    .normalize('NFKC')
    .replace(/[：:（(].*?[）)]/g, '')
    .replace(/第[一二三四五六七八九十百千万\d]+版/g, '')
    .replace(/修订版|新版|珍藏版|典藏版|纪念版|精装|平装/g, '')
    .replace(/[《》〈〉""''，,。.!！?？·•、；;:：]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

/**
 * 作者名归一化：
 * - 去掉 "[英]" "[美]" "(美)" 等国籍前缀
 * - 去掉头衔后缀（著、译、编、绘）
 * - 全角→半角
 * - 多个分隔符（/、,、、）拆分时由调用方处理
 */
export function normalizeAuthorName(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/^\s*[\[（(](?:美|英|法|德|日|韩|俄|意|西|中|加)[\]）)]\s*/g, '')
    .replace(/\s*[•·]\s*/g, '·')
    .replace(/[著译编绘选]$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * 字符 bigram 集合。中文长度按 code-point，处理代理对。
 */
function bigrams(s: string): Set<string> {
  const chars = Array.from(s);
  const set = new Set<string>();
  if (chars.length < 2) {
    if (chars.length === 1) set.add(chars[0]!);
    return set;
  }
  for (let i = 0; i < chars.length - 1; i++) {
    set.add(chars[i]! + chars[i + 1]!);
  }
  return set;
}

/**
 * Dice 系数 = 2|A∩B| / (|A|+|B|)。
 * 0.0 完全不像 ~ 1.0 完全相同。
 */
export function diceSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;

  const ba = bigrams(a);
  const bb = bigrams(b);
  if (ba.size === 0 || bb.size === 0) return 0;

  let intersect = 0;
  for (const bg of ba) if (bb.has(bg)) intersect++;
  return (2 * intersect) / (ba.size + bb.size);
}

/**
 * 标题相似度。先归一化再算 Dice。
 */
export function titleSimilarity(a: string | undefined, b: string | undefined): number {
  if (!a || !b) return 0;
  return diceSimilarity(normalizeChineseTitle(a), normalizeChineseTitle(b));
}

/**
 * 作者相似度。任一边为空返 0。
 * 多作者时按集合最大匹配求平均（粗略，但够 v0.1 用）。
 */
export function authorSimilarity(
  query: string | undefined,
  candidates: string[] | undefined,
): number {
  if (!query || !candidates || candidates.length === 0) return 0;
  const q = normalizeAuthorName(query);
  let best = 0;
  for (const c of candidates) {
    const s = diceSimilarity(q, normalizeAuthorName(c));
    if (s > best) best = s;
  }
  return best;
}

/**
 * 出版社别名表 — 用于判断 "人邮" 和 "人民邮电出版社" 是同一家。
 * 设计文档 §10.4。
 */
const PUBLISHER_ALIASES: Record<string, string[]> = {
  人民邮电出版社: ['人邮', '人民邮电', 'posts and telecom press'],
  机械工业出版社: ['机械工业', '机工社', '机工出版社'],
  电子工业出版社: ['电子工业', '电子社'],
  中信出版社: ['中信出版集团', '中信出版'],
  '生活·读书·新知三联书店': ['三联书店', '三联'],
  人民文学出版社: ['人文社', '人民文学'],
  上海译文出版社: ['译文社', '上海译文'],
  重庆出版社: ['重庆出版集团'],
};

const PUBLISHER_LOOKUP: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(PUBLISHER_ALIASES)) {
    m.set(normalizePublisherName(canonical), canonical);
    for (const a of aliases) m.set(normalizePublisherName(a), canonical);
  }
  return m;
})();

function normalizePublisherName(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[\s·•]/g, '')
    .toLowerCase();
}

export function canonicalPublisher(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return PUBLISHER_LOOKUP.get(normalizePublisherName(name)) ?? name;
}

export function samePublisher(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return canonicalPublisher(a) === canonicalPublisher(b);
}

/**
 * 年份接近判断：candidate.publishedDate 可能是 "2008" / "2008-05" / "2008-05-01"。
 */
export function nearYear(publishedDate: string, year: number, tolerance = 2): boolean {
  const m = publishedDate.match(/(\d{4})/);
  if (!m) return false;
  const y = Number(m[1]);
  return Math.abs(y - year) <= tolerance;
}

/**
 * 检测输入是 ISBN / 书名 / 作者+书名。
 *
 * 规则：
 * - 清洗后是合法 ISBN-10/13 → 'isbn'
 * - 包含空格且可拆出 1-3 字符的作者样本 → 'title_author'
 * - 其他 → 'title'
 */
export function detectQueryType(input: string): 'isbn' | 'title' | 'title_author' {
  const trimmed = input.trim();
  if (!trimmed) return 'title';
  // 简易 ISBN 探测（细节由 isbn.ts 校验）
  const digits = trimmed.replace(/[\s\-—–]/g, '').toUpperCase();
  if (/^(978|979)?[0-9]{9,12}[0-9X]$/.test(digits) && (digits.length === 10 || digits.length === 13)) {
    return 'isbn';
  }
  if (/\s/.test(trimmed)) return 'title_author';
  return 'title';
}

/**
 * 把 "刘慈欣 三体" 拆成 { author: "刘慈欣", title: "三体" }。
 * 中文：取第一段为 author，剩余为 title（如果首段 ≤ 6 字符）。
 * 英文：保留原始；title 不拆分（v0.1 简化）。
 */
export function splitTitleAuthor(input: string): { title: string; author?: string } {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return { title: trimmed };

  const first = parts[0]!;
  // 简化策略：中文姓名通常 2-4 字
  if (/^[一-龥]{2,4}$/.test(first)) {
    return { title: parts.slice(1).join(' '), author: first };
  }
  // 否则不拆
  return { title: trimmed };
}
