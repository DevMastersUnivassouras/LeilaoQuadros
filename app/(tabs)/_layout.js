import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AbaHaptica } from '@/components/aba-haptica';
import { IconeSimbolo } from '@/components/ui/icone-simbolo';
import { Cores } from '@/constants/tema';
import { usarEsquemaCor } from '@/hooks/esquema-cor';
import { useAutenticacao } from '@/src/auth/context/contexto-autenticacao';

export default function LayoutAbas() {
  const esquemaCor = usarEsquemaCor();
  const { usuario, carregando } = useAutenticacao();

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!usuario) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Cores[esquemaCor ?? 'light'].tint,
        headerShown: false,
        tabBarButton: AbaHaptica,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <IconeSimbolo size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configuracoes',
          tabBarIcon: ({ color }) => <IconeSimbolo size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <IconeSimbolo size={28} name="person.crop.circle.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
