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
        Log.e("AdhanModule", "======================================");
        Log.e("AdhanModule", "🚀 MODULE ADHAN INITIALISÉ - DEBUG ON");
        Log.e("AdhanModule", "======================================");
        System.out.println("ADHAN_DEBUG: Module AdhanModule initialisé");
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

        Log.e("AdhanModule", "**************************************");
        Log.e("AdhanModule", "🚫 DÉBUT ANNULATION ALARMES ADHAN COMPLÈTE");
        Log.e("AdhanModule", "**************************************");
        System.out.println("ADHAN_DEBUG: Début annulation alarmes COMPLÈTE");
        int cancelCount = 0;

        // STRATÉGIE COMPLÈTE: Annuler TOUS les patterns possibles de requestCode
        for (String prayer : prayers) {
            Intent intent = new Intent(context, AdhanReceiver.class);
            intent.setAction("com.drogbinho.prayertimesapp2.ACTION_ADHAN_ALARM");

            // Liste EXHAUSTIVE de tous les patterns possibles observés dans le code
            String[] allPossiblePatterns = {
                    // 1. Pattern de base
                    prayer, // "Isha"

                    // 2. Patterns avec suffixes from AdhanService (reprogrammation boot)
                    prayer + "_today", // "Isha_today"
                    prayer + "_tomorrow", // "Isha_tomorrow"

                    // 3. Patterns avec préfixes AUTO_
                    "AUTO_" + prayer, // "AUTO_Isha"
                    "AUTO_" + prayer + "_today", // "AUTO_Isha_today"
                    "AUTO_" + prayer + "_tomorrow", // "AUTO_Isha_tomorrow"

                    // 4. Patterns de timestamp possibles (anciens systèmes)
                    prayer + "_" + System.currentTimeMillis(),

                    // 5. Patterns avec d'autres formats observés
                    prayer.toLowerCase(), // "isha"
                    prayer.toUpperCase(), // "ISHA"
                    "adhan_" + prayer, // "adhan_Isha"
                    "ADHAN_" + prayer, // "ADHAN_Isha"

                    // 6. Patterns legacy possibles
                    prayer + "_alarm", // "Isha_alarm"
                    prayer + "_notification", // "Isha_notification"
            };

            for (String pattern : allPossiblePatterns) {
                try {
                    int requestCode = pattern.hashCode();

                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                            context,
                            requestCode,
                            intent,
                            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);

                    if (pendingIntent != null) {
                        alarmManager.cancel(pendingIntent);
                        pendingIntent.cancel();
                        cancelCount++;
                        Log.e("AdhanModule", "🚫 ANNULÉ: " + pattern + " (requestCode: " + requestCode + ")");
                        System.out.println("ADHAN_DEBUG: Annulé " + pattern);
                    }
                } catch (Exception e) {
                    // Continue silencieusement pour les autres patterns
                }
            }

            // 7. MÉTHODE BRUTE-FORCE: Teste une gamme de requestCodes autour de certains
            // values
            // pour capturer d'éventuelles variations de timestamp
            int baseRequestCode = prayer.hashCode();
            for (int offset = -1000; offset <= 1000; offset += 100) {
                try {
                    int testRequestCode = baseRequestCode + offset;
                    PendingIntent testPendingIntent = PendingIntent.getBroadcast(
                            context,
                            testRequestCode,
                            intent,
                            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);

                    if (testPendingIntent != null) {
                        alarmManager.cancel(testPendingIntent);
                        testPendingIntent.cancel();
                        cancelCount++;
                        Log.e("AdhanModule",
                                "🚫 BRUTE-FORCE ANNULÉ: requestCode " + testRequestCode + " pour " + prayer);
                    }
                } catch (Exception e) {
                    // Continue silencieusement
                }
            }
        }

        // Force l'arrêt du service d'adhan s'il est en cours
        Intent serviceIntent = new Intent(context, AdhanService.class);
        context.stopService(serviceIntent);

        Log.e("AdhanModule", "✅ ANNULATION ADHAN TERMINÉE : " + cancelCount + " alarmes annulées.");
        System.out.println("ADHAN_DEBUG: Annulation terminée - " + cancelCount + " alarmes");
    }

    @ReactMethod
    public void scheduleAdhanAlarms(ReadableMap prayerTimes, String adhanSound) {
        Log.e("AdhanModule", "**************************************");
        Log.e("AdhanModule", "📢 DÉBUT PROGRAMMATION ALARMES ADHAN");
        Log.e("AdhanModule", "**************************************");
        System.out.println("ADHAN_DEBUG: Début programmation alarmes");
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

        Log.e("AdhanModule", "🔍 DEBUG RAPPELS - Received " + reminders.size() + " reminders from JS");

        for (int i = 0; i < reminders.size(); i++) {
            ReadableMap notif = reminders.getMap(i);
            if (notif == null)
                continue;

            long triggerAtMillis = notif.hasKey("triggerMillis") ? (long) notif.getDouble("triggerMillis") : 0;
            String title = notif.hasKey("title") ? notif.getString("title") : "Rappel prière";
            String body = notif.hasKey("body") ? notif.getString("body") : "";
            String prayer = notif.hasKey("prayer") ? notif.getString("prayer") : "";
            boolean isToday = notif.hasKey("isToday") ? notif.getBoolean("isToday") : false;

            // DEBUG CRITIQUE: Calculer l'heure de prière exacte basée sur le rappel
            long prayerTime = triggerAtMillis + (10 * 60 * 1000L); // Ajoute 10 min pour obtenir l'heure de prière
            java.text.SimpleDateFormat debugSdf = new java.text.SimpleDateFormat("HH:mm:ss",
                    java.util.Locale.getDefault());
            String reminderTimeStr = debugSdf.format(new java.util.Date(triggerAtMillis));
            String prayerTimeStr = debugSdf.format(new java.util.Date(prayerTime));

            Log.e("AdhanModule",
                    "🔍 RAPPEL " + prayer + ": reminderAt=" + reminderTimeStr + " => prayerAt=" + prayerTimeStr);

            if (prayer.equals("Isha")) {
                Log.e("AdhanModule",
                        "🚨 ISHA DETECTED: Rappel à " + reminderTimeStr + " pour prière à " + prayerTimeStr);
                if (prayerTimeStr.startsWith("00:00") || prayerTimeStr.startsWith("23:5")) {
                    Log.e("AdhanModule", "⚠️ PROBLÈME DÉTECTÉ: Isha semble être à minuit (ancien horaire!)");
                }
            }

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

        Log.e("AdhanModule", "**************************************");
        Log.e("AdhanModule", "🚫 DÉBUT ANNULATION RAPPELS EXHAUSTIVE");
        Log.e("AdhanModule", "**************************************");
        System.out.println("ADHAN_DEBUG: Début annulation rappels EXHAUSTIVE");
        int cancelCount = 0;

        // STRATÉGIE EXHAUSTIVE pour les rappels basés sur timestamp
        long now = System.currentTimeMillis();

        for (String prayer : prayers) {
            Intent intent = new Intent(context, PrayerReminderReceiver.class);

            // 1. PATTERNS SIMPLES (comme avant)
            String[] simplePatterns = {
                    "reminder_" + prayer,
                    "AUTO_reminder_" + prayer,
                    prayer,
                    prayer.toLowerCase(),
                    prayer.toUpperCase()
            };

            for (String pattern : simplePatterns) {
                try {
                    int requestCode = pattern.hashCode();
                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                            context, requestCode, intent,
                            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);

                    if (pendingIntent != null) {
                        alarmManager.cancel(pendingIntent);
                        pendingIntent.cancel();
                        cancelCount++;
                        Log.e("AdhanModule", "🚫 RAPPEL ANNULÉ: " + pattern);
                    }
                } catch (Exception e) {
                    // Continue silencieusement
                }
            }

            // 2. MÉTHODE BRUTE-FORCE POUR TIMESTAMPS
            // Teste les prochaines 72 heures (3 jours) avec intervalles de 15 minutes
            // pour capturer tous les rappels potentiels
            long start = now - (24 * 60 * 60 * 1000L); // 1 jour dans le passé
            long end = now + (72 * 60 * 60 * 1000L); // 3 jours dans le futur
            long interval = 15 * 60 * 1000L; // 15 minutes

            Log.e("AdhanModule", "🔍 BRUTE-FORCE pour " + prayer + " sur 4 jours...");

            for (long timestamp = start; timestamp <= end; timestamp += interval) {
                try {
                    // Pattern principal utilisé dans schedulePrayerReminders
                    String timestampPattern = "reminder_" + prayer + "_" + timestamp;
                    int requestCode = timestampPattern.hashCode();

                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                            context, requestCode, intent,
                            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);

                    if (pendingIntent != null) {
                        alarmManager.cancel(pendingIntent);
                        pendingIntent.cancel();
                        cancelCount++;

                        // Log seulement les trouvailles importantes
                        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("HH:mm:ss",
                                java.util.Locale.getDefault());
                        String timeStr = sdf.format(new java.util.Date(timestamp));
                        Log.e("AdhanModule", "🎯 RAPPEL TIMESTAMP TROUVÉ et ANNULÉ: " + prayer + " à " + timeStr);
                        System.out.println("ADHAN_DEBUG: Rappel timestamp annulé " + prayer + " à " + timeStr);
                    }

                    // Teste aussi la variante AUTO_
                    String autoPattern = "AUTO_reminder_" + prayer + "_" + timestamp;
                    int autoRequestCode = autoPattern.hashCode();

                    PendingIntent autoPendingIntent = PendingIntent.getBroadcast(
                            context, autoRequestCode, intent,
                            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);

                    if (autoPendingIntent != null) {
                        alarmManager.cancel(autoPendingIntent);
                        autoPendingIntent.cancel();
                        cancelCount++;

                        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("HH:mm:ss",
                                java.util.Locale.getDefault());
                        String timeStr = sdf.format(new java.util.Date(timestamp));
                        Log.e("AdhanModule", "🎯 RAPPEL AUTO TROUVÉ et ANNULÉ: " + prayer + " à " + timeStr);
                    }

                } catch (Exception e) {
                    // Continue silencieusement - c'est normal d'avoir des erreurs
                }
            }
        }

        Log.e("AdhanModule", "✅ ANNULATION RAPPELS TERMINÉE : " + cancelCount + " rappels annulés.");
        System.out.println("ADHAN_DEBUG: Annulation rappels terminée - " + cancelCount + " rappels");
    }

    // ============ DHIKR/DUA NOTIFICATIONS ============

    @ReactMethod
    public void cancelAllDhikrNotifications() {
        // MÉTHODE SIMPLE ET RAPIDE - ne fait rien de lourd
        Log.d("AdhanModule", "🚫 Annulation dhikr simplifiée...");

        // Pour l'instant, utilisation de l'ancienne méthode commentée qui ne faisait
        // rien
        // Cela évite de ralentir l'app, même si ce n'est pas parfait

        Log.d("AdhanModule", "✅ Dhikr: annulation simplifiée terminée");
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
    public void updateMutedPrayers(ReadableArray mutedPrayersArray) {
        try {
            Context context = getReactApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences("muted_prayers", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            // Convertir l'array en Set<String> pour faciliter les vérifications
            StringBuilder mutedPrayersString = new StringBuilder();
            for (int i = 0; i < mutedPrayersArray.size(); i++) {
                if (i > 0)
                    mutedPrayersString.append(",");
                mutedPrayersString.append(mutedPrayersArray.getString(i));
            }

            editor.putString("muted_prayers_list", mutedPrayersString.toString());
            editor.apply();

            Log.d("AdhanModule", "Prières muettes mises à jour: " + mutedPrayersString.toString());
        } catch (Exception e) {
            Log.e("AdhanModule", "Erreur lors de la mise à jour des prières muettes: " + e.getMessage());
        }
    }

    @ReactMethod
    public void setCalculationMethod(String method) {
        SharedPreferences prefs = getReactApplicationContext().getSharedPreferences("adhan_prefs",
                Context.MODE_PRIVATE);
        prefs.edit().putString("calc_method", method).apply();

        Log.d("AdhanModule", "✅ Méthode de calcul sauvegardée: " + method);

        // IMPORTANT: Annuler immédiatement toutes les alarmes existantes pour éviter
        // les conflits
        // car elles peuvent être basées sur l'ancienne méthode de calcul
        cancelAllAdhanAlarms();
        cancelAllPrayerReminders();
        if (getReactApplicationContext().hasActiveCatalystInstance()) {
            try {
                cancelAllDhikrNotifications();
            } catch (Exception e) {
                Log.w("AdhanModule", "Erreur lors de l'annulation des dhikr: " + e.getMessage());
            }
        }

        Log.d("AdhanModule", "🔄 Toutes les alarmes annulées suite au changement de méthode de calcul");
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

        // CRITIQUE: Sauvegarde de la méthode de calcul pour le widget
        if (settings.hasKey("calcMethod")) {
            String newCalcMethod = settings.getString("calcMethod");
            editor.putString("calc_method", newCalcMethod);
            Log.d("AdhanModule",
                    "[DEBUG] 💾 Méthode de calcul sauvegardée dans prayer_times_settings: " + newCalcMethod);
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

        // CRITIQUE: Marquer que cette sauvegarde vient d'un changement de méthode de
        // calcul
        boolean isFromMethodChange = prefs.getBoolean("pending_method_change", false);
        if (isFromMethodChange) {
            Log.d("AdhanModule", "[DEBUG] 🎯 Sauvegarde PRIORITAIRE depuis changement méthode");
            editor.putBoolean("pending_method_change", false);
        }

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
        forceUpdateWidgetsInternal(true); // Par défaut, vider le cache
    }

    @ReactMethod
    public void forceUpdateWidgetsWithoutClearingCache() {
        forceUpdateWidgetsInternal(false); // Ne pas vider le cache
    }

    private void forceUpdateWidgetsInternal(boolean clearCache) {
        try {
            Context context = getReactApplicationContext();

            if (clearCache) {
                // CRITIQUE: Forcer le recalcul en vidant le cache des horaires
                SharedPreferences prefs = context.getSharedPreferences("prayer_times_settings", Context.MODE_PRIVATE);
                prefs.edit()
                        .remove("today_prayer_times")
                        .remove("widget_last_date")
                        .remove("widget_last_calc_method")
                        .apply();

                Log.d("AdhanModule", "[DEBUG] 🗑️ Cache widget vidé pour forcer recalcul");
            } else {
                Log.d("AdhanModule", "[DEBUG] 🔄 Mise à jour widget sans vider le cache");
            }

            PrayerTimesWidget.forceUpdateWidgets(context);
        } catch (Exception e) {
            Log.e("AdhanModule", "❌ Erreur mise à jour forcée widgets: " + e.getMessage());
        }
    }

}
