import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const MAPEAMENTO = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
};

export function IconeSimbolo({ name, size = 24, color, style }) {
  return <MaterialIcons color={color} size={size} name={MAPEAMENTO[name]} style={style} />;
}
