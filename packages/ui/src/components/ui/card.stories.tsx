import type { Meta, StoryObj } from '@storybook/react-native';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Stack } from './stack';
import { Text } from './text';

const meta = { title: 'UI/Card', component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <Stack gap="md">
      {(['surface', 'outline', 'ink', 'plain'] as const).map((variant) => (
        <Card key={variant} variant={variant}>
          <CardHeader>
            <CardTitle>{`Card · ${variant}`}</CardTitle>
            <CardDescription>A short line that explains the group.</CardDescription>
          </CardHeader>
          <CardContent>
            <Text variant="body">Content sits on the card's padding rhythm.</Text>
          </CardContent>
          <CardFooter>
            <Button size="sm" label="Action" />
          </CardFooter>
        </Card>
      ))}
    </Stack>
  ),
};
