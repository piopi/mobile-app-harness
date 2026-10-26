import { z } from 'zod';

/**
 * The terms are data (`terms_versions`): an admin publishes a version with its title, text, acceptance line and
 * what changed, and every member accepts it again. The text is light markdown, parsed here into blocks that
 * packages/ui `Prose` renders: "# " title, "## " headings, "- " bullets, **strong**, blank lines between.
 */
export const termsDocument = z.object({
  version: z.string(),
  title: z.string(),
  body: z.string(),
  accept_label: z.string(),
  changes: z.array(z.string()),
  published_at: z.string(),
});
export type TermsDocument = z.infer<typeof termsDocument>;

export type ProseInline = { text: string; strong: boolean };
export type ProseBlock =
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; inline: ProseInline[] }
  | { kind: 'list'; items: ProseInline[][] };

export function proseInline(text: string): ProseInline[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) => (part.startsWith('**') && part.endsWith('**') ? { text: part.slice(2, -2), strong: true } : { text: part, strong: false }));
}

/** Light markdown to blocks . */
export function proseBlocks(text: string): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  for (const chunk of text.split(/\n\s*\n/)) {
    const lines = chunk.split('\n').filter((line) => line.trim());
    if (!lines.length) continue;
    const first = lines[0]!;
    if (first.startsWith('# ')) blocks.push({ kind: 'title', text: first.slice(2).trim() });
    else if (first.startsWith('## ')) blocks.push({ kind: 'heading', text: first.slice(3).trim() });
    else if (lines.every((line) => line.startsWith('- '))) blocks.push({ kind: 'list', items: lines.map((line) => proseInline(line.slice(2).trim())) });
    else blocks.push({ kind: 'paragraph', inline: proseInline(lines.join(' ').trim()) });
  }
  return blocks;
}

/** The first blocks of a document, for the inline preview above "Read the full text". */
export function proseExcerpt(blocks: ProseBlock[], count = 4): ProseBlock[] {
  return blocks.slice(0, count);
}
