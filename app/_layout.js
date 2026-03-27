import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ProvedorAutenticacao } from '@/src/auth/context/contexto-autenticacao';
import { usarEsquemaCor } from '@/hooks/esquema-cor';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function LayoutRaiz() {
  const esquemaCor = usarEsquemaCor();

  return (
    <ProvedorAutenticacao>
      <ThemeProvider value={esquemaCor === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Janela' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ProvedorAutenticacao>
  );
}
