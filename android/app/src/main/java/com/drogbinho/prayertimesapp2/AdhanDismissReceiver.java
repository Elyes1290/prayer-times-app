package com.drogbinho.prayertimesapp2;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AdhanDismissReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            String action = intent.getAction();

            if ("DISMISS_COMPLETED_ADHAN".equals(action)) {
                // Fermer spécifiquement la notification d'Adhan terminé
                int notificationId = intent.getIntExtra("NOTIFICATION_ID", -1);
                String prayerLabel = intent.getStringExtra("PRAYER_LABEL");

                if (notificationId != -1) {
                    NotificationManager notificationManager = (NotificationManager) context
                            .getSystemService(Context.NOTIFICATION_SERVICE);
                    if (notificationManager != null) {
                        notificationManager.cancel(notificationId);
                        Log.d("AdhanDismissReceiver", "Notification d'Adhan terminé fermée pour " + prayerLabel
                                + " (ID: " + notificationId + ")");
                    }
                } else {
                    Log.w("AdhanDismissReceiver", "ID de notification invalide pour fermer Adhan terminé");
                }
            } else {
                // Comportement original - notification balayée pendant la lecture d'Adhan
                Log.d("AdhanDismissReceiver", "Notification balayée par l'utilisateur (deleteIntent)!");
                // Arrête le service Adhan pour couper le son
                Intent stopIntent = new Intent(context, AdhanService.class);
                stopIntent.setAction(AdhanService.ACTION_STOP);
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    context.startForegroundService(stopIntent);
                } else {
                    context.startService(stopIntent);
                }
            }
        } catch (Exception e) {
            Log.e("AdhanDismissReceiver", "Erreur dans onReceive : " + e.getMessage(), e);
        }
    }
}
