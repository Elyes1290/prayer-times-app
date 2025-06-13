import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

interface Nom {
  key: string;
  number: number;
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

const { width } = Dimensions.get("window");

function removeAccents(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u0652]/g, "");
}

const AsmaulHusnaScreen = () => {
  const { t: tAsma } = useTranslation("asmaulhusna");
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [animations] = useState(new Map());

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
    const searchLower = removeAccents(searchQuery.toLowerCase());
    return (
      removeAccents(item.arabic.toLowerCase()).includes(searchLower) ||
      removeAccents(item.translit.toLowerCase()).includes(searchLower) ||
      removeAccents(item.french.toLowerCase()).includes(searchLower) ||
      removeAccents(item.meaning.toLowerCase()).includes(searchLower)
    );
  });

  const toggleExpand = (id: string) => {
    if (!animations.has(id)) {
      animations.set(id, new Animated.Value(0));
    }
    const animation = animations.get(id);

    if (expandedId === id) {
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => setExpandedId(null));
    } else {
      if (expandedId) {
        const prevAnimation = animations.get(expandedId);
        Animated.timing(prevAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
      setExpandedId(id);
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const renderNameCard = ({ item }: { item: Nom }) => {
    const isExpanded = expandedId === item.key;
    const animation = animations.get(item.key) || new Animated.Value(0);

    const maxHeight = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1000],
    });

    return (
      <View style={styles.card}>
        <LinearGradient
          colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
          style={styles.cardGradient}
        >
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => toggleExpand(item.key)}
            activeOpacity={0.7}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.numberContainer}>
                <Text style={styles.number}>{item.number}</Text>
              </View>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={24}
                color="#fff"
                style={styles.expandIcon}
              />
            </View>
            <View style={styles.arabicNameContainer}>
              <Text style={styles.arabic}>{item.arabic}</Text>
            </View>
            <View style={styles.nameDetailsContainer}>
              <Text style={styles.translit}>{item.translit}</Text>
              <Text style={styles.french}>{item.french}</Text>
            </View>
          </TouchableOpacity>

          <Animated.View style={[styles.cardDetails, { maxHeight }]}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Signification</Text>
              <Text style={styles.sectionText}>{item.meaning}</Text>
            </View>
            {item.occurrences && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Occurrences</Text>
                <Text style={styles.sectionText}>{item.occurrences}</Text>
              </View>
            )}
            {item.benefits && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bénéfices</Text>
                <Text style={styles.sectionText}>{item.benefits}</Text>
              </View>
            )}
            {item.usage && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Utilisation</Text>
                <Text style={styles.sectionText}>{item.usage}</Text>
              </View>
            )}
            {item.hadith && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hadith</Text>
                <Text style={styles.sectionText}>{item.hadith}</Text>
              </View>
            )}
            {item.details && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Détails</Text>
                <Text style={styles.sectionText}>{item.details}</Text>
              </View>
            )}
            {item.reference && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Référence</Text>
                <Text style={styles.sectionText}>{item.reference}</Text>
              </View>
            )}
            {item.spiritual_effect && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Effet Spirituel</Text>
                <Text style={styles.sectionText}>{item.spiritual_effect}</Text>
              </View>
            )}
            {item.citation && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Citation</Text>
                <Text style={styles.sectionText}>{item.citation}</Text>
              </View>
            )}
          </Animated.View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <ImageBackground
      source={require("../assets/images/prayer-bg.png")}
      style={[styles.container, { paddingTop: insets.top }]}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <View style={styles.header}>
        <Text style={styles.title}>{tAsma("title")}</Text>
        <Text style={styles.subtitle}>{tAsma("subtitle")}</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#666"
          style={styles.searchIcon}
        />
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
        renderItem={renderNameCard}
        keyExtractor={(item) => item.key}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 150 }]}
        showsVerticalScrollIndicator={false}
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    marginBottom: 20,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: "#fff",
    fontSize: 16,
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  card: {
    marginBottom: 15,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardGradient: {
    borderRadius: 16,
  },
  cardHeader: {
    padding: 15,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  numberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  number: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  expandIcon: {
    marginLeft: 10,
  },
  arabicNameContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  arabic: {
    fontSize: 40,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  nameDetailsContainer: {
    alignItems: "center",
  },
  translit: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 4,
    textAlign: "center",
  },
  french: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  cardDetails: {
    overflow: "hidden",
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
});

export default AsmaulHusnaScreen;
