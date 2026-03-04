import WidgetKit
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
        print("🔍 [Widget] createEntry() appelé")
        
        let appGroupId = "group.com.drogbinho.myadhan"
        let userDefaults = UserDefaults(suiteName: appGroupId)
        
        if userDefaults == nil {
            print("❌ [Widget] ERREUR: Impossible d'accéder à App Group '\(appGroupId)'")
        } else {
            print("✅ [Widget] App Group accessible")
        }
       
        var prayerTimes: [String: String] = [:]
        let prayers = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]
       
        print("📖 [Widget] Lecture des horaires depuis UserDefaults...")
        for prayer in prayers {
            if let time = userDefaults?.string(forKey: "today_prayer_\(prayer)") {
                prayerTimes[prayer] = time
                print("   ✅ \(prayer): \(time)")
            } else {
                print("   ❌ \(prayer): NON TROUVÉ")
            }
        }
        
        if prayerTimes.isEmpty {
            print("⚠️ [Widget] AUCUNE DONNÉE trouvée dans UserDefaults!")
        } else {
            print("✅ [Widget] \(prayerTimes.count) horaires trouvés")
        }
       
        let (current, next, nextTime) = calculateCurrentAndNextPrayer(prayerTimes: prayerTimes)
        
        print("🎯 [Widget] Prière actuelle: \(current), Prochaine: \(next) à \(nextTime)")
       
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
    @Environment(\.widgetFamily) var family
   
    var body: some View {
        ZStack {
            // 🖼️ Image de fond selon le moment de la journée
            if let backgroundImage = getBackgroundImage() {
                // 🔧 CORRECTIF : Charger l'image depuis le bundle avec UIImage
                if let uiImage = UIImage(named: backgroundImage) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .clipped()
                    
                    // Overlay sombre pour lisibilité du texte
                    Color.black.opacity(0.25)
                } else {
                    // Fallback si l'image ne charge pas
                    LinearGradient(
                        gradient: Gradient(colors: backgroundColors()),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                }
            } else {
                // Fallback : Dégradé si l'image n'existe pas
                LinearGradient(
                    gradient: Gradient(colors: backgroundColors()),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
           
            VStack(alignment: .leading, spacing: family == .systemSmall ? 4 : 8) {
                // 🕌 Titre
                HStack {
                    Image(systemName: "clock")
                        .foregroundColor(.white)
                        .font(family == .systemSmall ? .caption : .body)
                    Text("Horaires de Prière")
                        .font(family == .systemSmall ? .caption : .headline)
                        .foregroundColor(.white)
                }
                .padding(.bottom, family == .systemSmall ? 2 : 4)
               
                // ⏰ Prochaine prière (affichée en premier pour tous les widgets)
                if !entry.nextPrayer.isEmpty && !entry.nextPrayerTime.isEmpty {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Prochaine prière:")
                            .font(family == .systemSmall ? .caption2 : .caption)
                            .foregroundColor(.white.opacity(0.8))
                        HStack {
                            Text(prayerEmoji(entry.nextPrayer))
                                .font(family == .systemSmall ? .body : .title3)
                            Text(entry.nextPrayer)
                                .font(family == .systemSmall ? .caption : .subheadline)
                                .bold()
                                .foregroundColor(.white)
                            Spacer()
                            Text(entry.nextPrayerTime)
                                .font(family == .systemSmall ? .callout : .title3)
                                .bold()
                                .foregroundColor(.white)
                        }
                    }
                    .padding(family == .systemSmall ? 6 : 8)
                    .background(Color.white.opacity(0.25))
                    .cornerRadius(8)
                }
               
                if family != .systemSmall {
                    Divider()
                        .background(Color.white.opacity(0.5))
                }
               
                // 📋 Liste des horaires (toujours affichée)
                VStack(alignment: .leading, spacing: family == .systemSmall ? 2 : 4) {
                    ForEach(["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"], id: \.self) { prayer in
                        if let time = entry.prayerTimes[prayer], !time.isEmpty {
                            HStack(spacing: family == .systemSmall ? 4 : 8) {
                                Text(prayerEmoji(prayer))
                                    .font(family == .systemSmall ? .caption2 : .caption)
                                Text(prayerName(prayer))
                                    .font(family == .systemSmall ? .caption2 : .caption)
                                    .foregroundColor(entry.nextPrayer == prayer ? .yellow : .white.opacity(0.9))
                                Spacer()
                                Text(time)
                                    .font(family == .systemSmall ? .caption : .subheadline)
                                    .bold()
                                    .foregroundColor(.white)
                            }
                        }
                    }
                }
            }
            .padding(family == .systemSmall ? 8 : 12)
        }
    }
   
    // 🖼️ Image de fond selon le moment de la journée
    private func getBackgroundImage() -> String? {
        // Utiliser la prochaine prière pour déterminer l'image de fond
        let prayer = entry.nextPrayer.isEmpty ? getCurrentPrayerFromTime() : entry.nextPrayer
        
        switch prayer {
        case "Fajr":
            return "sky_fajr"
        case "Dhuhr":
            return "sky_dhuhr"
        case "Asr":
            return "sky_asr"
        case "Maghrib":
            return "sky_maghrib"
        case "Isha":
            return "sky_isha"
        default:
            return "sky_isha" // Défaut = nuit
        }
    }
    
    // 🕐 Déterminer la prière actuelle selon l'heure (fallback)
    private func getCurrentPrayerFromTime() -> String {
        let hour = Calendar.current.component(.hour, from: entry.date)
        
        switch hour {
        case 0..<5: return "Isha"
        case 5..<12: return "Fajr"
        case 12..<15: return "Dhuhr"
        case 15..<18: return "Asr"
        case 18..<20: return "Maghrib"
        default: return "Isha"
        }
    }
    
    // 🎨 Couleurs de fond selon l'heure (FALLBACK si images manquantes)
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

// 🔒 LOCK SCREEN WIDGETS (iOS 16+)

// 🔵 Widget Circular (Rond) - Prochaine prière
@available(iOS 16.0, *)
struct PrayerTimesCircularView: View {
    var entry: PrayerTimesProvider.Entry
    
    var body: some View {
        // 🎯 Layout simplifié pour Lock Screen
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) {
                Text(entry.nextPrayerTime.isEmpty ? "..." : entry.nextPrayerTime)
                    .font(.system(.title3, design: .rounded))
                    .fontWeight(.bold)
                    .monospacedDigit()
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
            }
        }
    }
}

