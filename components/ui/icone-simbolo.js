import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const MAPEAMENTO = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'person.crop.circle.fill': 'person',
  'shield.fill': 'shield',
  'list.bullet.rectangle.fill': 'view-list',
  'trophy.fill': 'emoji-events',
  'chart.bar.fill': 'dashboard',
  'gavel.fill': 'gavel',
  'person.3.fill': 'groups',
  rosette: 'workspace-premium',
  'shippingbox.fill': 'local-shipping',
};

export function IconeSimbolo({ name, size = 24, color, style }) {
  return <MaterialIcons color={color} size={size} name={MAPEAMENTO[name]} style={style} />;
}
