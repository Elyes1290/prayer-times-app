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
        
        // Lire aussi les horaires de demain
        var tomorrowPrayerTimes: [String: String] = [:]
        for prayer in prayers {
            if let time = userDefaults?.string(forKey: "tomorrow_prayer_\(prayer)") {
                tomorrowPrayerTimes[prayer] = time
                print("   🔮 Demain \(prayer): \(time)")
            }
        }
        
        if prayerTimes.isEmpty {
            print("⚠️ [Widget] AUCUNE DONNÉE trouvée dans UserDefaults!")
        } else {
            print("✅ [Widget] \(prayerTimes.count) horaires trouvés")
        }
       
        let (current, next, nextTime, displayTimes) = calculateCurrentAndNextPrayer(
            prayerTimes: prayerTimes,
            tomorrowPrayerTimes: tomorrowPrayerTimes
        )
        
        print("🎯 [Widget] Prière actuelle: \(current), Prochaine: \(next) à \(nextTime)")
       
        return PrayerTimesEntry(
            date: Date(),
            prayerTimes: displayTimes,
            currentPrayer: current,
            nextPrayer: next,
            nextPrayerTime: nextTime
        )
    }
   
    // 🔍 CALCULER LA PRIÈRE ACTUELLE ET SUIVANTE
    private func calculateCurrentAndNextPrayer(prayerTimes: [String: String], tomorrowPrayerTimes: [String: String]) -> (String, String, String, [String: String]) {
        let now = Date()
        let calendar = Calendar.current
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
       
        let prayerOrder = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
        var currentPrayer = "Isha"
        var nextPrayer = "Fajr"
        var nextPrayerTime = "00:00"
        var displayTimes = prayerTimes
        var foundNextPrayer = false
       
        // Parcourir les prières d'aujourd'hui
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
                foundNextPrayer = true
                break
            }
        }
       
        // Si aucune prière future trouvée aujourd'hui (après Isha)
        if !foundNextPrayer && !tomorrowPrayerTimes.isEmpty {
            print("🌙 [Widget] Après Isha -> Basculement vers les horaires de demain")
            currentPrayer = "Isha"
            nextPrayer = "Fajr"
            
            // Utiliser le Fajr de demain
            if let tomorrowFajr = tomorrowPrayerTimes["Fajr"] {
                nextPrayerTime = tomorrowFajr
                print("   ✅ Fajr de demain: \(tomorrowFajr)")
            }
            
            displayTimes = tomorrowPrayerTimes
            print("   📅 Affichage des horaires de demain dans le widget")
        }
       
        return (currentPrayer, nextPrayer, nextPrayerTime, displayTimes)
    }
}

