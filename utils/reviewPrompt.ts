/**
 * Demande d'avis (App Store / Google Play) via les APIs natives officielles.
 *
 * Règles :
 * - Se déclenche seulement après un délai depuis la première ouverture de l'app
 *   (le nombre de jours est configurable, cf. MIN_DAYS_BEFORE_PROMPT).
 * - Cas des utilisateurs déjà installés avant l'ajout de cette fonctionnalité :
 *   on détecte qu'ils sont déjà des utilisateurs établis via le flag
 *   FIRST_LAUNCH_FLAG (posé depuis longtemps sur leur appareil) et on les rend
 *   éligibles dès la prochaine ouverture après la mise à jour, sans attendre
 *   7 jours supplémentaires.
 * - Ne redemande pas trop souvent : un cooldown minimal est respecté entre deux
 *   tentatives, car iOS/Android limitent déjà silencieusement l'affichage réel
 *   (Apple : max ~3 fois/an, Google : quota interne non documenté). On ne peut
 *   jamais savoir si la popup s'est réellement affichée, donc on gère notre
 *   propre throttle côté app pour éviter de spammer l'appel natif.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { FIRST_LAUNCH_FLAG } from "../contexts/SettingsContext";
import { debugLog, errorLog } from "./logger";

const FIRST_OPEN_DATE_KEY = "review_prompt_first_open_date";
const LAST_PROMPT_DATE_KEY = "review_prompt_last_shown_date";

/** Délai avant la première proposition d'avis pour un nouvel utilisateur. */
const MIN_DAYS_BEFORE_PROMPT = 7;
/** Délai minimal entre deux tentatives si l'utilisateur n'a pas quitté l'app avant. */
const MIN_DAYS_BETWEEN_PROMPTS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

async function isExistingInstall(): Promise<boolean> {
  const firstLaunchFlag = await AsyncStorage.getItem(FIRST_LAUNCH_FLAG);
  return !!firstLaunchFlag;
}

async function getOrCreateFirstOpenDate(): Promise<number> {
  const stored = await AsyncStorage.getItem(FIRST_OPEN_DATE_KEY);
  if (stored) {
    return parseInt(stored, 10);
  }

  const now = Date.now();

  // Utilisateur déjà présent avant l'ajout de cette fonctionnalité : on ne
  // le fait pas attendre 7 jours de plus, il est déjà un utilisateur établi.
  const alreadyInstalled = await isExistingInstall();
  const initialDate = alreadyInstalled
    ? now - MIN_DAYS_BEFORE_PROMPT * DAY_MS
    : now;

  await AsyncStorage.setItem(FIRST_OPEN_DATE_KEY, initialDate.toString());
  return initialDate;
}

async function getLastPromptDate(): Promise<number | null> {
  const stored = await AsyncStorage.getItem(LAST_PROMPT_DATE_KEY);
  return stored ? parseInt(stored, 10) : null;
}

/**
 * Vérifie les conditions et déclenche l'invite d'avis native si pertinent.
 * Sans effet si les conditions ne sont pas réunies (silencieux, pas d'erreur).
 */
export async function maybeRequestAppReview(): Promise<void> {
  try {
    const firstOpenDate = await getOrCreateFirstOpenDate();
    const now = Date.now();
    const daysSinceFirstOpen = (now - firstOpenDate) / DAY_MS;

    if (daysSinceFirstOpen < MIN_DAYS_BEFORE_PROMPT) {
      return;
    }

    const lastPromptDate = await getLastPromptDate();
    if (lastPromptDate) {
      const daysSinceLastPrompt = (now - lastPromptDate) / DAY_MS;
      if (daysSinceLastPrompt < MIN_DAYS_BETWEEN_PROMPTS) {
        return;
      }
    }

    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) {
      debugLog("⭐ [ReviewPrompt] API native non disponible sur cet appareil");
      return;
    }

    debugLog("⭐ [ReviewPrompt] Déclenchement de la demande d'avis native");
    await StoreReview.requestReview();

    await AsyncStorage.setItem(LAST_PROMPT_DATE_KEY, now.toString());
  } catch (error) {
    errorLog("❌ [ReviewPrompt] Erreur lors de la demande d'avis:", error);
  }
}

/** Utilitaire de debug/QA pour réinitialiser le compteur (non utilisé en prod). */
export async function resetReviewPromptState(): Promise<void> {
  await AsyncStorage.multiRemove([FIRST_OPEN_DATE_KEY, LAST_PROMPT_DATE_KEY]);
}
