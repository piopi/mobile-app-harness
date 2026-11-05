import path from 'node:path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { acknowledgedGuides, affectedGuides, unexplained } from './impact.mjs';
import { parseGuide } from './model.mjs';

const ROOT = '/repo';
const make = (audience, slug, covers) =>
  parseGuide(
    YAML.stringify({ title: `Guide ${slug}`, audience, scenario: 'many-items', covers, steps: [{ caption: 'A step.', do: [] }] }),
    path.join(ROOT, 'apps/mobile/.maestro/guides', audience, `${slug}.yaml`),
  );
const GUIDES = [
  make('admins', 'publish-item', ['apps/mobile/src/features/admin/item-editor.tsx', 'apps/mobile/src/features/admin/copy.ts']),
  make('admins', 'review', ['apps/mobile/src/features/admin/review-screen.tsx', 'apps/mobile/src/features/admin/copy.ts']),
  make('users', 'browse-items', ['apps/mobile/src/features/items/**']),
];
const EDITOR = 'apps/mobile/src/features/admin/item-editor.tsx';

/** The check's verdict for a change set and a PR description: the guides it still wants named. */
const verdict = (changed, body = '') => unexplained(affectedGuides(GUIDES, changed, ROOT), body).map((a) => a.guide.slug);

describe('guide impact', () => {
  it('fails a covered change without the guide changing', () => {
    expect(verdict([EDITOR])).toEqual(['publish-item']);
    expect(affectedGuides(GUIDES, [EDITOR, 'README.md'], ROOT)[0].files).toEqual([EDITOR]);
    // A glob covers every file under it; a shared file hits every guide that covers it.
    expect(verdict(['apps/mobile/src/features/items/queries.ts'])).toEqual(['browse-items']);
    expect(verdict(['apps/mobile/src/features/admin/copy.ts'])).toEqual(['publish-item', 'review']);
  });

  it('passes when the guide changes too', () => {
    expect(verdict([EDITOR, 'apps/mobile/.maestro/guides/admins/publish-item.yaml'])).toEqual([]);
  });

  it('passes when the description names the guide with a reason', () => {
    expect(verdict([EDITOR], 'Guides: publish-item (copy only, no step changes)')).toEqual([]);
    expect(verdict([EDITOR], '## Guides\n\n- **Guides:** admins/publish-item (testID rename only)')).toEqual([]);
    expect(verdict(['apps/mobile/src/features/admin/copy.ts'], 'Guides: publish-item (copy only), review (same steps)')).toEqual([]);
  });

  it('wants a reason, the right guide, and a line outside the template comment', () => {
    expect(verdict([EDITOR], 'Guides: publish-item')).toEqual(['publish-item']);
    expect(verdict([EDITOR], 'Guides: publish-item ()')).toEqual(['publish-item']);
    expect(verdict([EDITOR], 'Guides: review (copy only)')).toEqual(['publish-item']);
    expect(verdict([EDITOR], '<!-- Guides: publish-item (copy only) -->')).toEqual(['publish-item']);
    expect(verdict(['apps/mobile/src/features/admin/copy.ts'], 'Guides: publish-item (copy only)')).toEqual(['review']);
  });

  it('passes a change no guide covers', () => {
    expect(verdict(['README.md', 'supabase/migrations/x.sql', 'apps/mobile/src/features/me/copy.ts'])).toEqual([]);
  });

  it('reads every Guides: line', () => {
    expect(Object.fromEntries(acknowledgedGuides('Guides: publish-item (copy only)\r\nguides: review (layout only), settings (same)'))).toEqual({
      'publish-item': 'copy only',
      review: 'layout only',
      settings: 'same',
    });
  });
});