// 🌍 TRADUCTIONS
struct WidgetTranslations {
    static func getText(_ key: String, lang: String) -> String {
        let translations: [String: [String: String]] = [
            "title": [
                "fr": "Horaires de Prière",
                "en": "Prayer Times",
                "ar": "مواقيت الصلاة",
                "es": "Horarios de Oración",
                "de": "Gebetszeiten",
                "it": "Orari di Preghiera",
                "tr": "Namaz Vakitleri",
                "pt": "Horários de Oração",
                "nl": "Gebedstijden",
                "ru": "Время намаза",
                "bn": "নামাজের সময়",
                "fa": "اوقات نماز",
                "ur": "نماز کے اوقات"
            ],
            "next_prayer": [
                "fr": "Prochaine prière:",
                "en": "Next prayer:",
                "ar": "الصلاة القادمة:",
                "es": "Próxima oración:",
                "de": "Nächstes Gebet:",
                "it": "Prossima preghiera:",
                "tr": "Sonraki namaz:",
                "pt": "Próxima oração:",
                "nl": "Volgend gebed:",
                "ru": "Следующий намаз:",
                "bn": "পরবর্তী নামাজ:",
                "fa": "نماز بعدی:",
                "ur": "اگلی نماز:"
            ],
            "sunrise": [
                "fr": "Lever du Soleil",
                "en": "Sunrise",
                "ar": "الشروق",
                "es": "Amanecer",
                "de": "Sonnenaufgang",
                "it": "Alba",
                "tr": "Güneş",
                "pt": "Nascer do Sol",
                "nl": "Zonsopgang",
                "ru": "Восход",
                "bn": "সূর্যোদয়",
                "fa": "طلوع",
                "ur": "طلوع"
            ],
            "description": [
                "fr": "Affiche les horaires de prière",
                "en": "Displays prayer times",
                "ar": "عرض أوقات الصلاة",
                "es": "Muestra los horarios de oración",
                "de": "Zeigt Gebetszeiten",
                "it": "Mostra gli orari di preghiera",
                "tr": "Namaz vakitlerini gösterir",
                "pt": "Exibe os horários de oração",
                "nl": "Toont gebedstijden",
                "ru": "Показывает время намаза",
                "bn": "নামাজের সময় দেখায়",
                "fa": "نمایش اوقات نماز",
                "ur": "نماز کے اوقات دکھاتا ہے"
            ],
            "sunrise_short": [
                "fr": "Lever",
                "en": "Sunrise",
                "ar": "شروق",
                "es": "Amanec",
                "de": "Aufgang",
                "it": "Alba",
                "tr": "Güneş",
                "pt": "Nascer",
                "nl": "Opgang",
                "ru": "Восход",
                "bn": "সূর্যোদয়",
                "fa": "طلوع",
                "ur": "طلوع"
            ],
            "maghrib_short": [
                "fr": "Maghr",
                "en": "Maghr",
                "ar": "مغرب",
                "es": "Maghr",
                "de": "Maghr",
                "it": "Maghr",
                "tr": "Akşam",
                "pt": "Maghr",
                "nl": "Maghr",
                "ru": "Магриб",
                "bn": "মাগরিব",
                "fa": "مغرب",
                "ur": "مغرب"
            ],
            "fajr": [
                "fr": "Fajr",
                "en": "Fajr",
                "ar": "الفجر",
                "es": "Fajr",
                "de": "Fajr",
                "it": "Fajr",
                "tr": "İmsak",
                "pt": "Fajr",
                "nl": "Fajr",
                "ru": "Фаджр",
                "bn": "ফজর",
                "fa": "فجر",
                "ur": "فجر"
            ],
            "dhuhr": [
                "fr": "Dhouhr",
                "en": "Dhuhr",
                "ar": "الظهر",
                "es": "Dhuhr",
                "de": "Dhuhr",
                "it": "Dhuhr",
                "tr": "Öğle",
                "pt": "Dhuhr",
                "nl": "Dhuhr",
                "ru": "Зухр",
                "bn": "যোহর",
                "fa": "ظهر",
                "ur": "ظہر"
            ],
            "asr": [
                "fr": "Asr",
                "en": "Asr",
                "ar": "العصر",
                "es": "Asr",
                "de": "Asr",
                "it": "Asr",
                "tr": "İkindi",
                "pt": "Asr",
                "nl": "Asr",
                "ru": "Аср",
                "bn": "আসর",
                "fa": "عصر",
                "ur": "عصر"
            ],
            "maghrib": [
                "fr": "Maghreb",
                "en": "Maghrib",
                "ar": "المغرب",
                "es": "Maghrib",
                "de": "Maghrib",
                "it": "Maghrib",
                "tr": "Akşam",
                "pt": "Maghrib",
                "nl": "Maghrib",
                "ru": "Магриб",
                "bn": "মাগরিব",
                "fa": "مغرب",
                "ur": "مغرب"
            ],
            "isha": [
                "fr": "Icha",
                "en": "Isha",
                "ar": "العشاء",
                "es": "Isha",
                "de": "Isha",
                "it": "Isha",
                "tr": "Yatsı",
                "pt": "Isha",
                "nl": "Isha",
                "ru": "Иша",
                "bn": "ইশা",
                "fa": "عشاء",
                "ur": "عشاء"
            ]
        ]
        
        return translations[key]?[lang] ?? translations[key]?["en"] ?? ""
    }
    
