package com.drogbinho.prayertimesapp2;

import android.app.*;
import android.content.*;
import android.graphics.*;
import android.media.*;
import android.os.*;
import android.util.Log;
import android.content.pm.ServiceInfo;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.util.*;
import com.batoulapps.adhan.CalculationMethod;
import com.batoulapps.adhan.CalculationParameters;
import com.batoulapps.adhan.Madhab;
import com.batoulapps.adhan.Coordinates;
import com.batoulapps.adhan.PrayerTimes;
import com.batoulapps.adhan.data.DateComponents;
import android.content.res.Resources;
import android.content.res.Configuration;

// Imports pour la lecture JSON et la gestion des assets
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;
import java.io.IOException;
// Random est déjà importé via java.util.*

import static com.drogbinho.prayertimesapp2.ConditionalLogger.*;

public class AdhanService extends Service {
    private static final String TAG = "AdhanService";
    public static final String ACTION_STOP = "com.drogbinho.prayertimesapp2.ACTION_STOP";
    public static final String ACTION_REPROGRAM_ADHAN_ALARMS = "REPROGRAM_ADHAN_ALARMS";
    public static final String ACTION_REPROGRAM_ADHAN_ALARMS_DELAYED = "REPROGRAM_ADHAN_ALARMS_DELAYED";
    public static final String CHANNEL_ID = "AdhanChannel_v2"; // Changed ID to ensure update
    private static final int FOREGROUND_SERVICE_NOTIFICATION_ID = 1; // Pour le service en foreground

    private MediaPlayer mediaPlayer;
    private String lastPrayerLabel = null; // Utilisé pour savoir quelle prière arrêter et pour la reprog après Isha
    private boolean isPlayingDuaAfterAdhan = false; // Indique si on joue le dua après l'adhan

