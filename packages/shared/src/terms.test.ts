import { describe, expect, it } from 'vitest';
import { proseBlocks, proseExcerpt } from './terms';

const TEXT = `# TERMS OF USE

**Placeholder terms. Version 2.0.**

## 1. Who this agreement is with

This agreement is between me
and the Organizer, with **bold words** inside.

- **Data:** what we keep.
- Your rights.`;

describe('terms prose', () => {
  it('parses titles, headings, paragraphs and lists', () => {
    const blocks = proseBlocks(TEXT);
    expect(blocks.map((b) => b.kind)).toEqual(['title', 'paragraph', 'heading', 'paragraph', 'list']);
    expect(blocks[0]).toEqual({ kind: 'title', text: 'TERMS OF USE' });
    expect(blocks[1]).toEqual({ kind: 'paragraph', inline: [{ text: 'Placeholder terms. Version 2.0.', strong: true }] });
  });
  it('joins wrapped lines and keeps strong runs', () => {
    const p = proseBlocks(TEXT)[3];
    expect(p).toEqual({
      kind: 'paragraph',
      inline: [
        { text: 'This agreement is between me and the Organizer, with ', strong: false },
        { text: 'bold words', strong: true },
        { text: ' inside.', strong: false },
      ],
    });
  });
  it('splits list items', () => {
    const list = proseBlocks(TEXT)[4];
    expect(list).toEqual({
      kind: 'list',
      items: [
        [
          { text: 'Data:', strong: true },
          { text: ' what we keep.', strong: false },
        ],
        [{ text: 'Your rights.', strong: false }],
      ],
    });
  });
  it('ignores blank chunks and takes an excerpt', () => {
    expect(proseBlocks('\n\n  \n\n')).toEqual([]);
    expect(proseExcerpt(proseBlocks(TEXT), 2)).toHaveLength(2);
  });
});
