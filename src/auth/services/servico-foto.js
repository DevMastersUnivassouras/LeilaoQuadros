import * as ImagePicker from 'expo-image-picker';

function obterMediaTypeImagem() {
  if (ImagePicker.MediaType?.Images) {
    return [ImagePicker.MediaType.Images];
  }

  if (ImagePicker.MediaType?.images) {
    return [ImagePicker.MediaType.images];
  }

  return ['images'];
}

async function prepararImagem(asset) {
  if (!asset?.uri) {
    return null;
  }

  return {
    uri: asset.uri,
    fileName: asset.fileName || '',
    mimeType: asset.mimeType || '',
  };
}

export async function escolherFotoDaGaleria() {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permissao.granted) {
    throw new Error('Permissão da galeria não concedida.');
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: obterMediaTypeImagem(),
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (resultado.canceled || !resultado.assets?.length) {
    return null;
  }

  return prepararImagem(resultado.assets[0]);
}

export async function tirarFotoAgora() {
  const permissao = await ImagePicker.requestCameraPermissionsAsync();

  if (!permissao.granted) {
    throw new Error('Permissão da câmera não concedida.');
  }

  const resultado = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (resultado.canceled || !resultado.assets?.length) {
    return null;
  }

  return prepararImagem(resultado.assets[0]);
}