    // Méthode pour vérifier si une prière est muette
    private boolean isPrayerMuted(String prayerLabel) {
        try {
            SharedPreferences prefs = getSharedPreferences("muted_prayers", MODE_PRIVATE);
            String mutedPrayersList = prefs.getString("muted_prayers_list", "");
            if (mutedPrayersList.isEmpty()) {
                return false;
            }

            String[] mutedPrayers = mutedPrayersList.split(",");
            for (String mutedPrayer : mutedPrayers) {
                if (mutedPrayer.trim().equals(prayerLabel)) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            errorLog(TAG, "Erreur lors de la vérification des prières muettes: " + e.getMessage());
            return false; // En cas d'erreur, ne pas rendre muet
        }
    }

    // Classe interne pour stocker le contenu d'un Dhikr
    private static class DhikrContent {
        String title; // Titre de la notification, ex: "Dhikr & Dua"
        String body; // Corps complet du Dhikr formaté

        DhikrContent(String title, String body) {
            this.title = title;
            this.body = body;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        errorLog(TAG, "======================================");
        errorLog(TAG, "🚀 ADHAN SERVICE CRÉÉ - DEBUG ON");
        errorLog(TAG, "======================================");
        systemOutLog("ADHAN_DEBUG: AdhanService onCreate");
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Adhan Notifications", // User visible name
                    NotificationManager.IMPORTANCE_HIGH // Importance pour les notifications Adhan
            );
            serviceChannel.setDescription("Channel for Adhan prayer time notifications and playback");
            serviceChannel.setSound(null, null); // Le son est géré par le MediaPlayer

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
                debugLog(TAG, "Notification channel created: " + CHANNEL_ID);
            } else {
                errorLog(TAG, "NotificationManager est null, impossible de créer le canal.");
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        errorLog(TAG, "**************************************");
        errorLog(TAG, "🔥 ADHAN SERVICE - COMMANDE REÇUE");
        errorLog(TAG, "**************************************");
        systemOutLog("ADHAN_DEBUG: onStartCommand reçu");

        if (intent == null) {
            warningLog(TAG, "onStartCommand: Intent est null. Arrêt du service.");
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        String prayerLabel = intent.getStringExtra("PRAYER_LABEL"); // Peut être null pour une action STOP générique

        // Récupère la langue actuelle des SharedPreferences pour les textes de la notif
        // de service
        SharedPreferences settings = getSharedPreferences("prayer_times_settings", MODE_PRIVATE);
        String currentLanguage = settings.getString("current_language", "en");

        if (ACTION_STOP.equals(action)) {
            String stopReason = prayerLabel != null ? prayerLabel
                    : (lastPrayerLabel != null ? lastPrayerLabel : "générique");
            debugLog(TAG, "[ACTION_STOP] Demande d'arrêt pour Adhan: " + stopReason);
            stopAdhan(); // Arrête le MediaPlayer

            // Si c'est Isha qui est arrêté (par l'utilisateur ou fin de lecture), on
            // reprogramme.
            // lastPrayerLabel est mis à jour juste avant de jouer l'Adhan.
            if ("Isha".equals(prayerLabel) || ("Isha".equals(lastPrayerLabel) && prayerLabel == null)) {
                debugLog(TAG, "[Arrêt Isha] Reprogrammation immédiate pour demain.");
                reprogramAlarmsForTomorrow();
            }
            stopForeground(true); // Retire la notif de premier plan
            stopSelf(); // Arrête le service
            return START_NOT_STICKY;
        }

        if (ACTION_REPROGRAM_ADHAN_ALARMS.equals(action)) {
            debugLog(TAG, "[BOOT_COMPLETED] Reprogrammation après redémarrage du téléphone (ancienne méthode)");
            reprogramAlarmsAfterBoot();
            stopSelf(); // Arrête le service après reprogrammation
            return START_NOT_STICKY;
        }

        if (ACTION_REPROGRAM_ADHAN_ALARMS_DELAYED.equals(action)) {
            debugLog(TAG,
                    "[BOOT_COMPLETED_DELAYED] Reprogrammation différée après redémarrage du téléphone (Android 15+ compatible)");
            // Cette action ne démarre PAS en service de premier plan pour être compatible
            // avec Android 15+
            // Elle effectue juste la reprogrammation en arrière-plan
            reprogramAlarmsAfterBoot();
            stopSelf(); // Arrête le service après reprogrammation
            return START_NOT_STICKY;
        }

        // Si on arrive ici, ce n'est ni une action STOP ni une action de
        // reprogrammation.
        // C'est pour jouer un Adhan.
        if (prayerLabel == null) {
            errorLog(TAG, "onStartCommand: PRAYER_LABEL est null pour une action de démarrage. Arrêt.");
            stopSelf();
            return START_NOT_STICKY;
        }
        this.lastPrayerLabel = prayerLabel; // Mémorise pour l'action STOP et la complétion

        String notifTitle = intent.getStringExtra("NOTIF_TITLE");
        String notifBody = intent.getStringExtra("NOTIF_BODY");

        // Notification pour le service en foreground
        Intent stopSelfIntent = new Intent(this, AdhanService.class);
        stopSelfIntent.setAction(ACTION_STOP);
        stopSelfIntent.putExtra("PRAYER_LABEL", prayerLabel); // Important pour la logique de reprogrammation post-Isha
        PendingIntent stopPendingIntent = PendingIntent.getService(
                this,
                prayerLabel.hashCode() + 1, // requestCode unique pour l'action stop de cette prière
                stopSelfIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Intent pour arrêter l'Adhan quand la notification est balayée
        Intent deleteIntent = new Intent(this, AdhanService.class);
        deleteIntent.setAction(ACTION_STOP);
        deleteIntent.putExtra("PRAYER_LABEL", prayerLabel);
        PendingIntent deletePendingIntent = PendingIntent.getService(
                this,
                prayerLabel.hashCode() + 2, // requestCode unique pour le delete
                deleteIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(notifTitle != null ? notifTitle : prayerLabel)
                .setContentText(notifBody != null ? notifBody
                        : getLocalizedText(this, "preparing_adhan", currentLanguage, "Préparation de l'Adhan..."))
                .setSmallIcon(R.drawable.ic_adhan_notification) // Assurez-vous que cette icône existe
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setSound(null) // Le son est géré par le MediaPlayer
                .setDeleteIntent(deletePendingIntent) // Arrête l'Adhan quand la notif est balayée
                .addAction(android.R.drawable.ic_media_pause,
                        getLocalizedText(this, "stop", currentLanguage, "Arrêter"), stopPendingIntent);

        Notification notification = notificationBuilder.build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(FOREGROUND_SERVICE_NOTIFICATION_ID, notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(FOREGROUND_SERVICE_NOTIFICATION_ID, notification);
        }
        debugLog(TAG, "Service démarré en premier plan pour: " + prayerLabel);

        playAdhanSound(intent.getStringExtra("ADHAN_SOUND"), prayerLabel, currentLanguage);

        return START_STICKY; // Reste actif jusqu'à arrêt explicite
    }

    private void playAdhanSound(String adhanSoundKey, final String prayerLabelForCompletion, String language) {
        if (mediaPlayer != null) {
            stopAdhan(); // Arrête toute lecture précédente
        }

        SharedPreferences adhanPrefs = getSharedPreferences("adhan_prefs", MODE_PRIVATE);
        String soundFromPrefs = adhanPrefs.getString("ADHAN_SOUND", "misharyrachid");
        String soundToPlay = (adhanSoundKey != null) ? adhanSoundKey : soundFromPrefs;
        float volume = adhanPrefs.getFloat("adhan_volume", 1.0f);

        debugLog(TAG, "🔊 DEBUG SONS ADHAN:");
        debugLog(TAG, "  - adhanSoundKey (Intent): " + adhanSoundKey);
        debugLog(TAG, "  - soundFromPrefs (SharedPrefs): " + soundFromPrefs);
        debugLog(TAG, "  - soundToPlay (Final): " + soundToPlay);
        debugLog(TAG, "  - volume: " + volume);
        debugLog(TAG, "📢 Tentative de lecture Adhan: " + soundToPlay + " pour " + prayerLabelForCompletion);

        debugLog(TAG, "🔍 Recherche fichier audio: '" + soundToPlay + "' dans package: " + getPackageName());
        int resId = getResources().getIdentifier(soundToPlay, "raw", getPackageName());
        debugLog(TAG, "🔍 Result resId: " + resId + " pour '" + soundToPlay + "'");

        // DIAGNOSTIC SPÉCIAL POUR MUSTAFAOZCAN
        if (resId == 0 && "mustafaozcan".equals(soundToPlay)) {
            errorLog(TAG, "❌ DIAGNOSTIC MUSTAFAOZCAN: Fichier non trouvé avec getIdentifier()");

            // Essayer différentes variantes du nom
            String[] alternatives = {
                    "mustafaozcan",
                    "mustafa_ozcan",
                    "mustafa-ozcan",
                    "MustafaOzcan",
                    "mostafaozcan" // Au cas où il y aurait une typo
            };

            for (String alt : alternatives) {
                int altResId = getResources().getIdentifier(alt, "raw", getPackageName());
                debugLog(TAG, "🔍 Test alternative '" + alt + "': resId = " + altResId);
                if (altResId != 0) {
                    resId = altResId;
                    errorLog(TAG, "✅ MUSTAFAOZCAN trouvé avec variante: '" + alt + "' (resId: " + resId + ")");
                    break;
                }
            }

            // Si toujours pas trouvé, essayer d'accéder directement au fichier R.raw
            if (resId == 0) {
                try {
                    // Essayer d'accéder directement via réflexion
                    Class<?> rawClass = Class.forName(getPackageName() + ".R$raw");
                    java.lang.reflect.Field mustafaField = rawClass.getField("mustafaozcan");
                    resId = mustafaField.getInt(null);
                    errorLog(TAG, "✅ MUSTAFAOZCAN trouvé via réflexion R.raw: " + resId);
                } catch (Exception e) {
                    errorLog(TAG, "❌ Échec réflexion R.raw pour mustafaozcan: " + e.getMessage());
                }
            }
        }

        if (resId == 0) {
            errorLog(TAG, "❌ Fichier audio Adhan non trouvé: '" + soundToPlay + "'. Tentative fallback...");
            debugLog(TAG, "🔍 Recherche fallback: 'adhamalsharqawe'");
            resId = getResources().getIdentifier("adhamalsharqawe", "raw", getPackageName());
            debugLog(TAG, "🔍 Fallback resId: " + resId);
            if (resId == 0) {
                errorLog(TAG, "Fichier audio Adhan fallback non trouvé non plus. Arrêt Adhan.");
                // Simule la fin pour déclencher la logique de stop/reprog
                handleAdhanCompletion(prayerLabelForCompletion);
                return;
            }
        }

        mediaPlayer = MediaPlayer.create(this, resId);
        if (mediaPlayer == null) {
            errorLog(TAG, "MediaPlayer.create a échoué pour resId: " + resId);
            handleAdhanCompletion(prayerLabelForCompletion);
            return;
        }

        try {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);

            // Vérifier si cette prière est muette par l'utilisateur
            boolean isPrayerMutedByUser = isPrayerMuted(prayerLabelForCompletion);

            if (isPrayerMutedByUser) {
                debugLog(TAG, "Prière " + prayerLabelForCompletion + " est muette par l'utilisateur. Volume à 0.");
                mediaPlayer.setVolume(0, 0);
            } else {
                // L'adhan joue toujours avec le volume configuré, indépendamment du mode
                // téléphone
                mediaPlayer.setVolume(volume, volume);
                debugLog(TAG, "Adhan joué avec volume configuré: " + volume + " pour " + prayerLabelForCompletion);
            }

            mediaPlayer.setOnCompletionListener(mp -> {
                debugLog(TAG, "Adhan terminé pour: " + prayerLabelForCompletion);
                handleAdhanCompletion(prayerLabelForCompletion);
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                errorLog(TAG, "Erreur MediaPlayer: what=" + what + ", extra=" + extra);
                handleAdhanCompletion(prayerLabelForCompletion); // Traiter comme une complétion pour arrêter proprement
                return true; // Indique que l'erreur a été gérée
            });

            mediaPlayer.start();
            debugLog(TAG, "Adhan démarré pour: " + prayerLabelForCompletion);

        } catch (Exception e) {
            errorLog(TAG, "Erreur lors du démarrage du MediaPlayer: " + e.getMessage(), e);
            handleAdhanCompletion(prayerLabelForCompletion);
        }
    }

    private void handleAdhanCompletion(String completedPrayerLabel) {
        if (!isPlayingDuaAfterAdhan) {
            // L'adhan principal vient de se terminer, maintenant jouer le dua après l'adhan
            debugLog(TAG, "Adhan terminé pour " + completedPrayerLabel + ", démarrage du dua après adhan");
            stopAdhan(); // Libère le MediaPlayer de l'adhan
            playDuaAfterAdhan(completedPrayerLabel);
        } else {
            // Le dua après l'adhan vient de se terminer, maintenant vraiment terminer
            debugLog(TAG, "Dua après adhan terminé pour " + completedPrayerLabel + ", terminaison complète");
            handleFinalCompletion(completedPrayerLabel);
        }
    }

    private void handleFinalCompletion(String completedPrayerLabel) {
        stopAdhan(); // Assure que le mediaplayer est libéré
        isPlayingDuaAfterAdhan = false; // Reset du flag

        // Créer une notification persistante pour informer que l'Adhan s'est produit
        createCompletedAdhanNotification(completedPrayerLabel);

        // Envoyer un intent ACTION_STOP à soi-même pour centraliser la logique d'arrêt
        // et la reprogrammation post-Isha.
        Intent selfStopIntent = new Intent(this, AdhanService.class);
        selfStopIntent.setAction(ACTION_STOP);
        selfStopIntent.putExtra("PRAYER_LABEL", completedPrayerLabel); // Crucial pour la logique de reprogrammation
                                                                       // après Isha
        startService(selfStopIntent);
    }

    private void playDuaAfterAdhan(String prayerLabelForCompletion) {
        SharedPreferences adhanPrefs = getSharedPreferences("adhan_prefs", MODE_PRIVATE);
        float volume = adhanPrefs.getFloat("adhan_volume", 1.0f);

        debugLog(TAG,
                "Tentative de lecture dua après adhan pour " + prayerLabelForCompletion + " avec volume " + volume);

        int resId = getResources().getIdentifier("duaafteradhan", "raw", getPackageName());
        if (resId == 0) {
            errorLog(TAG, "Fichier audio duaafteradhan non trouvé. Passage à la terminaison finale.");
            handleFinalCompletion(prayerLabelForCompletion);
            return;
        }

        mediaPlayer = MediaPlayer.create(this, resId);
        if (mediaPlayer == null) {
            errorLog(TAG, "MediaPlayer.create a échoué pour duaafteradhan");
            handleFinalCompletion(prayerLabelForCompletion);
            return;
        }

        try {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);

            // Vérifier si cette prière est muette par l'utilisateur
            boolean isPrayerMutedByUser = isPrayerMuted(prayerLabelForCompletion);

            if (isPrayerMutedByUser) {
                debugLog(TAG, "Prière " + prayerLabelForCompletion
                        + " est muette par l'utilisateur. Dua après adhan aussi à volume 0.");
                mediaPlayer.setVolume(0, 0);
            } else {
                // Le dua après adhan joue toujours avec le volume configuré, indépendamment du
                // mode téléphone
                mediaPlayer.setVolume(volume, volume);
                debugLog(TAG,
                        "Dua après adhan joué avec volume configuré: " + volume + " pour " + prayerLabelForCompletion);
            }

            isPlayingDuaAfterAdhan = true; // Marquer qu'on joue maintenant le dua

            mediaPlayer.setOnCompletionListener(mp -> {
                debugLog(TAG, "Dua après adhan terminé pour: " + prayerLabelForCompletion);
                handleAdhanCompletion(prayerLabelForCompletion); // Appellera handleFinalCompletion
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                errorLog(TAG, "Erreur MediaPlayer dua après adhan: what=" + what + ", extra=" + extra);
                handleFinalCompletion(prayerLabelForCompletion); // Traiter comme une complétion pour arrêter proprement
                return true; // Indique que l'erreur a été gérée
            });

            mediaPlayer.start();
            debugLog(TAG, "Dua après adhan démarré pour: " + prayerLabelForCompletion);

        } catch (Exception e) {
            errorLog(TAG, "Erreur lors du démarrage du MediaPlayer pour dua après adhan: " + e.getMessage(), e);
            handleFinalCompletion(prayerLabelForCompletion);
        }
    }

    private void createCompletedAdhanNotification(String prayerLabel) {
        // Récupère la langue actuelle des SharedPreferences
        SharedPreferences settings = getSharedPreferences("prayer_times_settings", MODE_PRIVATE);
        String currentLanguage = settings.getString("current_language", "en");

        // Titre et corps de la notification selon la langue
        String notifTitle = getLocalizedText(this, "adhan_completed_title", currentLanguage, "Adhan terminé");
        String notifBody = getLocalizedText(this, "adhan_completed_body", currentLanguage,
                "L'appel à la prière pour " + getPrayerDisplayNameForLocale(prayerLabel, currentLanguage)
                        + " s'est déroulé");

        // Intent pour fermer cette notification spécifique
        Intent dismissIntent = new Intent(this, AdhanDismissReceiver.class);
        dismissIntent.setAction("DISMISS_COMPLETED_ADHAN");
        dismissIntent.putExtra("PRAYER_LABEL", prayerLabel);
        dismissIntent.putExtra("NOTIFICATION_ID", prayerLabel.hashCode() + 1000); // ID unique pour cette notification

        PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
                this,
                prayerLabel.hashCode() + 1000, // requestCode unique
                dismissIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Créer la notification persistante
        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(notifTitle)
                .setContentText(notifBody)
                .setSmallIcon(R.drawable.ic_adhan_notification)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT) // Moins prioritaire que pendant la lecture
                .setSound(null) // Pas de son pour cette notification
                .setOngoing(false) // Peut être fermée par l'utilisateur
                .setAutoCancel(true) // Se ferme quand l'utilisateur tape dessus
                .addAction(android.R.drawable.ic_menu_close_clear_cancel,
                        getLocalizedText(this, "dismiss", currentLanguage, "Fermer"), dismissPendingIntent);

        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        if (notificationManager != null) {
            // Utilise un ID unique pour chaque prière pour éviter les conflits
            int notificationId = prayerLabel.hashCode() + 1000;
            notificationManager.notify(notificationId, notificationBuilder.build());
            debugLog(TAG,
                    "Notification persistante créée pour Adhan terminé: " + prayerLabel + " (ID: " + notificationId
                            + ")");
        } else {
            errorLog(TAG, "NotificationManager est null, impossible de créer la notification persistante.");
        }
    }

    private void stopAdhan() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.reset(); // Important pour réutiliser ou libérer correctement
                mediaPlayer.release();
                debugLog(TAG, "MediaPlayer arrêté et libéré.");
            } catch (Exception e) {
                errorLog(TAG, "Exception lors de l'arrêt/libération du MediaPlayer: " + e.getMessage());
            } finally {
                mediaPlayer = null;
            }
        }
        isPlayingDuaAfterAdhan = false; // Reset du flag à chaque arrêt
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopAdhan();
        debugLog(TAG, "AdhanService onDestroy: Service détruit.");
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null; // Pas de liaison pour ce service
    }

    private void reprogramAlarmsForTomorrow() {
        debugLog(TAG, "====> REPROGRAMMATION COMPLÈTE POUR DEMAIN <====");
        Context context = this;
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        // 1. ANNULATION DES ALARMES EXISTANTES (Adhan uniquement pour l'instant)
        // Les autres (Rappels, Dhikrs) seront écrasées par FLAG_UPDATE_CURRENT.
        // Si des doublons persistent, une annulation plus ciblée sera nécessaire.
        debugLog(TAG, "Réprogram: Annulation des alarmes Adhan existantes...");
        cancelAllAdhanAlarmsOnly(context, alarmManager);

        // 2. LECTURE DE TOUS LES PARAMÈTRES NÉCESSAIRES
        SharedPreferences adhanPrefs = getSharedPreferences("adhan_prefs", MODE_PRIVATE);
        SharedPreferences settingsPrefs = getSharedPreferences("prayer_times_settings", MODE_PRIVATE);

        String language = settingsPrefs.getString("current_language", "en");
        debugLog(TAG, "Réprogram: Langue pour notifications: " + language);

        // Paramètres de localisation
        String locationMode = settingsPrefs.getString("location_mode", "auto");
        double latitude, longitude;
        if ("manual".equals(locationMode)) {
            latitude = settingsPrefs.getFloat("manual_latitude", 0f);
            longitude = settingsPrefs.getFloat("manual_longitude", 0f);
            debugLog(TAG, "Réprogram: Mode manuel, Lat: " + latitude + ", Lon: " + longitude);
        } else { // Mode "auto"
            latitude = settingsPrefs.getFloat("auto_latitude", 0f);
            longitude = settingsPrefs.getFloat("auto_longitude", 0f);
            debugLog(TAG, "Réprogram: Mode auto, Lat: " + latitude + ", Lon: " + longitude);
        }

        if (latitude == 0.0 && longitude == 0.0) {
            errorLog(TAG, "Réprogram: Coordonnées (0.0, 0.0) détectées. Reprogrammation annulée pour éviter erreurs.");
            return;
        }

        // Paramètres de calcul et son Adhan
        String calcMethodName = adhanPrefs.getString("calc_method", "MuslimWorldLeague");
        String adhanSound = adhanPrefs.getString("ADHAN_SOUND", "adhamalsharqawe");

        // Paramètres généraux de notification
        boolean notificationsEnabled = settingsPrefs.getBoolean("notifications_enabled", true);
        if (!notificationsEnabled) {
            debugLog(TAG, "Réprogram: Notifications désactivées globalement. Arrêt de la reprogrammation.");
            return;
        }

        // Paramètres des rappels
        boolean remindersEnabled = settingsPrefs.getBoolean("reminders_enabled", true);
        int reminderOffset = settingsPrefs.getInt("reminder_offset", 10);

        // Paramètres des Dhikrs
        boolean enabledAfterSalah = settingsPrefs.getBoolean("enabled_after_salah", true);
        int delayAfterSalah = 5; // Fixé à 5 minutes
        boolean enabledMorningDhikr = settingsPrefs.getBoolean("enabled_morning_dhikr", true);
        int delayMorningDhikr = settingsPrefs.getInt("delay_morning_dhikr", 30);
        boolean enabledEveningDhikr = settingsPrefs.getBoolean("enabled_evening_dhikr", true);
        int delayEveningDhikr = settingsPrefs.getInt("delay_evening_dhikr", 30);
        boolean enabledSelectedDua = settingsPrefs.getBoolean("enabled_selected_dua", false); // Typiquement false par
                                                                                              // défaut
        int delaySelectedDua = settingsPrefs.getInt("delay_selected_dua", 30);

        // 3. CALCUL DES HEURES DE PRIÈRE POUR DEMAIN
        CalculationParameters calcParams = getCalculationParameters(calcMethodName);
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DATE, 1); // Demain
        DateComponents dateComponents = DateComponents.from(cal.getTime());
        Coordinates coordinates = new Coordinates(latitude, longitude);
        PrayerTimes prayerTimesTomorrow = new PrayerTimes(coordinates, dateComponents, calcParams);

        debugLog(TAG, "Réprogram: Horaires pour demain (" + dateComponents.toString() + "): F:" +
                prayerTimesTomorrow.fajr + ", D:" + prayerTimesTomorrow.dhuhr + ", A:" + prayerTimesTomorrow.asr +
                ", M:" + prayerTimesTomorrow.maghrib + ", I:" + prayerTimesTomorrow.isha);

        // 4. REPROGRAMMATION DES ADHANS
        debugLog(TAG, "Réprogram: Reprogrammation des Adhans...");
        scheduleAdhanAlarmInternal(context, alarmManager, "Fajr", prayerTimesTomorrow.fajr.getTime(), adhanSound,
                language);
        scheduleAdhanAlarmInternal(context, alarmManager, "Dhuhr", prayerTimesTomorrow.dhuhr.getTime(), adhanSound,
                language);
        scheduleAdhanAlarmInternal(context, alarmManager, "Asr", prayerTimesTomorrow.asr.getTime(), adhanSound,
                language);
        scheduleAdhanAlarmInternal(context, alarmManager, "Maghrib", prayerTimesTomorrow.maghrib.getTime(), adhanSound,
                language);
        scheduleAdhanAlarmInternal(context, alarmManager, "Isha", prayerTimesTomorrow.isha.getTime(), adhanSound,
                language);

        // 5. REPROGRAMMATION DES RAPPELS
        if (remindersEnabled) {
            debugLog(TAG, "Réprogram: Reprogrammation des Rappels (offset: " + reminderOffset + " min)...");
            scheduleReminderInternal(context, alarmManager, "Fajr", prayerTimesTomorrow.fajr.getTime(), reminderOffset,
                    language);
            scheduleReminderInternal(context, alarmManager, "Dhuhr", prayerTimesTomorrow.dhuhr.getTime(),
                    reminderOffset, language);
            scheduleReminderInternal(context, alarmManager, "Asr", prayerTimesTomorrow.asr.getTime(), reminderOffset,
                    language);
            scheduleReminderInternal(context, alarmManager, "Maghrib", prayerTimesTomorrow.maghrib.getTime(),
                    reminderOffset, language);
            scheduleReminderInternal(context, alarmManager, "Isha", prayerTimesTomorrow.isha.getTime(), reminderOffset,
                    language);
        }

        // 6. REPROGRAMMATION DES DHIKRS
        debugLog(TAG, "Réprogram: Reprogrammation des Dhikrs...");
        Map<String, Date> prayerTimesMap = new HashMap<>();
        prayerTimesMap.put("Fajr", prayerTimesTomorrow.fajr);
        prayerTimesMap.put("Dhuhr", prayerTimesTomorrow.dhuhr);
        prayerTimesMap.put("Asr", prayerTimesTomorrow.asr);
        prayerTimesMap.put("Maghrib", prayerTimesTomorrow.maghrib);
        prayerTimesMap.put("Isha", prayerTimesTomorrow.isha);

        String[] prayersOrder = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };

        for (String prayerName : prayersOrder) {
            Date prayerTimeDate = prayerTimesMap.get(prayerName);
            if (prayerTimeDate == null)
                continue;
            long prayerTimestamp = prayerTimeDate.getTime();

            if (enabledAfterSalah) {
                scheduleDhikrInternal(context, alarmManager, "afterSalah", prayerName, prayerTimestamp, delayAfterSalah,
                        language);
            }
            if (enabledMorningDhikr && "Fajr".equals(prayerName)) {
                scheduleDhikrInternal(context, alarmManager, "dhikrMorning", prayerName, prayerTimestamp,
                        delayMorningDhikr, language);
            }
            if (enabledEveningDhikr && "Maghrib".equals(prayerName)) { // Typiquement Maghrib pour Evening Dhikr
                scheduleDhikrInternal(context, alarmManager, "eveningDhikr", prayerName, prayerTimestamp,
                        delayEveningDhikr, language);
            }
            // SelectedDua: typiquement pour Dhuhr, Asr, Isha (éviter Fajr/Maghrib si déjà
            // couverts)
            if (enabledSelectedDua) {
                if ("Dhuhr".equals(prayerName) || "Asr".equals(prayerName) || "Isha".equals(prayerName)) {
                    scheduleDhikrInternal(context, alarmManager, "selectedDua", prayerName, prayerTimestamp,
                            delaySelectedDua, language);
                }
            }
        }
        debugLog(TAG, "====> REPROGRAMMATION COMPLÈTE POUR DEMAIN TERMINÉE <====");
    }

    private void reprogramAlarmsAfterBoot() {
        debugLog(TAG, "====> REPROGRAMMATION APRÈS REDÉMARRAGE <====");
        Context context = this;
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        // 1. LECTURE DES PARAMÈTRES
        SharedPreferences adhanPrefs = getSharedPreferences("adhan_prefs", MODE_PRIVATE);
        SharedPreferences settingsPrefs = getSharedPreferences("prayer_times_settings", MODE_PRIVATE);

        String language = settingsPrefs.getString("current_language", "en");
        debugLog(TAG, "Boot Reprog: Langue: " + language);

        // Paramètres de localisation
        String locationMode = settingsPrefs.getString("location_mode", "auto");
        double latitude, longitude;
        if ("manual".equals(locationMode)) {
            latitude = settingsPrefs.getFloat("manual_latitude", 0f);
            longitude = settingsPrefs.getFloat("manual_longitude", 0f);
            debugLog(TAG, "Boot Reprog: Mode manuel, Lat: " + latitude + ", Lon: " + longitude);
        } else { // Mode "auto"
            latitude = settingsPrefs.getFloat("auto_latitude", 0f);
            longitude = settingsPrefs.getFloat("auto_longitude", 0f);
            debugLog(TAG, "Boot Reprog: Mode auto, Lat: " + latitude + ", Lon: " + longitude);
        }

        if (latitude == 0.0 && longitude == 0.0) {
            errorLog(TAG, "Boot Reprog: Coordonnées (0.0, 0.0) détectées. Reprogrammation annulée.");
            return;
        }

        // Paramètres de calcul et son Adhan
        String calcMethodName = adhanPrefs.getString("calc_method", "MuslimWorldLeague");
        String adhanSound = adhanPrefs.getString("ADHAN_SOUND", "adhamalsharqawe");

        // Paramètres généraux de notification
        boolean notificationsEnabled = settingsPrefs.getBoolean("notifications_enabled", true);
        if (!notificationsEnabled) {
            debugLog(TAG, "Boot Reprog: Notifications désactivées globalement. Arrêt.");
            return;
        }

        // Paramètres des rappels
        boolean remindersEnabled = settingsPrefs.getBoolean("reminders_enabled", true);
        int reminderOffset = settingsPrefs.getInt("reminder_offset", 10);

        // Paramètres des Dhikrs
        boolean enabledAfterSalah = settingsPrefs.getBoolean("enabled_after_salah", true);
        int delayAfterSalah = 5;
        boolean enabledMorningDhikr = settingsPrefs.getBoolean("enabled_morning_dhikr", true);
        int delayMorningDhikr = settingsPrefs.getInt("delay_morning_dhikr", 30);
        boolean enabledEveningDhikr = settingsPrefs.getBoolean("enabled_evening_dhikr", true);
        int delayEveningDhikr = settingsPrefs.getInt("delay_evening_dhikr", 30);
        boolean enabledSelectedDua = settingsPrefs.getBoolean("enabled_selected_dua", false);
        int delaySelectedDua = settingsPrefs.getInt("delay_selected_dua", 30);

        // 2. CALCUL DES HEURES POUR AUJOURD'HUI ET DEMAIN
        CalculationParameters calcParams = getCalculationParameters(calcMethodName);
        Coordinates coordinates = new Coordinates(latitude, longitude);
        Calendar now = Calendar.getInstance();

        // Horaires d'aujourd'hui
        DateComponents todayDate = DateComponents.from(now.getTime());
        PrayerTimes prayerTimesToday = new PrayerTimes(coordinates, todayDate, calcParams);

        // Horaires de demain
        Calendar tomorrow = Calendar.getInstance();
        tomorrow.add(Calendar.DATE, 1);
        DateComponents tomorrowDate = DateComponents.from(tomorrow.getTime());
        PrayerTimes prayerTimesTomorrow = new PrayerTimes(coordinates, tomorrowDate, calcParams);

        debugLog(TAG,
                "Boot Reprog: Horaires aujourd'hui: F:" + prayerTimesToday.fajr + ", D:" + prayerTimesToday.dhuhr +
                        ", A:" + prayerTimesToday.asr + ", M:" + prayerTimesToday.maghrib + ", I:"
                        + prayerTimesToday.isha);
        debugLog(TAG,
                "Boot Reprog: Horaires demain: F:" + prayerTimesTomorrow.fajr + ", D:" + prayerTimesTomorrow.dhuhr +
                        ", A:" + prayerTimesTomorrow.asr + ", M:" + prayerTimesTomorrow.maghrib + ", I:"
                        + prayerTimesTomorrow.isha);

        // 3. REPROGRAMMATION INTELLIGENTE : aujourd'hui + demain selon l'heure actuelle
        long currentTimeMillis = System.currentTimeMillis();

        // Programme les prières d'aujourd'hui qui ne sont pas encore passées
        String[] prayers = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };
        Date[] todayTimes = { prayerTimesToday.fajr, prayerTimesToday.dhuhr, prayerTimesToday.asr,
                prayerTimesToday.maghrib, prayerTimesToday.isha };
        Date[] tomorrowTimes = { prayerTimesTomorrow.fajr, prayerTimesTomorrow.dhuhr, prayerTimesTomorrow.asr,
                prayerTimesTomorrow.maghrib, prayerTimesTomorrow.isha };

        debugLog(TAG, "Boot Reprog: Reprogrammation des Adhans...");

        // Adhans pour aujourd'hui (prières futures uniquement)
        for (int i = 0; i < prayers.length; i++) {
            if (todayTimes[i].getTime() > currentTimeMillis) {
                scheduleAdhanAlarmInternalWithSuffix(context, alarmManager, prayers[i], todayTimes[i].getTime(),
                        adhanSound,
                        language, "_today");
            }
        }

        // Adhans pour demain (toutes les prières)
        for (int i = 0; i < prayers.length; i++) {
            scheduleAdhanAlarmInternalWithSuffix(context, alarmManager, prayers[i], tomorrowTimes[i].getTime(),
                    adhanSound,
                    language, "_tomorrow");
        }

        // 4. REPROGRAMMATION DES RAPPELS
        if (remindersEnabled) {
            debugLog(TAG, "Boot Reprog: Reprogrammation des Rappels...");

            // Rappels pour aujourd'hui (prières futures uniquement)
            for (int i = 0; i < prayers.length; i++) {
                if (todayTimes[i].getTime() > currentTimeMillis) {
                    scheduleReminderInternal(context, alarmManager, prayers[i], todayTimes[i].getTime(), reminderOffset,
                            language);
                }
            }

            // Rappels pour demain (toutes les prières)
            for (int i = 0; i < prayers.length; i++) {
                scheduleReminderInternal(context, alarmManager, prayers[i], tomorrowTimes[i].getTime(), reminderOffset,
                        language);
            }
        }

        // 5. REPROGRAMMATION DES DHIKRS
        debugLog(TAG, "Boot Reprog: Reprogrammation des Dhikrs...");

        // Dhikrs pour aujourd'hui (prières futures uniquement)
        for (int i = 0; i < prayers.length; i++) {
            if (todayTimes[i].getTime() > currentTimeMillis) {
                long prayerTimestamp = todayTimes[i].getTime();

                if (enabledAfterSalah) {
                    scheduleDhikrInternal(context, alarmManager, "afterSalah", prayers[i], prayerTimestamp,
                            delayAfterSalah, language);
                }
                if (enabledMorningDhikr && "Fajr".equals(prayers[i])) {
                    scheduleDhikrInternal(context, alarmManager, "dhikrMorning", prayers[i], prayerTimestamp,
                            delayMorningDhikr, language);
                }
                if (enabledEveningDhikr && "Maghrib".equals(prayers[i])) {
                    scheduleDhikrInternal(context, alarmManager, "eveningDhikr", prayers[i], prayerTimestamp,
                            delayEveningDhikr, language);
                }
                if (enabledSelectedDua
                        && ("Dhuhr".equals(prayers[i]) || "Asr".equals(prayers[i]) || "Isha".equals(prayers[i]))) {
                    scheduleDhikrInternal(context, alarmManager, "selectedDua", prayers[i], prayerTimestamp,
                            delaySelectedDua, language);
                }
            }
        }

        // Dhikrs pour demain (toutes les prières)
        for (int i = 0; i < prayers.length; i++) {
            long prayerTimestamp = tomorrowTimes[i].getTime();

            if (enabledAfterSalah) {
                scheduleDhikrInternal(context, alarmManager, "afterSalah", prayers[i], prayerTimestamp, delayAfterSalah,
                        language);
            }
            if (enabledMorningDhikr && "Fajr".equals(prayers[i])) {
                scheduleDhikrInternal(context, alarmManager, "dhikrMorning", prayers[i], prayerTimestamp,
                        delayMorningDhikr, language);
            }
            if (enabledEveningDhikr && "Maghrib".equals(prayers[i])) {
                scheduleDhikrInternal(context, alarmManager, "eveningDhikr", prayers[i], prayerTimestamp,
                        delayEveningDhikr, language);
            }
            if (enabledSelectedDua
                    && ("Dhuhr".equals(prayers[i]) || "Asr".equals(prayers[i]) || "Isha".equals(prayers[i]))) {
                scheduleDhikrInternal(context, alarmManager, "selectedDua", prayers[i], prayerTimestamp,
                        delaySelectedDua, language);
            }
        }

        debugLog(TAG, "====> REPROGRAMMATION APRÈS REDÉMARRAGE TERMINÉE <====");
    }

    private void cancelAllAdhanAlarmsOnly(Context context, AlarmManager alarmManager) {
        String[] prayers = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };
        String[] suffixes = { "", "_today", "_tomorrow" }; // Gère les anciens et nouveaux formats
        int cancelCount = 0;

        for (String prayer : prayers) {
            for (String suffix : suffixes) {
                Intent intent = new Intent(context, AdhanReceiver.class);
                intent.setAction("com.drogbinho.prayertimesapp2.ACTION_ADHAN_ALARM");
                // Le requestCode doit correspondre à celui utilisé lors de la programmation
                int requestCode = (prayer + suffix).hashCode();
                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        intent,
                        PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);

                if (pendingIntent != null) {
                    alarmManager.cancel(pendingIntent);
                    pendingIntent.cancel();
                    cancelCount++;
                    debugLog(TAG, "Réprogram: Alarme Adhan annulée pour " + prayer + suffix);
                }
            }
        }
        debugLog(TAG, "Réprogram: " + cancelCount + " alarmes Adhan annulées.");
    }

    private CalculationParameters getCalculationParameters(String methodName) {
        CalculationParameters params;
        if (methodName == null)
            methodName = "MuslimWorldLeague"; // Default
        switch (methodName) {
            case "Egyptian":
                params = CalculationMethod.EGYPTIAN.getParameters();
                break;
            case "Karachi":
                params = CalculationMethod.KARACHI.getParameters();
                break;
            case "UmmAlQura":
                params = CalculationMethod.UMM_AL_QURA.getParameters();
                break;
            case "NorthAmerica":
                params = CalculationMethod.NORTH_AMERICA.getParameters();
                break;
            case "Kuwait":
                params = CalculationMethod.KUWAIT.getParameters();
                break;
            case "Qatar":
                params = CalculationMethod.QATAR.getParameters();
                break;
            case "Singapore":
                params = CalculationMethod.SINGAPORE.getParameters();
                break;
            case "Tehran":
                warningLog(TAG,
                        "Méthode 'Tehran' sélectionnée, utilisation fallback MUSLIM_WORLD_LEAGUE car la constante exacte n'est pas trouvée.");
                params = CalculationMethod.MUSLIM_WORLD_LEAGUE.getParameters(); // Fallback temporaire
                break;
            case "MuslimWorldLeague":
            default:
                params = CalculationMethod.MUSLIM_WORLD_LEAGUE.getParameters();
                break;
        }
        // Madhab (pour Asr) - pourrait être un paramètre utilisateur aussi
        // params.madhab = Madhab.HANAFI; // ou Madhab.STANDARD (Shafi, Maliki, Hanbali)
        return params;
    }

    private void scheduleAdhanAlarmInternal(Context context, AlarmManager alarmManager, String prayerName,
            long triggerAtMillis, String adhanSound, String language) {
        Intent intent = new Intent(context, AdhanReceiver.class);
        intent.setAction("com.drogbinho.prayertimesapp2.ACTION_ADHAN_ALARM");
        intent.putExtra("ADHAN_SOUND", adhanSound);
        intent.putExtra("PRAYER_LABEL", prayerName);
        // Utilise les mêmes clés que le JavaScript pour la cohérence
        intent.putExtra("NOTIF_TITLE", getLocalizedText(context, "adhan_notification_title", language, "🕌 Adhan"));
        intent.putExtra("NOTIF_BODY",
                getLocalizedText(context, "adhan_notification_body", language,
                        "It is time to pray {{prayer}}! May Allah accept your prayer.")
                        .replace("{{prayer}}", getPrayerDisplayNameForLocale(prayerName, language)));

        int requestCode = prayerName.hashCode();
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAtMillis, null), pendingIntent);
            debugLog(TAG, "Réprogram: Adhan programmé pour " + prayerName + " à " + new Date(triggerAtMillis));
        } catch (Exception e) {
            errorLog(TAG, "Réprogram: Erreur Adhan " + prayerName + ": " + e.getMessage());
        }
    }

    private void scheduleReminderInternal(Context context, AlarmManager alarmManager, String prayerName,
            long prayerTimestamp, int offsetMinutes, String language) {
        long triggerAtMillis = prayerTimestamp - (offsetMinutes * 60 * 1000L);
        if (triggerAtMillis <= System.currentTimeMillis()) {
            debugLog(TAG, "Réprogram: Rappel pour " + prayerName + " ignoré (dans le passé).");
            return;
        }

        Intent intent = new Intent(context, PrayerReminderReceiver.class);
        // Utilise les mêmes clés que le JavaScript pour la cohérence
        intent.putExtra("TITLE", getLocalizedText(context, "prayer_reminder_title", language, "⏰ Prayer Reminder"));
        intent.putExtra("BODY",
                getLocalizedText(context, "prayer_reminder_body", language,
                        "The {{prayer}} prayer is in {{minutes}} minutes.")
                        .replace("{{prayer}}", getPrayerDisplayNameForLocale(prayerName, language))
                        .replace("{{minutes}}", String.valueOf(offsetMinutes)));
        intent.putExtra("PRAYER_LABEL", prayerName);

        // Ajouter préfixe "AUTO_" pour éviter les conflits avec la programmation
        // manuelle
        int requestCode = ("AUTO_reminder_" + prayerName + "_" + triggerAtMillis).hashCode();
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAtMillis, null), pendingIntent);
            debugLog(TAG, "Réprogram: Rappel programmé pour " + prayerName + " à " + new Date(triggerAtMillis));
        } catch (Exception e) {
            errorLog(TAG, "Réprogram: Erreur Rappel " + prayerName + ": " + e.getMessage());
        }
    }

    private void scheduleDhikrInternal(Context context, AlarmManager alarmManager, String dhikrType, String prayerName,
            long prayerTimestamp, int delayMinutes, String language) {
        DhikrContent dhikrContent = getRandomDhikrContent(context, dhikrType, language);

        String title;
        String body;

        if (dhikrContent != null) {
            title = dhikrContent.title;
            body = dhikrContent.body;
            debugLog(TAG, "Dhikr trouvé pour " + dhikrType + ": " + title);
        } else {
            warningLog(TAG, "Aucun contenu Dhikr trouvé pour Type=" + dhikrType + ", Langue=" + language
                    + ". Utilisation de placeholders.");
            title = getLocalizedText(context, "dhikr_dua", language, "Dhikr & Dua");
            String categoryName = getDhikrCategoryDisplayTitle(dhikrType, language, false, "Dhikr");
            body = getLocalizedText(context, "dhikr_generic_placeholder_body", language, "N'oubliez pas votre Dhikr")
                    + " (" + categoryName + ")";
        }

        Intent intent = new Intent(context, DhikrReceiver.class);
        intent.putExtra("TYPE", dhikrType);
        intent.putExtra("TITLE", title);
        intent.putExtra("BODY", body);
        intent.putExtra("PRAYER_LABEL", prayerName);

        long triggerMillis = prayerTimestamp + ((long) delayMinutes * 60 * 1000);
        if (triggerMillis <= System.currentTimeMillis()) {
            debugLog(TAG, "Dhikr pour " + dhikrType + " (" + prayerName + ") ignoré (déclenchement dans le passé: "
                    + new Date(triggerMillis) + ")");
            return;
        }

        // Ajouter préfixe "AUTO_" pour éviter les conflits avec la programmation
        // manuelle
        int requestCode = ("AUTO_" + dhikrType + "_" + prayerName + "_" + triggerMillis).hashCode();
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerMillis, null), pendingIntent);
            debugLog(TAG,
                    "✅ Dhikr reprogrammé: " + dhikrType + " pour " + prayerName + " à " + new Date(triggerMillis));
        } catch (Exception e) {
            errorLog(TAG, "❌ Erreur reprogrammation dhikr: " + e.getMessage());
        }
    }

    private String loadJSONFromAsset(Context context, String fileName) {
        String json;
        try (InputStream is = context.getAssets().open(fileName)) {
            int size = is.available();
            byte[] buffer = new byte[size];
            is.read(buffer);
            json = new String(buffer, StandardCharsets.UTF_8);
        } catch (IOException ex) {
            errorLog(TAG, "Erreur lecture JSON depuis assets: " + fileName, ex);
            return null;
        }
        return json;
    }

    private String getDhikrJsonPath(String dhikrType, String language) {
        String folder;
        String filePrefix;
        switch (dhikrType) {
            case "afterSalah":
                folder = "dhikr-after-salah";
                filePrefix = "afterSalah";
                break;
            case "dhikrMorning":
                folder = "morning-dhikr";
                filePrefix = "morning";
                break;
            case "eveningDhikr":
                folder = "evening-dhikr";
                filePrefix = "evening";
                break;
            case "selectedDua":
                folder = "selected-dua";
                filePrefix = "selected";
                break;
            default:
                warningLog(TAG, "Type de Dhikr inconnu pour JSON Path: " + dhikrType);
                return null;
        }
        return "data/" + folder + "/" + filePrefix + "." + language + ".json";
    }

    // Surchargé pour un fallback plus simple quand includeBrackets n'est pas
    // pertinent
    private String getDhikrCategoryDisplayTitle(String dhikrType, String language, boolean includeBrackets,
            String defaultCategoryTitle) {
        String categoryKey;
        String defaultTitleText = defaultCategoryTitle; // Fallback si la clé n'est pas trouvée

        switch (dhikrType) {
            case "afterSalah":
                categoryKey = "dhikr_category_after_salah";
                defaultTitleText = "Dhikr après la Prière";
                break;
            case "dhikrMorning":
                categoryKey = "dhikr_category_morning";
                defaultTitleText = "Dhikr du Matin";
                break;
            case "eveningDhikr":
                categoryKey = "dhikr_category_evening";
                defaultTitleText = "Dhikr du Soir";
                break;
            case "selectedDua":
                categoryKey = "dhikr_category_selected_dua";
                defaultTitleText = "Doua Sélectionnée";
                break;
            default:
                categoryKey = "dhikr_category_general";
                defaultTitleText = "Dhikr";
        }
        String localizedTitle = getLocalizedText(this, categoryKey, language, defaultTitleText);
        return includeBrackets ? "[" + localizedTitle + "]" : localizedTitle;
    }

    private DhikrContent getRandomDhikrContent(Context context, String dhikrType, String language) {
        // Utiliser les mêmes chemins que le JavaScript pour charger les fichiers dhikr
        String filePath;
        switch (dhikrType) {
            case "afterSalah":
                filePath = "aftersalah." + language + ".json";
                break;
            case "dhikrMorning":
                filePath = "morning." + language + ".json";
                break;
            case "eveningDhikr":
                filePath = "evening." + language + ".json";
                break;
            case "selectedDua":
                filePath = "selected." + language + ".json";
                break;
            default:
                warningLog(TAG, "Type de Dhikr inconnu: " + dhikrType);
                return null;
        }

        String dhikrJsonString = loadJSONFromAsset(context, filePath);

        if (dhikrJsonString == null) {
            if (!"en".equals(language)) { // Fallback vers l'anglais
                warningLog(TAG,
                        "Fichier Dhikr non trouvé pour '" + language + "', fallback vers 'en' pour " + dhikrType);
                String fallbackPath = filePath.replace("." + language + ".", ".en.");
                dhikrJsonString = loadJSONFromAsset(context, fallbackPath);
            }
            if (dhikrJsonString == null) { // Si toujours null après fallback
                errorLog(TAG, "Fichier Dhikr non chargé (même en fallback) pour: " + dhikrType);
                return null;
            }
        }

        try {
            JSONArray dhikrArray = new JSONArray(dhikrJsonString);
            if (dhikrArray.length() == 0) {
                warningLog(TAG, "Tableau Dhikr vide pour: " + filePath);
                return null;
            }

            // Les fichiers séparés n'ont pas besoin de filtrage par catégorie, tous les
            // dhikrs sont de la bonne catégorie
            JSONObject randomDhikrJson = dhikrArray.getJSONObject(new Random().nextInt(dhikrArray.length()));
            debugLog(TAG, "Dhikr sélectionné pour " + dhikrType + ": " + randomDhikrJson.optString("title", ""));

            String itemSpecificTitle = randomDhikrJson.optString("title", "");
            String arabic = randomDhikrJson.optString("arabic", "");
            String translation = randomDhikrJson.optString("translation", "");
            String latin = randomDhikrJson.optString("latin", "");

            // Titre de la notification: "Dhikr & Dua" (ou localisé)
            String notificationTitle = getLocalizedText(context, "dhikr_dua", language, "Dhikr & Dua");

            // Corps de la notification
            String categoryDisplayLabel = getDhikrCategoryDisplayTitle(dhikrType, language, true, "Dhikr"); // ex:
                                                                                                            // "[Dhikr
                                                                                                            // du
                                                                                                            // Matin]"

            StringBuilder bodyBuilder = new StringBuilder();
            bodyBuilder.append(categoryDisplayLabel);

            if (!itemSpecificTitle.isEmpty()
                    && !categoryDisplayLabel.toLowerCase().contains(itemSpecificTitle.toLowerCase())) {
                bodyBuilder.append(" - ").append(itemSpecificTitle);
            }
            bodyBuilder.append("\n");

            if (!arabic.isEmpty())
                bodyBuilder.append(arabic);
            if (!translation.isEmpty()) {
                bodyBuilder.append(arabic.isEmpty() ? "\n" : "\n\n").append(translation);
            }
            if (!latin.isEmpty()) {
                bodyBuilder.append((arabic.isEmpty() && translation.isEmpty()) ? "\n" : "\n\n").append(latin);
            }

            // Si le corps est vide (juste la catégorie), ajouter un message par défaut
            if (bodyBuilder.toString().trim().equals(categoryDisplayLabel.trim())) {
                bodyBuilder.append("\n").append(
                        getLocalizedText(context, "dhikr_default_body_if_empty", language, "N'oubliez pas Allah."));
            }

            return new DhikrContent(notificationTitle, bodyBuilder.toString());

        } catch (JSONException e) {
            errorLog(TAG, "Erreur parsing JSON Dhikr: " + filePath, e);
            return null;
        }
    }

    private String getLocalizedText(Context context, String resourceKey, String languageCode, String fallbackText) {
        try {
            Locale desiredLocale = new Locale(languageCode);
            Configuration conf = new Configuration(context.getResources().getConfiguration());
            conf.setLocale(desiredLocale);
            Context localizedContext = context.createConfigurationContext(conf);
            Resources res = localizedContext.getResources();
            int resourceId = res.getIdentifier(resourceKey, "string", context.getPackageName());

            if (resourceId == 0) {
                warningLog(TAG, "Clé de ressource non trouvée: '" + resourceKey + "' pour lang '" + languageCode
                        + "'. Utilisation fallback: '" + fallbackText + "'");
                return fallbackText;
            }
            return res.getString(resourceId);
        } catch (Exception e) {
            errorLog(TAG, "Erreur getLocalizedText pour '" + resourceKey + "': " + e.getMessage()
                    + ". Utilisation fallback: '" + fallbackText + "'");
            return fallbackText;
        }
    }

    // Version sans fallback explicite, utilise la clé comme fallback
    private String getLocalizedText(Context context, String resourceKey, String languageCode) {
        return getLocalizedText(context, resourceKey, languageCode, resourceKey);
    }

    private String getPrayerDisplayNameForLocale(String prayerName, String languageCode) {
        String resourceKey = prayerName.toLowerCase(); // Ex: "fajr", "dhuhr"
        // Utilise la version de getLocalizedText qui prend un fallback, ici le nom de
        // la prière original si la clé n'est pas trouvée.
        String localizedName = getLocalizedText(this, resourceKey, languageCode, prayerName);

        // Si la clé elle-même est retournée et que ce n'est pas le nom de la prière
        // original (cas où la clé n'existe pas ET le fallback était la clé)
        // ou si le nom localisé est vide, retourne le nom de prière original pour
        // assurer un affichage.
        if (localizedName.equals(resourceKey) || localizedName.isEmpty()) {
            return prayerName;
        }
        return localizedName;
    }

    private void scheduleAdhanAlarmInternalWithSuffix(Context context, AlarmManager alarmManager, String prayerName,
            long triggerAtMillis, String adhanSound, String language, String suffix) {
        Intent intent = new Intent(context, AdhanReceiver.class);
        intent.setAction("com.drogbinho.prayertimesapp2.ACTION_ADHAN_ALARM");
        intent.putExtra("ADHAN_SOUND", adhanSound);
        intent.putExtra("PRAYER_LABEL", prayerName); // Sans suffixe pour les logs
        // Utilise les mêmes clés que le JavaScript pour la cohérence
        intent.putExtra("NOTIF_TITLE", getLocalizedText(context, "adhan_notification_title", language, "🕌 Adhan"));
        intent.putExtra("NOTIF_BODY",
                getLocalizedText(context, "adhan_notification_body", language,
                        "It is time to pray {{prayer}}! May Allah accept your prayer.")
                        .replace("{{prayer}}", getPrayerDisplayNameForLocale(prayerName, language)));

        int requestCode = (prayerName + suffix).hashCode(); // Avec suffixe pour l'unicité
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAtMillis, null), pendingIntent);
            debugLog(TAG,
                    "Boot Reprog: Adhan programmé pour " + prayerName + suffix + " à " + new Date(triggerAtMillis));
        } catch (Exception e) {
            errorLog(TAG, "Boot Reprog: Erreur Adhan " + prayerName + suffix + ": " + e.getMessage());
        }
    }
}
