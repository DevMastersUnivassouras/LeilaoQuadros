import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const AUTH_USER_KEY = 'auth_user';
const AUTH_TOKEN_KEY = 'auth_token';
const BIOMETRIC_TOKEN_KEY = 'bio_token';

export async function salvarSessao(user, token) {
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function carregarSessao() {
  const usuarioSalvo = await AsyncStorage.getItem(AUTH_USER_KEY);
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

  if (!usuarioSalvo || !token) {
    return null;
  }

  return {
    user: JSON.parse(usuarioSalvo),
    token,
  };
}

export async function limparSessao() {
  await AsyncStorage.removeItem(AUTH_USER_KEY);
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export async function salvarTokenBiometria(token) {
  await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token);
}

export async function pegarTokenBiometria() {
  return SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
}

export async function limparTokenBiometria() {
  await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
}
