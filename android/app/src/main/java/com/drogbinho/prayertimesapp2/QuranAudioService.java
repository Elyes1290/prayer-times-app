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
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;

import java.io.File;
import java.io.IOException;
import android.content.SharedPreferences;

public class QuranAudioService extends Service {
    private static final String TAG = "QuranAudioService";
    private static final String CHANNEL_ID = "quran_audio_channel";
    private static final int NOTIFICATION_ID = 1001;
    
    // Actions pour le widget
    public static final String ACTION_PLAY_PAUSE = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_PLAY_PAUSE";
    public static final String ACTION_PREVIOUS = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_PREVIOUS";
    public static final String ACTION_NEXT = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_NEXT";
    public static final String ACTION_SEEK = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_SEEK";
    public static final String ACTION_STOP = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_STOP";
    
    // Actions pour les broadcasts
    public static final String ACTION_AUDIO_STATE_CHANGED = "com.drogbinho.prayertimesapp2.AUDIO_STATE_CHANGED";
    public static final String ACTION_AUDIO_PROGRESS = "com.drogbinho.prayertimesapp2.AUDIO_PROGRESS";
    
    // Variables pour l'audio actuel
    private String currentAudioPath = "";
    private String currentSurah = "";
    private String currentReciter = "";
    private boolean isPlaying = false;
    private int currentPosition = 0;
    private int totalDuration = 0;
    private boolean isPremiumUser = false;
    
    // Clés pour SharedPreferences
    private static final String PREFS_NAME = "QuranAudioServicePrefs";
    private static final String KEY_AUDIO_PATH = "currentAudioPath";
    private static final String KEY_SURAH = "currentSurah";
    private static final String KEY_RECITER = "currentReciter";
    private static final String KEY_POSITION = "currentPosition";
    private static final String KEY_DURATION = "totalDuration";
    private static final String KEY_IS_PLAYING = "isPlaying";
    private static final String KEY_IS_PREMIUM = "isPremiumUser";
    
    // Composants audio
    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private NotificationManager notificationManager;
    
    // Broadcast receiver pour les actions du widget
    private BroadcastReceiver widgetActionReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            Log.d(TAG, "📡 BroadcastReceiver reçoit action: " + action);
            Log.d(TAG, "📡 BroadcastReceiver intent extras: " + (intent.getExtras() != null ? "OUI" : "null"));
            
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
                    Log.d(TAG, "⏭️ BroadcastReceiver traite ACTION_NEXT");
                    handleNext();
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
                case "com.drogbinho.prayertimesapp2.LOAD_AUDIO":
                    String audioPath = intent.getStringExtra("audioPath");
                    String surah = intent.getStringExtra("surah");
                    String reciter = intent.getStringExtra("reciter");
                    Log.d(TAG, "🎵 BroadcastReceiver traite LOAD_AUDIO: " + surah + " - " + reciter);
                    if (audioPath != null && surah != null && reciter != null) {
                        // Utiliser un délai pour éviter les conflits
                        new android.os.Handler().postDelayed(() -> {
                            loadAudio(audioPath, surah, reciter);
                        }, 500); // Délai de 500ms
                    }
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
        Log.d(TAG, "🎵 Service audio Quran créé");
        
        // Initialiser les composants
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        
        // Créer le canal de notification
        createNotificationChannel();
        
        // Initialiser le MediaPlayer
        initializeMediaPlayer();
        
        // Restaurer l'état audio depuis SharedPreferences
        restoreAudioState();
        
        // Démarrer le service en mode foreground pour recevoir les broadcasts
        startForeground(NOTIFICATION_ID, createNotification());
        Log.d(TAG, "🎵 Service démarré en mode foreground dans onCreate");
        
