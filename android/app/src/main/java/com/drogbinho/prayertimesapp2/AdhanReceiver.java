package com.drogbinho.prayertimesapp2;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.content.SharedPreferences;
import static com.drogbinho.prayertimesapp2.ConditionalLogger.*;

public class AdhanReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            String adhanSound = intent.getStringExtra("ADHAN_SOUND");
            String prayerLabel = intent.getStringExtra("PRAYER_LABEL");
            long now = System.currentTimeMillis();

            // 🔥 LOG CRITIQUE : TOUJOURS visible pour diagnostiquer
            errorLog("AdhanReceiver", "🔥 ALARME ADHAN REÇUE - " + prayerLabel + 
                " | Son: " + adhanSound + 
                " | Timestamp: " + now +
                " | Heure: " + new java.util.Date(now).toString());
                
            debugLog("AdhanReceiver", "==> ALARME RECUE pour " + prayerLabel + " | Son: " + adhanSound
                    + " | Heure réception: " + new java.util.Date(now).toString());

            SharedPreferences prefs = context.getSharedPreferences("adhan_prefs", Context.MODE_PRIVATE);
            String flagKey = "adhan_done_" + prayerLabel;
            long lastDone = prefs.getLong(flagKey, 0);

            if (isSameDay(lastDone, now)) {
                // 🚨 DEBUG CRITIQUE : Log détaillé pour identifier le bug
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault());
                String lastDoneStr = sdf.format(new java.util.Date(lastDone));
                String nowStr = sdf.format(new java.util.Date(now));
                
                errorLog("AdhanReceiver", "🚨 ADHAN BLOQUÉ - " + prayerLabel + 
                    " | Dernier: " + lastDoneStr + 
                    " | Maintenant: " + nowStr + 
                    " | Flag: " + flagKey + 
                    " | Valeur: " + lastDone);
                
                // 🔧 TEMPORAIRE : Forcer execution si plus de 2h depuis le dernier
                long hoursSinceLastDone = (now - lastDone) / (1000 * 60 * 60);
                if (hoursSinceLastDone >= 2) {
                    errorLog("AdhanReceiver", "🔧 FORCE EXECUTION - Plus de 2h depuis dernier adhan");
                } else {
                    debugLog("AdhanReceiver", "⚠️ Déjà joué aujourd'hui pour " + prayerLabel + ", on ignore !");
                    return;
                }
            }

            debugLog("AdhanReceiver", "Démarrage du service d'adhan pour: " + prayerLabel);
            prefs.edit().putLong(flagKey, now).apply();

            Intent serviceIntent = new Intent(context, AdhanService.class);
            serviceIntent.putExtras(intent);

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            // 🔄 FORCER LA MISE À JOUR DU WIDGET après chaque adhan (pour Samsung)
            try {
                // 🌙 CORRECTION : Si c'est Isha, vider le cache pour afficher les horaires de demain
                if ("Isha".equals(prayerLabel)) {
                    debugLog("AdhanReceiver", "🌙 Isha passée - vidage du cache pour afficher horaires de demain");
                    SharedPreferences widgetPrefs = context.getSharedPreferences("prayer_times_settings", Context.MODE_PRIVATE);
                    widgetPrefs.edit()
                        .remove("today_prayer_times")
                        .remove("widget_last_date")
                        .remove("widget_last_calc_method")
                        .apply();
                }
                
                PrayerTimesWidget.forceUpdateWidgets(context);
                debugLog("AdhanReceiver", "✅ Widget forcé à se mettre à jour après Adhan " + prayerLabel);
            } catch (Exception e) {
                warnLog("AdhanReceiver", "⚠️ Erreur mise à jour widget: " + e.getMessage());
            }
        } catch (Exception e) {
            errorLog("AdhanReceiver", "Erreur dans onReceive : " + e.getMessage(), e);
        }
    }

    private boolean isSameDay(long t1, long t2) {
        java.util.Calendar cal1 = java.util.Calendar.getInstance();
        java.util.Calendar cal2 = java.util.Calendar.getInstance();
        cal1.setTimeInMillis(t1);
        cal2.setTimeInMillis(t2);
        return cal1.get(java.util.Calendar.YEAR) == cal2.get(java.util.Calendar.YEAR) &&
                cal1.get(java.util.Calendar.DAY_OF_YEAR) == cal2.get(java.util.Calendar.DAY_OF_YEAR);
    }
}
