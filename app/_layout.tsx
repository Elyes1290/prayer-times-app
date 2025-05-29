import { MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  Platform,
  Pressable,
  Image,
  View,
  Text,
  ImageBackground,
} from "react-native";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { SettingsProvider } from "../contexts/SettingsContext";
import "../locales/i18n";
import { useTranslation } from "react-i18next";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
// (optionnel) pour charger la police sur TOUTES les pages
import * as Font from "expo-font";

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { t } = useTranslation();
  Font.useFonts({
    ScheherazadeNew: require("../assets/fonts/ScheherazadeNew-Regular.ttf"),
  });

  return (
    <ImageBackground
      source={require("../assets/images/parchment_bg.jpg")}
      style={{ flex: 1 }}
      imageStyle={{ resizeMode: "cover" }}
    >
      <DrawerContentScrollView {...props}>
        {/* Profil/Logo en haut du menu */}
        <View
          style={{
            alignItems: "center",
            paddingVertical: 32,
            borderBottomWidth: 2,
            borderColor: "#ba9c34",
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
              backgroundColor: "#fff",
              borderWidth: 2,
              borderColor: "#ba9c34",
            }}
          />
          <Text
            style={{
              color: "#7c6720",
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
              backgroundColor: "#e7c86a",
              borderRadius: 22,
              borderWidth: 2,
              borderColor: "#ba9c34",
              paddingVertical: 10,
              paddingHorizontal: 22,
              alignItems: "center",
              opacity: 0.5,
              flexDirection: "row",
              justifyContent: "center",
              marginVertical: 5,
            }}
          >
            <MaterialIcons
              name="star"
              size={24}
              color="#ba9c34"
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: "#7c6720",
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
    </ImageBackground>
  );
}

export default function DrawerLayout() {
  const insets = useSafeAreaInsets();
  const headerHeight = (Platform.OS === "android" ? 56 : 44) + insets.top;
  const { t } = useTranslation();

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync("transparent");
      NavigationBar.setButtonStyleAsync("dark");
      NavigationBar.setBehaviorAsync("overlay-swipe");
    }
  }, []);

  return (
    <SettingsProvider>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          header: ({ navigation }) => (
            <ImageBackground
              source={require("../assets/images/parchment_bg.jpg")}
              style={{
                width: "100%",
                height: headerHeight,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: insets.top, // Pour que le fond aille sous la status bar
                position: "relative", // Important pour ImageBackground absolute

                // Pas de paddingBottom ni alignItems: "flex-end"
                // Ainsi les icônes sont bien centrées verticalement
              }}
              imageStyle={{
                resizeMode: "cover",
              }}
            >
              {/* Menu à gauche */}
              <Pressable
                onPress={() => navigation.toggleDrawer()}
                style={{ width: 44, alignItems: "center" }}
              >
                <MaterialIcons name="menu" size={28} color="#ba9c34" />
              </Pressable>
              {/* Logo centré */}
              <Image
                source={require("../assets/images/icon.png")}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: "#fff",
                  borderWidth: 2,
                  borderColor: "#ba9c34",
                }}
              />
              {/* Espace réservé à droite */}
              <View style={{ width: 44 }} />
            </ImageBackground>
          ),
          // Drawer menu style
          drawerStyle: {
            width: 260,
          },
          drawerActiveTintColor: "#997520",
          drawerInactiveTintColor: "#7c6720",
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
        <Drawer.Screen name="about" options={{ title: t("about") }} />
      </Drawer>
    </SettingsProvider>
  );
}
