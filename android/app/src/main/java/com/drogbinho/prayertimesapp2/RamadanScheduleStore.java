package com.drogbinho.prayertimesapp2;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import static com.drogbinho.prayertimesapp2.ConditionalLogger.debugLog;
import static com.drogbinho.prayertimesapp2.ConditionalLogger.errorLog;

/**
 * Planning des rappels « Mon Ramadan » (suhoor, iftar, lecture, Laylat al-Qadr).
 *
 * Le JavaScript calcule TOUTE la saison à l'ouverture de l'app et l'enregistre ici
 * (JSON compact). La maintenance quotidienne de 00:05 et le redémarrage du téléphone
 * ré-arment ensuite les prochains jours, SANS ouvrir l'app — comme pour les adhans.
 *
 * Les alarmes utilisent exactement le même schéma que AdhanModule.schedulePrayerReminders
 * (même requestCode, même récepteur, même registre d'annulation) : cancelAllPrayerReminders
 * les annule donc aussi, et un ré-armement est idempotent.
 */
public final class RamadanScheduleStore {
    private static final String TAG = "RamadanScheduleStore";
    private static final String PREFS = "prayer_times_settings";
    private static final String KEY_SCHEDULE = "ramadan_schedule_v1";

    /** On ne ré-arme que les rappels des 10 prochains jours (évite d'inonder AlarmManager). */
    private static final long REARM_WINDOW_MS = 10L * 24 * 60 * 60 * 1000;
    /** Même décalage minimal que le JS : jamais « dans le passé immédiat ». */
    private static final long MIN_LEAD_MS = 30_000L;
    /** Garde-fou : le planning d'une saison fait ~100 entrées. */
    private static final int MAX_ENTRIES = 400;

    private RamadanScheduleStore() {
    }

    /** Enregistre le planning (JSON : [{p, t, title, body}]). "[]" ou invalide = vide le planning. */
    public static void save(Context context, String json) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            JSONArray parsed = new JSONArray(json == null ? "[]" : json);
            if (parsed.length() > MAX_ENTRIES) {
                errorLog(TAG, "Planning Ramadan trop gros (" + parsed.length() + "), ignoré");
                prefs.edit().remove(KEY_SCHEDULE).apply();
                return;
            }
            if (parsed.length() == 0) {
                prefs.edit().remove(KEY_SCHEDULE).apply();
            } else {
                prefs.edit().putString(KEY_SCHEDULE, parsed.toString()).apply();
            }
            debugLog(TAG, "Planning Ramadan enregistré : " + parsed.length() + " rappel(s)");
        } catch (Exception e) {
            errorLog(TAG, "Planning Ramadan invalide, effacé : " + e.getMessage());
            prefs.edit().remove(KEY_SCHEDULE).apply();
        }
    }

    /**
     * Ré-arme les rappels des prochains jours qui ne sont pas déjà armés.
     * Ne lève jamais : une erreur ici ne doit pas gêner la reprogrammation des adhans.
     *
     * @return nombre d'alarmes armées
     */
    public static int rearm(Context context, AlarmManager alarmManager) {
        if (alarmManager == null) {
            return 0;
        }
        int armed = 0;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_SCHEDULE, null);
            if (raw == null || raw.length() < 3) {
                return 0;
            }

            long now = System.currentTimeMillis();
            JSONArray entries = new JSONArray(raw);
            for (int i = 0; i < entries.length(); i++) {
                JSONObject entry = entries.getJSONObject(i);
                String prayer = entry.getString("p");
                long trigger = entry.getLong("t");

                // Sécurité : jamais autre chose que nos libellés
                // ("Ramadan…" = Mon Ramadan, "Friday…" = rappel du vendredi).
                if (!prayer.startsWith("Ramadan") && !prayer.startsWith("Friday")) {
                    continue;
                }
                if (trigger < now + MIN_LEAD_MS || trigger > now + REARM_WINDOW_MS) {
                    continue;
                }

                Intent intent = new Intent(context, PrayerReminderReceiver.class);
                intent.putExtra("TITLE", entry.optString("title", ""));
                intent.putExtra("BODY", entry.optString("body", ""));
                intent.putExtra("PRAYER_LABEL", prayer);

                int requestCode = ("reminder_" + prayer + "_" + trigger).hashCode();

                // Déjà armé (le PendingIntent n'existe plus après un redémarrage) : rien à faire.
                PendingIntent existing = PendingIntent.getBroadcast(
                        context, requestCode, intent,
                        PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
                if (existing != null) {
                    continue;
                }

                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context, requestCode, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pendingIntent);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, trigger, pendingIntent);
                    }
                    NotificationAlarmRegistry.appendReminder(context, prayer, trigger);
                    armed++;
                } catch (Exception e) {
                    errorLog(TAG, "Rappel Ramadan non armé (" + prayer + ") : " + e.getMessage());
                }
            }
            debugLog(TAG, "Ré-armement Ramadan : " + armed + " rappel(s) armé(s)");
        } catch (Exception e) {
            errorLog(TAG, "Ré-armement Ramadan impossible : " + e.getMessage());
        }
        return armed;
    }
}
