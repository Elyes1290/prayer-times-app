package com.drogbinho.prayertimesapp2;

// React Native
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

// Java
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// Util
import java.util.Map;
import android.util.Log;

import android.content.Intent;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class AdhanModule extends ReactContextBaseJavaModule {

    public AdhanModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "AdhanModule";
    }

    @ReactMethod
    public void playAdhan() {
        Intent serviceIntent = new Intent(getReactApplicationContext(), AdhanService.class);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            getReactApplicationContext().startForegroundService(serviceIntent);
        } else {
            getReactApplicationContext().startService(serviceIntent);
        }
    }

    @ReactMethod
    public void stopAdhan(Promise promise) {
        try {
            Intent intent = new Intent(getReactApplicationContext(), AdhanService.class);
            intent.setAction(AdhanService.ACTION_STOP);
            getReactApplicationContext().startService(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("STOP_ERROR", e);
        }
    }

    @ReactMethod
    public void scheduleAdhanAlarms(ReadableMap prayerTimes, String adhanSound) {
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        for (Map.Entry<String, Object> entry : prayerTimes.toHashMap().entrySet()) {
            String label = entry.getKey();
            Double millis = ((Number) entry.getValue()).doubleValue();
            long triggerAtMillis = millis.longValue();

            Log.d("AdhanModule", "Programmation alarme pour " + label + " à " + triggerAtMillis + " ("
                    + new java.util.Date(triggerAtMillis).toString() + ") avec son: " + adhanSound);

            Intent intent = new Intent(context, AdhanReceiver.class);
            intent.putExtra("ADHAN_SOUND", adhanSound);
            intent.putExtra("PRAYER_LABEL", label);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    label.hashCode(), // unique pour chaque prière
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMillis,
                    pendingIntent);
        }
    }

    @ReactMethod
    public void cancelAllAdhanAlarms() {
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        String[] prayers = { "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha", "Test" };
        for (String label : prayers) {
            Intent intent = new Intent(context, AdhanReceiver.class);
            intent.putExtra("ADHAN_SOUND", "adhamalsharqawe"); // <- valeur par défaut, à adapter si besoin
            intent.putExtra("PRAYER_LABEL", label);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    label.hashCode(),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            alarmManager.cancel(pendingIntent);
            Log.d("AdhanModule", "Annulation alarme pour " + label);
        }
        Log.d("AdhanModule", "🚫 Toutes les alarmes adhan ont été annulées !");
    }

}
