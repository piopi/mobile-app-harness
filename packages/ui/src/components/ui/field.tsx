// Field: a form control with its label above and, below, either a hint or the error that
// stops the form. The control itself (Input) comes in as children, so the field works for any control.
import * as React from 'react';
import { View } from 'react-native';
import { Icon } from './icon';
import { Text } from './text';

type FieldProps = {
  label: string;
  /** Helper copy under the control. Hidden while there is an error. */
  hint?: string;
  /** The problem to fix, in a sentence. Pair it with `state="error"` on the Input. */
  error?: string | null;
  children: React.ReactNode;
  testID?: string;
};

function Field({ label, hint, error, children, testID }: FieldProps) {
  return (
    <View className="gap-2" testID={testID}>
      <Text variant="label">{label}</Text>
      {children}
      {error ? (
        <View className="flex-row items-center gap-2" accessibilityLiveRegion="polite">
          <Icon name="alert" size={14} tone="danger" />
          <Text variant="callout" tone="danger" testID={testID ? `${testID}-error` : undefined}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="callout" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export { Field };
export type { FieldProps };
