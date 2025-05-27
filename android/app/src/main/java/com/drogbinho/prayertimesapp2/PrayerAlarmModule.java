package com.drogbinho.prayertimesapp2;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.Context;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

import java.util.Calendar;

public class PrayerAlarmModule extends ReactContextBaseJavaModule {
    public PrayerAlarmModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "PrayerAlarmModule";
    }

    @ReactMethod
    public void setPrayerAlarms(ReadableMap prayerTimes, String adhanSound) {
        Context context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        // Annuler les anciennes alarmes (optionnel : stocke les IDs dans
        // SharedPreferences)
        // ... (À faire pour la robustesse)

        // Pour chaque prière (clé = label, valeur = timestamp UTC ms)
        for (String key : prayerTimes.toHashMap().keySet()) {
            double timeMs = prayerTimes.getDouble(key);
            Intent intent = new Intent(context, AdhanReceiver.class);
            intent.putExtra("ADHAN_SOUND", adhanSound);
            intent.putExtra("PRAYER_LABEL", key);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    key.hashCode(), // Unique pour chaque prière
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            if (Build.VERSION.SDK_INT >= 23) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, (long) timeMs, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, (long) timeMs, pendingIntent);
            }
            Log.d("AlarmSet", "Set alarm for " + key + " at " + timeMs);
        }
    }

    @ReactMethod
    public void openAlarmPermissionSettings() {
        Context context = getReactApplicationContext();
        Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }
}