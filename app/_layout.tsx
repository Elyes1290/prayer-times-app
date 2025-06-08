import { MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, Pressable, Image, View, Text } from "react-native";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { SettingsProvider } from "../contexts/SettingsContext";
import "../locales/i18n";
import { useTranslation } from "react-i18next";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Font from "expo-font";

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { t } = useTranslation();
  Font.useFonts({
    ScheherazadeNew: require("../assets/fonts/ScheherazadeNew-Regular.ttf"),
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#191d2b" /* nuit profond */ }}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0 }}
      >
        {/* Profil/Logo en haut du menu */}
        <View
          style={{
            alignItems: "center",
            paddingVertical: 32,
            borderBottomWidth: 1,
            borderColor: "#314670", // Liseré bleu nuit
            marginBottom: 10,
          }}
        >
          <Image
            source={require("../assets/images/icon.png")}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              marginBottom: 10,
              backgroundColor: "#22304b",
              borderWidth: 2,
              borderColor: "#fffbe8", // doré pâle ou blanc cassé
            }}
          />
          <Text
            style={{
              color: "#fffbe8",
              fontWeight: "bold",
              fontFamily: "ScheherazadeNew",
              fontSize: 22,
              letterSpacing: 1,
            }}
          >
            MyAdhan
          </Text>
        </View>
        <DrawerItemList {...props} />
        {/* Premium désactivé */}
        <View style={{ paddingHorizontal: 6, paddingTop: 14 }}>
          <View
            style={{
              backgroundColor: "#242942",
              borderRadius: 22,
              borderWidth: 1.5,
              borderColor: "#3c497e",
              paddingVertical: 10,
              paddingHorizontal: 22,
              alignItems: "center",
              opacity: 0.65,
              flexDirection: "row",
              justifyContent: "center",
              marginVertical: 5,
            }}
          >
            <MaterialIcons
              name="star"
              size={24}
              color="#ffd700"
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: "#ffd700",
                fontFamily: "ScheherazadeNew",
                fontWeight: "bold",
                fontSize: 18,
                letterSpacing: 1,
              }}
            >
              {t("premium_coming_soon") || "Devenir Premium"}
            </Text>
          </View>
        </View>
      </DrawerContentScrollView>
    </View>
  );
}

export default function DrawerLayout() {
  const insets = useSafeAreaInsets();
  const headerHeight = (Platform.OS === "android" ? 56 : 44) + insets.top;
  const { t } = useTranslation();

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync("#191d2b");
      NavigationBar.setButtonStyleAsync("light");
      NavigationBar.setBehaviorAsync("overlay-swipe");
    }
  }, []);

  return (
    <SettingsProvider>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          header: ({ navigation }) => (
            <View
              style={{
                width: "100%",
                height: headerHeight,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: insets.top,
                backgroundColor: "rgba(25,29,43,0.96)",
                borderBottomWidth: 1,
                borderColor: "#2c3958",
              }}
            >
              {/* Menu à gauche */}
              <Pressable
                onPress={() => navigation.toggleDrawer()}
                style={{ width: 44, alignItems: "center" }}
              >
                <MaterialIcons name="menu" size={28} color="#fffbe8" />
              </Pressable>
              {/* Logo centré */}
              <Image
                source={require("../assets/images/icon.png")}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: "#22304b",
                  borderWidth: 2,
                  borderColor: "#fffbe8",
                }}
              />
              {/* Espace réservé à droite */}
              <View style={{ width: 44 }} />
            </View>
          ),
          drawerStyle: {
            width: 260,
            backgroundColor: "#191d2b",
            borderRightWidth: 0,
          },
          drawerActiveTintColor: "#ffd700", // doré clair
          drawerInactiveTintColor: "#fffbe8", // blanc cassé
          drawerLabelStyle: {
            fontSize: 18,
            fontFamily: "ScheherazadeNew",
            fontWeight: "bold",
            letterSpacing: 1,
          },
        }}
      >
        <Drawer.Screen name="index" options={{ title: t("home") }} />
        <Drawer.Screen name="settings" options={{ title: t("settings") }} />
        <Drawer.Screen name="hijri" options={{ title: t("hijri_calendar") }} />
        <Drawer.Screen name="qibla" options={{ title: t("qibla") }} />
        <Drawer.Screen name="quran" options={{ title: t("quran") }} />
        <Drawer.Screen name="hadith" options={{ title: t("hadiths") }} />
        <Drawer.Screen name="dhikr" options={{ title: t("dhikr_dua") }} />
        <Drawer.Screen
          name="asmaulhusna"
          options={{ title: t("asmaulhusna") }}
        />
        <Drawer.Screen name="about" options={{ title: t("about") }} />
      </Drawer>
    </SettingsProvider>
  );
}
