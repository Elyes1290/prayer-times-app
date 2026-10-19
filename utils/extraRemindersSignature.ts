// utils/extraRemindersSignature.ts
//
// Android : les rappels « Mon Ramadan » et « Vendredi » sont enregistrés côté natif et ré-armés
// chaque nuit SANS ouvrir l'app. Si un ancien planning était resté (ex. planning de test d'un
// build précédent, premium perdu, réglage changé depuis un autre écran…), il continuerait de
// sonner tant qu'aucune reprogrammation complète n'a lieu.
//
// On garde donc une « signature » du dernier planning programmé (rappels des prochains jours).
// À l'ouverture de l'app, on recalcule ce qui DEVRAIT être programmé : si ça diffère de ce qui
// l'a été, l'appelant lance une reprogrammation complète (qui annule tout puis reprogramme
// uniquement ce qui est attendu : vendredi pour Jumu'ah, saison pour Ramadan).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFridayRemindersForScheduling } from "./friday/reminders";
import { getRamadanRemindersForScheduling } from "./ramadan/notifications";

export const EXTRAS_SIGNATURE_KEY = "@notif/extras_signature_v1";

/** On ne compare que les rappels des prochains jours (le reste dépend de la taille de la fenêtre). */
export const SIGNATURE_HORIZON_MS = 14 * 24 * 60 * 60 * 1000;

type ReminderLike = { prayer: string; triggerMillis: number };

const entryOf = (reminder: ReminderLike): string => `${reminder.prayer}:${reminder.triggerMillis}`;

const triggerOf = (entry: string): number => Number(entry.slice(entry.lastIndexOf(":") + 1));

/** Entrées triées de la signature : TOUS les rappels (la comparaison se limite ensuite à l'horizon). */
export function buildSignatureEntries(reminders: readonly ReminderLike[]): string[] {
  return reminders.map(entryOf).sort();
}

/** Rappels futurs dans l'horizon de comparaison. */
export function entriesInHorizon(entries: readonly string[], now: number): string[] {
  const limit = now + SIGNATURE_HORIZON_MS;
  return entries
    .filter((entry) => {
      const trigger = triggerOf(entry);
      return Number.isFinite(trigger) && trigger > now && trigger <= limit;
    })
    .sort();
}

export function sameEntries(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Mémorise le planning programmé (liste vide incluse). Ne lève jamais. */
export async function saveExtrasSignature(reminders: readonly ReminderLike[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      EXTRAS_SIGNATURE_KEY,
      JSON.stringify(buildSignatureEntries(reminders)),
    );
  } catch (error) {
    console.warn("⚠️ [Rappels] Signature du planning non enregistrée:", error);
  }
}

async function loadSavedEntries(): Promise<string[] | null> {
  const raw = await AsyncStorage.getItem(EXTRAS_SIGNATURE_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? (parsed as string[])
      : null;
  } catch {
    return null;
  }
}

export interface ExtrasStaleContext {
  userLocation: { latitude: number; longitude: number };
  calcMethod: string;
  platform: "ios" | "android" | string;
  now?: Date;
}

/**
 * Vrai si le planning Ramadan / Vendredi réellement programmé diffère de celui attendu
 * (ou n'a jamais été mémorisé). En cas d'erreur : faux (on ne touche à rien).
 */
export async function isExtrasScheduleStale(ctx: ExtrasStaleContext): Promise<boolean> {
  try {
    const now = (ctx.now ?? new Date()).getTime();
    const saved = await loadSavedEntries();
    if (saved === null) return true;

    const [ramadan, friday] = await Promise.all([
      getRamadanRemindersForScheduling({
        userLocation: ctx.userLocation,
        calcMethod: ctx.calcMethod,
        platform: ctx.platform,
        now: ctx.now,
      }),
      getFridayRemindersForScheduling({ platform: ctx.platform, now: ctx.now }),
    ]);

    const expected = entriesInHorizon(buildSignatureEntries([...ramadan, ...friday]), now);
    return !sameEntries(entriesInHorizon(saved, now), expected);
  } catch (error) {
    console.warn("⚠️ [Rappels] Vérification du planning impossible:", error);
    return false;
  }
}
