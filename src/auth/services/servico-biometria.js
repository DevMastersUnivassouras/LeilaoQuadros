import * as LocalAuthentication from 'expo-local-authentication';

export async function podeUsarBiometria() {
  const aparelhoCompativel = await LocalAuthentication.hasHardwareAsync();
  if (!aparelhoCompativel) {
    return false;
  }

  const biometriaCadastrada = await LocalAuthentication.isEnrolledAsync();
  return biometriaCadastrada;
}

export async function verificarEstadoBiometria() {
  const aparelhoCompativel = await LocalAuthentication.hasHardwareAsync();

  if (!aparelhoCompativel) {
    return { disponivel: false, motivo: 'Este aparelho não tem biometria.' };
  }

  const biometriaCadastrada = await LocalAuthentication.isEnrolledAsync();

  if (!biometriaCadastrada) {
    return {
      disponivel: false,
      motivo: 'Nenhuma biometria cadastrada nas configurações do celular.',
    };
  }

  return { disponivel: true, motivo: '' };
}

export async function pedirBiometria(mensagem = 'Autorize a biometria para continuar') {
  return LocalAuthentication.authenticateAsync({
    promptMessage: mensagem,
    cancelLabel: 'Cancelar',
    fallbackLabel: 'Usar senha do dispositivo',
  });
}
