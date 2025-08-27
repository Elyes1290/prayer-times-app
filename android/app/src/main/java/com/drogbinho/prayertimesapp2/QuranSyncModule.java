package com.drogbinho.prayertimesapp2;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class QuranSyncModule extends ReactContextBaseJavaModule {
    private static final String TAG = "QuranSyncModule";
    private static final String MODULE_NAME = "QuranSyncModule";
    
    private final ReactApplicationContext reactContext;
    private BroadcastReceiver syncReceiver;
    
    public QuranSyncModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        initializeSyncReceiver();
    }
    
    @Override
    public String getName() {
        return MODULE_NAME;
    }
    
    /**
     * Initialiser le BroadcastReceiver pour la synchronisation
     */
    private void initializeSyncReceiver() {
        syncReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                Log.d(TAG, "🔄 QuranSyncModule reçoit action: " + action);
                
                if ("com.drogbinho.prayertimesapp2.QURAN_SYNC_APP".equals(action)) {
                    handleSyncFromWidget();
                }
            }
        };
        
        // Enregistrer le receiver
        IntentFilter filter = new IntentFilter("com.drogbinho.prayertimesapp2.QURAN_SYNC_APP");
        reactContext.registerReceiver(syncReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        Log.d(TAG, "✅ QuranSyncModule enregistré pour les broadcasts de synchronisation");
    }
    
    /**
     * Gérer la synchronisation depuis le widget
     */
    private void handleSyncFromWidget() {
        try {
            Log.d(TAG, "🔄 Synchronisation depuis le widget...");
            
            // Lire l'état depuis SharedPreferences
            SharedPreferences prefs = reactContext.getSharedPreferences("quran_widget_prefs", Context.MODE_PRIVATE);
            
            int surahNumber = prefs.getInt("current_surah_number", 0);
            String surahName = prefs.getString("current_surah_name", "");
            String reciter = prefs.getString("current_reciter", "");
            long timestamp = prefs.getLong("last_navigation_timestamp", 0);
            
            Log.d(TAG, "🔄 État lu depuis SharedPreferences:");
            Log.d(TAG, "   - Sourate: " + surahNumber + " (" + surahName + ")");
            Log.d(TAG, "   - Récitateur: " + reciter);
            Log.d(TAG, "   - Timestamp: " + timestamp);
            
            if (surahNumber > 0 && !surahName.isEmpty()) {
                // Envoyer l'événement à React Native
                WritableMap params = Arguments.createMap();
                params.putInt("surahNumber", surahNumber);
                params.putString("surahName", surahName);
                params.putString("reciter", reciter);
                params.putDouble("timestamp", timestamp);
                
                sendEvent("QuranWidgetSync", params);
                Log.d(TAG, "✅ Événement de synchronisation envoyé à React Native");
            } else {
                Log.w(TAG, "⚠️ Données de synchronisation invalides");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur synchronisation depuis widget: " + e.getMessage());
        }
    }
    
    /**
     * Envoyer un événement à React Native
     */
    private void sendEvent(String eventName, WritableMap params) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur envoi événement React Native: " + e.getMessage());
        }
    }
    
    /**
     * Méthode React Native pour vérifier la synchronisation au démarrage
     */
    @ReactMethod
    public void checkWidgetSync(Promise promise) {
        try {
            Log.d(TAG, "🔍 Vérification synchronisation widget au démarrage...");
            
            SharedPreferences prefs = reactContext.getSharedPreferences("quran_widget_prefs", Context.MODE_PRIVATE);
            
            int surahNumber = prefs.getInt("current_surah_number", 0);
            String surahName = prefs.getString("current_surah_name", "");
            String reciter = prefs.getString("current_reciter", "");
            long timestamp = prefs.getLong("last_navigation_timestamp", 0);
            
            WritableMap result = Arguments.createMap();
            result.putInt("surahNumber", surahNumber);
            result.putString("surahName", surahName);
            result.putString("reciter", reciter);
            result.putDouble("timestamp", timestamp);
            result.putBoolean("hasData", surahNumber > 0 && !surahName.isEmpty());
            
            Log.d(TAG, "🔍 Résultat vérification: " + (surahNumber > 0 ? "Données trouvées" : "Aucune donnée"));
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification synchronisation: " + e.getMessage());
            promise.reject("SYNC_ERROR", e.getMessage());
        }
    }
    
    /**
     * Méthode React Native pour effacer les données de synchronisation
     */
    @ReactMethod
    public void clearWidgetSync(Promise promise) {
        try {
            Log.d(TAG, "🗑️ Effacement données synchronisation widget...");
            
            SharedPreferences prefs = reactContext.getSharedPreferences("quran_widget_prefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.clear();
            editor.apply();
            
            Log.d(TAG, "✅ Données synchronisation effacées");
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur effacement synchronisation: " + e.getMessage());
            promise.reject("CLEAR_ERROR", e.getMessage());
        }
    }
    
    /**
     * Nettoyer le receiver lors de la destruction
     */
    public void cleanup() {
        if (syncReceiver != null) {
            try {
                reactContext.unregisterReceiver(syncReceiver);
                Log.d(TAG, "✅ QuranSyncModule nettoyé");
            } catch (Exception e) {
                Log.e(TAG, "❌ Erreur nettoyage QuranSyncModule: " + e.getMessage());
            }
        }
    }
}
