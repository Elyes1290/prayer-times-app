package com.drogbinho.prayertimesapp2;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import static com.drogbinho.prayertimesapp2.ConditionalLogger.errorLog;

/**
 * Registre des alarmes rappel / dhikr programmées (JS + reprogrammation native) pour
 * annulation O(1) au lieu de balayer des centaines de milliers de PendingIntent.
 */
public final class NotificationAlarmRegistry {

    private static final String PREFS = "prayer_times_settings";
    public static final String KEY_REMINDERS = "js_pending_reminders_v1";
    public static final String KEY_DHIKRS = "js_pending_dhikrs_v1";
    private static final Object LOCK = new Object();

    private NotificationAlarmRegistry() {}

    public static void appendReminder(Context context, String prayer, long triggerAtMillis) {
        synchronized (LOCK) {
            try {
                SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                JSONArray arr = new JSONArray(prefs.getString(KEY_REMINDERS, "[]"));
                JSONObject o = new JSONObject();
                o.put("p", prayer);
                o.put("t", triggerAtMillis);
                arr.put(o);
                prefs.edit().putString(KEY_REMINDERS, arr.toString()).apply();
            } catch (JSONException e) {
                errorLog("AdhanModule", "[Registry] appendReminder: " + e.getMessage());
            }
        }
    }

    public static void appendDhikr(Context context, String type, String prayer, long triggerMillis) {
        synchronized (LOCK) {
            try {
                SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                JSONArray arr = new JSONArray(prefs.getString(KEY_DHIKRS, "[]"));
                JSONObject o = new JSONObject();
                o.put("type", type);
                o.put("p", prayer);
                o.put("t", triggerMillis);
                arr.put(o);
                prefs.edit().putString(KEY_DHIKRS, arr.toString()).apply();
            } catch (JSONException e) {
                errorLog("AdhanModule", "[Registry] appendDhikr: " + e.getMessage());
            }
        }
    }

    public static int cancelAllPrayerReminders(Context context, AlarmManager alarmManager) {
        boolean[] hadRegistry = new boolean[1];
        int total;
        synchronized (LOCK) {
            total = cancelRemindersFromRegistry(context, alarmManager, hadRegistry);
            total += cancelReminderSimplePatterns(context, alarmManager);
            if (!hadRegistry[0]) {
                total += cancelReminderLegacyCoarseGrid(context, alarmManager);
            }
        }
        return total;
    }

    public static int cancelAllDhikrNotifications(Context context, AlarmManager alarmManager) {
        if (alarmManager == null) {
            return 0;
        }
        boolean[] hadRegistry = new boolean[1];
        int total;
        synchronized (LOCK) {
            total = cancelDhikrsFromRegistry(context, alarmManager, hadRegistry);
        }
        if (!hadRegistry[0]) {
            total += cancelDhikrLegacyCoarseGrid(context, alarmManager);
        }
        return total;
    }

