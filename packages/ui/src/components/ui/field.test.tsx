import { render, screen } from '@testing-library/react-native';
import { Field } from './field';
import { Input } from './input';

describe('Field', () => {
  it('labels the control and shows the hint', async () => {
    await render(
      <Field label="Email" hint="We'll send a code.">
        <Input accessibilityLabel="Email" />
      </Field>,
    );
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText("We'll send a code.")).toBeTruthy();
  });

  it('replaces the hint with the error', async () => {
    await render(
      <Field label="Phone" hint="Hint" error="Add a phone number." testID="phone">
        <Input />
      </Field>,
    );
    expect(screen.getByTestId('phone-error')).toHaveTextContent('Add a phone number.');
    expect(screen.queryByText('Hint')).toBeNull();
  });
});