        // Enregistrer le BroadcastReceiver pour les actions du widget
        registerWidgetActionReceiver();
    }
    
    /**
     * Enregistrer le BroadcastReceiver pour les actions du widget
     */
    private void registerWidgetActionReceiver() {
        try {
            IntentFilter filter = new IntentFilter();
            filter.addAction(ACTION_PLAY_PAUSE);
            filter.addAction(ACTION_PREVIOUS);
            filter.addAction(ACTION_NEXT);
            filter.addAction(ACTION_SEEK);
            filter.addAction(ACTION_STOP);
            filter.addAction("com.drogbinho.prayertimesapp2.LOAD_AUDIO");
            
            // Enregistrer le receiver avec le bon flag d'export
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(widgetActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(widgetActionReceiver, filter);
            }
            
            Log.d(TAG, "✅ BroadcastReceiver enregistré pour les actions du widget");
            
            // Démarrer le service en mode foreground pour recevoir les broadcasts
            if (!isForegroundService()) {
                startForeground(NOTIFICATION_ID, createNotification());
                Log.d(TAG, "🎵 Service démarré en mode foreground pour recevoir les broadcasts");
            }
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
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "🎵 Service audio Quran démarré - startId: " + startId);
        Log.d(TAG, "🎵 Intent reçu: " + (intent != null ? "OUI" : "NON"));
        Log.d(TAG, "🎵 Action: " + (intent != null && intent.getAction() != null ? intent.getAction() : "NULL"));
        Log.d(TAG, "🎵 Flags: " + flags + ", startId: " + startId);

        // Vérifier le statut premium
        checkPremiumStatus();

        // Créer la notification AVANT de traiter les actions
        startForeground(NOTIFICATION_ID, createNotification());

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
                case "com.drogbinho.prayertimesapp2.LOAD_AUDIO":
                    String audioPath = intent.getStringExtra("audioPath");
                    String surah = intent.getStringExtra("surah");
                    String reciter = intent.getStringExtra("reciter");
                    Log.d(TAG, "🎵 Traitement LOAD_AUDIO: " + surah + " - " + reciter);
                    if (audioPath != null && surah != null && reciter != null) {
                        loadAudio(audioPath, surah, reciter);
                    }
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
        super.onDestroy();
        Log.d(TAG, "🎵 Service audio Quran détruit");
        
        // Nettoyer
        if (widgetActionReceiver != null) {
            unregisterReceiver(widgetActionReceiver);
        }
        
        if (mediaPlayer != null) {
            mediaPlayer.release();
            mediaPlayer = null;
        }
        
        // Abandonner le focus audio proprement
        abandonAudioFocus();
    }
    
    /**
     * Abandonner le focus audio
     */
    private void abandonAudioFocus() {
        try {
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest);
                } else {
                    audioManager.abandonAudioFocus(null);
                }
                Log.d(TAG, "🔇 Focus audio abandonné");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur abandon focus audio: " + e.getMessage());
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
            
            mediaPlayer.setOnPreparedListener(mp -> {
                Log.d(TAG, "🎵 MediaPlayer prêt");
                totalDuration = mp.getDuration();
                broadcastAudioStateChanged();
            });
            
            mediaPlayer.setOnCompletionListener(mp -> {
                Log.d(TAG, "🎵 Lecture terminée");
                isPlaying = false;
                currentPosition = 0;
                broadcastAudioStateChanged();
                updateNotification();
            });
            
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "❌ Erreur MediaPlayer: " + what + ", " + extra);
                
                // Gérer les erreurs spécifiques
                switch (what) {
                    case MediaPlayer.MEDIA_ERROR_NOT_VALID_FOR_PROGRESSIVE_PLAYBACK:
                        Log.e(TAG, "❌ Erreur: Fichier non valide pour lecture progressive");
                        // Réinitialiser le MediaPlayer et recharger l'audio
                        handleMediaPlayerError();
                        break;
                    case MediaPlayer.MEDIA_ERROR_SERVER_DIED:
                        Log.e(TAG, "❌ Erreur: Serveur MediaPlayer mort");
                        // Réinitialiser le MediaPlayer
                        handleMediaPlayerError();
                        break;
                    case MediaPlayer.MEDIA_ERROR_IO:
                        Log.e(TAG, "❌ Erreur: Problème I/O");
                        handleMediaPlayerError();
                        break;
                    case MediaPlayer.MEDIA_ERROR_MALFORMED:
                        Log.e(TAG, "❌ Erreur: Fichier malformé");
                        handleMediaPlayerError();
                        break;
                    case MediaPlayer.MEDIA_ERROR_UNSUPPORTED:
                        Log.e(TAG, "❌ Erreur: Format non supporté");
                        handleMediaPlayerError();
                        break;
                    case MediaPlayer.MEDIA_ERROR_TIMED_OUT:
                        Log.e(TAG, "❌ Erreur: Timeout");
                        handleMediaPlayerError();
                        break;
                    default:
                        Log.e(TAG, "❌ Erreur MediaPlayer inconnue: " + what);
                        handleMediaPlayerError();
                        break;
                }
                
                return true; // Indique que l'erreur a été gérée
            });
            
            // Gestionnaire de focus audio
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
                                Log.d(TAG, "🔇 Perte focus audio - pause");
                                pauseAudio();
                                break;
                            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                                Log.d(TAG, "🔇 Perte focus audio temporaire - pause");
                                pauseAudio();
                                break;
                            case AudioManager.AUDIOFOCUS_GAIN:
                                Log.d(TAG, "🔊 Regain focus audio");
                                // Ne pas relancer automatiquement pour éviter les conflits
                                break;
                        }
                    })
                    .build();
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur initialisation MediaPlayer: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Créer le canal de notification
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Lecture Quran",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Contrôles audio pour la lecture du Quran");
            channel.setShowBadge(false);
            notificationManager.createNotificationChannel(channel);
        }
    }
    
    /**
     * Créer la notification
     */
    private Notification createNotification() {
        // Intent pour ouvrir l'app
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Actions de la notification - envoyer directement au service
        Intent playPauseIntent = new Intent(this, QuranAudioService.class);
        playPauseIntent.setAction(ACTION_PLAY_PAUSE);
        PendingIntent playPausePendingIntent = PendingIntent.getService(
            this, 0, playPauseIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        Intent previousIntent = new Intent(this, QuranAudioService.class);
        previousIntent.setAction(ACTION_PREVIOUS);
        PendingIntent previousPendingIntent = PendingIntent.getService(
            this, 1, previousIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        Intent nextIntent = new Intent(this, QuranAudioService.class);
        nextIntent.setAction(ACTION_NEXT);
        PendingIntent nextPendingIntent = PendingIntent.getService(
            this, 2, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        Intent stopIntent = new Intent(this, QuranAudioService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this, 3, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Construire la notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(currentSurah.isEmpty() ? "Quran" : currentSurah)
            .setContentText(currentReciter.isEmpty() ? "Prêt" : currentReciter)
            .setSmallIcon(R.drawable.ic_premium_star)
            .setContentIntent(openAppPendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(R.drawable.ic_previous, "Précédent", previousPendingIntent)
            .addAction(
                isPlaying ? R.drawable.ic_pause : R.drawable.ic_play,
                isPlaying ? "Pause" : "Play",
                playPausePendingIntent
            )
            .addAction(R.drawable.ic_next, "Suivant", nextPendingIntent)
            .addAction(R.drawable.ic_open_app, "Arrêter", stopPendingIntent);
        
        return builder.build();
    }
    
    /**
     * Mettre à jour la notification
     */
    private void updateNotification() {
        notificationManager.notify(NOTIFICATION_ID, createNotification());
    }
    
    /**
     * Vérifier le statut premium
     */
    private void checkPremiumStatus() {
        try {
            // Lire depuis les SharedPreferences ReactNative (AsyncStorage)
            SharedPreferences prefs = getSharedPreferences("RCTAsyncLocalStorage_V1", Context.MODE_PRIVATE);
            String userData = prefs.getString("user_data", "");
            
            if (!userData.isEmpty()) {
                Log.d(TAG, "📊 Données utilisateur trouvées: " + userData.substring(0, Math.min(100, userData.length())) + "...");
                
                // Vérifier si l'utilisateur est premium (premium_status = 1)
                isPremiumUser = userData.contains("\"premium_status\":1") || userData.contains("\"isPremium\":true");
                Log.d(TAG, "👑 Statut premium détecté: " + isPremiumUser);
                
                // Sauvegarder le statut premium
                saveAudioState();
            } else {
                // Fallback: essayer depuis les anciens SharedPreferences
                SharedPreferences fallbackPrefs = getSharedPreferences("premium_prefs", Context.MODE_PRIVATE);
                isPremiumUser = fallbackPrefs.getBoolean("is_premium_user", false);
                
                if (isPremiumUser) {
                    Log.d(TAG, "👑 Statut premium (fallback): " + isPremiumUser);
                } else {
                    Log.w(TAG, "⚠️ Aucune donnée utilisateur trouvée dans AsyncStorage");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification statut premium: " + e.getMessage());
            isPremiumUser = false;
        }
    }
    
    /**
     * Gérer play/pause
     */
    private void handlePlayPause() {
        Log.d(TAG, "🎵 handlePlayPause() - isPremiumUser: " + isPremiumUser + ", isPlaying: " + isPlaying + ", mediaPlayer null: " + (mediaPlayer == null));
        
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
        } else {
            Log.d(TAG, "🎵 Play audio");
            playAudio();
        }
    }
    
    /**
     * Gérer précédent
     */
    private void handlePrevious() {
        if (!isPremiumUser) return;
        
        Log.d(TAG, "⏮️ Précédent");
        // TODO: Implémenter la logique pour passer à la sourate précédente
        broadcastAudioStateChanged();
    }
    
    /**
     * Gérer suivant
     */
    private void handleNext() {
        if (!isPremiumUser) return;
        
        Log.d(TAG, "⏭️ Suivant");
        // TODO: Implémenter la logique pour passer à la sourate suivante
        broadcastAudioStateChanged();
    }
    
    /**
     * Gérer le seek
     */
    private void handleSeek(int position) {
        if (!isPremiumUser || mediaPlayer == null) return;
        
        Log.d(TAG, "🎯 Seek vers: " + position);
        mediaPlayer.seekTo(position);
        currentPosition = position;
        broadcastAudioProgress();
    }
    
    /**
     * Gérer l'arrêt
     */
    private void handleStop() {
        Log.d(TAG, "⏹️ Arrêt");
        stopAudio();
        stopSelf();
    }
    
    /**
     * Lancer la lecture audio
     */
    public void playAudio() {
        Log.d(TAG, "🎵 playAudio() - mediaPlayer null: " + (mediaPlayer == null) + ", isPlaying: " + isPlaying);
        
        if (mediaPlayer == null) {
            Log.w(TAG, "⚠️ MediaPlayer null, impossible de lancer la lecture");
            return;
        }
        
        try {
            // Vérifier si le service Adhan est actif et attendre
            waitForAdhanServiceToFinish();
            
            // Vérifier que l'audio est chargé et prêt
            if (currentAudioPath.isEmpty()) {
                Log.w(TAG, "⚠️ Aucun audio chargé, impossible de lancer la lecture");
                return;
            }
            
            // Vérifier si l'audio est déjà chargé dans le MediaPlayer
            if (!mediaPlayer.isPlaying() && currentPosition == 0) {
                // Recharger l'audio depuis SharedPreferences
                Log.d(TAG, "🔄 Rechargement audio depuis SharedPreferences: " + currentSurah);
                loadAudio(currentAudioPath, currentSurah, currentReciter);
                
                // Attendre que l'audio soit prêt avant de démarrer
                new android.os.Handler().postDelayed(() -> {
                    startPlayback();
                }, 1000);
                return;
            }
            
            // Démarrer la lecture directement
            startPlayback();
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur lancement lecture: " + e.getMessage());
        }
    }
    
    /**
     * Démarrer la lecture audio
     */
    private void startPlayback() {
        try {
            // Vérifier l'état du MediaPlayer
            if (!mediaPlayer.isPlaying()) {
                // Demander le focus audio avec la nouvelle API
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    int result = audioManager.requestAudioFocus(audioFocusRequest);
                    if (result != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                        Log.w(TAG, "⚠️ Focus audio refusé");
                        return;
                    }
                } else {
                    // Ancienne API pour Android < 8
                    int result = audioManager.requestAudioFocus(
                        null,
                        AudioManager.STREAM_MUSIC,
                        AudioManager.AUDIOFOCUS_GAIN
                    );
                    if (result != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                        Log.w(TAG, "⚠️ Focus audio refusé (ancienne API)");
                        return;
                    }
                }
                
                // Démarrer la lecture
                mediaPlayer.start();
                isPlaying = true;
                
                // Sauvegarder l'état
                saveAudioState();
                
                // Démarrer le timer de progression
                startProgressTimer();
                
                Log.d(TAG, "▶️ Lecture audio démarrée avec succès");
                
                // Diffuser l'état
                broadcastAudioStateChanged();
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur démarrage lecture: " + e.getMessage());
        }
    }
    
    /**
     * Mettre en pause l'audio
     */
    public void pauseAudio() {
        if (mediaPlayer == null || !isPlaying) return;
        
        try {
            mediaPlayer.pause();
            isPlaying = false;
            currentPosition = mediaPlayer.getCurrentPosition();
            Log.d(TAG, "⏸️ Lecture audio en pause");
            
            // Sauvegarder l'état
            saveAudioState();
            
            // Diffuser l'état
            broadcastAudioStateChanged();
            
            // Arrêter le timer de progression
            stopProgressTimer();
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur pause audio: " + e.getMessage());
        }
    }
    
    /**
     * Arrêter l'audio
     */
    public void stopAudio() {
        if (mediaPlayer == null) return;
        
        try {
            mediaPlayer.stop();
            mediaPlayer.reset();
            isPlaying = false;
            currentPosition = 0;
            Log.d(TAG, "⏹️ Lecture audio arrêtée");
            
            // Sauvegarder l'état
            saveAudioState();
            
            // Abandonner le focus audio
            abandonAudioFocus();
            
            // Diffuser l'état
            broadcastAudioStateChanged();
            
            // Arrêter le timer de progression
            stopProgressTimer();
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur arrêt audio: " + e.getMessage());
        }
    }
    
    /**
     * Charger un fichier audio
     */
    public void loadAudio(String audioPath, String surah, String reciter) {
        Log.d(TAG, "🎵 Chargement audio: " + surah + " - " + reciter + " - " + audioPath);
        
        if (!isPremiumUser) {
            Log.w(TAG, "⚠️ Utilisateur non premium, chargement ignoré");
            return;
        }
        
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
            
            // Charger le nouveau fichier
            if (audioPath.startsWith("http")) {
                // Vérifier la connectivité réseau pour le streaming
                if (!isNetworkAvailable()) {
                    Log.e(TAG, "❌ Pas de connexion réseau pour le streaming");
                    return;
                }
                
                // Streaming - utiliser Uri.parse pour une meilleure compatibilité
                Log.d(TAG, "🎵 Chargement streaming: " + audioPath);
                try {
                    Uri audioUri = Uri.parse(audioPath);
                    mediaPlayer.setDataSource(getApplicationContext(), audioUri);
                } catch (Exception e) {
                    Log.e(TAG, "❌ Erreur chargement streaming: " + e.getMessage());
                    // Fallback vers setDataSource direct
                    try {
                        mediaPlayer.setDataSource(audioPath);
                    } catch (Exception fallbackError) {
                        Log.e(TAG, "❌ Erreur fallback streaming: " + fallbackError.getMessage());
                        handleStreamingError(audioPath, surah, reciter);
                        return;
                    }
                }
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
            isPlaying = false;
            currentPosition = 0;
            
            // Sauvegarder l'état audio
            saveAudioState();
            
            Log.d(TAG, "✅ Audio chargé avec succès: " + surah + " - " + reciter);
            
            // Diffuser l'état
            broadcastAudioStateChanged();
            
        } catch (IllegalArgumentException e) {
            Log.e(TAG, "❌ Erreur argument MediaPlayer: " + e.getMessage());
            // Le fichier pourrait être corrompu ou dans un format non supporté
            if (audioPath.startsWith("http")) {
                handleStreamingError(audioPath, surah, reciter);
            }
        } catch (SecurityException e) {
            Log.e(TAG, "❌ Erreur permission MediaPlayer: " + e.getMessage());
            // Problème de permissions
        } catch (IOException e) {
            Log.e(TAG, "❌ Erreur I/O MediaPlayer: " + e.getMessage());
            // Problème de réseau ou de fichier
            if (audioPath.startsWith("http")) {
                handleStreamingError(audioPath, surah, reciter);
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur chargement audio: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    // Timer pour la progression
    private android.os.Handler progressHandler = new android.os.Handler();
    private Runnable progressRunnable;
    
    /**
     * Démarrer le timer de progression
     */
    private void startProgressTimer() {
        stopProgressTimer();
        
        progressRunnable = new Runnable() {
            @Override
            public void run() {
                if (mediaPlayer != null && isPlaying) {
                    currentPosition = mediaPlayer.getCurrentPosition();
                    broadcastAudioProgress();
                    progressHandler.postDelayed(this, 1000); // Mise à jour toutes les secondes
                }
            }
        };
        
        progressHandler.post(progressRunnable);
    }
    
    /**
     * Arrêter le timer de progression
     */
    private void stopProgressTimer() {
        if (progressRunnable != null) {
            progressHandler.removeCallbacks(progressRunnable);
            progressRunnable = null;
        }
    }
    
    /**
     * Diffuser l'état audio
     */
    private void broadcastAudioStateChanged() {
        Intent intent = new Intent(ACTION_AUDIO_STATE_CHANGED);
        intent.putExtra("isPlaying", isPlaying);
        intent.putExtra("surah", currentSurah);
        intent.putExtra("reciter", currentReciter);
        intent.putExtra("position", currentPosition);
        intent.putExtra("duration", totalDuration);
        intent.putExtra("audioPath", currentAudioPath);
        intent.putExtra("isPremium", isPremiumUser);
        sendBroadcast(intent);
        
        // Mettre à jour le widget
        updateWidget();
    }
    
    /**
     * Diffuser la progression audio
     */
    private void broadcastAudioProgress() {
        Intent intent = new Intent(ACTION_AUDIO_PROGRESS);
        intent.putExtra("position", currentPosition);
        intent.putExtra("duration", totalDuration);
        sendBroadcast(intent);
    }
    
    /**
     * Mettre à jour le widget
     */
    private void updateWidget() {
        try {
            android.appwidget.AppWidgetManager appWidgetManager = android.appwidget.AppWidgetManager.getInstance(this);
            android.content.ComponentName widgetComponent = new android.content.ComponentName(this, QuranWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(widgetComponent);
            
            if (appWidgetIds.length > 0) {
                Intent intent = new Intent(this, QuranWidget.class);
                intent.setAction(android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                intent.putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);
                sendBroadcast(intent);
                
                Log.d(TAG, "🔄 Widget mis à jour pour " + appWidgetIds.length + " widgets");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur mise à jour widget: " + e.getMessage());
        }
    }
    
    // Méthodes publiques pour l'interface
    public boolean isPlaying() { return isPlaying; }
    public String getCurrentSurah() { return currentSurah; }
    public String getCurrentReciter() { return currentReciter; }
    public int getCurrentPosition() { return currentPosition; }
    public int getTotalDuration() { return totalDuration; }
    public boolean isPremiumUser() { return isPremiumUser; }
    
    /**
     * Mettre à jour le statut premium
     */
    public void setPremiumStatus(boolean premium) {
        isPremiumUser = premium;
        
        // Sauvegarder dans le bon fichier SharedPreferences
        android.content.SharedPreferences prefs = getSharedPreferences("premium_prefs", MODE_PRIVATE);
        prefs.edit().putBoolean("is_premium_user", premium).apply();
        
        Log.d(TAG, "👑 Statut premium mis à jour: " + premium);
        broadcastAudioStateChanged();
    }

    /**
     * Sauvegarder l'état audio dans SharedPreferences
     */
    private void saveAudioState() {
        try {
            // Sauvegarder dans nos SharedPreferences custom
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            editor.putString(KEY_AUDIO_PATH, currentAudioPath);
            editor.putString(KEY_SURAH, currentSurah);
            editor.putString(KEY_RECITER, currentReciter);
            editor.putInt(KEY_POSITION, currentPosition);
            editor.putInt(KEY_DURATION, totalDuration);
            editor.putBoolean(KEY_IS_PLAYING, isPlaying);
            editor.putBoolean(KEY_IS_PREMIUM, isPremiumUser);
            
            editor.apply();
            
            // Aussi sauvegarder dans AsyncStorage pour persistance entre les redémarrages
            try {
                SharedPreferences asyncPrefs = getSharedPreferences("RCTAsyncLocalStorage_V1", Context.MODE_PRIVATE);
                SharedPreferences.Editor asyncEditor = asyncPrefs.edit();
                
                // Créer un JSON simple avec les données audio
                String audioStateJson = "{" +
                    "\"audioPath\":\"" + currentAudioPath + "\"," +
                    "\"surah\":\"" + currentSurah + "\"," +
                    "\"reciter\":\"" + currentReciter + "\"," +
                    "\"position\":" + currentPosition + "," +
                    "\"duration\":" + totalDuration + "," +
                    "\"isPlaying\":" + isPlaying +
                    "}";
                
                asyncEditor.putString("quran_audio_state", audioStateJson);
                asyncEditor.apply();
                
                Log.d(TAG, "💾 État audio sauvegardé: " + currentSurah + " - " + currentReciter + " (persistance: OUI)");
            } catch (Exception e) {
                Log.w(TAG, "⚠️ Erreur sauvegarde AsyncStorage: " + e.getMessage());
                Log.d(TAG, "💾 État audio sauvegardé: " + currentSurah + " - " + currentReciter + " (persistance: NON)");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur sauvegarde état audio: " + e.getMessage());
        }
    }
    
    /**
     * Restaurer l'état audio depuis SharedPreferences
     */
    private void restoreAudioState() {
        try {
            // Essayer de restaurer depuis nos SharedPreferences custom d'abord
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            
            currentAudioPath = prefs.getString(KEY_AUDIO_PATH, "");
            currentSurah = prefs.getString(KEY_SURAH, "");
            currentReciter = prefs.getString(KEY_RECITER, "");
            currentPosition = prefs.getInt(KEY_POSITION, 0);
            totalDuration = prefs.getInt(KEY_DURATION, 0);
            isPlaying = prefs.getBoolean(KEY_IS_PLAYING, false);
            isPremiumUser = prefs.getBoolean(KEY_IS_PREMIUM, false);
            
            // Si aucun audio trouvé, essayer de restaurer depuis AsyncStorage
            if (currentAudioPath.isEmpty()) {
                try {
                    SharedPreferences asyncPrefs = getSharedPreferences("RCTAsyncLocalStorage_V1", Context.MODE_PRIVATE);
                    String audioStateJson = asyncPrefs.getString("quran_audio_state", "");
                    
                    if (!audioStateJson.isEmpty()) {
                        Log.d(TAG, "🔍 État audio trouvé dans AsyncStorage: " + audioStateJson.substring(0, Math.min(100, audioStateJson.length())) + "...");
                        
                        // Parser le JSON manuellement (simple)
                        if (audioStateJson.contains("\"audioPath\":\"")) {
                            currentAudioPath = extractJsonValue(audioStateJson, "audioPath");
                            currentSurah = extractJsonValue(audioStateJson, "surah");
                            currentReciter = extractJsonValue(audioStateJson, "reciter");
                            
                            // Remettre isPlaying à false au redémarrage
                            isPlaying = false;
                            currentPosition = 0;
                            
                            Log.d(TAG, "✅ État audio restauré depuis AsyncStorage: " + currentSurah + " - " + currentReciter);
                        }
                    }
                } catch (Exception e) {
                    Log.w(TAG, "⚠️ Erreur restauration AsyncStorage: " + e.getMessage());
                }
            }
            
            Log.d(TAG, "📂 État audio restauré: " + currentSurah + " - " + currentReciter + 
                      " (audioPath: " + (!currentAudioPath.isEmpty() ? "OUI" : "NON") + ")");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur restauration état audio: " + e.getMessage());
        }
    }
    
    /**
     * Extraire une valeur depuis un JSON simple
     */
    private String extractJsonValue(String json, String key) {
        try {
            String searchKey = "\"" + key + "\":\"";
            int startIndex = json.indexOf(searchKey);
            if (startIndex != -1) {
                startIndex += searchKey.length();
                int endIndex = json.indexOf("\"", startIndex);
                if (endIndex != -1) {
                    return json.substring(startIndex, endIndex);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "⚠️ Erreur extraction JSON pour " + key + ": " + e.getMessage());
        }
        return "";
    }

    /**
     * Vérifier si le service Adhan est actif
     */
    private boolean isAdhanServiceActive() {
        try {
            android.app.ActivityManager am = (android.app.ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
            for (android.app.ActivityManager.RunningServiceInfo service : am.getRunningServices(Integer.MAX_VALUE)) {
                if (AdhanService.class.getName().equals(service.service.getClassName())) {
                    Log.d(TAG, "🔍 Service Adhan détecté comme actif");
                    return true;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification service Adhan: " + e.getMessage());
        }
        return false;
    }
    
    /**
     * Attendre que le service Adhan se termine
     */
    private void waitForAdhanServiceToFinish() {
        if (isAdhanServiceActive()) {
            Log.d(TAG, "⏳ Service Adhan actif, attente de 3 secondes...");
            try {
                Thread.sleep(3000); // Attendre 3 secondes
            } catch (InterruptedException e) {
                Log.e(TAG, "❌ Interruption attente service Adhan: " + e.getMessage());
            }
        }
    }

    /**
     * Gérer les erreurs de streaming
     */
    private void handleStreamingError(String audioPath, String surah, String reciter) {
        Log.e(TAG, "❌ Erreur streaming détectée pour: " + surah + " - " + reciter);
        
        // Essayer de récupérer en réinitialisant le MediaPlayer
        try {
            if (mediaPlayer != null) {
                mediaPlayer.reset();
            }
            
            // Réessayer avec un délai
            new android.os.Handler().postDelayed(() -> {
                Log.d(TAG, "🔄 Nouvelle tentative de chargement: " + surah + " - " + reciter);
                loadAudio(audioPath, surah, reciter);
            }, 2000); // Attendre 2 secondes
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur lors de la récupération streaming: " + e.getMessage());
        }
    }
    
    /**
     * Vérifier la connectivité réseau
     */
    private boolean isNetworkAvailable() {
        try {
            android.net.ConnectivityManager connectivityManager = 
                (android.net.ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            
            if (connectivityManager != null) {
                android.net.NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
                return activeNetworkInfo != null && activeNetworkInfo.isConnected();
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification réseau: " + e.getMessage());
        }
        return false;
    }

    /**
     * Gérer l'erreur du MediaPlayer
     */
    private void handleMediaPlayerError() {
        Log.d(TAG, "🔄 Gestion erreur MediaPlayer - réinitialisation...");
        
        // Réinitialiser l'état
        isPlaying = false;
        currentPosition = 0;
        
        try {
            // Réinitialiser le MediaPlayer
            if (mediaPlayer != null) {
                mediaPlayer.reset();
            }
            
            // Recharger l'audio si disponible
            if (!currentAudioPath.isEmpty()) {
                Log.d(TAG, "🔄 Rechargement audio après erreur: " + currentSurah);
                loadAudio(currentAudioPath, currentSurah, currentReciter);
            }
            
            // Diffuser l'état
            broadcastAudioStateChanged();
            updateNotification();
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur lors de la récupération MediaPlayer: " + e.getMessage());
        }
    }
}
