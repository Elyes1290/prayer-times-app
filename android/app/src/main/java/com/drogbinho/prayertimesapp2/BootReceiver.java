package com.drogbinho.prayertimesapp2;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d("BootReceiver", "BOOT_COMPLETED reçu, programmation différée des alarmes adhan...");

        // Android 15+ : Ne pas lancer directement un service de premier plan depuis
        // BOOT_COMPLETED
        // Au lieu de cela, programmer une alarme différée qui reprogrammera les
        // notifications
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            // Programmer la reprogrammation dans 30 secondes pour éviter les restrictions
            // Android 15+
            long delayedTriggerTime = System.currentTimeMillis() + 30000; // 30 secondes de délai

            Intent serviceIntent = new Intent(context, AdhanService.class);
            serviceIntent.setAction("REPROGRAM_ADHAN_ALARMS_DELAYED");

            PendingIntent pendingIntent = PendingIntent.getService(
                    context,
                    1001, // requestCode unique pour BOOT
                    serviceIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            // Utiliser setExactAndAllowWhileIdle pour garantir l'exécution même en Doze
            // mode
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, delayedTriggerTime, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, delayedTriggerTime, pendingIntent);
            }

            Log.d("BootReceiver", "Alarme de reprogrammation différée programmée pour dans 30 secondes");

            // 🔄 REDÉMARRER AUSSI LA MAINTENANCE QUOTIDIENNE après le boot
            // (dans 45 secondes pour que la reprogrammation principale soit terminée)
            long maintenanceTriggerTime = System.currentTimeMillis() + 45000; // 45 secondes

            Intent maintenanceIntent = new Intent(context, MaintenanceReceiver.class);
            maintenanceIntent.setAction("com.drogbinho.prayertimesapp2.ACTION_DAILY_MAINTENANCE");

            PendingIntent maintenancePendingIntent = PendingIntent.getBroadcast(
                    context,
                    1002, // requestCode unique pour maintenance boot
                    maintenanceIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, maintenanceTriggerTime,
                        maintenancePendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, maintenanceTriggerTime, maintenancePendingIntent);
            }

            Log.d("BootReceiver", "Maintenance quotidienne redémarrée après boot (dans 45 secondes)");
        } else {
            Log.e("BootReceiver", "AlarmManager non disponible pour la reprogrammation différée");
        }
    }
}
