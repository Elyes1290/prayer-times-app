package com.drogbinho.prayertimesapp2;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.os.Build;
import java.util.Calendar;

import static com.drogbinho.prayertimesapp2.ConditionalLogger.*;

public class MaintenanceReceiver extends BroadcastReceiver {
    private static final String TAG = "MaintenanceReceiver";
    public static final String ACTION_DAILY_MAINTENANCE = "com.drogbinho.prayertimesapp2.ACTION_DAILY_MAINTENANCE";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        if (ACTION_DAILY_MAINTENANCE.equals(action)) {
            debugLog(TAG, "🔄 Maintenance quotidienne déclenchée - Reprogrammation pour demain");

            // Démarrer le service AdhanService avec l'action de reprogrammation
            Intent serviceIntent = new Intent(context, AdhanService.class);
            serviceIntent.setAction(AdhanService.ACTION_REPROGRAM_ADHAN_ALARMS_DELAYED);

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    // Pour Android 8+ on évite startForegroundService pour la maintenance
                    // On utilise une approche plus légère
                    context.startService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }

                debugLog(TAG, "✅ Service de reprogrammation démarré avec succès");
            } catch (Exception e) {
                errorLog(TAG, "❌ Erreur lors du démarrage du service de reprogrammation: " + e.getMessage());
            }

            // Programmer la prochaine maintenance pour demain
            scheduleDailyMaintenance(context);
        }
    }

    /**
     * Programme la prochaine alarme de maintenance quotidienne à 00:05 (5 minutes
     * après minuit)
     * pour éviter les conflits avec d'autres processus système à minuit pile
     */
    public static void scheduleDailyMaintenance(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            errorLog(TAG, "❌ AlarmManager non disponible pour la maintenance quotidienne");
            return;
        }

        // Calculer le prochain 00:05
        Calendar calendar = Calendar.getInstance();
        calendar.add(Calendar.DAY_OF_MONTH, 1); // Demain
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 5);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);

        Intent intent = new Intent(context, MaintenanceReceiver.class);
        intent.setAction(ACTION_DAILY_MAINTENANCE);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                9876, // ID unique pour la maintenance quotidienne
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        try {
            // Utiliser setAlarmClock pour garantir l'exécution même en mode économie
            // d'énergie
            alarmManager.setAlarmClock(
                    new AlarmManager.AlarmClockInfo(calendar.getTimeInMillis(), null),
                    pendingIntent);

            debugLog(TAG, "📅 Prochaine maintenance programmée pour demain à 00:05 (" + calendar.getTime() + ")");
        } catch (Exception e) {
            errorLog(TAG, "❌ Erreur lors de la programmation de la maintenance: " + e.getMessage());
        }
    }

    /**
     * Annule la maintenance quotidienne (utile si l'utilisateur désactive
     * complètement les notifications)
     */
    public static void cancelDailyMaintenance(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null)
            return;

        Intent intent = new Intent(context, MaintenanceReceiver.class);
        intent.setAction(ACTION_DAILY_MAINTENANCE);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                9876,
                intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);

        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
            debugLog(TAG, "🚫 Maintenance quotidienne annulée");
        }
    }
}
