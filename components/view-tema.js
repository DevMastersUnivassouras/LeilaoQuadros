import { View } from 'react-native';

import { usarCorTema } from '@/hooks/cor-tema';

export function ViewTema({ style, lightColor, darkColor, ...otherProps }) {
  const backgroundColor = usarCorTema({ light: lightColor, dark: darkColor }, 'background');

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
