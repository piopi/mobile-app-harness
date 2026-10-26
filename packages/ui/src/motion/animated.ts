// Reanimated views that also take className (Uniwind). Use these inside packages/ui instead of Animated.View.
import { Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { withUniwind } from 'uniwind';

export const AnimatedView = withUniwind(Animated.View);
export const AnimatedText = withUniwind(Animated.createAnimatedComponent(Text));
