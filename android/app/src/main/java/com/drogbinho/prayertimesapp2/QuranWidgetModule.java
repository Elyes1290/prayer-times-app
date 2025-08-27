package com.drogbinho.prayertimesapp2;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class QuranWidgetModule extends ReactContextBaseJavaModule {

    private static final String TAG = "QuranWidgetModule";
    private final ReactApplicationContext reactContext;

    public QuranWidgetModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "QuranWidgetModule";
    }

    /**
     * Mettre à jour les informations audio dans le widget
     */
    @ReactMethod
    public void updateWidgetAudio(String surah, String reciter, String audioPath, Promise promise) {
        try {
            Log.d(TAG, "🎯 updateWidgetAudio appelé depuis React Native");
            Log.d(TAG, "🎯 Paramètres reçus - surah: " + surah + ", reciter: " + reciter + ", audioPath: " + audioPath);
            
            // Mettre à jour le widget
            QuranWidget.updateCurrentAudio(reactContext, surah, reciter, audioPath);
            Log.d(TAG, "✅ Widget audio mis à jour avec succès");
            
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur updateWidgetAudio: " + e.getMessage());
            e.printStackTrace();
            promise.reject("UPDATE_WIDGET_AUDIO_ERROR", e.getMessage());
        }
    }

    /**
     * Mettre à jour l'état de lecture dans le widget
     */
    @ReactMethod
    public void updateWidgetPlaybackState(boolean isPlaying, int position, int duration, Promise promise) {
        try {
            Log.d(TAG, "🎵 Mise à jour état lecture: " + (isPlaying ? "lecture" : "pause") + " - " + position + "/" + duration);
            
            // Mettre à jour l'état dans le widget
            QuranWidget.updatePlaybackState(isPlaying, position, duration);
            
            // Forcer la mise à jour du widget
            updateWidget();
            
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur mise à jour état lecture: " + e.getMessage());
            promise.reject("UPDATE_PLAYBACK_STATE_ERROR", e.getMessage());
        }
    }

    /**
     * Mettre à jour le statut premium dans le widget
     */
    @ReactMethod
    public void updateWidgetPremiumStatus(boolean isPremium, Promise promise) {
        try {
            Log.d(TAG, "👑 Mise à jour statut premium: " + isPremium);
            
            // Sauvegarder dans les préférences
            SharedPreferences prefs = reactContext.getSharedPreferences("premium_prefs", Context.MODE_PRIVATE);
            prefs.edit().putBoolean("is_premium_user", isPremium).apply();
            
            // Mettre à jour les données statiques du widget
            QuranWidget.setPremiumStatus(isPremium);
            
            // Forcer la mise à jour du widget
            updateWidget();
            
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur mise à jour statut premium: " + e.getMessage());
            promise.reject("PREMIUM_UPDATE_ERROR", e.getMessage());
        }
    }

    /**
     * Vérifier si le widget est disponible
     */
    @ReactMethod
    public void isWidgetAvailable(Promise promise) {
        try {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(reactContext);
            ComponentName widgetComponent = new ComponentName(reactContext, QuranWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(widgetComponent);
            
            boolean isAvailable = appWidgetIds.length > 0;
            Log.d(TAG, "📱 Widget disponible: " + isAvailable + " (" + appWidgetIds.length + " widgets)");
            
            promise.resolve(isAvailable);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification widget: " + e.getMessage());
            promise.reject("WIDGET_CHECK_ERROR", e.getMessage());
        }
    }

    /**
     * Obtenir le statut premium actuel depuis AsyncStorage
     */
    @ReactMethod
    public void getPremiumStatus(Promise promise) {
        try {
            // Essayer de lire depuis AsyncStorage d'abord
            String premiumUserData = getAsyncStorageData("@prayer_app_premium_user");
            boolean isPremium = false;
            
            if (premiumUserData != null) {
                try {
                    org.json.JSONObject userData = new org.json.JSONObject(premiumUserData);
                    isPremium = userData.optBoolean("isPremium", false);
                    Log.d(TAG, "👑 Statut premium depuis AsyncStorage: " + isPremium);
                    
                    // Mettre à jour les SharedPreferences pour le widget
                    SharedPreferences prefs = reactContext.getSharedPreferences("premium_prefs", Context.MODE_PRIVATE);
                    prefs.edit().putBoolean("is_premium_user", isPremium).apply();
                    Log.d(TAG, "💾 Statut premium sauvegardé dans SharedPreferences: " + isPremium);
                    
                    // Mettre à jour le widget
                    QuranWidget.setPremiumStatus(isPremium);
                } catch (org.json.JSONException e) {
                    Log.w(TAG, "⚠️ Erreur parsing JSON AsyncStorage: " + e.getMessage());
                }
            }
            
            // Si pas trouvé dans AsyncStorage, essayer SharedPreferences
            if (!isPremium) {
                SharedPreferences prefs = reactContext.getSharedPreferences("premium_prefs", Context.MODE_PRIVATE);
                isPremium = prefs.getBoolean("is_premium_user", false);
                Log.d(TAG, "👑 Statut premium depuis SharedPreferences: " + isPremium);
            }
            
            promise.resolve(isPremium);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur récupération statut premium: " + e.getMessage());
            promise.reject("PREMIUM_GET_ERROR", e.getMessage());
        }
    }
    
    /**
     * Lire les données depuis AsyncStorage (simplifié)
     */
    private String getAsyncStorageData(String key) {
        try {
            Log.d(TAG, "🔍 Tentative lecture AsyncStorage pour la clé: " + key);
            
            // Essayer de lire depuis les SharedPreferences d'abord (plus simple)
            SharedPreferences asyncPrefs = reactContext.getSharedPreferences("AsyncStorage", Context.MODE_PRIVATE);
            String value = asyncPrefs.getString(key, null);
            
            if (value != null) {
                Log.d(TAG, "✅ Valeur trouvée dans SharedPreferences AsyncStorage: " + value.substring(0, Math.min(100, value.length())) + "...");
                return value;
            }
            
            // Fallback: essayer la base SQLite d'AsyncStorage
            java.io.File dbFile = new java.io.File(reactContext.getApplicationInfo().dataDir, "databases/AsyncStorage.db");
            Log.d(TAG, "📁 Chemin base AsyncStorage: " + dbFile.getAbsolutePath());
            Log.d(TAG, "📁 Base AsyncStorage existe: " + dbFile.exists());
            
            if (!dbFile.exists()) {
                Log.d(TAG, "⚠️ Base AsyncStorage non trouvée");
                return null;
            }
            
            // Lire directement depuis la base de données SQLite d'AsyncStorage
            android.database.sqlite.SQLiteDatabase db = android.database.sqlite.SQLiteDatabase.openDatabase(
                dbFile.getAbsolutePath(), null, android.database.sqlite.SQLiteDatabase.OPEN_READONLY
            );
            
            try {
                Log.d(TAG, "🔍 Base AsyncStorage ouverte, recherche de la clé: " + key);
                
                android.database.Cursor cursor = db.query(
                    "catalystLocalStorage",
                    new String[]{"value"},
                    "key = ?",
                    new String[]{key},
                    null, null, null
                );
                
                if (cursor != null && cursor.moveToFirst()) {
                    value = cursor.getString(0);
                    cursor.close();
                    Log.d(TAG, "✅ Valeur trouvée dans SQLite AsyncStorage: " + value.substring(0, Math.min(100, value.length())) + "...");
                    return value;
                } else {
                    Log.d(TAG, "⚠️ Aucune valeur trouvée pour la clé: " + key);
                }
                
                if (cursor != null) {
                    cursor.close();
                }
            } finally {
                db.close();
            }
            
            return null;
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur lecture AsyncStorage: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    /**
     * Forcer la mise à jour du widget
     */
    private void updateWidget() {
        try {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(reactContext);
            ComponentName widgetComponent = new ComponentName(reactContext, QuranWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(widgetComponent);
            
            if (appWidgetIds.length > 0) {
                Intent intent = new Intent(reactContext, QuranWidget.class);
                intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);
                reactContext.sendBroadcast(intent);
                
                Log.d(TAG, "✅ Widget mis à jour pour " + appWidgetIds.length + " widgets");
            } else {
                Log.d(TAG, "ℹ️ Aucun widget à mettre à jour");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur mise à jour widget: " + e.getMessage());
        }
    }
    
    /**
     * NOUVEAU : Lancer le diagnostic du widget
     */
    @ReactMethod
    public void runDiagnostic(Promise promise) {
        try {
            Log.d(TAG, "🔍 Lancement diagnostic widget depuis React Native");
            
            // Lancer le diagnostic
            QuranWidget.runDiagnostic(reactContext);
            
            // Mettre à jour le widget
            updateWidget();
            
            Log.d(TAG, "✅ Diagnostic widget lancé avec succès");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur diagnostic widget: " + e.getMessage());
            promise.reject("DIAGNOSTIC_ERROR", e.getMessage());
        }
    }
    
    /**
     * Démarrer le service audio
     */
    @ReactMethod
    public void startAudioService() {
        try {
            Intent serviceIntent = new Intent(reactContext, QuranAudioService.class);
            // Forcer le démarrage du service
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }
            Log.d(TAG, "🎵 Service audio démarré avec succès");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur démarrage service audio: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Charger un audio dans le service
     */
    @ReactMethod
    public void loadAudioInService(String audioPath, String surah, String reciter, Promise promise) {
        try {
            // Démarrer le service s'il n'est pas déjà démarré
            startAudioService();
            
            // Envoyer l'audio au service via broadcast
            Intent intent = new Intent("com.drogbinho.prayertimesapp2.LOAD_AUDIO");
            intent.putExtra("audioPath", audioPath);
            intent.putExtra("surah", surah);
            intent.putExtra("reciter", reciter);
            
            Log.d(TAG, "📡 Envoi broadcast LOAD_AUDIO: " + surah + " - " + reciter);
            Log.d(TAG, "📡 Intent action: " + intent.getAction());
            Log.d(TAG, "📡 Intent package: " + intent.getPackage());
            
            reactContext.sendBroadcast(intent);
            
            Log.d(TAG, "📁 Audio chargé dans le service: " + surah + " - " + reciter);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur chargement audio dans service: " + e.getMessage());
            promise.reject("LOAD_AUDIO_ERROR", e.getMessage());
        }
    }
    
    /**
     * Synchroniser le statut premium depuis AsyncStorage
     */
    @ReactMethod
    public void syncPremiumStatus(Promise promise) {
        try {
            Log.d(TAG, "🔄 Synchronisation du statut premium...");
            
            // Lire depuis AsyncStorage
            String premiumUserData = getAsyncStorageData("@prayer_app_premium_user");
            boolean isPremium = false;
            
            if (premiumUserData != null) {
                try {
                    org.json.JSONObject userData = new org.json.JSONObject(premiumUserData);
                    isPremium = userData.optBoolean("isPremium", false);
                    Log.d(TAG, "👑 Statut premium lu depuis AsyncStorage: " + isPremium);
                } catch (org.json.JSONException e) {
                    Log.w(TAG, "⚠️ Erreur parsing JSON AsyncStorage: " + e.getMessage());
                }
            } else {
                Log.w(TAG, "⚠️ Aucune donnée premium trouvée dans AsyncStorage");
            }
            
            // Mettre à jour les SharedPreferences
            SharedPreferences prefs = reactContext.getSharedPreferences("premium_prefs", Context.MODE_PRIVATE);
            prefs.edit().putBoolean("is_premium_user", isPremium).apply();
            Log.d(TAG, "💾 Statut premium sauvegardé dans SharedPreferences: " + isPremium);
            
            // Mettre à jour le widget
            QuranWidget.setPremiumStatus(isPremium);
            
            promise.resolve(isPremium);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur synchronisation statut premium: " + e.getMessage());
            promise.reject("SYNC_ERROR", e.getMessage());
        }
    }

    /**
     * Envoyer un événement à React Native
     */
    private void sendEvent(String eventName, ReadableMap params) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur envoi événement: " + e.getMessage());
        }
    }
    
    /**
     * Forcer la mise à jour du statut premium (méthode simple)
     */
    @ReactMethod
    public void forcePremiumStatus(boolean isPremium, Promise promise) {
        try {
            Log.d(TAG, "🚀 Forçage du statut premium: " + isPremium);
            
            // Mettre à jour les SharedPreferences
            SharedPreferences prefs = reactContext.getSharedPreferences("premium_prefs", Context.MODE_PRIVATE);
            prefs.edit().putBoolean("is_premium_user", isPremium).apply();
            Log.d(TAG, "💾 Statut premium forcé dans SharedPreferences: " + isPremium);
            
            // Mettre à jour le widget
            QuranWidget.setPremiumStatus(isPremium);
            
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur forçage statut premium: " + e.getMessage());
            promise.reject("FORCE_ERROR", e.getMessage());
        }
    }
}
