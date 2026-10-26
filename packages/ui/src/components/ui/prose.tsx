// Prose: long-form copy that admins write as data (the terms today), rendered in the type scale. Takes blocks
// parsed from light markdown (`proseBlocks` in @app/shared): a title, numbered headings, paragraphs with
// strong runs, bullet lists. No links, no images: legal text stays plain.
import * as React from 'react';
import { View } from 'react-native';
import { tv, type VariantProps } from '../../lib/utils';
import { Text } from './text';

type ProseInline = { text: string; strong: boolean };
type ProseBlock =
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; inline: ProseInline[] }
  | { kind: 'list'; items: ProseInline[][] };

const proseVariants = tv({
  slots: { root: 'gap-4', item: 'flex-row gap-3', strong: 'font-bold' },
  variants: {
    /** `framed`: on the surface with padding, for an excerpt inside a form. */
    frame: { none: {}, framed: { root: 'bg-surface border-hairline rounded-lg border px-4 py-5' } },
  },
  defaultVariants: { frame: 'none' },
});

function Inline({ parts, strongClass }: { parts: ProseInline[]; strongClass: string }) {
  return (
    <>
      {parts.map((part, i) =>
        part.strong ? (
          <Text key={i} className={strongClass}>
            {part.text}
          </Text>
        ) : (
          <React.Fragment key={i}>{part.text}</React.Fragment>
        ),
      )}
    </>
  );
}

type ProseProps = VariantProps<typeof proseVariants> & { blocks: ProseBlock[]; testID?: string };

function Prose({ blocks, frame, testID }: ProseProps) {
  const s = proseVariants({ frame });
  return (
    <View className={s.root()} testID={testID}>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'title':
            return (
              <Text key={i} variant="title-3">
                {block.text}
              </Text>
            );
          case 'heading':
            return (
              <Text key={i} variant="headline">
                {block.text}
              </Text>
            );
          case 'paragraph':
            return (
              <Text key={i} variant="callout">
                <Inline parts={block.inline} strongClass={s.strong()} />
              </Text>
            );
          case 'list':
            return (
              <View key={i} className="gap-2">
                {block.items.map((item, j) => (
                  <View key={j} className={s.item()}>
                    <Text variant="callout" tone="muted">
                      ·
                    </Text>
                    <Text variant="callout" className="flex-1">
                      <Inline parts={item} strongClass={s.strong()} />
                    </Text>
                  </View>
                ))}
              </View>
            );
        }
      })}
    </View>
  );
}

export { Prose, proseVariants };
export type { ProseBlock, ProseInline, ProseProps };
