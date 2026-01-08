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
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
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

    // Actions pour les boutons du widget
    private static final String ACTION_PLAY_PAUSE = "com.drogbinho.prayertimesapp2.QURAN_WIDGET_PLAY_PAUSE";
    private static final String ACTION_PREVIOUS = "com.drogbinho.prayertimesapp2.QURAN_WIDGET_PREVIOUS";
    private static final String ACTION_NEXT = "com.drogbinho.prayertimesapp2.QURAN_WIDGET_NEXT";
    private static final String ACTION_OPEN_APP = "com.drogbinho.prayertimesapp2.QURAN_WIDGET_OPEN_APP";
    private static final String ACTION_SEEK = "com.drogbinho.prayertimesapp2.QURAN_WIDGET_SEEK";
    private static final String ACTION_REFRESH = "com.drogbinho.prayertimesapp2.QURAN_WIDGET_REFRESH";

    // NOUVEAU : Actions pour les options de lecture
    private static final String ACTION_TOGGLE_AUTO_ADVANCE = "com.drogbinho.prayertimesapp2.QURAN_WIDGET_TOGGLE_AUTO_ADVANCE";
    private static final String ACTION_TOGGLE_LOOP = "com.drogbinho.prayertimesapp2.QURAN_WIDGET_TOGGLE_LOOP";

    // NOUVEAU : Action pour le diagnostic
    private static final String ACTION_DIAGNOSTIC = "com.drogbinho.prayertimesapp2.QURAN_WIDGET_DIAGNOSTIC";

    // Actions du service audio - maintenant définies dans QuranAudioService

    // États du widget
    private static boolean isPlaying = false;
    private static String currentSurah = "";
    private static String currentReciter = "";
    private static int currentPosition = 0;
    private static int totalDuration = 0;
    private static String currentAudioPath = "";
    private static boolean isPremiumUser = false;

    // 🎯 NOUVEAU : États des options de lecture
    private static boolean autoAdvanceEnabled = true;
    private static boolean loopEnabled = false;

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
        Log.d(TAG, "🔄 Widget Coran onReceive action: " + action);
        widgetDebugLog(TAG, "🔄 Widget Coran onReceive action: " + action);

        switch (action) {
            case ACTION_PLAY_PAUSE:
                Log.d(TAG, "🎵 Widget traite ACTION_PLAY_PAUSE");
                handlePlayPause(context);
                break;
            case ACTION_PREVIOUS:
                Log.d(TAG, "⏮️ Widget traite ACTION_PREVIOUS");
                handlePrevious(context);
                break;
            case ACTION_NEXT:
                Log.d(TAG, "⏭️ Widget traite ACTION_NEXT");
                handleNext(context);
                break;
            case ACTION_SEEK:
                int seekPosition = intent.getIntExtra("position", 0);
                Log.d(TAG, "🎯 Widget traite ACTION_SEEK: " + seekPosition);
                handleSeek(context, seekPosition);
                break;
            case ACTION_OPEN_APP:
                Log.d(TAG, "📱 Widget traite ACTION_OPEN_APP");
                openQuranScreen(context);
                break;
            case ACTION_REFRESH:
                Log.d(TAG, "🔄 Widget traite ACTION_REFRESH");
                refreshWidget(context);
                break;
            case QuranAudioService.ACTION_AUDIO_STATE_CHANGED:
                Log.d(TAG, "🎵 Widget traite ACTION_AUDIO_STATE_CHANGED");
                // Mise à jour depuis le service audio
                handleAudioStateChanged(context, intent);
                break;
            case QuranAudioService.ACTION_AUDIO_PROGRESS:
                Log.d(TAG, "📊 Widget traite ACTION_AUDIO_PROGRESS");
                // Mise à jour de la progression
                handleAudioProgress(context, intent);
                break;
            case ACTION_TOGGLE_AUTO_ADVANCE:
                handleToggleAutoAdvance(context);
                break;
            case ACTION_TOGGLE_LOOP:
                handleToggleLoop(context);
                break;

            case ACTION_DIAGNOSTIC:
                Log.d(TAG, "🔍 Widget traite ACTION_DIAGNOSTIC");
                runDiagnostic(context);
                break;
            default:
                Log.d(TAG, "Action inconnue reçue: " + action);
                break;
        }

        // Mettre à jour tous les widgets (déjà fait par les handlers spécifiques si
        // nécessaire)
        // updateAllWidgets(context);
    }

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        QuranWidget.context = context;
        widgetDebugLog(TAG, "✅ Widget Coran activé");

        // Vérifier le statut premium
        checkPremiumStatus(context);

        // Démarrer le service audio SEULEMENT si l'utilisateur est premium
        if (isPremiumUser) {
            try {
                Intent serviceIntent = new Intent(context, QuranAudioService.class);
                context.startService(serviceIntent);
                widgetDebugLog(TAG, "🎵 Service audio démarré depuis onEnabled (utilisateur premium)");
            } catch (Exception e) {
                Log.e(TAG, "❌ Erreur démarrage service depuis onEnabled: " + e.getMessage());
            }
        } else {
            widgetDebugLog(TAG, "⚠️ Service audio non démarré (utilisateur non premium)");
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
                context, 0, playPauseIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.quran_play_pause_button, playPausePendingIntent);

        // Bouton Précédent
        Intent previousIntent = new Intent(context, QuranWidget.class);
        previousIntent.setAction(ACTION_PREVIOUS);
        PendingIntent previousPendingIntent = PendingIntent.getBroadcast(
                context, 1, previousIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.quran_previous_button, previousPendingIntent);

        // Bouton Suivant
        Intent nextIntent = new Intent(context, QuranWidget.class);
        nextIntent.setAction(ACTION_NEXT);
        PendingIntent nextPendingIntent = PendingIntent.getBroadcast(
                context, 2, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.quran_next_button, nextPendingIntent);

        // Bouton Ouvrir App
        Intent openAppIntent = new Intent(context, QuranWidget.class);
        openAppIntent.setAction(ACTION_OPEN_APP);
        PendingIntent openAppPendingIntent = PendingIntent.getBroadcast(
                context, 3, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.quran_open_app_button, openAppPendingIntent);

        // NOUVEAU : Bouton Auto-avancement
        Intent autoAdvanceIntent = new Intent(context, QuranWidget.class);
        autoAdvanceIntent.setAction(ACTION_TOGGLE_AUTO_ADVANCE);
        PendingIntent autoAdvancePendingIntent = PendingIntent.getBroadcast(
                context, 10, autoAdvanceIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.quran_auto_advance_button, autoAdvancePendingIntent);

        // NOUVEAU : Bouton Boucle
        Intent loopIntent = new Intent(context, QuranWidget.class);
        loopIntent.setAction(ACTION_TOGGLE_LOOP);
        PendingIntent loopPendingIntent = PendingIntent.getBroadcast(
                context, 11, loopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.quran_loop_button, loopPendingIntent);

    }

    private static void updateWidgetDisplay(Context context, RemoteViews views) {
        // Mettre à jour l'icône play/pause
        int playPauseIcon = isPlaying ? R.drawable.ic_pause : R.drawable.ic_play;
        widgetDebugLog(TAG, "🎯 Mise à jour icône widget - isPlaying: " + isPlaying + " → icône: "
                + (isPlaying ? "PAUSE" : "PLAY"));
        views.setImageViewResource(R.id.quran_play_pause_button, playPauseIcon);

        // Vérifier si l'audio est local
        boolean isAudioLocal = isCurrentAudioLocal(context);

        // Mettre à jour le titre de la sourate avec traduction
        String surahDisplay;
        if (!isAudioLocal && !currentSurah.isEmpty()) {
            String streamingText = getTranslation(context, "streaming");
            surahDisplay = "📡 " + streamingText + " - " + currentSurah;
        } else {
            String noReadingText = getTranslation(context, "no_current_reading");
            surahDisplay = currentSurah.isEmpty() ? noReadingText : currentSurah;
        }
        views.setTextViewText(R.id.quran_surah_title, surahDisplay);

        // Mettre à jour le nom du récitateur avec traduction
        String selectReciterText = getTranslation(context, "select_reciter");
        String reciterDisplay = currentReciter.isEmpty() ? selectReciterText : currentReciter;
        views.setTextViewText(R.id.quran_reciter_name, reciterDisplay);

        // Mettre à jour la progression
        String progressText = formatTime(currentPosition) + " / " + formatTime(totalDuration);
        views.setTextViewText(R.id.quran_progress_text, progressText);

        // Mettre à jour la barre de progression
        int progressPercent = totalDuration > 0 ? (currentPosition * 100) / totalDuration : 0;
        views.setProgressBar(R.id.quran_progress_bar, 100, progressPercent, false);

        // Badge premium
        views.setImageViewResource(R.id.quran_premium_badge, R.drawable.ic_premium_star);

        // SUPPRIMÉ : Indicateur de récitateur (navigation entre récitateurs retirée)

        // MODIFIÉ : Tous les boutons restent actifs, même avec l'audio en streaming
        // Réactiver tous les boutons
        views.setInt(R.id.quran_previous_button, "setAlpha", 255);
        views.setInt(R.id.quran_next_button, "setAlpha", 255);

        // 🎯 NOUVEAU : Mettre à jour l'affichage des boutons auto-advance et loop
        updateAutoAdvanceButton(views);
        updateLoopButton(views);
    }

    /**
     * 🎯 NOUVEAU : Mettre à jour l'affichage du bouton auto-advance
     */
    private static void updateAutoAdvanceButton(RemoteViews views) {
        if (autoAdvanceEnabled) {
            // Bouton activé : couleur normale/opaque
            views.setInt(R.id.quran_auto_advance_button, "setAlpha", 255);
            views.setInt(R.id.quran_auto_advance_button, "setColorFilter", 0xFF4CAF50); // Vert
        } else {
            // Bouton désactivé : couleur atténuée
            views.setInt(R.id.quran_auto_advance_button, "setAlpha", 128);
            views.setInt(R.id.quran_auto_advance_button, "setColorFilter", 0xFF757575); // Gris
        }
        widgetDebugLog(TAG, "🎯 Bouton auto-advance mis à jour: " + (autoAdvanceEnabled ? "ACTIVÉ" : "DÉSACTIVÉ"));
    }

    /**
     * 🎯 NOUVEAU : Mettre à jour l'affichage du bouton loop
     */
    private static void updateLoopButton(RemoteViews views) {
        if (loopEnabled) {
            // Bouton activé : couleur normale/opaque
            views.setInt(R.id.quran_loop_button, "setAlpha", 255);
            views.setInt(R.id.quran_loop_button, "setColorFilter", 0xFF2196F3); // Bleu
        } else {
            // Bouton désactivé : couleur atténuée
            views.setInt(R.id.quran_loop_button, "setAlpha", 128);
            views.setInt(R.id.quran_loop_button, "setColorFilter", 0xFF757575); // Gris
        }
        widgetDebugLog(TAG, "🎯 Bouton loop mis à jour: " + (loopEnabled ? "ACTIVÉ" : "DÉSACTIVÉ"));
    }

    private static void showPremiumRequiredWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.quran_widget_premium_required);

        // 🌍 NOUVEAU : Appliquer les traductions aux textes du widget premium
        try {
            // IDs des TextViews (je vais les ajouter au XML)
            views.setTextViewText(R.id.quran_premium_title, getTranslation(context, "widget_quran_premium_title"));
            views.setTextViewText(R.id.quran_premium_description,
                    getTranslation(context, "widget_premium_description"));
            views.setTextViewText(R.id.quran_feature_1, getTranslation(context, "widget_feature_direct_play"));
            views.setTextViewText(R.id.quran_feature_2, getTranslation(context, "widget_feature_navigation"));
            views.setTextViewText(R.id.quran_feature_3, getTranslation(context, "widget_feature_audio_controls"));
            views.setTextViewText(R.id.quran_feature_4, getTranslation(context, "widget_feature_offline"));
            views.setTextViewText(R.id.quran_premium_required_button, getTranslation(context, "subscribe_premium"));

            widgetDebugLog(TAG, "🌍 Traductions appliquées au widget premium");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur application traductions widget premium: " + e.getMessage());
        }

        // Bouton pour ouvrir l'app et s'abonner
        Intent openAppIntent = new Intent(context, QuranWidget.class);
        openAppIntent.setAction(ACTION_OPEN_APP);
        PendingIntent openAppPendingIntent = PendingIntent.getBroadcast(
                context, 30, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.quran_premium_required_button, openAppPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static void handlePlayPause(Context context) {
        widgetDebugLog(TAG, "🎵 Action Play/Pause");
        widgetDebugLog(TAG,
                "🎵 État actuel - isPremiumUser: " + isPremiumUser + ", currentAudioPath: '" + currentAudioPath + "'");

        if (!isPremiumUser) {
            widgetDebugLog(TAG, "⚠️ Utilisateur non premium");
            return;
        }

        // Vérifier si l'audio actuel est local
        boolean isAudioLocal = isCurrentAudioLocal(context);

        // Si aucun audio chargé et pas d'audio local, ouvrir l'app
        if (currentAudioPath.isEmpty() && !isAudioLocal) {
            widgetDebugLog(TAG, "⚠️ Aucun audio chargé, ouverture de l'app Coran");
            openQuranScreen(context);
            return;
        }

        widgetDebugLog(TAG, "🎵 Audio disponible: " + currentAudioPath + " (local: " + isAudioLocal + ")");

        // Le service sera démarré automatiquement par l'intent avec l'action

        // Envoyer l'action au service audio via startService
        Intent serviceIntent = new Intent(context, QuranAudioService.class);
        serviceIntent.setAction(QuranAudioService.ACTION_PLAY_PAUSE);
        widgetDebugLog(TAG, "🎵 Intent créé avec action: " + serviceIntent.getAction());
        widgetDebugLog(TAG, "🎵 Intent package: " + serviceIntent.getPackage());

        try {
            context.startService(serviceIntent);
            widgetDebugLog(TAG, "🎵 Action Play/Pause envoyée au service via startService");
            Log.d(TAG, "🎯 CENTRALISÉ: État sera mis à jour par le service via broadcast");

        } catch (Exception e) {
            widgetDebugLog(TAG, "❌ Erreur envoi startService: " + e.getMessage());
        }
    }

    private static void handlePrevious(Context context) {
        Log.d(TAG, "🎯 handlePrevious() - Navigation directe vers sourate précédente");
        widgetDebugLog(TAG, "🎯 Navigation précédente");

        if (!isPremiumUser) {
            Log.d(TAG, "⚠️ handlePrevious() - Utilisateur non premium");
            widgetDebugLog(TAG, "⚠️ Utilisateur non premium");
            return;
        }

        // 🎯 NOUVEAU : Décrémenter la sourate dans le widget et charger le nouvel audio
        try {
            // Extraire le numéro actuel de la sourate depuis currentSurah
            if (currentSurah != null && currentSurah.contains("(") && currentSurah.contains(")")) {
                String surahNumberStr = currentSurah.substring(currentSurah.indexOf("(") + 1,
                        currentSurah.indexOf(")"));
                int currentSurahNumber = Integer.parseInt(surahNumberStr);

                if (currentSurahNumber > 1) {
                    int previousSurahNumber = currentSurahNumber - 1;
                    String formattedNumber = String.format("%03d", previousSurahNumber);

                    // Construire le nouveau nom de sourate (garder le même récitateur)
                    String newSurahName = "Sourate " + formattedNumber + " - " + currentReciter;
                    currentSurah = newSurahName;

                    Log.d(TAG, "🎯 Widget: Sourate mise à jour vers " + formattedNumber);
                    widgetDebugLog(TAG, "🎯 Sourate widget: " + formattedNumber);

                    // 🎵 NOUVEAU : Charger le nouvel audio dans le service
                    Intent serviceIntent = new Intent(context, QuranAudioService.class);
                    serviceIntent.setAction(QuranAudioService.ACTION_LOAD_SURAH_BY_NUMBER);
                    serviceIntent.putExtra("surahNumber", previousSurahNumber);
                    serviceIntent.putExtra("autoPlay", true);
                    context.startService(serviceIntent);

                    Log.d(TAG, "🎵 Widget: Demande de chargement sourate " + previousSurahNumber + " au service");
                    widgetDebugLog(TAG, "🎵 Chargement sourate: " + formattedNumber);
                } else {
                    Log.d(TAG, "🎯 Widget: Déjà à la première sourate (001)");
                    widgetDebugLog(TAG, "🎯 Déjà à la sourate 001");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur mise à jour sourate widget: " + e.getMessage());
        }

        // 🎯 AMÉLIORÉ : Navigation avec sauvegarde état pour synchronisation
        try {
            // Extraire le numéro de sourate actuel depuis currentSurah
            int extractedSurahNumber = 1; // valeur par défaut
            if (currentSurah != null && currentSurah.contains("(") && currentSurah.contains(")")) {
                try {
                    String surahNumberStr = currentSurah.substring(currentSurah.indexOf("(") + 1,
                            currentSurah.indexOf(")"));
                    extractedSurahNumber = Integer.parseInt(surahNumberStr);
                } catch (Exception parseError) {
                    Log.w(TAG, "Erreur extraction numéro sourate: " + parseError.getMessage());
                }
            }

            // Sauvegarder l'état de navigation dans SharedPreferences
            SharedPreferences prefs = context.getSharedPreferences("quran_widget_prefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putInt("current_surah_number", extractedSurahNumber - 1);
            editor.putString("current_surah_name", currentSurah);
            editor.putString("current_reciter", currentReciter);
            editor.putLong("last_navigation_timestamp", System.currentTimeMillis());
            editor.apply();

            // Envoyer événement React Native
            Intent intent = new Intent("com.drogbinho.prayertimesapp2.REACT_NATIVE_EVENT");
            intent.setPackage(context.getPackageName());
            intent.putExtra("eventName", "WidgetNavigatePrevious");
            intent.putExtra("surahNumber", extractedSurahNumber - 1);
            intent.putExtra("surahName", currentSurah);
            intent.putExtra("reciter", currentReciter);
            context.sendBroadcast(intent);

            Log.d(TAG, "🎯 Événement WidgetNavigatePrevious envoyé avec état sauvegardé");
            widgetDebugLog(TAG, "🎯 Navigation précédente avec synchronisation");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur envoi événement navigation: " + e.getMessage());
            widgetDebugLog(TAG, "❌ Erreur navigation: " + e.getMessage());
        }

        // 🎯 Mettre à jour l'affichage du widget
        updateAllWidgets(context);

        Log.d(TAG, "🎯 handlePrevious() - FIN");
    }

    private static void handleNext(Context context) {
        Log.d(TAG, "🎯 handleNext() - Navigation directe vers sourate suivante");
        widgetDebugLog(TAG, "🎯 Navigation suivante");

        if (!isPremiumUser) {
            Log.d(TAG, "⚠️ handleNext() - Utilisateur non premium");
            widgetDebugLog(TAG, "⚠️ Utilisateur non premium");
            return;
        }

        // 🎯 NOUVEAU : Incrémenter la sourate dans le widget et charger le nouvel audio
        try {
            // Extraire le numéro actuel de la sourate depuis currentSurah
            if (currentSurah != null && currentSurah.contains("(") && currentSurah.contains(")")) {
                String surahNumberStr = currentSurah.substring(currentSurah.indexOf("(") + 1,
                        currentSurah.indexOf(")"));
                int currentSurahNumber = Integer.parseInt(surahNumberStr);

                if (currentSurahNumber < 114) {
                    int nextSurahNumber = currentSurahNumber + 1;
                    String formattedNumber = String.format("%03d", nextSurahNumber);

                    // Construire le nouveau nom de sourate (garder le même récitateur)
                    String newSurahName = "Sourate " + formattedNumber + " - " + currentReciter;
                    currentSurah = newSurahName;

                    Log.d(TAG, "🎯 Widget: Sourate mise à jour vers " + formattedNumber);
                    widgetDebugLog(TAG, "🎯 Sourate widget: " + formattedNumber);

                    // 🎵 NOUVEAU : Charger le nouvel audio dans le service
                    Intent serviceIntent = new Intent(context, QuranAudioService.class);
                    serviceIntent.setAction(QuranAudioService.ACTION_LOAD_SURAH_BY_NUMBER);
                    serviceIntent.putExtra("surahNumber", nextSurahNumber);
                    serviceIntent.putExtra("autoPlay", true);
                    context.startService(serviceIntent);

                    Log.d(TAG, "🎵 Widget: Demande de chargement sourate " + nextSurahNumber + " au service");
                    widgetDebugLog(TAG, "🎵 Chargement sourate: " + formattedNumber);
                } else {
                    Log.d(TAG, "🎯 Widget: Déjà à la dernière sourate (114)");
                    widgetDebugLog(TAG, "🎯 Déjà à la sourate 114");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur mise à jour sourate widget: " + e.getMessage());
        }

        // 🎯 AMÉLIORÉ : Navigation avec sauvegarde état pour synchronisation
        try {
            // Extraire le numéro de sourate actuel depuis currentSurah
            int extractedSurahNumber = 1; // valeur par défaut
            if (currentSurah != null && currentSurah.contains("(") && currentSurah.contains(")")) {
                try {
                    String surahNumberStr = currentSurah.substring(currentSurah.indexOf("(") + 1,
                            currentSurah.indexOf(")"));
                    extractedSurahNumber = Integer.parseInt(surahNumberStr);
                } catch (Exception parseError) {
                    Log.w(TAG, "Erreur extraction numéro sourate: " + parseError.getMessage());
                }
            }

            // Sauvegarder l'état de navigation dans SharedPreferences
            SharedPreferences prefs = context.getSharedPreferences("quran_widget_prefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putInt("current_surah_number", extractedSurahNumber + 1);
            editor.putString("current_surah_name", currentSurah);
            editor.putString("current_reciter", currentReciter);
            editor.putLong("last_navigation_timestamp", System.currentTimeMillis());
            editor.apply();

            // Envoyer événement React Native
            Intent intent = new Intent("com.drogbinho.prayertimesapp2.REACT_NATIVE_EVENT");
            intent.setPackage(context.getPackageName());
            intent.putExtra("eventName", "WidgetNavigateNext");
            intent.putExtra("surahNumber", extractedSurahNumber + 1);
            intent.putExtra("surahName", currentSurah);
            intent.putExtra("reciter", currentReciter);
            context.sendBroadcast(intent);

            Log.d(TAG, "🎯 Événement WidgetNavigateNext envoyé avec état sauvegardé");
            widgetDebugLog(TAG, "🎯 Navigation suivante avec synchronisation");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur envoi événement navigation: " + e.getMessage());
            widgetDebugLog(TAG, "❌ Erreur navigation: " + e.getMessage());
        }

        // 🎯 Mettre à jour l'affichage du widget
        updateAllWidgets(context);

        Log.d(TAG, "🎯 handleNext() - FIN");
    }

    private static void handleSeek(Context context, int position) {
        widgetDebugLog(TAG, "🎯 Action Seek vers position: " + position);

        if (!isPremiumUser)
            return;

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

            widgetDebugLog(TAG, "📱 Mise à jour de " + appWidgetIds.length + " widgets avec context: "
                    + (context != null ? "OUI" : "NON"));

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

    // 🎯 SUPPRIMÉ: Ces méthodes sont maintenant inutiles car tout passe par le
    // service centralisé

    private static void stopAudioPlayback() {
        // Logique d'arrêt audio
        // À implémenter avec MediaPlayer
        isPlaying = false;
        widgetDebugLog(TAG, "⏹️ Lecture audio arrêtée");
    }

    private static String formatTime(int milliseconds) {
        int seconds = (milliseconds / 1000) % 60;
        int minutes = (milliseconds / (1000 * 60)) % 60;
        int hours = (milliseconds / (1000 * 60 * 60));

        // 🎯 NOUVEAU : Afficher les heures si la durée dépasse 1 heure
        if (hours > 0) {
            return String.format(Locale.getDefault(), "%d:%02d:%02d", hours, minutes, seconds);
        } else {
            return String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds);
        }
    }

    /**
     * 🌍 Récupère la langue courante depuis les SharedPreferences
     */
    private static String getCurrentLanguage(Context context) {
        widgetDebugLog(TAG, "🌍 DEBUG: Début récupération langue courante");

        try {
            SharedPreferences prefs = context.getSharedPreferences("prayer_times_settings", Context.MODE_PRIVATE);

            // Essayer plusieurs clés possibles
            String[] possibleKeys = { "currentLanguage", "current_language", "language" };

            for (String key : possibleKeys) {
                String language = prefs.getString(key, null);
                if (language != null && !language.isEmpty()) {
                    widgetDebugLog(TAG, "✅ Langue trouvée avec clé '" + key + "': " + language);
                    return language;
                }
                widgetDebugLog(TAG, "❌ Pas de langue pour clé: " + key);
            }

            // Debug: afficher toutes les SharedPreferences
            widgetDebugLog(TAG, "🔍 TOUTES les SharedPreferences:");
            Map<String, ?> allPrefs = prefs.getAll();
            for (Map.Entry<String, ?> entry : allPrefs.entrySet()) {
                widgetDebugLog(TAG, "  - " + entry.getKey() + " = " + entry.getValue());
            }

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur récupération langue: " + e.getMessage());
        }

        widgetDebugLog(TAG, "⚠️ Aucune langue trouvée, utilisation fallback: en");
        return "en"; // English comme langue par défaut
    }

    /**
     * 🌍 Récupère une traduction depuis les fichiers locales_XX.json
     */
    public static String getTranslation(Context context, String key) {
        String language = getCurrentLanguage(context);
        widgetDebugLog(TAG, "🌍 Tentative lecture locales_" + language + ".json pour clé: " + key);

        try {
            String fileName = "locales_" + language + ".json";

            InputStream inputStream = context.getAssets().open(fileName);
            InputStreamReader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8);

            StringBuilder jsonBuilder = new StringBuilder();
            char[] buffer = new char[1024];
            int length;
            while ((length = reader.read(buffer)) != -1) {
                jsonBuilder.append(buffer, 0, length);
            }

            JSONObject translations = new JSONObject(jsonBuilder.toString());

            if (translations.has(key)) {
                String translation = translations.getString(key);
                widgetDebugLog(TAG, "✅ Traduction trouvée: " + key + " = " + translation);
                return translation;
            } else {
                widgetDebugLog(TAG, "⚠️ Clé '" + key + "' non trouvée dans " + fileName);
                return key; // Fallback vers la clé
            }

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur lecture traduction " + language + " pour '" + key + "': " + e.getMessage());
            return key; // Fallback vers la clé
        }
    }

    /**
     * Extraire le numéro de sourate depuis le nom
     */
    private static int extractSurahNumberFromName(String surahName) {
        if (surahName == null || surahName.isEmpty()) {
            return 0;
        }

        // Chercher le pattern (XXX) dans le nom
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\((\\d{3})\\)");
        java.util.regex.Matcher matcher = pattern.matcher(surahName);

        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (NumberFormatException e) {
                Log.e(TAG, "❌ Erreur parsing numéro sourate: " + e.getMessage());
                return 0;
            }
        }

        return 0;
    }

    /**
     * Obtenir le nom de sourate depuis le numéro
     */
    private static String getSurahNameFromNumber(int surahNumber) {
        if (surahNumber < 1 || surahNumber > 114) {
            return null;
        }

        // Liste des 114 sourates du Coran
        String[] surahNames = {
                "Al-Fatiha", "Al-Baqarah", "Aal-E-Imran", "An-Nisa", "Al-Maidah", "Al-An'am", "Al-A'raf", "Al-Anfal",
                "At-Tawbah", "Yunus",
                "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
                "Al-Anbya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas",
                "Al-Ankabut", "Ar-Rum",
                "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
                "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath",
                "Al-Hujurat", "Qaf",
                "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila",
                "Al-Hashr", "Al-Mumtahanah",
                "As-Saf", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam",
                "Al-Haqqah", "Al-Ma'arij",
                "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddathir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba",
                "An-Nazi'at", "Abasa",
                "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la",
                "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
                "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin", "Al-'Alaq", "Al-Qadr", "Al-Bayyinah",
                "Az-Zalzalah", "Al-'Adiyat",
                "Al-Qari'ah", "At-Takathur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraish", "Al-Ma'un", "Al-Kawthar",
                "Al-Kafirun", "An-Nasr",
                "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
        };

        return surahNames[surahNumber - 1] + " (" + String.format("%03d", surahNumber) + ")";
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

    /**
     * 🎯 NOUVEAU : Obtenir l'état de lecture actuel du widget
     */
    public static boolean getWidgetPlayingState() {
        try {
            if (context != null) {
                SharedPreferences prefs = context.getSharedPreferences("quran_widget_state", Context.MODE_PRIVATE);
                boolean playing = prefs.getBoolean("isPlaying", false);
                Log.d(TAG, "🎯 État lecture widget récupéré: " + playing);
                return playing;
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur récupération état lecture widget: " + e.getMessage());
        }
        return false;
    }

    public static void updatePlaybackState(Context providedContext, boolean playing, int position, int duration) {
        isPlaying = playing;
        currentPosition = position;
        totalDuration = duration;

        // Mettre à jour le context statique si possible
        if (providedContext != null) {
            context = providedContext;
        }

        Context activeContext = providedContext != null ? providedContext : context;

        widgetDebugLog(TAG, "🎵 État lecture mis à jour: " + (playing ? "lecture" : "pause"));

        // 🎯 NOUVEAU : Sauvegarder l'état dans SharedPreferences pour synchronisation
        try {
            if (activeContext != null) {
                SharedPreferences prefs = activeContext.getSharedPreferences("quran_widget_state",
                        Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                editor.putBoolean("isPlaying", playing);
                editor.putInt("currentPosition", position);
                editor.putInt("totalDuration", duration);
                editor.putLong("last_update_timestamp", System.currentTimeMillis());
                editor.apply();
                Log.d(TAG, "🎯 État lecture sauvegardé pour synchronisation: " + playing);
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur sauvegarde état lecture: " + e.getMessage());
        }

        // NOUVEAU : Mettre à jour immédiatement tous les widgets
        if (activeContext != null) {
            widgetDebugLog(TAG, "🚀 Mise à jour immédiate des widgets après changement d'état");
            updateAllWidgets(activeContext);
        }
    }

    // Garder l'ancienne méthode pour la compatibilité si nécessaire
    public static void updatePlaybackState(boolean playing, int position, int duration) {
        updatePlaybackState(null, playing, position, duration);
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
     * 🎯 NOUVEAU : Mettre à jour les états des options de lecture
     */
    public static void updateReadingOptions(boolean autoAdvance, boolean loop) {
        autoAdvanceEnabled = autoAdvance;
        loopEnabled = loop;
        widgetDebugLog(TAG, "🎯 Options de lecture mises à jour - Auto-advance: " + autoAdvance + ", Loop: " + loop);

        // Mettre à jour immédiatement tous les widgets
        if (context != null) {
            widgetDebugLog(TAG, "🚀 Mise à jour immédiate des widgets après changement d'options");
            updateAllWidgets(context);
        }
    }

    /**
     * Gérer les mises à jour d'état du service audio
     */
    private static void handleAudioStateChanged(Context context, Intent intent) {
        boolean wasPlaying = isPlaying;
        boolean newServicePlaying = intent.getBooleanExtra("isPlaying", false);

        // 🎯 NOUVEAU : Vérifier si l'état du service diffère de notre état local
        if (wasPlaying != newServicePlaying) {
            Log.d(TAG, "🎯 Correction état widget: local=" + wasPlaying + " → service=" + newServicePlaying);
        }

        isPlaying = newServicePlaying;
        currentSurah = intent.getStringExtra("surah");
        currentReciter = intent.getStringExtra("reciter");
        currentPosition = intent.getIntExtra("position", 0);
        totalDuration = intent.getIntExtra("duration", 0);
        currentAudioPath = intent.getStringExtra("audioPath");
        isPremiumUser = intent.getBooleanExtra("isPremium", false);

        // 🎯 NOUVEAU : Récupérer les états des options de lecture
        boolean newAutoAdvance = intent.getBooleanExtra("autoAdvanceEnabled", true);
        boolean newLoop = intent.getBooleanExtra("loopEnabled", false);

        // 🎯 NOUVEAU : Ne mettre à jour que si les états ont changé (éviter mise à jour
        // inutile)
        if (autoAdvanceEnabled != newAutoAdvance || loopEnabled != newLoop) {
            autoAdvanceEnabled = newAutoAdvance;
            loopEnabled = newLoop;
            widgetDebugLog(TAG,
                    "🎯 Options mises à jour - Auto-advance: " + autoAdvanceEnabled + ", Loop: " + loopEnabled);
        }

        // 🎯 NOUVEAU : Sauvegarder l'état corrigé
        updatePlaybackState(context, isPlaying, currentPosition, totalDuration);

        widgetDebugLog(TAG, "🎵 État audio mis à jour: " + (isPlaying ? "Lecture" : "Pause") +
                " - " + currentSurah + " - " + currentReciter);
        widgetDebugLog(TAG, "🔄 Changement d'état: " + (wasPlaying ? "Lecture" : "Pause") + " → "
                + (isPlaying ? "Lecture" : "Pause"));

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
    private static void handleAudioProgress(Context context, Intent intent) {
        currentPosition = intent.getIntExtra("position", 0);
        totalDuration = intent.getIntExtra("duration", 0);

        // Mettre à jour le widget
        if (context != null) {
            updateAllWidgets(context);
        }
    }

    private static void handleOpenApp(Context context) {
        widgetDebugLog(TAG, "📱 Ouverture de l'application");
        openQuranScreen(context);
    }

    /**
     * NOUVEAU : Gérer le toggle auto-avancement
     */
    private static void handleToggleAutoAdvance(Context context) {
        widgetDebugLog(TAG, "🔄 Toggle auto-avancement");

        if (!isPremiumUser) {
            widgetDebugLog(TAG, "⚠️ Utilisateur non premium");
            return;
        }

        // 🎯 NOUVEAU : Basculer immédiatement l'état local pour mise à jour visuelle
        // rapide
        autoAdvanceEnabled = !autoAdvanceEnabled;
        widgetDebugLog(TAG, "🎯 Auto-advance basculé localement: " + autoAdvanceEnabled);

        // Mettre à jour immédiatement l'affichage du widget
        updateAllWidgets(context);

        // Envoyer l'action au service audio
        Intent serviceIntent = new Intent(QuranAudioService.ACTION_TOGGLE_AUTO_ADVANCE);
        serviceIntent.setPackage(context.getPackageName());
        context.sendBroadcast(serviceIntent);

        widgetDebugLog(TAG, "🔄 Action auto-avancement envoyée au service");
    }

    /**
     * NOUVEAU : Gérer le toggle boucle
     */
    private static void handleToggleLoop(Context context) {
        widgetDebugLog(TAG, "🔄 Toggle boucle");

        if (!isPremiumUser) {
            widgetDebugLog(TAG, "⚠️ Utilisateur non premium");
            return;
        }

        // 🎯 NOUVEAU : Basculer immédiatement l'état local pour mise à jour visuelle
        // rapide
        loopEnabled = !loopEnabled;
        widgetDebugLog(TAG, "🎯 Loop basculé localement: " + loopEnabled);

        // Mettre à jour immédiatement l'affichage du widget
        updateAllWidgets(context);

        // Envoyer l'action au service audio
        Intent serviceIntent = new Intent(QuranAudioService.ACTION_TOGGLE_LOOP);
        serviceIntent.setPackage(context.getPackageName());
        context.sendBroadcast(serviceIntent);

        widgetDebugLog(TAG, "🔄 Action boucle envoyée au service");
    }

    /**
     * NOUVEAU : Vérifier s'il y a des récitateurs téléchargés
     */
    private static boolean hasDownloadedReciters(Context context) {
        try {
            String quranDir = context.getFilesDir().getAbsolutePath() + "/quran";
            java.io.File quranFolder = new java.io.File(quranDir);

            if (!quranFolder.exists() || !quranFolder.isDirectory()) {
                Log.d(TAG, "📁 Dossier Quran non trouvé: " + quranDir);
                return false;
            }

            // Scanner tous les dossiers de récitateurs
            java.io.File[] reciterFolders = quranFolder.listFiles(java.io.File::isDirectory);
            if (reciterFolders != null) {
                for (java.io.File reciterFolder : reciterFolders) {
                    // Vérifier qu'il y a au moins une sourate téléchargée
                    java.io.File[] mp3Files = reciterFolder
                            .listFiles((dir, name) -> name.toLowerCase().endsWith(".mp3"));
                    if (mp3Files != null && mp3Files.length > 0) {
                        Log.d(TAG, "✅ Récitateur téléchargé trouvé: " + reciterFolder.getName());
                        return true;
                    }
                }
            }

            Log.d(TAG, "📁 Aucun récitateur téléchargé trouvé");
            return false;

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification récitateurs téléchargés: " + e.getMessage());
            return false;
        }
    }

    /**
     * NOUVEAU : Vérifier si l'audio actuel est local (téléchargé)
     */
    private static boolean isCurrentAudioLocal(Context context) {
        try {
            Log.d(TAG, "🔍 Vérification audio local - currentReciter: '" + currentReciter + "', currentSurah: '"
                    + currentSurah + "'");

            // OPTIMISATION : Vérifier d'abord si c'est du streaming pour éviter les
            // vérifications fichiers inutiles
            if (currentAudioPath != null && !currentAudioPath.isEmpty()) {
                if (currentAudioPath.startsWith("http://") || currentAudioPath.startsWith("https://")) {
                    // CORRECTION CRITIQUE : Si l'URL n'a pas de token, l'ajouter
                    if (!currentAudioPath.contains("&token=")) {
                        Log.w(TAG, "⚠️ URL sans token détectée, correction automatique...");
                        currentAudioPath = addTokenToUrl(context, currentAudioPath);
                        Log.d(TAG, "✅ URL corrigée: " + currentAudioPath);
                    }
                    Log.d(TAG, "🌐 Audio streaming détecté: " + currentAudioPath);
                    return false; // C'est du streaming, pas local
                }
            }

            // Vérifier si le récitateur actuel a des fichiers téléchargés
            if (currentReciter == null || currentReciter.isEmpty()) {
                Log.d(TAG, "📁 Aucun récitateur actuel");
                return false;
            }

            // Construire le chemin du dossier du récitateur
            String quranDir = context.getFilesDir().getAbsolutePath() + "/quran";
            String reciterDir = quranDir + "/" + currentReciter.replace(" ", "_");
            java.io.File reciterFolder = new java.io.File(reciterDir);

            Log.d(TAG, "📁 Vérification dossier: " + reciterDir);

            if (!reciterFolder.exists() || !reciterFolder.isDirectory()) {
                Log.d(TAG, "📁 Dossier récitateur non trouvé: " + reciterDir);
                return false;
            }

            // Vérifier s'il y a des fichiers MP3
            java.io.File[] mp3Files = reciterFolder.listFiles((dir, name) -> name.toLowerCase().endsWith(".mp3"));
            if (mp3Files == null || mp3Files.length == 0) {
                Log.d(TAG, "📁 Aucun fichier MP3 trouvé pour le récitateur: " + currentReciter);
                return false;
            }

            Log.d(TAG, "📁 Fichiers MP3 trouvés: " + mp3Files.length);

            // Vérifier si la sourate actuelle est téléchargée
            int currentSurahNumber = extractSurahNumberFromName(currentSurah);
            Log.d(TAG, "🔍 Numéro de sourate extrait: " + currentSurahNumber);

            if (currentSurahNumber > 0) {
                String formattedNumber = String.format("%03d", currentSurahNumber);
                String surahName = getSurahNameFromNumber(currentSurahNumber);
                if (surahName != null) {
                    String fileName = formattedNumber + "_" + surahName.replace("'", "").replace("-", "") + ".mp3";
                    java.io.File surahFile = new java.io.File(reciterDir, fileName);
                    Log.d(TAG, "🔍 Vérification fichier: " + fileName + " - existe: " + surahFile.exists());
                    if (surahFile.exists()) {
                        Log.d(TAG, "✅ Audio local détecté: " + fileName);
                        return true;
                    } else {
                        Log.d(TAG, "📁 Fichier sourate non trouvé: " + fileName);
                    }
                }
            }

            // Cette vérification streaming a été optimisée et déplacée au début de la
            // méthode

            Log.d(TAG, "📁 Audio non local détecté");
            return false;

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification audio local: " + e.getMessage());
            return false;
        }
    }

    /**
     * NOUVEAU : Ajouter le token d'authentification à une URL
     */
    private static String addTokenToUrl(Context context, String originalUrl) {
        try {
            if (originalUrl == null || originalUrl.isEmpty()) {
                return originalUrl;
            }

            // Récupérer le token depuis les SharedPreferences
            android.content.SharedPreferences prefs = context.getSharedPreferences("premium_prefs",
                    Context.MODE_PRIVATE);
            String userToken = prefs.getString("user_token", "");

            if (!userToken.isEmpty()) {
                Log.d(TAG, "🔗 Token trouvé dans le widget, ajout à l'URL");
                return originalUrl + "&token=" + userToken;
            } else {
                Log.w(TAG, "⚠️ Aucun token trouvé dans le widget");
                return originalUrl;
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur ajout token: " + e.getMessage());
            return originalUrl;
        }
    }

    /**
     * NOUVEAU : Méthode de diagnostic pour tester l'état complet du système
     */
    public static void runDiagnostic(Context context) {
        Log.d(TAG, "🔍 DIAGNOSTIC COMPLET DU SYSTÈME WIDGET QURAN");
        widgetDebugLog(TAG, "🔍 Démarrage diagnostic complet");

        // 1. Vérifier le statut premium
        checkPremiumStatus(context);
        Log.d(TAG, "🔍 1. Statut premium: " + isPremiumUser);
        widgetDebugLog(TAG, "🔍 Statut premium: " + isPremiumUser);

        // 2. Vérifier l'état actuel
        Log.d(TAG, "🔍 2. État actuel:");
        Log.d(TAG, "🔍 - currentSurah: '" + currentSurah + "'");
        Log.d(TAG, "🔍 - currentReciter: '" + currentReciter + "'");
        Log.d(TAG, "🔍 - currentAudioPath: '" + currentAudioPath + "'");
        Log.d(TAG, "🔍 - isPlaying: " + isPlaying);

        // 3. Vérifier si le service est en cours d'exécution
        ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        boolean isServiceRunning = false;
        for (ActivityManager.RunningServiceInfo service : am.getRunningServices(Integer.MAX_VALUE)) {
            if (QuranAudioService.class.getName().equals(service.service.getClassName())) {
                isServiceRunning = true;
                break;
            }
        }
        Log.d(TAG, "🔍 3. Service en cours d'exécution: " + isServiceRunning);
        widgetDebugLog(TAG, "🔍 Service en cours: " + isServiceRunning);

        // 4. Vérifier les sourates téléchargées
        try {
            String quranDir = context.getFilesDir().getAbsolutePath() + "/quran";
            java.io.File quranFolder = new java.io.File(quranDir);
            Log.d(TAG, "🔍 4. Dossier Quran: " + quranDir);
            Log.d(TAG, "🔍 - Dossier existe: " + quranFolder.exists());

            if (quranFolder.exists()) {
                java.io.File[] reciterFolders = quranFolder.listFiles(java.io.File::isDirectory);
                Log.d(TAG, "🔍 - Nombre de récitateurs: " + (reciterFolders != null ? reciterFolders.length : 0));

                if (reciterFolders != null) {
                    for (java.io.File reciterFolder : reciterFolders) {
                        Log.d(TAG, "🔍 - Récitateur: " + reciterFolder.getName());
                        java.io.File[] mp3Files = reciterFolder
                                .listFiles((dir, name) -> name.toLowerCase().endsWith(".mp3"));
                        Log.d(TAG, "🔍 - Fichiers MP3: " + (mp3Files != null ? mp3Files.length : 0));

                        if (mp3Files != null && mp3Files.length > 0) {
                            for (java.io.File file : mp3Files) {
                                Log.d(TAG, "🔍 - Fichier: " + file.getName());
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur diagnostic sourates: " + e.getMessage());
        }

        // 5. Vérifier l'audio local actuel
        boolean isAudioLocal = isCurrentAudioLocal(context);
        Log.d(TAG, "🔍 5. Audio local actuel: " + isAudioLocal);
        widgetDebugLog(TAG, "🔍 Audio local: " + isAudioLocal);

        // 6. Tester l'envoi d'une action
        Log.d(TAG, "🔍 6. Test envoi action...");
        Intent testIntent = new Intent(QuranAudioService.ACTION_NEXT);
        testIntent.setPackage(context.getPackageName());
        try {
            context.sendBroadcast(testIntent);
            Log.d(TAG, "🔍 - Action test envoyée avec succès");
            widgetDebugLog(TAG, "🔍 Action test envoyée");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur envoi action test: " + e.getMessage());
            widgetDebugLog(TAG, "❌ Erreur action test: " + e.getMessage());
        }

        Log.d(TAG, "🔍 DIAGNOSTIC COMPLET TERMINÉ");
        widgetDebugLog(TAG, "🔍 Diagnostic terminé");
    }
}
