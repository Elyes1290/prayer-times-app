package com.drogbinho.prayertimesapp2;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.util.Log;

import java.io.File;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class DownloadModule extends ReactContextBaseJavaModule {
    private static final String TAG = "DownloadModule";
    private static final String PREFS_NAME = "DownloadModulePrefs";
    private static final String KEY_ACTIVE_DOWNLOADS = "active_downloads";
    
    private DownloadManager downloadManager;
    private Map<Long, DownloadInfo> activeDownloads;
    private ScheduledExecutorService progressExecutor;
    private BroadcastReceiver downloadReceiver;
    private SharedPreferences sharedPreferences;

    public DownloadModule(ReactApplicationContext reactContext) {
        super(reactContext);
        downloadManager = (DownloadManager) reactContext.getSystemService(Context.DOWNLOAD_SERVICE);
        activeDownloads = new HashMap<>();
        progressExecutor = Executors.newScheduledThreadPool(1);
        sharedPreferences = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        setupDownloadReceiver();
        restoreActiveDownloads();
        Log.d(TAG, "🚀 DownloadModule initialisé");
    }

    @Override
    public String getName() {
        return "DownloadModule";
    }

    // 🚀 NOUVEAU : Restaurer les téléchargements actifs depuis SharedPreferences
    private void restoreActiveDownloads() {
        try {
            String activeDownloadsJson = sharedPreferences.getString(KEY_ACTIVE_DOWNLOADS, "{}");
            Log.d(TAG, "📋 Restauration téléchargements actifs: " + activeDownloadsJson);
            
            // Nettoyer les téléchargements terminés d'abord
            clearCompletedDownloads();
            
            // Pour l'instant, on va simplement nettoyer les anciens téléchargements
            // et vérifier s'il y en a qui sont encore en cours
            // TODO: Implémenter le parsing JSON pour restaurer les téléchargements actifs
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur restauration téléchargements", e);
        }
    }

    // 🚀 NOUVEAU : Nettoyer les téléchargements terminés
    private void clearCompletedDownloads() {
        try {
            DownloadManager.Query query = new DownloadManager.Query();
            Cursor cursor = downloadManager.query(query);
            
            if (cursor.moveToFirst()) {
                do {
                    long downloadId = cursor.getLong(cursor.getColumnIndex(DownloadManager.COLUMN_ID));
                    int status = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_STATUS));
                    
                    // Si le téléchargement est terminé (succès ou échec), on le supprime
                    if (status == DownloadManager.STATUS_SUCCESSFUL || 
                        status == DownloadManager.STATUS_FAILED) {
                        downloadManager.remove(downloadId);
                        Log.d(TAG, "🧹 Téléchargement terminé supprimé: " + downloadId);
                    }
                } while (cursor.moveToNext());
            }
            cursor.close();
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur nettoyage téléchargements", e);
        }
    }

    // 🚀 NOUVEAU : Sauvegarder les téléchargements actifs
    private void saveActiveDownloads() {
        try {
            // Créer un JSON simple pour stocker les téléchargements actifs
            StringBuilder json = new StringBuilder("{");
            boolean first = true;
            
            for (Map.Entry<Long, DownloadInfo> entry : activeDownloads.entrySet()) {
                if (!first) json.append(",");
                json.append("\"").append(entry.getKey()).append("\":{");
                json.append("\"contentId\":\"").append(entry.getValue().contentId).append("\",");
                json.append("\"fileName\":\"").append(entry.getValue().fileName).append("\",");
                json.append("\"title\":\"").append(entry.getValue().title).append("\"");
                json.append("}");
                first = false;
            }
            json.append("}");
            
            sharedPreferences.edit()
                .putString(KEY_ACTIVE_DOWNLOADS, json.toString())
                .apply();
                
            Log.d(TAG, "💾 Téléchargements actifs sauvegardés: " + json.toString());
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur sauvegarde téléchargements", e);
        }
    }

    // 🚀 NOUVEAU : Supprimer un téléchargement de la sauvegarde
    private void removeFromSavedDownloads(long downloadId) {
        try {
            activeDownloads.remove(downloadId);
            saveActiveDownloads();
            Log.d(TAG, "🗑️ Téléchargement supprimé de la sauvegarde: " + downloadId);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur suppression sauvegarde", e);
        }
    }

    private void setupDownloadReceiver() {
        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) {
                    long downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (downloadId != -1) {
                        Log.d(TAG, "📡 BroadcastReceiver reçu: downloadId=" + downloadId);
                        handleDownloadComplete(downloadId);
                    }
                }
            }
        };

        getReactApplicationContext().registerReceiver(
            downloadReceiver,
            new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
            Context.RECEIVER_NOT_EXPORTED
        );
        Log.d(TAG, "📡 BroadcastReceiver configuré");
    }

    @ReactMethod
    public void startDownload(ReadableMap downloadInfo, Promise promise) {
        try {
            String url = downloadInfo.getString("url");
            String fileName = downloadInfo.getString("fileName");
            String contentId = downloadInfo.getString("contentId");
            String title = downloadInfo.getString("title");

            // Vérifier si le téléchargement existe déjà
            for (DownloadInfo info : activeDownloads.values()) {
                if (info.contentId.equals(contentId)) {
                    Log.d(TAG, "⚠️ Téléchargement déjà en cours: " + contentId);
                    promise.reject("ALREADY_DOWNLOADING", "Téléchargement déjà en cours");
                    return;
                }
            }

            // Créer le dossier de destination
            File downloadDir = new File(
                getReactApplicationContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS),
                "premium_content"
            );
            if (!downloadDir.exists()) {
                downloadDir.mkdirs();
            }

            // Configurer la requête de téléchargement
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle(title);
            request.setDescription("Téléchargement en cours...");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalFilesDir(
                getReactApplicationContext(),
                Environment.DIRECTORY_DOWNLOADS,
                "premium_content/" + fileName
            );
            request.setAllowedNetworkTypes(DownloadManager.Request.NETWORK_WIFI | DownloadManager.Request.NETWORK_MOBILE);
            request.setAllowedOverRoaming(false);

            // Démarrer le téléchargement
            long downloadId = downloadManager.enqueue(request);

            // Stocker les informations du téléchargement
            DownloadInfo info = new DownloadInfo(contentId, fileName, title, downloadId);
            activeDownloads.put(downloadId, info);
            
            // 🚀 NOUVEAU : Sauvegarder immédiatement
            saveActiveDownloads();

            // Démarrer le suivi de progression
            startProgressTracking(downloadId);

            // Envoyer l'événement de début
            sendDownloadEvent("downloadStarted", contentId, 0, null);

            Log.d(TAG, "📥 Téléchargement démarré: " + contentId + " (ID: " + downloadId + ")");
            promise.resolve((double) downloadId);

        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur démarrage téléchargement", e);
            promise.reject("DOWNLOAD_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void cancelDownload(String contentId, Promise promise) {
        try {
            // Trouver le downloadId correspondant
            Long downloadId = null;
            for (Map.Entry<Long, DownloadInfo> entry : activeDownloads.entrySet()) {
                if (entry.getValue().contentId.equals(contentId)) {
                    downloadId = entry.getKey();
                    break;
                }
            }

            if (downloadId != null) {
                downloadManager.remove(downloadId);
                removeFromSavedDownloads(downloadId);
                
                // Envoyer l'événement d'annulation
                sendDownloadEvent("downloadCancelled", contentId, 0, null);
                
                Log.d(TAG, "🚫 Téléchargement annulé: " + contentId);
                promise.resolve(true);
            } else {
                promise.reject("NOT_FOUND", "Téléchargement non trouvé");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur annulation téléchargement", e);
            promise.reject("CANCEL_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getDownloadStatus(String contentId, Promise promise) {
        try {
            // Trouver le downloadId correspondant
            Long downloadId = null;
            for (Map.Entry<Long, DownloadInfo> entry : activeDownloads.entrySet()) {
                if (entry.getValue().contentId.equals(contentId)) {
                    downloadId = entry.getKey();
                    break;
                }
            }

            if (downloadId != null) {
                DownloadManager.Query query = new DownloadManager.Query();
                query.setFilterById(downloadId);
                Cursor cursor = downloadManager.query(query);

                if (cursor.moveToFirst()) {
                    int status = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_STATUS));
                    long bytesDownloaded = cursor.getLong(cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                    long totalBytes = cursor.getLong(cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                    
                    cursor.close();

                    WritableMap result = Arguments.createMap();
                    result.putString("contentId", contentId);
                    result.putInt("status", status);
                    result.putDouble("progress", totalBytes > 0 ? (double) bytesDownloaded / totalBytes : 0);
                    result.putDouble("bytesDownloaded", bytesDownloaded);
                    result.putDouble("totalBytes", totalBytes);

                    promise.resolve(result);
                } else {
                    cursor.close();
                    // Le téléchargement n'existe plus, le supprimer de notre cache
                    removeFromSavedDownloads(downloadId);
                    promise.reject("NOT_FOUND", "Téléchargement non trouvé");
                }
            } else {
                promise.reject("NOT_FOUND", "Téléchargement non trouvé");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur récupération statut", e);
            promise.reject("STATUS_ERROR", e.getMessage());
        }
    }

    private void startProgressTracking(long downloadId) {
        progressExecutor.scheduleAtFixedRate(() -> {
            try {
                DownloadManager.Query query = new DownloadManager.Query();
                query.setFilterById(downloadId);
                Cursor cursor = downloadManager.query(query);

                if (cursor.moveToFirst()) {
                    int status = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_STATUS));
                    long bytesDownloaded = cursor.getLong(cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                    long totalBytes = cursor.getLong(cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                    
                    cursor.close();

                    DownloadInfo info = activeDownloads.get(downloadId);
                    if (info != null) {
                        double progress = totalBytes > 0 ? (double) bytesDownloaded / totalBytes : 0;
                        
                        // 🚀 OPTIMISATION : Envoyer la progression seulement si elle a changé significativement
                        // ou si c'est la première fois
                        if (info.lastProgress == null || Math.abs(progress - info.lastProgress) >= 0.05) {
                            sendDownloadEvent("downloadProgress", info.contentId, progress, null);
                            info.lastProgress = progress;
                        }

                        // 🚀 NOUVEAU : Vérifier si le téléchargement est terminé
                        if (status == DownloadManager.STATUS_SUCCESSFUL) {
                            // Récupérer le chemin du fichier téléchargé
                            String localUri = getDownloadedFilePath(downloadId);
                            sendDownloadEvent("downloadCompleted", info.contentId, 1.0, localUri);
                            Log.d(TAG, "✅ Téléchargement terminé: " + info.contentId + " -> " + localUri);
                            removeFromSavedDownloads(downloadId);
                        } else if (status == DownloadManager.STATUS_FAILED) {
                            sendDownloadEvent("downloadFailed", info.contentId, 0, null);
                            Log.e(TAG, "❌ Téléchargement échoué: " + info.contentId);
                            removeFromSavedDownloads(downloadId);
                        }
                    }
                } else {
                    cursor.close();
                    // Téléchargement terminé ou supprimé
                    removeFromSavedDownloads(downloadId);
                }
            } catch (Exception e) {
                Log.e(TAG, "❌ Erreur suivi progression", e);
            }
        }, 0, 2, TimeUnit.SECONDS); // 🚀 OPTIMISATION : Vérifier toutes les 2 secondes au lieu d'1
    }

    // 🚀 NOUVEAU : Récupérer le chemin du fichier téléchargé
    private String getDownloadedFilePath(long downloadId) {
        try {
            DownloadManager.Query query = new DownloadManager.Query();
            query.setFilterById(downloadId);
            Cursor cursor = downloadManager.query(query);

            if (cursor.moveToFirst()) {
                String localUri = cursor.getString(cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI));
                cursor.close();
                return localUri;
            }
            cursor.close();
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur récupération chemin fichier", e);
        }
        return null;
    }

    private void handleDownloadComplete(long downloadId) {
        DownloadInfo info = activeDownloads.get(downloadId);
        if (info != null) {
            DownloadManager.Query query = new DownloadManager.Query();
            query.setFilterById(downloadId);
            Cursor cursor = downloadManager.query(query);

            if (cursor.moveToFirst()) {
                int status = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_STATUS));
                String localUri = cursor.getString(cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI));
                
                cursor.close();

                if (status == DownloadManager.STATUS_SUCCESSFUL) {
                    // Envoyer l'événement de succès
                    sendDownloadEvent("downloadCompleted", info.contentId, 1.0, localUri);
                    Log.d(TAG, "✅ Téléchargement terminé: " + info.contentId);
                } else {
                    // Envoyer l'événement d'échec
                    sendDownloadEvent("downloadFailed", info.contentId, 0, null);
                    Log.e(TAG, "❌ Téléchargement échoué: " + info.contentId);
                }
            }

            removeFromSavedDownloads(downloadId);
        }
    }

    private void sendDownloadEvent(String eventName, String contentId, double progress, String localUri) {
        WritableMap params = Arguments.createMap();
        params.putString("contentId", contentId);
        params.putDouble("progress", progress);
        if (localUri != null) {
            params.putString("localUri", localUri);
        }

        getReactApplicationContext()
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        
        if (downloadReceiver != null) {
            getReactApplicationContext().unregisterReceiver(downloadReceiver);
        }
        
        if (progressExecutor != null) {
            progressExecutor.shutdown();
        }
        
        Log.d(TAG, "🧹 DownloadModule nettoyé");
    }

    // 🚀 NOUVEAU : Récupérer tous les téléchargements actifs
    @ReactMethod
    public void getActiveDownloads(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            WritableMap downloads = Arguments.createMap();
            
            for (Map.Entry<Long, DownloadInfo> entry : activeDownloads.entrySet()) {
                DownloadInfo info = entry.getValue();
                WritableMap downloadInfo = Arguments.createMap();
                downloadInfo.putString("contentId", info.contentId);
                downloadInfo.putString("fileName", info.fileName);
                downloadInfo.putString("title", info.title);
                downloadInfo.putDouble("downloadId", info.downloadId);
                
                downloads.putMap(info.contentId, downloadInfo);
            }
            
            result.putMap("downloads", downloads);
            result.putInt("count", activeDownloads.size());
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur récupération téléchargements actifs", e);
            promise.reject("ACTIVE_DOWNLOADS_ERROR", e.getMessage());
        }
    }

    // 🚀 NOUVEAU : Vérifier si un téléchargement est actif
    @ReactMethod
    public void isDownloadActive(String contentId, Promise promise) {
        try {
            boolean isActive = false;
            for (DownloadInfo info : activeDownloads.values()) {
                if (info.contentId.equals(contentId)) {
                    isActive = true;
                    break;
                }
            }
            promise.resolve(isActive);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification téléchargement actif", e);
            promise.reject("CHECK_ERROR", e.getMessage());
        }
    }

    private static class DownloadInfo {
        String contentId;
        String fileName;
        String title;
        long downloadId;
        Double lastProgress;

        DownloadInfo(String contentId, String fileName, String title, long downloadId) {
            this.contentId = contentId;
            this.fileName = fileName;
            this.title = title;
            this.downloadId = downloadId;
            this.lastProgress = null;
        }
    }
} 