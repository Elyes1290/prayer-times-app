import React, { useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  FlatList,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

interface Nom {
  key: string;
  arabic: string;
  translit: string;
  french: string;
  meaning: string;
  occurrences?: string;
  benefits?: string;
  usage?: string;
  hadith?: string;
  details?: string;
  reference?: string;
  spiritual_effect?: string;
  citation?: string;
}

const HEADER_HEIGHT = 110;

function removeAccents(str: string) {
  return (
    str
      // Pour le français/translit
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Pour l'arabe, enlève les harakat
      .replace(/[\u064B-\u0652]/g, "")
  );
}

const AsmaulHusnaScreen = () => {
  const { t: tAsma } = useTranslation("asmaulhusna");
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNames = Array.from({ length: 99 }, (_, i) => {
    const num = i + 1;
    return {
      key: `name_${num}`,
      number: num,
      arabic: tAsma(`name_${num}.arabic`),
      translit: tAsma(`name_${num}.translit`),
      french: tAsma(`name_${num}.french`),
      meaning: tAsma(`name_${num}.meaning`),
      occurrences: tAsma(`name_${num}.occurrences`),
      benefits: tAsma(`name_${num}.benefits`),
      usage: tAsma(`name_${num}.usage`),
      hadith: tAsma(`name_${num}.hadith`),
      details: tAsma(`name_${num}.details`),
      reference: tAsma(`name_${num}.reference`),
      spiritual_effect: tAsma(`name_${num}.spiritual_effect`),
      citation: tAsma(`name_${num}.citation`),
    };
  }).filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      item.arabic.toLowerCase().includes(searchLower) ||
      item.translit.toLowerCase().includes(searchLower) ||
      item.french.toLowerCase().includes(searchLower) ||
      item.meaning.toLowerCase().includes(searchLower)
    );
  });

  return (
    <ImageBackground
      source={require("../assets/images/prayer-bg.png")}
      style={styles.background}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={tAsma("search_placeholder")}
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredNames}
          renderItem={({ item }) => (
            <ImageBackground
              source={require("../assets/images/prayer-bg.png")}
              style={styles.cardBG}
              imageStyle={{ borderRadius: 18, resizeMode: "cover" }}
            >
              <View style={styles.cardContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.arabic}>
                    {item.number}. {item.arabic}
                  </Text>
                  <Text style={styles.translit}>
                    {item.translit} — {item.french}
                  </Text>
                  <Text style={styles.meaning}>{item.meaning}</Text>
                </View>
              </View>
            </ImageBackground>
          )}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContainer}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  cardBG: {
    marginBottom: 12,
    borderRadius: 18,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  arabic: {
    fontSize: 24,
    color: "#fff",
    marginBottom: 4,
    textAlign: "right",
  },
  translit: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 4,
  },
  meaning: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 2,
  },
});

export default AsmaulHusnaScreen;
