import { Platform } from 'react-native';

const corDestaqueClaro = '#0a7ea4';
const corDestaqueEscuro = '#fff';

export const Cores = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: corDestaqueClaro,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: corDestaqueClaro,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: corDestaqueEscuro,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: corDestaqueEscuro,
  },
};

export const Fontes = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
