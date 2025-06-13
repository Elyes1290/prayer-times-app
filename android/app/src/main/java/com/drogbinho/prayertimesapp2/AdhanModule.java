package com.drogbinho.prayertimesapp2;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import java.util.Map;
import java.util.HashMap;
import android.util.Log;
import java.text.SimpleDateFormat;
import java.util.Locale;
import java.util.Calendar;

public class AdhanModule extends ReactContextBaseJavaModule {

    public AdhanModule(ReactApplicationContext reactContext) {
        super(reactContext);
        Log.d("AdhanModule", "🚀 Module AdhanModule initialisé");
    }

    @Override
    public String getName() {
        Log.d("AdhanModule", "📝 getName() appelé");
        return "AdhanModule";
    }

    // ============ ADHAN (appel à la prière) ============

    @ReactMethod
    public void playAdhan() {
        Intent serviceIntent = new Intent(getReactApplicationContext(), AdhanService.class);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            getReactApplicationContext().startForegroundService(serviceIntent);
        } else {
            getReactApplicationContext().startService(serviceIntent);
        }
    }

    @ReactMethod
    public void stopAdhan(String prayerLabel, Promise promise) {
        try {
            Intent intent = new Intent(getReactApplicationContext(), AdhanService.class);
            intent.setAction(AdhanService.ACTION_STOP);
            intent.putExtra("PRAYER_LABEL", prayerLabel);
            getReactApplicationContext().startService(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("STOP_ERROR", e);
        }
    }

    @ReactMethod
    public void cancelAllAdhanAlarms() {
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        String[] prayers = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };

        Log.d("AdhanModule", "🚫 Annulation simple des alarmes adhan...");
        int cancelCount = 0;

        for (String prayer : prayers) {
            Intent intent = new Intent(context, AdhanReceiver.class);
            intent.setAction("com.drogbinho.prayertimesapp2.ACTION_ADHAN_ALARM");
            // Le requestCode doit correspondre à celui utilisé lors de la programmation
            int requestCode = prayer.hashCode();

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
            // CRITIQUE: FLAG_NO_CREATE pour récupérer le PendingIntent existant
            // FLAG_UPDATE_CURRENT créerait un nouveau PendingIntent au lieu de récupérer
            // l'existant !

            if (pendingIntent != null) {
                try {
                    alarmManager.cancel(pendingIntent);
                    pendingIntent.cancel(); // Annule aussi le PendingIntent lui-même
                    cancelCount++;
                    Log.d("AdhanModule",
                            "🚫 Alarme adhan annulée pour " + prayer + " (requestCode: " + requestCode + ")");
                } catch (Exception e) {
                    Log.e("AdhanModule",
                            "Erreur lors de l'annulation de l'alarme " + prayer + ": " + e.getMessage());
                }
            }
        }

        // Force l'arrêt du service d'adhan s'il est en cours (peut être utile)
        Intent serviceIntent = new Intent(context, AdhanService.class);
        context.stopService(serviceIntent);

        Log.d("AdhanModule", "✅ Annulation Adhan terminée : " + cancelCount + " alarmes annulées.");
    }

    @ReactMethod
    public void scheduleAdhanAlarms(ReadableMap prayerTimes, String adhanSound) {
        Log.d("AdhanModule", "📢 Programmation des alarmes adhan");
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        ReadableMapKeySetIterator iterator = prayerTimes.keySetIterator();
        while (iterator.hasNextKey()) {
            String key = iterator.nextKey(); // ex: Maghrib_today ou Maghrib_tomorrow
            ReadableMap prayerInfo = prayerTimes.getMap(key);
            if (prayerInfo != null) {
                long triggerAtMillis = (long) prayerInfo.getDouble("time");
                String displayLabel = prayerInfo.getString("displayLabel");
                String notifTitle = prayerInfo.getString("notifTitle");
                String notifBody = prayerInfo.getString("notifBody");

                Intent intent = new Intent();
                intent.setAction("com.drogbinho.prayertimesapp2.ACTION_ADHAN_ALARM");
                intent.setClass(context, AdhanReceiver.class);
                intent.putExtra("ADHAN_SOUND", adhanSound);
                intent.putExtra("PRAYER_LABEL", displayLabel);
                intent.putExtra("NOTIF_TITLE", notifTitle);
                intent.putExtra("NOTIF_BODY", notifBody);

                // Utilise le même identifiant que dans cancelAllAdhanAlarms
                int requestCode = displayLabel.hashCode();

                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

                try {
                    alarmManager.setAlarmClock(
                            new AlarmManager.AlarmClockInfo(triggerAtMillis, null),
                            pendingIntent);
                    Log.d("AdhanModule", String.format(
                            "✅ Alarme adhan programmée pour %s à %d (dans %d minutes)",
                            displayLabel,
                            triggerAtMillis,
                            (triggerAtMillis - System.currentTimeMillis()) / 60000));
                } catch (Exception e) {
                    Log.e("AdhanModule", "❌ Erreur lors de la programmation de l'alarme adhan: " + e.getMessage());
                }
            }
        }
    }

    // ============ PRAYER REMINDERS (rappel X min avant prière) ============

    @ReactMethod
    public void schedulePrayerReminders(ReadableArray reminders) {
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        for (int i = 0; i < reminders.size(); i++) {
            ReadableMap notif = reminders.getMap(i);
            if (notif == null)
                continue;

            long triggerAtMillis = notif.hasKey("triggerMillis") ? (long) notif.getDouble("triggerMillis") : 0;
            String title = notif.hasKey("title") ? notif.getString("title") : "Rappel prière";
            String body = notif.hasKey("body") ? notif.getString("body") : "";
            String prayer = notif.hasKey("prayer") ? notif.getString("prayer") : "";
            boolean isToday = notif.hasKey("isToday") ? notif.getBoolean("isToday") : false;

            Intent intent = new Intent(context, PrayerReminderReceiver.class);
            intent.putExtra("TITLE", title);
            intent.putExtra("BODY", body);
            intent.putExtra("PRAYER_LABEL", prayer);

            // Utilise un requestCode unique pour les rappels
            int requestCode = ("reminder_" + prayer + "_" + triggerAtMillis).hashCode();

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            try {
                if (isToday) {
                    alarmManager.setAlarmClock(
                            new AlarmManager.AlarmClockInfo(triggerAtMillis, null),
                            pendingIntent);
                } else {
                    alarmManager.setExactAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            triggerAtMillis,
                            pendingIntent);
                }
                // DIAGNOSTIC TEMPOREL PRÉCIS
                long now = System.currentTimeMillis();
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("HH:mm:ss.SSS",
                        java.util.Locale.getDefault());
                String nowStr = sdf.format(new java.util.Date(now));
                String targetStr = sdf.format(new java.util.Date(triggerAtMillis));
                long minutesUntil = (triggerAtMillis - now) / 60000;
                long secondsUntil = ((triggerAtMillis - now) % 60000) / 1000;

                Log.d("AdhanModule", String.format(
                        "✅ Rappel programmé pour %s | Maintenant: %s | Cible: %s | Écart: %d min %d sec | Méthode: %s",
                        prayer,
                        nowStr,
                        targetStr,
                        minutesUntil,
                        secondsUntil,
                        isToday ? "setAlarmClock" : "setExactAndAllowWhileIdle"));
            } catch (Exception e) {
                Log.e("AdhanModule", "❌ Erreur lors de la programmation du rappel: " + e.getMessage());
            }
        }
    }

    @ReactMethod
    public void cancelAllPrayerReminders() {
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        String[] prayers = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };

        Log.d("AdhanModule", "🚫 ANNULATION OPTIMISÉE des rappels de prière...");
        int cancelCount = 0;

        // ANNULATION ULTRA-LÉGÈRE : Seulement 2 jours puisqu'on planifie que 2 jours
        long now = System.currentTimeMillis();
        long twoDays = 2L * 24L * 60L * 60L * 1000L; // Réduit à 2 jours seulement

        for (String prayer : prayers) {
            // Balaye par intervalles de 30 minutes sur 2 jours (ultra-rapide)
            for (long timestamp = now - (12L * 60L * 60L * 1000L); timestamp <= now + twoDays; timestamp += 30L * 60L
                    * 1000L) {
                int requestCode = ("reminder_" + prayer + "_" + timestamp).hashCode();

                Intent intent = new Intent(context, PrayerReminderReceiver.class);
                intent.putExtra("PRAYER_LABEL", prayer);

                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        intent,
                        PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);

                if (pendingIntent != null) {
                    try {
                        alarmManager.cancel(pendingIntent);
                        pendingIntent.cancel();
                        cancelCount++;
                    } catch (Exception e) {
                        // Ignore les erreurs
                    }
                }
            }
        }

        // Méthode alternative : annulation par pattern générique
        for (String prayer : prayers) {
            for (String day : new String[] { "today", "tomorrow" }) {
                Intent intent = new Intent(context, PrayerReminderReceiver.class);
                intent.putExtra("PRAYER_LABEL", prayer);

                int requestCode = ("reminder_" + prayer + "_" + day).hashCode();
                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        intent,
                        PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);

                if (pendingIntent != null) {
                    try {
                        alarmManager.cancel(pendingIntent);
                        pendingIntent.cancel();
                        cancelCount++;
                    } catch (Exception e) {
                        // Ignore
                    }
                }
            }
        }

        Log.d("AdhanModule", "✅ Annulation optimisée terminée : " + cancelCount + " rappels annulés");
    }

    // ============ DHIKR/DUA NOTIFICATIONS ============

    @ReactMethod
    public void cancelAllDhikrNotifications() {
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Log.d("AdhanModule", "🚫 Annulation simple des notifications dhikr (sera affinée si besoin)...");

        // TODO: Implement a more targeted cancellation if specific old dhikrs persist.
        // For now, this complex cancellation is removed to improve performance as it
        // was finding 0 alarms.
        // We rely on the fact that new settings will schedule new alarms, implicitly
        // overriding.
        // A more robust solution would be to cancel specific alarms before rescheduling
        // them,
        // possibly by passing the list of alarms to cancel from JS or by querying
        // existing alarms if possible.

        // Exemple de la façon dont on pourrait annuler des alarmes dhikr si on
        // connaissait leur requestCode exact.
        // String[] prayers = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };
        // String[] types = { "afterSalah", "dhikrMorning", "eveningDhikr",
        // "selectedDua" };
        // int cancelCount = 0;
        // for (String type : types) {
        // for (String prayer : prayers) {
        // // IMPORTANT: This requestCode would need to match EXACTLY how it was
        // created.
        // // This is just a placeholder for a potential future targeted cancellation.
        // // int requestCode = (type + "_" + prayer + "_" +
        // SOME_KNOWN_TRIGGER_MILLIS).hashCode();
        // Intent intent = new Intent(context, DhikrReceiver.class);
        // intent.putExtra("TYPE", type);
        // intent.putExtra("PRAYER_LABEL", prayer);
        // PendingIntent pendingIntent = PendingIntent.getBroadcast(context,
        // /*requestCode*/ (type+prayer).hashCode(), intent,
        // PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        // if (pendingIntent != null) {
        // alarmManager.cancel(pendingIntent);
        // pendingIntent.cancel();
        // cancelCount++;
        // }
        // }
        // }
        // Log.d("AdhanModule", "✅ Annulation Dhikr (simplifiée) terminée : " +
        // cancelCount + " notifications dhikr supprimées (estimation).");
        Log.d("AdhanModule",
                "✅ Annulation Dhikr (simplifiée) : exécution rapide, pas d'annulation active pour le moment.");
    }

    // 🚫 MÉTHODE SPÉCIALE : Annule les notifications legacy à 1 minute après
    // l'heure actuelle
    @ReactMethod
    public void cancelLegacyDhikrAfterCurrentTime() {
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        Log.d("AdhanModule", "🚫 ANNULATION LEGACY à 1 minute après maintenant...");

        String[] prayers = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };
        int cancelCount = 0;
        long now = System.currentTimeMillis();

        // Calcule 1 minute après maintenant (legacy timing)
        long oneMinuteAfterNow = now + (1L * 60L * 1000L);

        // Teste différents timestamps autour de cette heure (±30 secondes)
        for (long timestamp = oneMinuteAfterNow - 30000L; timestamp <= oneMinuteAfterNow + 30000L; timestamp += 5000L) {
            for (String prayer : prayers) {
                // Teste différents patterns de requestCode pour afterSalah legacy
                String[] patterns = {
                        "afterSalah_" + prayer + "_" + timestamp,
                        "afterSalah_" + prayer,
                        "afterSalah" + prayer + timestamp,
                        prayer + "_afterSalah",
                        prayer + "afterSalah"
                };

                for (String pattern : patterns) {
                    try {
                        int requestCode = pattern.hashCode();
                        Intent intent = new Intent(context, DhikrReceiver.class);
                        intent.putExtra("TYPE", "afterSalah");
                        intent.putExtra("PRAYER_LABEL", prayer);

                        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                                context,
                                requestCode,
                                intent,
                                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);

                        if (pendingIntent != null) {
                            alarmManager.cancel(pendingIntent);
                            pendingIntent.cancel();
                            cancelCount++;
                            Log.d("AdhanModule", "🚫 Annulé legacy: " + pattern);
                        }
                    } catch (Exception e) {
                        // Ignore silencieusement
                    }
                }
            }
        }

        Log.d("AdhanModule", "✅ Annulation legacy terminée : " + cancelCount + " notifications legacy supprimées");
    }

    @ReactMethod
    public void scheduleDhikrNotifications(ReadableArray dhikrNotifications) {
        Log.d("AdhanModule", "📩 Réception des notifications Dhikr depuis JS : " + dhikrNotifications.size());
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        for (int i = 0; i < dhikrNotifications.size(); i++) {
            ReadableMap notif = dhikrNotifications.getMap(i);
            if (notif == null)
                continue;

            String type = notif.getString("type");
            long triggerMillis = (long) notif.getDouble("triggerMillis");
            String title = notif.getString("title");
            String body = notif.getString("body");
            String prayer = notif.getString("prayer");

            Log.d("AdhanModule", "🔍 Programmation dhikr: " + type + " - " + prayer + " dans " +
                    ((triggerMillis - System.currentTimeMillis()) / 60000) + " minutes");

            Intent intent = new Intent(context, DhikrReceiver.class);
            intent.putExtra("TYPE", type);
            intent.putExtra("TITLE", title);
            intent.putExtra("BODY", body);
            intent.putExtra("PRAYER_LABEL", prayer);

            int requestCode = (type + "_" + prayer + "_" + triggerMillis).hashCode();

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            try {
                alarmManager.setAlarmClock(
                        new AlarmManager.AlarmClockInfo(triggerMillis, null),
                        pendingIntent);
                Log.d("AdhanModule", "✅ Dhikr programmé: " + type + " - " + prayer);
            } catch (Exception e) {
                Log.e("AdhanModule", "❌ Erreur programmation dhikr: " + e.getMessage());
            }
        }
    }

    // ============ PARAMÈTRES (stockage/reprog automatique) ============

    @ReactMethod
    public void setAdhanSound(String adhanSound) {
        SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences("adhan_prefs",
                        Context.MODE_PRIVATE);
        prefs.edit().putString("ADHAN_SOUND", adhanSound).apply();
    }

    @ReactMethod
    public void setAdhanVolume(float volume) {
        SharedPreferences prefs = getReactApplicationContext().getSharedPreferences("adhan_prefs",
                Context.MODE_PRIVATE);
        prefs.edit().putFloat("adhan_volume", volume).apply();
    }

    @ReactMethod
    public void getAdhanVolume(Promise promise) {
        SharedPreferences prefs = getReactApplicationContext().getSharedPreferences("adhan_prefs",
                Context.MODE_PRIVATE);
        float volume = prefs.getFloat("adhan_volume", 1.0f);
        promise.resolve((double) volume);
    }

    @ReactMethod
    public void setCalculationMethod(String method) {
        getReactApplicationContext()
                .getSharedPreferences("adhan_prefs", Context.MODE_PRIVATE)
                .edit().putString("calc_method", method).apply();
    }

    @ReactMethod
    public void setLocation(double lat, double lon) {
        // Sauvegarde pour l'utilisation immédiate par la logique de calcul Adhan
        // (adhan_prefs)
        // Cette partie est toujours mise à jour, même avec (0.0, 0.0),
        // car le calcul immédiat pourrait avoir besoin de ces valeurs temporairement.
        getReactApplicationContext()
                .getSharedPreferences("adhan_prefs", Context.MODE_PRIVATE)
                .edit()
                .putFloat("lat", (float) lat)
                .putFloat("lon", (float) lon)
                .apply();

        // Protection contre les coordonnées (0,0) pour la sauvegarde persistante
        // destinée à la reprogrammation automatique.
        if (lat == 0.0 && lon == 0.0) {
            Log.w("AdhanModule",
                    "⚠️ setLocation appelée avec (0.0, 0.0). Ces coordonnées ne seront PAS sauvegardées dans prayer_times_settings pour auto_latitude/longitude afin d'éviter de perturber la reprogrammation. Les valeurs précédentes (si valides) seront conservées.");
            // Ne pas mettre à jour prayer_times_settings avec (0,0) pour
            // auto_latitude/longitude.
            // AdhanService utilisera les dernières coordonnées valides ou échouera
            // proprement.
            return;
        }

        // Sauvegarde dans prayer_times_settings pour la reprogrammation par
        // AdhanService
        SharedPreferences settingsPrefs = getReactApplicationContext()
                .getSharedPreferences("prayer_times_settings", Context.MODE_PRIVATE);
        SharedPreferences.Editor settingsEditor = settingsPrefs.edit();
        settingsEditor.putFloat("auto_latitude", (float) lat);
        settingsEditor.putFloat("auto_longitude", (float) lon);
        // S'assurer que le location_mode est "auto" quand on reçoit des coordonnées
        // automatiques valides.
        settingsEditor.putString("location_mode", "auto");
        settingsEditor.apply();

        // Log de vérification amélioré: Lire directement depuis SharedPreferences après
        // l'écriture
        float V_savedLat = settingsPrefs.getFloat("auto_latitude", -999.0f); // Valeur par défaut unique pour le log
        float V_savedLon = settingsPrefs.getFloat("auto_longitude", -999.0f);
        String V_savedMode = settingsPrefs.getString("location_mode", "MODE_LECTURE_ERREUR");
        Log.d("AdhanModule", "📍 Vérification setLocation (prayer_times_settings): Lat_lu=" + V_savedLat + ", Lon_lu="
                + V_savedLon + ", Mode_lu=" + V_savedMode + " (Valeurs entrantes: lat=" + lat + ", lon=" + lon + ")");
    }

    @ReactMethod
    public void getSavedAutoLocation(Promise promise) {
        try {
            SharedPreferences settingsPrefs = getReactApplicationContext()
                    .getSharedPreferences("prayer_times_settings", Context.MODE_PRIVATE);
            // Use a default value that indicates "not found", e.g., -999
            float lat = settingsPrefs.getFloat("auto_latitude", -999.0f);
            float lon = settingsPrefs.getFloat("auto_longitude", -999.0f);

            // Check against the "not found" default value
            if (lat == -999.0f || lon == -999.0f) {
                Log.d("AdhanModule", "📍 getSavedAutoLocation: Pas de coordonnées automatiques sauvegardées trouvées.");
                promise.resolve(null);
            } else {
                WritableMap location = Arguments.createMap();
                location.putDouble("lat", (double) lat);
                location.putDouble("lon", (double) lon);
                Log.d("AdhanModule",
                        "📍 getSavedAutoLocation: Coordonnées automatiques récupérées: " + lat + ", " + lon);
                promise.resolve(location);
            }
        } catch (Exception e) {
            Log.e("AdhanModule", "❌ Erreur dans getSavedAutoLocation: " + e.getMessage());
            promise.reject("GET_LOCATION_ERROR", e);
        }
    }

    // (Optionnel) Pour stocker la config complète pour reprog après reboot/Isha
    @ReactMethod
    public void savePrayerTimesForTomorrow(ReadableMap prayerTimes) {
        SharedPreferences prefs = getReactApplicationContext().getSharedPreferences("adhan_prefs",
                Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        for (Map.Entry<String, Object> entry : prayerTimes.toHashMap().entrySet()) {
            String label = entry.getKey();
            Object value = entry.getValue();
            if (value instanceof Number) {
                Double millis = ((Number) value).doubleValue();
                editor.putLong(label, millis.longValue());
            } else {
                Log.w("AdhanModule", "Clé ignorée (pas un nombre) : " + label + " = " + value);
            }
        }
        editor.apply();
    }

    @ReactMethod
    public void openNotificationSettings() {
        Context context = getReactApplicationContext();
        Intent intent = new Intent();
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            intent.setAction(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.getPackageName());
        } else {
            intent.setAction(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.addCategory(Intent.CATEGORY_DEFAULT);
            intent.setData(android.net.Uri.parse("package:" + context.getPackageName()));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    @ReactMethod
    public void getUpcomingReminders(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            String[] prayers = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };
            StringBuilder result = new StringBuilder();

            long now = System.currentTimeMillis();
            SimpleDateFormat sdf = new SimpleDateFormat("dd/MM HH:mm", Locale.getDefault());

            result.append("REMINDERS PROGRAMMÉS:\n\n");

            for (String prayer : prayers) {
                // Vérifie pour aujourd'hui et demain
                for (String day : new String[] { "today", "tomorrow" }) {
                    Intent intent = new Intent(context, PrayerReminderReceiver.class);
                    intent.putExtra("PRAYER_LABEL", prayer);

                    int requestCode = ("reminder_" + prayer + "_" + day).hashCode();
                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                            context,
                            requestCode,
                            intent,
                            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);

                    if (pendingIntent != null) {
                        // Essaie de calculer quand il va se déclencher
                        // (Note: Android ne permet pas de récupérer directement le timestamp d'une
                        // alarme,
                        // donc on affiche juste qu'il existe)
                        result.append(prayer + " (" + day + "): PROGRAMMÉ\n");
                    } else {
                        result.append(prayer + " (" + day + "): non programmé\n");
                    }
                }
            }

            // Récupère aussi le délai sauvegardé
            SharedPreferences prefs = getReactApplicationContext().getSharedPreferences("prayer_times_settings",
                    Context.MODE_PRIVATE);
            int savedOffset = prefs.getInt("reminder_offset", 10);
            result.append("\nDélai sauvegardé: " + savedOffset + " minutes");

            promise.resolve(result.toString());
        } catch (Exception e) {
            promise.reject("ERROR", "Erreur récupération reminders: " + e.getMessage());
        }
    }

    @ReactMethod
    public void saveNotificationSettings(ReadableMap settings) {
        SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences("prayer_times_settings", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        // Rend tous les paramètres optionnels pour éviter les crashes
        if (settings.hasKey("notificationsEnabled")) {
            editor.putBoolean("notifications_enabled", settings.getBoolean("notificationsEnabled"));
        }
        if (settings.hasKey("remindersEnabled")) {
            editor.putBoolean("reminders_enabled", settings.getBoolean("remindersEnabled"));
        }
        if (settings.hasKey("enabledAfterSalah")) {
            editor.putBoolean("enabled_after_salah", settings.getBoolean("enabledAfterSalah"));
        }
        if (settings.hasKey("enabledMorningDhikr")) {
            editor.putBoolean("enabled_morning_dhikr", settings.getBoolean("enabledMorningDhikr"));
        }
        if (settings.hasKey("enabledEveningDhikr")) {
            editor.putBoolean("enabled_evening_dhikr", settings.getBoolean("enabledEveningDhikr"));
        }
        if (settings.hasKey("enabledSelectedDua")) {
            editor.putBoolean("enabled_selected_dua", settings.getBoolean("enabledSelectedDua"));
        }

        // Sauvegarde du reminderOffset
        if (settings.hasKey("reminderOffset")) {
            editor.putInt("reminder_offset", settings.getInt("reminderOffset"));
        }

        // Sauvegarde des délais de dhikrs
        if (settings.hasKey("delayAfterSalah")) { // Sera toujours 5 depuis le JS maintenant
            editor.putInt("delay_after_salah", settings.getInt("delayAfterSalah"));
        } else {
            editor.putInt("delay_after_salah", 5); // Assurer une valeur par défaut ici aussi
        }
        if (settings.hasKey("delayMorningDhikr")) {
            editor.putInt("delay_morning_dhikr", settings.getInt("delayMorningDhikr"));
        }
        if (settings.hasKey("delayEveningDhikr")) {
            editor.putInt("delay_evening_dhikr", settings.getInt("delayEveningDhikr"));
        }
        if (settings.hasKey("delaySelectedDua")) {
            editor.putInt("delay_selected_dua", settings.getInt("delaySelectedDua"));
        }

        // Sauvegarde la langue actuelle
        if (settings.hasKey("currentLanguage")) {
            editor.putString("current_language", settings.getString("currentLanguage"));
        }

        // ==== AJOUTS POUR LA REPROGRAMMATION ROBUSTE ====
        if (settings.hasKey("locationMode")) {
            String locationMode = settings.getString("locationMode");
            editor.putString("location_mode", locationMode);
            Log.d("AdhanModule", "📍 Location mode sauvegardé: " + locationMode);

            if ("manual".equals(locationMode) && settings.hasKey("manualLocation")) {
                ReadableMap manualLocation = settings.getMap("manualLocation");
                if (manualLocation != null) {
                    if (manualLocation.hasKey("lat")) {
                        editor.putFloat("manual_latitude", (float) manualLocation.getDouble("lat"));
                        Log.d("AdhanModule", "📍 Manual Latitude sauvegardée: " + manualLocation.getDouble("lat"));
                    }
                    if (manualLocation.hasKey("lon")) {
                        editor.putFloat("manual_longitude", (float) manualLocation.getDouble("lon"));
                        Log.d("AdhanModule", "📍 Manual Longitude sauvegardée: " + manualLocation.getDouble("lon"));
                    }
                    if (manualLocation.hasKey("city")) {
                        editor.putString("manual_city_name", manualLocation.getString("city"));
                        Log.d("AdhanModule", "📍 Manual City sauvegardé: " + manualLocation.getString("city"));
                    }
                }
            }
        }
        // Les coordonnées automatiques sont déjà sauvegardées via setLocation dans
        // "adhan_prefs"
        // lat, lon. AdhanService les lit déjà.

        editor.apply();
        Log.d("AdhanModule", "✅ Paramètres de notification et localisation sauvegardés");

        // Mettre à jour le widget si les horaires ont changé
        updateWidgetInternal();
    }

    @ReactMethod
    public void saveTodayPrayerTimes(ReadableMap prayerTimes) {
        SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences("prayer_times_settings", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        try {
            // JavaScript envoie maintenant directement des strings au format "HH:MM"
            org.json.JSONObject json = new org.json.JSONObject();
            ReadableMapKeySetIterator iterator = prayerTimes.keySetIterator();
            while (iterator.hasNextKey()) {
                String prayerName = iterator.nextKey(); // ex: "Fajr", "Dhuhr", etc.
                ReadableType type = prayerTimes.getType(prayerName);

                if (type == ReadableType.String) {
                    // JavaScript envoie directement "HH:MM"
                    String timeString = prayerTimes.getString(prayerName);
                    json.put(prayerName, timeString);
                    Log.d("AdhanModule", "✅ " + prayerName + ": " + timeString);
                } else {
                    Log.w("AdhanModule", "⚠️ Type inattendu pour " + prayerName + ": " + type + " (attendu: String)");
                }
            }

            // 🆕 AMÉLIORATION: Sauvegarde multiple pour compatibilité anciennes versions
            // Android
            String jsonString = json.toString();

            // Sauvegarde principale
            editor.putString("today_prayer_times", jsonString);

            // 🆕 NOUVEAU: Sauvegarde de backup avec un préfixe de date pour éviter les
            // conflits
            Calendar now = Calendar.getInstance();
            String dateKey = String.format(Locale.getDefault(), "%04d-%02d-%02d",
                    now.get(Calendar.YEAR),
                    now.get(Calendar.MONTH) + 1,
                    now.get(Calendar.DAY_OF_MONTH));
            editor.putString("prayer_times_backup_" + dateKey, jsonString);

            // 🆕 Sauvegarde individuelle pour chaque prière (fallback supplémentaire)
            ReadableMapKeySetIterator iter2 = prayerTimes.keySetIterator();
            while (iter2.hasNextKey()) {
                String prayerName = iter2.nextKey();
                if (prayerTimes.getType(prayerName) == ReadableType.String) {
                    String timeString = prayerTimes.getString(prayerName);
                    editor.putString("prayer_" + prayerName.toLowerCase() + "_time", timeString);
                }
            }

            // 🆕 Sauvegarder la date de dernière mise à jour
            editor.putLong("last_prayer_times_update", System.currentTimeMillis());
            editor.putString("last_prayer_times_date", dateKey);

            editor.apply();

            Log.d("AdhanModule", "💾 Horaires du jour sauvegardés pour le widget (avec backups): " + jsonString);

            // Mettre à jour le widget avec un petit délai pour s'assurer que les
            // préférences sont bien écrites
            updateWidgetWithDelay();

        } catch (Exception e) {
            Log.e("AdhanModule", "❌ Erreur lors de la sauvegarde des horaires", e);
        }
    }

    @ReactMethod
    public void updateWidget() {
        updateWidgetInternal();
    }

    // 🆕 NOUVEAU: Mise à jour du widget avec délai pour compatibilité
    private void updateWidgetWithDelay() {
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                updateWidgetInternal();

                // 🆕 Double mise à jour après un court délai pour s'assurer que les données
                // sont bien lues
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        updateWidgetInternal();
                        Log.d("AdhanModule", "🔄 Double mise à jour widget effectuée pour compatibilité");
                    }
                }, 1000); // 1 seconde de délai
            }
        }, 100); // 100ms de délai initial
    }

    // Méthode pour mettre à jour le widget
    private void updateWidgetInternal() {
        try {
            Context context = getReactApplicationContext();

            // Force la mise à jour de tous les widgets via AppWidgetManager
            android.appwidget.AppWidgetManager appWidgetManager = android.appwidget.AppWidgetManager
                    .getInstance(context);
            android.content.ComponentName componentName = new android.content.ComponentName(context,
                    PrayerTimesWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);

            if (appWidgetIds.length > 0) {
                Log.d("AdhanModule", "📱 Mise à jour forcée de " + appWidgetIds.length + " widget(s)");

                // Appel direct à la méthode onUpdate du widget
                PrayerTimesWidget widget = new PrayerTimesWidget();
                widget.onUpdate(context, appWidgetManager, appWidgetIds);
            } else {
                Log.d("AdhanModule", "📱 Aucun widget trouvé sur l'écran d'accueil");
            }

            Log.d("AdhanModule", "📱 Signal de mise à jour envoyé au widget");
        } catch (Exception e) {
            Log.e("AdhanModule", "❌ Erreur lors de la mise à jour du widget", e);
        }
    }

    @ReactMethod
    public void forceUpdateWidgets() {
        try {
            PrayerTimesWidget.forceUpdateWidgets(getReactApplicationContext());
        } catch (Exception e) {
            Log.e("AdhanModule", "❌ Erreur mise à jour forcée widgets: " + e.getMessage());
        }
    }

}
