const {
  withDangerousMod,
  withInfoPlist,
  withEntitlementsPlist,
  withXcodeProject,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Plugin Expo pour créer le Widget Extension iOS
 * Ajoute un widget pour afficher les horaires de prière
 */
const withPrayerTimesWidget = (config) => {
  // 1. Ajouter l'App Group pour partager les données entre l'app et le widget
  config = withEntitlementsPlist(config, (config) => {
    const appGroupId = `group.${
      config.ios?.bundleIdentifier || "com.drogbinho.myadhan"
    }`;

    if (!config.modResults["com.apple.security.application-groups"]) {
      config.modResults["com.apple.security.application-groups"] = [];
    }

    if (
      !config.modResults["com.apple.security.application-groups"].includes(
        appGroupId
      )
    ) {
      config.modResults["com.apple.security.application-groups"].push(
        appGroupId
      );
    }

    console.log(`✅ [withPrayerTimesWidget] App Group ajouté: ${appGroupId}`);
    return config;
  });

  // 2. Créer les fichiers du Widget Extension
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = path.join(projectRoot, "ios");

      // Trouver le nom du projet iOS
      const xcodeProjects = fs
        .readdirSync(iosRoot)
        .filter((file) => file.endsWith(".xcodeproj"));

      if (xcodeProjects.length === 0) {
        console.log("⚠️ [withPrayerTimesWidget] Aucun projet Xcode trouvé");
        return config;
      }

      const projectName = xcodeProjects[0].replace(".xcodeproj", "");
      const widgetExtensionDir = path.join(iosRoot, "PrayerTimesWidget");

      console.log("🕌 [withPrayerTimesWidget] Création du widget iOS...");
      console.log(`📂 Widget directory: ${widgetExtensionDir}`);

      // Créer le dossier du widget
      if (!fs.existsSync(widgetExtensionDir)) {
        fs.mkdirSync(widgetExtensionDir, { recursive: true });
      }

      // Créer le fichier principal du widget
      const widgetSwiftContent = `import WidgetKit
import SwiftUI

// 🕌 MODÈLE DE DONNÉES
struct PrayerTimesEntry: TimelineEntry {
    let date: Date
    let prayerTimes: [String: String]
    let currentPrayer: String
    let nextPrayer: String
    let nextPrayerTime: String
}

// 📊 TIMELINE PROVIDER
struct PrayerTimesProvider: TimelineProvider {
    typealias Entry = PrayerTimesEntry
    
    func placeholder(in context: Context) -> PrayerTimesEntry {
        PrayerTimesEntry(
            date: Date(),
            prayerTimes: [:],
            currentPrayer: "Fajr",
            nextPrayer: "Dhuhr",
            nextPrayerTime: "12:00"
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (PrayerTimesEntry) -> Void) {
        let entry = createEntry()
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerTimesEntry>) -> Void) {
        let entry = createEntry()
        
        // Mettre à jour toutes les 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        
        completion(timeline)
    }
    
    // 📖 LIRE LES HORAIRES DEPUIS APP GROUP
    private func createEntry() -> PrayerTimesEntry {
        let userDefaults = UserDefaults(suiteName: "group.com.drogbinho.myadhan")
        
        var prayerTimes: [String: String] = [:]
        let prayers = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]
        
        for prayer in prayers {
            if let time = userDefaults?.string(forKey: "today_prayer_\\(prayer)") {
                prayerTimes[prayer] = time
            }
        }
        
        let (current, next, nextTime) = calculateCurrentAndNextPrayer(prayerTimes: prayerTimes)
        
        return PrayerTimesEntry(
            date: Date(),
            prayerTimes: prayerTimes,
            currentPrayer: current,
            nextPrayer: next,
            nextPrayerTime: nextTime
        )
    }
    
    // 🔍 CALCULER LA PRIÈRE ACTUELLE ET SUIVANTE
    private func calculateCurrentAndNextPrayer(prayerTimes: [String: String]) -> (String, String, String) {
        let now = Date()
        let calendar = Calendar.current
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        
        let prayerOrder = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
        var currentPrayer = "Isha"
        var nextPrayer = "Fajr"
        var nextPrayerTime = "00:00"
        
        for i in 0..<prayerOrder.count {
            let prayer = prayerOrder[i]
            guard let timeStr = prayerTimes[prayer],
                  let prayerTime = formatter.date(from: timeStr) else {
                continue
            }
            
            // Ajuster la date pour aujourd'hui
            let prayerDate = calendar.date(
                bySettingHour: calendar.component(.hour, from: prayerTime),
                minute: calendar.component(.minute, from: prayerTime),
                second: 0,
                of: now
            )!
            
            if now < prayerDate {
                nextPrayer = prayer
                nextPrayerTime = timeStr
                currentPrayer = i > 0 ? prayerOrder[i - 1] : "Isha"
                break
            }
        }
        
        return (currentPrayer, nextPrayer, nextPrayerTime)
    }
}

// 🎨 VUE DU WIDGET
struct PrayerTimesWidgetView: View {
    var entry: PrayerTimesProvider.Entry
    
    var body: some View {
        ZStack {
            // Fond dégradé selon l'heure
            LinearGradient(
                gradient: Gradient(colors: backgroundColors()),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(alignment: .leading, spacing: 8) {
                // 🕌 Titre
                HStack {
                    Image(systemName: "clock")
                        .foregroundColor(.white)
                    Text("Horaires de Prière")
                        .font(.headline)
                        .foregroundColor(.white)
                }
                .padding(.bottom, 4)
                
                // ⏰ Prochaine prière
                if !entry.nextPrayer.isEmpty {
                    HStack {
                        Text("Prochaine:")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.9))
                        Spacer()
                        Text("\\(entry.nextPrayer) à \\(entry.nextPrayerTime)")
                            .font(.subheadline)
                            .bold()
                            .foregroundColor(.white)
                    }
                    .padding(8)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(8)
                }
                
                Divider()
                    .background(Color.white.opacity(0.5))
                
                // 📋 Liste des horaires
                ForEach(["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"], id: \\.self) { prayer in
                    if let time = entry.prayerTimes[prayer] {
                        HStack {
                            Text(prayerEmoji(prayer))
                            Text(prayerName(prayer))
                                .font(.subheadline)
                                .foregroundColor(entry.currentPrayer == prayer ? .yellow : .white)
                            Spacer()
                            Text(time)
                                .font(.subheadline)
                                .bold()
                                .foregroundColor(.white)
                        }
                    }
                }
            }
            .padding()
        }
    }
    
    // 🎨 Couleurs de fond selon l'heure
    private func backgroundColors() -> [Color] {
        let hour = Calendar.current.component(.hour, from: entry.date)
        
        switch hour {
        case 0..<5: // Nuit
            return [Color(red: 0.1, green: 0.1, blue: 0.3), Color(red: 0.2, green: 0.1, blue: 0.4)]
        case 5..<7: // Fajr/Aube
            return [Color(red: 0.4, green: 0.5, blue: 0.8), Color(red: 0.6, green: 0.4, blue: 0.7)]
        case 7..<12: // Matin
            return [Color(red: 0.3, green: 0.6, blue: 0.9), Color(red: 0.5, green: 0.7, blue: 1.0)]
        case 12..<15: // Midi
            return [Color(red: 0.9, green: 0.7, blue: 0.3), Color(red: 1.0, green: 0.6, blue: 0.2)]
        case 15..<18: // Après-midi
            return [Color(red: 0.9, green: 0.6, blue: 0.3), Color(red: 0.8, green: 0.5, blue: 0.4)]
        case 18..<20: // Maghrib/Coucher
            return [Color(red: 0.8, green: 0.4, blue: 0.3), Color(red: 0.6, green: 0.3, blue: 0.5)]
        default: // Soirée
            return [Color(red: 0.2, green: 0.2, blue: 0.4), Color(red: 0.3, green: 0.2, blue: 0.5)]
        }
    }
    
    // 🕌 Emoji par prière
    private func prayerEmoji(_ prayer: String) -> String {
        switch prayer {
        case "Fajr": return "🌅"
        case "Sunrise": return "🌄"
        case "Dhuhr": return "☀️"
        case "Asr": return "🌤️"
        case "Maghrib": return "🌆"
        case "Isha": return "🌙"
        default: return "🕌"
        }
    }
    
    // 📖 Nom localisé
    private func prayerName(_ prayer: String) -> String {
        switch prayer {
        case "Sunrise": return "Lever du Soleil"
        default: return prayer
        }
    }
}

// 🔧 CONFIGURATION DU WIDGET
@main
struct PrayerTimesWidget: Widget {
    let kind: String = "PrayerTimesWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PrayerTimesProvider()) { entry in
            PrayerTimesWidgetView(entry: entry)
        }
        .configurationDisplayName("Horaires de Prière")
        .description("Affiche les horaires de prière du jour")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// 🔍 PREVIEW
struct PrayerTimesWidget_Previews: PreviewProvider {
    static var previews: some View {
        let entry = PrayerTimesEntry(
            date: Date(),
            prayerTimes: [
                "Fajr": "05:30",
                "Sunrise": "07:00",
                "Dhuhr": "12:45",
                "Asr": "15:30",
                "Maghrib": "18:15",
                "Isha": "19:45"
            ],
            currentPrayer: "Dhuhr",
            nextPrayer: "Asr",
            nextPrayerTime: "15:30"
        )
        
        PrayerTimesWidgetView(entry: entry)
            .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
}
`;

      fs.writeFileSync(
        path.join(widgetExtensionDir, "PrayerTimesWidget.swift"),
        widgetSwiftContent
      );

      // Créer Info.plist pour le widget
      const widgetInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>Prayer Times</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
</dict>
</plist>`;

      fs.writeFileSync(
        path.join(widgetExtensionDir, "Info.plist"),
        widgetInfoPlist
      );

      console.log("✅ [withPrayerTimesWidget] Fichiers du widget créés");

      return config;
    },
  ]);

  return config;
};

module.exports = withPrayerTimesWidget;
