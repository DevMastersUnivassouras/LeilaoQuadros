import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Alert, Button, Modal, StyleSheet, Text, View } from "react-native";

export default function App() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    verificarPrimeiroAcesso();
  }, []);

  const verificarPrimeiroAcesso = async () => {
    try {
      const jaAcessou = await AsyncStorage.getItem("@ja_acessou");

      if (jaAcessou == null) {
        setVisivel(true);
        await AsyncStorage.setItem("@ja_acessou", "true");
      }
    } catch (e) {
      console.log("Erro ao ler o storage", e);
    }
  };

  const handlePress = () => {
    Alert.alert("Olá!", "Você clicou no botão!");
  };

  const botaoCadastro = () => {
    Alert.alert("Você realizou o cadastro!");
    setVisivel(false);
  };

  return (
    // No React, usamos JSX. As tags são parecidas com HTML, mas começam com letra maiúscula.
    <View style={styles.container}>
      <Text style={styles.tituloInicial}>Bem-vindo ao Leilão Mania!</Text>
      <Text style={styles.subtitulo}>
        Aqui você poderá anunciar ou dar o lance em um leilão.
      </Text>

      <Modal animationType="slide" transparent={true} visible={visivel}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.titulo}>Bem vindo ao Leilão Mania!</Text>
            <Text style={styles.mensagem}>Deseja realizar o cadastro?</Text>
            <View style={styles.boxBotao}>
              <Button
                title="Cadastar"
                onPress={botaoCadastro}
                color="#007BFF"
              />
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.boxBotao}>
        <Button title="Iniciar" onPress={handlePress} color="#007BFF" />
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

// O estilo em React Native é baseado no CSS, mas usamos camelCase (ex: backgroundColor em vez de background-color)
const styles = StyleSheet.create({
  container: {
    flex: 1, // Faz a View ocupar a tela toda
    backgroundColor: "#f5f5f5",
    alignItems: "center", // Centraliza horizontalmente
    justifyContent: "center", // Centraliza verticalmente
    padding: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  tituloInicial: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitulo: {
    fontSize: 16,
    color: "#666",
    textAlign: "justify",
    marginBottom: 30,
  },
  boxBotao: {
    width: "100%",
    paddingHorizontal: 20,
  },
  mensagem: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 16,
  },
});
