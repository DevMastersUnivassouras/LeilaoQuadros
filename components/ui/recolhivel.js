import { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { TextoTema } from '@/components/texto-tema';
import { ViewTema } from '@/components/view-tema';
import { IconeSimbolo } from '@/components/ui/icone-simbolo';
import { Cores } from '@/constants/tema';
import { usarEsquemaCor } from '@/hooks/esquema-cor';

export function Recolhivel({ children, title }) {
  const [estaAberto, setEstaAberto] = useState(false);
  const esquemaCor = usarEsquemaCor() ?? 'light';

  return (
    <ViewTema>
      <TouchableOpacity style={styles.cabecalho} onPress={() => setEstaAberto((value) => !value)} activeOpacity={0.8}>
        <IconeSimbolo
          name="chevron.right"
          size={18}
          weight="medium"
          color={esquemaCor === 'light' ? Cores.light.icon : Cores.dark.icon}
          style={{ transform: [{ rotate: estaAberto ? '90deg' : '0deg' }] }}
        />

        <TextoTema type="defaultSemiBold">{title}</TextoTema>
      </TouchableOpacity>
      {estaAberto && <ViewTema style={styles.conteudo}>{children}</ViewTema>}
    </ViewTema>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  conteudo: {
    marginTop: 6,
    marginLeft: 24,
  },
});
