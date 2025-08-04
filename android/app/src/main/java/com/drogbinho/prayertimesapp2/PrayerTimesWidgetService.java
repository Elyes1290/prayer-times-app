package com.drogbinho.prayertimesapp2;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import android.util.Log;

import java.text.SimpleDateFormat;
import java.util.*;

import static com.drogbinho.prayertimesapp2.ConditionalLogger.*;

public class PrayerTimesWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new WidgetRemoteViewsFactory(this.getApplicationContext());
    }
}

class WidgetRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {
    private static final String TAG = "WidgetFactory";
    private Context context;
    private List<WidgetItem> widgetItems;

    public WidgetRemoteViewsFactory(Context context) {
        this.context = context;
        this.widgetItems = new ArrayList<>();
    }

    @Override
    public void onCreate() {
        // Initialisation
    }

    @Override
    public void onDataSetChanged() {
        // Préparer les données pour l'affichage
        widgetItems.clear();

        widgetDebugLog(TAG, "🔄 onDataSetChanged - Préparation des données widget");

        // TITRE avec date (mise à jour en temps réel)
        Calendar calendar = Calendar.getInstance();
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd MMMM yyyy",
                getLocaleForLanguage(PrayerTimesWidget.getCurrentLanguage(context)));
        String todayDate = dateFormat.format(calendar.getTime());

        String titleTranslation = PrayerTimesWidget.getTranslation(context, "widget_title");
        String fullTitle = titleTranslation + "\n📅 " + todayDate;

        widgetDebugLog(TAG, "📅 Widget mis à jour pour la date: " + todayDate);
        widgetItems.add(new WidgetItem(fullTitle, "", false, false, true, false));

        // LIGNE VIDE pour l'espacement
        widgetItems.add(new WidgetItem("", "", false, false, true, false));

        // SECTION PROCHAINE PRIÈRE
        Map<String, String> prayerTimes = PrayerTimesWidget.getAllPrayerTimes(context);
        String nextPrayerName = PrayerTimesWidget.getNextPrayerName(context);
        String nextPrayerLabel = PrayerTimesWidget.getTranslation(context, "next_prayer");

        if (!prayerTimes.isEmpty()) {
            String nextPrayerTime = prayerTimes.get(nextPrayerName);
            String nextPrayerTranslated = PrayerTimesWidget.getTranslation(context, nextPrayerName.toLowerCase());

            // Emoji pour chaque prière
            String emoji = getEmojiForPrayer(nextPrayerName);

            // Format weather widget: Left side (next prayer) + Right side (all prayers)
            String leftPart = nextPrayerLabel + "\n" + emoji + " " + nextPrayerTranslated + "\n"
                    + (nextPrayerTime != null ? nextPrayerTime : "--:--");

            // Right side: All 6 prayers avec séparateurs
            StringBuilder rightPart = new StringBuilder();
            String[] prayerOrder = { "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha" };

            for (int i = 0; i < prayerOrder.length; i++) {
                String prayer = prayerOrder[i];
                String translatedName = PrayerTimesWidget.getTranslation(context, prayer.toLowerCase());
                String time = prayerTimes.get(prayer);

                // Indicator for next prayer
                String indicator = prayer.equals(nextPrayerName) ? "🟢 " : "";

                rightPart.append(String.format("%-10s %s%s",
                        translatedName + ":", indicator, time != null ? time : "--:--"));

                // Ajouter séparateur horizontal entre les prières (sauf après la dernière)
                if (i < prayerOrder.length - 1) {
                    rightPart.append("\n");
                    rightPart.append("┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄");
                    rightPart.append("\n");
                }
            }

            widgetItems.add(new WidgetItem(leftPart, rightPart.toString(), true, false, false, true));
        }

        // LIGNE VIDE pour séparation
        widgetItems.add(new WidgetItem("", "", false, false, true, false));

        // TITRE DUA avec bouton actualiser (cliquable)
        String duaTitle = PrayerTimesWidget.getTranslation(context, "daily_dhikr_title");
        String refreshButton = " 🔄";
        WidgetItem duaTitleItem = new WidgetItem(duaTitle + refreshButton, "", false, false, true, false);
        duaTitleItem.isRefreshButton = true; // Marquer comme bouton actualiser
        widgetItems.add(duaTitleItem);

        // LIGNE VIDE
        widgetItems.add(new WidgetItem("", "", false, false, true, false));

        // CONTENU DHIKR
        String dhikrContent = PrayerTimesWidget.getDailyDhikr(context);
        if (!dhikrContent.isEmpty()) {
            // Séparer par lignes et sous-titres
            String[] dhikrLines = dhikrContent.split("\n");

            for (int i = 0; i < dhikrLines.length; i++) {
                String line = dhikrLines[i].trim();

                if (!line.isEmpty()) {
                    // Détecter les sous-titres (lignes courtes en majuscules ou avec des mots clés)
                    boolean isSubtitle = isSubtitleLine(line);

                    if (isSubtitle) {
                        // Ajouter espacement avant les sous-titres (sauf le premier)
                        if (i > 0) {
                            widgetItems.add(new WidgetItem("", "", false, false, true, false));
                        }
                        widgetItems.add(new WidgetItem(line, "", false, false, true, false));
                        widgetItems.add(new WidgetItem("", "", false, false, true, false));
                    } else {
                        widgetItems.add(new WidgetItem(line, "", false, false, true, false));
                    }
                } else {
                    // Ligne vide - ajouter un espacement
                    widgetItems.add(new WidgetItem("", "", false, false, true, false));
                }
            }
        }

