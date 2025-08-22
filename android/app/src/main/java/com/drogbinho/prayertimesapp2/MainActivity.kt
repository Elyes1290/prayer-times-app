package com.drogbinho.prayertimesapp2
import expo.modules.splashscreen.SplashScreenManager

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.util.Log

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  private val TAG = "MainActivity"
  private var audioEventReceiver: BroadcastReceiver? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
    
    // NOUVEAU : Enregistrer le BroadcastReceiver global pour les événements audio
    registerAudioEventReceiver()
  }

  /**
   * Enregistrer le BroadcastReceiver pour les événements audio
   */
  private fun registerAudioEventReceiver() {
    try {
      Log.d(TAG, "🔧 Début enregistrement BroadcastReceiver audio")
      
      audioEventReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
          Log.d(TAG, "📡 BroadcastReceiver onReceive appelé - action: ${intent?.action}")
          val eventName = intent?.getStringExtra("eventName")
          Log.d(TAG, "📡 Événement audio reçu dans MainActivity: $eventName")
          
          // Transmettre l'événement à React Native
          try {
            val reactContext = reactInstanceManager?.currentReactContext
            Log.d(TAG, "🔧 Contexte React Native disponible: ${reactContext != null}")
            
            if (reactContext != null) {
              when (eventName) {
                "QuranAudioProgress" -> {
                  val position = intent.getIntExtra("position", 0)
                  val duration = intent.getIntExtra("duration", 0)
                  Log.d(TAG, "📡 Progression audio - position: $position, duration: $duration")
                  
                  val params = com.facebook.react.bridge.Arguments.createMap()
                  params.putInt("position", position)
                  params.putInt("duration", duration)
                  
                  reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("QuranAudioProgress", params)
                  
                  Log.d(TAG, "✅ Événement progression envoyé à React Native")
                }
                "QuranAudioStateChanged" -> {
                  val isPlaying = intent.getBooleanExtra("isPlaying", false)
                  val surah = intent.getStringExtra("surah")
                  val reciter = intent.getStringExtra("reciter")
                  val position = intent.getIntExtra("position", 0)
                  val duration = intent.getIntExtra("duration", 0)
                  val isPremium = intent.getBooleanExtra("isPremium", false)
                  
                  Log.d(TAG, "📡 État audio - isPlaying: $isPlaying, surah: $surah")
                  
                  val params = com.facebook.react.bridge.Arguments.createMap()
                  params.putBoolean("isPlaying", isPlaying)
                  params.putString("surah", surah)
                  params.putString("reciter", reciter)
                  params.putInt("position", position)
                  params.putInt("duration", duration)
                  params.putBoolean("isPremium", isPremium)
                  
                  reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("QuranAudioStateChanged", params)
                  
                  Log.d(TAG, "✅ Événement état audio envoyé à React Native")
                }
                else -> {
                  Log.w(TAG, "⚠️ Événement inconnu: $eventName")
                }
              }
            } else {
              Log.w(TAG, "⚠️ Contexte React Native non disponible")
            }
          } catch (e: Exception) {
            Log.e(TAG, "❌ Erreur transmission événement à React Native: ${e.message}")
            e.printStackTrace()
          }
        }
      }
      
      val filter = IntentFilter()
      filter.addAction("com.drogbinho.prayertimesapp2.REACT_NATIVE_EVENT")
      Log.d(TAG, "🔧 IntentFilter configuré avec action: com.drogbinho.prayertimesapp2.REACT_NATIVE_EVENT")
      
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        registerReceiver(audioEventReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        Log.d(TAG, "🔧 BroadcastReceiver enregistré avec RECEIVER_NOT_EXPORTED")
      } else {
        registerReceiver(audioEventReceiver, filter)
        Log.d(TAG, "🔧 BroadcastReceiver enregistré sans flag")
      }
      
      Log.d(TAG, "✅ BroadcastReceiver audio enregistré dans MainActivity")
    } catch (e: Exception) {
      Log.e(TAG, "❌ Erreur enregistrement BroadcastReceiver: ${e.message}")
      e.printStackTrace()
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    
    // Désenregistrer le BroadcastReceiver
    try {
      audioEventReceiver?.let { receiver ->
        unregisterReceiver(receiver)
        Log.d(TAG, "✅ BroadcastReceiver audio désenregistré")
      }
    } catch (e: Exception) {
      Log.e(TAG, "❌ Erreur désenregistrement BroadcastReceiver: ${e.message}")
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