    static func getCurrentLanguage() -> String {
        let appGroupId = "group.com.drogbinho.myadhan"
        if let userDefaults = UserDefaults(suiteName: appGroupId),
           let lang = userDefaults.string(forKey: "app_language") {
            return lang
        }
        return "fr" // Fallback
    }
}

// 🎨 VUE DU WIDGET
struct PrayerTimesWidgetView: View {
    var entry: PrayerTimesProvider.Entry
    @Environment(\.widgetFamily) var family
    private let currentLang = WidgetTranslations.getCurrentLanguage()
   
    var body: some View {
        ZStack {
            // 🖼️ Image de fond selon le moment de la journée
            if let backgroundImage = getBackgroundImage() {
                // 🎨 Charger l'image depuis l'Asset Catalog et remplir tout l'espace
                Image(backgroundImage)
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .clipped()
                
                // Overlay sombre pour lisibilité du texte
                Color.black.opacity(0.3)
            } else {
                // Fallback : Dégradé si l'image n'existe pas
                LinearGradient(
                    gradient: Gradient(colors: backgroundColors()),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
           
            VStack(alignment: .leading, spacing: family == .systemSmall ? 2 : 6) {
                // 🕌 Titre (uniquement si pas systemSmall)
                if family != .systemSmall {
                    HStack {
                        Image(systemName: "clock")
                            .foregroundColor(.white)
                            .font(.body)
                        Text(WidgetTranslations.getText("title", lang: currentLang))
                            .font(.headline)
                            .foregroundColor(.white)
                    }
                    .padding(.bottom, 2)
                }
               
                // ⏰ Prochaine prière (affichée en premier pour tous les widgets)
                if !entry.nextPrayer.isEmpty && !entry.nextPrayerTime.isEmpty {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(WidgetTranslations.getText("next_prayer", lang: currentLang))
                            .font(family == .systemSmall ? .system(size: 9) : .caption)
                            .foregroundColor(.white.opacity(0.8))
                        HStack(spacing: 4) {
                            Text(prayerEmoji(entry.nextPrayer))
                                .font(family == .systemSmall ? .caption : .title3)
                            Text(prayerName(entry.nextPrayer))
                                .font(family == .systemSmall ? .system(size: 11, weight: .bold) : .subheadline)
                                .foregroundColor(.white)
                            Spacer()
                            Text(entry.nextPrayerTime)
                                .font(family == .systemSmall ? .system(size: 13, weight: .bold) : .title3)
                                .foregroundColor(.white)
                                .monospacedDigit()
                        }
                    }
                    .padding(family == .systemSmall ? 4 : 8)
                    .background(Color.white.opacity(0.25))
                    .cornerRadius(6)
                }
               
                if family != .systemSmall {
                    Divider()
                        .background(Color.white.opacity(0.5))
                        .padding(.vertical, 2)
                }
               
                // 📋 Liste des horaires
                VStack(alignment: .leading, spacing: family == .systemSmall ? 1 : 3) {
                    ForEach(["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"], id: \.self) { prayer in
                        if let time = entry.prayerTimes[prayer], !time.isEmpty {
                            HStack(spacing: family == .systemSmall ? 3 : 6) {
                                Text(prayerEmoji(prayer))
                                    .font(family == .systemSmall ? .system(size: 10) : .caption)
                                Text(prayerName(prayer))
                                    .font(family == .systemSmall ? .system(size: 9) : .caption)
                                    .foregroundColor(entry.nextPrayer == prayer ? .yellow : .white.opacity(0.9))
                                Spacer()
                                Text(time)
                                    .font(family == .systemSmall ? .system(size: 10, weight: .semibold) : .subheadline)
                                    .foregroundColor(.white)
                                    .monospacedDigit()
                            }
                        }
                    }
                }
            }
            .padding(family == .systemSmall ? 6 : 12)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .edgesIgnoringSafeArea(.all)
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
        case "Fajr": return WidgetTranslations.getText("fajr", lang: currentLang)
        case "Sunrise": return WidgetTranslations.getText("sunrise", lang: currentLang)
        case "Dhuhr": return WidgetTranslations.getText("dhuhr", lang: currentLang)
        case "Asr": return WidgetTranslations.getText("asr", lang: currentLang)
        case "Maghrib": return WidgetTranslations.getText("maghrib", lang: currentLang)
        case "Isha": return WidgetTranslations.getText("isha", lang: currentLang)
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
        // 🎯 Layout ultra-simple pour Lock Screen Circular
        VStack(spacing: 1) {
            Image(systemName: prayerSymbol(entry.nextPrayer))
                .font(.body)
            Text(entry.nextPrayerTime.isEmpty ? "--:--" : entry.nextPrayerTime)
                .font(.caption)
                .fontWeight(.bold)
                .monospacedDigit()
        }
    }
    
    private func prayerSymbol(_ prayer: String) -> String {
        switch prayer {
        case "Fajr": return "sunrise.fill"
        case "Dhuhr": return "sun.max.fill"
        case "Asr": return "sun.min.fill"
        case "Maghrib": return "sunset.fill"
        case "Isha": return "moon.stars.fill"
        default: return "building.2.fill"
        }
    }
}

// 🔒 Widget Rectangle - Affiche 3 prières selon l'heure
@available(iOS 16.0, *)
struct PrayerTimesRectangularView: View {
    var entry: PrayerTimesProvider.Entry
    private let currentLang = WidgetTranslations.getCurrentLanguage()

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if shouldShowMorningPrayers() {
                // Avant Dhuhr : Fajr, Sunrise, Dhuhr
                prayerRow("Fajr")
                if let sunrise = entry.prayerTimes["Sunrise"], !sunrise.isEmpty {
                    prayerRow("Sunrise")
                }
                prayerRow("Dhuhr")
            } else {
                // Après Dhuhr : Asr, Maghrib, Isha
                prayerRow("Asr")
                prayerRow("Maghrib")
                prayerRow("Isha")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    // 🕐 Détermine si on affiche les prières du matin ou du soir
    private func shouldShowMorningPrayers() -> Bool {
        let now = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        
        // Si on a l'heure de Dhuhr, on compare avec l'heure actuelle
        if let dhuhrTime = entry.prayerTimes["Dhuhr"],
           let dhuhrDate = formatter.date(from: dhuhrTime) {
            let nowTimeOnly = formatter.string(from: now)
            if let nowDate = formatter.date(from: nowTimeOnly) {
                // Avant Dhuhr -> matin, Après Dhuhr -> soir
                return nowDate < dhuhrDate
            }
        }
        
        // Fallback : si l'heure actuelle est avant 13h, afficher matin
        let hour = Calendar.current.component(.hour, from: now)
        return hour < 13
    }
    
    private func prayerRow(_ prayer: String) -> some View {
        HStack(spacing: 4) {
            Circle()
                .fill(entry.nextPrayer == prayer ? Color.white : Color.white.opacity(0.4))
                .frame(width: 5, height: 5)
            Text(prayerShortName(prayer))
                .font(.system(size: 10, weight: .medium))
                .frame(width: 35, alignment: .leading)
            Text(entry.prayerTimes[prayer] ?? "--:--")
                .font(.system(size: 10, weight: .semibold))
                .monospacedDigit()
        }
    }
    
    private func prayerShortName(_ prayer: String) -> String {
        let fullName: String
        switch prayer {
        case "Fajr": fullName = WidgetTranslations.getText("fajr", lang: currentLang)
        case "Sunrise": fullName = WidgetTranslations.getText("sunrise_short", lang: currentLang)
        case "Dhuhr": fullName = WidgetTranslations.getText("dhuhr", lang: currentLang)
        case "Asr": fullName = WidgetTranslations.getText("asr", lang: currentLang)
        case "Maghrib": fullName = WidgetTranslations.getText("maghrib_short", lang: currentLang)
        case "Isha": fullName = WidgetTranslations.getText("isha", lang: currentLang)
        default: return prayer
        }
        
        // Tronquer à 5 caractères max pour le Lock Screen
        return String(fullName.prefix(5))
    }
}

// 📝 Widget Inline - Texte au-dessus de l'heure
@available(iOS 16.0, *)
struct PrayerTimesInlineView: View {
    var entry: PrayerTimesProvider.Entry
    private let currentLang = WidgetTranslations.getCurrentLanguage()
    
    var body: some View {
        // 🎯 Format ultra-compact pour Inline (texte seulement)
        if !entry.nextPrayer.isEmpty && !entry.nextPrayerTime.isEmpty {
            let translatedName = translatePrayerName(entry.nextPrayer)
            Text("\(translatedName) \(entry.nextPrayerTime)")
                .fontWeight(.medium)
        } else {
            Text(WidgetTranslations.getText("title", lang: currentLang))
        }
    }
    
    private func translatePrayerName(_ prayer: String) -> String {
        switch prayer {
        case "Fajr": return WidgetTranslations.getText("fajr", lang: currentLang)
        case "Sunrise": return WidgetTranslations.getText("sunrise", lang: currentLang)
        case "Dhuhr": return WidgetTranslations.getText("dhuhr", lang: currentLang)
        case "Asr": return WidgetTranslations.getText("asr", lang: currentLang)
        case "Maghrib": return WidgetTranslations.getText("maghrib", lang: currentLang)
        case "Isha": return WidgetTranslations.getText("isha", lang: currentLang)
        default: return prayer
        }
    }
}

// 🔄 Vue principale qui dispatche selon le type de widget
struct PrayerTimesWidgetEntryView: View {
    var entry: PrayerTimesProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            if #available(iOS 16.0, *) {
                switch family {
                case .accessoryCircular:
                    PrayerTimesCircularView(entry: entry)
                case .accessoryInline:
                    PrayerTimesInlineView(entry: entry)
                case .accessoryRectangular:
                    PrayerTimesRectangularView(entry: entry)
                default:
                    mainWidgetView
                }
            } else {
                mainWidgetView
            }
        }
    }
    
