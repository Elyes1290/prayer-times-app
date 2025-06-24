package com.drogbinho.prayertimesapp2;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import static com.drogbinho.prayertimesapp2.ConditionalLogger.*;

public class AdhanDismissReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            String action = intent.getAction();
            String prayerLabel = intent.getStringExtra("PRAYER_LABEL");

            if ("com.drogbinho.prayertimesapp2.ACTION_ADHAN_COMPLETED".equals(action)) {
                debugLog("AdhanDismissReceiver", "Notification d'Adhan terminé fermée pour " + prayerLabel
                        + " (action=" + action + ")");
            } else if ("com.drogbinho.prayertimesapp2.ACTION_ADHAN_DISMISSED".equals(action)) {
                // L'utilisateur a balayé la notification ou appuyé sur "Fermer"
                debugLog("AdhanDismissReceiver", "Notification balayée par l'utilisateur (deleteIntent)!");
                // Arrête le service Adhan pour couper le son
                Intent stopIntent = new Intent(context, AdhanService.class);
                stopIntent.setAction(AdhanService.ACTION_STOP);
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    context.startForegroundService(stopIntent);
                } else {
                    context.startService(stopIntent);
                }
            } else {
                // Comportement original - notification balayée pendant la lecture d'Adhan
                debugLog("AdhanDismissReceiver", "Notification balayée par l'utilisateur (deleteIntent)!");
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
            errorLog("AdhanDismissReceiver", "Erreur dans onReceive : " + e.getMessage(), e);
        }
    }
}
