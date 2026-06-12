import React, { useEffect, useReducer, use } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SettingsContext } from "../../contexts/SettingsContext";
import ChangePasswordModal from "./ChangePasswordModal";
import { handleManageSubscription as runManageSubscription } from "./account/handleManageSubscription";
import { useErrorHandler } from "../../utils/errorHandler";
import {
  accountManagementReducer,
  initialAccountManagementState,
} from "./account/accountManagementState";
import { AccountProfileSection } from "./account/AccountProfileSection";
import { AccountSubscriptionSection } from "./account/AccountSubscriptionSection";
import { AccountSecuritySection } from "./account/AccountSecuritySection";
import { AccountActionsSection } from "./account/AccountActionsSection";
import { refreshUserDataFromServer } from "../../utils/userDataSync";

interface AccountManagementSectionProps {
  user: { isPremium?: boolean } | null;
  currentTheme: "light" | "dark" | "morning" | "sunset";
  styles: Record<string, object>;
  showToast: (toast: {
    type: "success" | "error" | "info";
    title: string;
    message: string;
  }) => void;
  forceLogout: () => Promise<void>;
  t: (key: string, fallback?: string) => string;
  setActiveSection: (section: string | null) => void;
}

export default function AccountManagementSection({
  user,
  currentTheme,
  styles,
  showToast,
  forceLogout,
  t,
  setActiveSection,
}: AccountManagementSectionProps) {
  const { push } = useRouter();
  const settings = use(SettingsContext);
  const { getErrorTitle, getErrorMessage } = useErrorHandler();
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";

  const [state, dispatch] = useReducer(
    accountManagementReducer,
    initialAccountManagementState,
  );

  const userData = state.realUserData || user;

  useEffect(() => {
    const loadRealUserData = async () => {
      try {
        const fromServer = await refreshUserDataFromServer();
        if (fromServer) {
          dispatch({ type: "SET_REAL_USER_DATA", payload: fromServer });
          return;
        }

        const stored = await AsyncStorage.getItem("user_data");
        if (stored) {
          dispatch({
            type: "SET_REAL_USER_DATA",
            payload: JSON.parse(stored),
          });
        } else {
          dispatch({ type: "SET_REAL_USER_DATA", payload: null });
        }
      } catch (error) {
        console.error("❌ Erreur chargement données utilisateur:", error);
        dispatch({ type: "SET_REAL_USER_DATA", payload: null });
      }
    };
    loadRealUserData();
  }, [user]);

  useEffect(() => {
    const loadUserData = async () => {
      dispatch({ type: "SET_LOADING_USER_DATA", payload: true });
      try {
        const [storedUserData, storedFirstName] = await Promise.all([
          AsyncStorage.getItem("user_data"),
          AsyncStorage.getItem("userFirstName"),
        ]);

        let firstName = "";
        let email = "";

        if (storedUserData) {
          try {
            const parsed = JSON.parse(storedUserData);
            if (parsed.user_first_name) firstName = parsed.user_first_name;
            if (parsed.email) email = parsed.email;
          } catch (error) {
            console.error("Erreur parsing user_data:", error);
          }
        }

        if (!firstName && settings?.userFirstName) {
          firstName = settings.userFirstName;
        }
        if (!firstName && storedFirstName) {
          firstName = storedFirstName;
        }

        dispatch({
          type: "SET_PROFILE",
          payload: { firstName, email },
        });
      } catch (error) {
        console.error("Erreur chargement données utilisateur:", error);
      } finally {
        dispatch({ type: "SET_LOADING_USER_DATA", payload: false });
      }
    };

    loadUserData();
  }, [settings?.userFirstName]);

  const handleSaveProfile = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (settings?.setUserFirstName) {
        await settings.setUserFirstName(state.editedFirstName);
      }

      dispatch({
        type: "SET_PROFILE",
        payload: {
          firstName: state.editedFirstName,
          email: state.editedEmail,
        },
      });

      showToast({
        type: "success",
        title: "Profil mis à jour",
        message: "Vos informations ont été sauvegardées avec succès",
      });
      dispatch({ type: "SET_EDITING", payload: false });
    } catch (error) {
      showToast({
        type: "error",
        title: getErrorTitle(error),
        message: getErrorMessage(error),
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const handleLogout = async () => {
    try {
      await forceLogout();
      setActiveSection(null);
      showToast({
        type: "success",
        title: "Déconnexion",
        message: "Vous avez été déconnecté avec succès",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: getErrorTitle(error),
        message: getErrorMessage(error),
      });
    }
  };

  const onManageSubscription = async () => {
    try {
      await runManageSubscription({
        userData: userData as Record<string, unknown> | null | undefined,
        showToast,
        t,
        setLoading: (loading) =>
          dispatch({ type: "SET_LOADING", payload: loading }),
      });
    } catch (error) {
      showToast({
        type: "error",
        title: getErrorTitle(error),
        message: getErrorMessage(error),
      });
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={styles.sectionTitle}>
        👤 {t("manage_account", "Gestion du compte")}
      </Text>

      <AccountProfileSection
        state={state}
        dispatch={dispatch}
        styles={styles}
        t={t}
        isLightTheme={isLightTheme}
        onSaveProfile={handleSaveProfile}
      />

      <AccountSubscriptionSection
        user={user}
        userData={userData as Record<string, unknown> | null | undefined}
        styles={styles}
        t={t}
      />

      <AccountSecuritySection
        dispatch={dispatch}
        styles={styles}
        t={t}
        isLightTheme={isLightTheme}
        showToast={showToast}
      />

      <AccountActionsSection
        userData={userData as Record<string, unknown> | null | undefined}
        userEmail={state.userEmail}
        isLoading={state.isLoading}
        styles={styles}
        t={t}
        onManageSubscription={onManageSubscription}
        onLogout={handleLogout}
        onDeleteAccount={() => push("/data-deletion")}
      />

      <ChangePasswordModal
        visible={state.showChangePasswordModal}
        onClose={() =>
          dispatch({ type: "SET_SHOW_CHANGE_PASSWORD_MODAL", payload: false })
        }
      />
    </View>
  );
}
