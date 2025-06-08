package com.drogbinho.prayertimesapp2;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.content.SharedPreferences;

public class AdhanReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            String adhanSound = intent.getStringExtra("ADHAN_SOUND");
            String prayerLabel = intent.getStringExtra("PRAYER_LABEL");
            long now = System.currentTimeMillis();

            Log.d("AdhanReceiver", "==> ALARME RECUE pour " + prayerLabel + " | Son: " + adhanSound
                    + " | Heure réception: " + new java.util.Date(now).toString());

            SharedPreferences prefs = context.getSharedPreferences("adhan_prefs", Context.MODE_PRIVATE);
            String flagKey = "adhan_done_" + prayerLabel;
            long lastDone = prefs.getLong(flagKey, 0);

            if (isSameDay(lastDone, now)) {
                Log.d("AdhanReceiver", "⚠️ Déjà joué aujourd'hui pour " + prayerLabel + ", on ignore !");
                return;
            }

            Log.d("AdhanReceiver", "Démarrage du service d'adhan pour: " + prayerLabel);
            prefs.edit().putLong(flagKey, now).apply();

            Intent serviceIntent = new Intent(context, AdhanService.class);
            serviceIntent.putExtras(intent);

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e("AdhanReceiver", "Erreur dans onReceive : " + e.getMessage(), e);
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
