package com.drogbinho.prayertimesapp2;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AdhanDismissReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            Log.d("AdhanDismissReceiver", "Notification balayée par l'utilisateur (deleteIntent)!");
            // Arrête le service Adhan pour couper le son
            Intent stopIntent = new Intent(context, AdhanService.class);
            stopIntent.setAction(AdhanService.ACTION_STOP);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(stopIntent);
            } else {
                context.startService(stopIntent);
            }
        } catch (Exception e) {
            Log.e("AdhanDismissReceiver", "Erreur dans onReceive : " + e.getMessage(), e);
        }
    }
}
