import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AbaHaptica } from '@/components/aba-haptica';
import { IconeSimbolo } from '@/components/ui/icone-simbolo';
import { Cores } from '@/constants/tema';
import { usarEsquemaCor } from '@/hooks/esquema-cor';
import { useAutenticacao } from '@/src/auth/context/contexto-autenticacao';

export default function LayoutAdmin() {
  const esquemaCor = usarEsquemaCor();
  const { usuario, ehAdmin, carregando } = useAutenticacao();

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!usuario) {
    return <Redirect href="/admin-login" />;
  }

  if (!ehAdmin) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: AbaHaptica,
        tabBarActiveTintColor: Cores[esquemaCor ?? 'light'].tint,
      }}
    >
      <Tabs.Screen
        name="resumo"
        options={{
          title: 'Resumo',
          tabBarIcon: ({ color }) => <IconeSimbolo size={24} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="leiloes"
        options={{
          title: 'Leiloes',
          tabBarIcon: ({ color }) => <IconeSimbolo size={24} name="gavel.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="participantes"
        options={{
          title: 'Participantes',
          tabBarIcon: ({ color }) => <IconeSimbolo size={24} name="person.3.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="vencedores"
        options={{
          title: 'Vencedores',
          tabBarIcon: ({ color }) => <IconeSimbolo size={24} name="rosette" color={color} />,
        }}
      />
      <Tabs.Screen
        name="resgates"
        options={{
          title: 'Resgates',
          tabBarIcon: ({ color }) => <IconeSimbolo size={24} name="shippingbox.fill" color={color} />,
        }}
      />
      <Tabs.Screen name="painel" options={{ href: null }} />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
