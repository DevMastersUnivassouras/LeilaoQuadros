import { Cores } from '@/constants/tema';
import { usarEsquemaCor } from '@/hooks/esquema-cor';

export function usarCorTema(props, colorName) {
  const temaAtual = usarEsquemaCor() ?? 'light';
  const corVindaProps = props[temaAtual];

  if (corVindaProps) {
    return corVindaProps;
  }

  return Cores[temaAtual][colorName];
}
