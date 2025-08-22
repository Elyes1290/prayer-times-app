package com.drogbinho.prayertimesapp2;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class QuranAudioServiceModule extends ReactContextBaseJavaModule implements QuranAudioService.AudioProgressCallback {

    private static final String TAG = "QuranAudioServiceModule";
    private final ReactApplicationContext reactContext;
    private QuranAudioService audioService;
    private boolean isServiceBound = false;
    private BroadcastReceiver audioEventReceiver;

    // ServiceConnection pour lier le service
    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            Log.d(TAG, "🎵 Service audio connecté");
            QuranAudioService.LocalBinder binder = (QuranAudioService.LocalBinder) service;
            audioService = binder.getService();
            isServiceBound = true;
            
            // Envoyer un événement pour informer React Native
            sendEvent("QuranServiceStatusChanged", "isRunning", true);
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            Log.d(TAG, "🎵 Service audio déconnecté");
            audioService = null;
            isServiceBound = false;
            
            // Envoyer un événement pour informer React Native
            sendEvent("QuranServiceStatusChanged", "isRunning", false);
        }
    };

    public QuranAudioServiceModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        // NE PAS enregistrer le BroadcastReceiver ici - le faire dans startAudioService
    }

    /**
     * Initialiser le BroadcastReceiver pour les événements audio
     */
    private void initializeAudioEventReceiver() {
        // NOUVEAU : BroadcastReceiver pour recevoir les événements du service
        audioEventReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Log.d(TAG, "🚨 QuranAudioServiceModule: BroadcastReceiver onReceive triggered!");
                Log.d(TAG, "📡 Action reçue: " + intent.getAction());
                
                String eventName = intent.getStringExtra("eventName");
                Log.d(TAG, "📡 Événement reçu du service: " + eventName);
                
                if ("QuranAudioStateChanged".equals(eventName)) {
                    // Événement de changement d'état audio
                    Log.d(TAG, "🔍 Événement AUDIO_STATE_CHANGED reçu - isPlaying: " + intent.getBooleanExtra("isPlaying", false) + 
                          ", surah: " + intent.getStringExtra("surah") + 
                          ", position: " + intent.getIntExtra("position", 0) + 
                          ", duration: " + intent.getIntExtra("duration", 0));
                    
                    com.facebook.react.bridge.WritableMap params = new com.facebook.react.bridge.Arguments().createMap();
                    params.putBoolean("isPlaying", intent.getBooleanExtra("isPlaying", false));
                    params.putString("surah", intent.getStringExtra("surah"));
                    params.putString("reciter", intent.getStringExtra("reciter"));
                    params.putInt("position", intent.getIntExtra("position", 0));
                    params.putInt("duration", intent.getIntExtra("duration", 0));
                    params.putBoolean("isPremium", intent.getBooleanExtra("isPremium", false));
                    
                    Log.d(TAG, "📤 Envoi événement AUDIO_STATE_CHANGED à React Native avec params: " + params.toString());
                    sendEvent("QuranAudioStateChanged", params);
                    Log.d(TAG, "✅ Événement AUDIO_STATE_CHANGED envoyé à React Native");
                    
                } else if ("QuranAudioProgress".equals(eventName)) {
                    // Événement de progression audio
                    int position = intent.getIntExtra("position", 0);
                    int duration = intent.getIntExtra("duration", 0);
                    Log.d(TAG, "📡 Événement AUDIO_PROGRESS reçu - position: " + position + ", duration: " + duration);
                    
                    // NOUVEAU : Vérifier que la durée est valide
                    if (duration > 0) {
                        Log.d(TAG, "✅ Durée valide détectée: " + duration + "ms");
                    } else {
                        Log.w(TAG, "⚠️ Durée invalide: " + duration + "ms");
                    }
                    
                    com.facebook.react.bridge.WritableMap params = new com.facebook.react.bridge.Arguments().createMap();
                    params.putInt("position", position);
                    params.putInt("duration", duration);
                    
                    Log.d(TAG, "📤 Envoi événement AUDIO_PROGRESS à React Native avec params: " + params.toString());
                    sendEvent("QuranAudioProgress", params);
                    Log.d(TAG, "✅ Événement AUDIO_PROGRESS envoyé à React Native avec durée: " + duration + "ms");
                    
                } else if ("QuranAudioError".equals(eventName)) {
                    // Événement d'erreur audio
                    Log.d(TAG, "📡 Événement AUDIO_ERROR reçu");
                    com.facebook.react.bridge.WritableMap params = new com.facebook.react.bridge.Arguments().createMap();
                    params.putString("error", intent.getStringExtra("error"));
                    sendEvent("QuranAudioError", params);
                    Log.d(TAG, "✅ Événement AUDIO_ERROR envoyé à React Native");
                }
            }
        };
        
        // Enregistrer le BroadcastReceiver GLOBALEMENT
        IntentFilter filter = new IntentFilter();
        filter.addAction("com.drogbinho.prayertimesapp2.REACT_NATIVE_EVENT");
        
        // CRUCIAL : Enregistrer avec flag EXPORTED pour recevoir les broadcasts inter-processus
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                // Pour Android 13+ : utiliser RECEIVER_EXPORTED pour les broadcasts entre composants
                reactContext.registerReceiver(audioEventReceiver, filter, Context.RECEIVER_EXPORTED);
                Log.d(TAG, "✅ BroadcastReceiver enregistré avec RECEIVER_EXPORTED (Android 13+)");
            } else {
                // Pour versions antérieures
                reactContext.registerReceiver(audioEventReceiver, filter);
                Log.d(TAG, "✅ BroadcastReceiver enregistré (Android < 13)");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur enregistrement BroadcastReceiver: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public String getName() {
        return "QuranAudioServiceModule";
    }
    
    // Implémentation de AudioProgressCallback
    @Override
    public void onAudioProgress(int position, int duration, boolean isPlaying, String surah, String reciter) {
        Log.d(TAG, "🎯 Callback onAudioProgress reçu - position: " + position + ", duration: " + duration);
        
        com.facebook.react.bridge.WritableMap params = com.facebook.react.bridge.Arguments.createMap();
        params.putInt("position", position);
        params.putInt("duration", duration);
        
        Log.d(TAG, "📤 Envoi événement QuranAudioProgress à React Native - duration: " + duration + "ms");
        sendEvent("QuranAudioProgress", params);
        Log.d(TAG, "✅ Événement QuranAudioProgress envoyé avec durée: " + duration + "ms");
    }
    
    @Override
    public void onAudioStateChanged(boolean isPlaying, String surah, String reciter, int position, int duration) {
        Log.d(TAG, "🎯 Callback onAudioStateChanged reçu - isPlaying: " + isPlaying + ", duration: " + duration);
        
        com.facebook.react.bridge.WritableMap params = com.facebook.react.bridge.Arguments.createMap();
        params.putBoolean("isPlaying", isPlaying);
        params.putString("surah", surah);
        params.putString("reciter", reciter);
        params.putInt("position", position);
        params.putInt("duration", duration);
        params.putBoolean("isPremium", true); // Déjà vérifié si on utilise le service
        
        Log.d(TAG, "📤 Envoi événement QuranAudioProgress à React Native - duration: " + duration + "ms");
        sendEvent("QuranAudioStateChanged", params);
        Log.d(TAG, "✅ Événement QuranAudioStateChanged envoyé avec durée: " + duration + "ms");
    }

    /**
     * Démarrer le service audio
     */
    @ReactMethod
    public void startAudioService(Promise promise) {
        try {
            Log.d(TAG, "🎵 Démarrage du service audio depuis React Native");
            
            // NOUVEAU : Enregistrer le callback direct au lieu du BroadcastReceiver
            Log.d(TAG, "🔗 Enregistrement du callback direct vers React Native");
            QuranAudioService.setAudioProgressCallback(this);
            
            // Garder aussi le BroadcastReceiver comme backup
            if (audioEventReceiver == null) {
                initializeAudioEventReceiver();
            }
            
            Intent serviceIntent = new Intent(reactContext, QuranAudioService.class);
            
            // Démarrer le service en mode foreground
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }
            
            // Lier le service pour pouvoir communiquer avec lui
            reactContext.bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE);
            
            Log.d(TAG, "✅ Service audio démarré et lié avec callback direct");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur démarrage service audio: " + e.getMessage());
            promise.reject("START_SERVICE_ERROR", e.getMessage());
        }
    }

    /**
     * Arrêter le service audio
     */
    @ReactMethod
    public void stopAudioService(Promise promise) {
        try {
            Log.d(TAG, "🎵 Arrêt du service audio depuis React Native");
            
            // Supprimer le callback direct
            Log.d(TAG, "🔗 Suppression du callback direct React Native");
            QuranAudioService.removeAudioProgressCallback();
            
            // Arrêter la lecture si elle est en cours
            if (isServiceBound && audioService != null) {
                audioService.stopAudio();
            }
            
            // Délier le service
            if (isServiceBound) {
                reactContext.unbindService(serviceConnection);
                isServiceBound = false;
            }
            
            // Arrêter le service
            Intent serviceIntent = new Intent(reactContext, QuranAudioService.class);
            reactContext.stopService(serviceIntent);
            
            Log.d(TAG, "✅ Service audio arrêté et callback supprimé");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur arrêt service audio: " + e.getMessage());
            promise.reject("STOP_SERVICE_ERROR", e.getMessage());
        }
    }

    /**
     * Charger un audio dans le service
     */
    @ReactMethod
    public void loadAudioInService(String audioPath, String surah, String reciter, Promise promise) {
        try {
            Log.d(TAG, "🎵 Chargement audio dans le service: " + surah + " - " + reciter);
            
            if (!isServiceBound || audioService == null) {
                Log.w(TAG, "⚠️ Service non lié, démarrage automatique...");
                startAudioService();
            }
            
            if (audioService != null) {
                audioService.loadAudio(audioPath, surah, reciter);
                Log.d(TAG, "✅ Audio chargé dans le service");
                promise.resolve(true);
            } else {
                throw new Exception("Service audio non disponible");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur chargement audio: " + e.getMessage());
            promise.reject("LOAD_AUDIO_ERROR", e.getMessage());
        }
    }

    /**
     * Lancer la lecture audio
     */
    @ReactMethod
    public void playAudio(Promise promise) {
        try {
            Log.d(TAG, "🎵 Lancement lecture audio depuis React Native");
            
            if (!isServiceBound || audioService == null) {
                throw new Exception("Service audio non lié");
            }
            
            audioService.playAudio();
            Log.d(TAG, "✅ Lecture audio lancée");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur lancement lecture: " + e.getMessage());
            promise.reject("PLAY_AUDIO_ERROR", e.getMessage());
        }
    }

    /**
     * Mettre en pause l'audio
     */
    @ReactMethod
    public void pauseAudio(Promise promise) {
        try {
            Log.d(TAG, "🎵 Pause audio depuis React Native");
            
            if (!isServiceBound || audioService == null) {
                throw new Exception("Service audio non lié");
            }
            
            audioService.pauseAudio();
            Log.d(TAG, "✅ Audio mis en pause");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur pause audio: " + e.getMessage());
            promise.reject("PAUSE_AUDIO_ERROR", e.getMessage());
        }
    }

    /**
     * Arrêter l'audio
     */
    @ReactMethod
    public void stopAudio(Promise promise) {
        try {
            Log.d(TAG, "🎵 Arrêt audio depuis React Native");
            
            if (!isServiceBound || audioService == null) {
                throw new Exception("Service audio non lié");
            }
            
            audioService.stopAudio();
            Log.d(TAG, "✅ Audio arrêté");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur arrêt audio: " + e.getMessage());
            promise.reject("STOP_AUDIO_ERROR", e.getMessage());
        }
    }

    /**
     * Naviguer vers une position
     */
    @ReactMethod
    public void seekToPosition(int position, Promise promise) {
        try {
            Log.d(TAG, "🎵 Navigation vers position: " + position);
            
            if (!isServiceBound || audioService == null) {
                throw new Exception("Service audio non lié");
            }
            
            audioService.handleSeek(position);
            Log.d(TAG, "✅ Navigation effectuée");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur navigation: " + e.getMessage());
            promise.reject("SEEK_ERROR", e.getMessage());
        }
    }

    /**
     * Mettre à jour le statut premium
     */
    @ReactMethod
    public void updatePremiumStatus(boolean isPremium, Promise promise) {
        try {
            Log.d(TAG, "👑 Mise à jour statut premium: " + isPremium);
            
            // Sauvegarder dans les SharedPreferences
            android.content.SharedPreferences prefs = reactContext.getSharedPreferences("premium_prefs", Context.MODE_PRIVATE);
            prefs.edit().putBoolean("is_premium_user", isPremium).apply();
            
            // Mettre à jour le service si il est lié
            if (isServiceBound && audioService != null) {
                // Le service vérifiera automatiquement le statut premium
                Log.d(TAG, "✅ Statut premium mis à jour dans le service");
            }
            
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur mise à jour statut premium: " + e.getMessage());
            promise.reject("PREMIUM_UPDATE_ERROR", e.getMessage());
        }
    }

    /**
     * Obtenir l'état actuel du service
     */
    @ReactMethod
    public void getCurrentState(Promise promise) {
        try {
            if (!isServiceBound || audioService == null) {
                // Retourner un état par défaut si le service n'est pas lié
                com.facebook.react.bridge.WritableMap state = new com.facebook.react.bridge.Arguments().createMap();
                state.putBoolean("isPlaying", false);
                state.putString("currentSurah", "");
                state.putString("currentReciter", "");
                state.putInt("position", 0);
                state.putInt("duration", 0);
                state.putBoolean("isPremium", false);
                state.putBoolean("isServiceRunning", false);
                promise.resolve(state);
                return;
            }
            
            // Obtenir l'état depuis le service
            com.facebook.react.bridge.WritableMap state = new com.facebook.react.bridge.Arguments().createMap();
            state.putBoolean("isPlaying", audioService.isPlaying());
            state.putString("currentSurah", audioService.getCurrentSurah());
            state.putString("currentReciter", audioService.getCurrentReciter());
            state.putInt("position", audioService.getCurrentPosition());
            state.putInt("duration", audioService.getTotalDuration());
            state.putBoolean("isPremium", audioService.isPremiumUser());
            state.putBoolean("isServiceRunning", isServiceBound);
            
            promise.resolve(state);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur obtention état: " + e.getMessage());
            promise.reject("GET_STATE_ERROR", e.getMessage());
        }
    }

    /**
     * Méthode privée pour démarrer le service de manière asynchrone
     */
    private void startAudioService() throws Exception {
        try {
            Intent serviceIntent = new Intent(reactContext, QuranAudioService.class);
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }
            
            reactContext.bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE);
            
            // Attendre que le service soit lié
            int attempts = 0;
            while (!isServiceBound && attempts < 10) {
                Thread.sleep(100);
                attempts++;
            }
            
            if (!isServiceBound) {
                throw new Exception("Timeout lors de la liaison du service");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur démarrage service asynchrone: " + e.getMessage());
            throw e;
        }
    }

    /**
     * Envoyer un événement à React Native
     */
    private void sendEvent(String eventName, String key, Object value) {
        try {
            com.facebook.react.bridge.WritableMap params = new com.facebook.react.bridge.Arguments().createMap();
            if (value instanceof Boolean) {
                params.putBoolean(key, (Boolean) value);
            } else if (value instanceof Integer) {
                params.putInt(key, (Integer) value);
            } else if (value instanceof String) {
                params.putString(key, (String) value);
            } else if (value instanceof Double) {
                params.putDouble(key, (Double) value);
            }
            
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur envoi événement: " + e.getMessage());
        }
    }

    /**
     * Envoyer un événement avec des paramètres multiples
     */
    private void sendEvent(String eventName, ReadableMap params) {
        try {
            Log.d(TAG, "🚀 Envoi événement React Native: " + eventName + " avec params: " + params.toString());
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
            Log.d(TAG, "✅ Événement React Native envoyé: " + eventName);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur envoi événement: " + e.getMessage());
        }
    }

    /**
     * Nettoyer les ressources lors de la destruction
     */
    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        
        try {
            // Délier le service
            if (isServiceBound) {
                reactContext.unbindService(serviceConnection);
                isServiceBound = false;
            }
            
            // Désenregistrer le BroadcastReceiver
            if (audioEventReceiver != null) {
                reactContext.unregisterReceiver(audioEventReceiver);
                audioEventReceiver = null;
            }
            
            Log.d(TAG, "✅ Ressources audio nettoyées");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur nettoyage ressources: " + e.getMessage());
        }
    }
}
