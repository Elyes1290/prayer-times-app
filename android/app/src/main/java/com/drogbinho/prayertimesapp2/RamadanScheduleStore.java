package com.drogbinho.prayertimesapp2;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import android.icu.util.IslamicCalendar;

import com.batoulapps.adhan.CalculationParameters;
import com.batoulapps.adhan.Coordinates;
import com.batoulapps.adhan.PrayerTimes;
import com.batoulapps.adhan.data.DateComponents;

import java.util.Calendar;

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
    private static final String KEY_FRIDAY = "friday_config_v1";
    private static final String KEY_RAMADAN_CONFIG = "ramadan_config_v1";
    /** Libellés (identiques au JS : RAMADAN_REMINDER_LABELS). */
    private static final String LABEL_SUHOOR = "RamadanSuhoor";
    private static final String LABEL_IFTAR = "RamadanIftar";
    private static final String LABEL_LAYLAT = "RamadanLaylat";
    private static final String LABEL_KHATM = "RamadanKhatm";
    /** Suhoor / iftar / Laylat sont calculés ici : on regarde 10 jours devant (comme la liste). */
    private static final int RAMADAN_LOOKAHEAD_DAYS = 10;
    /** Laylat al-Qadr : rappel 10 min après Isha (comme le JS). */
    private static final int LAYLAT_AFTER_ISHA_MIN = 10;
    private static final int MAX_START_OFFSET_DAYS = 2;
    /** Même libellé que le JS (utils/friday/reminders.ts). */
    private static final String FRIDAY_LABEL = "FridayReminder";
    /**
     * Le rappel du vendredi est calculé ICI (jour de la semaine + heure fixe) : la maintenance
     * de 00:05 arme le prochain vendredi, sans liste précalculée. On regarde quelques jours
     * devant pour tolérer une nuit de maintenance manquée.
     */
    private static final int FRIDAY_LOOKAHEAD_DAYS = 3;

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
     * Enregistre la config des rappels Ramadan calculés par le natif. JSON :
     * {premium, startOffsetDays, suhoorEnabled, suhoorMin, iftarEnabled, iftarMin,
     *  laylatEnabled, suhoorTitle, suhoorBody, iftarTitle, iftarBody, laylatBody,
     *  laylatTitles: {"21": "...", ...}}.
     */
    public static void saveRamadanConfig(Context context, String json) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            JSONObject parsed = new JSONObject(json == null ? "{}" : json);
            prefs.edit().putString(KEY_RAMADAN_CONFIG, parsed.toString()).apply();
            debugLog(TAG, "Config Ramadan enregistrée");
        } catch (Exception e) {
            errorLog(TAG, "Config Ramadan invalide, effacée : " + e.getMessage());
            prefs.edit().remove(KEY_RAMADAN_CONFIG).apply();
        }
    }

    /** Enregistre la config du rappel du vendredi (JSON : {enabled, hour, minute, title, body}). */
    public static void saveFridayConfig(Context context, String json) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            JSONObject parsed = new JSONObject(json == null ? "{}" : json);
            // `enabled` = faux : la config est gardée mais le natif n'arme plus rien.
            prefs.edit().putString(KEY_FRIDAY, parsed.toString()).apply();
            debugLog(TAG, "Config vendredi enregistrée : " + parsed.toString());
        } catch (Exception e) {
            errorLog(TAG, "Config vendredi invalide, effacée : " + e.getMessage());
            prefs.edit().remove(KEY_FRIDAY).apply();
        }
    }

    /**
     * Ré-arme les rappels des prochains jours qui ne sont pas déjà armés :
     * Mon Ramadan (liste précalculée par le JS) et rappel du vendredi (calculé ici).
     * Ne lève jamais : une erreur ici ne doit pas gêner la reprogrammation des adhans.
     *
     * @return nombre d'alarmes armées
     */
    public static int rearm(Context context, AlarmManager alarmManager) {
        if (alarmManager == null) {
            return 0;
        }
        // Notifications coupées globalement : rien ne doit être armé (même appelé depuis le JS).
        SharedPreferences settings = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!settings.getBoolean("notifications_enabled", true)) {
            return 0;
        }
        return rearmRamadan(context, alarmManager)
                + rearmRamadanSeason(context, alarmManager)
                + rearmFriday(context, alarmManager);
    }

    private static int rearmRamadan(Context context, AlarmManager alarmManager) {
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

                // Cette liste ne contient plus que le rappel de lecture (il dépend du plan de
                // l'utilisateur, stocké côté app). Suhoor / iftar / Laylat sont calculés par
                // rearmRamadanSeason et le vendredi par rearmFriday : toute autre entrée
                // (ancien planning) est ignorée, ce qui évite les doublons.
                if (!LABEL_KHATM.equals(prayer)) {
                    continue;
                }
                if (trigger < now + MIN_LEAD_MS || trigger > now + REARM_WINDOW_MS) {
                    continue;
                }

                if (armReminder(context, alarmManager, prayer, trigger,
                        entry.optString("title", ""), entry.optString("body", ""))) {
                    armed++;
                }
            }
            debugLog(TAG, "Ré-armement Ramadan : " + armed + " rappel(s) armé(s)");
        } catch (Exception e) {
            errorLog(TAG, "Ré-armement Ramadan impossible : " + e.getMessage());
        }
        return armed;
    }

    /** Appelé par le JS juste après la sauvegarde de la config : suhoor / iftar / Laylat seulement. */
    public static int rearmRamadanSeasonNow(Context context, AlarmManager alarmManager) {
        SharedPreferences settings = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (alarmManager == null || !settings.getBoolean("notifications_enabled", true)) {
            return 0;
        }
        return rearmRamadanSeason(context, alarmManager);
    }

    /**
     * Suhoor, iftar et nuits impaires de Laylat al-Qadr, calculés ICI comme les adhans :
     * jour de Ramadan d'après le calendrier Umm al-Qura (même base ICU que le JS), horaires de
     * prière d'après la position et la méthode de calcul déjà enregistrées pour les adhans.
     */
    private static int rearmRamadanSeason(Context context, AlarmManager alarmManager) {
        int armed = 0;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_RAMADAN_CONFIG, null);
            if (raw == null || raw.length() < 3) {
                return 0;
            }
            JSONObject config = new JSONObject(raw);
            if (!config.optBoolean("premium", false)) {
                return 0;
            }
            boolean suhoorEnabled = config.optBoolean("suhoorEnabled", false);
            boolean iftarEnabled = config.optBoolean("iftarEnabled", false);
            boolean laylatEnabled = config.optBoolean("laylatEnabled", false);
            if (!suhoorEnabled && !iftarEnabled && !laylatEnabled) {
                return 0;
            }

            // Même lecture de la position que les adhans (AdhanService).
            String locationMode = prefs.getString("location_mode", "auto");
            double latitude;
            double longitude;
            if ("manual".equals(locationMode)) {
                latitude = prefs.getFloat("manual_latitude", 0f);
                longitude = prefs.getFloat("manual_longitude", 0f);
            } else {
                latitude = prefs.getFloat("auto_latitude", 0f);
                longitude = prefs.getFloat("auto_longitude", 0f);
            }
            if (latitude == 0.0 && longitude == 0.0) {
                return 0;
            }
            CalculationParameters params = AdhanService.getCalculationParameters(
                    prefs.getString("calc_method", "MuslimWorldLeague"));
            Coordinates coordinates = new Coordinates(latitude, longitude);

            int startOffset = Math.max(-MAX_START_OFFSET_DAYS,
                    Math.min(MAX_START_OFFSET_DAYS, config.optInt("startOffsetDays", 0)));
            int suhoorMin = config.optInt("suhoorMin", 45);
            int iftarMin = config.optInt("iftarMin", 10);
            JSONObject laylatTitles = config.optJSONObject("laylatTitles");

            long now = System.currentTimeMillis();
            for (int offset = 0; offset <= RAMADAN_LOOKAHEAD_DAYS; offset++) {
                Calendar day = Calendar.getInstance();
                day.add(Calendar.DATE, offset);

                // Jour de Ramadan : on décale de -startOffset (= décalage choisi par l'utilisateur),
                // et on lit la date hijri à midi pour éviter tout effet de fuseau.
                Calendar shifted = (Calendar) day.clone();
                shifted.add(Calendar.DATE, -startOffset);
                shifted.set(Calendar.HOUR_OF_DAY, 12);
                shifted.set(Calendar.MINUTE, 0);
                shifted.set(Calendar.SECOND, 0);
                shifted.set(Calendar.MILLISECOND, 0);

                IslamicCalendar hijri = new IslamicCalendar();
                hijri.setCalculationType(IslamicCalendar.CalculationType.ISLAMIC_UMALQURA);
                hijri.setTimeInMillis(shifted.getTimeInMillis());
                if (hijri.get(Calendar.MONTH) != IslamicCalendar.RAMADAN) {
                    continue;
                }
                int dayNumber = hijri.get(Calendar.DAY_OF_MONTH);
                int monthLength = hijri.getActualMaximum(Calendar.DAY_OF_MONTH);

                PrayerTimes times = new PrayerTimes(coordinates, DateComponents.from(day.getTime()), params);

                if (suhoorEnabled) {
                    long trigger = times.fajr.getTime() - suhoorMin * 60_000L;
                    if (trigger >= now + MIN_LEAD_MS && armReminder(context, alarmManager, LABEL_SUHOOR, trigger,
                            config.optString("suhoorTitle", ""), config.optString("suhoorBody", ""))) {
                        armed++;
                    }
                }
                if (iftarEnabled) {
                    long trigger = times.maghrib.getTime() - iftarMin * 60_000L;
                    if (trigger >= now + MIN_LEAD_MS && armReminder(context, alarmManager, LABEL_IFTAR, trigger,
                            config.optString("iftarTitle", ""), config.optString("iftarBody", ""))) {
                        armed++;
                    }
                }
                // La « nuit n » commence au Maghrib du jour n-1 : on rappelle après Isha ce jour-là.
                int night = dayNumber + 1;
                if (laylatEnabled && night >= 21 && night % 2 == 1 && night <= monthLength) {
                    long trigger = times.isha.getTime() + LAYLAT_AFTER_ISHA_MIN * 60_000L;
                    String title = laylatTitles != null ? laylatTitles.optString(String.valueOf(night), "") : "";
                    if (trigger >= now + MIN_LEAD_MS && armReminder(context, alarmManager, LABEL_LAYLAT, trigger,
                            title, config.optString("laylatBody", ""))) {
                        armed++;
                    }
                }
            }
            debugLog(TAG, "Ré-armement saison Ramadan (natif) : " + armed + " rappel(s) armé(s)");
        } catch (Exception e) {
            errorLog(TAG, "Ré-armement saison Ramadan impossible : " + e.getMessage());
        }
        return armed;
    }

    /** Arme le prochain vendredi (heure fixe) s'il tombe dans les prochains jours. */
    private static int rearmFriday(Context context, AlarmManager alarmManager) {
        int armed = 0;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_FRIDAY, null);
            if (raw == null || raw.length() < 3) {
                return 0;
            }
            JSONObject config = new JSONObject(raw);
            if (!config.optBoolean("enabled", false)) {
                return 0;
            }
            int hour = config.optInt("hour", 8);
            int minute = config.optInt("minute", 0);
            String title = config.optString("title", "");
            String body = config.optString("body", "");

            long now = System.currentTimeMillis();
            for (int offset = 0; offset <= FRIDAY_LOOKAHEAD_DAYS; offset++) {
                Calendar day = Calendar.getInstance();
                day.add(Calendar.DATE, offset);
                if (day.get(Calendar.DAY_OF_WEEK) != Calendar.FRIDAY) {
                    continue;
                }
                day.set(Calendar.HOUR_OF_DAY, hour);
                day.set(Calendar.MINUTE, minute);
                day.set(Calendar.SECOND, 0);
                day.set(Calendar.MILLISECOND, 0);
                long trigger = day.getTimeInMillis();
                if (trigger < now + MIN_LEAD_MS) {
                    continue;
                }
                if (armReminder(context, alarmManager, FRIDAY_LABEL, trigger, title, body)) {
                    armed++;
                }
            }
            debugLog(TAG, "Ré-armement vendredi : " + armed + " rappel(s) armé(s)");
        } catch (Exception e) {
            errorLog(TAG, "Ré-armement vendredi impossible : " + e.getMessage());
        }
        return armed;
    }

    /**
     * Arme UN rappel (même schéma que AdhanModule.schedulePrayerReminders : même requestCode,
     * même récepteur, même registre d'annulation → idempotent, annulable par cancelAllPrayerReminders).
     *
     * @return vrai si une alarme a été armée (faux : déjà armée ou erreur)
     */
    private static boolean armReminder(Context context, AlarmManager alarmManager, String prayer,
            long trigger, String title, String body) {
        Intent intent = new Intent(context, PrayerReminderReceiver.class);
        intent.putExtra("TITLE", title);
        intent.putExtra("BODY", body);
        intent.putExtra("PRAYER_LABEL", prayer);

        int requestCode = ("reminder_" + prayer + "_" + trigger).hashCode();

        // Déjà armé (le PendingIntent n'existe plus après un redémarrage) : rien à faire.
        PendingIntent existing = PendingIntent.getBroadcast(
                context, requestCode, intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (existing != null) {
            return false;
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
            return true;
        } catch (Exception e) {
            errorLog(TAG, "Rappel non armé (" + prayer + ") : " + e.getMessage());
            return false;
        }
    }
}
