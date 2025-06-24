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

public class PrayerReminderService extends Service {
    private static final String CHANNEL_ID = "prayer_reminder_service";
    private static final int NOTIFICATION_ID = 2;
    public static final String ACTION_STOP = "STOP_REMINDER";

    @Override
    public void onCreate() {
        super.onCreate();
        notificationDebugLog("PrayerReminderService", "-> onCreate()");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Prayer Reminder Service",
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Rappels de prière");
            channel.enableLights(true);
            channel.setLightColor(Color.YELLOW);
            channel.enableVibration(true);
            channel.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, null);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null)
                manager.createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Démarre en foreground IMMÉDIATEMENT pour éviter le crash
        NotificationCompat.Builder tempBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Préparation du rappel...")
                .setContentText("Traitement en cours...")
                .setSmallIcon(R.drawable.ic_reminder_notification)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setSound(null); // Pas de son pour la notification temporaire

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, tempBuilder.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, tempBuilder.build());
        }

        String action = intent != null ? intent.getAction() : null;
        String prayerLabel = intent != null ? intent.getStringExtra("PRAYER_LABEL") : null;
        String title = intent != null ? intent.getStringExtra("TITLE") : null;
        String body = intent != null ? intent.getStringExtra("BODY") : null;

        notificationDebugLog("PrayerReminderService",
                "-> onStartCommand: action=" + action + " | prayer=" + prayerLabel);

        // Récupère la langue actuelle
        SharedPreferences settings = getSharedPreferences("prayer_times_settings", MODE_PRIVATE);
        String currentLanguage = settings.getString("current_language", "en");
        notificationDebugLog("PrayerReminderService", "📱 Langue actuelle : " + currentLanguage);

        // Vérifie si déjà notifié récemment (dans la dernière heure)
        // Cela évite les doublons tout en permettant les reminders pour différentes
        // prières
        if (prayerLabel != null) {
            SharedPreferences prefs = getSharedPreferences("reminder_prefs", MODE_PRIVATE);
            String flagKey = "reminder_done_" + prayerLabel;
            long lastDone = prefs.getLong(flagKey, 0);
            long now = System.currentTimeMillis();
            long oneHour = 60 * 60 * 1000; // 1 heure en millisecondes

            // Ne bloque que si le même reminder a été déclenché dans la dernière heure
            if (now - lastDone < oneHour) {
                notificationDebugLog("PrayerReminderService",
                        "⚠️ Déjà notifié récemment pour " + prayerLabel + " (il y a " +
                                ((now - lastDone) / 60000) + " minutes), on ignore !");
                stopSelf();
                return START_NOT_STICKY;
            }

            // Marque comme fait pour cette heure
            prefs.edit().putLong(flagKey, now).apply();
        }

        // Intent pour arrêter
        Intent stopIntent = new Intent(this, PrayerReminderService.class);
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
        notificationDebugLog("PrayerReminderService", "📨 Valeurs reçues: title='" + title + "' | body='" + body + "'");

        // Récupère le délai sauvegardé pour vérifier
        int savedReminderOffset = settings.getInt("reminder_offset", 10);
        notificationDebugLog("PrayerReminderService", "💾 ReminderOffset sauvegardé: " + savedReminderOffset);

        // 🕒 DIAGNOSTIC TEMPOREL PRÉCIS
        long now = System.currentTimeMillis();
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("HH:mm:ss.SSS", java.util.Locale.getDefault());
        notificationDebugLog("PrayerReminderService",
                "🕒 Heure exacte déclenchement: " + sdf.format(new java.util.Date(now)));

        // Vérifie si le timing du reminder correspond au délai configuré
        if (body != null && body.contains(" minutes")) {
            try {
                String minutesStr = body.replaceAll(".*?(\\d+) minutes.*", "$1");
                int bodyMinutes = Integer.parseInt(minutesStr);
                if (bodyMinutes != savedReminderOffset) {
                    notificationDebugLog("PrayerReminderService", "⚠️ DÉSYNCHRONISATION: Body dit " + bodyMinutes
                            + " min mais configuration = " + savedReminderOffset + " min");
                }
            } catch (Exception e) {
                notificationDebugLog("PrayerReminderService", "🔍 Impossible d'extraire minutes du body: " + body);
            }
        }

        // Si title/body ne sont pas fournis, utilise les valeurs sauvegardées
        if (title == null) {
            title = "⏰ Prayer Reminder (" + savedReminderOffset + "min)";
        }
        if (body == null) {
            body = "Prayer time is approaching in " + savedReminderOffset + " minutes. Get ready!";
        }

        // FORCE la mise à jour du body même s'il est fourni mais contient "10"
        if (body != null && body.contains("10 minutes")) {
            notificationDebugLog("PrayerReminderService",
                    "🔧 CORRECTION: Body contenait '10 minutes', remplacement par " + savedReminderOffset);
            body = body.replace("10 minutes", savedReminderOffset + " minutes");
        }

        // Log final pour déboguer
        notificationDebugLog("PrayerReminderService",
                "📝 Notification finale: title='" + title + "' | body='" + body + "'");

        // Crée la notification finale
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText(body))
                .setSmallIcon(R.drawable.ic_reminder_notification)
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