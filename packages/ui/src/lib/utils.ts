import { clsx, type ClassValue } from 'clsx';
import { createTV } from 'tailwind-variants';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge our theme tokens so a later class wins over an earlier one of the same kind
// (for example a Button's label font over Text's default).
const twMergeConfig = {
  extend: {
    classGroups: {
      rounded: [{ rounded: ['object', 'sheet'] }],
    },
  },
};

const twMerge = extendTailwindMerge(twMergeConfig);

/** Merge class names, letting later Tailwind classes win. Only used inside packages/ui. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** `tv` with the same merge rules as `cn`. Import this one, not tailwind-variants' default. */
export const tv = createTV({ twMergeConfig });
export type { VariantProps } from 'tailwind-variants';
