import { StyleSheet, Text } from 'react-native';

import { usarCorTema } from '@/hooks/cor-tema';

export function TextoTema({ style, lightColor, darkColor, type = 'default', ...rest }) {
  const color = usarCorTema({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.padrao : undefined,
        type === 'title' ? styles.titulo : undefined,
        type === 'defaultSemiBold' ? styles.padraoSemiNegrito : undefined,
        type === 'subtitle' ? styles.subtitulo : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  padrao: {
    fontSize: 16,
    lineHeight: 24,
  },
  padraoSemiNegrito: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitulo: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