        widgetDebugLog(TAG, "✅ Données préparées: " + widgetItems.size() + " éléments");
    }

    private String getEmojiForPrayer(String prayer) {
        switch (prayer) {
            case "Fajr":
                return "🌅";
            case "Sunrise":
                return "🌞";
            case "Dhuhr":
                return "☀️";
            case "Asr":
                return "🌤️";
            case "Maghrib":
                return "🌇";
            case "Isha":
                return "🌙";
            default:
                return "🕌";
        }
    }

    private Locale getLocaleForLanguage(String language) {
        switch (language) {
            case "fr":
                return Locale.FRENCH;
            case "it":
                return Locale.ITALIAN;
            case "de":
                return Locale.GERMAN;
            case "es":
                return Locale.forLanguageTag("es");
            case "pt":
                return Locale.forLanguageTag("pt");
            case "ru":
                return Locale.forLanguageTag("ru");
            case "tr":
                return Locale.forLanguageTag("tr");
            case "nl":
                return Locale.forLanguageTag("nl");
            case "ar":
                return Locale.forLanguageTag("ar");
            case "fa":
                return Locale.forLanguageTag("fa");
            case "ur":
                return Locale.forLanguageTag("ur");
            case "bn":
                return Locale.forLanguageTag("bn");
            case "en":
            default:
                return Locale.ENGLISH;
        }
    }

    private boolean isSubtitleLine(String line) {
        // Critères pour détecter un sous-titre
        return line.length() < 50 &&
                (line.toUpperCase().equals(line) ||
                        line.contains("Supplication") ||
                        line.contains("Prayer") ||
                        line.contains("Dua") ||
                        line.contains("Morning") ||
                        line.contains("Evening") ||
                        line.contains("After"));
    }

    @Override
    public void onDestroy() {
        widgetItems.clear();
    }

    @Override
    public int getCount() {
        return widgetItems.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position >= widgetItems.size()) {
            return null;
        }

        WidgetItem item = widgetItems.get(position);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_list_item);

        if (item.isPrayerTime) {
            // Prayer times - two column layout
            views.setViewVisibility(R.id.widget_item_left, android.view.View.VISIBLE);
            views.setViewVisibility(R.id.widget_item_right, android.view.View.VISIBLE);
            views.setViewVisibility(R.id.widget_item_full, android.view.View.GONE);

            views.setTextViewText(R.id.widget_item_left, item.leftText);
            views.setTextViewText(R.id.widget_item_right, item.rightText);

            // Couleur pour la prochaine prière (texte visible sur fond transparent)
            if (item.isHighlighted) {
                views.setTextColor(R.id.widget_item_left, Color.WHITE); // Blanc élégant pour la prochaine prière
            } else {
                views.setTextColor(R.id.widget_item_left, Color.WHITE); // Blanc pour les autres
            }
            views.setTextColor(R.id.widget_item_right, Color.WHITE);

        } else {
            // Full width content (titles, dhikr)
            views.setViewVisibility(R.id.widget_item_left, android.view.View.GONE);
            views.setViewVisibility(R.id.widget_item_right, android.view.View.GONE);
            views.setViewVisibility(R.id.widget_item_full, android.view.View.VISIBLE);

            views.setTextViewText(R.id.widget_item_full, item.leftText);
            views.setTextColor(R.id.widget_item_full, Color.WHITE);

            // Si c'est le bouton actualiser, ajouter l'action de clic
            if (item.isRefreshButton) {
                Intent refreshIntent = new Intent();
                refreshIntent.setAction("com.drogbinho.prayertimesapp2.REFRESH_DUA");
                refreshIntent.putExtra("force_random", true);
                views.setOnClickFillInIntent(R.id.widget_item_full, refreshIntent);
            }
        }

        return views;
    }

    @Override
    public RemoteViews getLoadingView() {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_list_item);
        views.setViewVisibility(R.id.widget_item_left, android.view.View.GONE);
        views.setViewVisibility(R.id.widget_item_right, android.view.View.GONE);
        views.setViewVisibility(R.id.widget_item_full, android.view.View.VISIBLE);
        views.setTextViewText(R.id.widget_item_full, "Caricamento...");
        return views;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }
}

class WidgetItem {
    public String leftText;
    public String rightText;
    public boolean isHighlighted;
    public boolean isRightHighlighted;
    public boolean isFullWidth;
    public boolean isPrayerTime;
    public boolean isRefreshButton = false; // Nouveau champ pour identifier le bouton actualiser

    public WidgetItem(String leftText, String rightText, boolean isHighlighted, boolean isRightHighlighted,
            boolean isFullWidth, boolean isPrayerTime) {
        this.leftText = leftText;
        this.rightText = rightText;
        this.isHighlighted = isHighlighted;
        this.isRightHighlighted = isRightHighlighted;
        this.isFullWidth = isFullWidth;
        this.isPrayerTime = isPrayerTime;
    }
}