    private static int cancelRemindersFromRegistry(Context context, AlarmManager am, boolean[] hadRegistryOut) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_REMINDERS, null);
        if (raw == null || raw.length() < 3) {
            prefs.edit().remove(KEY_REMINDERS).apply();
            if (hadRegistryOut != null && hadRegistryOut.length > 0) {
                hadRegistryOut[0] = false;
            }
            return 0;
        }
        int n = 0;
        int entryCount = 0;
        try {
            JSONArray arr = new JSONArray(raw);
            entryCount = arr.length();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                String prayer = o.getString("p");
                long t = o.getLong("t");
                Intent intent = new Intent(context, PrayerReminderReceiver.class);
                int rc = ("reminder_" + prayer + "_" + t).hashCode();
                PendingIntent pi = PendingIntent.getBroadcast(
                        context, rc, intent, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
                if (pi != null) {
                    am.cancel(pi);
                    pi.cancel();
                    n++;
                }
            }
        } catch (JSONException e) {
            errorLog("AdhanModule", "[Registry] cancelReminders parse: " + e.getMessage());
        }
        prefs.edit().remove(KEY_REMINDERS).apply();
        if (hadRegistryOut != null && hadRegistryOut.length > 0) {
            hadRegistryOut[0] = entryCount > 0;
        }
        return n;
    }

    private static int cancelReminderSimplePatterns(Context context, AlarmManager am) {
        String[] prayers = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };
        int n = 0;
        for (String prayer : prayers) {
            Intent intent = new Intent(context, PrayerReminderReceiver.class);
            String[] simplePatterns = {
                    "reminder_" + prayer,
                    "AUTO_reminder_" + prayer,
                    prayer,
                    prayer.toLowerCase(),
                    prayer.toUpperCase()
            };
            for (String pattern : simplePatterns) {
                try {
                    int rc = pattern.hashCode();
                    PendingIntent pi = PendingIntent.getBroadcast(
                            context, rc, intent, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
                    if (pi != null) {
                        am.cancel(pi);
                        pi.cancel();
                        n++;
                    }
                } catch (Exception ignored) {
                }
            }
        }
        return n;
    }

    /**
     * Filet pour orphelines hors registre (ex. anciennes versions). Uniquement si le registre était
     * vide. Grille 1 h sur 96 h (le pas 3 min était trop lourd).
     */
    private static int cancelReminderLegacyCoarseGrid(Context context, AlarmManager am) {
        String[] prayers = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };
        long now = System.currentTimeMillis();
        long start = now - (24L * 60 * 60 * 1000L);
        long end = now + (72L * 60 * 60 * 1000L);
        long step = 60L * 60 * 1000L;
        int n = 0;
        for (long ts = start; ts <= end; ts += step) {
            for (String prayer : prayers) {
                Intent intent = new Intent(context, PrayerReminderReceiver.class);
                for (String prefix : new String[] { "reminder_", "AUTO_reminder_" }) {
                    try {
                        String pattern = prefix + prayer + "_" + ts;
                        int rc = pattern.hashCode();
                        PendingIntent pi = PendingIntent.getBroadcast(
                                context, rc, intent, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
                        if (pi != null) {
                            am.cancel(pi);
                            pi.cancel();
                            n++;
                        }
                    } catch (Exception ignored) {
                    }
                }
            }
        }
        return n;
    }

    private static int cancelDhikrsFromRegistry(Context context, AlarmManager am, boolean[] hadRegistryOut) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_DHIKRS, null);
        if (raw == null || raw.length() < 3) {
            prefs.edit().remove(KEY_DHIKRS).apply();
            if (hadRegistryOut != null && hadRegistryOut.length > 0) {
                hadRegistryOut[0] = false;
            }
            return 0;
        }
        int n = 0;
        int entryCount = 0;
        try {
            JSONArray arr = new JSONArray(raw);
            entryCount = arr.length();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                String type = o.getString("type");
                String prayer = o.getString("p");
                long t = o.getLong("t");
                Intent intent = new Intent(context, DhikrReceiver.class);
                intent.putExtra("TYPE", type);
                intent.putExtra("PRAYER_LABEL", prayer);
                int rc = (type + "_" + prayer + "_" + t).hashCode();
                PendingIntent pi = PendingIntent.getBroadcast(
                        context, rc, intent, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
                if (pi != null) {
                    am.cancel(pi);
                    pi.cancel();
                    n++;
                }
            }
        } catch (JSONException e) {
            errorLog("AdhanModule", "[Registry] cancelDhikrs parse: " + e.getMessage());
        }
        prefs.edit().remove(KEY_DHIKRS).apply();
        if (hadRegistryOut != null && hadRegistryOut.length > 0) {
            hadRegistryOut[0] = entryCount > 0;
        }
        return n;
    }

    /** Même logique que les rappels : uniquement si registre vide ; pas 3 min (trop coûteux). */
    private static int cancelDhikrLegacyCoarseGrid(Context context, AlarmManager am) {
        String[] types = { "afterSalah", "dhikrMorning", "eveningDhikr", "selectedDua" };
        String[] prayers = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };
        long now = System.currentTimeMillis();
        long start = now - (24L * 60 * 60 * 1000L);
        long end = now + (72L * 60 * 60 * 1000L);
        long step = 60L * 60 * 1000L;
        int n = 0;
        for (String type : types) {
            for (String prayer : prayers) {
                Intent intent = new Intent(context, DhikrReceiver.class);
                intent.putExtra("TYPE", type);
                intent.putExtra("PRAYER_LABEL", prayer);
                for (long ts = start; ts <= end; ts += step) {
                    String[] patterns = {
                            type + "_" + prayer + "_" + ts,
                            "AUTO_" + type + "_" + prayer + "_" + ts,
                    };
                    for (String pattern : patterns) {
                        try {
                            int rc = pattern.hashCode();
                            PendingIntent pi = PendingIntent.getBroadcast(
                                    context, rc, intent, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
                            if (pi != null) {
                                am.cancel(pi);
                                pi.cancel();
                                n++;
                            }
                        } catch (Exception ignored) {
                        }
                    }
                }
            }
        }
        return n;
    }
}