// 📏 Widget Rectangular - 3 prochaines prières
@available(iOS 16.0, *)
struct PrayerTimesRectangularView: View {
    var entry: PrayerTimesProvider.Entry
    
    var body: some View {
        // 🎯 Layout optimisé pour Lock Screen Rectangular
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 2) {
                // Prochaine prière uniquement
                Text(entry.nextPrayer.isEmpty ? "Prière" : entry.nextPrayer)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .lineLimit(1)
                Text(entry.nextPrayerTime.isEmpty ? "--:--" : entry.nextPrayerTime)
                    .font(.body)
                    .fontWeight(.bold)
                    .monospacedDigit()
            }
            Spacer(minLength: 8)
            Text(prayerEmoji(entry.nextPrayer))
                .font(.title2)
        }
        .privacySensitive()
    }
    
    private func prayerEmoji(_ prayer: String) -> String {
        switch prayer {
        case "Fajr": return "🌅"
        case "Dhuhr": return "☀️"
        case "Asr": return "🌤️"
        case "Maghrib": return "🌆"
        case "Isha": return "🌙"
        default: return "🕌"
        }
    }
}

// 📝 Widget Inline - Texte au-dessus de l'heure
@available(iOS 16.0, *)
struct PrayerTimesInlineView: View {
    var entry: PrayerTimesProvider.Entry
    
    var body: some View {
        // 🎯 Format ultra-compact pour Inline
        if !entry.nextPrayer.isEmpty && !entry.nextPrayerTime.isEmpty {
            Text("\(prayerEmoji(entry.nextPrayer)) \(entry.nextPrayer) \(entry.nextPrayerTime)")
                .privacySensitive()
        } else {
            Text("🕌 Prières")
        }
    }
    
    private func prayerEmoji(_ prayer: String) -> String {
        switch prayer {
        case "Fajr": return "🌅"
        case "Dhuhr": return "☀️"
        case "Asr": return "🌤️"
        case "Maghrib": return "🌆"
        case "Isha": return "🌙"
        default: return "🕌"
        }
    }
}

// 🔄 Vue principale qui dispatche selon le type de widget
struct PrayerTimesWidgetEntryView: View {
    var entry: PrayerTimesProvider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        if #available(iOS 16.0, *) {
            switch family {
            case .accessoryCircular:
                PrayerTimesCircularView(entry: entry)
            case .accessoryRectangular:
                PrayerTimesRectangularView(entry: entry)
            case .accessoryInline:
                PrayerTimesInlineView(entry: entry)
            default:
                PrayerTimesWidgetView(entry: entry)
            }
        } else {
            PrayerTimesWidgetView(entry: entry)
        }
    }
}

// 🔧 CONFIGURATION DU WIDGET
@main
struct PrayerTimesWidget: Widget {
    let kind: String = "PrayerTimesWidget"
   
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PrayerTimesProvider()) { entry in
            PrayerTimesWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Horaires de Prière")
        .description("Affiche les horaires de prière du jour")
        .supportedFamilies(supportedFamilies)
    }
    
    private var supportedFamilies: [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [
                .systemSmall,
                .systemMedium,
                .systemLarge,
                .accessoryCircular,
                .accessoryRectangular,
                .accessoryInline
            ]
        } else {
            return [
                .systemSmall,
                .systemMedium,
                .systemLarge
            ]
        }
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
