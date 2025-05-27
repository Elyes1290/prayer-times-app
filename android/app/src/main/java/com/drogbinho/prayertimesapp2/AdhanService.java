package com.drogbinho.prayertimesapp2;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import android.util.Log;

public class AdhanService extends Service {
    private static final String CHANNEL_ID = "adhan_service";
    private static final int NOTIFICATION_ID = 1;
    public static final String ACTION_STOP = "STOP_ADHAN";

    private MediaPlayer mediaPlayer;

    @Override
    public void onCreate() {
        super.onCreate();

        // Crée la notification channel
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Adhan Service",
                    NotificationManager.IMPORTANCE_LOW);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null)
                manager.createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Vérifie si on demande d’arrêter
        Log.d("AdhanService", "onStartCommand appelé ! intent=" + intent + ", action="
                + (intent != null ? intent.getAction() : "null"));
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            Log.d("AdhanService",
                    "ACTION_STOP reçu (origine: " + (intent.getPackage() != null ? intent.getPackage() : "null") + ")");
            if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                Log.d("AdhanService", "mediaPlayer.stop() appelé depuis JS !");
                mediaPlayer.stop();
                mediaPlayer.release();
                mediaPlayer = null;
            }
            stopSelf();
            return START_NOT_STICKY;
        }

        String adhanSound = intent != null ? intent.getStringExtra("ADHAN_SOUND") : null;
        Log.d("AdhanService", "onStartCommand appelé avec son : " + adhanSound);
        if (adhanSound == null)
            adhanSound = "adhamalsharqawe";

        String prayerLabel = intent != null ? intent.getStringExtra("PRAYER_LABEL") : null;
        Log.d("AdhanService", "prayerLabel reçu = " + prayerLabel);

        // ---------- AJOUT ACTION ARRETER -----------
        Intent stopIntent = new Intent(this, AdhanService.class);
        stopIntent.setAction(ACTION_STOP);
        android.app.PendingIntent stopPendingIntent = android.app.PendingIntent.getService(
                this,
                0,
                stopIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE // important
                                                                                                         // pour Android
                                                                                                         // 12+
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Adhan")
                .setContentText("Il est temps de prier le " + getPrayerDisplayName(prayerLabel))
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .addAction(
                        android.R.drawable.ic_media_pause, // Icône bouton pause
                        "Arrêter", // Texte du bouton
                        stopPendingIntent)
                .setOngoing(true) // notification persistante tant que le son joue
                .build();

        if (android.os.Build.VERSION.SDK_INT >= 34) { // Android 14+
            startForeground(NOTIFICATION_ID, notification, 2);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        int resId = getResources().getIdentifier(adhanSound, "raw", getPackageName());
        mediaPlayer = MediaPlayer.create(this, resId);
        if (mediaPlayer != null) {
            mediaPlayer.setOnCompletionListener(mp -> stopSelf());
            mediaPlayer.start();
        } else {
            stopSelf();
        }

        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (mediaPlayer != null) {
            mediaPlayer.release();
            mediaPlayer = null;
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private String getPrayerDisplayName(String key) {
        if (key == null)
            return "";
        switch (key) {
            case "Fajr":
                return "Fajr";
            case "Dhuhr":
                return "Dhuhr";
            case "Asr":
                return "Asr";
            case "Maghrib":
                return "Maghrib";
            case "Isha":
                return "Isha";
            default:
                return key;
        }
    }
}
