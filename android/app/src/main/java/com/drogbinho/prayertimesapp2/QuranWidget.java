package com.drogbinho.prayertimesapp2;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Bundle;
import android.util.Log;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import static com.drogbinho.prayertimesapp2.ConditionalLogger.*;
import android.app.ActivityManager;

public class QuranWidget extends AppWidgetProvider {

    private static final String TAG = "QuranWidget";
    
    // Actions pour les boutons du widget - utiliser les mêmes que le service
    private static final String ACTION_PLAY_PAUSE = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_PLAY_PAUSE";
    private static final String ACTION_PREVIOUS = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_PREVIOUS";
    private static final String ACTION_NEXT = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_NEXT";
    private static final String ACTION_SEEK = "com.drogbinho.prayertimesapp2.QURAN_SERVICE_SEEK";
    private static final String ACTION_OPEN_APP = "com.drogbinho.prayertimesapp2.QURAN_OPEN_APP";
    private static final String ACTION_REFRESH = "com.drogbinho.prayertimesapp2.QURAN_REFRESH";
    
    // Actions du service audio - maintenant définies dans QuranAudioService

    // États du widget
    private static boolean isPlaying = false;
    private static String currentSurah = "";
    private static String currentReciter = "";
    private static int currentPosition = 0;
    private static int totalDuration = 0;
    private static String currentAudioPath = "";
    private static boolean isPremiumUser = false;
    private static Context context;

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        widgetDebugLog(TAG, "🔄 Widget Coran onUpdate appelé pour " + appWidgetIds.length + " widgets");

        for (int appWidgetId : appWidgetIds) {
            updateQuranWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        String action = intent.getAction();
        widgetDebugLog(TAG, "🔄 Widget Coran onReceive action: " + action);

        switch (action) {
            case ACTION_PLAY_PAUSE:
                handlePlayPause(context);
                break;
            case ACTION_PREVIOUS:
                handlePrevious(context);
                break;
            case ACTION_NEXT:
                handleNext(context);
                break;
            case ACTION_SEEK:
                int seekPosition = intent.getIntExtra("position", 0);
                handleSeek(context, seekPosition);
                break;
            case ACTION_OPEN_APP:
                openQuranScreen(context);
                break;
            case ACTION_REFRESH:
                refreshWidget(context);
                break;
            case QuranAudioService.ACTION_AUDIO_STATE_CHANGED:
                // Mise à jour depuis le service audio
                handleAudioStateChanged(intent);
                break;
            case QuranAudioService.ACTION_AUDIO_PROGRESS:
                // Mise à jour de la progression
                handleAudioProgress(intent);
                break;
        }

        // Mettre à jour tous les widgets
        updateAllWidgets(context);
    }

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        QuranWidget.context = context;
        widgetDebugLog(TAG, "✅ Widget Coran activé");
        // Vérifier le statut premium
        checkPremiumStatus(context);
        
