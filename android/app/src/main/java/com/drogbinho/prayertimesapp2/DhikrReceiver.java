package com.drogbinho.prayertimesapp2;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import static com.drogbinho.prayertimesapp2.ConditionalLogger.*;

public class DhikrReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
                try {
                        notificationDebugLog("DhikrReceiver", "🔔 Dhikr reçu!");

                        // Récupère le type de dhikr et la prière
                        String type = intent.getStringExtra("TYPE");
                        String prayerLabel = intent.getStringExtra("PRAYER_LABEL");

                        if (type == null) {
                                notificationDebugLog("DhikrReceiver", "❌ Type manquant");
                                return;
                        }

                        // Protection anti-double: Vérifier si un dhikr similaire a été traité récemment
                        long currentTime = System.currentTimeMillis();
                        SharedPreferences prefs = context.getSharedPreferences("prayer_times_settings",
                                        Context.MODE_PRIVATE);

                        String lastDhikrKey = "last_dhikr_" + type + "_" + prayerLabel;
                        long lastDhikrTime = prefs.getLong(lastDhikrKey, 0);

                        // Si un dhikr similaire a été traité dans les 2 dernières secondes, ignorer
                        if (currentTime - lastDhikrTime < 2000) {
                                notificationDebugLog("DhikrReceiver", "🚫 Dhikr en double détecté pour " + type + " (" + prayerLabel
                                                + "), ignoré");
                                return;
                        }

                        // Enregistrer l'heure de ce dhikr
                        prefs.edit().putLong(lastDhikrKey, currentTime).apply();

                        // Vérifie si les notifications sont activées
                        boolean notificationsEnabled = prefs.getBoolean("notifications_enabled", false);

                        if (!notificationsEnabled) {
                                notificationDebugLog("DhikrReceiver", "❌ Notifications désactivées");
                                return;
                        }

                        // Vérifie si ce type spécifique de dhikr est activé
                        boolean isEnabled = false;
                        switch (type) {
                                case "afterSalah":
                                        isEnabled = prefs.getBoolean("enabled_after_salah", false);
                                        break;
                                case "dhikrMorning":
                                        isEnabled = prefs.getBoolean("enabled_morning_dhikr", false);
                                        break;
                                case "eveningDhikr":
                                        isEnabled = prefs.getBoolean("enabled_evening_dhikr", false);
                                        break;
                                case "selectedDua":
                                        isEnabled = prefs.getBoolean("enabled_selected_dua", false);
                                        break;
                        }

                        if (!isEnabled) {
                                notificationDebugLog("DhikrReceiver", "❌ " + type + " désactivé");
                                return;
                        }

                        notificationDebugLog("DhikrReceiver",
                                        "✅ Dhikr validé pour " + type + " (" + prayerLabel + "), lancement service...");
                        Intent serviceIntent = new Intent(context, DhikrService.class);
                        serviceIntent.putExtras(intent);

                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                                context.startForegroundService(serviceIntent);
                        } else {
                                context.startService(serviceIntent);
                        }
                } catch (Exception e) {
                        errorLog("DhikrReceiver", "❌ Erreur: " + e.getMessage());
                }
        }
}
