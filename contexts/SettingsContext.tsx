import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useEffect, useState } from "react";

export type AdhanSoundKey =
  | "adhamalsharqawe"
  | "adhanaljazaer"
  | "ahmedelkourdi";

export type CalcMethodKey =
  | "MuslimWorldLeague"
  | "Egyptian"
  | "Karachi"
  | "UmmAlQura"
  | "NorthAmerica"
  | "Kuwait"
  | "Qatar"
  | "Singapore"
  | "Tehran";

export type LocationMode = "auto" | "manual";

export type ManualLocation = {
  city: string;
  lat: number;
  lon: number;
  country?: string;
} | null;

export interface SettingsContextType {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  calcMethod: CalcMethodKey;
  setCalcMethod: (method: CalcMethodKey) => void;
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  adhanSound: AdhanSoundKey;
  setAdhanSound: (s: AdhanSoundKey) => void;
  remindersEnabled: boolean;
  setRemindersEnabled: (value: boolean) => void;
  reminderOffset: number;
  setReminderOffset: (value: number) => void;
  locationMode: LocationMode;
  setLocationMode: (mode: LocationMode) => void;
  manualLocation: ManualLocation;
  setManualLocation: (loc: ManualLocation) => void;
  language: string; // <-- ajouté ici
  setLanguage: (lang: string) => void; // <-- ajouté ici
}

export const SettingsContext = createContext<SettingsContextType>({
  notificationsEnabled: true,
  setNotificationsEnabled: () => {},
  calcMethod: "MuslimWorldLeague",
  setCalcMethod: () => {},
  soundEnabled: true,
  setSoundEnabled: () => {},
  adhanSound: "adhamalsharqawe",
  setAdhanSound: () => {},
  remindersEnabled: true,
  setRemindersEnabled: () => {},
  reminderOffset: 10,
  setReminderOffset: () => {},
  locationMode: "auto",
  setLocationMode: () => {},
  manualLocation: null,
  setManualLocation: () => {},
  language: "fr", // valeur par défaut
  setLanguage: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [notificationsEnabled, setNotificationsEnabled] =
    useState<boolean>(true);
  const [calcMethod, setCalcMethod] =
    useState<CalcMethodKey>("MuslimWorldLeague");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [adhanSound, setAdhanSound] =
    useState<AdhanSoundKey>("adhamalsharqawe");
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(true);
  const [reminderOffset, setReminderOffset] = useState<number>(10);

  const [locationMode, setLocationMode] = useState<LocationMode>("manual");
  const [manualLocation, setManualLocation] = useState<ManualLocation>(null);

  const [language, setLanguage] = useState<string>("fr"); // état pour la langue

  // Chargement unique des settings depuis AsyncStorage au montage
  useEffect(() => {
    (async () => {
      const [
        notificationsEnabledValue,
        calcMethodValue,
        soundEnabledValue,
        adhanSoundValue,
        remindersEnabledValue,
        reminderOffsetValue,
        locationModeValue,
        manualLocationValue,
        languageValue,
      ] = await Promise.all([
        AsyncStorage.getItem("notificationsEnabled"),
        AsyncStorage.getItem("calcMethod"),
        AsyncStorage.getItem("soundEnabled"),
        AsyncStorage.getItem("adhanSound"),
        AsyncStorage.getItem("remindersEnabled"),
        AsyncStorage.getItem("reminderOffset"),
        AsyncStorage.getItem("locationMode"),
        AsyncStorage.getItem("manualLocation"),
        AsyncStorage.getItem("language"), // chargement langue
      ]);
      if (notificationsEnabledValue !== null)
        setNotificationsEnabled(notificationsEnabledValue === "true");
      if (
        calcMethodValue &&
        [
          "MuslimWorldLeague",
          "Egyptian",
          "Karachi",
          "UmmAlQura",
          "NorthAmerica",
          "Kuwait",
          "Qatar",
          "Singapore",
          "Tehran",
        ].includes(calcMethodValue)
      ) {
        setCalcMethod(calcMethodValue as CalcMethodKey);
      }
      if (soundEnabledValue !== null)
        setSoundEnabled(soundEnabledValue === "true");
      if (adhanSoundValue) setAdhanSound(adhanSoundValue as AdhanSoundKey);
      if (remindersEnabledValue !== null)
        setRemindersEnabled(remindersEnabledValue === "true");
      if (reminderOffsetValue !== null)
        setReminderOffset(Number(reminderOffsetValue));
      if (locationModeValue === "manual" || locationModeValue === "auto")
        setLocationMode(locationModeValue as LocationMode);
      if (manualLocationValue) {
        try {
          const loc = JSON.parse(manualLocationValue);
          if (
            typeof loc.lat === "number" &&
            typeof loc.lon === "number" &&
            typeof loc.city === "string"
          ) {
            setManualLocation(loc);
          }
        } catch (e) {
          setManualLocation(null);
        }
      }
      if (languageValue) setLanguage(languageValue); // setter langue
    })();
  }, []);

  // Persistance des settings
  useEffect(() => {
    AsyncStorage.setItem(
      "notificationsEnabled",
      notificationsEnabled ? "true" : "false"
    );
  }, [notificationsEnabled]);

  useEffect(() => {
    AsyncStorage.setItem("calcMethod", calcMethod);
  }, [calcMethod]);

  useEffect(() => {
    AsyncStorage.setItem("soundEnabled", soundEnabled ? "true" : "false");
  }, [soundEnabled]);

  useEffect(() => {
    AsyncStorage.setItem("adhanSound", adhanSound);
  }, [adhanSound]);

  useEffect(() => {
    AsyncStorage.setItem(
      "remindersEnabled",
      remindersEnabled ? "true" : "false"
    );
  }, [remindersEnabled]);

  useEffect(() => {
    AsyncStorage.setItem("reminderOffset", reminderOffset.toString());
  }, [reminderOffset]);

  useEffect(() => {
    AsyncStorage.setItem("locationMode", locationMode);
  }, [locationMode]);

  useEffect(() => {
    AsyncStorage.setItem(
      "manualLocation",
      JSON.stringify(manualLocation || {})
    );
  }, [manualLocation]);

  // Persistance de la langue
  useEffect(() => {
    AsyncStorage.setItem("language", language);
  }, [language]);

  return (
    <SettingsContext.Provider
      value={{
        notificationsEnabled,
        setNotificationsEnabled,
        calcMethod,
        setCalcMethod,
        soundEnabled,
        setSoundEnabled,
        adhanSound,
        setAdhanSound,
        remindersEnabled,
        setRemindersEnabled,
        reminderOffset,
        setReminderOffset,
        locationMode,
        setLocationMode,
        manualLocation,
        setManualLocation,
        language, // ajouté ici
        setLanguage, // ajouté ici
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