        // Démarrer le service audio pour s'assurer qu'il est actif
        try {
            Intent serviceIntent = new Intent(context, QuranAudioService.class);
            context.startService(serviceIntent);
            widgetDebugLog(TAG, "🎵 Service audio démarré depuis onEnabled");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur démarrage service depuis onEnabled: " + e.getMessage());
        }
    }

    @Override
    public void onDisabled(Context context) {
        widgetDebugLog(TAG, "❌ Widget Coran désactivé");
        
        // Arrêter la lecture si le widget est supprimé
        stopAudioPlayback();
    }

    static void updateQuranWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        widgetDebugLog(TAG, "🔄 Mise à jour du widget Coran " + appWidgetId);

        try {
            // Vérifier le statut premium à chaque mise à jour
            checkPremiumStatus(context);
            widgetDebugLog(TAG, "👑 Statut premium après vérification: " + isPremiumUser);
            
            // Vérifier le statut premium
            if (!isPremiumUser) {
                widgetDebugLog(TAG, "⚠️ Utilisateur non premium - affichage écran d'abonnement");
                showPremiumRequiredWidget(context, appWidgetManager, appWidgetId);
                return;
            }

            // Créer les RemoteViews
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.quran_widget);

            // Configurer les boutons avec PendingIntents
            setupWidgetButtons(context, views);

            // Mettre à jour l'affichage
            updateWidgetDisplay(context, views);

            // Appliquer les RemoteViews
            appWidgetManager.updateAppWidget(appWidgetId, views);

            widgetDebugLog(TAG, "✅ Widget Coran mis à jour avec succès");

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur mise à jour widget Coran: " + e.getMessage());
        }
    }

    private static void setupWidgetButtons(Context context, RemoteViews views) {
        // Bouton Play/Pause
        Intent playPauseIntent = new Intent(context, QuranWidget.class);
        playPauseIntent.setAction(ACTION_PLAY_PAUSE);
        PendingIntent playPausePendingIntent = PendingIntent.getBroadcast(
            context, 0, playPauseIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.quran_play_pause_button, playPausePendingIntent);

        // Bouton Précédent
        Intent previousIntent = new Intent(context, QuranWidget.class);
        previousIntent.setAction(ACTION_PREVIOUS);
        PendingIntent previousPendingIntent = PendingIntent.getBroadcast(
            context, 1, previousIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.quran_previous_button, previousPendingIntent);

        // Bouton Suivant
        Intent nextIntent = new Intent(context, QuranWidget.class);
        nextIntent.setAction(ACTION_NEXT);
        PendingIntent nextPendingIntent = PendingIntent.getBroadcast(
            context, 2, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.quran_next_button, nextPendingIntent);

        // Bouton Ouvrir App
        Intent openAppIntent = new Intent(context, QuranWidget.class);
        openAppIntent.setAction(ACTION_OPEN_APP);
        PendingIntent openAppPendingIntent = PendingIntent.getBroadcast(
            context, 3, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.quran_open_app_button, openAppPendingIntent);
    }

    private static void updateWidgetDisplay(Context context, RemoteViews views) {
        // Mettre à jour l'icône play/pause
        int playPauseIcon = isPlaying ? R.drawable.ic_pause : R.drawable.ic_play;
        widgetDebugLog(TAG, "🎯 Mise à jour icône widget - isPlaying: " + isPlaying + " → icône: " + (isPlaying ? "PAUSE" : "PLAY"));
        views.setImageViewResource(R.id.quran_play_pause_button, playPauseIcon);

        // Mettre à jour le titre de la sourate
        String surahDisplay = currentSurah.isEmpty() ? "Aucune lecture" : currentSurah;
        views.setTextViewText(R.id.quran_surah_title, surahDisplay);

        // Mettre à jour le nom du récitateur
        String reciterDisplay = currentReciter.isEmpty() ? "Sélectionner un récitateur" : currentReciter;
        views.setTextViewText(R.id.quran_reciter_name, reciterDisplay);

        // Mettre à jour la progression
        String progressText = formatTime(currentPosition) + " / " + formatTime(totalDuration);
        views.setTextViewText(R.id.quran_progress_text, progressText);

        // Mettre à jour la barre de progression
        int progressPercent = totalDuration > 0 ? (currentPosition * 100) / totalDuration : 0;
        views.setProgressBar(R.id.quran_progress_bar, 100, progressPercent, false);

        // Badge premium
        views.setImageViewResource(R.id.quran_premium_badge, R.drawable.ic_premium_star);
    }

    private static void showPremiumRequiredWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.quran_widget_premium_required);
        
        // Bouton pour ouvrir l'app et s'abonner
        Intent openAppIntent = new Intent(context, QuranWidget.class);
        openAppIntent.setAction(ACTION_OPEN_APP);
        PendingIntent openAppPendingIntent = PendingIntent.getBroadcast(
            context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.quran_premium_required_button, openAppPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static void handlePlayPause(Context context) {
        widgetDebugLog(TAG, "🎵 Action Play/Pause");
        widgetDebugLog(TAG, "🎵 État actuel - isPremiumUser: " + isPremiumUser + ", currentAudioPath: '" + currentAudioPath + "'");
        
        if (!isPremiumUser) {
            widgetDebugLog(TAG, "⚠️ Utilisateur non premium");
            return;
        }
        
        if (currentAudioPath.isEmpty()) {
            // Aucun audio chargé, ouvrir l'app
            widgetDebugLog(TAG, "⚠️ Aucun audio chargé, ouverture de l'app Coran");
            openQuranScreen(context);
            return;
        }

        widgetDebugLog(TAG, "🎵 Audio disponible: " + currentAudioPath);

        // Vérifier si le service est en cours d'exécution
        ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        boolean isServiceRunning = false;
        for (ActivityManager.RunningServiceInfo service : am.getRunningServices(Integer.MAX_VALUE)) {
            if (QuranAudioService.class.getName().equals(service.service.getClassName())) {
                isServiceRunning = true;
                break;
            }
        }
        widgetDebugLog(TAG, "🎵 Service en cours d'exécution: " + isServiceRunning);

        // Démarrer le service en premier
        Intent startServiceIntent = new Intent(context, QuranAudioService.class);
        context.startService(startServiceIntent);
        widgetDebugLog(TAG, "🎵 Service démarré");

        // Envoyer l'action au service audio via broadcast
        Intent serviceIntent = new Intent(QuranAudioService.ACTION_PLAY_PAUSE);
        serviceIntent.setPackage(context.getPackageName());
        widgetDebugLog(TAG, "🎵 Intent créé avec action: " + serviceIntent.getAction());
        widgetDebugLog(TAG, "🎵 Intent package: " + serviceIntent.getPackage());
        
        try {
            context.sendBroadcast(serviceIntent);
            widgetDebugLog(TAG, "🎵 Action Play/Pause envoyée au service via broadcast");
            
            // NOUVEAU : Mettre à jour immédiatement le widget après l'action
            // pour montrer que l'action a été reçue
            updateAllWidgets(context);
            
        } catch (Exception e) {
            widgetDebugLog(TAG, "❌ Erreur envoi broadcast: " + e.getMessage());
        }
    }

    private static void handlePrevious(Context context) {
        widgetDebugLog(TAG, "⏮️ Action Précédent");
        
        if (!isPremiumUser) return;
        
        // Envoyer l'action au service audio via broadcast
        Intent serviceIntent = new Intent(QuranAudioService.ACTION_PREVIOUS);
        serviceIntent.setPackage(context.getPackageName());
        
        try {
            context.sendBroadcast(serviceIntent);
            widgetDebugLog(TAG, "🎵 Action Précédent envoyée au service via broadcast");
        } catch (Exception e) {
            widgetDebugLog(TAG, "❌ Erreur envoi broadcast: " + e.getMessage());
        }
    }

    private static void handleNext(Context context) {
        widgetDebugLog(TAG, "⏭️ Action Suivant");
        
        if (!isPremiumUser) return;
        
        // Envoyer l'action au service audio via broadcast
        Intent serviceIntent = new Intent(QuranAudioService.ACTION_NEXT);
        serviceIntent.setPackage(context.getPackageName());
        
        try {
            context.sendBroadcast(serviceIntent);
            widgetDebugLog(TAG, "🎵 Action Suivant envoyée au service via broadcast");
        } catch (Exception e) {
            widgetDebugLog(TAG, "❌ Erreur envoi broadcast: " + e.getMessage());
        }
    }

    private static void handleSeek(Context context, int position) {
        widgetDebugLog(TAG, "🎯 Action Seek vers position: " + position);
        
        if (!isPremiumUser) return;
        
        // Envoyer l'action au service audio via broadcast
        Intent serviceIntent = new Intent(QuranAudioService.ACTION_SEEK);
        serviceIntent.setPackage(context.getPackageName());
        serviceIntent.putExtra("position", position);
        
        try {
            context.sendBroadcast(serviceIntent);
            widgetDebugLog(TAG, "🎵 Action Seek envoyée au service via broadcast");
        } catch (Exception e) {
            widgetDebugLog(TAG, "❌ Erreur envoi broadcast: " + e.getMessage());
        }
    }

    private static void openQuranScreen(Context context) {
        try {
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            intent.putExtra("screen", "quran");
            context.startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur ouverture écran Coran: " + e.getMessage());
        }
    }

    private static void refreshWidget(Context context) {
        widgetDebugLog(TAG, "🔄 Actualisation du widget");
        updateAllWidgets(context);
    }

    public static void updateAllWidgets(Context context) {
        try {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, QuranWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

            widgetDebugLog(TAG, "📱 Mise à jour de " + appWidgetIds.length + " widgets avec context: " + (context != null ? "OUI" : "NON"));

            for (int appWidgetId : appWidgetIds) {
                updateQuranWidget(context, appWidgetManager, appWidgetId);
            }
            
            widgetDebugLog(TAG, "✅ Tous les widgets mis à jour");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur mise à jour widgets: " + e.getMessage());
        }
    }
    
    // NOUVEAU : Méthode pour forcer la mise à jour immédiate d'un widget spécifique
    public static void forceUpdateWidget(Context context, int appWidgetId) {
        try {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            widgetDebugLog(TAG, "🚀 Mise à jour forcée du widget " + appWidgetId);
            
            // Mettre à jour le widget
            updateQuranWidget(context, appWidgetManager, appWidgetId);
            
            // Forcer la mise à jour immédiate
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.quran_play_pause_button);
            
            widgetDebugLog(TAG, "✅ Widget " + appWidgetId + " mis à jour de force");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur mise à jour forcée widget: " + e.getMessage());
        }
    }

    private static void checkPremiumStatus(Context context) {
        try {
            // Le module natif met à jour les SharedPreferences avec le bon statut
            SharedPreferences prefs = context.getSharedPreferences("premium_prefs", Context.MODE_PRIVATE);
            isPremiumUser = prefs.getBoolean("is_premium_user", false);
            widgetDebugLog(TAG, "👑 Statut premium: " + isPremiumUser);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification premium: " + e.getMessage());
            isPremiumUser = false;
        }
    }

    private static void playAudioPlayback() {
        // Logique de lecture audio
        // À implémenter avec MediaPlayer
        isPlaying = true;
        widgetDebugLog(TAG, "▶️ Lecture audio démarrée");
    }

    private static void pauseAudioPlayback() {
        // Logique de pause audio
        // À implémenter avec MediaPlayer
        isPlaying = false;
        widgetDebugLog(TAG, "⏸️ Lecture audio en pause");
    }

    private static void stopAudioPlayback() {
        // Logique d'arrêt audio
        // À implémenter avec MediaPlayer
        isPlaying = false;
        widgetDebugLog(TAG, "⏹️ Lecture audio arrêtée");
    }

    private static String formatTime(int milliseconds) {
        int seconds = (milliseconds / 1000) % 60;
        int minutes = (milliseconds / (1000 * 60)) % 60;
        return String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds);
    }

    // Méthodes publiques pour la communication avec l'app principale
    public static void updateCurrentAudio(Context context, String surah, String reciter, String audioPath) {
        currentSurah = surah;
        currentReciter = reciter;
        currentAudioPath = audioPath;
        widgetDebugLog(TAG, "📻 Audio mis à jour: " + surah + " - " + reciter + " - " + audioPath);
        
        // Mettre à jour le widget
        if (context != null) {
            updateAllWidgets(context);
        }
    }

    public static void updatePlaybackState(boolean playing, int position, int duration) {
        isPlaying = playing;
        currentPosition = position;
        totalDuration = duration;
        widgetDebugLog(TAG, "🎵 État lecture mis à jour: " + (playing ? "lecture" : "pause"));
        
        // NOUVEAU : Mettre à jour immédiatement tous les widgets
        if (context != null) {
            widgetDebugLog(TAG, "🚀 Mise à jour immédiate des widgets après changement d'état");
            updateAllWidgets(context);
        }
    }

    public static void setPremiumStatus(boolean premium) {
        isPremiumUser = premium;
        widgetDebugLog(TAG, "👑 Statut premium mis à jour: " + premium);
        // Forcer la mise à jour de tous les widgets
        if (context != null) {
            updateAllWidgets(context);
        }
    }
    
    /**
     * Gérer les mises à jour d'état du service audio
     */
    private static void handleAudioStateChanged(Intent intent) {
        boolean wasPlaying = isPlaying;
        
        isPlaying = intent.getBooleanExtra("isPlaying", false);
        currentSurah = intent.getStringExtra("surah");
        currentReciter = intent.getStringExtra("reciter");
        currentPosition = intent.getIntExtra("position", 0);
        totalDuration = intent.getIntExtra("duration", 0);
        currentAudioPath = intent.getStringExtra("audioPath");
        isPremiumUser = intent.getBooleanExtra("isPremium", false);
        
        widgetDebugLog(TAG, "🎵 État audio mis à jour: " + (isPlaying ? "Lecture" : "Pause") + 
                      " - " + currentSurah + " - " + currentReciter);
        widgetDebugLog(TAG, "🔄 Changement d'état: " + (wasPlaying ? "Lecture" : "Pause") + " → " + (isPlaying ? "Lecture" : "Pause"));
        
        // NOUVEAU : Mettre à jour le widget même si context est null
        // Le service appellera directement updateAllWidgets avec son context
        widgetDebugLog(TAG, "📱 État mis à jour - isPlaying: " + isPlaying + ", icône devrait changer");
        
        // NOUVEAU : Mettre à jour immédiatement tous les widgets si on a un context
        if (context != null) {
            widgetDebugLog(TAG, "🚀 Mise à jour immédiate des widgets après changement d'état");
            updateAllWidgets(context);
        } else {
            widgetDebugLog(TAG, "⚠️ Context null, mise à jour différée");
        }
    }
    
    /**
     * Gérer les mises à jour de progression du service audio
     */
    private static void handleAudioProgress(Intent intent) {
        currentPosition = intent.getIntExtra("position", 0);
        totalDuration = intent.getIntExtra("duration", 0);
        
        // Mettre à jour le widget
        if (context != null) {
            updateAllWidgets(context);
        }
    }
}
