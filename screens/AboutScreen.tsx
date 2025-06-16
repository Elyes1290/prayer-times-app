import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Image,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export default function AboutScreen() {
  const { t } = useTranslation();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const appVersion = "1.0.0";
  const buildNumber = "14";

  const features = [
    { icon: "clock-outline", key: "prayer_times" },
    { icon: "compass-outline", key: "qibla_direction" },
    { icon: "book-open-variant", key: "quran_reading" },
    { icon: "star-crescent", key: "dhikr_automatic" },
    { icon: "format-list-numbered", key: "asmaul_husna" },
    { icon: "book-outline", key: "authentic_hadith" },
    { icon: "calendar-heart", key: "hijri_calendar" },
    { icon: "bell-outline", key: "smart_notifications" },
  ];

  const faqData = [
    { question: "faq_location_question", answer: "faq_location_answer" },
    {
      question: "faq_notifications_question",
      answer: "faq_notifications_answer",
    },
    { question: "faq_qibla_question", answer: "faq_qibla_answer" },
    { question: "faq_offline_question", answer: "faq_offline_answer" },
  ];

  const handleEmailContact = (subject: string) => {
    const email = "elyes.naitliman@gmail.com";
    const body = t("abouts.email_template").replace("{{subject}}", subject);
    Linking.openURL(
      `mailto:${email}?subject=${subject}&body=${encodeURIComponent(body)}`
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      t("abouts.privacy_policy"),
      t("abouts.privacy_policy_content"),
      [{ text: t("abouts.understand"), style: "default" }]
    );
  };

  const renderFeatureItem = (feature: any, index: number) => (
    <View key={index} style={styles.featureItem}>
      <MaterialCommunityIcons
        name={feature.icon as any}
        size={24}
        color="#b59d42"
      />
      <Text style={styles.featureText}>
        {t(`abouts.features.${feature.key}`)}
      </Text>
    </View>
  );

  const renderFAQItem = (item: any, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.faqItem}
      onPress={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{t(`abouts.${item.question}`)}</Text>
        <MaterialCommunityIcons
          name={expandedFAQ === index ? "chevron-up" : "chevron-down"}
          size={24}
          color="#b59d42"
        />
      </View>
      {expandedFAQ === index && (
        <Text style={styles.faqAnswer}>{t(`abouts.${item.answer}`)}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ImageBackground
      source={require("../assets/images/prayer-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        <View style={styles.header}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
          />
          <Text style={styles.title}>{t("abouts.title")}</Text>
          <Text style={styles.subtitle}>{t("abouts.subtitle")}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>{t("abouts.welcome")}</Text>
          <Text style={styles.desc}>{t("abouts.description")}</Text>
          <Text style={styles.blessing}>{t("abouts.blessing")}</Text>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("abouts.features_title")}</Text>
          <Text style={styles.sectionSubtitle}>
            {t("abouts.features_subtitle")}
          </Text>
          <View style={styles.featuresGrid}>
            {features.map(renderFeatureItem)}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("abouts.faq_title")}</Text>
          {faqData.map(renderFAQItem)}
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("abouts.support_title")}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => handleEmailContact(t("abouts.contact_suggestion"))}
          >
            <MaterialCommunityIcons
              name="email-outline"
              size={20}
              color="#483C1C"
            />
            <Text style={styles.buttonText}>{t("abouts.send_suggestion")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => handleEmailContact(t("abouts.contact_bug"))}
          >
            <MaterialCommunityIcons
              name="bug-outline"
              size={20}
              color="#483C1C"
            />
            <Text style={styles.buttonText}>{t("abouts.report_bug")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() =>
              Linking.openURL(
                "market://details?id=com.drogbinho.prayertimesapp2"
              )
            }
          >
            <MaterialCommunityIcons
              name="star-outline"
              size={20}
              color="#483C1C"
            />
            <Text style={styles.buttonText}>{t("abouts.rate_app")}</Text>
          </TouchableOpacity>
        </View>

        {/* Developer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("abouts.developer_title")}</Text>
          <Text style={styles.text}>{t("abouts.developer_name")}</Text>
          <Text style={styles.text}>{t("abouts.developer_bio")}</Text>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                "https://www.linkedin.com/in/elyes-nait-liman-bbb7b4189"
              )
            }
            style={styles.linkedinButton}
          >
            <MaterialCommunityIcons name="linkedin" size={20} color="#0077b5" />
            <Text style={styles.linkedinText}>
              {t("abouts.linkedin_profile")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Technical Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("abouts.technical_title")}</Text>
          <Text style={styles.text}>{t("abouts.tech_react_native")}</Text>
          <Text style={styles.text}>{t("abouts.tech_adhan_lib")}</Text>
          <Text style={styles.text}>{t("abouts.tech_expo")}</Text>
          <Text style={styles.text}>{t("abouts.tech_permissions")}</Text>
        </View>

        {/* Sources Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("abouts.sources_title")}</Text>
          <Text style={styles.text}>{t("abouts.source_quran")}</Text>
          <Text style={styles.text}>{t("abouts.source_hadith")}</Text>
          <Text style={styles.text}>
            {t("abouts.source_prayer_calculation")}
          </Text>
          <Text style={styles.text}>{t("abouts.source_icons")}</Text>
          <Text style={styles.spiritualNote}>
            {t("abouts.islamic_authenticity")}
          </Text>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("abouts.legal_title")}</Text>
          <TouchableOpacity
            style={styles.legalButton}
            onPress={handlePrivacyPolicy}
          >
            <Text style={styles.legalButtonText}>
              {t("abouts.privacy_policy")}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="#b59d42"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.legalButton}
            onPress={() =>
              Alert.alert(t("abouts.terms_title"), t("abouts.terms_content"))
            }
          >
            <Text style={styles.legalButtonText}>
              {t("abouts.terms_of_use")}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="#b59d42"
            />
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.version}>
            {t("abouts.version")} {appVersion} ({t("abouts.build")}{" "}
            {buildNumber})
          </Text>
          <Text style={styles.footer}>{t("abouts.footer_thanks")}</Text>
          <Text style={styles.dua}>{t("abouts.closing_dua")}</Text>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, padding: 24, marginTop: 70 },
  header: { alignItems: "center", marginBottom: 24 },
  logo: { width: 80, height: 80, borderRadius: 24, marginBottom: 12 },
  title: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 4,
    fontFamily: "ScheherazadeNew",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#fffbe8",
    textAlign: "center",
    fontFamily: "ScheherazadeNew",
    fontStyle: "italic",
  },
  infoContainer: {
    backgroundColor: "#fffbe6",
    padding: 18,
    borderRadius: 12,
    marginVertical: 20,
    borderColor: "#ba9c34",
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#483C1C",
    marginBottom: 8,
    fontFamily: "ScheherazadeNew",
    textAlign: "center",
  },
  desc: {
    fontSize: 16,
    color: "#483C1C",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: "ScheherazadeNew",
    lineHeight: 24,
  },
  blessing: {
    fontSize: 16,
    color: "#b59d42",
    textAlign: "center",
    fontFamily: "ScheherazadeNew",
    fontWeight: "bold",
    fontStyle: "italic",
  },
  section: {
    marginVertical: 12,
    backgroundColor: "#f8ecc2",
    borderRadius: 12,
    padding: 18,
    shadowColor: "#b59d42",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#b59d42",
    marginBottom: 8,
    fontFamily: "ScheherazadeNew",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6c5d3b",
    marginBottom: 12,
    fontFamily: "ScheherazadeNew",
    fontStyle: "italic",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: "#6c5d3b",
    marginLeft: 8,
    fontFamily: "ScheherazadeNew",
    flex: 1,
  },
  faqItem: {
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    fontSize: 16,
    color: "#483C1C",
    fontFamily: "ScheherazadeNew",
    fontWeight: "bold",
    flex: 1,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#6c5d3b",
    marginTop: 8,
    fontFamily: "ScheherazadeNew",
    lineHeight: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    backgroundColor: "#e7c86a",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ba9c34",
  },
  secondaryButton: {
    backgroundColor: "#f0e6a6",
  },
  buttonText: {
    color: "#483C1C",
    fontSize: 16,
    fontFamily: "ScheherazadeNew",
    fontWeight: "bold",
    marginLeft: 8,
  },
  linkedinButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  linkedinText: {
    color: "#0077b5",
    fontSize: 15,
    fontFamily: "ScheherazadeNew",
    textDecorationLine: "underline",
    marginLeft: 6,
  },
  legalButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0d4a8",
  },
  legalButtonText: {
    fontSize: 16,
    color: "#6c5d3b",
    fontFamily: "ScheherazadeNew",
  },
  text: {
    fontSize: 15,
    color: "#6c5d3b",
    marginBottom: 6,
    fontFamily: "ScheherazadeNew",
  },
  spiritualNote: {
    fontSize: 14,
    color: "#b59d42",
    marginTop: 8,
    fontFamily: "ScheherazadeNew",
    fontStyle: "italic",
    textAlign: "center",
  },
  versionContainer: {
    alignItems: "center",
    marginTop: 20,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
  },
  version: {
    color: "#b59d42",
    fontSize: 14,
    textAlign: "center",
    fontFamily: "ScheherazadeNew",
  },
  footer: {
    marginTop: 8,
    color: "#fffbe8",
    textAlign: "center",
    fontSize: 14,
    fontStyle: "italic",
    fontFamily: "ScheherazadeNew",
  },
  dua: {
    marginTop: 8,
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontFamily: "ScheherazadeNew",
    fontWeight: "bold",
  },
});
