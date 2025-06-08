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
        } else {
            Log.e("BootReceiver", "AlarmManager non disponible pour la reprogrammation différée");
        }
    }
}
