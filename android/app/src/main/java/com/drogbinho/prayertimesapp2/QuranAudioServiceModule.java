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

import android.content.SharedPreferences;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableArray;
import android.app.ActivityManager;

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
                } else if ("QuranSurahCompleted".equals(eventName)) {
                    // NOUVEAU : Événement de fin de sourate
                    Log.d(TAG, "📡 Événement QURAN_SURAH_COMPLETED reçu");
                    String surah = intent.getStringExtra("surah");
                    String reciter = intent.getStringExtra("reciter");
                    boolean autoAdvanceEnabled = intent.getBooleanExtra("autoAdvanceEnabled", false);
                    
                    Log.d(TAG, "🎵 Sourate terminée - surah: " + surah + ", reciter: " + reciter + ", autoAdvance: " + autoAdvanceEnabled);
                    
                    com.facebook.react.bridge.WritableMap params = new com.facebook.react.bridge.Arguments().createMap();
                    params.putString("surah", surah);
                    params.putString("reciter", reciter);
                    params.putBoolean("autoAdvanceEnabled", autoAdvanceEnabled);
                    
                    sendEvent("QuranSurahCompleted", params);
                    Log.d(TAG, "✅ Événement QuranSurahCompleted envoyé à React Native");
                } else if ("WidgetNavigateNext".equals(eventName)) {
                    // 🎯 NOUVEAU : Navigation suivante depuis le widget
                    Log.d(TAG, "🎯 Événement WIDGET_NAVIGATE_NEXT reçu du widget");
                    com.facebook.react.bridge.WritableMap params = new com.facebook.react.bridge.Arguments().createMap();
                    sendEvent("WidgetNavigateNext", params);
                    Log.d(TAG, "✅ Événement WidgetNavigateNext envoyé à React Native");
                } else if ("WidgetNavigatePrevious".equals(eventName)) {
                    // 🎯 NOUVEAU : Navigation précédente depuis le widget
                    Log.d(TAG, "🎯 Événement WIDGET_NAVIGATE_PREVIOUS reçu du widget");
                    com.facebook.react.bridge.WritableMap params = new com.facebook.react.bridge.Arguments().createMap();
                    sendEvent("WidgetNavigatePrevious", params);
                    Log.d(TAG, "✅ Événement WidgetNavigatePrevious envoyé à React Native");
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
            
            // Vérifier le statut premium avant de démarrer le service
            boolean isPremiumUser = checkPremiumStatus();
            Log.d(TAG, "👑 Statut premium vérifié: " + isPremiumUser);
            
            // Enregistrer le callback direct vers React Native
            QuranAudioService.setAudioProgressCallback(this);
            
            // Garder aussi le BroadcastReceiver comme backup
            if (audioEventReceiver == null) {
                initializeAudioEventReceiver();
            }
            
            Intent serviceIntent = new Intent(reactContext, QuranAudioService.class);
            
            // Démarrer le service SEULEMENT si l'utilisateur est premium
            if (isPremiumUser) {
                // Démarrer le service en mode foreground pour les utilisateurs premium
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    reactContext.startForegroundService(serviceIntent);
                } else {
                    reactContext.startService(serviceIntent);
                }
                Log.d(TAG, "✅ Service audio démarré en mode foreground (utilisateur premium)");
            } else {
                // Pour les utilisateurs non premium, démarrer en mode background seulement
                reactContext.startService(serviceIntent);
                Log.d(TAG, "✅ Service audio démarré en mode background (utilisateur non premium)");
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
     * Charger une sourate par son numéro (comme le widget)
     */
    @ReactMethod
    public void loadSurahByNumber(int surahNumber, boolean autoPlay, Promise promise) {
        try {
            Log.d(TAG, "🎯 Chargement sourate " + surahNumber + " avec autoPlay=" + autoPlay);
            
            Intent serviceIntent = new Intent(reactContext, QuranAudioService.class);
            serviceIntent.setAction(QuranAudioService.ACTION_LOAD_SURAH_BY_NUMBER);
            serviceIntent.putExtra("surahNumber", surahNumber);
            serviceIntent.putExtra("autoPlay", autoPlay);
            
            reactContext.startService(serviceIntent);
            
            Log.d(TAG, "✅ Demande de chargement sourate envoyée au service");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur loadSurahByNumber: " + e.getMessage());
            promise.reject("LOAD_SURAH_ERROR", e.getMessage());
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
     * NOUVEAU : Synchroniser le token d'authentification depuis AsyncStorage vers SharedPreferences
     */
    @ReactMethod
    public void syncAuthToken(String token) {
        try {
            Log.d(TAG, "🔗 Synchronisation token d'authentification: " + (token != null ? token.substring(0, Math.min(10, token.length())) + "..." : "null"));
            
            // Sauvegarder dans les SharedPreferences avec la clé attendue par les services
            android.content.SharedPreferences prefs = getReactApplicationContext().getSharedPreferences("premium_prefs", Context.MODE_PRIVATE);
            if (token != null && !token.isEmpty()) {
                prefs.edit().putString("user_token", token).apply();
                Log.d(TAG, "✅ Token synchronisé vers SharedPreferences");
            } else {
                prefs.edit().remove("user_token").apply();
                Log.d(TAG, "🗑️ Token supprimé des SharedPreferences");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur synchronisation token: " + e.getMessage());
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
     * Vérifier le statut premium de l'utilisateur
     */
    private boolean checkPremiumStatus() {
        try {
            android.content.SharedPreferences prefs = reactContext.getSharedPreferences("premium_prefs", android.content.Context.MODE_PRIVATE);
            boolean isPremiumUser = prefs.getBoolean("is_premium_user", false);
            Log.d(TAG, "👑 Statut premium vérifié: " + isPremiumUser);
            return isPremiumUser;
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification statut premium: " + e.getMessage());
            return false;
        }
    }

    /**
     * Méthode privée pour démarrer le service de manière asynchrone
     */
    private void startAudioService() throws Exception {
        try {
            // Vérifier le statut premium avant de démarrer le service
            boolean isPremiumUser = checkPremiumStatus();
            Log.d(TAG, "👑 Statut premium vérifié pour démarrage asynchrone: " + isPremiumUser);
            
            Intent serviceIntent = new Intent(reactContext, QuranAudioService.class);
            
            // Démarrer le service selon le statut premium
            if (isPremiumUser) {
                // Démarrer le service en mode foreground pour les utilisateurs premium
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    reactContext.startForegroundService(serviceIntent);
                } else {
                    reactContext.startService(serviceIntent);
                }
                Log.d(TAG, "✅ Service audio démarré en mode foreground (utilisateur premium)");
            } else {
                // Pour les utilisateurs non premium, démarrer en mode background seulement
                reactContext.startService(serviceIntent);
                Log.d(TAG, "✅ Service audio démarré en mode background (utilisateur non premium)");
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
     * Note: onCatalystInstanceDestroy est déprécié mais toujours nécessaire pour la compatibilité
     */
    @Override
    @SuppressWarnings("deprecation")
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

    /**
     * Naviguer vers la sourate suivante
     */
    @ReactMethod
    public void navigateToNextSurah(Promise promise) {
        try {
            Log.d(TAG, "⏭️ navigateToNextSurah() - DÉBUT");
            
            // Vérifier le statut premium
            boolean isPremiumUser = checkPremiumStatus();
            if (!isPremiumUser) {
                Log.w(TAG, "⚠️ Utilisateur non premium, navigation ignorée");
                promise.reject("NOT_PREMIUM", "Utilisateur non premium");
                return;
            }
            
            // Envoyer l'action au service audio
            Intent serviceIntent = new Intent(QuranAudioService.ACTION_NEXT);
            serviceIntent.setPackage(reactContext.getPackageName());
            
            try {
                reactContext.sendBroadcast(serviceIntent);
                Log.d(TAG, "🎵 Action Suivant envoyée au service via broadcast");
                promise.resolve(true);
            } catch (Exception e) {
                Log.e(TAG, "❌ Erreur envoi broadcast: " + e.getMessage());
                promise.reject("BROADCAST_ERROR", e.getMessage());
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur navigateToNextSurah: " + e.getMessage());
            promise.reject("NAVIGATION_ERROR", e.getMessage());
        }
    }
    
    /**
     * Naviguer vers la sourate précédente
     */
    @ReactMethod
    public void navigateToPreviousSurah(Promise promise) {
        try {
            Log.d(TAG, "⏮️ navigateToPreviousSurah() - DÉBUT");
            
            // Vérifier le statut premium
            boolean isPremiumUser = checkPremiumStatus();
            if (!isPremiumUser) {
                Log.w(TAG, "⚠️ Utilisateur non premium, navigation ignorée");
                promise.reject("NOT_PREMIUM", "Utilisateur non premium");
                return;
            }
            
            // Envoyer l'action au service audio
            Intent serviceIntent = new Intent(QuranAudioService.ACTION_PREVIOUS);
            serviceIntent.setPackage(reactContext.getPackageName());
            
            try {
                reactContext.sendBroadcast(serviceIntent);
                Log.d(TAG, "🎵 Action Précédent envoyée au service via broadcast");
                promise.resolve(true);
            } catch (Exception e) {
                Log.e(TAG, "❌ Erreur envoi broadcast: " + e.getMessage());
                promise.reject("BROADCAST_ERROR", e.getMessage());
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur navigateToPreviousSurah: " + e.getMessage());
            promise.reject("NAVIGATION_ERROR", e.getMessage());
        }
    }

    /**
     * Lire la sourate actuelle depuis le widget
     */
    @ReactMethod
    public void getCurrentWidgetSurah(Promise promise) {
        try {
            Log.d(TAG, "📖 getCurrentWidgetSurah() - DÉBUT");
            
            SharedPreferences prefs = reactContext.getSharedPreferences("quran_widget_prefs", Context.MODE_PRIVATE);
            
            int surahNumber = prefs.getInt("current_surah_number", 1);
            String surahName = prefs.getString("current_surah_name", "Al-Fatiha");
            String reciter = prefs.getString("current_reciter", "AbdelBasset Abdelsamad");
            long timestamp = prefs.getLong("last_navigation_timestamp", 0);
            
            Log.d(TAG, "📖 Sourate widget: " + surahNumber + " - " + surahName);
            
            // Créer l'objet de réponse
            WritableMap result = Arguments.createMap();
            result.putInt("surahNumber", surahNumber);
            result.putString("surahName", surahName);
            result.putString("reciter", reciter);
            result.putDouble("timestamp", timestamp);
            result.putBoolean("hasData", timestamp > 0);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur getCurrentWidgetSurah: " + e.getMessage());
            promise.reject("WIDGET_READ_ERROR", e.getMessage());
        }
    }
    
    /**
     * Synchroniser l'app avec la sourate du widget
     */
    @ReactMethod
    public void syncWithWidgetSurah(Promise promise) {
        try {
            Log.d(TAG, "🔄 syncWithWidgetSurah() - DÉBUT");
            
            SharedPreferences prefs = reactContext.getSharedPreferences("quran_widget_prefs", Context.MODE_PRIVATE);
            
            int surahNumber = prefs.getInt("current_surah_number", 1);
            String surahName = prefs.getString("current_surah_name", "Al-Fatiha");
            String reciter = prefs.getString("current_reciter", "AbdelBasset Abdelsamad");
            long timestamp = prefs.getLong("last_navigation_timestamp", 0);
            
            if (timestamp > 0) {
                Log.d(TAG, "🔄 Synchronisation avec sourate widget: " + surahNumber + " - " + surahName);
                
                // Construire l'URL audio
                String audioUrl = buildAudioUrl(reciter, surahNumber);
                
                // Charger l'audio dans le service
                Intent serviceIntent = new Intent(QuranAudioService.ACTION_LOAD_AUDIO);
                serviceIntent.setClass(reactContext, QuranAudioService.class);
                serviceIntent.putExtra("audioPath", audioUrl);
                serviceIntent.putExtra("surah", surahName);
                serviceIntent.putExtra("reciter", reciter);
                
                reactContext.startService(serviceIntent);
                
                Log.d(TAG, "🎵 Action de synchronisation envoyée au service");
                promise.resolve(true);
                
            } else {
                Log.w(TAG, "⚠️ Aucune donnée de widget trouvée");
                promise.resolve(false);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur syncWithWidgetSurah: " + e.getMessage());
            promise.reject("SYNC_ERROR", e.getMessage());
        }
    }
    
    /**
     * Construire l'URL audio pour une sourate
     */
    private String buildAudioUrl(String reciter, int surahNumber) {
        try {
            String encodedReciter = java.net.URLEncoder.encode(reciter, "UTF-8");
            String surahKey = String.format("%03d", surahNumber);
            
            // Obtenir le nom de la sourate
            String surahName = getSurahNameFromNumber(surahNumber);
            String encodedSurahName = java.net.URLEncoder.encode(surahName, "UTF-8");
            
            // CORRECTION MAJEURE: Utiliser action=download + token comme dans l'app qui fonctionne
            StringBuilder urlBuilder = new StringBuilder("https://myadhanapp.com/api/recitations.php");
            urlBuilder.append("?action=download");
            urlBuilder.append("&reciter=").append(encodedReciter);
            // CORRECTION CRITIQUE: Utiliser seulement le numéro formaté comme dans l'app qui fonctionne
            urlBuilder.append("&surah=").append(surahKey);
            
            // AJOUT CRUCIAL: Récupérer le token depuis les SharedPreferences
            try {
                android.content.SharedPreferences prefs = getReactApplicationContext().getSharedPreferences("premium_prefs", Context.MODE_PRIVATE);
                String userToken = prefs.getString("user_token", "");
                if (!userToken.isEmpty()) {
                    urlBuilder.append("&token=").append(userToken);
                    Log.d(TAG, "🔗 Token ajouté à l'URL dans QuranAudioServiceModule");
                } else {
                    Log.w(TAG, "⚠️ Aucun token utilisateur trouvé dans QuranAudioServiceModule");
                }
            } catch (Exception e) {
                Log.e(TAG, "❌ Erreur récupération token dans QuranAudioServiceModule: " + e.getMessage());
            }
            
            return urlBuilder.toString();
                   
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur buildAudioUrl: " + e.getMessage());
            return "";
        }
    }
    
    /**
     * Obtenir le nom de la sourate depuis son numéro
     */
    private String getSurahNameFromNumber(int surahNumber) {
        // Liste des 114 sourates
        String[] surahNames = {
            "Al-Fatiha", "Al-Baqarah", "Aal-E-Imran", "An-Nisa", "Al-Ma'idah",
            "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
            "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr",
            "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
            "Al-Anbya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan",
            "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum",
            "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir",
            "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
            "Fussilat", "Ash-Shuraa", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah",
            "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
            "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman",
            "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah",
            "As-Saf", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq",
            "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
            "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddathir", "Al-Qiyamah",
            "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa",
            "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj",
            "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
            "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin",
            "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat",
            "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil",
            "Quraish", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
            "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
        };
        
        if (surahNumber >= 1 && surahNumber <= 114) {
            return surahNames[surahNumber - 1];
        }
        
        return "Al-Fatiha"; // Par défaut
    }

    /**
     * NOUVEAU : Obtenir les sourates téléchargées pour un récitateur
     */
    @ReactMethod
    public void getDownloadedSurahs(String reciter, Promise promise) {
        try {
            Log.d(TAG, "📖 getDownloadedSurahs - reciter: " + reciter);
            
            // Vérifier si le service est en cours d'exécution
            if (!isServiceRunning()) {
                Log.w(TAG, "⚠️ Service non en cours d'exécution");
                promise.resolve(new WritableNativeArray());
                return;
            }
            
            // Envoyer une requête au service pour obtenir les sourates téléchargées
            Intent serviceIntent = new Intent(reactContext, QuranAudioService.class);
            serviceIntent.setAction("GET_DOWNLOADED_SURAHS");
            serviceIntent.putExtra("reciter", reciter);
            
            // Utiliser un BroadcastReceiver temporaire pour recevoir la réponse
            BroadcastReceiver responseReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    try {
                        String[] surahNumbers = intent.getStringArrayExtra("surah_numbers");
                        WritableArray result = new WritableNativeArray();
                        
                        if (surahNumbers != null) {
                            for (String surahNumber : surahNumbers) {
                                result.pushInt(Integer.parseInt(surahNumber));
                            }
                        }
                        
                        promise.resolve(result);
                        reactContext.unregisterReceiver(this);
                        
                    } catch (Exception e) {
                        Log.e(TAG, "❌ Erreur traitement réponse sourates téléchargées: " + e.getMessage());
                        promise.reject("ERROR", "Erreur traitement réponse");
                        reactContext.unregisterReceiver(this);
                    }
                }
            };
            
            IntentFilter filter = new IntentFilter("DOWNLOADED_SURAHS_RESPONSE");
            reactContext.registerReceiver(responseReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            
            reactContext.startService(serviceIntent);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur getDownloadedSurahs: " + e.getMessage());
            promise.reject("ERROR", "Erreur getDownloadedSurahs: " + e.getMessage());
        }
    }
    
    /**
     * NOUVEAU : Vérifier si une sourate est téléchargée
     */
    @ReactMethod
    public void isSurahDownloaded(String reciter, int surahNumber, Promise promise) {
        try {
            Log.d(TAG, "🔍 isSurahDownloaded - reciter: " + reciter + ", surahNumber: " + surahNumber);
            
            // Vérifier si le service est en cours d'exécution
            if (!isServiceRunning()) {
                Log.w(TAG, "⚠️ Service non en cours d'exécution");
                promise.resolve(false);
                return;
            }
            
            // Envoyer une requête au service
            Intent serviceIntent = new Intent(reactContext, QuranAudioService.class);
            serviceIntent.setAction("CHECK_SURAH_DOWNLOADED");
            serviceIntent.putExtra("reciter", reciter);
            serviceIntent.putExtra("surah_number", surahNumber);
            
            // Utiliser un BroadcastReceiver temporaire pour recevoir la réponse
            BroadcastReceiver responseReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    try {
                        boolean isDownloaded = intent.getBooleanExtra("is_downloaded", false);
                        promise.resolve(isDownloaded);
                        reactContext.unregisterReceiver(this);
                        
                    } catch (Exception e) {
                        Log.e(TAG, "❌ Erreur traitement réponse vérification sourate: " + e.getMessage());
                        promise.reject("ERROR", "Erreur traitement réponse");
                        reactContext.unregisterReceiver(this);
                    }
                }
            };
            
            IntentFilter filter = new IntentFilter("SURAH_DOWNLOADED_RESPONSE");
            reactContext.registerReceiver(responseReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            
            reactContext.startService(serviceIntent);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur isSurahDownloaded: " + e.getMessage());
            promise.reject("ERROR", "Erreur isSurahDownloaded: " + e.getMessage());
        }
    }
    
    /**
     * NOUVEAU : Définir l'auto-avancement
     */
    @ReactMethod
    public void setAutoAdvanceEnabled(boolean enabled, Promise promise) {
        try {
            Log.d(TAG, "🎵 setAutoAdvanceEnabled: " + enabled);
            
            // Envoyer l'action au service
            Intent serviceIntent = new Intent(QuranAudioService.ACTION_TOGGLE_AUTO_ADVANCE);
            serviceIntent.setPackage(reactContext.getPackageName());
            serviceIntent.putExtra("enabled", enabled);
            reactContext.sendBroadcast(serviceIntent);
            
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur setAutoAdvanceEnabled: " + e.getMessage());
            promise.reject("ERROR", "Erreur setAutoAdvanceEnabled: " + e.getMessage());
        }
    }
    
    /**
     * NOUVEAU : Définir la boucle
     */
    @ReactMethod
    public void setLoopEnabled(boolean enabled, Promise promise) {
        try {
            Log.d(TAG, "🎵 setLoopEnabled: " + enabled);
            
            // Envoyer l'action au service
            Intent serviceIntent = new Intent(QuranAudioService.ACTION_TOGGLE_LOOP);
            serviceIntent.setPackage(reactContext.getPackageName());
            serviceIntent.putExtra("enabled", enabled);
            reactContext.sendBroadcast(serviceIntent);
            
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur setLoopEnabled: " + e.getMessage());
            promise.reject("ERROR", "Erreur setLoopEnabled: " + e.getMessage());
        }
    }
    
    /**
     * NOUVEAU : Obtenir l'état de l'auto-avancement
     */
    @ReactMethod
    public void isAutoAdvanceEnabled(Promise promise) {
        try {
            Log.d(TAG, "🎵 isAutoAdvanceEnabled");
            
            // Vérifier si le service est en cours d'exécution
            if (!isServiceRunning()) {
                Log.w(TAG, "⚠️ Service non en cours d'exécution");
                promise.resolve(true); // Valeur par défaut
                return;
            }
            
            // Envoyer une requête au service
            Intent serviceIntent = new Intent(reactContext, QuranAudioService.class);
            serviceIntent.setAction("GET_AUTO_ADVANCE_STATE");
            
            // Utiliser un BroadcastReceiver temporaire pour recevoir la réponse
            BroadcastReceiver responseReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    try {
                        boolean isEnabled = intent.getBooleanExtra("auto_advance_enabled", true);
                        promise.resolve(isEnabled);
                        reactContext.unregisterReceiver(this);
                        
                    } catch (Exception e) {
                        Log.e(TAG, "❌ Erreur traitement réponse auto-avancement: " + e.getMessage());
                        promise.reject("ERROR", "Erreur traitement réponse");
                        reactContext.unregisterReceiver(this);
                    }
                }
            };
            
            IntentFilter filter = new IntentFilter("AUTO_ADVANCE_STATE_RESPONSE");
            reactContext.registerReceiver(responseReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            
            reactContext.startService(serviceIntent);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur isAutoAdvanceEnabled: " + e.getMessage());
            promise.reject("ERROR", "Erreur isAutoAdvanceEnabled: " + e.getMessage());
        }
    }
    
    /**
     * NOUVEAU : Obtenir l'état de la boucle
     */
    @ReactMethod
    public void isLoopEnabled(Promise promise) {
        try {
            Log.d(TAG, "🎵 isLoopEnabled");
            
            // Vérifier si le service est en cours d'exécution
            if (!isServiceRunning()) {
                Log.w(TAG, "⚠️ Service non en cours d'exécution");
                promise.resolve(false); // Valeur par défaut
                return;
            }
            
            // Envoyer une requête au service
            Intent serviceIntent = new Intent(reactContext, QuranAudioService.class);
            serviceIntent.setAction("GET_LOOP_STATE");
            
            // Utiliser un BroadcastReceiver temporaire pour recevoir la réponse
            BroadcastReceiver responseReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    try {
                        boolean isEnabled = intent.getBooleanExtra("loop_enabled", false);
                        promise.resolve(isEnabled);
                        reactContext.unregisterReceiver(this);
                        
                    } catch (Exception e) {
                        Log.e(TAG, "❌ Erreur traitement réponse boucle: " + e.getMessage());
                        promise.reject("ERROR", "Erreur traitement réponse");
                        reactContext.unregisterReceiver(this);
                    }
                }
            };
            
            IntentFilter filter = new IntentFilter("LOOP_STATE_RESPONSE");
            reactContext.registerReceiver(responseReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            
            reactContext.startService(serviceIntent);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur isLoopEnabled: " + e.getMessage());
            promise.reject("ERROR", "Erreur isLoopEnabled: " + e.getMessage());
        }
    }

    /**
     * Vérifier si le service audio est en cours d'exécution
     */
    private boolean isServiceRunning() {
        try {
            ActivityManager am = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
            for (ActivityManager.RunningServiceInfo service : am.getRunningServices(Integer.MAX_VALUE)) {
                if (QuranAudioService.class.getName().equals(service.service.getClassName())) {
                    return true;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification service: " + e.getMessage());
        }
        return false;
    }
}
