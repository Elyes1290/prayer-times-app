import React from "react";
import GeneralSection from "@/components/settings/GeneralSection";

// Mock Picker
jest.mock("@react-native-picker/picker", () => {
  const { View, Text } = require("react-native");
  const Picker = ({ children, ...props }: any) => (
    <View {...props}>{children}</View>
  );
  Picker.displayName = "Picker";
  return {
    Picker,
    Item: ({ label, value }: any) => <Text>{label}</Text>,
  };
});

// Mock Slider
jest.mock("@react-native-community/slider", () => {
  const { View } = require("react-native");
  return {
    Slider: ({ value, onSlidingComplete, ...props }: any) => (
      <View {...props} testID="slider-mock" />
    ),
  };
});

// Mock useTranslation
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, d?: string) => d || k }),
}));

const baseProps = {
  notificationsEnabled: true,
  remindersEnabled: true,
  reminderOffset: 10,
  selectedLang: "fr",
  languages: [
    { code: "fr", label: "Français" },
    { code: "en", label: "English" },
  ],
  handleNotificationsToggle: jest.fn(),
  onChangeLanguage: jest.fn(),
  markPendingChanges: jest.fn(),
  setRemindersEnabled: jest.fn(),
  setReminderOffset: jest.fn(),
  styles: {
    row: { flexDirection: "row" },
    label: { fontWeight: "bold" },
    pickerContainer: {},
    picker: {},
    pickerItem: {},
    sliderContainer: {},
    sliderValue: {},
  },
};

describe("GeneralSection", () => {
  it("retourne la structure attendue", () => {
    const section = GeneralSection(baseProps);
    expect(Array.isArray(section)).toBe(true);
    expect(section[0].key).toBe("general");
    expect(Array.isArray(section[0].data)).toBe(true);
  });

  it("rend le switch notifications", () => {
    const section = GeneralSection(baseProps);
    const notif = section[0].data.find(
      (item: any) => item.key === "general_content"
    );
    expect(notif).toBeDefined();
    // Le composant utilise un fragment, donc on accède directement au View enfant
    expect(notif?.component?.props.children.props.children[1]).toBeDefined();
  });

  it("rend le select de langue", () => {
    const section = GeneralSection(baseProps);
    const lang = section[0].data.find(
      (item: any) => item.key === "language_select"
    );
    expect(lang).toBeDefined();
    expect(
      lang?.component?.props.children[1].props.children.type.name
    ).toContain("Picker");
  });

  it("rend le switch rappels si notificationsEnabled", () => {
    const section = GeneralSection({
      ...baseProps,
      notificationsEnabled: true,
    });
    const reminders = section[0].data.find(
      (item: any) => item.key === "reminders"
    );
    expect(reminders).toBeDefined();
    expect(reminders?.component).not.toBeNull();
  });

  it("ne rend pas le switch rappels si notificationsEnabled=false", () => {
    const section = GeneralSection({
      ...baseProps,
      notificationsEnabled: false,
    });
    const reminders = section[0].data.find(
      (item: any) => item.key === "reminders"
    );
    expect(reminders).toBeDefined();
    expect(reminders?.component).toBeNull();
  });

  it("rend le slider délai si remindersEnabled", () => {
    const section = GeneralSection({ ...baseProps, remindersEnabled: true });
    const offset = section[0].data.find(
      (item: any) => item.key === "reminder_offset"
    );
    expect(offset).toBeDefined();
    expect(offset?.component).not.toBeNull();
  });

  it("ne rend pas le slider délai si remindersEnabled=false", () => {
    const section = GeneralSection({ ...baseProps, remindersEnabled: false });
    const offset = section[0].data.find(
      (item: any) => item.key === "reminder_offset"
    );
    expect(offset).toBeDefined();
    expect(offset?.component).toBeNull();
  });

  it("appelle onChangeLanguage au changement", () => {
    const onChangeLanguage = jest.fn();
    const section = GeneralSection({ ...baseProps, onChangeLanguage });
    const lang = section[0].data.find(
      (item: any) => item.key === "language_select"
    );
    expect(lang).toBeDefined();
    lang?.component?.props.children[1].props.children.props.onValueChange("en");
    expect(onChangeLanguage).toHaveBeenCalledWith("en");
  });

  it("appelle handleNotificationsToggle au toggle", () => {
    const handleNotificationsToggle = jest.fn();
    const section = GeneralSection({ ...baseProps, handleNotificationsToggle });
    const notif = section[0].data.find(
      (item: any) => item.key === "general_content"
    );
    expect(notif).toBeDefined();
    notif?.component?.props.children.props.children[1].props.onValueChange(
      true
    );
    expect(handleNotificationsToggle).toHaveBeenCalledWith(true);
  });

  it("appelle setRemindersEnabled et markPendingChanges au toggle rappels", () => {
    const setRemindersEnabled = jest.fn();
    const markPendingChanges = jest.fn();
    const section = GeneralSection({
      ...baseProps,
      setRemindersEnabled,
      markPendingChanges,
    });
    const reminders = section[0].data.find(
      (item: any) => item.key === "reminders"
    );
    expect(reminders).toBeDefined();
    reminders?.component?.props.children[1].props.onValueChange(true);
    expect(setRemindersEnabled).toHaveBeenCalledWith(true);
    expect(markPendingChanges).toHaveBeenCalled();
  });

  it("appelle setReminderOffset et markPendingChanges au changement slider", () => {
    const setReminderOffset = jest.fn();
    const markPendingChanges = jest.fn();
    const section = GeneralSection({
      ...baseProps,
      setReminderOffset,
      markPendingChanges,
      remindersEnabled: true,
    });
    const offset = section[0].data.find(
      (item: any) => item.key === "reminder_offset"
    );
    expect(offset).toBeDefined();
    // Le Slider est dans le deuxième enfant du View (index 1), premier enfant du View
    offset?.component?.props.children[1].props.children[0].props.onSlidingComplete(
      15
    );
    expect(setReminderOffset).toHaveBeenCalledWith(15);
    expect(markPendingChanges).toHaveBeenCalled();
  });
});
