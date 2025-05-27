import { MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, Pressable } from "react-native";
import { Colors } from "../constants/Colors";
import { SettingsProvider } from "../contexts/SettingsContext";
import "../locales/i18n"; // initialisation i18n
import { useTranslation } from "react-i18next";

export default function DrawerLayout() {
  const { t } = useTranslation();

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync("transparent");
      NavigationBar.setButtonStyleAsync("light");
      NavigationBar.setBehaviorAsync("overlay-swipe");
    }
  }, []);

  return (
    <SettingsProvider>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Drawer
        screenOptions={({ navigation }) => ({
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
          headerTintColor: Colors.text,
          headerStyle: { backgroundColor: "transparent" },
          headerTitle: "",
          headerLeft: () => (
            <Pressable
              onPress={() => navigation.toggleDrawer()}
              style={{ marginLeft: 16 }}
            >
              <MaterialIcons name="menu" size={28} color={Colors.text} />
            </Pressable>
          ),
        })}
      >
        <Drawer.Screen name="index" options={{ title: t("home") }} />
        <Drawer.Screen name="settings" options={{ title: t("settings") }} />
        <Drawer.Screen name="hijri" options={{ title: t("hijri_calendar") }} />
        <Drawer.Screen name="qibla" options={{ title: t("qibla") }} />
        <Drawer.Screen name="quran" options={{ title: t("quran") }} />
        <Drawer.Screen name="hadith" options={{ title: t("hadiths") }} />
        <Drawer.Screen name="about" options={{ title: t("about") }} />
      </Drawer>
    </SettingsProvider>
  );
}
