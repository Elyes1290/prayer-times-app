package com.drogbinho.prayertimesapp2;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaMetadataRetriever;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.util.Log;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;

// 🎯 IMPORTS ANDROIDX CORRIGÉS pour écran de verrouillage
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.support.v4.media.MediaMetadataCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import android.content.SharedPreferences;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;

public class QuranAudioService extends Service {
    private static final String TAG = "QuranAudioService";

    // Interface pour les callbacks vers React Native
    public interface AudioProgressCallback {
        void onAudioProgress(int position, int duration, boolean isPlaying, String surah, String reciter);

        void onAudioStateChanged(boolean isPlaying, String surah, String reciter, int position, int duration);
    }

    // Callback statique pour React Native
    private static AudioProgressCallback audioProgressCallback = null;

    // Méthodes statiques pour gérer le callback
    public static void setAudioProgressCallback(AudioProgressCallback callback) {
        Log.d(TAG, "🔗 Enregistrement du callback React Native");
        audioProgressCallback = callback;
    }

    public static void removeAudioProgressCallback() {
        Log.d(TAG, "🔗 Suppression du callback React Native");
        audioProgressCallback = null;
    }

    private static final String CHANNEL_ID = "quran_audio_channel";
    private static final int NOTIFICATION_ID = 1001;

    // Actions pour le widget
    public static final String ACTION_PLAY_PAUSE = "com.drogbinho.prayertimesapp2.QURAN_WIDGET_PLAY_PAUSE";
    public static final String ACTION_PREVIOUS = "com.drogbinho.prayertimesapp2.QURAN_WIDGET_PREVIOUS";
    public static final String ACTION_NEXT = "com.drogbinho.prayertimesapp2.QURAN_WIDGET_NEXT";
    public static final String ACTION_SEEK = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_SEEK";
    public static final String ACTION_STOP = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_STOP";
    public static final String ACTION_LOAD_AUDIO = "com.drogbinho.prayertimesapp2.LOAD_AUDIO";
    public static final String ACTION_LOAD_SURAH_BY_NUMBER = "com.drogbinho.prayertimesapp2.LOAD_SURAH_BY_NUMBER";

    // Actions pour les broadcasts
    public static final String ACTION_AUDIO_STATE_CHANGED = "com.drogbinho.prayertimesapp2.AUDIO_STATE_CHANGED";
    public static final String ACTION_AUDIO_PROGRESS = "com.drogbinho.prayertimesapp2.AUDIO_PROGRESS";

    // NOUVEAU : Actions pour les options de lecture
    public static final String ACTION_TOGGLE_AUTO_ADVANCE = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_TOGGLE_AUTO_ADVANCE";
    public static final String ACTION_TOGGLE_LOOP = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_TOGGLE_LOOP";

    // NOUVEAU : Actions pour changer de récitateur
    public static final String ACTION_NEXT_RECITER = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_NEXT_RECITER";
    public static final String ACTION_PREVIOUS_RECITER = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_PREVIOUS_RECITER";

    // Variables pour l'audio actuel
    private String currentAudioPath = "";
    private String currentSurah = "";
    private String currentReciter = "";
    private boolean isPlaying = false;
    private int currentPosition = 0;
    private int totalDuration = 0;
    /** Durée catalogue (API) — stabilise la jauge et le clamp du seek */
    private int expectedDurationMs = 0;
    private boolean isMediaReady = false;
    /** Lecture demandée avant la fin de prepareAsync() */
    private boolean pendingAutoPlayAfterPrepare = false;
    private int pendingSeekMs = -1;
    private boolean isPremiumUser = false;
    // 🎯 NOUVEAU : Variable d'instance pour synchronisation widget
    private boolean wasPlayingBeforeNavigation = false;

    // 🎯 SUPPRIMÉ: MediaSession3 et ExoPlayer (causaient double audio)

    // 🎯 MediaSessionCompat OBLIGATOIRE pour contrôles écran de verrouillage
    private MediaSessionCompat mediaSessionCompat;

    /** Pochette ID3 (notification + écran de verrouillage), max ~512px */
    private Bitmap currentAlbumArt = null;
    /** Logo app si aucune pochette dans le MP3 */
    private Bitmap defaultAppAlbumArt = null;
    private static final int ALBUM_ART_MAX_PX = 512;

    // NOUVEAU : Variable pour mémoriser l'état de lecture avant perte de focus
    private boolean wasPlayingBeforeFocusLoss = false;

    // NOUVEAU : Variable pour l'auto-avancement avec boucle
    private boolean autoAdvanceEnabled = true;

    // NOUVEAU : Variable pour la boucle
    private boolean loopEnabled = false;

    // Clés pour SharedPreferences
    private static final String PREFS_NAME = "QuranAudioServicePrefs";
    private static final String KEY_AUDIO_PATH = "currentAudioPath";
    private static final String KEY_SURAH = "currentSurah";
    private static final String KEY_RECITER = "currentReciter";
    private static final String KEY_POSITION = "currentPosition";
    private static final String KEY_DURATION = "totalDuration";
    private static final String KEY_IS_PLAYING = "isPlaying";
    private static final String KEY_IS_PREMIUM = "isPremiumUser";

    // NOUVEAU : Clés pour les options de lecture
    private static final String KEY_AUTO_ADVANCE = "autoAdvanceEnabled";
    private static final String KEY_LOOP_ENABLED = "loopEnabled";

    // Composants audio
    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private NotificationManager notificationManager;
    private AudioFocusRequest audioFocusRequest;
    private android.os.Handler progressHandler;
    private Runnable progressRunnable;
    private Runnable seekResumeTimeoutRunnable;
    private Runnable durationPollRunnable;
    private int durationPollAttempts = 0;
    private int seekGeneration = 0;

    // BroadcastReceiver pour les actions du widget
    private final BroadcastReceiver widgetActionReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            Log.d(TAG, "🎵 BroadcastReceiver reçoit action: " + action);
            Log.d(TAG, "🎵 BroadcastReceiver - Intent complet: " + (intent != null ? intent.toString() : "NULL"));
            Log.d(TAG, "🎵 BroadcastReceiver - Package: " + (intent != null ? intent.getPackage() : "NULL"));

            if (action == null) {
                Log.w(TAG, "⚠️ Action null reçue dans BroadcastReceiver");
                return;
            }

