package com.drogbinho.prayertimesapp2;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import static com.drogbinho.prayertimesapp2.ConditionalLogger.*;

public class PrayerReminderReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
                try {
                        debugLog("PrayerReminderReceiver", "Rappel reçu, vérification des paramètres...");

                        // Protection anti-double: Vérifier si un rappel similaire a été traité
                        // récemment
                        String prayerLabel = intent.getStringExtra("PRAYER_LABEL");
                        long currentTime = System.currentTimeMillis();
                        SharedPreferences prefs = context.getSharedPreferences("prayer_times_settings",
                                        Context.MODE_PRIVATE);

                        String lastReminderKey = "last_reminder_" + prayerLabel;
                        long lastReminderTime = prefs.getLong(lastReminderKey, 0);

                        // Si un rappel pour la même prière a été traité dans les 2 dernières secondes,
                        // ignorer
                        if (currentTime - lastReminderTime < 2000) {
                                debugLog("PrayerReminderReceiver",
                                                "🚫 Rappel en double détecté pour " + prayerLabel + ", ignoré");
                                return;
                        }

                        // Enregistrer l'heure de ce rappel
                        prefs.edit().putLong(lastReminderKey, currentTime).apply();

                        // Vérifie si les notifications et les rappels sont activés
                        boolean notificationsEnabled = prefs.getBoolean("notifications_enabled", false);
                        boolean remindersEnabled = prefs.getBoolean("reminders_enabled", false);

                        // Si les notifications ou les rappels sont désactivés, on ne fait rien
                        if (!notificationsEnabled || !remindersEnabled) {
                                debugLog("PrayerReminderReceiver",
                                                "Notifications ou rappels désactivés, arrêt du traitement");
                                return;
                        }

                        debugLog("PrayerReminderReceiver",
                                        "✅ Rappel validé pour " + prayerLabel + ", démarrage du service...");

                        // Crée un nouvel intent avec tous les extras
                        Intent serviceIntent = new Intent(context, PrayerReminderService.class);
                        if (intent.getExtras() != null) {
                                serviceIntent.putExtras(intent.getExtras());
                        }

                        // Démarre le service immédiatement
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                                context.startForegroundService(serviceIntent);
                        } else {
                                context.startService(serviceIntent);
                        }
                } catch (Exception e) {
                        errorLog("PrayerReminderReceiver", "Erreur lors du démarrage du service: " + e.getMessage());
                }
        }
}
