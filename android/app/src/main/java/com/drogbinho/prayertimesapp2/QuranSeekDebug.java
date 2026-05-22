package com.drogbinho.prayertimesapp2;

import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Logs seek audio — toujours actifs (Log.i), y compris en build release.
 * Filtrer avec: adb logcat -s QuranSeek
 */
public final class QuranSeekDebug {

    public static final String TAG = "QuranSeek";
    private static final String BROADCAST_ACTION = "com.drogbinho.prayertimesapp2.REACT_NATIVE_EVENT";

    private QuranSeekDebug() {
    }

    public static void log(Context context, String stage, String details) {
        String line = stage + " | " + details;
        Log.i(TAG, line);

        if (context == null) {
            return;
        }
        try {
            Intent intent = new Intent(BROADCAST_ACTION);
            intent.setPackage(context.getPackageName());
            intent.putExtra("eventName", "SeekDebug");
            intent.putExtra("message", line);
            intent.putExtra("details", details);
            context.sendBroadcast(intent);
        } catch (Exception e) {
            Log.w(TAG, "broadcast SeekDebug failed: " + e.getMessage());
        }
    }
}