            switch (action) {
                case ACTION_PLAY_PAUSE:
                    Log.d(TAG, "🎵 BroadcastReceiver traite ACTION_PLAY_PAUSE");
                    handlePlayPause();
                    break;
                case ACTION_PREVIOUS:
                    Log.d(TAG, "⏮️ BroadcastReceiver traite ACTION_PREVIOUS");
                    handlePrevious();
                    break;
                case ACTION_NEXT:
                    Log.d(TAG, "⏭️ BroadcastReceiver traite ACTION_NEXT - DÉBUT");
                    Log.d(TAG, "🔍 DIAGNOSTIC BroadcastReceiver - ACTION_NEXT reçue");
                    Log.d(TAG, "🔍 - Intent reçu: " + (intent != null ? "OUI" : "NON"));
                    Log.d(TAG, "🔍 - Package: " + (intent != null ? intent.getPackage() : "NULL"));
                    Log.d(TAG, "🔍 - Action: " + (intent != null ? intent.getAction() : "NULL"));
                    handleNext();
                    Log.d(TAG, "⏭️ BroadcastReceiver traite ACTION_NEXT - FIN");
                    break;
                case ACTION_SEEK:
                    int seekPosition = intent.getIntExtra("position", 0);
                    Log.d(TAG, "🎯 BroadcastReceiver traite ACTION_SEEK: " + seekPosition);
                    handleSeek(seekPosition);
                    break;
                case ACTION_STOP:
                    Log.d(TAG, "⏹️ BroadcastReceiver traite ACTION_STOP");
                    handleStop();
                    break;
                case ACTION_LOAD_AUDIO:
                    Log.d(TAG, "🎵 BroadcastReceiver traite ACTION_LOAD_AUDIO");
                    String audioPath = intent.getStringExtra("audioPath");
                    String surah = intent.getStringExtra("surah");
                    String reciter = intent.getStringExtra("reciter");
                    if (audioPath != null && surah != null && reciter != null) {
                        loadAudio(audioPath, surah, reciter);
                    }
                    break;
                case ACTION_LOAD_SURAH_BY_NUMBER:
                    Log.d(TAG, "🎵 BroadcastReceiver traite ACTION_LOAD_SURAH_BY_NUMBER");
                    int surahNumber = intent.getIntExtra("surahNumber", -1);
                    boolean autoPlay = intent.getBooleanExtra("autoPlay", false);
                    if (surahNumber >= 1 && surahNumber <= 114) {
                        Log.d(TAG, "🎵 Chargement sourate " + surahNumber + " (autoPlay: " + autoPlay + ")");
                        // 🎯 NOUVEAU : Sauvegarder wasPlayingBeforeNavigation depuis autoPlay
                        wasPlayingBeforeNavigation = autoPlay;
                        loadSurahByNumber(surahNumber);
                    } else {
                        Log.e(TAG, "❌ Numéro de sourate invalide: " + surahNumber);
                    }
                    break;
                case ACTION_TOGGLE_AUTO_ADVANCE:
                    Log.d(TAG, "🎵 BroadcastReceiver traite ACTION_TOGGLE_AUTO_ADVANCE");
                    handleToggleAutoAdvance();
                    break;
                case ACTION_TOGGLE_LOOP:
                    Log.d(TAG, "🎵 BroadcastReceiver traite ACTION_TOGGLE_LOOP");
                    handleToggleLoop();
                    break;
                case ACTION_NEXT_RECITER:
                    Log.d(TAG, "🎵 BroadcastReceiver traite ACTION_NEXT_RECITER");
                    switchToNextReciter();
                    break;
                case ACTION_PREVIOUS_RECITER:
                    Log.d(TAG, "🎵 BroadcastReceiver traite ACTION_PREVIOUS_RECITER");
                    switchToPreviousReciter();
                    break;
                default:
                    Log.w(TAG, "⚠️ Action inconnue reçue dans BroadcastReceiver: " + action);
                    break;
            }
        }
    };

    // Binder pour lier le service
    public class LocalBinder extends Binder {
        QuranAudioService getService() {
            return QuranAudioService.this;
        }
    }

    private final IBinder binder = new LocalBinder();

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "🔥 VERSION_DEBUG_LOCK_SCREEN_2025 - QuranAudioService onCreate()");
        Log.d(TAG, "🎵 Service audio Quran créé");

        // Initialiser les composants
        initializeComponents();

        // Restaurer l'état audio depuis SharedPreferences
        restoreAudioState();

        // Vérifier le statut premium AVANT de démarrer en foreground
        checkPremiumStatus();

        // TOUJOURS démarrer en foreground si le service a été démarré avec
        // startForegroundService()
        // Android exige que startForeground() soit appelé dans les 5 secondes
        startForeground(NOTIFICATION_ID, createNotification());
        Log.d(TAG, "🎵 Service démarré en mode foreground (requis par Android)");

        // Enregistrer le BroadcastReceiver pour les actions du widget
        // NOUVEAU : Enregistrer immédiatement dans onCreate() pour s'assurer qu'il est
        // disponible
        try {
            registerWidgetActionReceiver();
            Log.d(TAG, "📡 BroadcastReceiver enregistré dans onCreate()");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur enregistrement BroadcastReceiver dans onCreate: " + e.getMessage());
        }
    }

    /**
     * Enregistrer le BroadcastReceiver pour les actions du widget
     */
    private void registerWidgetActionReceiver() {
        try {
            // NOUVEAU : Vérifier si le receiver est déjà enregistré pour éviter les
            // doublons
            try {
                unregisterReceiver(widgetActionReceiver);
                Log.d(TAG, "📡 BroadcastReceiver désenregistré avant réenregistrement");
            } catch (IllegalArgumentException e) {
                // Le receiver n'était pas enregistré, c'est normal
                Log.d(TAG, "📡 BroadcastReceiver n'était pas enregistré, enregistrement initial");
            }

            IntentFilter filter = new IntentFilter();
            filter.addAction(ACTION_PLAY_PAUSE);
            filter.addAction(ACTION_PREVIOUS);
            filter.addAction(ACTION_NEXT);
            filter.addAction(ACTION_SEEK);
            filter.addAction(ACTION_STOP);
            filter.addAction(ACTION_LOAD_AUDIO);
            filter.addAction(ACTION_LOAD_SURAH_BY_NUMBER);
            filter.addAction(ACTION_TOGGLE_AUTO_ADVANCE);
            filter.addAction(ACTION_TOGGLE_LOOP);
            filter.addAction(ACTION_NEXT_RECITER);
            filter.addAction(ACTION_PREVIOUS_RECITER);

            // NOUVEAU : Ajouter le flag RECEIVER_NOT_EXPORTED pour la sécurité
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(widgetActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(widgetActionReceiver, filter);
            }

            Log.d(TAG, "📡 BroadcastReceiver enregistré pour les actions du widget");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur enregistrement BroadcastReceiver: " + e.getMessage());
        }
    }

    /**
     * Vérifier si le service est en mode foreground
     */
    private boolean isForegroundService() {
        try {
            android.app.ActivityManager am = (android.app.ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
            for (android.app.ActivityManager.RunningServiceInfo service : am.getRunningServices(Integer.MAX_VALUE)) {
                if (QuranAudioService.class.getName().equals(service.service.getClassName())) {
                    return service.foreground;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification mode foreground: " + e.getMessage());
        }
        return false;
    }

    /**
     * Initialiser les composants du service
     */
    private void initializeComponents() {
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        progressHandler = new android.os.Handler();

        // Créer le canal de notification
        createNotificationChannel();

        // Initialiser le MediaPlayer
        initializeMediaPlayer();

        // 🎵 Initialiser MediaSession3 pour les contrôles d'écran de verrouillage
        Log.d(TAG, "🔍 DEBUG - Démarrage initialisation MediaSession dans onCreate()");
        initializeMediaSession();
        Log.d(TAG, "🔍 DEBUG - Fin initialisation MediaSession dans onCreate()");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "🚨🚨🚨 NOUVELLE VERSION DEBUG 2025 - onStartCommand() 🚨🚨🚨");
        Log.d(TAG, "🎵 Service audio Quran démarré - startId: " + startId);
        Log.d(TAG, "🎵 Intent reçu: " + (intent != null ? "OUI" : "NON"));
        Log.d(TAG, "🎵 Action: " + (intent != null && intent.getAction() != null ? intent.getAction() : "NULL"));
        Log.d(TAG, "🎵 Flags: " + flags + ", startId: " + startId);

        // Vérifier le statut premium
        checkPremiumStatus();

        // Le BroadcastReceiver est déjà enregistré dans onCreate()
        Log.d(TAG, "📡 BroadcastReceiver déjà enregistré dans onCreate()");

        // Le service est déjà en foreground depuis onCreate()
        // Juste mettre à jour la notification si nécessaire
        updateNotification();
        Log.d(TAG, "🎵 Notification mise à jour dans onStartCommand");

        // Traiter l'action si elle existe
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            Log.d(TAG, "🎵 Action reçue dans onStartCommand: " + action + " (startId: " + startId + ")");

            switch (action) {
                case ACTION_PLAY_PAUSE:
                    Log.d(TAG, "🎵 Traitement ACTION_PLAY_PAUSE - État actuel isPlaying: " + isPlaying);
                    handlePlayPause();
                    break;
                case ACTION_PREVIOUS:
                    Log.d(TAG, "🎵 Traitement ACTION_PREVIOUS");
                    handlePrevious();
                    break;
                case ACTION_NEXT:
                    Log.d(TAG, "🎵 Traitement ACTION_NEXT");
                    handleNext();
                    break;
                case ACTION_SEEK:
                    int seekPosition = intent.getIntExtra("position", 0);
                    Log.d(TAG, "🎵 Traitement ACTION_SEEK: " + seekPosition);
                    handleSeek(seekPosition);
                    break;
                case ACTION_STOP:
                    Log.d(TAG, "🎵 Traitement ACTION_STOP");
                    handleStop();
                    break;
                case ACTION_LOAD_AUDIO:
                    Log.d(TAG, "🎵 Traitement ACTION_LOAD_AUDIO");
                    String audioPath = intent.getStringExtra("audioPath");
                    String surah = intent.getStringExtra("surah");
                    String reciter = intent.getStringExtra("reciter");
                    if (audioPath != null && surah != null && reciter != null) {
                        loadAudio(audioPath, surah, reciter);
                    }
                    break;
                case ACTION_LOAD_SURAH_BY_NUMBER:
                    Log.d(TAG, "🎵 Traitement ACTION_LOAD_SURAH_BY_NUMBER");
                    int surahNumber = intent.getIntExtra("surahNumber", -1);
                    boolean autoPlay = intent.getBooleanExtra("autoPlay", false);
                    if (surahNumber >= 1 && surahNumber <= 114) {
                        Log.d(TAG, "🎵 Chargement sourate " + surahNumber + " (autoPlay: " + autoPlay + ")");
                        // 🎯 NOUVEAU : Sauvegarder wasPlayingBeforeNavigation depuis autoPlay
                        this.wasPlayingBeforeNavigation = autoPlay;
                        loadSurahByNumber(surahNumber);
                    } else {
                        Log.e(TAG, "❌ Numéro de sourate invalide: " + surahNumber);
                    }
                    break;
                case ACTION_TOGGLE_AUTO_ADVANCE:
                    Log.d(TAG, "�� Traitement ACTION_TOGGLE_AUTO_ADVANCE");
                    handleToggleAutoAdvance();
                    break;
                case ACTION_TOGGLE_LOOP:
                    Log.d(TAG, "�� Traitement ACTION_TOGGLE_LOOP");
                    handleToggleLoop();
                    break;
                case ACTION_NEXT_RECITER:
                    Log.d(TAG, "�� Traitement ACTION_NEXT_RECITER");
                    switchToNextReciter();
                    break;
                case ACTION_PREVIOUS_RECITER:
                    Log.d(TAG, "🎵 Traitement ACTION_PREVIOUS_RECITER");
                    switchToPreviousReciter();
                    break;
                default:
                    Log.w(TAG, "⚠️ Action inconnue reçue: " + action);
                    break;
            }
        } else {
            Log.w(TAG, "⚠️ Aucune action reçue dans l'intent");
        }

        return START_STICKY; // Redémarrer le service s'il est tué
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "🎵 Service audio Quran détruit");

        try {
            // Arrêter la lecture
            stopAudio();

            // Désenregistrer le BroadcastReceiver
            if (widgetActionReceiver != null) {
                unregisterReceiver(widgetActionReceiver);
                Log.d(TAG, "📡 BroadcastReceiver désenregistré");
            }

            // Arrêter le timer de progression
            if (progressHandler != null && progressRunnable != null) {
                progressHandler.removeCallbacks(progressRunnable);
            }

            // Libérer le MediaPlayer
            if (mediaPlayer != null) {
                mediaPlayer.release();
                mediaPlayer = null;
            }

            // 🎯 SUPPRIMÉ: Plus de MediaSession3/ExoPlayer à libérer

            // Abandonner le focus audio
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest);
                } else {
                    audioManager.abandonAudioFocus(null);
                }
            }

            clearAlbumArt();
            if (defaultAppAlbumArt != null) {
                defaultAppAlbumArt.recycle();
                defaultAppAlbumArt = null;
            }

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur destruction service: " + e.getMessage());
        }

        super.onDestroy();
    }

    /**
     * 🎯 METTRE À JOUR MediaSessionCompat avec métadonnées pour écran de
     * verrouillage
     */
    private void updateMediaSessionCompatMetadata() {
        if (mediaSessionCompat == null) {
            Log.e(TAG, "❌ MediaSessionCompat null - impossible de mettre à jour métadonnées");
            return;
        }

        try {
            // 🎯 Créer métadonnées pour MediaSessionCompat
            MediaMetadataCompat.Builder metadataBuilder = new MediaMetadataCompat.Builder()
                    .putString(MediaMetadataCompat.METADATA_KEY_TITLE,
                            currentSurah.isEmpty() ? "Lecture Coran" : currentSurah)
                    .putString(MediaMetadataCompat.METADATA_KEY_ARTIST,
                            currentReciter.isEmpty() ? "MyAdhan" : currentReciter)
                    .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Coran - MyAdhan")
                    .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, totalDuration);

            Bitmap displayArt = getDisplayAlbumArtBitmap();
            if (displayArt != null) {
                metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, displayArt);
                metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, displayArt);
            }

            mediaSessionCompat.setMetadata(metadataBuilder.build());

            // 🎯 Mettre à jour état de lecture
            int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
            float playbackSpeed = isPlaying ? 1.0f : 0.0f;
            PlaybackStateCompat playbackState = new PlaybackStateCompat.Builder()
                    .setState(state, currentPosition, playbackSpeed)
                    .setActions(PlaybackStateCompat.ACTION_PLAY_PAUSE |
                            PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                            PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                            PlaybackStateCompat.ACTION_SEEK_TO)
                    .build();

            mediaSessionCompat.setPlaybackState(playbackState);

            Log.d(TAG, "🎯 MediaSessionCompat métadonnées et état mis à jour !");
            Log.d(TAG, "🎯 Titre: " + currentSurah + ", État: " + (isPlaying ? "PLAYING" : "PAUSED"));
            Log.d(TAG, "🔍 DEBUG - Position: " + currentPosition + "ms, Durée: " + totalDuration + "ms");

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur updateMediaSessionCompatMetadata: " + e.getMessage());
        }
    }

    /**
     * Initialiser le MediaPlayer
     */
    private void initializeMediaPlayer() {
        try {
            // Libérer l'ancien MediaPlayer s'il existe
            if (mediaPlayer != null) {
                mediaPlayer.release();
            }

            mediaPlayer = new MediaPlayer();

            // Configurer les attributs audio pour la lecture en arrière-plan
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();
                mediaPlayer.setAudioAttributes(audioAttributes);
            }

            // NOUVEAU : Définir les listeners par défaut
            setDefaultMediaPlayerListeners();

            Log.d(TAG, "✅ MediaPlayer initialisé avec succès");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur initialisation MediaPlayer: " + e.getMessage());
        }
    }

    /**
     * 🎵 Initialiser MediaSession3 pour les contrôles d'écran de verrouillage
     */
    private void initializeMediaSession() {
        Log.d(TAG, "🔥 VERSION_DEBUG - initializeMediaSession() appelée !");
        try {
            // 🎯 CRÉER MediaSessionCompat POUR ÉCRAN DE VERROUILLAGE
            mediaSessionCompat = new MediaSessionCompat(this, "QuranAudioService");
            mediaSessionCompat.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
                    MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);

            // 🎯 CONFIGURER POUR CONTRÔLES ÉCRAN DE VERROUILLAGE
            mediaSessionCompat.setSessionActivity(PendingIntent.getActivity(this, 0,
                    new Intent(this, MainActivity.class),
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

            // 🎯 AJOUTER CALLBACK POUR GÉRER LES BOUTONS ÉCRAN DE VERROUILLAGE
            mediaSessionCompat.setCallback(new MediaSessionCompat.Callback() {
                @Override
                public void onPlay() {
                    Log.d(TAG, "🎯 Écran verrouillage - PLAY pressé");
                    if (!isPlaying) {
                        handlePlayPause();
                    }
                }

                @Override
                public void onPause() {
                    Log.d(TAG, "🎯 Écran verrouillage - PAUSE pressé");
                    if (isPlaying) {
                        handlePlayPause();
                    }
                }

                @Override
                public void onSkipToNext() {
                    Log.d(TAG, "🎯 Écran verrouillage - NEXT pressé");
                    handleNext();
                    // 🎯 METTRE À JOUR immédiatement l'écran de verrouillage après navigation
                    new Handler(Looper.getMainLooper()).postDelayed(() -> {
                        updateMediaSessionCompatMetadata();
                        Log.d(TAG, "🎯 Écran verrouillage - État mis à jour après NEXT");
                    }, 500); // Délai pour laisser le temps au chargement
                }

                @Override
                public void onSkipToPrevious() {
                    Log.d(TAG, "🎯 Écran verrouillage - PREVIOUS pressé");
                    handlePrevious();
                    // 🎯 METTRE À JOUR immédiatement l'écran de verrouillage après navigation
                    new Handler(Looper.getMainLooper()).postDelayed(() -> {
                        updateMediaSessionCompatMetadata();
                        Log.d(TAG, "🎯 Écran verrouillage - État mis à jour après PREVIOUS");
                    }, 500); // Délai pour laisser le temps au chargement
                }

                @Override
                public void onSeekTo(long pos) {
                    Log.d(TAG, "🎯 Écran verrouillage / notification - SEEK vers " + pos + "ms");
                    handleSeek((int) pos);
                }

            });

            mediaSessionCompat.setActive(true);
            Log.d(TAG, "🎯 MediaSessionCompat créée et activée avec callbacks !");
            Log.d(TAG, "🔍 DEBUG - Token de session: " + mediaSessionCompat.getSessionToken().toString());

            // 🎯 METTRE À JOUR LES MÉTADONNÉES MediaSessionCompat
            updateMediaSessionCompatMetadata();

            // 🔍 DEBUG - Vérifier si la MediaSession est active
            Log.d(TAG, "🔍 DEBUG - MediaSession active: " + mediaSessionCompat.isActive());

            // 🎯 SUPPRIMÉ: ExoPlayer causait un double audio !
            // MediaSessionCompat suffit pour l'écran de verrouillage
            Log.d(TAG, "🎯 CENTRALISÉ: Utilisation de MediaSessionCompat UNIQUEMENT");

            // 🎯 SUPPRIMÉ: Plus d'ExoPlayer listeners

            Log.d(TAG, "🎯 CENTRALISÉ: MediaSessionCompat prêt pour contrôles écran de verrouillage");

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur initialisation MediaSession3: " + e.getMessage(), e);
        }
    }

    // 🎯 SUPPRIMÉ: updateMediaSessionMetadata() causait un double audio avec
    // ExoPlayer
    // MediaSessionCompat suffit pour l'écran de verrouillage

    /**
     * Définir les listeners par défaut du MediaPlayer
     */
    private void setDefaultMediaPlayerListeners() {
        mediaPlayer.setOnCompletionListener(mp -> {
            Log.d(TAG, "🎵 Lecture terminée");
            isPlaying = false;
            currentPosition = 0;

            // NOUVEAU : Envoyer un broadcast pour notifier React Native de la fin de la
            // sourate
            Intent completionIntent = new Intent("com.drogbinho.prayertimesapp2.REACT_NATIVE_EVENT");
            completionIntent.putExtra("eventName", "QuranSurahCompleted");
            completionIntent.putExtra("surah", currentSurah);
            completionIntent.putExtra("reciter", currentReciter);
            completionIntent.putExtra("autoAdvanceEnabled", autoAdvanceEnabled);
            sendBroadcast(completionIntent);
            Log.d(TAG, "📡 Broadcast QuranSurahCompleted envoyé à React Native");

            // NOUVEAU : Auto-avancement vers la prochaine sourate (téléchargée OU
            // streaming)
            if (autoAdvanceEnabled) {
                Log.d(TAG, "🔄 Auto-avancement activé, recherche de la prochaine sourate");
                wasPlayingBeforeNavigation = true;
                advanceToNextSurah();
            } else {
                broadcastAudioStateChanged();
            }
            updateNotification();
        });

        mediaPlayer.setOnErrorListener((mp, what, extra) -> {
            Log.e(TAG, "❌ Erreur MediaPlayer: what=" + what + ", extra=" + extra);

            // 🛠️ CORRECTION: Gestion améliorée des erreurs avec fallback intelligent
            return handleMediaPlayerError(what, extra);
        });

        // Configurer la requête de focus audio pour Android 8+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(audioAttributes)
                    .setOnAudioFocusChangeListener(focusChange -> {
                        switch (focusChange) {
                            case AudioManager.AUDIOFOCUS_LOSS:
                                Log.d(TAG, "🎵 Focus audio perdu - pause");
                                // NOUVEAU : Mémoriser l'état avant la perte de focus
                                wasPlayingBeforeFocusLoss = isPlaying;
                                pauseAudio();
                                break;
                            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                                Log.d(TAG, "🎵 Focus audio perdu temporairement - pause");
                                // NOUVEAU : Mémoriser l'état avant la perte de focus
                                wasPlayingBeforeFocusLoss = isPlaying;
                                pauseAudio();
                                break;
                            case AudioManager.AUDIOFOCUS_GAIN:
                                Log.d(TAG, "🎵 Focus audio regagné - reprise conditionnelle");
                                // NOUVEAU : Ne relancer que si l'utilisateur était en train d'écouter
                                if (wasPlayingBeforeFocusLoss) {
                                    Log.d(TAG, "🎵 Relance automatique car l'utilisateur était en train d'écouter");
                                    playAudio();
                                } else {
                                    Log.d(TAG,
                                            "🎵 Pas de relance automatique car l'utilisateur n'était pas en train d'écouter");
                                }
                                break;
                        }
                    })
                    .build();
        }
    }

    /**
     * Créer le canal de notification
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Lecture Coran",
                    NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Contrôles de lecture audio du Coran");
            channel.setShowBadge(false);
            notificationManager.createNotificationChannel(channel);
        }
    }

    /**
     * Créer la notification avec contrôles média sur l'écran de verrouillage
     */
    private Notification createNotification() {
        // Intent pour ouvrir l'app
        Intent appIntent = new Intent(this, MainActivity.class);
        appIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent appPendingIntent = PendingIntent.getActivity(this, 0, appIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Intent pour play/pause
        Intent playPauseIntent = new Intent(ACTION_PLAY_PAUSE);
        PendingIntent playPausePendingIntent = PendingIntent.getBroadcast(this, 1, playPauseIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Intent pour précédent
        Intent previousIntent = new Intent(ACTION_PREVIOUS);
        PendingIntent previousPendingIntent = PendingIntent.getBroadcast(this, 2, previousIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Intent pour suivant
        Intent nextIntent = new Intent(ACTION_NEXT);
        PendingIntent nextPendingIntent = PendingIntent.getBroadcast(this, 3, nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Intent pour stop
        Intent stopIntent = new Intent(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(this, 4, stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // 🎵 Créer une notification avec MediaStyle pour contrôles d'écran de
        // verrouillage (style Spotify)

        Bitmap largeIcon = getDisplayAlbumArtBitmap();

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(currentSurah.isEmpty() ? "Lecture Coran" : currentSurah)
                .setContentText(currentReciter.isEmpty() ? "MyAdhan" : currentReciter)
                .setSmallIcon(R.drawable.ic_quran_notification)
                .setLargeIcon(largeIcon)
                .setContentIntent(appPendingIntent)
                .addAction(R.drawable.ic_previous, "Précédent", previousPendingIntent)
                .addAction(R.drawable.ic_play_pause, isPlaying ? "Pause" : "Play", playPausePendingIntent)
                .addAction(R.drawable.ic_next, "Suivant", nextPendingIntent)
                .addAction(R.drawable.ic_stop, "Stop", stopPendingIntent)
                .setDeleteIntent(stopPendingIntent) // Action quand l'utilisateur swipe pour supprimer
                .setOngoing(true)
                .setSilent(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // Visible sur l'écran de verrouillage
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT) // Catégorie média
                .setShowWhen(false); // Ne pas afficher l'heure

        // 🎯 AJOUTER MediaStyle AVEC MediaSessionCompat - CLÉ POUR ÉCRAN DE
        // VERROUILLAGE !
        if (mediaSessionCompat != null && mediaSessionCompat.isActive()) {
            builder.setStyle(new MediaStyle()
                    .setMediaSession(mediaSessionCompat.getSessionToken())
                    .setShowActionsInCompactView(0, 1, 2));
            Log.d(TAG, "🎯 MediaStyle ajouté avec token MediaSessionCompat !");
            Log.d(TAG, "🔍 DEBUG - Notification avec MediaSession active - Token: "
                    + mediaSessionCompat.getSessionToken().toString());
        } else {
            Log.e(TAG, "❌ MediaSessionCompat null ou inactive - contrôles écran de verrouillage NON disponibles !");
            Log.e(TAG, "🔍 DEBUG - MediaSessionCompat null: " + (mediaSessionCompat == null));
            if (mediaSessionCompat != null) {
                Log.e(TAG, "🔍 DEBUG - MediaSessionCompat inactive: " + !mediaSessionCompat.isActive());
            }
        }

        return builder.build();
    }

    /**
     * Mettre à jour la notification
     */
    private void updateNotification() {
        if (notificationManager != null) {
            Log.d(TAG, "🔍 DEBUG - Mise à jour de la notification");
            Notification notification = createNotification();
            notificationManager.notify(NOTIFICATION_ID, notification);
            Log.d(TAG, "🔍 DEBUG - Notification mise à jour avec ID: " + NOTIFICATION_ID);
        } else {
            Log.e(TAG, "❌ NotificationManager null - impossible de mettre à jour la notification");
        }
    }

    /**
     * Vérifier le statut premium
     */
    private void checkPremiumStatus() {
        try {
            SharedPreferences prefs = getSharedPreferences("premium_prefs", MODE_PRIVATE);
            isPremiumUser = prefs.getBoolean("is_premium_user", false);
            Log.d(TAG, "👑 Statut premium vérifié: " + isPremiumUser);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification statut premium: " + e.getMessage());
            isPremiumUser = false;
        }
    }

    /**
     * Sauvegarder l'état audio
     */
    private void saveAudioState() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            prefs.edit()
                    .putString(KEY_AUDIO_PATH, currentAudioPath)
                    .putString(KEY_SURAH, currentSurah)
                    .putString(KEY_RECITER, currentReciter)
                    .putInt(KEY_POSITION, currentPosition)
                    .putInt(KEY_DURATION, totalDuration)
                    .putBoolean(KEY_IS_PLAYING, isPlaying)
                    .putBoolean(KEY_IS_PREMIUM, isPremiumUser)
                    .putBoolean(KEY_AUTO_ADVANCE, autoAdvanceEnabled)
                    .putBoolean(KEY_LOOP_ENABLED, loopEnabled)
                    .apply();
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur sauvegarde état audio: " + e.getMessage());
        }
    }

    /**
     * Restaurer l'état audio
     */
    private void restoreAudioState() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            currentAudioPath = prefs.getString(KEY_AUDIO_PATH, "");
            currentSurah = prefs.getString(KEY_SURAH, "");
            currentReciter = prefs.getString(KEY_RECITER, "");
            currentPosition = prefs.getInt(KEY_POSITION, 0);
            totalDuration = prefs.getInt(KEY_DURATION, 0);
            isPlaying = prefs.getBoolean(KEY_IS_PLAYING, false);
            isPremiumUser = prefs.getBoolean(KEY_IS_PREMIUM, false);
            autoAdvanceEnabled = prefs.getBoolean(KEY_AUTO_ADVANCE, true);
            loopEnabled = prefs.getBoolean(KEY_LOOP_ENABLED, false);

            Log.d(TAG, "🔄 État audio restauré: " + currentSurah + " - " + currentReciter);
            Log.d(TAG, "🔄 Options restaurées - Auto-avancement: " + autoAdvanceEnabled + ", Boucle: " + loopEnabled);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur restauration état audio: " + e.getMessage());
        }
    }

    /**
     * 🎯 NOUVEAU : Déterminer si l'audio doit démarrer automatiquement après
     * navigation
     */
    private boolean shouldAutoStartAfterNavigation() {
        try {
            // Vérifier l'état de lecture précédent du service
            boolean serviceWasPlaying = wasPlayingBeforeNavigation;

            // Vérifier l'état actuel du widget
            boolean widgetIsPlaying = QuranWidget.getWidgetPlayingState();

            Log.d(TAG, "🎯 Analyse auto-start - serviceWasPlaying: " + serviceWasPlaying + ", widgetIsPlaying: "
                    + widgetIsPlaying);

            // Si l'un des deux indique que l'audio était en cours, on continue
            boolean shouldStart = serviceWasPlaying || widgetIsPlaying;

            Log.d(TAG, "🎯 Décision auto-start: " + shouldStart);
            return shouldStart;

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur détermination auto-start: " + e.getMessage());
            return wasPlayingBeforeNavigation; // fallback sur l'ancienne logique
        }
    }

    /**
     * 🛠️ NOUVEAU : Gestion intelligente des erreurs MediaPlayer avec fallback
     */
    private boolean handleMediaPlayerError(int what, int extra) {
        Log.e(TAG, "🛠️ Gestion erreur MediaPlayer - what: " + what + ", extra: " + extra);

        // Gérer spécifiquement l'erreur de streaming progressif
        if (what == -38) { // MEDIA_ERROR_NOT_VALID_FOR_PROGRESSIVE_PLAYBACK
            Log.w(TAG, "⚠️ Erreur streaming progressif détectée");
            return handleStreamingError();
        }

        // Gérer les erreurs de réseau ou de serveur
        if (what == -1004 || what == -1007 || what == 1) { // MEDIA_ERROR_IO ou MEDIA_ERROR_MALFORMED
            Log.w(TAG, "⚠️ Erreur réseau/format détectée");
            return handleStreamingError();
        }

        // Gérer les erreurs génériques
        Log.e(TAG, "❌ Erreur MediaPlayer non récupérable");
        resetPlayerState();

        // Envoyer événement d'erreur à React Native
        broadcastError("MediaPlayer error: " + what + ", " + extra);

        return true; // Erreur gérée
    }

    /**
     * 🛠️ NOUVEAU : Gestion spécialisée des erreurs de streaming
     */
    private boolean handleStreamingError() {
        if (currentAudioPath == null || currentAudioPath.isEmpty()) {
            Log.e(TAG, "❌ Pas d'URL de fallback disponible");
            return false;
        }

        // Tentative 1: Basculer action=stream → action=download
        if (currentAudioPath.contains("action=stream")) {
            String retryUrl = currentAudioPath.replace("action=stream", "action=download");
            Log.d(TAG, "🔄 Retry #1 avec action=download");
            loadAudio(retryUrl, currentSurah, currentReciter);
            return true;
        }

        // Tentative 2: Basculer action=download → action=stream
        if (currentAudioPath.contains("action=download")) {
            String retryUrl = currentAudioPath.replace("action=download", "action=stream");
            Log.d(TAG, "🔄 Retry #2 avec action=stream");
            loadAudio(retryUrl, currentSurah, currentReciter);
            return true;
        }

        // Tentative 3: Recharger l'URL originale avec un délai
        Log.d(TAG, "🔄 Retry #3 après délai");
        new android.os.Handler().postDelayed(() -> {
            loadAudio(currentAudioPath, currentSurah, currentReciter);
        }, 2000);

        return true;
    }

    /**
     * 🛠️ NOUVEAU : Réinitialiser l'état du player après erreur
     */
    private void resetPlayerState() {
        isPlaying = false;
        currentPosition = 0;
        wasPlayingBeforeFocusLoss = false;
        broadcastAudioStateChanged();
        updateNotification();
    }

    /**
     * 🛠️ NOUVEAU : Diffuser une erreur vers React Native
     */
    private void broadcastError(String errorMessage) {
        Intent errorIntent = new Intent("com.drogbinho.prayertimesapp2.REACT_NATIVE_EVENT");
        errorIntent.putExtra("eventName", "QuranAudioError");
        errorIntent.putExtra("error", errorMessage);
        sendBroadcast(errorIntent);
    }

    /**
     * Diffuser l'état audio
     */
    private void broadcastAudioStateChanged() {
        try {
            Log.d(TAG, "📡 Diffusion état audio - isPlaying: " + isPlaying + ", surah: " + currentSurah);

            // NOUVEAU : Callback direct vers React Native
            if (audioProgressCallback != null) {
                Log.d(TAG, "🎯 Envoi callback état React Native - isPlaying: " + isPlaying + ", position: "
                        + currentPosition + ", duration: " + totalDuration);
                audioProgressCallback.onAudioStateChanged(isPlaying, currentSurah, currentReciter, currentPosition,
                        totalDuration);
                Log.d(TAG, "✅ Callback état React Native envoyé");
            } else {
                Log.w(TAG, "⚠️ Aucun callback état React Native enregistré");
            }

            // ANCIEN : Envoyer un Intent global pour React Native (backup)
            Intent reactNativeIntent = new Intent("com.drogbinho.prayertimesapp2.REACT_NATIVE_EVENT");
            reactNativeIntent.putExtra("eventName", "QuranAudioStateChanged");
            reactNativeIntent.putExtra("isPlaying", isPlaying);
            reactNativeIntent.putExtra("surah", currentSurah);
            reactNativeIntent.putExtra("reciter", currentReciter);
            reactNativeIntent.putExtra("position", currentPosition);
            reactNativeIntent.putExtra("duration", totalDuration);
            reactNativeIntent.putExtra("isPremium", isPremiumUser);
            sendBroadcast(reactNativeIntent);

            // Garder l'ancien broadcast pour le widget
            Intent intent = new Intent(ACTION_AUDIO_STATE_CHANGED);
            intent.putExtra("isPlaying", isPlaying);
            intent.putExtra("surah", currentSurah);
            intent.putExtra("reciter", currentReciter);
            intent.putExtra("position", currentPosition);
            intent.putExtra("duration", totalDuration);
            intent.putExtra("isPremium", isPremiumUser);

            // 🎯 NOUVEAU : Ajouter les états des options de lecture
            intent.putExtra("autoAdvanceEnabled", autoAdvanceEnabled);
            intent.putExtra("loopEnabled", loopEnabled);
            Log.d(TAG,
                    "🎯 Broadcast incluant options - Auto-advance: " + autoAdvanceEnabled + ", Loop: " + loopEnabled);

            // NOUVEAU : S'assurer que le broadcast est envoyé avec le bon package
            intent.setPackage(getPackageName());
            Log.d(TAG, "📡 Envoi broadcast widget avec package: " + getPackageName());

            sendBroadcast(intent);
            Log.d(TAG, "✅ Broadcast widget envoyé: " + intent.getAction());

            // Mettre à jour le widget
            updateQuranWidget();
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur diffusion état audio: " + e.getMessage());
        }
    }

    /** Remet position/durée à zéro avant un nouveau chargement (évite durée de la piste précédente). */
    private void clearPlaybackTimingBeforeLoad() {
        totalDuration = expectedDurationMs > 0 ? expectedDurationMs : 0;
        currentPosition = 0;
        isMediaReady = false;
        pendingSeekMs = -1;
        broadcastAudioProgress();
    }

    /** Lecture HTTP : action=stream (Range). MP3 encodés avec Xing requis pour le seek. */
    private String preferStreamPlaybackUrl(String audioPath) {
        if (audioPath == null || !audioPath.startsWith("http")) {
            return audioPath;
        }
        String url = audioPath.trim();
        if (url.contains("action=download")) {
            return url.replace("action=download", "action=stream");
        }
        if (!url.contains("action=")) {
            return url + (url.contains("?") ? "&action=stream" : "?action=stream");
        }
        return url;
    }

    private HashMap<String, String> httpHeadersForAudioUrl(String audioPath) {
        HashMap<String, String> headers = new HashMap<>();
        headers.put("User-Agent", "MyAdhan/1.0 (Android MediaPlayer)");
        return headers;
    }

    /** Lit la durée réelle du fichier (local ou URL) si MediaPlayer renvoie 0. */
    private int probeDurationMs(String audioPath) {
        if (audioPath == null || audioPath.isEmpty()) {
            return 0;
        }
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            if (audioPath.startsWith("http")) {
                retriever.setDataSource(audioPath, httpHeadersForAudioUrl(audioPath));
            } else {
                String path = audioPath.startsWith("file://")
                        ? audioPath.replace("file://", "")
                        : audioPath;
                retriever.setDataSource(path);
            }
            String dur = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            if (dur != null) {
                return Integer.parseInt(dur);
            }
        } catch (Exception e) {
            Log.w(TAG, "⚠️ probeDurationMs: " + e.getMessage());
        } finally {
            try {
                retriever.release();
            } catch (Exception ignored) {
            }
        }
        return 0;
    }

    private void clearAlbumArt() {
        if (currentAlbumArt != null) {
            currentAlbumArt.recycle();
            currentAlbumArt = null;
        }
    }

    /** Pochette MP3 ou logo MyAdhan (écran de verrouillage / notification). */
    private Bitmap getDisplayAlbumArtBitmap() {
        if (currentAlbumArt != null) {
            return currentAlbumArt;
        }
        return getDefaultAppAlbumArtBitmap();
    }

    private Bitmap getDefaultAppAlbumArtBitmap() {
        if (defaultAppAlbumArt != null) {
            return defaultAppAlbumArt;
        }
        try {
            Drawable icon = getPackageManager().getApplicationIcon(getPackageName());
            Bitmap raw;
            if (icon instanceof BitmapDrawable) {
                Bitmap bmp = ((BitmapDrawable) icon).getBitmap();
                raw = bmp != null ? bmp.copy(bmp.getConfig() != null ? bmp.getConfig() : Bitmap.Config.ARGB_8888, true)
                        : null;
            } else {
                int size = ALBUM_ART_MAX_PX;
                raw = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(raw);
                icon.setBounds(0, 0, size, size);
                icon.draw(canvas);
            }
            if (raw != null) {
                defaultAppAlbumArt = scaleAlbumArtBitmap(raw);
                if (defaultAppAlbumArt != raw) {
                    raw.recycle();
                }
                Log.d(TAG, "🖼️ Logo app charge pour pochette par defaut");
            }
        } catch (Exception e) {
            Log.w(TAG, "⚠️ Logo app indisponible: " + e.getMessage());
        }
        return defaultAppAlbumArt;
    }

    private Bitmap scaleAlbumArtBitmap(Bitmap raw) {
        if (raw == null) {
            return null;
        }
        int maxSide = Math.max(raw.getWidth(), raw.getHeight());
        if (maxSide <= ALBUM_ART_MAX_PX) {
            return raw;
        }
        float scale = (float) ALBUM_ART_MAX_PX / maxSide;
        int w = Math.max(1, Math.round(raw.getWidth() * scale));
        int h = Math.max(1, Math.round(raw.getHeight() * scale));
        Bitmap scaled = Bitmap.createScaledBitmap(raw, w, h, true);
        if (scaled != raw) {
            raw.recycle();
        }
        return scaled;
    }

    private Bitmap decodeEmbeddedAlbumArt(byte[] pictureData) {
        if (pictureData == null || pictureData.length == 0) {
            return null;
        }
        try {
            Bitmap raw = BitmapFactory.decodeByteArray(pictureData, 0, pictureData.length);
            return scaleAlbumArtBitmap(raw);
        } catch (Exception e) {
            Log.w(TAG, "⚠️ decodeEmbeddedAlbumArt: " + e.getMessage());
            return null;
        }
    }

    private byte[] readEmbeddedPicture(String audioPath) {
        if (audioPath == null || audioPath.isEmpty()) {
            return null;
        }
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            if (audioPath.startsWith("http")) {
                retriever.setDataSource(audioPath, httpHeadersForAudioUrl(audioPath));
            } else {
                String path = audioPath.startsWith("file://")
                        ? audioPath.replace("file://", "")
                        : audioPath;
                retriever.setDataSource(path);
            }
            return retriever.getEmbeddedPicture();
        } catch (Exception e) {
            Log.w(TAG, "⚠️ readEmbeddedPicture(" + shortenPath(audioPath) + "): " + e.getMessage());
            return null;
        } finally {
            try {
                retriever.release();
            } catch (Exception ignored) {
            }
        }
    }

    /** Pochette ID3 du MP3 (local ou URL), comme YouTube / Spotify. */
    private Bitmap extractEmbeddedAlbumArt(String audioPath) {
        byte[] picture = readEmbeddedPicture(audioPath);
        if (picture != null) {
            return decodeEmbeddedAlbumArt(picture);
        }
        if (audioPath != null && audioPath.contains("action=stream")) {
            String downloadUrl = audioPath.replace("action=stream", "action=download");
            picture = readEmbeddedPicture(downloadUrl);
            if (picture != null) {
                return decodeEmbeddedAlbumArt(picture);
            }
        }
        return null;
    }

    private void loadAlbumArtAsync(final String audioPath) {
        if (audioPath == null || audioPath.isEmpty()) {
            return;
        }
        new Thread(() -> {
            final Bitmap art = extractEmbeddedAlbumArt(audioPath);
            new Handler(Looper.getMainLooper()).post(() -> {
                if (audioPath == null || !audioPath.equals(currentAudioPath)) {
                    if (art != null) {
                        art.recycle();
                    }
                    return;
                }
                clearAlbumArt();
                currentAlbumArt = art;
                if (currentAlbumArt != null) {
                    Log.d(TAG, "🖼️ Pochette ID3 chargée pour écran verrouillage / notification");
                } else {
                    Log.d(TAG, "🖼️ Aucune pochette ID3 dans ce fichier audio");
                }
                updateMediaSessionCompatMetadata();
                updateNotification();
            });
        }).start();
    }

    private void applyResolvedDuration(MediaPlayer mp) {
        int fromPlayer = 0;
        try {
            if (mp != null) {
                fromPlayer = mp.getDuration();
            }
        } catch (Exception e) {
            Log.w(TAG, "⚠️ getDuration: " + e.getMessage());
        }

        int fromProbe = 0;
        if (currentAudioPath != null && !currentAudioPath.isEmpty()) {
            fromProbe = probeDurationMs(currentAudioPath);
        }

        int resolved = fromPlayer;
        if (fromProbe > 0) {
            if (resolved <= 0 || fromProbe > resolved * 2) {
                resolved = fromProbe;
            }
        }
        if (expectedDurationMs > 0) {
            if (resolved <= 0) {
                resolved = expectedDurationMs;
            } else if (resolved < expectedDurationMs * 0.25) {
                // MediaPlayer renvoie parfois ~27s sur un long MP3 VBR en stream
                Log.w(TAG, "⏱️ Durée lecteur trop courte (" + resolved + "ms), catalogue: "
                        + expectedDurationMs + "ms");
                resolved = expectedDurationMs;
            }
        }
        if (resolved > 0) {
            totalDuration = resolved;
            Log.d(TAG, "⏱️ Durée audio résolue: " + totalDuration + "ms (player="
                    + fromPlayer + ", probe=" + fromProbe + ", expected=" + expectedDurationMs + ")");
            QuranSeekDebug.log(getApplicationContext(), "DURATION_RESOLVED",
                    "total=" + totalDuration + " player=" + fromPlayer + " probe=" + fromProbe
                            + " expected=" + expectedDurationMs + " surah=" + currentSurah);
        }
        if (safePlayerDuration() <= 0 && expectedDurationMs > 0) {
            startDurationPoll();
        }
    }

    private void cancelDurationPoll() {
        if (durationPollRunnable != null) {
            progressHandler.removeCallbacks(durationPollRunnable);
            durationPollRunnable = null;
        }
        durationPollAttempts = 0;
    }

    /** Attend que MediaPlayer connaisse la durée (indispensable pour le seek). */
    private void startDurationPoll() {
        cancelDurationPoll();
        durationPollRunnable = new Runnable() {
            @Override
            public void run() {
                if (mediaPlayer == null) {
                    return;
                }
                int playerDur = safePlayerDuration();
                if (playerDur > 0) {
                    updateDurationFromPlayer(playerDur);
                    QuranSeekDebug.log(getApplicationContext(), "DURATION_POLL_OK",
                            "playerDur=" + playerDur + " total=" + totalDuration);
                    broadcastAudioProgress();
                    cancelDurationPoll();
                    return;
                }
                durationPollAttempts++;
                if (durationPollAttempts < 24) {
                    progressHandler.postDelayed(this, 500);
                } else {
                    QuranSeekDebug.log(getApplicationContext(), "DURATION_POLL_GIVE_UP",
                            "expected=" + expectedDurationMs + " probe="
                                    + probeDurationMs(currentAudioPath));
                    cancelDurationPoll();
                }
            }
        };
        progressHandler.postDelayed(durationPollRunnable, 300);
    }

    private void updateDurationFromPlayer(int reportedDuration) {
        if (reportedDuration <= 0) {
            return;
        }
        if (expectedDurationMs > 0) {
            if (reportedDuration < expectedDurationMs * 0.25) {
                return;
            }
            if (totalDuration > 0
                    && Math.abs(reportedDuration - totalDuration) < totalDuration * 0.05) {
                return;
            }
        }
        if (totalDuration <= 0 || reportedDuration > totalDuration * 1.2) {
            totalDuration = reportedDuration;
        }
    }

    /**
     * Diffuser la progression audio
     */
    private void broadcastAudioProgress() {
        try {
            Log.d(TAG,
                    "📡 Diffusion progression audio - position: " + currentPosition + ", duration: " + totalDuration);

            // NOUVEAU : Callback direct vers React Native
            if (audioProgressCallback != null) {
                Log.d(TAG, "🎯 Envoi callback direct React Native - position: " + currentPosition + ", duration: "
                        + totalDuration);
                audioProgressCallback.onAudioProgress(currentPosition, totalDuration, isPlaying, currentSurah,
                        currentReciter);
                Log.d(TAG, "✅ Callback direct React Native envoyé");
            } else {
                Log.w(TAG, "⚠️ Aucun callback React Native enregistré");
            }

            // ANCIEN : Envoyer un Intent global pour React Native (backup)
            Intent reactNativeIntent = new Intent("com.drogbinho.prayertimesapp2.REACT_NATIVE_EVENT");
            reactNativeIntent.putExtra("eventName", "QuranAudioProgress");
            reactNativeIntent.putExtra("position", currentPosition);
            reactNativeIntent.putExtra("duration", totalDuration);
            Log.d(TAG, "🔧 Envoi broadcast React Native - action: " + reactNativeIntent.getAction());
            sendBroadcast(reactNativeIntent);
            Log.d(TAG, "✅ Broadcast React Native envoyé");

            // Garder l'ancien broadcast pour le widget
            Intent intent = new Intent(ACTION_AUDIO_PROGRESS);
            intent.putExtra("position", currentPosition);
            intent.putExtra("duration", totalDuration);
            sendBroadcast(intent);

            Log.d(TAG, "✅ Événement progression audio diffusé");

            // NOUVEAU : Mettre à jour directement l'état du widget
            Log.d(TAG, "🚀 Mise à jour directe de l'état du widget après progression");
            QuranWidget.updatePlaybackState(getApplicationContext(), isPlaying, currentPosition, totalDuration);

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur diffusion progression audio: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Mettre à jour le widget Coran
     */
    private void updateQuranWidget() {
        try {
            // NOUVEAU : Mettre à jour directement le widget avec le context du service
            Log.d(TAG, "📱 Mise à jour directe du widget depuis le service");
            QuranWidget.updateAllWidgets(this);

            // NOUVEAU : Forcer la mise à jour immédiate de tous les widgets
            try {
                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(this);
                ComponentName thisWidget = new ComponentName(this, QuranWidget.class);
                int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

                Log.d(TAG, "🚀 Mise à jour forcée de " + appWidgetIds.length + " widgets depuis le service");

                for (int appWidgetId : appWidgetIds) {
                    QuranWidget.forceUpdateWidget(this, appWidgetId);
                }

                Log.d(TAG, "✅ Mise à jour forcée terminée depuis le service");
            } catch (Exception e) {
                Log.e(TAG, "❌ Erreur mise à jour forcée depuis le service: " + e.getMessage());
            }

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur mise à jour widget: " + e.getMessage());
        }
    }

    /**
     * Démarrer le timer de progression
     */
    private void startProgressTimer() {
        Log.d(TAG, "⏱️ Démarrage timer de progression");
        if (progressRunnable != null) {
            progressHandler.removeCallbacks(progressRunnable);
        }

        progressRunnable = new Runnable() {
            @Override
            public void run() {
                if (mediaPlayer != null && isPlaying) {
                    try {
                        currentPosition = mediaPlayer.getCurrentPosition();
                        int reportedDuration = mediaPlayer.getDuration();
                        if (reportedDuration > 0) {
                            updateDurationFromPlayer(reportedDuration);
                        } else if (totalDuration <= 0 && currentAudioPath != null) {
                            int probed = probeDurationMs(currentAudioPath);
                            if (probed > 0) {
                                totalDuration = probed;
                            }
                        }
                        Log.d(TAG,
                                "⏱️ Timer progression - position: " + currentPosition + ", duration: " + totalDuration);
                        broadcastAudioProgress();
                        updateMediaSessionCompatMetadata();

                        // NOUVEAU : Mettre à jour directement l'état du widget plus fréquemment
                        if (currentPosition % 5000 < 1000) { // Toutes les 5 secondes environ
                            Log.d(TAG, "🚀 Mise à jour directe de l'état du widget depuis le timer");
                            QuranWidget.updatePlaybackState(getApplicationContext(), isPlaying, currentPosition,
                                    totalDuration);
                        }

                        // Programmer la prochaine mise à jour
                        progressHandler.postDelayed(this, 1000);
                    } catch (Exception e) {
                        Log.e(TAG, "❌ Erreur timer progression: " + e.getMessage());
                    }
                } else {
                    Log.d(TAG, "⏱️ Timer progression arrêté - mediaPlayer null: " + (mediaPlayer == null)
                            + ", isPlaying: " + isPlaying);
                    // 🎯 NOUVEAU : Vérifier si on devrait redémarrer le timer
                    if (mediaPlayer != null && isPlaying) {
                        Log.d(TAG, "🔄 Redémarrage automatique du timer - média en lecture");
                        progressHandler.postDelayed(this, 1000);
                    }
                }
            }
        };

        progressHandler.post(progressRunnable);
        Log.d(TAG, "✅ Timer de progression démarré");
    }

    /**
     * Arrêter le timer de progression
     */
    private void stopProgressTimer() {
        if (progressRunnable != null) {
            progressHandler.removeCallbacks(progressRunnable);
        }
    }

    /**
     * Gérer play/pause
     */
    private void handlePlayPause() {
        Log.d(TAG, "🎵 handlePlayPause() - isPremiumUser: " + isPremiumUser + ", isPlaying: " + isPlaying
                + ", mediaPlayer null: " + (mediaPlayer == null));

        if (!isPremiumUser) {
            Log.w(TAG, "⚠️ Utilisateur non premium");
            return;
        }

        if (mediaPlayer == null) {
            Log.w(TAG, "⚠️ MediaPlayer null, réinitialisation...");
            initializeMediaPlayer();
        }

        if (isPlaying) {
            Log.d(TAG, "🎵 Pause audio");
            pauseAudio();

            // 🎯 SUPPRIMÉ: Synchronisation ExoPlayer (causait double audio)

            // 🎯 METTRE À JOUR MediaSessionCompat pour contrôles écran de verrouillage
            updateMediaSessionCompatMetadata();

            // 🎯 SUPPRIMÉ: updateMediaSessionMetadata() (causait double audio)

            // Mettre à jour la notification avec le nouvel état
            updateNotification();
        } else {
            Log.d(TAG, "🎵 Play audio");
            // Démarrer le service en mode foreground quand l'utilisateur premium commence à
            // jouer
            if (!isForegroundService()) {
                startForeground(NOTIFICATION_ID, createNotification());
                Log.d(TAG, "🎵 Service démarré en mode foreground pour lecture audio premium");
            }
            playAudio();

            // 🎯 SUPPRIMÉ: Synchronisation ExoPlayer (causait double audio)

            // 🎯 METTRE À JOUR MediaSessionCompat pour contrôles écran de verrouillage
            updateMediaSessionCompatMetadata();

            // Mettre à jour la notification avec le nouvel état
            updateNotification();
        }

        // NOUVEAU : Diffuser l'état audio pour mettre à jour le widget
        Log.d(TAG, "📡 Diffusion état audio après Play/Pause pour le widget");
        broadcastAudioStateChanged();

        // NOUVEAU : Mettre à jour immédiatement le widget
        Log.d(TAG, "🚀 Mise à jour immédiate du widget après Play/Pause");
        updateQuranWidget();

        // 🎯 NOUVEAU : S'assurer que le timer continue après Play/Pause depuis le
        // widget
        progressHandler.postDelayed(() -> {
            if (isPlaying && mediaPlayer != null) {
                Log.d(TAG, "🔄 Vérification et redémarrage timer après action widget");
                startProgressTimer();
            }
        }, 500);
    }

    /**
     * Gérer précédent
     */
    private void handlePrevious() {
        if (!isPremiumUser)
            return;

        Log.d(TAG, "⏮️ Précédent");

        // Extraire le numéro de sourate actuel
        int currentSurahNumber = extractSurahNumber(currentSurah);

        // Si on ne peut pas extraire le numéro, essayer de le déduire du nom
        if (currentSurahNumber <= 0) {
            Log.w(TAG, "⚠️ Impossible d'extraire le numéro de sourate actuel - currentSurah: '" + currentSurah + "'");
            Log.d(TAG, "🔄 Tentative de déduction du numéro depuis le nom...");
            currentSurahNumber = getSurahNumberByName(currentSurah);
            Log.d(TAG, "🔄 Numéro déduit: " + currentSurahNumber);
        }

        if (currentSurahNumber <= 0) {
            Log.w(TAG, "⚠️ Impossible de déterminer le numéro de sourate - currentSurah: '" + currentSurah + "'");
            return;
        }

        // MODIFIÉ : Permettre la navigation même sans sourates téléchargées (streaming)
        java.util.List<Integer> downloadedSurahs = getDownloadedSurahs(currentReciter);
        if (downloadedSurahs.isEmpty()) {
            Log.d(TAG, "🌐 Aucune sourate téléchargée, navigation séquentielle activée");
            int previousSurahNumber = currentSurahNumber - 1;
            if (previousSurahNumber >= 1) {
                Log.d(TAG, "🔄 Navigation séquentielle vers sourate: " + previousSurahNumber);
                loadSurahByNumber(previousSurahNumber);
            } else {
                Log.d(TAG, "⏹️ Première sourate atteinte (1)");
            }
            return;
        }

        // Trouver la sourate précédente téléchargée
        int previousSurahNumber = -1;
        for (int i = downloadedSurahs.size() - 1; i >= 0; i--) {
            int surahNumber = downloadedSurahs.get(i);
            if (surahNumber < currentSurahNumber) {
                previousSurahNumber = surahNumber;
                break;
            }
        }

        // Si pas de sourate précédente et boucle activée, aller à la dernière
        if (previousSurahNumber == -1 && loopEnabled) {
            previousSurahNumber = downloadedSurahs.get(downloadedSurahs.size() - 1);
            Log.d(TAG, "🔄 Boucle activée, retour à la dernière sourate: " + previousSurahNumber);
        }

        if (previousSurahNumber != -1) {
            Log.d(TAG, "🔄 Navigation vers sourate précédente téléchargée: " + currentSurahNumber + " → "
                    + previousSurahNumber);
            loadDownloadedSurahByNumber(previousSurahNumber);

            // 🎯 NOUVEAU : S'assurer que le timer continue après navigation précédente
            progressHandler.postDelayed(() -> {
                if (isPlaying && mediaPlayer != null) {
                    startProgressTimer();
                    Log.d(TAG, "✅ Timer redémarré après navigation précédente");
                }
            }, 1000);
        } else {
            Log.d(TAG, "⏹️ Pas de sourate précédente téléchargée");
        }
    }

    /**
     * Gérer suivant
     */
    private void handleNext() {
        Log.d(TAG, "⏭️ handleNext() - DÉBUT");
        Log.d(TAG, "⏭️ handleNext() - isPremiumUser: " + isPremiumUser);

        // 🔍 DIAGNOSTIC DÉTAILLÉ
        Log.d(TAG, "🔍 DIAGNOSTIC handleNext() Service - État complet:");
        Log.d(TAG, "🔍 - isPremiumUser: " + isPremiumUser);
        Log.d(TAG, "🔍 - currentSurah: '" + currentSurah + "'");
        Log.d(TAG, "🔍 - currentReciter: '" + currentReciter + "'");
        Log.d(TAG, "🔍 - currentAudioPath: '" + currentAudioPath + "'");
        Log.d(TAG, "🔍 - isPlaying: " + isPlaying);

        if (!isPremiumUser) {
            Log.w(TAG, "⚠️ Utilisateur non premium, handleNext() ignoré - BLOCAGE 1");
            return;
        }

        Log.d(TAG,
                "⏭️ handleNext() - État actuel - isPlaying: " + isPlaying + ", currentSurah: '" + currentSurah + "'");

        // Extraire le numéro de sourate actuel
        int currentSurahNumber = extractSurahNumber(currentSurah);
        Log.d(TAG, "⏭️ handleNext() - Numéro de sourate extrait: " + currentSurahNumber);

        // Si on ne peut pas extraire le numéro, essayer de le déduire du nom
        if (currentSurahNumber <= 0) {
            Log.w(TAG, "⚠️ Impossible d'extraire le numéro de sourate actuel - currentSurah: '" + currentSurah + "'");
            Log.d(TAG, "🔄 Tentative de déduction du numéro depuis le nom...");
            currentSurahNumber = getSurahNumberByName(currentSurah);
            Log.d(TAG, "🔄 Numéro déduit: " + currentSurahNumber);
        }

        if (currentSurahNumber <= 0) {
            Log.w(TAG, "⚠️ Impossible de déterminer le numéro de sourate - currentSurah: '" + currentSurah
                    + "' - BLOCAGE 2");
            return;
        }

        // MODIFIÉ : Permettre la navigation même sans sourates téléchargées (streaming)
        java.util.List<Integer> downloadedSurahs = getDownloadedSurahs(currentReciter);
        Log.d(TAG, "🔍 - Sourates téléchargées: " + downloadedSurahs.size() + " sourates");
        Log.d(TAG, "🔍 - Liste sourates: " + downloadedSurahs.toString());

        // Si pas de sourates téléchargées, utiliser la navigation séquentielle
        if (downloadedSurahs.isEmpty()) {
            Log.d(TAG, "🌐 Aucune sourate téléchargée, navigation séquentielle activée");
            int nextSurahNumber = currentSurahNumber + 1;
            if (nextSurahNumber <= 114) {
                Log.d(TAG, "🔄 Navigation séquentielle vers sourate: " + nextSurahNumber);
                loadSurahByNumber(nextSurahNumber);
            } else {
                Log.d(TAG, "⏹️ Dernière sourate atteinte (114)");
            }
            return;
        }

        // Trouver la sourate suivante téléchargée
        int nextSurahNumber = -1;
        for (int surahNumber : downloadedSurahs) {
            if (surahNumber > currentSurahNumber) {
                nextSurahNumber = surahNumber;
                break;
            }
        }

        Log.d(TAG, "🔍 - Sourate actuelle: " + currentSurahNumber);
        Log.d(TAG, "🔍 - Sourate suivante trouvée: " + nextSurahNumber);

        // Si pas de sourate suivante et boucle activée, aller à la première
        if (nextSurahNumber == -1 && loopEnabled) {
            nextSurahNumber = downloadedSurahs.get(0);
            Log.d(TAG, "🔄 Boucle activée, retour à la première sourate: " + nextSurahNumber);
        }

        if (nextSurahNumber != -1) {
            Log.d(TAG,
                    "🔄 Navigation vers sourate suivante téléchargée: " + currentSurahNumber + " → " + nextSurahNumber);
            Log.d(TAG, "⏭️ Appel de loadDownloadedSurahByNumber(" + nextSurahNumber + ")");
            loadDownloadedSurahByNumber(nextSurahNumber);
        } else {
            Log.d(TAG, "⏹️ Pas de sourate suivante téléchargée - BLOCAGE 4");
        }

        // 🎯 NOUVEAU : S'assurer que le timer continue après navigation suivante
        if (isPlaying && mediaPlayer != null) {
            Log.d(TAG, "🔄 Vérification timer après navigation suivante");
            progressHandler.postDelayed(() -> {
                if (isPlaying && mediaPlayer != null) {
                    startProgressTimer();
                    Log.d(TAG, "✅ Timer redémarré après navigation suivante");
                }
            }, 1000);
        }

        Log.d(TAG, "⏭️ handleNext() - FIN");
    }

    /**
     * Extraire le numéro de sourate depuis le nom de la sourate
     */
    private int extractSurahNumber(String surahName) {
        if (surahName == null || surahName.isEmpty()) {
            return 0;
        }

        // Chercher le pattern "(001)", "(002)", etc.
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\((\\d{3})\\)");
        java.util.regex.Matcher matcher = pattern.matcher(surahName);

        if (matcher.find()) {
            String numberStr = matcher.group(1);
            return Integer.parseInt(numberStr);
        }

        // Fallback : chercher dans la liste des noms de sourates
        return getSurahNumberByName(surahName);
    }

    /**
     * Obtenir le numéro de sourate par son nom
     */
    private int getSurahNumberByName(String surahName) {
        // Liste complète des 114 sourates
        java.util.Map<String, Integer> surahNames = new java.util.HashMap<>();
        surahNames.put("Al-Fatiha", 1);
        surahNames.put("Al-Baqarah", 2);
        surahNames.put("Aal-E-Imran", 3);
        surahNames.put("An-Nisa", 4);
        surahNames.put("Al-Maidah", 5);
        surahNames.put("Al-An'am", 6);
        surahNames.put("Al-A'raf", 7);
        surahNames.put("Al-Anfal", 8);
        surahNames.put("At-Tawbah", 9);
        surahNames.put("Yunus", 10);
        surahNames.put("Hud", 11);
        surahNames.put("Yusuf", 12);
        surahNames.put("Ar-Ra'd", 13);
        surahNames.put("Ibrahim", 14);
        surahNames.put("Al-Hijr", 15);
        surahNames.put("An-Nahl", 16);
        surahNames.put("Al-Isra", 17);
        surahNames.put("Al-Kahf", 18);
        surahNames.put("Maryam", 19);
        surahNames.put("Ta-Ha", 20);
        surahNames.put("Al-Anbiya", 21);
        surahNames.put("Al-Hajj", 22);
        surahNames.put("Al-Mu'minun", 23);
        surahNames.put("An-Nur", 24);
        surahNames.put("Al-Furqan", 25);
        surahNames.put("Ash-Shu'ara", 26);
        surahNames.put("An-Naml", 27);
        surahNames.put("Al-Qasas", 28);
        surahNames.put("Al-Ankabut", 29);
        surahNames.put("Ar-Rum", 30);
        surahNames.put("Luqman", 31);
        surahNames.put("As-Sajdah", 32);
        surahNames.put("Al-Ahzab", 33);
        surahNames.put("Saba", 34);
        surahNames.put("Fatir", 35);
        surahNames.put("Ya-Sin", 36);
        surahNames.put("As-Saffat", 37);
        surahNames.put("Sad", 38);
        surahNames.put("Az-Zumar", 39);
        surahNames.put("Ghafir", 40);
        surahNames.put("Fussilat", 41);
        surahNames.put("Ash-Shura", 42);
        surahNames.put("Az-Zukhruf", 43);
        surahNames.put("Ad-Dukhan", 44);
        surahNames.put("Al-Jathiyah", 45);
        surahNames.put("Al-Ahqaf", 46);
        surahNames.put("Muhammad", 47);
        surahNames.put("Al-Fath", 48);
        surahNames.put("Al-Hujurat", 49);
        surahNames.put("Qaf", 50);
        surahNames.put("Adh-Dhariyat", 51);
        surahNames.put("At-Tur", 52);
        surahNames.put("An-Najm", 53);
        surahNames.put("Al-Qamar", 54);
        surahNames.put("Ar-Rahman", 55);
        surahNames.put("Al-Waqi'ah", 56);
        surahNames.put("Al-Hadid", 57);
        surahNames.put("Al-Mujadila", 58);
        surahNames.put("Al-Hashr", 59);
        surahNames.put("Al-Mumtahanah", 60);
        surahNames.put("As-Saff", 61);
        surahNames.put("Al-Jumu'ah", 62);
        surahNames.put("Al-Munafiqun", 63);
        surahNames.put("At-Taghabun", 64);
        surahNames.put("At-Talaq", 65);
        surahNames.put("At-Tahrim", 66);
        surahNames.put("Al-Mulk", 67);
        surahNames.put("Al-Qalam", 68);
        surahNames.put("Al-Haqqah", 69);
        surahNames.put("Al-Ma'arij", 70);
        surahNames.put("Nuh", 71);
        surahNames.put("Al-Jinn", 72);
        surahNames.put("Al-Muzzammil", 73);
        surahNames.put("Al-Muddaththir", 74);
        surahNames.put("Al-Qiyamah", 75);
        surahNames.put("Al-Insan", 76);
        surahNames.put("Al-Mursalat", 77);
        surahNames.put("An-Naba", 78);
        surahNames.put("An-Nazi'at", 79);
        surahNames.put("Abasa", 80);
        surahNames.put("At-Takwir", 81);
        surahNames.put("Al-Infitar", 82);
        surahNames.put("Al-Mutaffifin", 83);
        surahNames.put("Al-Inshiqaq", 84);
        surahNames.put("Al-Buruj", 85);
        surahNames.put("At-Tariq", 86);
        surahNames.put("Al-A'la", 87);
        surahNames.put("Al-Ghashiyah", 88);
        surahNames.put("Al-Fajr", 89);
        surahNames.put("Al-Balad", 90);
        surahNames.put("Ash-Shams", 91);
        surahNames.put("Al-Layl", 92);
        surahNames.put("Ad-Duha", 93);
        surahNames.put("Ash-Sharh", 94);
        surahNames.put("At-Tin", 95);
        surahNames.put("Al-Alaq", 96);
        surahNames.put("Al-Qadr", 97);
        surahNames.put("Al-Bayyinah", 98);
        surahNames.put("Az-Zalzalah", 99);
        surahNames.put("Al-Adiyat", 100);
        surahNames.put("Al-Qari'ah", 101);
        surahNames.put("At-Takathur", 102);
        surahNames.put("Al-Asr", 103);
        surahNames.put("Al-Humazah", 104);
        surahNames.put("Al-Fil", 105);
        surahNames.put("Quraysh", 106);
        surahNames.put("Al-Ma'un", 107);
        surahNames.put("Al-Kawthar", 108);
        surahNames.put("Al-Kafirun", 109);
        surahNames.put("An-Nasr", 110);
        surahNames.put("Al-Masad", 111);
        surahNames.put("Al-Ikhlas", 112);
        surahNames.put("Al-Falaq", 113);
        surahNames.put("An-Nas", 114);

        // Chercher le nom de la sourate dans la map
        for (java.util.Map.Entry<String, Integer> entry : surahNames.entrySet()) {
            if (surahName.contains(entry.getKey())) {
                return entry.getValue();
            }
        }

        return 0;
    }

    /**
     * Charger une sourate par son numéro
     */
    private void loadSurahByNumber(int surahNumber) {
        loadSurahByNumber(surahNumber, false);
    }

    private void loadSurahByNumber(int surahNumber, boolean forceAutoPlay) {
        Log.d(TAG, "🎵 loadSurahByNumber - DÉBUT - surahNumber: " + surahNumber
                + " forceAutoPlay=" + forceAutoPlay);

        if (surahNumber < 1 || surahNumber > 114) {
            Log.e(TAG, "❌ Numéro de sourate invalide: " + surahNumber);
            return;
        }

        // Obtenir le nom de la sourate
        String surahName = getSurahNameFromNumber(surahNumber);
        if (surahName == null) {
            Log.e(TAG, "❌ Nom de sourate non trouvé pour le numéro: " + surahNumber);
            return;
        }

        Log.d(TAG, "🎵 Chargement sourate " + surahNumber + ": " + surahName);
        Log.d(TAG, "🎵 Récitateur actuel: " + currentReciter);

        // Conserver l'intention d'auto-play (fin de sourate) : isPlaying est déjà false
        this.wasPlayingBeforeNavigation = forceAutoPlay || isPlaying;
        Log.d(TAG, "🎵 État de lecture avant navigation: " + this.wasPlayingBeforeNavigation);

        // Construire l'URL audio
        String audioUrl = buildAudioUrl(surahNumber, surahName, currentReciter);
        if (audioUrl == null) {
            Log.e(TAG, "❌ Impossible de construire l'URL audio");
            return;
        }

        Log.d(TAG, "🎵 URL audio construite: " + audioUrl);
        Log.d(TAG, "🎵 Appel de loadAudioWithAutoPlay avec wasPlayingBeforeNavigation: "
                + this.wasPlayingBeforeNavigation);

        // CORRECTION : Construire le nom complet avec récitateur pour la cohérence
        String fullSurahName = surahName + " - " + currentReciter;
        Log.d(TAG, "🎵 Nom complet sourate: " + fullSurahName);

        // Charger l'audio avec auto-play si l'utilisateur était en train d'écouter
        loadAudioWithAutoPlay(audioUrl, fullSurahName, currentReciter, this.wasPlayingBeforeNavigation);

        Log.d(TAG, "🎵 loadSurahByNumber - FIN");
    }

    /**
     * Obtenir le nom de la sourate à partir de son numéro
     */
    private String getSurahNameFromNumber(int surahNumber) {
        // Liste complète des 114 sourates
        String[] surahNames = {
                null, // Index 0 non utilisé
                "Al-Fatiha", "Al-Baqarah", "Aal-E-Imran", "An-Nisa", "Al-Maidah",
                "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
                "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr",
                "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
                "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan",
                "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum",
                "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir",
                "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
                "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah",
                "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
                "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman",
                "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah",
                "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq",
                "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
                "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah",
                "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa",
                "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj",
                "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
                "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin",
                "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat",
                "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil",
                "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
                "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
        };

        if (surahNumber >= 1 && surahNumber <= 114) {
            // CORRECTION : Retourner le nom avec le numéro entre parenthèses pour la
            // navigation
            return surahNames[surahNumber] + " (" + String.format("%03d", surahNumber) + ")";
        }

        return null;
    }

    /**
     * Construire l'URL audio pour une sourate
     */
    private String buildAudioUrl(int surahNumber, String surahName, String reciter) {
        Log.d(TAG, "🔗 buildAudioUrl - DÉBUT - surahNumber: " + surahNumber + ", surahName: " + surahName
                + ", reciter: " + reciter);

        if (surahName == null || reciter == null || reciter.isEmpty()) {
            Log.w(TAG, "⚠️ Données manquantes pour construire l'URL audio");
            Log.w(TAG, "⚠️ - surahName: " + surahName);
            Log.w(TAG, "⚠️ - reciter: " + reciter);
            return null;
        }

        try {
            // Formater le numéro de sourate avec 3 chiffres
            String formattedNumber = String.format("%03d", surahNumber);
            Log.d(TAG, "🔗 Numéro formaté: " + formattedNumber);

            // NOUVEAU : Nettoyer le nom de la sourate en retirant le numéro entre
            // parenthèses
            String cleanSurahName = surahName;
            if (surahName.contains("(")) {
                cleanSurahName = surahName.substring(0, surahName.indexOf("(")).trim();
                Log.d(TAG, "🔗 Nom de sourate nettoyé: '" + cleanSurahName + "' (original: '" + surahName + "')");
            }

            // Construire l'URL de base
            String baseUrl = "https://myadhanapp.com/api/recitations.php";
            // CORRECTION CRITIQUE: Utiliser seulement le numéro formaté comme dans l'app
            // qui fonctionne
            String surahParam = formattedNumber;
            String encodedReciter = java.net.URLEncoder.encode(reciter, "UTF-8");

            Log.d(TAG, "🔗 Paramètres URL:");
            Log.d(TAG, "🔗 - baseUrl: " + baseUrl);
            Log.d(TAG, "🔗 - cleanSurahName: " + cleanSurahName);
            Log.d(TAG, "🔗 - surahParam: " + surahParam);
            Log.d(TAG, "🔗 - encodedReciter: " + encodedReciter);

            StringBuilder urlBuilder = new StringBuilder(baseUrl);
            urlBuilder.append("?action=stream");
            urlBuilder.append("&reciter=").append(encodedReciter);
            urlBuilder.append("&surah=").append(surahParam);

            // AJOUT CRUCIAL: Récupérer le token depuis les SharedPreferences
            try {
                android.content.SharedPreferences prefs = getSharedPreferences("premium_prefs", MODE_PRIVATE);
                String userToken = prefs.getString("user_token", "");
                if (!userToken.isEmpty()) {
                    urlBuilder.append("&token=").append(userToken);
                    Log.d(TAG, "🔗 Token ajouté à l'URL");
                } else {
                    Log.w(TAG, "⚠️ Aucun token utilisateur trouvé");
                }
            } catch (Exception e) {
                Log.e(TAG, "❌ Erreur récupération token: " + e.getMessage());
            }

            String audioUrl = urlBuilder.toString();

            Log.d(TAG, "🔗 URL audio construite: " + audioUrl);
            return audioUrl;
        } catch (java.io.UnsupportedEncodingException e) {
            Log.e(TAG, "❌ Erreur encodage URL: " + e.getMessage());
            return null;
        }
    }

    /**
     * Gérer le seek
     */
    public void handleSeek(int position) {
        if (!isPremiumUser || mediaPlayer == null) {
            QuranSeekDebug.log(getApplicationContext(), "SEEK_REJECTED",
                    "premium=" + isPremiumUser + " player=" + (mediaPlayer != null));
            return;
        }
        if (!isMediaReady) {
            Log.d(TAG, "🎯 Seek en attente (MediaPlayer pas prêt): " + position);
            pendingSeekMs = position;
            QuranSeekDebug.log(getApplicationContext(), "SEEK_PENDING",
                    "targetMs=" + position + " surah=" + currentSurah);
            return;
        }
        QuranSeekDebug.log(getApplicationContext(), "SEEK_REQUEST",
                "targetMs=" + position + " pos=" + currentPosition + " dur=" + totalDuration
                        + " playing=" + isPlaying + " path=" + shortenPath(currentAudioPath));
        performSeek(position, 0);
    }

    private static String shortenPath(String path) {
        if (path == null) {
            return "null";
        }
        if (path.length() <= 120) {
            return path;
        }
        return path.substring(0, 60) + "…" + path.substring(path.length() - 40);
    }

    private void cancelSeekResumeTimeout() {
        if (seekResumeTimeoutRunnable != null) {
            progressHandler.removeCallbacks(seekResumeTimeoutRunnable);
            seekResumeTimeoutRunnable = null;
        }
    }

    /** Si OnSeekComplete ne vient pas (sourates courtes / stream), évite de rester bloqué en pause. */
    private void scheduleSeekResumeFallback(final boolean wasPlaying) {
        cancelSeekResumeTimeout();
        if (!wasPlaying) {
            return;
        }
        seekResumeTimeoutRunnable = () -> {
            seekResumeTimeoutRunnable = null;
            if (mediaPlayer == null) {
                return;
            }
            try {
                if (!mediaPlayer.isPlaying()) {
                    mediaPlayer.start();
                    isPlaying = true;
                    currentPosition = mediaPlayer.getCurrentPosition();
                    Log.w(TAG, "⏩ Reprise forcée après seek (timeout)");
                    QuranSeekDebug.log(getApplicationContext(), "SEEK_TIMEOUT_RESUME",
                            "pos=" + currentPosition + " dur=" + totalDuration);
                    broadcastAudioProgress();
                    QuranWidget.updatePlaybackState(
                            getApplicationContext(), isPlaying, currentPosition, totalDuration);
                    updateMediaSessionCompatMetadata();
                }
            } catch (Exception e) {
                Log.e(TAG, "❌ Reprise forcée seek: " + e.getMessage());
            }
        };
        progressHandler.postDelayed(seekResumeTimeoutRunnable, 1200);
    }

    private void performSeek(final int targetMs, final int attempt) {
        if (mediaPlayer == null) {
            return;
        }

        int clamped = targetMs;
        if (totalDuration > 0 && clamped > totalDuration) {
            clamped = totalDuration;
        }
        if (clamped < 0) {
            clamped = 0;
        }

        final int seekTarget = clamped;
        final boolean wasPlaying = isPlaying;

        Log.d(TAG, "🎯 Seek vers: " + seekTarget + "ms (tentative " + (attempt + 1) + ")");
        QuranSeekDebug.log(getApplicationContext(), "SEEK_START",
                "target=" + seekTarget + " attempt=" + (attempt + 1) + " wasPlaying=" + wasPlaying
                        + " playerDur=" + safePlayerDuration());

        cancelSeekResumeTimeout();
        final int gen = ++seekGeneration;

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                mediaPlayer.seekTo((long) seekTarget, MediaPlayer.SEEK_CLOSEST);
            } else {
                mediaPlayer.seekTo(seekTarget);
            }

            scheduleSeekResumeFallback(wasPlaying);
            scheduleSeekVerification(gen, seekTarget, wasPlaying, attempt);

            final int finalAttempt = attempt;
            mediaPlayer.setOnSeekCompleteListener(mp -> {
                cancelSeekResumeTimeout();
                finishSeekFromListener(mp, seekTarget, wasPlaying, finalAttempt, gen);
            });
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur seek: " + e.getMessage());
            QuranSeekDebug.log(getApplicationContext(), "SEEK_ERROR", e.getMessage());
            cancelSeekResumeTimeout();
            if (wasPlaying) {
                try {
                    mediaPlayer.start();
                    isPlaying = true;
                } catch (Exception ignored) {
                }
            }
        }
    }

    private void finishSeekFromListener(MediaPlayer mp, int seekTarget, boolean wasPlaying, int attempt,
            int gen) {
        if (gen != seekGeneration) {
            return;
        }
        int actual = mp.getCurrentPosition();
        boolean seekLanded = Math.abs(actual - seekTarget) <= 5000;
        boolean nowPlaying = false;
        try {
            nowPlaying = mp.isPlaying();
        } catch (Exception ignored) {
        }

        QuranSeekDebug.log(getApplicationContext(), "SEEK_COMPLETE",
                "target=" + seekTarget + " actual=" + actual + " landed=" + seekLanded
                        + " playing=" + nowPlaying + " playerDur=" + safePlayerDuration()
                        + " attempt=" + (attempt + 1));

        if (!seekLanded && attempt < 1 && safePlayerDuration() <= 0) {
            mp.setOnSeekCompleteListener(null);
            progressHandler.postDelayed(() -> performSeek(seekTarget, attempt + 1), 200);
            return;
        }

        if (!seekLanded && attempt < 1) {
            mp.setOnSeekCompleteListener(null);
            progressHandler.postDelayed(() -> performSeek(seekTarget, attempt + 1), 200);
            return;
        }

        currentPosition = actual;
        if (wasPlaying && !mp.isPlaying()) {
            try {
                mp.start();
                isPlaying = true;
            } catch (Exception e) {
                QuranSeekDebug.log(getApplicationContext(), "SEEK_RESUME_FAIL", e.getMessage());
            }
        }
        broadcastAudioProgress();
        QuranWidget.updatePlaybackState(
                getApplicationContext(), isPlaying, currentPosition, totalDuration);
        updateMediaSessionCompatMetadata();
        mp.setOnSeekCompleteListener(null);
    }

    /** Ne dépend pas uniquement de OnSeekComplete (souvent absent si playerDur=-1). */
    private void scheduleSeekVerification(final int gen, final int seekTarget, final boolean wasPlaying,
            final int attempt) {
        progressHandler.postDelayed(() -> {
            if (gen != seekGeneration || mediaPlayer == null) {
                return;
            }
            try {
                int actual = mediaPlayer.getCurrentPosition();
                int playerDur = safePlayerDuration();
                boolean landed = Math.abs(actual - seekTarget) <= 5000;
                boolean playing = mediaPlayer.isPlaying();

                QuranSeekDebug.log(getApplicationContext(), "SEEK_POLL",
                        "target=" + seekTarget + " actual=" + actual + " landed=" + landed
                                + " playing=" + playing + " playerDur=" + playerDur);

                if (wasPlaying && !playing) {
                    mediaPlayer.start();
                    isPlaying = true;
                    playing = true;
                }

                if (landed) {
                    currentPosition = actual;
                    broadcastAudioProgress();
                    QuranWidget.updatePlaybackState(
                            getApplicationContext(), isPlaying, currentPosition, totalDuration);
                    updateMediaSessionCompatMetadata();
                    return;
                }

                if (attempt < 2) {
                    scheduleSeekVerification(gen, seekTarget, wasPlaying, attempt + 1);
                } else {
                    currentPosition = actual;
                    broadcastAudioProgress();
                }
            } catch (Exception e) {
                QuranSeekDebug.log(getApplicationContext(), "SEEK_POLL_ERR", e.getMessage());
            }
        }, 350L * (attempt + 1));
    }

    private int safePlayerDuration() {
        try {
            return mediaPlayer != null ? mediaPlayer.getDuration() : -1;
        } catch (Exception e) {
            return -1;
        }
    }

    /**
     * Gérer l'arrêt
     */
    private void handleStop() {
        Log.d(TAG, "⏹️ Arrêt");
        stopAudio();

        // Arrêter le service en mode foreground si il était actif
        if (isForegroundService()) {
            stopForeground(true);
            Log.d(TAG, "🎵 Service arrêté du mode foreground");
        }

        stopSelf();
    }

    /**
     * NOUVEAU : Gérer le toggle auto-avancement
     */
    private void handleToggleAutoAdvance() {
        if (!isPremiumUser)
            return;

        boolean newState = !autoAdvanceEnabled;
        setAutoAdvanceEnabled(newState);

        Log.d(TAG, "🎵 Auto-avancement " + (newState ? "activé" : "désactivé"));

        // Diffuser l'état pour mettre à jour le widget
        broadcastAudioStateChanged();
        updateQuranWidget();

        // 🎯 NOUVEAU : Mettre à jour directement les options du widget
        QuranWidget.updateReadingOptions(autoAdvanceEnabled, loopEnabled);
    }

    /**
     * NOUVEAU : Gérer le toggle boucle
     */
    private void handleToggleLoop() {
        if (!isPremiumUser)
            return;

        boolean newState = !loopEnabled;
        setLoopEnabled(newState);

        Log.d(TAG, "🎵 Boucle " + (newState ? "activée" : "désactivée"));

        // Diffuser l'état pour mettre à jour le widget
        broadcastAudioStateChanged();
        updateQuranWidget();

        // 🎯 NOUVEAU : Mettre à jour directement les options du widget
        QuranWidget.updateReadingOptions(autoAdvanceEnabled, loopEnabled);
    }

    /**
     * Lancer la lecture audio
     */
    public void playAudio() {
        Log.d(TAG, "🎵 playAudio() appelé - isPremiumUser: " + isPremiumUser + ", mediaPlayer null: "
                + (mediaPlayer == null) + ", isMediaReady: " + isMediaReady);

        if (!isPremiumUser) {
            Log.w(TAG, "⚠️ Utilisateur non premium, lecture ignorée");
            return;
        }

        if (mediaPlayer == null) {
            Log.w(TAG, "⚠️ MediaPlayer null, réinitialisation...");
            initializeMediaPlayer();
        }

        if (!isMediaReady) {
            Log.d(TAG, "⏳ MediaPlayer pas encore prêt — lecture mise en file d'attente");
            pendingAutoPlayAfterPrepare = true;
            return;
        }

        if (mediaPlayer != null && !isPlaying) {
            startPlayback();
        }
    }

    /**
     * Démarrer la lecture audio
     */
    private void startPlayback() {
        try {
            Log.d(TAG, "🎵 startPlayback() - MediaPlayer null: " + (mediaPlayer == null));

            if (mediaPlayer == null) {
                Log.e(TAG, "❌ MediaPlayer null, impossible de démarrer la lecture");
                return;
            }

            // NOUVEAU : Vérifier si le MediaPlayer est prêt
            if (!mediaPlayer.isPlaying()) {
                Log.d(TAG, "🎵 MediaPlayer prêt, demande du focus audio...");

                // Demander le focus audio avec la nouvelle API
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    int result = audioManager.requestAudioFocus(audioFocusRequest);
                    if (result != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                        Log.w(TAG, "⚠️ Focus audio refusé");
                        return;
                    }
                    Log.d(TAG, "✅ Focus audio accordé (nouvelle API)");
                } else {
                    // Ancienne API pour Android < 8
                    int result = audioManager.requestAudioFocus(
                            null,
                            AudioManager.STREAM_MUSIC,
                            AudioManager.AUDIOFOCUS_GAIN);
                    if (result != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                        Log.w(TAG, "⚠️ Focus audio refusé (ancienne API)");
                        return;
                    }
                    Log.d(TAG, "✅ Focus audio accordé (ancienne API)");
                }

                // NOUVEAU : Attendre un peu que le MediaPlayer soit complètement prêt
                try {
                    Thread.sleep(100); // Attendre 100ms
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }

                // Démarrer la lecture
                Log.d(TAG, "🎵 Démarrage de la lecture...");
                mediaPlayer.start();
                isPlaying = true;

                // 🎯 CORRECTION: Obtenir la position actuelle du MediaPlayer (au lieu de forcer
                // à 0)
                currentPosition = mediaPlayer.getCurrentPosition();
                int reportedDuration = mediaPlayer.getDuration();
                if (reportedDuration > 0) {
                    updateDurationFromPlayer(reportedDuration);
                } else if (totalDuration <= 0 && expectedDurationMs > 0) {
                    totalDuration = expectedDurationMs;
                }
                if (safePlayerDuration() <= 0) {
                    startDurationPoll();
                }
                Log.d(TAG, "🎯 Position actuelle récupérée: " + currentPosition + "ms, durée: "
                        + totalDuration + "ms");

                // NOUVEAU : Réinitialiser la variable de focus car l'utilisateur a cliqué
                // manuellement
                wasPlayingBeforeFocusLoss = false;

                // Sauvegarder l'état
                saveAudioState();

                // Démarrer le timer de progression
                startProgressTimer();

                Log.d(TAG, "▶️ Lecture audio démarrée avec succès");

                // Diffuser l'état
                broadcastAudioStateChanged();
                updateNotification();

                // NOUVEAU : Mettre à jour directement l'état du widget
                Log.d(TAG, "🚀 Mise à jour directe de l'état du widget après démarrage lecture");
                QuranWidget.updatePlaybackState(getApplicationContext(), isPlaying, currentPosition, totalDuration);

                // 🎯 METTRE À JOUR MediaSessionCompat pour écran de verrouillage avec la bonne
                // position
                Log.d(TAG, "🎯 Mise à jour métadonnées écran de verrouillage après PLAY - Position: " + currentPosition
                        + "ms");
                updateMediaSessionCompatMetadata();

            } else {
                Log.d(TAG, "🎵 MediaPlayer déjà en lecture");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur démarrage lecture: " + e.getMessage());
            isPlaying = false;
            broadcastAudioStateChanged();
        }
    }

    /**
     * Mettre en pause l'audio
     */
    public void pauseAudio() {
        if (mediaPlayer == null || !isPlaying)
            return;

        try {
            // 🎯 SAUVEGARDER la position AVANT de faire pause
            currentPosition = mediaPlayer.getCurrentPosition();
            Log.d(TAG, "🎯 Position sauvegardée avant pause: " + currentPosition + "ms");

            mediaPlayer.pause();
            isPlaying = false;

            // NOUVEAU : Réinitialiser la variable de focus car l'utilisateur a cliqué
            // manuellement
            wasPlayingBeforeFocusLoss = false;

            // Sauvegarder l'état
            saveAudioState();

            // Arrêter le timer de progression
            stopProgressTimer();

            Log.d(TAG, "🚨🚨🚨 VERSION_DEBUG_LOCK_SCREEN_2025 - pauseAudio() NOUVELLE VERSION 🚨🚨🚨");
            Log.d(TAG, "🚨🚨🚨 NOUVELLE VERSION CONFIRMÉE 2025 🚨🚨🚨 Audio mis en pause");

            // Diffuser l'état
            broadcastAudioStateChanged();
            updateNotification();

            // NOUVEAU : Mettre à jour directement l'état du widget
            Log.d(TAG, "🚀 Mise à jour directe de l'état du widget après pause");
            QuranWidget.updatePlaybackState(getApplicationContext(), isPlaying, currentPosition, totalDuration);

            // 🎯 METTRE À JOUR MediaSessionCompat pour écran de verrouillage
            Log.d(TAG, "🎯 Mise à jour métadonnées écran de verrouillage après PAUSE");
            updateMediaSessionCompatMetadata();

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur pause audio: " + e.getMessage());
        }
    }

    /**
     * Arrêter la lecture audio
     */
    public void stopAudio() {
        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
            }

            isPlaying = false;
            currentPosition = 0;

            // NOUVEAU : Réinitialiser la variable de focus car l'utilisateur a cliqué
            // manuellement
            wasPlayingBeforeFocusLoss = false;

            // Sauvegarder l'état
            saveAudioState();

            // Arrêter le timer de progression
            stopProgressTimer();

            Log.d(TAG, "⏹️ Audio arrêté");

            // Arrêter le service en mode foreground si il n'y a plus de lecture active
            if (isForegroundService() && !isPlaying && currentAudioPath.isEmpty()) {
                stopForeground(true);
                Log.d(TAG, "🎵 Service arrêté du mode foreground (plus de lecture active)");
            }

            // Diffuser l'état
            broadcastAudioStateChanged();
            updateNotification();

            // NOUVEAU : Mettre à jour directement l'état du widget
            Log.d(TAG, "🚀 Mise à jour directe de l'état du widget après arrêt");
            QuranWidget.updatePlaybackState(getApplicationContext(), isPlaying, currentPosition, totalDuration);

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur arrêt audio: " + e.getMessage());
        }
    }

    /**
     * Charger un fichier audio
     */
    public void loadAudio(String audioPath, String surah, String reciter) {
        loadAudio(audioPath, surah, reciter, 0);
    }

    public void loadAudio(String audioPath, String surah, String reciter, int expectedDuration) {
        loadAudio(audioPath, surah, reciter, expectedDuration, false);
    }

    public void loadAudio(String audioPath, String surah, String reciter, int expectedDuration,
            boolean autoPlay) {
        pendingAutoPlayAfterPrepare = autoPlay;
        expectedDurationMs = expectedDuration > 0 ? expectedDuration : 0;
        Log.d(TAG, "🎵 Chargement audio: " + surah + " - " + reciter + " - " + audioPath
                + " (durée attendue=" + expectedDurationMs + "ms, autoPlay=" + autoPlay + ")");

        clearAlbumArt();

        if (!isPremiumUser) {
            Log.w(TAG, "⚠️ Utilisateur non premium, chargement ignoré");
            return;
        }

        // Le service est déjà en mode foreground depuis onCreate()
        // Juste mettre à jour la notification
        updateNotification();
        Log.d(TAG, "🎵 Notification mise à jour pour chargement audio premium");

        // Vérifier si le service Adhan est actif et attendre
        waitForAdhanServiceToFinish();

        if (mediaPlayer == null) {
            Log.w(TAG, "⚠️ MediaPlayer null, réinitialisation...");
            initializeMediaPlayer();
        }

        try {
            // Arrêter la lecture actuelle
            if (isPlaying) {
                try {
                    mediaPlayer.stop();
                } catch (Exception e) {
                    Log.w(TAG, "⚠️ Erreur arrêt MediaPlayer: " + e.getMessage());
                }
                isPlaying = false;
            }

            // Réinitialiser le MediaPlayer proprement
            try {
                mediaPlayer.reset();
            } catch (Exception e) {
                Log.w(TAG, "⚠️ Erreur reset MediaPlayer: " + e.getMessage());
                // Réinitialiser complètement le MediaPlayer
                initializeMediaPlayer();
            }

            clearPlaybackTimingBeforeLoad();

            // Charger le nouveau fichier
            if (audioPath.startsWith("http")) {
                if (!isNetworkAvailable()) {
                    Log.e(TAG, "❌ Pas de connexion réseau pour le streaming");
                    return;
                }

                String playbackUrl = preferStreamPlaybackUrl(audioPath);
                Log.d(TAG, "🎵 Chargement HTTP (stream/Range): " + playbackUrl);
                QuranSeekDebug.log(getApplicationContext(), "LOAD_HTTP",
                        shortenPath(playbackUrl) + " expected=" + expectedDurationMs);

                try {
                    Uri audioUri = Uri.parse(playbackUrl);
                    mediaPlayer.setDataSource(getApplicationContext(), audioUri,
                            httpHeadersForAudioUrl(playbackUrl));

                } catch (Exception e) {
                    Log.e(TAG, "❌ Erreur chargement stream: " + e.getMessage());

                    try {
                        String downloadUrl = playbackUrl.contains("action=stream")
                                ? playbackUrl.replace("action=stream", "action=download")
                                : playbackUrl;
                        Log.d(TAG, "🔄 Fallback download: " + downloadUrl);
                        Uri audioUri = Uri.parse(downloadUrl);
                        mediaPlayer.setDataSource(getApplicationContext(), audioUri,
                                httpHeadersForAudioUrl(downloadUrl));
                        playbackUrl = downloadUrl;
                    } catch (Exception fallbackError) {
                        Log.e(TAG, "❌ Erreur fallback download: " + fallbackError.getMessage());
                        handleStreamingError(audioPath, surah, reciter);
                        return;
                    }
                }
                audioPath = playbackUrl;
            } else {
                // Fichier local
                File audioFile = new File(audioPath);
                if (audioFile.exists()) {
                    Log.d(TAG, "🎵 Chargement fichier local: " + audioFile.getAbsolutePath());
                    mediaPlayer.setDataSource(audioFile.getAbsolutePath());
                } else {
                    Log.e(TAG, "❌ Fichier audio introuvable: " + audioPath);
                    return;
                }
            }

            // Préparer le MediaPlayer de manière asynchrone
            mediaPlayer.prepareAsync();

            // NOUVEAU : Définir le OnPreparedListener par défaut
            mediaPlayer.setOnPreparedListener(mp -> {
                Log.d(TAG, "🎵 MediaPlayer prêt");
                isMediaReady = true;
                applyResolvedDuration(mp);
                currentPosition = 0;
                if (pendingSeekMs >= 0) {
                    int seek = pendingSeekMs;
                    pendingSeekMs = -1;
                    performSeek(seek, 0);
                }
                Log.d(TAG, "🎵 Durée totale: " + totalDuration + "ms");

                if (pendingAutoPlayAfterPrepare) {
                    pendingAutoPlayAfterPrepare = false;
                    Log.d(TAG, "🎵 Démarrage automatique après prepareAsync");
                    startPlayback();
                }

                // NOUVEAU : Logs de debug pour vérifier l'envoi des événements
                Log.d(TAG, "🔍 Envoi événements après préparation - durée: " + totalDuration + "ms");
                broadcastAudioStateChanged();
                Log.d(TAG, "✅ Événement état audio envoyé");
                broadcastAudioProgress();
                Log.d(TAG, "✅ Événement progression audio envoyé");

                if (safePlayerDuration() <= 0) {
                    startDurationPoll();
                }

                Log.d(TAG,
                        "🔍 Vérification - totalDuration: " + totalDuration + ", currentPosition: " + currentPosition);
                if (currentAlbumArt == null && currentAudioPath != null) {
                    loadAlbumArtAsync(currentAudioPath);
                }
            });

            // Mettre à jour les variables d'état
            currentAudioPath = audioPath;
            currentSurah = surah;
            currentReciter = reciter;
            isPlaying = false;
            currentPosition = 0;

            loadAlbumArtAsync(audioPath);

            // Sauvegarder l'état
            saveAudioState();

            // 🎯 SUPPRIMÉ: updateMediaSessionMetadata() (causait double audio)

            // 🎯 METTRE À JOUR MediaSessionCompat pour contrôles écran de verrouillage
            updateMediaSessionCompatMetadata();

            Log.d(TAG, "✅ Audio chargé avec succès: " + surah + " - " + reciter);

            // Diffuser l'état
            broadcastAudioStateChanged();
            updateNotification();

            // NOUVEAU : Mettre à jour directement l'état du widget
            Log.d(TAG, "🚀 Mise à jour directe de l'état du widget après chargement audio");
            QuranWidget.updateCurrentAudio(this, surah, reciter, audioPath);
            QuranWidget.updatePlaybackState(getApplicationContext(), isPlaying, currentPosition, totalDuration);

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur chargement audio: " + e.getMessage());
        }
    }

    /**
     * Charger un fichier audio avec auto-play
     */
    private void loadAudioWithAutoPlay(String audioPath, String surah, String reciter,
            boolean wasPlayingBeforeNavigation) {
        Log.d(TAG, "🎵 loadAudioWithAutoPlay - DÉBUT");
        Log.d(TAG, "🎵 loadAudioWithAutoPlay - audioPath: " + audioPath);
        Log.d(TAG, "🎵 loadAudioWithAutoPlay - surah: " + surah);
        Log.d(TAG, "🎵 loadAudioWithAutoPlay - reciter: " + reciter);
        Log.d(TAG, "🎵 loadAudioWithAutoPlay - wasPlayingBeforeNavigation: " + wasPlayingBeforeNavigation);
        Log.d(TAG, "🎵 loadAudioWithAutoPlay - isPremiumUser: " + isPremiumUser);

        this.wasPlayingBeforeNavigation = wasPlayingBeforeNavigation;

        Log.d(TAG, "🎵 Chargement audio avec auto-play: " + surah + " - " + reciter + " - " + audioPath);

        if (!isPremiumUser) {
            Log.w(TAG, "⚠️ Utilisateur non premium, chargement ignoré");
            return;
        }

        clearAlbumArt();

        // Le service est déjà en mode foreground depuis onCreate()
        // Juste mettre à jour la notification
        updateNotification();
        Log.d(TAG, "🎵 Notification mise à jour pour chargement audio premium");

        // Vérifier si le service Adhan est actif et attendre
        waitForAdhanServiceToFinish();

        if (mediaPlayer == null) {
            Log.w(TAG, "⚠️ MediaPlayer null, réinitialisation...");
            initializeMediaPlayer();
        }

        try {
            // Arrêter la lecture actuelle
            if (isPlaying) {
                try {
                    mediaPlayer.stop();
                } catch (Exception e) {
                    Log.w(TAG, "⚠️ Erreur arrêt MediaPlayer: " + e.getMessage());
                }
                isPlaying = false;
            }

            // Réinitialiser le MediaPlayer proprement
            try {
                mediaPlayer.reset();
            } catch (Exception e) {
                Log.w(TAG, "⚠️ Erreur reset MediaPlayer: " + e.getMessage());
                // Réinitialiser complètement le MediaPlayer
                initializeMediaPlayer();
            }

            clearPlaybackTimingBeforeLoad();

            // Charger le nouveau fichier
            if (audioPath.startsWith("http")) {
                if (!isNetworkAvailable()) {
                    Log.e(TAG, "❌ Pas de connexion réseau pour le streaming");
                    return;
                }

                String playbackUrl = preferStreamPlaybackUrl(audioPath);
                Log.d(TAG, "🎵 Chargement HTTP (stream/Range): " + playbackUrl);
                QuranSeekDebug.log(getApplicationContext(), "LOAD_HTTP",
                        shortenPath(playbackUrl) + " expected=" + expectedDurationMs);

                try {
                    Uri audioUri = Uri.parse(playbackUrl);
                    mediaPlayer.setDataSource(getApplicationContext(), audioUri,
                            httpHeadersForAudioUrl(playbackUrl));

                } catch (Exception e) {
                    Log.e(TAG, "❌ Erreur chargement stream: " + e.getMessage());

                    try {
                        String downloadUrl = playbackUrl.contains("action=stream")
                                ? playbackUrl.replace("action=stream", "action=download")
                                : playbackUrl;
                        Log.d(TAG, "🔄 Fallback download: " + downloadUrl);
                        Uri audioUri = Uri.parse(downloadUrl);
                        mediaPlayer.setDataSource(getApplicationContext(), audioUri,
                                httpHeadersForAudioUrl(downloadUrl));
                        playbackUrl = downloadUrl;
                    } catch (Exception fallbackError) {
                        Log.e(TAG, "❌ Erreur fallback download: " + fallbackError.getMessage());
                        handleStreamingError(audioPath, surah, reciter);
                        return;
                    }
                }
                audioPath = playbackUrl;
            } else {
                // Fichier local
                File audioFile = new File(audioPath);
                if (audioFile.exists()) {
                    Log.d(TAG, "🎵 Chargement fichier local: " + audioFile.getAbsolutePath());
                    mediaPlayer.setDataSource(audioFile.getAbsolutePath());
                } else {
                    Log.e(TAG, "❌ Fichier audio introuvable: " + audioPath);
                    return;
                }
            }

            // Préparer le MediaPlayer de manière asynchrone
            mediaPlayer.prepareAsync();

            // Mettre à jour les variables d'état
            currentAudioPath = audioPath;
            currentSurah = surah;
            currentReciter = reciter;
            isPlaying = false; // Définir à false pour laisser le MediaPlayer gérer le démarrage
            currentPosition = 0;

            loadAlbumArtAsync(audioPath);

            // 🎯 SUPPRIMÉ: updateMediaSessionMetadata() (causait double audio)

            // Sauvegarder l'état
            saveAudioState();

            // NOUVEAU : Définir le MediaPlayer.OnPreparedListener pour gérer le démarrage
            // après chargement
            mediaPlayer.setOnPreparedListener(mp -> {
                Log.d(TAG, "🎵 MediaPlayer prêt, démarrage automatique...");
                isMediaReady = true;
                applyResolvedDuration(mp);
                if (currentAlbumArt == null && currentAudioPath != null) {
                    loadAlbumArtAsync(currentAudioPath);
                }
                currentPosition = 0;
                if (pendingSeekMs >= 0) {
                    int seek = pendingSeekMs;
                    pendingSeekMs = -1;
                    performSeek(seek, 0);
                }
                Log.d(TAG, "🎵 Durée totale: " + totalDuration + "ms");
                Log.d(TAG, "🎵 wasPlayingBeforeNavigation: " + wasPlayingBeforeNavigation);

                if (shouldAutoStartAfterNavigation()) {
                    Log.d(TAG, "🎵 Démarrage automatique car l'utilisateur était en train d'écouter");
                    try {
                        mp.start();
                        isPlaying = true;
                        Log.d(TAG, "🎵 Lecture démarrée automatiquement");

                        // Démarrer le timer de progression
                        startProgressTimer();

                        // Sauvegarder l'état
                        saveAudioState();

                        // 🎯 NOUVEAU : Synchroniser immédiatement avec le widget
                        QuranWidget.updatePlaybackState(getApplicationContext(), isPlaying, currentPosition, totalDuration);

                        // Diffuser l'état
                        broadcastAudioStateChanged();

                    } catch (Exception e) {
                        Log.e(TAG, "❌ Erreur démarrage automatique: " + e.getMessage());
                    }
                } else {
                    Log.d(TAG, "🎵 Pas de démarrage automatique car l'utilisateur n'était pas en train d'écouter");
                    isPlaying = false;

                    // 🎯 NOUVEAU : Synchroniser immédiatement avec le widget
                    QuranWidget.updatePlaybackState(getApplicationContext(), isPlaying, currentPosition, totalDuration);

                    // Sauvegarder l'état
                    saveAudioState();

                    // Diffuser l'état
                    broadcastAudioStateChanged();
                }

                // NOUVEAU : Logs de debug pour vérifier l'envoi des événements
                Log.d(TAG, "🔍 Envoi événements après préparation - durée: " + totalDuration + "ms");
                broadcastAudioStateChanged();
                Log.d(TAG, "✅ Événements envoyés après préparation");
            });

            Log.d(TAG, "✅ Audio chargé avec succès: " + surah + " - " + reciter);

            // Diffuser l'état
            broadcastAudioStateChanged();
            updateNotification();

            // NOUVEAU : Mettre à jour directement l'état du widget
            Log.d(TAG, "🚀 Mise à jour directe de l'état du widget après chargement audio");
            QuranWidget.updateCurrentAudio(this, surah, reciter, audioPath);
            QuranWidget.updatePlaybackState(getApplicationContext(), isPlaying, currentPosition, totalDuration);

            // 🎯 METTRE À JOUR MediaSessionCompat pour écran de verrouillage
            Log.d(TAG, "🎯 Mise à jour métadonnées écran de verrouillage après chargement audio");
            updateMediaSessionCompatMetadata();

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur chargement audio avec auto-play: " + e.getMessage());
        }
    }

    /**
     * Attendre que le service Adhan se termine
     */
    private void waitForAdhanServiceToFinish() {
        try {
            android.app.ActivityManager am = (android.app.ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
            for (android.app.ActivityManager.RunningServiceInfo service : am.getRunningServices(Integer.MAX_VALUE)) {
                if (service.service.getClassName().contains("AdhanService")) {
                    Log.d(TAG, "⏳ Service Adhan actif, attente...");
                    try {
                        Thread.sleep(1000); // Attendre 1 seconde
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    break;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "⚠️ Erreur vérification service Adhan: " + e.getMessage());
        }
    }

    /**
     * Vérifier la disponibilité réseau
     */
    private boolean isNetworkAvailable() {
        try {
            android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getSystemService(
                    Context.CONNECTIVITY_SERVICE);
            android.net.NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
        } catch (Exception e) {
            Log.w(TAG, "⚠️ Erreur vérification réseau: " + e.getMessage());
            return true; // Supposer que le réseau est disponible en cas d'erreur
        }
    }

    /**
     * Gérer les erreurs de streaming
     */
    private void handleStreamingError(String audioPath, String surah, String reciter) {
        Log.e(TAG, "❌ Erreur streaming pour: " + surah + " - " + reciter);
        Log.e(TAG, "❌ URL qui a échoué: " + audioPath);

        // Vérifier la connectivité réseau
        if (!isNetworkAvailable()) {
            Log.e(TAG, "❌ Pas de connexion réseau disponible");
        } else {
            Log.e(TAG, "❌ Connexion réseau disponible mais streaming échoué");
        }

        // TODO: Implémenter la logique de fallback ou de retry
    }

    /**
     * NOUVEAU : Obtenir la liste des sourates téléchargées pour un récitateur
     */
    private java.util.List<Integer> getDownloadedSurahs(String reciter) {
        java.util.List<Integer> downloadedSurahs = new java.util.ArrayList<>();

        try {
            // Construire le chemin du dossier du récitateur
            String reciterDir = getQuranDirectory() + "/" + reciter.replace(" ", "_");
            java.io.File reciterFolder = new java.io.File(reciterDir);

            if (!reciterFolder.exists() || !reciterFolder.isDirectory()) {
                Log.d(TAG, "📁 Dossier récitateur non trouvé: " + reciterDir);
                return downloadedSurahs;
            }

            // Scanner tous les fichiers MP3
            java.io.File[] files = reciterFolder.listFiles((dir, name) -> name.toLowerCase().endsWith(".mp3"));
            if (files != null) {
                for (java.io.File file : files) {
                    String fileName = file.getName();
                    // Extraire le numéro de sourate du nom de fichier (ex: "001_AlFatiha.mp3")
                    try {
                        String numberPart = fileName.substring(0, 3);
                        int surahNumber = Integer.parseInt(numberPart);
                        if (surahNumber >= 1 && surahNumber <= 114) {
                            downloadedSurahs.add(surahNumber);
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "⚠️ Impossible de parser le numéro de sourate: " + fileName);
                    }
                }
            }

            // Trier la liste
            java.util.Collections.sort(downloadedSurahs);
            Log.d(TAG, "📖 Sourates téléchargées pour " + reciter + ": " + downloadedSurahs.size() + " sourates");

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur scan sourates téléchargées: " + e.getMessage());
        }

        return downloadedSurahs;
    }

    /**
     * NOUVEAU : Obtenir le chemin du dossier Quran
     */
    private String getQuranDirectory() {
        return getFilesDir().getAbsolutePath() + "/quran";
    }

    /**
     * NOUVEAU : Avancer vers la prochaine sourate (téléchargée OU streaming)
     */
    private void advanceToNextSurah() {
        if (currentReciter == null || currentReciter.isEmpty()) {
            Log.w(TAG, "⚠️ Aucun récitateur actuel pour l'auto-avancement");
            return;
        }

        // Trouver la sourate actuelle
        int currentSurahNumber = extractSurahNumber(currentSurah);
        if (currentSurahNumber <= 0) {
            Log.w(TAG, "⚠️ Impossible de déterminer la sourate actuelle");
            return;
        }

        Log.d(TAG, "🔄 Auto-avancement depuis sourate " + currentSurahNumber);

        // Calcul de la prochaine sourate (simple : +1)
        int nextSurahNumber = currentSurahNumber + 1;

        // Vérifier si on dépasse la limite (114 sourates dans le Coran)
        if (nextSurahNumber > 114) {
            if (loopEnabled) {
                nextSurahNumber = 1; // Retour à la première sourate
                Log.d(TAG, "🔄 Boucle activée, retour à la sourate 1");
            } else {
                Log.d(TAG, "⏹️ Fin du Coran atteinte, arrêt de l'auto-avancement");
                return;
            }
        }

        Log.d(TAG, "⏭️ Auto-avancement vers sourate " + nextSurahNumber);

        // 🎯 STRATÉGIE INTELLIGENTE : Priorité aux sourates téléchargées, sinon
        // streaming
        java.util.List<Integer> downloadedSurahs = getDownloadedSurahs(currentReciter);
        boolean isNextSurahDownloaded = downloadedSurahs.contains(nextSurahNumber);

        if (isNextSurahDownloaded) {
            Log.d(TAG, "✅ Sourate " + nextSurahNumber + " est téléchargée, lecture locale");
        } else {
            Log.d(TAG, "🌐 Sourate " + nextSurahNumber + " non téléchargée, streaming");
        }

        wasPlayingBeforeNavigation = true;
        Log.d(TAG, "🎯 Auto-avancement - wasPlayingBeforeNavigation=true pour l'auto-play");

        // Charger la prochaine sourate (téléchargée ou streaming)
        loadSurahByNumber(nextSurahNumber, true);

        // 🎯 CORRECTION : Mettre à jour l'écran de verrouillage après auto-avancement
        // Délai pour laisser le temps à l'audio de se charger et de démarrer
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            updateMediaSessionCompatMetadata();
            Log.d(TAG, "🎯 Écran verrouillage mis à jour après auto-avancement");
        }, 1000); // 1 seconde de délai
    }

    /**
     * NOUVEAU : Vérifier si une sourate est téléchargée
     */
    private boolean isSurahDownloaded(String reciter, int surahNumber) {
        try {
            String formattedNumber = String.format("%03d", surahNumber);
            String surahName = getSurahNameFromNumber(surahNumber);
            if (surahName == null)
                return false;

            String fileName = formattedNumber + "_" + surahName.replace("'", "").replace("-", "") + ".mp3";
            String filePath = getQuranDirectory() + "/" + reciter.replace(" ", "_") + "/" + fileName;

            java.io.File file = new java.io.File(filePath);
            boolean exists = file.exists();
            Log.d(TAG, "🔍 Vérification sourate téléchargée: " + filePath + " -> " + exists);
            return exists;

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification sourate téléchargée: " + e.getMessage());
            return false;
        }
    }

    /**
     * NOUVEAU : Charger une sourate téléchargée par numéro
     */
    private void loadDownloadedSurahByNumber(int surahNumber) {
        Log.d(TAG, "🎵 loadDownloadedSurahByNumber - DÉBUT - surahNumber: " + surahNumber);

        if (surahNumber < 1 || surahNumber > 114) {
            Log.e(TAG, "❌ Numéro de sourate invalide: " + surahNumber);
            return;
        }

        if (currentReciter == null || currentReciter.isEmpty()) {
            Log.e(TAG, "❌ Aucun récitateur défini");
            return;
        }

        // Vérifier si la sourate est téléchargée
        if (!isSurahDownloaded(currentReciter, surahNumber)) {
            Log.w(TAG, "⚠️ Sourate " + surahNumber + " non téléchargée pour " + currentReciter);
            return;
        }

        // Obtenir le nom de la sourate
        String surahName = getSurahNameFromNumber(surahNumber);
        if (surahName == null) {
            Log.e(TAG, "❌ Nom de sourate non trouvé pour le numéro: " + surahNumber);
            return;
        }

        Log.d(TAG, "🎵 Chargement sourate téléchargée " + surahNumber + ": " + surahName);

        // Construire le chemin du fichier local
        String formattedNumber = String.format("%03d", surahNumber);
        String fileName = formattedNumber + "_" + surahName.replace("'", "").replace("-", "") + ".mp3";
        String localPath = getQuranDirectory() + "/" + currentReciter.replace(" ", "_") + "/" + fileName;

        Log.d(TAG, "🎵 Chemin fichier local: " + localPath);

        // Sauvegarder l'état de lecture AVANT de faire quoi que ce soit d'autre
        this.wasPlayingBeforeNavigation = isPlaying;
        Log.d(TAG, "🎵 État de lecture avant navigation: " + this.wasPlayingBeforeNavigation);

        // CORRECTION : Construire le nom complet avec récitateur pour la cohérence
        String fullSurahName = surahName + " - " + currentReciter;
        Log.d(TAG, "🎵 Nom complet sourate téléchargée: " + fullSurahName);

        // Charger l'audio local avec auto-play si l'utilisateur était en train
        // d'écouter
        loadLocalAudioWithAutoPlay(localPath, fullSurahName, currentReciter, this.wasPlayingBeforeNavigation);

        Log.d(TAG, "🎵 loadDownloadedSurahByNumber - FIN");
    }

    /**
     * NOUVEAU : Charger un fichier audio local avec auto-play
     */
    private void loadLocalAudioWithAutoPlay(String localPath, String surah, String reciter,
            boolean wasPlayingBeforeNavigation) {
        Log.d(TAG, "🎵 loadLocalAudioWithAutoPlay - DÉBUT");
        Log.d(TAG, "🎵 loadLocalAudioWithAutoPlay - localPath: " + localPath);
        Log.d(TAG, "🎵 loadLocalAudioWithAutoPlay - surah: " + surah);
        Log.d(TAG, "🎵 loadLocalAudioWithAutoPlay - reciter: " + reciter);
        Log.d(TAG, "🎵 loadLocalAudioWithAutoPlay - wasPlayingBeforeNavigation: " + wasPlayingBeforeNavigation);

        if (!isPremiumUser) {
            Log.w(TAG, "⚠️ Utilisateur non premium, chargement ignoré");
            return;
        }

        // Démarrer le service en mode foreground pour l'utilisateur premium
        if (!isForegroundService()) {
            startForeground(NOTIFICATION_ID, createNotification());
            Log.d(TAG, "🎵 Service démarré en mode foreground pour chargement audio premium");
        }

        if (mediaPlayer == null) {
            Log.w(TAG, "⚠️ MediaPlayer null, réinitialisation...");
            initializeMediaPlayer();
        }

        try {
            // Arrêter la lecture actuelle
            if (isPlaying) {
                try {
                    mediaPlayer.stop();
                } catch (Exception e) {
                    Log.w(TAG, "⚠️ Erreur arrêt MediaPlayer: " + e.getMessage());
                }
                isPlaying = false;
            }

            // Réinitialiser le MediaPlayer proprement
            try {
                mediaPlayer.reset();
            } catch (Exception e) {
                Log.w(TAG, "⚠️ Erreur reset MediaPlayer: " + e.getMessage());
                initializeMediaPlayer();
            }

            clearPlaybackTimingBeforeLoad();

            // Charger le fichier local
            java.io.File audioFile = new java.io.File(localPath);
            if (!audioFile.exists()) {
                Log.e(TAG, "❌ Fichier audio local introuvable: " + localPath);
                return;
            }

            Log.d(TAG, "🎵 Chargement fichier local: " + audioFile.getAbsolutePath());
            mediaPlayer.setDataSource(audioFile.getAbsolutePath());

            // Préparer le MediaPlayer de manière asynchrone
            mediaPlayer.prepareAsync();

            // Mettre à jour les variables d'état
            currentAudioPath = localPath;
            currentSurah = surah;
            currentReciter = reciter;
            isPlaying = false;
            currentPosition = 0;

            // Sauvegarder l'état
            saveAudioState();

            // Définir le MediaPlayer.OnPreparedListener pour gérer le démarrage après
            // chargement
            mediaPlayer.setOnPreparedListener(mp -> {
                Log.d(TAG, "🎵 MediaPlayer prêt, démarrage automatique...");
                isMediaReady = true;
                applyResolvedDuration(mp);
                currentPosition = 0;
                if (pendingSeekMs >= 0) {
                    int seek = pendingSeekMs;
                    pendingSeekMs = -1;
                    performSeek(seek, 0);
                }
                Log.d(TAG, "🎵 Durée totale: " + totalDuration + "ms");
                Log.d(TAG, "🎵 wasPlayingBeforeNavigation: " + wasPlayingBeforeNavigation);

                if (shouldAutoStartAfterNavigation()) {
                    Log.d(TAG, "🎵 Démarrage automatique car l'utilisateur était en train d'écouter");
                    try {
                        mp.start();
                        isPlaying = true;
                        Log.d(TAG, "🎵 Lecture démarrée automatiquement");

                        // Démarrer le timer de progression
                        startProgressTimer();

                        // Sauvegarder l'état
                        saveAudioState();

                        // 🎯 NOUVEAU : Synchroniser immédiatement avec le widget
                        QuranWidget.updatePlaybackState(getApplicationContext(), isPlaying, currentPosition, totalDuration);

                        // Diffuser l'état
                        broadcastAudioStateChanged();

                    } catch (Exception e) {
                        Log.e(TAG, "❌ Erreur démarrage automatique: " + e.getMessage());
                    }
                } else {
                    Log.d(TAG, "🎵 Pas de démarrage automatique car l'utilisateur n'était pas en train d'écouter");
                    isPlaying = false;

                    // 🎯 NOUVEAU : Synchroniser immédiatement avec le widget
                    QuranWidget.updatePlaybackState(getApplicationContext(), isPlaying, currentPosition, totalDuration);

                    // Sauvegarder l'état
                    saveAudioState();

                    // Diffuser l'état
                    broadcastAudioStateChanged();
                }

                Log.d(TAG, "🔍 Envoi événements après préparation - durée: " + totalDuration + "ms");
                broadcastAudioStateChanged();
                Log.d(TAG, "✅ Événements envoyés après préparation");
            });

            Log.d(TAG, "✅ Audio local chargé avec succès: " + surah + " - " + reciter);

            // Diffuser l'état
            broadcastAudioStateChanged();
            updateNotification();

            // Mettre à jour directement l'état du widget
            Log.d(TAG, "🚀 Mise à jour directe de l'état du widget après chargement audio");
            QuranWidget.updateCurrentAudio(this, surah, reciter, localPath);
            QuranWidget.updatePlaybackState(getApplicationContext(), isPlaying, currentPosition, totalDuration);

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur chargement audio local avec auto-play: " + e.getMessage());
        }
    }

    // Méthodes publiques pour l'interface
    public boolean isPlaying() {
        return isPlaying;
    }

    public String getCurrentSurah() {
        return currentSurah;
    }

    public String getCurrentReciter() {
        return currentReciter;
    }

    public int getCurrentPosition() {
        return currentPosition;
    }

    public int getTotalDuration() {
        return totalDuration;
    }

    public boolean isPremiumUser() {
        return isPremiumUser;
    }

    // NOUVEAU : Méthodes pour gérer les options de lecture
    public void setAutoAdvanceEnabled(boolean enabled) {
        this.autoAdvanceEnabled = enabled;
        saveAudioState();
        Log.d(TAG, "🎵 Auto-avancement " + (enabled ? "activé" : "désactivé"));
    }

    public boolean isAutoAdvanceEnabled() {
        return autoAdvanceEnabled;
    }

    public void setLoopEnabled(boolean enabled) {
        this.loopEnabled = enabled;
        saveAudioState();
        Log.d(TAG, "🎵 Boucle " + (enabled ? "activée" : "désactivée"));
    }

    public boolean isLoopEnabled() {
        return loopEnabled;
    }

    // NOUVEAU : Méthode pour obtenir les sourates téléchargées
    public java.util.List<Integer> getDownloadedSurahsForReciter(String reciter) {
        return getDownloadedSurahs(reciter);
    }

    // NOUVEAU : Méthode pour vérifier si une sourate est téléchargée
    public boolean isSurahDownloadedForReciter(String reciter, int surahNumber) {
        return isSurahDownloaded(reciter, surahNumber);
    }

    /**
     * NOUVEAU : Obtenir la liste des récitateurs disponibles (avec sourates
     * téléchargées)
     */
    private java.util.List<String> getAvailableReciters() {
        java.util.List<String> availableReciters = new java.util.ArrayList<>();

        try {
            String quranDir = getQuranDirectory();
            java.io.File quranFolder = new java.io.File(quranDir);

            if (!quranFolder.exists() || !quranFolder.isDirectory()) {
                Log.d(TAG, "📁 Dossier Quran non trouvé: " + quranDir);
                return availableReciters;
            }

            // Scanner tous les dossiers de récitateurs
            java.io.File[] reciterFolders = quranFolder.listFiles(java.io.File::isDirectory);
            if (reciterFolders != null) {
                for (java.io.File reciterFolder : reciterFolders) {
                    String folderName = reciterFolder.getName();
                    String reciterName = folderName.replace("_", " ");

                    // Vérifier qu'il y a au moins une sourate téléchargée
                    java.io.File[] mp3Files = reciterFolder
                            .listFiles((dir, name) -> name.toLowerCase().endsWith(".mp3"));
                    if (mp3Files != null && mp3Files.length > 0) {
                        availableReciters.add(reciterName);
                        Log.d(TAG, "🎵 Récitateur disponible: " + reciterName + " (dossier: " + folderName + ", "
                                + mp3Files.length + " sourates)");
                    }
                }
            }

            // Trier la liste
            java.util.Collections.sort(availableReciters);
            Log.d(TAG, "📖 Récitateurs disponibles: " + availableReciters.size() + " récitateurs");

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur scan récitateurs disponibles: " + e.getMessage());
        }

        return availableReciters;
    }

    /**
     * NOUVEAU : Convertir le nom d'affichage en nom de dossier
     */
    private String getFolderNameFromDisplayName(String displayName) {
        return displayName.replace(" ", "_");
    }

    /**
     * NOUVEAU : Passer au récitateur suivant (UNIQUEMENT pour fichiers locaux)
     */
    private void switchToNextReciter() {
        java.util.List<String> availableReciters = getAvailableReciters();
        if (availableReciters.isEmpty()) {
            Log.w(TAG, "⚠️ Aucun récitateur disponible");
            return;
        }

        if (currentReciter == null || currentReciter.isEmpty()) {
            // Aucun récitateur actuel, prendre le premier
            currentReciter = availableReciters.get(0);
            Log.d(TAG, "🎵 Premier récitateur sélectionné: " + currentReciter);
        } else {
            // Trouver le récitateur actuel dans la liste
            int currentIndex = availableReciters.indexOf(currentReciter);
            if (currentIndex == -1) {
                // Récitateur actuel non trouvé, prendre le premier
                currentReciter = availableReciters.get(0);
                Log.d(TAG, "🎵 Récitateur actuel non trouvé, premier récitateur sélectionné: " + currentReciter);
            } else {
                // Passer au récitateur suivant
                int nextIndex = (currentIndex + 1) % availableReciters.size();
                currentReciter = availableReciters.get(nextIndex);
                Log.d(TAG, "🎵 Passage au récitateur suivant: " + currentReciter);
            }
        }

        // Charger la première sourate du nouveau récitateur (UNIQUEMENT local)
        java.util.List<Integer> downloadedSurahs = getDownloadedSurahs(currentReciter);
        if (!downloadedSurahs.isEmpty()) {
            loadDownloadedSurahByNumber(downloadedSurahs.get(0));
        } else {
            Log.w(TAG, "⚠️ Aucune sourate téléchargée pour le récitateur: " + currentReciter);
        }
    }

    /**
     * NOUVEAU : Passer au récitateur précédent (UNIQUEMENT pour fichiers locaux)
     */
    private void switchToPreviousReciter() {
        java.util.List<String> availableReciters = getAvailableReciters();
        if (availableReciters.isEmpty()) {
            Log.w(TAG, "⚠️ Aucun récitateur disponible");
            return;
        }

        if (currentReciter == null || currentReciter.isEmpty()) {
            // Aucun récitateur actuel, prendre le dernier
            currentReciter = availableReciters.get(availableReciters.size() - 1);
            Log.d(TAG, "🎵 Dernier récitateur sélectionné: " + currentReciter);
        } else {
            // Trouver le récitateur actuel dans la liste
            int currentIndex = availableReciters.indexOf(currentReciter);
            if (currentIndex == -1) {
                // Récitateur actuel non trouvé, prendre le dernier
                currentReciter = availableReciters.get(availableReciters.size() - 1);
                Log.d(TAG, "🎵 Récitateur actuel non trouvé, dernier récitateur sélectionné: " + currentReciter);
            } else {
                // Passer au récitateur précédent
                int prevIndex = (currentIndex - 1 + availableReciters.size()) % availableReciters.size();
                currentReciter = availableReciters.get(prevIndex);
                Log.d(TAG, "🎵 Passage au récitateur précédent: " + currentReciter);
            }
        }

        // Charger la première sourate du nouveau récitateur (UNIQUEMENT local)
        java.util.List<Integer> downloadedSurahs = getDownloadedSurahs(currentReciter);
        if (!downloadedSurahs.isEmpty()) {
            loadDownloadedSurahByNumber(downloadedSurahs.get(0));
        } else {
            Log.w(TAG, "⚠️ Aucune sourate téléchargée pour le récitateur: " + currentReciter);
        }
    }

    // 🎯 SUPPRIMÉ: onGetSession() car plus de MediaSession3
    // MediaSessionCompat suffit pour l'écran de verrouillage
}
