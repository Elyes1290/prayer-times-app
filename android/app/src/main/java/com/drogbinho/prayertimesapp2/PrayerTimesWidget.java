package com.drogbinho.prayertimesapp2;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import com.batoulapps.adhan.data.DateComponents;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class PrayerTimesWidget extends AppWidgetProvider {

    private static final String TAG = "PrayerTimesWidget";
    private static final String ACTION_REFRESH_DUA = "com.drogbinho.prayertimesapp2.REFRESH_DUA";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d(TAG, "🔄 Widget onUpdate appelé pour " + appWidgetIds.length + " widgets");

        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_REFRESH_DUA.equals(intent.getAction())) {
            Log.d(TAG, "🔄 Action actualiser dua reçue");

            // Sauvegarder le flag pour forcer une nouvelle sélection aléatoire
            SharedPreferences prefs = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE);
            prefs.edit().putBoolean("force_random_dua", true).apply();

            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, PrayerTimesWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

            Log.d(TAG, "🔄 Actualisation de " + appWidgetIds.length + " widgets");

            // Actualiser tous les widgets
            for (int appWidgetId : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId);
                // Notifier que les données ont changé
                appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_listview);
            }
        }
    }

    @Override
    public void onEnabled(Context context) {
        // Called when the first widget is created
    }

    @Override
    public void onDisabled(Context context) {
        // Called when the last widget is removed
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        Log.d(TAG, "🔄 Mise à jour du widget " + appWidgetId);

        try {
            // Configuration ListView avec service scrollable
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.prayer_times_widget);

            // 🎨 NOUVEAU: Sélection dynamique de l'arrière-plan selon la prochaine prière
            String nextPrayerName = getNextPrayerName(context);
            int backgroundResource = getBackgroundForPrayer(nextPrayerName);
            views.setInt(R.id.widget_root, "setBackgroundResource", backgroundResource);

            Log.d(TAG, "🎨 Arrière-plan sélectionné pour " + nextPrayerName + ": " + getBackgroundName(nextPrayerName));

            // Configuration du service ListView
            Intent serviceIntent = new Intent(context, PrayerTimesWidgetService.class);
            views.setRemoteAdapter(R.id.widget_listview, serviceIntent);

            // Configuration du PendingIntentTemplate pour les clics sur les items
            Intent refreshIntent = new Intent(context, PrayerTimesWidget.class);
            refreshIntent.setAction(ACTION_REFRESH_DUA);
            PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(context, 0, refreshIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setPendingIntentTemplate(R.id.widget_listview, refreshPendingIntent);

            // Action au clic sur le widget (optionnel)
            Intent appIntent = new Intent();
            appIntent.setClassName(context, "com.drogbinho.prayertimesapp2.MainActivity");
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, appIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

            Log.d(TAG, "📋 ListView configurée pour le widget " + appWidgetId);

            // Mettre à jour le widget
            appWidgetManager.updateAppWidget(appWidgetId, views);
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_listview);

            Log.d(TAG, "✅ Widget " + appWidgetId + " mis à jour avec ListView scrollable");

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur mise à jour widget " + appWidgetId + ": " + e.getMessage());
        }
    }

    /**
     * 🎨 NOUVEAU: Sélectionne l'arrière-plan approprié selon la prochaine prière
     */
    private static int getBackgroundForPrayer(String prayerName) {
        switch (prayerName) {
            case "Fajr":
                return R.drawable.widget_background_dawn; // Aube avec lever de soleil
            case "Dhuhr":
                return R.drawable.widget_background_dhuhr; // Midi avec soleil éclatant
            case "Asr":
                return R.drawable.widget_background_asr; // Après-midi doré
            case "Maghrib":
                return R.drawable.widget_background_sunset; // Coucher de soleil
            case "Isha":
                return R.drawable.widget_background_isha; // Nuit étoilée avec croissant
            default:
                return R.drawable.widget_background; // Arrière-plan par défaut
        }
    }

    /**
     * 🎨 NOUVEAU: Obtient le nom de l'arrière-plan pour les logs
     */
    private static String getBackgroundName(String prayerName) {
        switch (prayerName) {
            case "Fajr":
                return "Aube (lever de soleil)";
            case "Dhuhr":
                return "Midi (soleil éclatant)";
            case "Asr":
                return "Après-midi (soleil doré)";
            case "Maghrib":
                return "Coucher de soleil";
            case "Isha":
                return "Nuit étoilée (croissant de lune)";
            default:
                return "Arrière-plan par défaut";
        }
    }

    // ==================== MÉTHODES UTILITAIRES ====================

    /**
     * Récupère la langue courante avec fallback
     */
    public static String getCurrentLanguage(Context context) {
        Log.d(TAG, "🌍 DEBUG: Début récupération langue courante");

        try {
            SharedPreferences prefs = context.getSharedPreferences("prayer_times_settings", Context.MODE_PRIVATE);

            // Essayer plusieurs clés possibles
            String[] possibleKeys = { "currentLanguage", "current_language", "language" };

            for (String key : possibleKeys) {
                String language = prefs.getString(key, null);
                if (language != null && !language.isEmpty()) {
                    Log.d(TAG, "✅ Langue trouvée avec clé '" + key + "': " + language);
                    return language;
                }
                Log.d(TAG, "❌ Pas de langue pour clé: " + key);
            }

            // Debug: afficher toutes les SharedPreferences
            Log.d(TAG, "🔍 TOUTES les SharedPreferences:");
            Map<String, ?> allPrefs = prefs.getAll();
            for (Map.Entry<String, ?> entry : allPrefs.entrySet()) {
                Log.d(TAG, "  - " + entry.getKey() + " = " + entry.getValue());
            }

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur récupération langue: " + e.getMessage());
        }

        Log.d(TAG, "⚠️ Aucune langue trouvée, utilisation fallback: en");
        return "en"; // English comme langue par défaut
    }

    /**
     * Récupère une traduction
     */
    public static String getTranslation(Context context, String key) {
        String language = getCurrentLanguage(context);
        Log.d(TAG, "🌍 Tentative lecture locales_" + language + ".json pour clé: " + key);

        try {
            String fileName = "locales_" + language + ".json";

            InputStream inputStream = context.getAssets().open(fileName);
            InputStreamReader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8);

            StringBuilder jsonBuilder = new StringBuilder();
            char[] buffer = new char[1024];
            int length;
            while ((length = reader.read(buffer)) != -1) {
                jsonBuilder.append(buffer, 0, length);
            }

            JSONObject translations = new JSONObject(jsonBuilder.toString());

            if (translations.has(key)) {
                String translation = translations.getString(key);
                Log.d(TAG, "✅ Traduction trouvée: " + key + " = " + translation);
                return translation;
            } else {
                Log.w(TAG, "⚠️ Clé '" + key + "' non trouvée dans " + fileName);
                return key; // Fallback vers la clé
            }

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur lecture traduction " + language + " pour '" + key + "': " + e.getMessage());
            return key; // Fallback vers la clé
        }
    }

    /**
     * 📅 AMÉLIORÉ: Récupère les horaires de prière avec détection automatique du
     * changement de jour
     * Recalcule automatiquement les horaires si on a passé minuit
     */
    public static Map<String, String> getAllPrayerTimes(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("prayer_times_settings", Context.MODE_PRIVATE);

            // 📅 Vérifier si on a changé de jour
            Calendar now = Calendar.getInstance();
            String currentDateKey = String.format(Locale.getDefault(), "%04d-%02d-%02d",
                    now.get(Calendar.YEAR),
                    now.get(Calendar.MONTH) + 1,
                    now.get(Calendar.DAY_OF_MONTH));

            String lastWidgetDate = prefs.getString("widget_last_date", "");
            boolean isNewDay = !currentDateKey.equals(lastWidgetDate);

            Log.d(TAG, "📅 Date actuelle: " + currentDateKey + ", dernière: " + lastWidgetDate + ", nouveau jour: "
                    + isNewDay);

            // Si c'est un nouveau jour, enregistrer la nouvelle date et recalculer les
            // horaires
            if (isNewDay) {
                Log.d(TAG, "🔄 Nouveau jour détecté - mise à jour de la date du widget et recalcul des horaires");
                prefs.edit().putString("widget_last_date", currentDateKey).apply();

                // 📅 NOUVEAU: Recalculer les horaires pour le nouveau jour
                try {
                    recalculatePrayerTimesForToday(context, prefs);
                } catch (Exception e) {
                    Log.e(TAG, "❌ Erreur recalcul horaires pour nouveau jour: " + e.getMessage());
                }
            }

            // 🆕 AMÉLIORATION: Essayer plusieurs sources de données pour la compatibilité
            Map<String, String> prayerTimes = tryGetPrayerTimesFromMultipleSources(context, prefs);

            if (!prayerTimes.isEmpty()) {
                Log.d(TAG, "📋 Horaires récupérés: " + prayerTimes.size() + " prières");
                return prayerTimes;
            }

            Log.w(TAG, "⚠️ Aucun horaire trouvé dans toutes les sources");
            return new HashMap<>();

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur lecture horaires: " + e.getMessage());
            return new HashMap<>();
        }
    }

    /**
     * 🆕 NOUVEAU: Méthode robuste pour récupérer les horaires depuis plusieurs
     * sources
     * Améliore la compatibilité avec les anciennes versions d'Android
     */
    private static Map<String, String> tryGetPrayerTimesFromMultipleSources(Context context, SharedPreferences prefs) {
        Map<String, String> prayerTimes = new HashMap<>();

        // SOURCE 1: today_prayer_times (source principale)
        try {
            String todayPrayerTimesJson = prefs.getString("today_prayer_times", null);
            Log.d(TAG,
                    "🔍 Source 1 - today_prayer_times: " + (todayPrayerTimesJson != null ? "présentes" : "absentes"));

            if (todayPrayerTimesJson != null && !todayPrayerTimesJson.trim().isEmpty()) {
                JSONObject prayerTimesObj = new JSONObject(todayPrayerTimesJson);

                // Vérifier chaque prière
                String[] prayers = { "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha" };
                for (String prayer : prayers) {
                    if (prayerTimesObj.has(prayer)) {
                        String timeStr = prayerTimesObj.getString(prayer);
                        if (timeStr != null && !timeStr.trim().isEmpty() && isValidTimeFormat(timeStr)) {
                            prayerTimes.put(prayer, timeStr);
                        }
                    }
                }

                if (prayerTimes.size() >= 5) { // Au moins 5 prières (sans Sunrise)
                    Log.d(TAG, "✅ Source 1 réussie - " + prayerTimes.size() + " horaires récupérés");
                    return prayerTimes;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "⚠️ Erreur source 1: " + e.getMessage());
        }

        // SOURCE 2: Essayer depuis adhan_prefs (backup)
        try {
            SharedPreferences adhanPrefs = context.getSharedPreferences("adhan_prefs", Context.MODE_PRIVATE);
            Log.d(TAG, "🔍 Source 2 - adhan_prefs comme backup");

            // Vérifier si on a des coordonnées sauvegardées
            if (adhanPrefs.contains("lat") && adhanPrefs.contains("lon")) {
                double lat = adhanPrefs.getFloat("lat", 0.0f);
                double lon = adhanPrefs.getFloat("lon", 0.0f);

                if (lat != 0.0 && lon != 0.0) {
                    Log.d(TAG, "📍 Coordonnées trouvées: " + lat + ", " + lon);
                    Map<String, String> calculatedTimes = calculatePrayerTimesForCoordinates(lat, lon, adhanPrefs);

                    if (!calculatedTimes.isEmpty()) {
                        Log.d(TAG, "✅ Source 2 réussie - calcul direct avec " + calculatedTimes.size() + " horaires");

                        // Sauvegarder dans la source principale pour la prochaine fois
                        try {
                            JSONObject jsonToSave = new JSONObject();
                            for (Map.Entry<String, String> entry : calculatedTimes.entrySet()) {
                                jsonToSave.put(entry.getKey(), entry.getValue());
                            }
                            prefs.edit().putString("today_prayer_times", jsonToSave.toString()).apply();
                            Log.d(TAG, "💾 Horaires sauvegardés pour la prochaine fois");
                        } catch (Exception e) {
                            Log.w(TAG, "⚠️ Erreur sauvegarde backup: " + e.getMessage());
                        }

                        return calculatedTimes;
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "⚠️ Erreur source 2: " + e.getMessage());
        }

        // SOURCE 3: Essayer depuis prayer_times_settings (location manuelle)
        try {
            Log.d(TAG, "🔍 Source 3 - localisation manuelle");

            if (prefs.contains("manual_latitude") && prefs.contains("manual_longitude")) {
                float lat = prefs.getFloat("manual_latitude", 0.0f);
                float lon = prefs.getFloat("manual_longitude", 0.0f);

                if (lat != 0.0f && lon != 0.0f) {
                    Log.d(TAG, "📍 Coordonnées manuelles trouvées: " + lat + ", " + lon);

                    SharedPreferences adhanPrefs = context.getSharedPreferences("adhan_prefs", Context.MODE_PRIVATE);
                    Map<String, String> calculatedTimes = calculatePrayerTimesForCoordinates(lat, lon, adhanPrefs);

                    if (!calculatedTimes.isEmpty()) {
                        Log.d(TAG, "✅ Source 3 réussie - calcul manuel avec " + calculatedTimes.size() + " horaires");

                        // Sauvegarder dans la source principale
                        try {
                            JSONObject jsonToSave = new JSONObject();
                            for (Map.Entry<String, String> entry : calculatedTimes.entrySet()) {
                                jsonToSave.put(entry.getKey(), entry.getValue());
                            }
                            prefs.edit().putString("today_prayer_times", jsonToSave.toString()).apply();
                        } catch (Exception e) {
                            Log.w(TAG, "⚠️ Erreur sauvegarde source 3: " + e.getMessage());
                        }

                        return calculatedTimes;
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "⚠️ Erreur source 3: " + e.getMessage());
        }

        // SOURCE 4: 🆕 NOUVEAU - Horaires individuels de fallback (backup ultime)
        try {
            Log.d(TAG, "🔍 Source 4 - horaires individuels de fallback");

            String[] prayers = { "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha" };
            Map<String, String> individualTimes = new HashMap<>();

            for (String prayer : prayers) {
                String timeKey = "prayer_" + prayer.toLowerCase() + "_time";
                if (prefs.contains(timeKey)) {
                    String timeStr = prefs.getString(timeKey, null);
                    if (timeStr != null && !timeStr.trim().isEmpty() && isValidTimeFormat(timeStr)) {
                        individualTimes.put(prayer, timeStr);
                        Log.d(TAG, "📋 " + prayer + " trouvé individuellement: " + timeStr);
                    }
                }
            }

            if (individualTimes.size() >= 5) { // Au moins 5 prières (sans Sunrise)
                Log.d(TAG, "✅ Source 4 réussie - " + individualTimes.size() + " horaires individuels récupérés");

                // Reconstituer et sauvegarder dans la source principale
                try {
                    JSONObject jsonToSave = new JSONObject();
                    for (Map.Entry<String, String> entry : individualTimes.entrySet()) {
                        jsonToSave.put(entry.getKey(), entry.getValue());
                    }
                    prefs.edit().putString("today_prayer_times", jsonToSave.toString()).apply();
                    Log.d(TAG, "💾 Horaires individuels reconstitués et sauvegardés");
                } catch (Exception e) {
                    Log.w(TAG, "⚠️ Erreur reconstitution source 4: " + e.getMessage());
                }

                return individualTimes;
            }
        } catch (Exception e) {
            Log.w(TAG, "⚠️ Erreur source 4: " + e.getMessage());
        }

        // SOURCE 5: 🆕 NOUVEAU - Backup avec date (tentative de récupération par date)
        try {
            Log.d(TAG, "🔍 Source 5 - backup avec date");

            Calendar now = Calendar.getInstance();
            String currentDateKey = String.format(Locale.getDefault(), "%04d-%02d-%02d",
                    now.get(Calendar.YEAR),
                    now.get(Calendar.MONTH) + 1,
                    now.get(Calendar.DAY_OF_MONTH));

            String backupKey = "prayer_times_backup_" + currentDateKey;
            String backupJson = prefs.getString(backupKey, null);

            if (backupJson != null && !backupJson.trim().isEmpty()) {
                Log.d(TAG, "📋 Backup trouvé pour " + currentDateKey);

                JSONObject backupObj = new JSONObject(backupJson);
                Map<String, String> backupTimes = new HashMap<>();

                String[] prayers = { "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha" };
                for (String prayer : prayers) {
                    if (backupObj.has(prayer)) {
                        String timeStr = backupObj.getString(prayer);
                        if (timeStr != null && !timeStr.trim().isEmpty() && isValidTimeFormat(timeStr)) {
                            backupTimes.put(prayer, timeStr);
                        }
                    }
                }

                if (backupTimes.size() >= 5) {
                    Log.d(TAG, "✅ Source 5 réussie - " + backupTimes.size() + " horaires de backup récupérés");

                    // Restaurer dans la source principale
                    prefs.edit().putString("today_prayer_times", backupJson).apply();

                    return backupTimes;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "⚠️ Erreur source 5: " + e.getMessage());
        }

        Log.e(TAG, "❌ Aucune source n'a pu fournir d'horaires valides");
        return new HashMap<>(); // Aucune source n'a fonctionné
    }

    /**
     * 🆕 NOUVEAU: Valide le format d'heure (HH:MM)
     */
    private static boolean isValidTimeFormat(String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty()) {
            return false;
        }

        try {
            String[] parts = timeStr.trim().split(":");
            if (parts.length != 2) {
                return false;
            }

            int hours = Integer.parseInt(parts[0]);
            int minutes = Integer.parseInt(parts[1]);

            return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /**
     * 🆕 NOUVEAU: Calcule les horaires de prière pour des coordonnées données
     */
    private static Map<String, String> calculatePrayerTimesForCoordinates(double latitude, double longitude,
            SharedPreferences adhanPrefs) {
        Map<String, String> prayerTimes = new HashMap<>();

        try {
            Log.d(TAG, "🔄 Calcul horaires pour coordonnées: " + latitude + ", " + longitude);

            // Obtenir la méthode de calcul
            String calcMethod = adhanPrefs.getString("calc_method", "MuslimWorldLeague");

            com.batoulapps.adhan.Coordinates coordinates = new com.batoulapps.adhan.Coordinates(latitude, longitude);
            Calendar today = Calendar.getInstance();

            com.batoulapps.adhan.CalculationParameters params;
            switch (calcMethod) {
                case "MuslimWorldLeague":
                    params = com.batoulapps.adhan.CalculationMethod.MUSLIM_WORLD_LEAGUE.getParameters();
                    break;
                case "Kuwait":
                    params = com.batoulapps.adhan.CalculationMethod.KUWAIT.getParameters();
                    break;
                case "Qatar":
                    params = com.batoulapps.adhan.CalculationMethod.QATAR.getParameters();
                    break;
                case "Singapore":
                    params = com.batoulapps.adhan.CalculationMethod.SINGAPORE.getParameters();
                    break;
                case "Tehran":
                    params = com.batoulapps.adhan.CalculationMethod.KARACHI.getParameters(); // Fallback pour Tehran
                    break;
                default:
                    params = com.batoulapps.adhan.CalculationMethod.MUSLIM_WORLD_LEAGUE.getParameters();
            }

            DateComponents todayComponents = DateComponents.from(today.getTime());
            com.batoulapps.adhan.PrayerTimes adhanPrayerTimes = new com.batoulapps.adhan.PrayerTimes(coordinates,
                    todayComponents, params);

            // Formatter les horaires
            SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());

            prayerTimes.put("Fajr", timeFormat.format(adhanPrayerTimes.fajr));
            prayerTimes.put("Sunrise", timeFormat.format(adhanPrayerTimes.sunrise));
            prayerTimes.put("Dhuhr", timeFormat.format(adhanPrayerTimes.dhuhr));
            prayerTimes.put("Asr", timeFormat.format(adhanPrayerTimes.asr));
            prayerTimes.put("Maghrib", timeFormat.format(adhanPrayerTimes.maghrib));
            prayerTimes.put("Isha", timeFormat.format(adhanPrayerTimes.isha));

            Log.d(TAG, "✅ Calcul réussi - " + prayerTimes.size() + " horaires calculés");

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur calcul horaires: " + e.getMessage());
        }

        return prayerTimes;
    }

    /**
     * 🔍 AMÉLIORÉ: Détermine la prochaine prière avec meilleure gestion des
     * changements de jour
     */
    public static String getNextPrayerName(Context context) {
        try {
            Map<String, String> prayerTimes = getAllPrayerTimes(context);
            if (prayerTimes.isEmpty()) {
                Log.w(TAG, "⚠️ Aucun horaire disponible - retour Fajr par défaut");
                return "Fajr";
            }

            Calendar now = Calendar.getInstance();
            int currentHour = now.get(Calendar.HOUR_OF_DAY);
            int currentMinute = now.get(Calendar.MINUTE);
            int currentTimeInMinutes = currentHour * 60 + currentMinute;

            Log.d(TAG, "🔍 Heure actuelle: " + String.format("%02d:%02d", currentHour, currentMinute) + " ("
                    + currentTimeInMinutes + " min)");

            String[] prayerOrder = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };

            for (String prayer : prayerOrder) {
                String timeStr = prayerTimes.get(prayer);
                if (timeStr != null) {
                    try {
                        String[] parts = timeStr.split(":");
                        if (parts.length == 2) {
                            int prayerHour = Integer.parseInt(parts[0]);
                            int prayerMinute = Integer.parseInt(parts[1]);
                            int prayerTimeInMinutes = prayerHour * 60 + prayerMinute;

                            Log.d(TAG, "🕐 " + prayer + ": " + timeStr + " (" + prayerTimeInMinutes + " min)");

                            if (prayerTimeInMinutes > currentTimeInMinutes) {
                                Log.d(TAG, "✅ Prochaine prière: " + prayer + " dans "
                                        + (prayerTimeInMinutes - currentTimeInMinutes) + " minutes");
                                return prayer;
                            }
                        }
                    } catch (NumberFormatException e) {
                        Log.w(TAG, "⚠️ Format d'heure invalide pour " + prayer + ": " + timeStr);
                    }
                }
            }

            // Si toutes les prières sont passées, la prochaine est Fajr demain
            Log.d(TAG, "🌙 Toutes les prières d'aujourd'hui sont passées - prochaine: Fajr demain");
            return "Fajr";

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur calcul prochaine prière: " + e.getMessage());
            return "Fajr";
        }
    }

    /**
     * Récupère une dua aléatoire depuis les assets
     */
    public static String getDailyDhikr(Context context) {
        // Vérifier si on doit forcer une sélection aléatoire
        SharedPreferences prefs = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE);
        boolean forceRandom = prefs.getBoolean("force_random_dua", false);

        if (forceRandom) {
            // Réinitialiser le flag après utilisation
            prefs.edit().putBoolean("force_random_dua", false).apply();
            Log.d(TAG, "🎲 Sélection aléatoire forcée pour nouvelle dua");
        }

        return getDailyDhikr(context, forceRandom);
    }

    /**
     * Récupère une dua depuis les assets
     * 
     * @param forceRandom true pour forcer une nouvelle sélection aléatoire
     */
    public static String getDailyDhikr(Context context, boolean forceRandom) {
        String language = getCurrentLanguage(context);
        Log.d(TAG, "🤲 Récupération dua pour langue: " + language + " (forceRandom: " + forceRandom + ")");

        try {
            // Lire le fichier dhikr (nom du fichier garde dhikr pour compatibilité)
            String fileName = "dhikr." + language + ".json";

            InputStream inputStream = context.getAssets().open(fileName);
            InputStreamReader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8);

            StringBuilder jsonBuilder = new StringBuilder();
            char[] buffer = new char[1024];
            int length;
            while ((length = reader.read(buffer)) != -1) {
                jsonBuilder.append(buffer, 0, length);
            }

            String jsonContent = jsonBuilder.toString();
            Log.d(TAG, "📚 Fichier dua lu: " + fileName + " (" + jsonContent.length() + " chars)");

            JSONArray duaArray = new JSONArray(jsonContent);

            if (duaArray.length() == 0) {
                return "";
            }

            int seed;
            if (forceRandom) {
                // Vraiment aléatoire pour le bouton actualiser
                seed = (int) (Math.random() * duaArray.length());
                Log.d(TAG, "🎲 Index dua ALÉATOIRE: " + seed + " (sur " + duaArray.length() + " disponibles)");
            } else {
                // Basé sur le jour pour cohérence quotidienne
                Calendar today = Calendar.getInstance();
                int dayOfYear = today.get(Calendar.DAY_OF_YEAR);
                int year = today.get(Calendar.YEAR);
                seed = (dayOfYear + year) % duaArray.length();
                Log.d(TAG, "🎲 Index dua quotidien: " + seed + " (sur " + duaArray.length() + " disponibles)");
            }

            JSONObject dua = duaArray.getJSONObject(seed);
            String title = dua.getString("title");

            Log.d(TAG, "🤲 Dua sélectionnée: " + title);

            String arabic = dua.getString("arabic");
            String translation = dua.getString("translation");

            // Formatter pour le widget
            StringBuilder result = new StringBuilder();

            // Le contenu complet sans troncature
            result.append(arabic).append("\n\n");
            result.append(translation);

            String formattedDua = result.toString();
            Log.d(TAG, "✅ Dua formatée prête (" + formattedDua.length() + " chars)");
            return formattedDua;

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur lecture dua " + language + ": " + e.getMessage());

            // Fallback vers l'anglais
            if (!language.equals("en")) {
                try {
                    return getDailyDhikr_fallback(context, "en");
                } catch (Exception fallbackError) {
                    Log.e(TAG, "❌ Erreur fallback dua: " + fallbackError.getMessage());
                }
            }

            return "";
        }
    }

    private static String getDailyDhikr_fallback(Context context, String fallbackLang) {
        try {
            String fileName = "dhikr." + fallbackLang + ".json";

            InputStream inputStream = context.getAssets().open(fileName);
            InputStreamReader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8);

            StringBuilder jsonBuilder = new StringBuilder();
            char[] buffer = new char[1024];
            int length;
            while ((length = reader.read(buffer)) != -1) {
                jsonBuilder.append(buffer, 0, length);
            }

            JSONArray dhikrArray = new JSONArray(jsonBuilder.toString());

            if (dhikrArray.length() > 0) {
                Calendar today = Calendar.getInstance();
                int dayOfYear = today.get(Calendar.DAY_OF_YEAR);
                int year = today.get(Calendar.YEAR);
                int seed = (dayOfYear + year) % dhikrArray.length();

                JSONObject dhikr = dhikrArray.getJSONObject(seed);
                String arabic = dhikr.getString("arabic");
                String translation = dhikr.getString("translation");

                return arabic + "\n\n" + translation;
            }

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur fallback dhikr: " + e.getMessage());
        }

        return "";
    }

    /**
     * ⚡ Recalcule les horaires de prière pour aujourd'hui quand le widget détecte
     * un nouveau jour
     */
    private static void recalculatePrayerTimesForToday(Context context, SharedPreferences prefs) {
        try {
            Log.d(TAG, "🔄 Début recalcul des horaires pour le widget");

            // Lire les paramètres de localisation et de calcul
            String locationMode = prefs.getString("location_mode", null);

            // Lire la méthode de calcul depuis adhan_prefs
            SharedPreferences adhanPrefs = context.getSharedPreferences("adhan_prefs", Context.MODE_PRIVATE);
            String calcMethod = adhanPrefs.getString("calc_method", "MuslimWorldLeague");

            if (locationMode == null) {
                Log.w(TAG, "⚠️ Mode de localisation non défini - abandon du recalcul");
                return;
            }

            double latitude, longitude;

            if ("manual".equals(locationMode)) {
                latitude = prefs.getFloat("manual_latitude", 0.0f);
                longitude = prefs.getFloat("manual_longitude", 0.0f);
                Log.d(TAG, "📍 Utilisation localisation manuelle: " + latitude + ", " + longitude);
            } else if ("auto".equals(locationMode)) {
                latitude = prefs.getFloat("auto_latitude", 0.0f);
                longitude = prefs.getFloat("auto_longitude", 0.0f);
                Log.d(TAG, "📍 Utilisation localisation auto: " + latitude + ", " + longitude);
            } else {
                Log.w(TAG, "⚠️ Mode de localisation invalide: " + locationMode);
                return;
            }

            // Calculer les horaires pour aujourd'hui
            com.batoulapps.adhan.Coordinates coordinates = new com.batoulapps.adhan.Coordinates(latitude, longitude);

            Calendar today = Calendar.getInstance();

            com.batoulapps.adhan.CalculationParameters params;
            switch (calcMethod) {
                case "MuslimWorldLeague":
                    params = com.batoulapps.adhan.CalculationMethod.MUSLIM_WORLD_LEAGUE.getParameters();
                    break;
                case "Kuwait":
                    params = com.batoulapps.adhan.CalculationMethod.KUWAIT.getParameters();
                    break;
                case "Qatar":
                    params = com.batoulapps.adhan.CalculationMethod.QATAR.getParameters();
                    break;
                case "Singapore":
                    params = com.batoulapps.adhan.CalculationMethod.SINGAPORE.getParameters();
                    break;
                case "Tehran":
                    params = com.batoulapps.adhan.CalculationMethod.KARACHI.getParameters(); // Fallback pour Tehran
                    break;
                default:
                    params = com.batoulapps.adhan.CalculationMethod.MUSLIM_WORLD_LEAGUE.getParameters();
            }

            DateComponents todayComponents = DateComponents.from(today.getTime());
            com.batoulapps.adhan.PrayerTimes prayerTimes = new com.batoulapps.adhan.PrayerTimes(coordinates,
                    todayComponents, params);

            // Formatter les horaires
            java.text.SimpleDateFormat timeFormat = new java.text.SimpleDateFormat("HH:mm",
                    java.util.Locale.getDefault());

            JSONObject newPrayerTimes = new JSONObject();
            newPrayerTimes.put("Fajr", timeFormat.format(prayerTimes.fajr));
            newPrayerTimes.put("Sunrise", timeFormat.format(prayerTimes.sunrise));
            newPrayerTimes.put("Dhuhr", timeFormat.format(prayerTimes.dhuhr));
            newPrayerTimes.put("Asr", timeFormat.format(prayerTimes.asr));
            newPrayerTimes.put("Maghrib", timeFormat.format(prayerTimes.maghrib));
            newPrayerTimes.put("Isha", timeFormat.format(prayerTimes.isha));

            // Sauvegarder les nouveaux horaires
            prefs.edit().putString("today_prayer_times", newPrayerTimes.toString()).apply();

            Log.d(TAG, "✅ Horaires recalculés et sauvegardés pour le nouveau jour:");
            Log.d(TAG, "   Fajr: " + timeFormat.format(prayerTimes.fajr));
            Log.d(TAG, "   Sunrise: " + timeFormat.format(prayerTimes.sunrise));
            Log.d(TAG, "   Dhuhr: " + timeFormat.format(prayerTimes.dhuhr));
            Log.d(TAG, "   Asr: " + timeFormat.format(prayerTimes.asr));
            Log.d(TAG, "   Maghrib: " + timeFormat.format(prayerTimes.maghrib));
            Log.d(TAG, "   Isha: " + timeFormat.format(prayerTimes.isha));

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur lors du recalcul des horaires: " + e.getMessage());
        }
    }
}