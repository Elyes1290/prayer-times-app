package com.drogbinho.prayertimesapp2;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AdhanReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String adhanSound = intent.getStringExtra("ADHAN_SOUND");
        String prayerLabel = intent.getStringExtra("PRAYER_LABEL");
        Log.d("AdhanReceiver", "Réception alarme pour: " + prayerLabel + ", Son: " + adhanSound);

        // Prépare l'intent pour le service
        Intent serviceIntent = new Intent(context, AdhanService.class);
        serviceIntent.putExtras(intent); // Transfert TOUTES les extras

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
