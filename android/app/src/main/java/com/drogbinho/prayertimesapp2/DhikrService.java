package com.drogbinho.prayertimesapp2;

import android.app.*;
import android.content.*;
import android.graphics.*;
import android.os.*;
import android.util.Log;
import android.content.pm.ServiceInfo;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.util.Calendar;

import static com.drogbinho.prayertimesapp2.ConditionalLogger.*;

public class DhikrService extends Service {
    private static final String CHANNEL_ID = "dhikr_service";
    private static final int NOTIFICATION_ID = 3;
    public static final String ACTION_STOP = "STOP_DHIKR";

    @Override
    public void onCreate() {
        super.onCreate();
        notificationDebugLog("DhikrService", "🚀 DhikrService onCreate() DÉBUT");
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Dhikr Service",
                        NotificationManager.IMPORTANCE_HIGH);
                channel.setDescription("Notifications pour Dhikr et Doua");
                channel.enableLights(true);
                channel.setLightColor(Color.YELLOW);
                channel.enableVibration(true);
                channel.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, null);
                NotificationManager manager = getSystemService(NotificationManager.class);
                if (manager != null)
                    manager.createNotificationChannel(channel);
                notificationDebugLog("DhikrService", "✅ NotificationChannel créé/vérifié.");
            }
        } catch (Exception e) {
            notificationDebugLog("DhikrService", "❌ ERREUR dans onCreate(): " + e.getMessage(), e);
        }
        notificationDebugLog("DhikrService", "🏁 DhikrService onCreate() FIN");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        notificationDebugLog("DhikrService",
                "🚀 SERVICE DÉMARRÉ! Intent: " + (intent != null ? intent.toString() : "null")
                        + " | flags: " + flags + " | startId: " + startId);

        // ⚡ DÉMARRE EN FOREGROUND IMMÉDIATEMENT pour éviter le crash
        NotificationCompat.Builder tempBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Préparation dhikr...")
                .setContentText("Traitement en cours...")
                .setSmallIcon(R.drawable.ic_dhikr_notification)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setSound(null); // Pas de son pour la notification temporaire

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, tempBuilder.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, tempBuilder.build());
        }

        String action = intent != null ? intent.getAction() : null;
        String type = intent != null ? intent.getStringExtra("TYPE") : null;
        String prayerLabel = intent != null ? intent.getStringExtra("PRAYER_LABEL") : null;
        String title = intent != null ? intent.getStringExtra("TITLE") : null;
        String body = intent != null ? intent.getStringExtra("BODY") : null;

        notificationDebugLog("DhikrService",
                "-> onStartCommand: action=" + action + " | type=" + type + " | prayer=" + prayerLabel);

        // Récupère la langue actuelle
        SharedPreferences settings = getSharedPreferences("prayer_times_settings", MODE_PRIVATE);
        String currentLanguage = settings.getString("current_language", "en");
        notificationDebugLog("DhikrService", "📱 Langue actuelle : " + currentLanguage);

        // 🕒 DIAGNOSTIC TEMPOREL PRÉCIS
        long now = System.currentTimeMillis();
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("HH:mm:ss.SSS", java.util.Locale.getDefault());
        notificationDebugLog("DhikrService", "🕒 Heure exacte déclenchement: " + sdf.format(new java.util.Date(now)));

        // ✅ PATTERN IDENTIQUE à PrayerReminderService : vérification simple
        // anti-doublon
        // Vérifie si déjà notifié récemment (dans la dernière heure) pour éviter les
        // doublons
        if (type != null && prayerLabel != null) {
            SharedPreferences prefs = getSharedPreferences("dhikr_prefs", MODE_PRIVATE);
            String flagKey = "dhikr_done_" + type + "_" + prayerLabel;
            long lastDone = prefs.getLong(flagKey, 0);
            long oneHour = 60 * 60 * 1000; // 1 heure en millisecondes

            // Ne bloque que si le même dhikr a été déclenché dans la dernière heure
            if (now - lastDone < oneHour) {
                notificationDebugLog("DhikrService",
                        "⚠️ Déjà notifié récemment pour " + type + " - " + prayerLabel + " (il y a " +
                                ((now - lastDone) / 60000) + " minutes), on ignore !");
                stopSelf();
                return START_NOT_STICKY;
            }

            // Marque comme fait pour cette heure
            prefs.edit().putLong(flagKey, now).apply();
        }

        // Intent pour arrêter
        Intent stopIntent = new Intent(this, DhikrService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
                this, 0, stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Intent pour ouvrir l'app
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent contentIntent = PendingIntent.getActivity(
                this, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Log les valeurs reçues pour déboguer
        notificationDebugLog("DhikrService", "📨 Valeurs reçues: title='" + title + "' | body='" + body + "'");

        // Crée la notification finale avec BigTextStyle pour afficher le texte complet
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText(body))
                .setSmallIcon(R.drawable.ic_dhikr_notification)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(contentIntent)
                .setDefaults(NotificationCompat.DEFAULT_LIGHTS | NotificationCompat.DEFAULT_VIBRATE)
                .setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI); // Son explicite une seule fois

        Notification notification = builder.build();

        // Met à jour la notification avec la vraie notification
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        // Laisse le temps au service de démarrer puis arrête le foreground en gardant
        // la notification
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            stopForeground(STOP_FOREGROUND_DETACH);
            stopSelf();
        }, 2000);

        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private boolean isSameDay(long time1, long time2) {
        Calendar cal1 = Calendar.getInstance();
        Calendar cal2 = Calendar.getInstance();
        cal1.setTimeInMillis(time1);
        cal2.setTimeInMillis(time2);
        return cal1.get(Calendar.YEAR) == cal2.get(Calendar.YEAR) &&
                cal1.get(Calendar.DAY_OF_YEAR) == cal2.get(Calendar.DAY_OF_YEAR);
    }
}