    // 🎨 Vue principale avec gestion du background pour iOS 17+
    @ViewBuilder
    private var mainWidgetView: some View {
        if #available(iOS 17.0, *) {
            PrayerTimesWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    // Background géré dans la vue elle-même
                    Color.clear
                }
        } else {
            PrayerTimesWidgetView(entry: entry)
        }
    }
}

// 🔧 WIDGET PRINCIPAL (UN SEUL WIDGET POUR TOUT)
@main
struct PrayerTimesWidget: Widget {
    let kind: String = "PrayerTimesWidget"
   
    var body: some WidgetConfiguration {
        let currentLang = WidgetTranslations.getCurrentLanguage()
        let config = StaticConfiguration(kind: kind, provider: PrayerTimesProvider()) { entry in
            PrayerTimesWidgetEntryView(entry: entry)
        }
        .configurationDisplayName(WidgetTranslations.getText("title", lang: currentLang))
        .description(WidgetTranslations.getText("description", lang: currentLang))
        .supportedFamilies(allFamilies)
        
        // 🎨 Désactiver les marges de contenu sur iOS 17+ pour éviter les bordures blanches
        if #available(iOS 17.0, *) {
            return config.contentMarginsDisabled()
        } else {
            return config
        }
    }
    
    private var allFamilies: [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [
                .systemSmall,
                .systemMedium,
                .systemLarge,
                .accessoryCircular,
                .accessoryInline,
                .accessoryRectangular
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
