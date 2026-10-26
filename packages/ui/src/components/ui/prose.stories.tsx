import type { Meta, StoryObj } from '@storybook/react-native';
import { Prose, type ProseBlock } from './prose';

const BLOCKS: ProseBlock[] = [
  { kind: 'title', text: 'Terms of use' },
  { kind: 'paragraph', inline: [{ text: 'Placeholder terms, version 1.0.', strong: true }] },
  { kind: 'heading', text: 'Using the app' },
  { kind: 'paragraph', inline: [{ text: 'Be kind, and ', strong: false }, { text: 'keep your account to yourself', strong: true }, { text: '.', strong: false }] },
  { kind: 'list', items: [[{ text: 'We keep what you give us.', strong: false }], [{ text: 'You can ask us to delete it.', strong: false }]] },
];

const meta = { title: 'UI/Prose', component: Prose, args: { blocks: BLOCKS } } satisfies Meta<typeof Prose>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Document: Story = {};
export const Framed: Story = { args: { frame: 'framed' } };
