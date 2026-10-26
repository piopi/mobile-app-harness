// Input: a field with a control-contrast border (3:1) and body text.
import * as React from 'react';
import { TextInput, View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { tv, type VariantProps } from '../../lib/utils';
import { Icon, type IconName } from './icon';

const inputVariants = tv({
  slots: {
    root: 'h-[52px] flex-row items-center gap-3 rounded-md border px-4',
    field: 'font-sans text-foreground h-full flex-1 text-[17px]',
  },
  variants: {
    state: { default: { root: 'border-control' }, focused: { root: 'border-foreground' }, error: { root: 'border-danger' } },
    /** `code`: a one-time code, large tracked mono digits in the middle of a taller field. */
    kind: {
      text: {},
      code: { root: 'h-16', field: 'font-mono-medium text-center text-[28px] tracking-[10px]' },
      /** `multiline`: a few lines of free text, top-aligned in a taller field. */
      multiline: { root: 'h-[120px] items-start py-3', field: 'text-[17px] leading-[22px]' },
    },
  },
  defaultVariants: { state: 'default', kind: 'text' },
});

type InputProps = React.ComponentProps<typeof TextInput> & VariantProps<typeof inputVariants> & {
  /** Leading icon (search). */
  icon?: IconName;
};

function Input({ state, kind, icon, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = React.useState(false);
  const placeholder = useCSSVariable('--color-muted-foreground') as string | undefined;
  const s = inputVariants({ state: state ?? (focused ? 'focused' : 'default'), kind });
  return (
    <View className={s.root()}>
      {icon ? <Icon name={icon} size={16} tone="muted" /> : null}
      <TextInput
        className={s.field()}
        multiline={kind === 'multiline' || undefined}
        textAlignVertical={kind === 'multiline' ? 'top' : undefined}
        placeholderTextColor={placeholder}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
    </View>
  );
}

/** What a ref to an Input points at (the native text field): `ref.current?.focus()`. */
type InputRef = React.ComponentRef<typeof TextInput>;

export { Input };
export type { InputRef };
