import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { TextoTema } from '@/components/texto-tema';
import { ViewTema } from '@/components/view-tema';

export default function TelaModal() {
  return (
    <ViewTema style={styles.caixaPrincipal}>
      <TextoTema type="title">Isso é uma modal</TextoTema>
      <Link href="/" dismissTo style={styles.linkInicio}>
        <TextoTema type="link">Voltar para a tela inicial</TextoTema>
      </Link>
    </ViewTema>
  );
}

const styles = StyleSheet.create({
  caixaPrincipal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  linkInicio: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
