import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Image,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
} from "react-native";
import { useTranslation } from "react-i18next";

export default function AboutScreen() {
  const { t } = useTranslation();

  return (
    <ImageBackground
      source={require("../assets/images/prayer-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
          />
          <Text style={styles.title}>{t("abouts.title")}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>{t("abouts.welcome")}</Text>
          <Text style={styles.desc}>{t("abouts.description")}</Text>
          <Text style={styles.infoText}>{t("abouts.version_info_1")}</Text>
          <Text style={styles.infoText}>{t("abouts.version_info_2")}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("abouts.contact_title")}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              Linking.openURL(
                "mailto:elyes.naitliman@gmail.com?subject=Suggestion%20Application%20Musulmane"
              )
            }
          >
            <Text style={styles.buttonText}>{t("abouts.contact_button")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("abouts.developer_title")}</Text>
          <Text style={styles.text}>{t("abouts.developer_name")}</Text>
          <Text style={styles.text}>{t("abouts.linkedin")}</Text>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                "https://www.linkedin.com/in/elyes-nait-liman-bbb7b4189"
              )
            }
          >
            <Text
              style={[
                styles.text,
                { color: "#0077b5", textDecorationLine: "underline" },
              ]}
            >
              www.linkedin.com/in/elyes-nait-liman-bbb7b4189
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("abouts.sources_title")}</Text>
          <Text style={styles.text}>{t("abouts.source_quran")}</Text>
          <Text style={styles.text}>{t("abouts.source_hadith")}</Text>
          <Text style={styles.text}>{t("abouts.source_icons")}</Text>
        </View>

        <Text style={styles.version}>{t("abouts.version")}</Text>
        <Text style={styles.footer}>{t("abouts.footer_thanks")}</Text>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, padding: 24, marginTop: 70 },
  header: { alignItems: "center", marginBottom: 24 },
  logo: { width: 72, height: 72, borderRadius: 24, marginBottom: 10 },
  title: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 6,
    fontFamily: "ScheherazadeNew",
    textAlign: "center",
  },
  desc: {
    fontSize: 16,
    color: "#483C1C",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "ScheherazadeNew",
  },
  section: {
    marginVertical: 14,
    backgroundColor: "#f8ecc2",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#b59d42",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#b59d42",
    marginBottom: 8,
    fontFamily: "ScheherazadeNew",
  },
  text: {
    fontSize: 15,
    color: "#6c5d3b",
    marginBottom: 4,
    fontFamily: "ScheherazadeNew",
  },
  button: {
    marginTop: 7,
    backgroundColor: "#e7c86a",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ba9c34",
  },
  buttonText: {
    color: "#483C1C",
    fontSize: 16,
    fontFamily: "ScheherazadeNew",
    fontWeight: "bold",
  },
  version: {
    marginTop: 30,
    color: "#b59d42",
    fontSize: 13,
    textAlign: "center",
  },
  footer: {
    marginTop: 10,
    color: "#888",
    textAlign: "center",
    fontSize: 13,
    fontStyle: "italic",
  },
  infoContainer: {
    backgroundColor: "#fffbe6",
    padding: 16,
    borderRadius: 12,
    marginVertical: 20,
    borderColor: "#ba9c34",
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#483C1C",
    marginBottom: 8,
    fontFamily: "ScheherazadeNew",
  },
  infoText: {
    fontSize: 16,
    color: "#483C1C",
    fontFamily: "ScheherazadeNew",
    marginBottom: 4,
    fontWeight: "bold",
  },
});
