import { ScrollView, StyleSheet, View } from 'react-native';

import { ViewTema } from '@/components/view-tema';
import { usarEsquemaCor } from '@/hooks/esquema-cor';
import { usarCorTema } from '@/hooks/cor-tema';

const ALTURA_CABECALHO = 250;

export default function RolagemParallax({ children, headerImage, headerBackgroundColor }) {
  const corFundo = usarCorTema({}, 'background');
  const esquemaCor = usarEsquemaCor() ?? 'light';

  return (
    <ScrollView style={{ backgroundColor: corFundo, flex: 1 }}>
      <View style={[styles.cabecalho, { backgroundColor: headerBackgroundColor[esquemaCor] }]}>
        {headerImage}
      </View>
      <ViewTema style={styles.conteudo}>{children}</ViewTema>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  caixaPrincipal: {
    flex: 1,
  },
  cabecalho: {
    height: ALTURA_CABECALHO,
    overflow: 'hidden',
  },
  conteudo: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
});
