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

            // 🔧 CORRECTION BUG WIDGET : Reprogrammer après CHAQUE adhan + sauvegarder
            // horaires
            if (prayerLabel != null || lastPrayerLabel != null) {
                String currentPrayer = prayerLabel != null ? prayerLabel : lastPrayerLabel;
                errorLog(TAG, "🔥 [DÉCLENCHEMENT] Arrêt " + currentPrayer + " - Reprogrammation + Widget");

                // Appel unifié pour toutes les prières (y compris Isha)
                reprogramRemainingPrayersAndTomorrow(currentPrayer);

                // 📱 MISE À JOUR DU WIDGET après chaque adhan
                try {
                    PrayerTimesWidget.forceUpdateWidgets(this);
                    errorLog(TAG, "📱 Widget mis à jour après " + currentPrayer);
                } catch (Exception e) {
                    errorLog(TAG, "❌ Erreur mise à jour widget: " + e.getMessage(), e);
                }
            } else {
                errorLog(TAG, "❌ [PROBLÈME] Aucune prière détectée pour reprogrammation");
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

        debugLog(TAG, "🔊 ============ DEBUG SONS ADHAN ============");
        debugLog(TAG, "  - adhanSoundKey (Intent): " + adhanSoundKey);
        debugLog(TAG, "  - soundFromPrefs (SharedPrefs): " + soundFromPrefs);
        debugLog(TAG, "  - soundToPlay (Final): " + soundToPlay);
        debugLog(TAG, "  - volume: " + volume);
        debugLog(TAG, "  - prayerLabel: " + prayerLabelForCompletion);
        debugLog(TAG, "📢 Tentative de lecture Adhan: " + soundToPlay + " pour " + prayerLabelForCompletion);

        // Vérifier d'abord si c'est un son premium téléchargé
        if (isPremiumSound(soundToPlay)) {
            debugLog(TAG, "🔍 SON PREMIUM DÉTECTÉ: " + soundToPlay);
            debugLog(TAG, "🔍 Recherche du fichier premium...");
            String premiumFilePath = getPremiumSoundPath(soundToPlay);
            debugLog(TAG, "🔍 Chemin retourné par getPremiumSoundPath: " + premiumFilePath);

            if (premiumFilePath != null) {
                java.io.File premiumFile = new java.io.File(premiumFilePath);
                debugLog(TAG, "🔍 Vérification fichier: " + premiumFilePath);
                debugLog(TAG, "🔍 Fichier existe: " + premiumFile.exists());
                debugLog(TAG, "🔍 Fichier taille: " + (premiumFile.exists() ? premiumFile.length() + " bytes" : "N/A"));

                if (premiumFile.exists()) {
                    debugLog(TAG, "✅ FICHIER PREMIUM TROUVÉ: " + premiumFilePath);
                    debugLog(TAG, "🎵 LECTURE DU SON PREMIUM...");
                    playPremiumAdhanSound(premiumFilePath, volume, prayerLabelForCompletion);
                    return;
                } else {
                    errorLog(TAG, "❌ FICHIER PREMIUM MANQUANT: " + premiumFilePath);
                }
            } else {
                errorLog(TAG, "❌ AUCUN CHEMIN PREMIUM TROUVÉ pour: " + soundToPlay);
            }

            debugLog(TAG, "🔄 FALLBACK vers sons par défaut...");
        } else {
            debugLog(TAG, "ℹ️ Son standard détecté: " + soundToPlay);
        }

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

        // DIAGNOSTIC SPÉCIAL POUR MASJIDQUBA
        if (resId == 0 && "masjidquba".equals(soundToPlay)) {
            errorLog(TAG, "❌ DIAGNOSTIC MASJIDQUBA: Fichier non trouvé avec getIdentifier()");

            // Essayer différentes variantes du nom
            String[] alternatives = {
                    "masjidquba",
                    "masjid_quba",
                    "masjid-quba",
                    "MasjidQuba",
                    "masjid_al_quba",
                    "masjid-al-quba"
            };

            for (String alt : alternatives) {
                int altResId = getResources().getIdentifier(alt, "raw", getPackageName());
                debugLog(TAG, "🔍 Test alternative '" + alt + "': resId = " + altResId);
                if (altResId != 0) {
                    resId = altResId;
                    errorLog(TAG, "✅ MASJIDQUBA trouvé avec variante: '" + alt + "' (resId: " + resId + ")");
                    break;
                }
            }

            // Si toujours pas trouvé, essayer d'accéder directement au fichier R.raw
            if (resId == 0) {
                try {
                    // Essayer d'accéder directement via réflexion
                    Class<?> rawClass = Class.forName(getPackageName() + ".R$raw");
                    java.lang.reflect.Field masjidField = rawClass.getField("masjidquba");
                    resId = masjidField.getInt(null);
                    errorLog(TAG, "✅ MASJIDQUBA trouvé via réflexion R.raw: " + resId);
                } catch (Exception e) {
                    errorLog(TAG, "❌ Échec réflexion R.raw pour masjidquba: " + e.getMessage());
                }
            }
        }

        // DIAGNOSTIC SPÉCIAL POUR ADHANALJAZAER
        if (resId == 0 && "adhanaljazaer".equals(soundToPlay)) {
            errorLog(TAG, "❌ DIAGNOSTIC ADHANALJAZAER: Fichier non trouvé avec getIdentifier()");

            // Essayer différentes variantes du nom
            String[] alternatives = {
                    "adhanaljazaer",
                    "adhan_al_jazaer",
                    "adhan-al-jazaer",
                    "AdhanAlJazaer",
                    "adhan_aljazaer",
                    "adhan-aljazaer"
            };

            for (String alt : alternatives) {
                int altResId = getResources().getIdentifier(alt, "raw", getPackageName());
                debugLog(TAG, "🔍 Test alternative '" + alt + "': resId = " + altResId);
                if (altResId != 0) {
                    resId = altResId;
                    errorLog(TAG, "✅ ADHANALJAZAER trouvé avec variante: '" + alt + "' (resId: " + resId + ")");
                    break;
                }
            }

            // Si toujours pas trouvé, essayer d'accéder directement au fichier R.raw
            if (resId == 0) {
                try {
                    // Essayer d'accéder directement via réflexion
                    Class<?> rawClass = Class.forName(getPackageName() + ".R$raw");
                    java.lang.reflect.Field adhanField = rawClass.getField("adhanaljazaer");
                    resId = adhanField.getInt(null);
                    errorLog(TAG, "✅ ADHANALJAZAER trouvé via réflexion R.raw: " + resId);
                } catch (Exception e) {
                    errorLog(TAG, "❌ Échec réflexion R.raw pour adhanaljazaer: " + e.getMessage());
                }
            }
        }

        // DIAGNOSTIC SPÉCIAL POUR AHMADNAFEES
        if (resId == 0 && "ahmadnafees".equals(soundToPlay)) {
            errorLog(TAG, "❌ DIAGNOSTIC AHMADNAFEES: Fichier non trouvé avec getIdentifier()");

            // Essayer différentes variantes du nom
            String[] alternatives = {
                    "ahmadnafees",
                    "ahmad_nafees",
                    "ahmad-nafees",
                    "AhmadNafees",
                    "ahmad_nafis",
                    "ahmad-nafis"
            };

            for (String alt : alternatives) {
                int altResId = getResources().getIdentifier(alt, "raw", getPackageName());
                debugLog(TAG, "🔍 Test alternative '" + alt + "': resId = " + altResId);
                if (altResId != 0) {
                    resId = altResId;
                    errorLog(TAG, "✅ AHMADNAFEES trouvé avec variante: '" + alt + "' (resId: " + resId + ")");
                    break;
                }
            }

            // Si toujours pas trouvé, essayer d'accéder directement au fichier R.raw
            if (resId == 0) {
                try {
                    // Essayer d'accéder directement via réflexion
                    Class<?> rawClass = Class.forName(getPackageName() + ".R$raw");
                    java.lang.reflect.Field ahmadField = rawClass.getField("ahmadnafees");
                    resId = ahmadField.getInt(null);
                    errorLog(TAG, "✅ AHMADNAFEES trouvé via réflexion R.raw: " + resId);
                } catch (Exception e) {
                    errorLog(TAG, "❌ Échec réflexion R.raw pour ahmadnafees: " + e.getMessage());
                }
            }
        }

        // DIAGNOSTIC SPÉCIAL POUR AHMEDELKOURDI
        if (resId == 0 && "ahmedelkourdi".equals(soundToPlay)) {
            errorLog(TAG, "❌ DIAGNOSTIC AHMEDELKOURDI: Fichier non trouvé avec getIdentifier()");

            // Essayer différentes variantes du nom
            String[] alternatives = {
                    "ahmedelkourdi",
                    "ahmed_elkourdi",
                    "ahmed-elkourdi",
                    "AhmedElKourdi",
                    "ahmed_el_kourdi",
                    "ahmed-el-kourdi"
            };

            for (String alt : alternatives) {
                int altResId = getResources().getIdentifier(alt, "raw", getPackageName());
                debugLog(TAG, "🔍 Test alternative '" + alt + "': resId = " + altResId);
                if (altResId != 0) {
                    resId = altResId;
                    errorLog(TAG, "✅ AHMEDELKOURDI trouvé avec variante: '" + alt + "' (resId: " + resId + ")");
                    break;
                }
            }

            // Si toujours pas trouvé, essayer d'accéder directement au fichier R.raw
            if (resId == 0) {
                try {
                    // Essayer d'accéder directement via réflexion
                    Class<?> rawClass = Class.forName(getPackageName() + ".R$raw");
                    java.lang.reflect.Field ahmedField = rawClass.getField("ahmedelkourdi");
                    resId = ahmedField.getInt(null);
                    errorLog(TAG, "✅ AHMEDELKOURDI trouvé via réflexion R.raw: " + resId);
                } catch (Exception e) {
                    errorLog(TAG, "❌ Échec réflexion R.raw pour ahmedelkourdi: " + e.getMessage());
                }
            }
        }

        // DIAGNOSTIC SPÉCIAL POUR MANSOURZAHRANI
        if (resId == 0 && "mansourzahrani".equals(soundToPlay)) {
            errorLog(TAG, "❌ DIAGNOSTIC MANSOURZAHRANI: Fichier non trouvé avec getIdentifier()");

            // Essayer différentes variantes du nom
            String[] alternatives = {
                    "mansourzahrani",
                    "mansour_zahrani",
                    "mansour-zahrani",
                    "MansourZahrani",
                    "mansour_zahrani",
                    "mansour-zahrani"
            };

            for (String alt : alternatives) {
                int altResId = getResources().getIdentifier(alt, "raw", getPackageName());
                debugLog(TAG, "🔍 Test alternative '" + alt + "': resId = " + altResId);
                if (altResId != 0) {
                    resId = altResId;
                    errorLog(TAG, "✅ MANSOURZAHRANI trouvé avec variante: '" + alt + "' (resId: " + resId + ")");
                    break;
                }
            }

            // Si toujours pas trouvé, essayer d'accéder directement au fichier R.raw
            if (resId == 0) {
                try {
                    // Essayer d'accéder directement via réflexion
                    Class<?> rawClass = Class.forName(getPackageName() + ".R$raw");
                    java.lang.reflect.Field mansourField = rawClass.getField("mansourzahrani");
                    resId = mansourField.getInt(null);
                    errorLog(TAG, "✅ MANSOURZAHRANI trouvé via réflexion R.raw: " + resId);
                } catch (Exception e) {
                    errorLog(TAG, "❌ Échec réflexion R.raw pour mansourzahrani: " + e.getMessage());
                }
            }
        }

        // DIAGNOSTIC SPÉCIAL POUR ISLAMSOBHI
        if (resId == 0 && "islamsobhi".equals(soundToPlay)) {
            errorLog(TAG, "❌ DIAGNOSTIC ISLAMSOBHI: Fichier non trouvé avec getIdentifier()");

            // Essayer différentes variantes du nom
            String[] alternatives = {
                    "islamsobhi",
                    "islam_sobhi",
                    "islam-sobhi",
                    "IslamSobhi",
                    "islam_sobhi",
                    "islam-sobhi"
            };

            for (String alt : alternatives) {
                int altResId = getResources().getIdentifier(alt, "raw", getPackageName());
                debugLog(TAG, "🔍 Test alternative '" + alt + "': resId = " + altResId);
                if (altResId != 0) {
                    resId = altResId;
                    errorLog(TAG, "✅ ISLAMSOBHI trouvé avec variante: '" + alt + "' (resId: " + resId + ")");
                    break;
                }
            }

            // Si toujours pas trouvé, essayer d'accéder directement au fichier R.raw
            if (resId == 0) {
                try {
                    // Essayer d'accéder directement via réflexion
                    Class<?> rawClass = Class.forName(getPackageName() + ".R$raw");
                    java.lang.reflect.Field islamField = rawClass.getField("islamsobhi");
                    resId = islamField.getInt(null);
                    errorLog(TAG, "✅ ISLAMSOBHI trouvé via réflexion R.raw: " + resId);
                } catch (Exception e) {
                    errorLog(TAG, "❌ Échec réflexion R.raw pour islamsobhi: " + e.getMessage());
                }
            }
        }

        if (resId == 0) {
            errorLog(TAG, "❌❌❌ FICHIER AUDIO ADHAN NON TROUVÉ ❌❌❌");
            errorLog(TAG, "   Son demandé: '" + soundToPlay + "'");
            errorLog(TAG, "   Type: " + (isPremiumSound(soundToPlay) ? "PREMIUM" : "BASE"));
            errorLog(TAG, "🔄 TENTATIVE FALLBACK vers 'adhamalsharqawe'");
            errorLog(TAG, "=========================================");

            resId = getResources().getIdentifier("adhamalsharqawe", "raw", getPackageName());

            if (resId == 0) {
                errorLog(TAG, "❌ Fichier audio Adhan fallback non trouvé non plus. Arrêt Adhan.");
                // Simule la fin pour déclencher la logique de stop/reprog
                handleAdhanCompletion(prayerLabelForCompletion);
                return;
            } else {
                errorLog(TAG, "✅ FALLBACK RÉUSSI: Lecture de 'adhamalsharqawe' (ID: " + resId + ")");
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

    // Vérifier si c'est un son premium
    private boolean isPremiumSound(String soundName) {
        return soundName != null && soundName.startsWith("adhan_");
    }

    // Obtenir le chemin du fichier premium téléchargé
    private String getPremiumSoundPath(String soundName) {
        try {
            errorLog(TAG, "🔍 ========== RECHERCHE SON PREMIUM ==========");
            errorLog(TAG, "🔍 Son demandé: " + soundName);

            // Essayer plusieurs noms de bases de données AsyncStorage (pour compatibilité)
            String[] possibleDbNames = {
                    "RCTAsyncLocalStorage_AsyncStorageDatabase",
                    "AsyncStorage",
                    "RCTAsyncLocalStorage"
            };

            String downloadedContentJson = null;
            String foundInDb = null;

            // Essayer chaque nom de base de données
            for (String dbName : possibleDbNames) {
                try {
                    SharedPreferences prefs = getSharedPreferences(dbName, MODE_PRIVATE);
                    downloadedContentJson = prefs.getString("downloaded_premium_content", null);
                    if (downloadedContentJson != null) {
                        foundInDb = dbName;
                        errorLog(TAG, "✅ Données premium trouvées dans: " + dbName);
                        errorLog(TAG, "📦 Contenu JSON (premiers 200 chars): "
                                + downloadedContentJson.substring(0, Math.min(200, downloadedContentJson.length())));
                        break;
                    } else {
                        debugLog(TAG, "❌ Pas de données dans: " + dbName);
                    }
                } catch (Exception e) {
                    debugLog(TAG, "❌ Erreur accès " + dbName + ": " + e.getMessage());
                }
            }

            // Si pas trouvé dans AsyncStorage, essayer dans les préférences dédiées
            if (downloadedContentJson == null) {
                SharedPreferences premiumPrefs = getSharedPreferences("premium_content", MODE_PRIVATE);
                downloadedContentJson = premiumPrefs.getString("downloaded_premium_content", null);
                if (downloadedContentJson != null) {
                    foundInDb = "premium_content";
                    errorLog(TAG, "✅ Données premium trouvées dans premium_content");
                    errorLog(TAG, "📦 Contenu JSON (premiers 200 chars): "
                            + downloadedContentJson.substring(0, Math.min(200, downloadedContentJson.length())));
                } else {
                    errorLog(TAG, "❌ Pas de données dans premium_content non plus");
                }
            }

            // 🚀 NOUVEAU FALLBACK : Si toujours rien, scanner le dossier physique
            // directement
            if (downloadedContentJson == null) {
                errorLog(TAG, "🔍 FALLBACK: Scan du dossier physique...");
                String physicalPath = scanPhysicalDirectoryForAdhan(soundName);
                if (physicalPath != null) {
                    errorLog(TAG, "✅✅✅ FICHIER TROUVÉ PAR SCAN PHYSIQUE ✅✅✅");
                    errorLog(TAG, "   Chemin: " + physicalPath);
                    errorLog(TAG, "=========================================");
                    return physicalPath;
                } else {
                    errorLog(TAG, "❌ Scan physique: Aucun fichier trouvé");
                }
            }

            if (downloadedContentJson != null) {
                errorLog(TAG, "📦 Base de données trouvée dans: " + foundInDb);

                // Parser le JSON pour trouver le chemin du fichier
                org.json.JSONObject downloadedContent = new org.json.JSONObject(downloadedContentJson);
                errorLog(TAG, "🔍 Clés disponibles dans le JSON: " + downloadedContent.keys().toString());
                errorLog(TAG, "🔍 Recherche de la clé: '" + soundName + "'");

                // 🚀 NOUVEAU : Générer plusieurs variantes du nom pour maximiser les chances de trouver le fichier
                java.util.List<String> soundNameVariants = new java.util.ArrayList<>();
                soundNameVariants.add(soundName); // Nom original
                
                // Variante sans préfixe "adhan_"
                if (soundName.startsWith("adhan_")) {
                    soundNameVariants.add(soundName.substring(6)); // Enlever "adhan_"
                    errorLog(TAG, "🔄 Variante ajoutée (sans préfixe): " + soundName.substring(6));
                } else {
                    // Variante avec préfixe "adhan_"
                    soundNameVariants.add("adhan_" + soundName);
                    errorLog(TAG, "🔄 Variante ajoutée (avec préfixe): adhan_" + soundName);
                }

                // Essayer chaque variante
                for (String variant : soundNameVariants) {
                    errorLog(TAG, "🔍 Test variante: '" + variant + "'");
                    
                    if (downloadedContent.has(variant)) {
                        errorLog(TAG, "✅ Clé trouvée dans JSON: " + variant);
                        org.json.JSONObject contentInfo = downloadedContent.getJSONObject(variant);
                        String filePath = contentInfo.getString("downloadPath");
                        errorLog(TAG, "📁 Chemin extrait: " + filePath);

                        // Vérifier que le fichier existe vraiment
                        java.io.File file = new java.io.File(filePath);
                        if (file.exists()) {
                            long fileSize = file.length();
                            errorLog(TAG, "✅✅✅ FICHIER PREMIUM TROUVÉ ✅✅✅");
                            errorLog(TAG, "   Variante utilisée: " + variant);
                            errorLog(TAG, "   Chemin: " + filePath);
                            errorLog(TAG, "   Taille: " + fileSize + " bytes");
                            errorLog(TAG, "=========================================");
                            return filePath;
                        } else {
                            errorLog(TAG, "⚠️ Clé trouvée mais fichier manquant: " + filePath);
                            // Continuer avec la prochaine variante
                        }
                    }
                }

                // Si aucune variante n'a fonctionné
                errorLog(TAG, "❌❌❌ AUCUNE VARIANTE TROUVÉE DANS JSON ❌❌❌");
                errorLog(TAG, "   Clé recherchée: '" + soundName + "'");
                errorLog(TAG, "   Variantes testées: " + soundNameVariants.toString());
                errorLog(TAG, "   Clés disponibles: " + downloadedContent.keys().toString());
                errorLog(TAG, "🔍 FALLBACK: Tentative scan physique...");
                
                // 🚀 FALLBACK : Scanner le dossier physique même si JSON existe
                String physicalPath = scanPhysicalDirectoryForAdhan(soundName);
                if (physicalPath != null) {
                    errorLog(TAG, "✅✅✅ FICHIER TROUVÉ PAR SCAN PHYSIQUE (malgré JSON présent) ✅✅✅");
                    errorLog(TAG, "   Chemin: " + physicalPath);
                    errorLog(TAG, "=========================================");
                    return physicalPath;
                }
                
                errorLog(TAG, "=========================================");
            } else {
                errorLog(TAG, "❌❌❌ AUCUNE BASE DE DONNÉES TROUVÉE ❌❌❌");
                errorLog(TAG, "   Testé: AsyncStorage + premium_content");
                errorLog(TAG, "=========================================");
            }
        } catch (Exception e) {
            errorLog(TAG, "❌ Erreur récupération chemin premium: " + e.getMessage());
        }
        return null;
    }

    // 🚀 NOUVEAU : Scanner le dossier physique pour trouver le fichier Adhan
    private String scanPhysicalDirectoryForAdhan(String soundName) {
        try {
            errorLog(TAG, "📁 Début scan physique pour: " + soundName);

            // Chemin du dossier premium_content
            java.io.File premiumDir = new java.io.File(getFilesDir(), "premium_content");

            if (!premiumDir.exists() || !premiumDir.isDirectory()) {
                errorLog(TAG, "❌ Dossier premium_content n'existe pas: " + premiumDir.getAbsolutePath());
                return null;
            }

            errorLog(TAG, "📁 Dossier trouvé: " + premiumDir.getAbsolutePath());

            // Lister tous les fichiers .mp3
            java.io.File[] files = premiumDir.listFiles(new java.io.FileFilter() {
                @Override
                public boolean accept(java.io.File file) {
                    return file.isFile() && file.getName().endsWith(".mp3");
                }
            });

            if (files == null || files.length == 0) {
                errorLog(TAG, "❌ Aucun fichier .mp3 trouvé dans le dossier");
                return null;
            }

            errorLog(TAG, "📦 " + files.length + " fichiers .mp3 trouvés");

            // 🚀 NOUVEAU : Générer plusieurs variantes du nom de fichier pour maximiser les chances
            java.util.List<String> targetFileNames = new java.util.ArrayList<>();
            targetFileNames.add(soundName + ".mp3"); // Nom original
            
            // Variante sans préfixe "adhan_"
            if (soundName.startsWith("adhan_")) {
                targetFileNames.add(soundName.substring(6) + ".mp3"); // Enlever "adhan_"
                errorLog(TAG, "🔄 Variante fichier ajoutée: " + soundName.substring(6) + ".mp3");
            } else {
                // Variante avec préfixe "adhan_"
                targetFileNames.add("adhan_" + soundName + ".mp3");
                errorLog(TAG, "🔄 Variante fichier ajoutée: adhan_" + soundName + ".mp3");
            }

            // Chercher le fichier qui correspond à l'une des variantes
            for (java.io.File file : files) {
                String fileName = file.getName();
                
                for (String targetFileName : targetFileNames) {
                    if (fileName.equals(targetFileName)) {
                        errorLog(TAG, "✅ CORRESPONDANCE TROUVÉE: " + file.getAbsolutePath());
                        errorLog(TAG, "   Variante: " + targetFileName);
                        errorLog(TAG, "📏 Taille: " + file.length() + " bytes");

                        // Vérifier que le fichier n'est pas vide ou corrompu
                        if (file.length() > 10000) { // Au moins 10KB pour un fichier audio valide
                            return file.getAbsolutePath();
                        } else {
                            errorLog(TAG, "⚠️ Fichier trop petit (probablement corrompu): " + file.length() + " bytes");
                        }
                    }
                }
            }

            errorLog(TAG, "❌ Aucun fichier correspondant trouvé");
            errorLog(TAG, "   Variantes recherchées: " + targetFileNames.toString());
            
            // Log tous les fichiers disponibles pour debug
            errorLog(TAG, "📂 Fichiers disponibles dans le dossier:");
            for (java.io.File file : files) {
                errorLog(TAG, "   - " + file.getName());
            }

        } catch (Exception e) {
            errorLog(TAG, "❌ Erreur scan physique: " + e.getMessage());
            e.printStackTrace();
        }

        return null;
    }

    // Jouer un son premium depuis le système de fichiers
    private void playPremiumAdhanSound(String filePath, float volume, String prayerLabelForCompletion) {
        try {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(filePath);
            mediaPlayer.prepare();

            // Vérifier si cette prière est muette par l'utilisateur
            boolean isPrayerMutedByUser = isPrayerMuted(prayerLabelForCompletion);

            if (isPrayerMutedByUser) {
                debugLog(TAG, "Prière " + prayerLabelForCompletion + " est muette par l'utilisateur. Volume à 0.");
                mediaPlayer.setVolume(0, 0);
            } else {
                mediaPlayer.setVolume(volume, volume);
                debugLog(TAG,
                        "Adhan premium joué avec volume configuré: " + volume + " pour " + prayerLabelForCompletion);
            }

            mediaPlayer.setOnCompletionListener(mp -> {
                debugLog(TAG, "Adhan premium terminé pour: " + prayerLabelForCompletion);
                handleAdhanCompletion(prayerLabelForCompletion);
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                errorLog(TAG, "Erreur MediaPlayer premium: what=" + what + ", extra=" + extra);
                handleAdhanCompletion(prayerLabelForCompletion);
                return true;
            });

            mediaPlayer.start();
            debugLog(TAG, "Adhan premium démarré pour: " + prayerLabelForCompletion);

        } catch (Exception e) {
            errorLog(TAG, "❌ Erreur lecture fichier premium: " + e.getMessage(), e);
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
        // 🚀 NOUVEAU : Vérifier si la dua après l'adhan est activée
        SharedPreferences settingsPrefs = getSharedPreferences("prayer_times_settings", MODE_PRIVATE);
        boolean duaAfterAdhanEnabled = settingsPrefs.getBoolean("dua_after_adhan_enabled", false); // Par défaut
                                                                                                   // désactivé

        if (!duaAfterAdhanEnabled) {
            debugLog(TAG, "Dua après adhan désactivée par l'utilisateur. Passage direct à la terminaison finale.");
            handleFinalCompletion(prayerLabelForCompletion);
            return;
        }

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

        // Titre et corps de la notification selon la langue (lecture depuis les JSON assets)
        String notifTitle = getLocalizedTextFromJson(this, "adhan_completed_title", currentLanguage, "Adhan ended");
        String notifBody = getLocalizedTextFromJson(this, "adhan_completed_body", currentLanguage,
                "The call to prayer for {{prayer}} has been completed.")
                .replace("{{prayer}}", getPrayerDisplayNameForLocale(prayerLabel, currentLanguage));

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
                        getLocalizedTextFromJson(this, "dismiss", currentLanguage, "Dismiss"), dismissPendingIntent);

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

        // 🔧 CORRECTION : Lire depuis les bons SharedPreferences avec les bonnes clés
        String calcMethodName = settingsPrefs.getString("calc_method", "MuslimWorldLeague");
        String adhanSound = adhanPrefs.getString("ADHAN_SOUND", "misharyrachid");

        errorLog(TAG,
                "🔧 Réprogram: Paramètres chargés - CalcMethod: " + calcMethodName + ", AdhanSound: " + adhanSound);

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

    private void reprogramRemainingPrayersAndTomorrow(String completedPrayer) {
        debugLog(TAG, "====> REPROGRAMMATION PRIÈRES RESTANTES + DEMAIN (après " + completedPrayer + ") <====");
        Context context = this;
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        // 1. ANNULATION DES ALARMES EXISTANTES
        debugLog(TAG, "ReprogRest: Annulation des alarmes Adhan existantes...");
        cancelAllAdhanAlarmsOnly(context, alarmManager);

        // 2. LECTURE DES PARAMÈTRES
        SharedPreferences adhanPrefs = getSharedPreferences("adhan_prefs", MODE_PRIVATE);
        SharedPreferences settingsPrefs = getSharedPreferences("prayer_times_settings", MODE_PRIVATE);

        String language = settingsPrefs.getString("current_language", "en");
        String locationMode = settingsPrefs.getString("location_mode", "auto");

        double latitude, longitude;
        if ("manual".equals(locationMode)) {
            latitude = settingsPrefs.getFloat("manual_latitude", 0f);
            longitude = settingsPrefs.getFloat("manual_longitude", 0f);
        } else {
            latitude = settingsPrefs.getFloat("auto_latitude", 0f);
            longitude = settingsPrefs.getFloat("auto_longitude", 0f);
        }

        errorLog(TAG, "🔍 ReprogRest: Coordonnées chargées: lat=" + latitude + ", lon=" + longitude + ", mode="
                + locationMode);

        if (latitude == 0.0 && longitude == 0.0) {
            errorLog(TAG, "❌ ReprogRest: Coordonnées invalides (0,0), reprogrammation annulée.");
            errorLog(TAG, "🔍 ReprogRest: Vérifiez vos paramètres de localisation dans Settings !");
            return;
        }

        // 🔧 CORRECTION : Lire depuis les bons SharedPreferences avec les bonnes clés
        String calcMethodName = settingsPrefs.getString("calc_method", "MuslimWorldLeague");
        String adhanSound = adhanPrefs.getString("ADHAN_SOUND", "misharyrachid");

        errorLog(TAG,
                "🔧 ReprogRest: Paramètres chargés - CalcMethod: " + calcMethodName + ", AdhanSound: " + adhanSound);

        // 3. CALCUL DES HORAIRES AUJOURD'HUI ET DEMAIN
        long currentTimeMillis = System.currentTimeMillis();

        // Paramètres de calcul
        CalculationParameters calcParams = getCalculationParameters(calcMethodName);
        Coordinates coordinates = new Coordinates(latitude, longitude);

        // Aujourd'hui
        Calendar today = Calendar.getInstance();
        DateComponents todayComponents = DateComponents.from(today.getTime());
        PrayerTimes todayTimes = new PrayerTimes(coordinates, todayComponents, calcParams);

        // Demain
        Calendar tomorrow = Calendar.getInstance();
        tomorrow.add(Calendar.DAY_OF_MONTH, 1);
        DateComponents tomorrowComponents = DateComponents.from(tomorrow.getTime());
        PrayerTimes tomorrowTimes = new PrayerTimes(coordinates, tomorrowComponents, calcParams);

        // 4. PROGRAMMER LES PRIÈRES RESTANTES D'AUJOURD'HUI
        String[] prayers = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };
        Date[] todayPrayerTimes = { todayTimes.fajr, todayTimes.dhuhr, todayTimes.asr, todayTimes.maghrib,
                todayTimes.isha };

        // Trouver l'index de la prière qui vient de se terminer
        int completedIndex = -1;
        for (int i = 0; i < prayers.length; i++) {
            if (prayers[i].equals(completedPrayer)) {
                completedIndex = i;
                break;
            }
        }

        errorLog(TAG, "🔍 ReprogRest: Début programmation des prières restantes après " + completedPrayer + " (index "
                + completedIndex + ")");
        errorLog(TAG, "🔍 ReprogRest: Heure actuelle: " + new Date(currentTimeMillis));

        // Programmer les prières restantes d'aujourd'hui (après celle qui vient de se
        // terminer)
        errorLog(TAG, "🔍 AUDIT: Début boucle programmation adhans restants - completedIndex=" + completedIndex
                + ", prayers.length=" + prayers.length);

        for (int i = completedIndex + 1; i < prayers.length; i++) {
            errorLog(TAG, "🔍 AUDIT: Vérification " + prayers[i] + " (index " + i + ") - heure: " + todayPrayerTimes[i]
                    + " vs maintenant: " + new Date(currentTimeMillis));

            if (todayPrayerTimes[i].getTime() > currentTimeMillis) {
                errorLog(TAG, "✅ AUDIT: Aujourd'hui " + prayers[i] + " DOIT être programmé: " + todayPrayerTimes[i]);
                try {
                    scheduleAdhanAlarmInternal(context, alarmManager, prayers[i], todayPrayerTimes[i].getTime(),
                            adhanSound, language);
                    errorLog(TAG, "✅ AUDIT: " + prayers[i] + " programmé avec SUCCÈS !");
                } catch (Exception e) {
                    errorLog(TAG, "❌ AUDIT: ERREUR programmation " + prayers[i] + ": " + e.getMessage());
                }
            } else {
                errorLog(TAG, "❌ AUDIT: " + prayers[i] + " ignoré (dans le passé): " + todayPrayerTimes[i] + " <= "
                        + new Date(currentTimeMillis));
            }
        }

        errorLog(TAG, "🔍 AUDIT: Fin boucle programmation adhans restants");

        // 5. PROGRAMMER TOUTES LES PRIÈRES DE DEMAIN
        Date[] tomorrowPrayerTimes = { tomorrowTimes.fajr, tomorrowTimes.dhuhr, tomorrowTimes.asr,
                tomorrowTimes.maghrib, tomorrowTimes.isha };

        debugLog(TAG, "ReprogRest: Programmation de toutes les prières de demain");
        for (int i = 0; i < prayers.length; i++) {
            debugLog(TAG, "ReprogRest: Demain " + prayers[i] + " programmé: " + tomorrowPrayerTimes[i]);
            scheduleAdhanAlarmInternal(context, alarmManager, prayers[i], tomorrowPrayerTimes[i].getTime(), adhanSound,
                    language);
        }

        // 📱 SAUVEGARDER LES HORAIRES POUR LE WIDGET
        // Si on est après Isha (completedIndex == 4), sauvegarder les horaires de
        // demain
        // Sinon, sauvegarder les horaires d'aujourd'hui
        if (completedIndex == 4) {
            // Après Isha : sauvegarder demain
            savePrayerTimesForWidget(context, tomorrowTimes, tomorrow);
            errorLog(TAG, "📱 Horaires de DEMAIN sauvegardés pour le widget");
        } else {
            // Avant Isha : sauvegarder aujourd'hui
            savePrayerTimesForWidget(context, todayTimes, today);
            errorLog(TAG, "📱 Horaires d'AUJOURD'HUI sauvegardés pour le widget");
        }

        // 6. PROGRAMMER LES RAPPELS ET DHIKRS
        boolean remindersEnabled = settingsPrefs.getBoolean("reminders_enabled", true);
        int reminderOffset = settingsPrefs.getInt("reminder_offset", 10);

        boolean enabledAfterSalah = settingsPrefs.getBoolean("enabled_after_salah", true);
        boolean enabledMorningDhikr = settingsPrefs.getBoolean("enabled_morning_dhikr", true);
        boolean enabledEveningDhikr = settingsPrefs.getBoolean("enabled_evening_dhikr", true);
        boolean enabledSelectedDua = settingsPrefs.getBoolean("enabled_selected_dua", true);
        int delayAfterSalah = settingsPrefs.getInt("delay_after_salah", 15);
        int delayMorningDhikr = settingsPrefs.getInt("delay_morning_dhikr", 10);
        int delayEveningDhikr = settingsPrefs.getInt("delay_evening_dhikr", 10);
        int delaySelectedDua = settingsPrefs.getInt("delay_selected_dua", 15);

        if (remindersEnabled) {
            // Rappels pour les prières restantes d'aujourd'hui
            for (int i = completedIndex + 1; i < prayers.length; i++) {
                if (todayPrayerTimes[i].getTime() > currentTimeMillis) {
                    scheduleReminderInternal(context, alarmManager, prayers[i], todayPrayerTimes[i].getTime(),
                            reminderOffset, language);
                }
            }

            // Rappels pour toutes les prières de demain
            for (int i = 0; i < prayers.length; i++) {
                scheduleReminderInternal(context, alarmManager, prayers[i], tomorrowPrayerTimes[i].getTime(),
                        reminderOffset, language);
            }
        }

        // 7. PROGRAMMER LES DHIKRS POUR LES PRIÈRES RESTANTES + DEMAIN
        // Dhikrs pour les prières restantes d'aujourd'hui
        for (int i = completedIndex + 1; i < prayers.length; i++) {
            if (todayPrayerTimes[i].getTime() > currentTimeMillis) {
                String prayerName = prayers[i];
                long prayerTimestamp = todayPrayerTimes[i].getTime();

                if (enabledAfterSalah) {
                    scheduleDhikrInternal(context, alarmManager, "afterSalah", prayerName, prayerTimestamp,
                            delayAfterSalah, language);
                }
                if (enabledMorningDhikr && "Fajr".equals(prayerName)) {
                    scheduleDhikrInternal(context, alarmManager, "dhikrMorning", prayerName, prayerTimestamp,
                            delayMorningDhikr, language);
                }
                if (enabledEveningDhikr && "Maghrib".equals(prayerName)) {
                    scheduleDhikrInternal(context, alarmManager, "eveningDhikr", prayerName, prayerTimestamp,
                            delayEveningDhikr, language);
                }
                if (enabledSelectedDua
                        && ("Dhuhr".equals(prayerName) || "Asr".equals(prayerName) || "Isha".equals(prayerName))) {
                    scheduleDhikrInternal(context, alarmManager, "selectedDua", prayerName, prayerTimestamp,
                            delaySelectedDua, language);
                }
            }
        }

        // Dhikrs pour toutes les prières de demain
        for (int i = 0; i < prayers.length; i++) {
            String prayerName = prayers[i];
            long prayerTimestamp = tomorrowPrayerTimes[i].getTime();

            if (enabledAfterSalah) {
                scheduleDhikrInternal(context, alarmManager, "afterSalah", prayerName, prayerTimestamp, delayAfterSalah,
                        language);
            }
            if (enabledMorningDhikr && "Fajr".equals(prayerName)) {
                scheduleDhikrInternal(context, alarmManager, "dhikrMorning", prayerName, prayerTimestamp,
                        delayMorningDhikr, language);
            }
            if (enabledEveningDhikr && "Maghrib".equals(prayerName)) {
                scheduleDhikrInternal(context, alarmManager, "eveningDhikr", prayerName, prayerTimestamp,
                        delayEveningDhikr, language);
            }
            if (enabledSelectedDua
                    && ("Dhuhr".equals(prayerName) || "Asr".equals(prayerName) || "Isha".equals(prayerName))) {
                scheduleDhikrInternal(context, alarmManager, "selectedDua", prayerName, prayerTimestamp,
                        delaySelectedDua, language);
            }
        }

        debugLog(TAG, "====> REPROGRAMMATION PRIÈRES RESTANTES + DEMAIN TERMINÉE <====");
        errorLog(TAG, "🔥 REPROGRAMMATION COMPLETE - VERSION AVEC DEBUG");
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

        // 🔧 CORRECTION : Lire depuis les bons SharedPreferences avec les bonnes clés
        String calcMethodName = settingsPrefs.getString("calc_method", "MuslimWorldLeague");
        String adhanSound = adhanPrefs.getString("ADHAN_SOUND", "misharyrachid");

        errorLog(TAG,
                "🔧 Boot Reprog: Paramètres chargés - CalcMethod: " + calcMethodName + ", AdhanSound: " + adhanSound);

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
        debugLog(TAG, "🕐 Heure actuelle: " + new Date(currentTimeMillis));

        // Adhans pour aujourd'hui (prières futures uniquement)
        for (int i = 0; i < prayers.length; i++) {
            if (todayTimes[i].getTime() > currentTimeMillis) {
                debugLog(TAG, "🔵 Aujourd'hui " + prayers[i] + " programmé: " + todayTimes[i] + " (dans " +
                        ((todayTimes[i].getTime() - currentTimeMillis) / 60000) + " min)");
                scheduleAdhanAlarmInternalWithSuffix(context, alarmManager, prayers[i], todayTimes[i].getTime(),
                        adhanSound,
                        language, "_today");
            } else {
                debugLog(TAG, "🔴 Aujourd'hui " + prayers[i] + " PASSÉ: " + todayTimes[i] + " (il y a " +
                        ((currentTimeMillis - todayTimes[i].getTime()) / 60000) + " min)");
            }
        }

        // Adhans pour demain (toutes les prières)
        debugLog(TAG, "🔵 DEMAIN - Programmation de toutes les prières:");
        for (int i = 0; i < prayers.length; i++) {
            debugLog(TAG, "🔵 Demain " + prayers[i] + " programmé: " + tomorrowTimes[i] + " (dans " +
                    ((tomorrowTimes[i].getTime() - currentTimeMillis) / 3600000) + " heures)");
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

        // 📱 SAUVEGARDER LES HORAIRES POUR LE WIDGET
        // Déterminer si on doit afficher aujourd'hui ou demain
        if (now.getTime().after(prayerTimesToday.isha)) {
            // Après Isha : sauvegarder les horaires de demain
            savePrayerTimesForWidget(context, prayerTimesTomorrow, tomorrow);
            errorLog(TAG, "📱 [BOOT] Horaires de DEMAIN sauvegardés pour le widget");
        } else {
            // Avant Isha : sauvegarder les horaires d'aujourd'hui
            savePrayerTimesForWidget(context, prayerTimesToday, now);
            errorLog(TAG, "📱 [BOOT] Horaires d'AUJOURD'HUI sauvegardés pour le widget");
        }

        debugLog(TAG, "====> REPROGRAMMATION APRÈS REDÉMARRAGE TERMINÉE <====");
    }

    private void cancelAllAdhanAlarmsOnly(Context context, AlarmManager alarmManager) {
        String[] prayers = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha" };
        String[] suffixes = { "", "_today", "_tomorrow" }; // Anciens formats
        int cancelCount = 0;

        // 🔧 CORRECTION : Annuler aussi les nouveaux formats avec date
        java.text.SimpleDateFormat dayFormat = new java.text.SimpleDateFormat("yyyyMMdd",
                java.util.Locale.getDefault());
        java.util.Calendar cal = java.util.Calendar.getInstance();

        // Annuler pour aujourd'hui, hier, demain (au cas où)
        for (int dayOffset = -1; dayOffset <= 1; dayOffset++) {
            cal.setTimeInMillis(System.currentTimeMillis());
            cal.add(java.util.Calendar.DAY_OF_YEAR, dayOffset);
            String dayString = dayFormat.format(cal.getTime());

            for (String prayer : prayers) {
                // Nouveau format avec date
                Intent intent = new Intent(context, AdhanReceiver.class);
                intent.setAction("com.drogbinho.prayertimesapp2.ACTION_ADHAN_ALARM");
                int requestCode = (prayer + "_" + dayString).hashCode();
                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        intent,
                        PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);

                if (pendingIntent != null) {
                    alarmManager.cancel(pendingIntent);
                    pendingIntent.cancel();
                    cancelCount++;
                    debugLog(TAG, "Réprogram: Alarme Adhan annulée pour " + prayer + "_" + dayString);
                }

                // Anciens formats pour compatibilité
                for (String suffix : suffixes) {
                    intent = new Intent(context, AdhanReceiver.class);
                    intent.setAction("com.drogbinho.prayertimesapp2.ACTION_ADHAN_ALARM");
                    requestCode = (prayer + suffix).hashCode();
                    pendingIntent = PendingIntent.getBroadcast(
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
                // 🕌 Umm Al-Qura modifié pour utiliser 15° pour Fajr
                params = CalculationMethod.UMM_AL_QURA.getParameters();
                params.fajrAngle = 15.0; // Modifié selon recommandation mosquée
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
        intent.putExtra("NOTIF_TITLE",
                getLocalizedTextFromJson(context, "adhan_notification_title", language, "🕌 Adhan"));
        intent.putExtra("NOTIF_BODY",
                getLocalizedTextFromJson(context, "adhan_notification_body", language,
                        "It is time to pray {{prayer}}! May Allah accept your prayer.")
                        .replace("{{prayer}}", getPrayerDisplayNameForLocale(prayerName, language)));

        // 🔧 CORRECTION BUG : Différencier les requestCode pour aujourd'hui vs demain
        // Ajouter le jour pour éviter les collisions entre aujourd'hui/demain
        java.text.SimpleDateFormat dayFormat = new java.text.SimpleDateFormat("yyyyMMdd",
                java.util.Locale.getDefault());
        String dayString = dayFormat.format(new Date(triggerAtMillis));
        int requestCode = (prayerName + "_" + dayString).hashCode();

        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAtMillis, null), pendingIntent);

            // 🔥 DEBUG CRITIQUE : Log avec tous les détails pour diagnostiquer
            long delayMinutes = (triggerAtMillis - System.currentTimeMillis()) / 60000;
            errorLog(TAG, "🔥 ADHAN PROGRAMMÉ - " + prayerName +
                    " | Timestamp: " + triggerAtMillis +
                    " | Heure: " + new Date(triggerAtMillis) +
                    " | Dans: " + delayMinutes + " min" +
                    " | RequestCode: " + requestCode +
                    " | Jour: " + dayString);

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
        intent.putExtra("TITLE",
                getLocalizedTextFromJson(context, "prayer_reminder_title", language, "⏰ Prayer Reminder"));
        intent.putExtra("BODY",
                getLocalizedTextFromJson(context, "prayer_reminder_body", language,
                        "The {{prayer}} prayer is in {{minutes}} minutes.")
                        .replace("{{prayer}}", getPrayerDisplayNameForLocale(prayerName, language))
                        .replace("{{minutes}}", String.valueOf(offsetMinutes)));
        intent.putExtra("PRAYER_LABEL", prayerName);

        // Même schéma que AdhanModule.schedulePrayerReminders (JS) : écrase les doublons et permet à cancelAllPrayerReminders de tout annuler
        int requestCode = ("reminder_" + prayerName + "_" + triggerAtMillis).hashCode();
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAtMillis, null), pendingIntent);
            NotificationAlarmRegistry.appendReminder(context, prayerName, triggerAtMillis);
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
            title = getLocalizedTextFromJson(context, "dhikr_dua", language, "Dhikr & Dua");
            String categoryName = getDhikrCategoryDisplayTitle(dhikrType, language, false, "Dhikr");
            body = getLocalizedTextFromJson(context, "dhikr_generic_placeholder_body", language,
                    "N'oubliez pas votre Dhikr")
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

        // Même schéma que AdhanModule.scheduleDhikrNotifications (JS)
        int requestCode = (dhikrType + "_" + prayerName + "_" + triggerMillis).hashCode();
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerMillis, null), pendingIntent);
            NotificationAlarmRegistry.appendDhikr(context, dhikrType, prayerName, triggerMillis);
            debugLog(TAG,
                    "✅ Dhikr reprogrammé: " + dhikrType + " pour " + prayerName + " à " + new Date(triggerMillis));
        } catch (Exception e) {
            errorLog(TAG, "❌ Erreur reprogrammation dhikr: " + e.getMessage());
        }
    }

    /**
     * Code langue de base (ex. fr depuis fr-FR) pour correspondre aux assets locales_xx.json.
     */
    private String normalizeLanguageForLocaleAssets(String language) {
        if (language == null || language.isEmpty()) {
            return "en";
        }
        String base = language.trim().toLowerCase(Locale.ROOT);
        int sep = base.indexOf('-');
        if (sep > 0) {
            base = base.substring(0, sep);
        }
        sep = base.indexOf('_');
        if (sep > 0) {
            base = base.substring(0, sep);
        }
        return base.isEmpty() ? "en" : base;
    }

    private String getLocalizedTextFromJson(Context context, String key, String language, String fallback) {
        // Try requested language first, then fallback to English, then hardcoded fallback
        String lang = normalizeLanguageForLocaleAssets(language);
        String[] candidates = { "locales_" + lang + ".json", "locales_en.json" };
        for (String fileName : candidates) {
            String jsonStr = loadJSONFromAsset(context, fileName);
            if (jsonStr != null) {
                try {
                    JSONObject json = new JSONObject(jsonStr);
                    String value = json.optString(key, null);
                    if (value != null && !value.isEmpty()) return value;
                } catch (org.json.JSONException e) {
                    warningLog(TAG, "Erreur parsing JSON locale '" + fileName + "': " + e.getMessage());
                }
            }
        }
        return fallback;
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
                categoryKey = "dhikr_category_afterSalah";
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
                categoryKey = "dhikr_category_selectedDua";
                defaultTitleText = "Doua Sélectionnée";
                break;
            default:
                categoryKey = "dhikr_category_general";
                defaultTitleText = "Dhikr";
        }
        String localizedTitle = getLocalizedTextFromJson(this, categoryKey, language, defaultTitleText);
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
            String notificationTitle = getLocalizedTextFromJson(context, "dhikr_dua", language, "Dhikr & Dua");

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

            // 🔧 CORRECTION : Si la langue est arabe, afficher seulement le texte arabe
            if (!arabic.isEmpty()) {
                bodyBuilder.append(arabic);
            }

            // Pour les langues non-arabes, afficher aussi la traduction et la
            // translittération
            if (!language.equals("ar")) {
                if (!translation.isEmpty()) {
                    bodyBuilder.append(arabic.isEmpty() ? "\n" : "\n\n").append(translation);
                }
                if (!latin.isEmpty()) {
                    bodyBuilder.append((arabic.isEmpty() && translation.isEmpty()) ? "\n" : "\n\n").append(latin);
                }
            }

            // Si le corps est vide (juste la catégorie), ajouter un message par défaut
            if (bodyBuilder.toString().trim().equals(categoryDisplayLabel.trim())) {
                bodyBuilder.append("\n").append(
                        getLocalizedTextFromJson(context, "dhikr_default_body_if_empty", language,
                                "N'oubliez pas Allah."));
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
        String localizedName = getLocalizedTextFromJson(this, resourceKey, languageCode, prayerName);

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
        intent.putExtra("NOTIF_TITLE",
                getLocalizedTextFromJson(context, "adhan_notification_title", language, "🕌 Adhan"));
        intent.putExtra("NOTIF_BODY",
                getLocalizedTextFromJson(context, "adhan_notification_body", language,
                        "It is time to pray {{prayer}}! May Allah accept your prayer.")
                        .replace("{{prayer}}", getPrayerDisplayNameForLocale(prayerName, language)));

        // 🔧 CORRECTION BUG : Utiliser le même système de requestCode avec date
        java.text.SimpleDateFormat dayFormat = new java.text.SimpleDateFormat("yyyyMMdd",
                java.util.Locale.getDefault());
        String dayString = dayFormat.format(new Date(triggerAtMillis));
        int requestCode = (prayerName + "_" + dayString).hashCode();

        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAtMillis, null), pendingIntent);
            debugLog(TAG,
                    "✅ Boot Reprog: Adhan programmé pour " + prayerName + suffix + " à " + new Date(triggerAtMillis) +
                            " (requestCode: " + requestCode + ", jour: " + dayString + ")");
        } catch (Exception e) {
            errorLog(TAG, "❌ Boot Reprog: Erreur Adhan " + prayerName + suffix + ": " + e.getMessage());
        }
    }

    /**
     * 📱 Sauvegarde les horaires de prière pour le widget
     */
    private void savePrayerTimesForWidget(Context context, PrayerTimes prayerTimes, Calendar date) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("prayer_times_settings", MODE_PRIVATE);

            // Format HH:mm pour le widget
            java.text.SimpleDateFormat timeFormat = new java.text.SimpleDateFormat("HH:mm",
                    java.util.Locale.getDefault());

            // Créer le JSON des horaires
            org.json.JSONObject jsonTimes = new org.json.JSONObject();
            jsonTimes.put("Fajr", timeFormat.format(prayerTimes.fajr));
            jsonTimes.put("Sunrise", timeFormat.format(prayerTimes.sunrise));
            jsonTimes.put("Dhuhr", timeFormat.format(prayerTimes.dhuhr));
            jsonTimes.put("Asr", timeFormat.format(prayerTimes.asr));
            jsonTimes.put("Maghrib", timeFormat.format(prayerTimes.maghrib));
            jsonTimes.put("Isha", timeFormat.format(prayerTimes.isha));

            // Sauvegarder la date pour laquelle ces horaires sont valides
            java.text.SimpleDateFormat dateFormat = new java.text.SimpleDateFormat("yyyy-MM-dd",
                    java.util.Locale.getDefault());
            String dateString = dateFormat.format(date.getTime());

            prefs.edit()
                    .putString("today_prayer_times", jsonTimes.toString())
                    .putString("widget_last_date", dateString)
                    .apply();

            errorLog(TAG, "📱 Horaires sauvegardés pour le widget - Date: " + dateString + ", Horaires: "
                    + jsonTimes.toString());

        } catch (Exception e) {
            errorLog(TAG, "❌ Erreur sauvegarde horaires widget: " + e.getMessage(), e);
        }
    }
}
