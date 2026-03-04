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
        let userDefaults = UserDefaults(suiteName: "group.com.drogbinho.myadhan")
       
        var prayerTimes: [String: String] = [:]
        let prayers = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]
       
        for prayer in prayers {
            if let time = userDefaults?.string(forKey: "today_prayer_\(prayer)") {
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
                        Text("\(entry.nextPrayer) à \(entry.nextPrayerTime)")
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
                ForEach(["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"], id: \.self) { prayer in
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
