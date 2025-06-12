import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { SettingsProvider } from "../contexts/SettingsContext";
import "../locales/i18n";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
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
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            bottom: Math.max(insets.bottom, 20),
            left: 20,
            right: 20,
            height: 70,
            borderRadius: 35,
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 10,
            },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            paddingBottom: 0,
          },
          tabBarItemStyle: {
            height: 70,
            padding: 0,
          },
          tabBarActiveTintColor: "#ffd700",
          tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <LinearGradient
                  colors={
                    focused
                      ? ["#ffd700", "#ffb700"]
                      : ["transparent", "transparent"]
                  }
                  style={[
                    styles.tabIconGradient,
                    focused && styles.tabIconGradientActive,
                  ]}
                >
                  <MaterialCommunityIcons name="home" size={28} color={color} />
                </LinearGradient>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="prayerScreen"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <LinearGradient
                  colors={
                    focused
                      ? ["#ffd700", "#ffb700"]
                      : ["transparent", "transparent"]
                  }
                  style={[
                    styles.tabIconGradient,
                    focused && styles.tabIconGradientActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="clock-time-four"
                    size={28}
                    color={color}
                  />
                </LinearGradient>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="qibla"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <LinearGradient
                  colors={
                    focused
                      ? ["#ffd700", "#ffb700"]
                      : ["transparent", "transparent"]
                  }
                  style={[
                    styles.tabIconGradient,
                    focused && styles.tabIconGradientActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="compass"
                    size={28}
                    color={color}
                  />
                </LinearGradient>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="quran"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <LinearGradient
                  colors={
                    focused
                      ? ["#ffd700", "#ffb700"]
                      : ["transparent", "transparent"]
                  }
                  style={[
                    styles.tabIconGradient,
                    focused && styles.tabIconGradientActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="book-open-variant"
                    size={28}
                    color={color}
                  />
                </LinearGradient>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="hadith"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <LinearGradient
                  colors={
                    focused
                      ? ["#ffd700", "#ffb700"]
                      : ["transparent", "transparent"]
                  }
                  style={[
                    styles.tabIconGradient,
                    focused && styles.tabIconGradientActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="book-multiple"
                    size={28}
                    color={color}
                  />
                </LinearGradient>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="dhikr"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <LinearGradient
                  colors={
                    focused
                      ? ["#ffd700", "#ffb700"]
                      : ["transparent", "transparent"]
                  }
                  style={[
                    styles.tabIconGradient,
                    focused && styles.tabIconGradientActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="hand-heart"
                    size={28}
                    color={color}
                  />
                </LinearGradient>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="asmaulhusna"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <LinearGradient
                  colors={
                    focused
                      ? ["#ffd700", "#ffb700"]
                      : ["transparent", "transparent"]
                  }
                  style={[
                    styles.tabIconGradient,
                    focused && styles.tabIconGradientActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="star-circle"
                    size={28}
                    color={color}
                  />
                </LinearGradient>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="hijri"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <LinearGradient
                  colors={
                    focused
                      ? ["#ffd700", "#ffb700"]
                      : ["transparent", "transparent"]
                  }
                  style={[
                    styles.tabIconGradient,
                    focused && styles.tabIconGradientActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="calendar"
                    size={28}
                    color={color}
                  />
                </LinearGradient>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <LinearGradient
                  colors={
                    focused
                      ? ["#ffd700", "#ffb700"]
                      : ["transparent", "transparent"]
                  }
                  style={[
                    styles.tabIconGradient,
                    focused && styles.tabIconGradientActive,
                  ]}
                >
                  <MaterialCommunityIcons name="cog" size={28} color={color} />
                </LinearGradient>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <LinearGradient
                  colors={
                    focused
                      ? ["#ffd700", "#ffb700"]
                      : ["transparent", "transparent"]
                  }
                  style={[
                    styles.tabIconGradient,
                    focused && styles.tabIconGradientActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="information"
                    size={28}
                    color={color}
                  />
                </LinearGradient>
              </View>
            ),
          }}
        />
      </Tabs>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 50,
  },
  tabIconGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tabIconGradientActive: {
    borderColor: "#ffd700",
    shadowColor: "#ffd700",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
});
