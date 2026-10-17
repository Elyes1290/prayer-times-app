// components/ramadan/RamadanUI.tsx
// Petits composants visuels partagés par l'écran « Mon Ramadan ».

import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useThemeColors } from "../../hooks/useThemeColor";

interface RamadanCardProps {
  title: string;
  icon?: string;
  /** Affiche un badge « Premium » à droite du titre. */
  premiumBadge?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function RamadanCard({ title, icon, premiumBadge, children, style }: RamadanCardProps) {
  const colors = useThemeColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBG }, style]}>
      <View style={styles.cardHeader}>
        {icon ? <MCIcon name={icon as never} size={22} color={colors.primary} /> : null}
        <Text style={[styles.cardTitle, { color: colors.text }]} accessibilityRole="header">
          {title}
        </Text>
        {premiumBadge ? (
          <View style={styles.crownBadge}>
            <MCIcon name="crown" size={14} color="#FFD700" />
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

interface RamadanButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  icon?: string;
}

export function RamadanButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  icon,
}: RamadanButtonProps) {
  const colors = useThemeColors();
  const isPrimary = variant === "primary";
  const accent = variant === "danger" ? colors.error : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        isPrimary
          ? { backgroundColor: colors.primary }
          : { borderWidth: 1, borderColor: accent },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <MCIcon
          name={icon as never}
          size={18}
          color={isPrimary ? colors.textOnPrimary : accent}
        />
      ) : null}
      <Text
        style={[
          styles.buttonLabel,
          { color: isPrimary ? colors.textOnPrimary : accent },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface RamadanStepperProps {
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
}

/** Libellé encadré de deux boutons − / +. */
export function RamadanStepper({
  label,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  decrementDisabled = false,
  incrementDisabled = false,
}: RamadanStepperProps) {
  const colors = useThemeColors();
  return (
    <View style={styles.stepper}>
      <StepperButton
        icon="minus"
        label={decrementLabel}
        onPress={onDecrement}
        disabled={decrementDisabled}
      />
      <Text style={[styles.stepperLabel, { color: colors.text }]}>{label}</Text>
      <StepperButton
        icon="plus"
        label={incrementLabel}
        onPress={onIncrement}
        disabled={incrementDisabled}
      />
    </View>
  );
}

function StepperButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[
        styles.stepperButton,
        { borderColor: colors.primary },
        disabled && styles.disabled,
      ]}
    >
      <MCIcon name={icon as never} size={20} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
  },
  crownBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    flexShrink: 1,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  stepperLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
