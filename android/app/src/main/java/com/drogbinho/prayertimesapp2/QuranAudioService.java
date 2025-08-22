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
    
    // NOUVEAU : Variable pour mémoriser l'état de lecture avant perte de focus
    private boolean wasPlayingBeforeFocusLoss = false;
    
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
    private NotificationManager notificationManager;
    private AudioFocusRequest audioFocusRequest;
    private android.os.Handler progressHandler;
    private Runnable progressRunnable;
    
    // BroadcastReceiver pour les actions du widget
    private final BroadcastReceiver widgetActionReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            Log.d(TAG, "🎵 BroadcastReceiver reçoit action: " + action);
            
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
        progressHandler = new android.os.Handler();
        
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
            
            // Abandonner le focus audio
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest);
                } else {
                    audioManager.abandonAudioFocus(null);
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur destruction service: " + e.getMessage());
        }
        
        super.onDestroy();
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
                currentPosition = 0;
                Log.d(TAG, "🎵 Durée totale: " + totalDuration + "ms");
                
                // NOUVEAU : Logs de debug pour vérifier l'envoi des événements
                Log.d(TAG, "🔍 Envoi événements après préparation - durée: " + totalDuration + "ms");
                broadcastAudioStateChanged();
                Log.d(TAG, "✅ Événement état audio envoyé");
                broadcastAudioProgress();
                Log.d(TAG, "✅ Événement progression audio envoyé");
                
                // NOUVEAU : Vérifier que les événements ont bien été envoyés
                Log.d(TAG, "🔍 Vérification - totalDuration: " + totalDuration + ", currentPosition: " + currentPosition);
            });
            
            mediaPlayer.setOnCompletionListener(mp -> {
                Log.d(TAG, "🎵 Lecture terminée");
                isPlaying = false;
                currentPosition = 0;
                broadcastAudioStateChanged();
                updateNotification();
            });
            
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "❌ Erreur MediaPlayer: what=" + what + ", extra=" + extra);
                
                // Gérer spécifiquement l'erreur de streaming progressif
                if (what == -38) { // MEDIA_ERROR_NOT_VALID_FOR_PROGRESSIVE_PLAYBACK
                    Log.w(TAG, "⚠️ Erreur streaming progressif détectée, tentative de retry avec action=download");
                    
                    // Essayer de recharger avec action=download si c'était action=stream
                    if (currentAudioPath != null && currentAudioPath.contains("action=stream")) {
                        String retryUrl = currentAudioPath.replace("action=stream", "action=download");
                        Log.d(TAG, "🔄 Retry avec URL: " + retryUrl);
                        
                        // Recharger l'audio avec la nouvelle URL
                        loadAudio(retryUrl, currentSurah, currentReciter);
                        return true; // Erreur gérée
                    }
                }
                
                isPlaying = false;
                currentPosition = 0;
                broadcastAudioStateChanged();
                updateNotification();
                
                // Envoyer un événement d'erreur à React Native
                Intent errorIntent = new Intent("QuranAudioError");
                errorIntent.putExtra("error", "MediaPlayer error: " + what + ", " + extra);
                sendBroadcast(errorIntent);
                
                return true; // Indique que l'erreur a été gérée
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
                                    Log.d(TAG, "🎵 Pas de relance automatique car l'utilisateur n'était pas en train d'écouter");
                                }
                                break;
                        }
                    })
                    .build();
            }
            
            Log.d(TAG, "✅ MediaPlayer initialisé avec succès");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur initialisation MediaPlayer: " + e.getMessage());
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
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Contrôles de lecture audio du Coran");
            channel.setShowBadge(false);
            notificationManager.createNotificationChannel(channel);
        }
    }
    
    /**
     * Créer la notification
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
        
        // Intent pour stop
        Intent stopIntent = new Intent(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(this, 2, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(isPlaying ? "▶️ Lecture en cours" : "⏸️ Lecture en pause")
            .setContentText(currentSurah.isEmpty() ? "Aucune lecture" : currentSurah + " - " + currentReciter)
            .setSmallIcon(R.drawable.ic_quran_notification)
            .setContentIntent(appPendingIntent)
            .addAction(R.drawable.ic_play_pause, isPlaying ? "Pause" : "Play", playPausePendingIntent)
            .addAction(R.drawable.ic_stop, "Stop", stopPendingIntent)
            .setOngoing(true)
            .setSilent(true);
        
        return builder.build();
    }
    
    /**
     * Mettre à jour la notification
     */
    private void updateNotification() {
        if (notificationManager != null) {
            notificationManager.notify(NOTIFICATION_ID, createNotification());
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
            
            Log.d(TAG, "🔄 État audio restauré: " + currentSurah + " - " + currentReciter);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur restauration état audio: " + e.getMessage());
        }
    }
    
    /**
     * Diffuser l'état audio
     */
    private void broadcastAudioStateChanged() {
        try {
            Log.d(TAG, "📡 Diffusion état audio - isPlaying: " + isPlaying + ", surah: " + currentSurah);
            
            // NOUVEAU : Callback direct vers React Native
            if (audioProgressCallback != null) {
                Log.d(TAG, "🎯 Envoi callback état React Native - isPlaying: " + isPlaying + ", position: " + currentPosition + ", duration: " + totalDuration);
                audioProgressCallback.onAudioStateChanged(isPlaying, currentSurah, currentReciter, currentPosition, totalDuration);
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
    
    /**
     * Diffuser la progression audio
     */
    private void broadcastAudioProgress() {
        try {
            Log.d(TAG, "📡 Diffusion progression audio - position: " + currentPosition + ", duration: " + totalDuration);
            
            // NOUVEAU : Callback direct vers React Native
            if (audioProgressCallback != null) {
                Log.d(TAG, "🎯 Envoi callback direct React Native - position: " + currentPosition + ", duration: " + totalDuration);
                audioProgressCallback.onAudioProgress(currentPosition, totalDuration, isPlaying, currentSurah, currentReciter);
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
            QuranWidget.updatePlaybackState(isPlaying, currentPosition, totalDuration);
            
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
                        Log.d(TAG, "⏱️ Timer progression - position: " + currentPosition + ", duration: " + totalDuration);
                        broadcastAudioProgress();
                        
                        // NOUVEAU : Mettre à jour directement l'état du widget plus fréquemment
                        if (currentPosition % 5000 < 1000) { // Toutes les 5 secondes environ
                            Log.d(TAG, "🚀 Mise à jour directe de l'état du widget depuis le timer");
                            QuranWidget.updatePlaybackState(isPlaying, currentPosition, totalDuration);
                        }
                        
                        // Programmer la prochaine mise à jour
                        progressHandler.postDelayed(this, 1000);
                    } catch (Exception e) {
                        Log.e(TAG, "❌ Erreur timer progression: " + e.getMessage());
                    }
                } else {
                    Log.d(TAG, "⏱️ Timer progression arrêté - mediaPlayer null: " + (mediaPlayer == null) + ", isPlaying: " + isPlaying);
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
        
        // NOUVEAU : Diffuser l'état audio pour mettre à jour le widget
        Log.d(TAG, "📡 Diffusion état audio après Play/Pause pour le widget");
        broadcastAudioStateChanged();
        
        // NOUVEAU : Mettre à jour immédiatement le widget
        Log.d(TAG, "🚀 Mise à jour immédiate du widget après Play/Pause");
        updateQuranWidget();
    }
    
    /**
     * Gérer précédent
     */
    private void handlePrevious() {
        if (!isPremiumUser) return;
        
        Log.d(TAG, "⏮️ Précédent");
        // TODO: Implémenter la logique pour passer à la sourate précédente
        broadcastAudioStateChanged();
        
        // NOUVEAU : Mettre à jour directement l'état du widget
        Log.d(TAG, "🚀 Mise à jour directe de l'état du widget après précédent");
        QuranWidget.updatePlaybackState(isPlaying, currentPosition, totalDuration);
    }
    
    /**
     * Gérer suivant
     */
    private void handleNext() {
        if (!isPremiumUser) return;
        
        Log.d(TAG, "⏭️ Suivant");
        // TODO: Implémenter la logique pour passer à la sourate suivante
        broadcastAudioStateChanged();
        
        // NOUVEAU : Mettre à jour directement l'état du widget
        Log.d(TAG, "🚀 Mise à jour directe de l'état du widget après suivant");
        QuranWidget.updatePlaybackState(isPlaying, currentPosition, totalDuration);
    }
    
    /**
     * Gérer le seek
     */
    public void handleSeek(int position) {
        if (!isPremiumUser || mediaPlayer == null) return;
        
        Log.d(TAG, "🎯 Seek vers: " + position);
        mediaPlayer.seekTo(position);
        currentPosition = position;
        broadcastAudioProgress();
        
        // NOUVEAU : Mettre à jour directement l'état du widget
        Log.d(TAG, "🚀 Mise à jour directe de l'état du widget après seek");
        QuranWidget.updatePlaybackState(isPlaying, currentPosition, totalDuration);
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
        Log.d(TAG, "🎵 playAudio() appelé - isPremiumUser: " + isPremiumUser + ", mediaPlayer null: " + (mediaPlayer == null));
        
        if (!isPremiumUser) {
            Log.w(TAG, "⚠️ Utilisateur non premium, lecture ignorée");
            return;
        }
        
        if (mediaPlayer == null) {
            Log.w(TAG, "⚠️ MediaPlayer null, réinitialisation...");
            initializeMediaPlayer();
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
                        AudioManager.AUDIOFOCUS_GAIN
                    );
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
                currentPosition = 0;
                
                // NOUVEAU : Réinitialiser la variable de focus car l'utilisateur a cliqué manuellement
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
                QuranWidget.updatePlaybackState(isPlaying, currentPosition, totalDuration);
                
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
        if (mediaPlayer == null || !isPlaying) return;
        
        try {
            mediaPlayer.pause();
            isPlaying = false;
            
            // NOUVEAU : Réinitialiser la variable de focus car l'utilisateur a cliqué manuellement
            wasPlayingBeforeFocusLoss = false;
            
            // Sauvegarder l'état
            saveAudioState();
            
            // Arrêter le timer de progression
            stopProgressTimer();
            
            Log.d(TAG, "⏸️ Audio mis en pause");
            
            // Diffuser l'état
            broadcastAudioStateChanged();
            updateNotification();
            
            // NOUVEAU : Mettre à jour directement l'état du widget
            Log.d(TAG, "🚀 Mise à jour directe de l'état du widget après pause");
            QuranWidget.updatePlaybackState(isPlaying, currentPosition, totalDuration);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur pause audio: " + e.getMessage());
        }
    }
    
    /**
     * Arrêter l'audio
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
            
            // NOUVEAU : Réinitialiser la variable de focus car l'utilisateur a cliqué manuellement
            wasPlayingBeforeFocusLoss = false;
            
            // Sauvegarder l'état
            saveAudioState();
            
            // Arrêter le timer de progression
            stopProgressTimer();
            
            Log.d(TAG, "⏹️ Audio arrêté");
            
            // Diffuser l'état
            broadcastAudioStateChanged();
            updateNotification();
            
            // NOUVEAU : Mettre à jour directement l'état du widget
            Log.d(TAG, "🚀 Mise à jour directe de l'état du widget après arrêt");
            QuranWidget.updatePlaybackState(isPlaying, currentPosition, totalDuration);
            
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
                
                // Streaming - améliorer la gestion des URLs
                Log.d(TAG, "🎵 Chargement streaming: " + audioPath);
                try {
                    // NOUVEAU : Essayer d'abord l'URL originale
                    Uri audioUri = Uri.parse(audioPath.trim());
                    Log.d(TAG, "🎵 Tentative avec URL originale: " + audioPath);
                    
                    // Utiliser setDataSource avec le contexte pour une meilleure compatibilité
                    mediaPlayer.setDataSource(getApplicationContext(), audioUri);
                    
                } catch (Exception e) {
                    Log.e(TAG, "❌ Erreur chargement streaming original: " + e.getMessage());
                    
                    // Fallback : essayer avec action=stream si c'était action=download
                    try {
                        String cleanUrl = audioPath.trim();
                        if (cleanUrl.contains("action=download")) {
                            cleanUrl = cleanUrl.replace("action=download", "action=stream");
                            Log.d(TAG, "🔄 Tentative fallback avec action=stream: " + cleanUrl);
                            
                            Uri audioUri = Uri.parse(cleanUrl);
                            mediaPlayer.setDataSource(getApplicationContext(), audioUri);
                        } else {
                            // Fallback vers setDataSource direct
                            Log.d(TAG, "🔄 Tentative fallback streaming direct");
                            mediaPlayer.setDataSource(audioPath);
                        }
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
            
            // Sauvegarder l'état
            saveAudioState();
            
            Log.d(TAG, "✅ Audio chargé avec succès: " + surah + " - " + reciter);
            
            // Diffuser l'état
            broadcastAudioStateChanged();
            updateNotification();
            
            // NOUVEAU : Mettre à jour directement l'état du widget
            Log.d(TAG, "🚀 Mise à jour directe de l'état du widget après chargement audio");
            QuranWidget.updateCurrentAudio(this, surah, reciter, audioPath);
            QuranWidget.updatePlaybackState(isPlaying, currentPosition, totalDuration);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur chargement audio: " + e.getMessage());
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
            android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
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
        // TODO: Implémenter la logique de fallback ou de retry
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
}
