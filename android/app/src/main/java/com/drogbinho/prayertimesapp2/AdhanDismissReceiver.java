package com.drogbinho.prayertimesapp2;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import static com.drogbinho.prayertimesapp2.ConditionalLogger.*;

public class AdhanDismissReceiver extends BroadcastReceiver {

    /** Fermer la notification « Adhan terminé » sans toucher au service / à l'app. */
    public static final String ACTION_DISMISS_COMPLETED_ADHAN =
            "com.drogbinho.prayertimesapp2.ACTION_DISMISS_COMPLETED_ADHAN";

    /** Balayage ou fermeture pendant la lecture de l'adhan. */
    public static final String ACTION_ADHAN_DISMISSED =
            "com.drogbinho.prayertimesapp2.ACTION_ADHAN_DISMISSED";

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            if (intent == null) {
                return;
            }

            String action = intent.getAction();
            String prayerLabel = intent.getStringExtra("PRAYER_LABEL");

            if (ACTION_DISMISS_COMPLETED_ADHAN.equals(action)) {
                dismissCompletedAdhanNotification(context, intent, prayerLabel);
                return;
            }

            if (ACTION_ADHAN_DISMISSED.equals(action)) {
                debugLog("AdhanDismissReceiver",
                        "Notification adhan en cours fermée pour " + prayerLabel);
                stopAdhanService(context, prayerLabel);
                return;
            }

            // Rétrocompat : ancien identifiant court ou deleteIntent pendant la lecture
            if ("DISMISS_COMPLETED_ADHAN".equals(action)) {
                dismissCompletedAdhanNotification(context, intent, prayerLabel);
                return;
            }

            debugLog("AdhanDismissReceiver",
                    "Notification balayée pendant la lecture (action=" + action + ")");
            stopAdhanService(context, prayerLabel);
        } catch (Exception e) {
            errorLog("AdhanDismissReceiver", "Erreur dans onReceive : " + e.getMessage(), e);
        }
    }

    private void dismissCompletedAdhanNotification(Context context, Intent intent, String prayerLabel) {
        int notificationId = intent.getIntExtra("NOTIFICATION_ID", -1);
        if (notificationId == -1 && prayerLabel != null) {
            notificationId = prayerLabel.hashCode() + 1000;
        }

        NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
        if (notificationManager != null && notificationId != -1) {
            notificationManager.cancel(notificationId);
            debugLog("AdhanDismissReceiver",
                    "Notification « adhan terminé » fermée (ID=" + notificationId + ")");
        }
    }

    private void stopAdhanService(Context context, String prayerLabel) {
        Intent stopIntent = new Intent(context, AdhanService.class);
        stopIntent.setAction(AdhanService.ACTION_STOP);
        if (prayerLabel != null) {
            stopIntent.putExtra("PRAYER_LABEL", prayerLabel);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(stopIntent);
        } else {
            context.startService(stopIntent);
        }
    }
}
