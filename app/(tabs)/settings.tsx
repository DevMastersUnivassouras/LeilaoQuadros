import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function SettingsScreen() {
  const limparDados = async () => {
    try {
      await AsyncStorage.removeItem("@ja_acessou");
      Alert.alert(
        "Sucesso",
        "Dados limpos! Feche e abra o app, para testar o pop-up.",
        [{ text: "OK" }],
      );
    } catch (e) {
      Alert.alert("Erro", "Não foi possível limpar os dados.");
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}
        >
          Settings
        </ThemedText>
      </ThemedView>

      <View style={styles.container}>
        <TouchableOpacity style={styles.botao} onPress={limparDados}>
          <Text style={styles.mensagem}>Limpar Dados</Text>
        </TouchableOpacity>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Faz a View ocupar a tela toda
    alignItems: "center", // Centraliza horizontalmente
    justifyContent: "center", // Centraliza verticalmente
    padding: 20,
    paddingBottom: 100,
  },
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  botao: {
    backgroundColor: "red",
    padding: 15,
    borderRadius: 10,
  },
  mensagem: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 16,
  },
});
