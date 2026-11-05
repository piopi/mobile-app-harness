import type { MemberRole } from '@app/shared';
import type { AppearanceChoice } from '../../lib/appearance';

/** The Me tab's copy. PROJECT: the brand's voice. */
export const ME = {
  member: 'Member',
  settings: 'Settings',
  appearance: 'Appearance',
  appearanceMessage: 'Follow the phone, or keep one look.',
  appearanceLabel: { system: 'System', light: 'Light', dark: 'Dark' } satisfies Record<AppearanceChoice, string>,
  devPanel: 'Dev panel',
  help: 'Help',
  role: { member: 'Member', staff: 'Staff', admin: 'Admin' } satisfies Record<MemberRole, string>,
} as const;
