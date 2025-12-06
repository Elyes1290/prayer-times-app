import { StyleSheet, Platform } from "react-native";

export const getStyles = (
  colors: any,
  overlayTextColor: string,
  overlayIconColor: string,
  currentTheme: "light" | "dark"
) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    title: {
      fontSize: 32,
      fontWeight: "800",
      color: overlayTextColor,
      marginBottom: 8,
      marginTop: 16,
      textAlign: "center",
      letterSpacing: -0.5,
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.7)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
      flex: 1,
    },
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    premiumButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.2)"
          : "rgba(0, 0, 0, 0.3)",
      borderWidth: 1,
      borderColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.3)"
          : "rgba(255, 255, 255, 0.2)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    text: {
      color: overlayTextColor,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor:
        currentTheme === "light" ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContent: {
      backgroundColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.98)"
          : "rgba(15, 23, 42, 0.95)",
      padding: 28,
      borderRadius: 20,
      alignItems: "center",
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 10,
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(212, 175, 55, 0.3)",
      width: "90%",
      maxWidth: 350,
    },
    modalIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor:
        currentTheme === "light"
          ? "rgba(34, 139, 34, 0.15)"
          : "rgba(212, 175, 55, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.4)",
    },
    modalIcon: {
      fontSize: 40,
      textAlign: "center",
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: currentTheme === "light" ? colors.primary : "#D4AF37",
      textAlign: "center",
      marginBottom: 16,
      letterSpacing: 0.5,
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    modalMessage: {
      fontSize: 16,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 24,
      paddingHorizontal: 8,
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    modalButton: {
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 16,
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.5)",
      minWidth: 180,
    },
    modalButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "bold",
      textAlign: "center",
      letterSpacing: 0.5,
      textShadowColor:
        currentTheme === "light" ? "rgba(0, 0, 0, 0.3)" : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    premiumModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "flex-end",
    },
    premiumModalContent: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.95)",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "90%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
      elevation: 12,
    },
    premiumModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.2)",
    },
    premiumModalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      flex: 1,
    },
    premiumModalCloseButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(30, 41, 59, 0.8)",
    },
    modalToastContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 999999,
      elevation: 999999,
      pointerEvents: "box-none",
    },
    locationToggle: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 24,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      padding: 6,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    toggleButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginHorizontal: 2,
      flex: 1,
      minWidth: 85,
      maxWidth: 120,
      alignItems: "center",
      justifyContent: "center",
    },
    toggleButtonActive: {
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.5)",
    },
    toggleButtonText: {
      color: currentTheme === "light" ? colors.textSecondary : "#94A3B8",
      fontSize: 15,
      fontWeight: "600",
      letterSpacing: -0.2,
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    toggleButtonTextActive: {
      color: "#FFFFFF",
      textShadowColor:
        currentTheme === "light" ? "rgba(0, 0, 0, 0.3)" : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    toggleContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 12,
      marginBottom: 16,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    autoLocationSection: {
      alignItems: "center",
      padding: 24,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
      marginTop: 16,
    },
    refreshButton: {
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 12,
      marginBottom: 16,
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.5)",
    },
    refreshButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "600",
      textAlign: "center",
      letterSpacing: -0.2,
      textShadowColor:
        currentTheme === "light" ? "rgba(0, 0, 0, 0.3)" : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    locationText: {
      fontSize: 14,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      textAlign: "center",
      fontWeight: "500",
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    input: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(30, 41, 59, 0.9)",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      fontSize: 16,
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      zIndex: 10,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      marginBottom: 0,
    },
    searchButton: {
      backgroundColor: "#2E7D32",
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: "#1B5E20",
    },
    searchButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
    },
    resultsList: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.9)",
      borderRadius: 12,
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    resultItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.2)",
    },
    resultText: {
      fontSize: 16,
      lineHeight: 22,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      fontWeight: "500",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      letterSpacing: -0.2,
    },
    pickerContainer: {
      flex: 1,
      marginLeft: 16,
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(30, 41, 59, 0.8)",
      borderRadius: 8,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    pickerContainerFull: {
      flex: 1,
      marginLeft: 16,
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(30, 41, 59, 0.8)",
      borderRadius: 8,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    picker: {
      height: 50,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    pickerItem: {
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      fontSize: 16,
    },
    previewControlsContainer: {
      marginTop: 20,
      padding: 20,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    previewControls: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
    },
    previewInfo: {
      fontSize: 12,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      textAlign: "center",
      marginBottom: 8,
      fontStyle: "italic",
    },
    playButtonMain: {
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.5)",
    },
    stopButtonMain: {
      backgroundColor:
        currentTheme === "light" ? "#EF4444" : "rgba(239, 68, 68, 0.9)",
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: currentTheme === "light" ? "#EF4444" : "#EF4444",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? "#EF4444" : "rgba(239, 68, 68, 0.5)",
    },
    progressContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
      gap: 12,
    },
    timeText: {
      fontSize: 12,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      fontWeight: "500",
      minWidth: 45,
      textAlign: "center",
    },
    progressBarContainer: {
      flex: 1,
      height: 40,
      justifyContent: "center",
    },
    progressBar: {
      height: 8,
      backgroundColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      borderRadius: 4,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      borderRadius: 4,
    },
    sliderContainer: {
      flex: 1,
      marginLeft: 16,
      alignItems: "center",
    },
    sliderValue: {
      fontSize: 14,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      fontWeight: "600",
      marginTop: 8,
    },
    sectionHeader: {
      fontSize: 20,
      fontWeight: "700",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      paddingTop: 24,
      paddingBottom: 12,
      paddingHorizontal: 20,
      backgroundColor: "transparent",
      letterSpacing: -0.3,
      textShadowColor:
        currentTheme === "light"
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(0,0,0,0.7)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    subLabel: {
      fontSize: 15,
      fontWeight: "500",
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      letterSpacing: -0.1,
    },
    premiumSection: {
      padding: 16,
      backgroundColor:
        currentTheme === "light"
          ? "rgba(255, 215, 0, 0.08)"
          : "rgba(212, 175, 55, 0.15)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light"
          ? "rgba(255, 215, 0, 0.3)"
          : "rgba(212, 175, 55, 0.4)",
      marginVertical: 8,
    },
    premiumSectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      marginBottom: 16,
      textAlign: "center",
    },
    premiumAdhanItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.7)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.2)",
    },
    premiumAdhanInfo: {
      flex: 1,
      marginRight: 12,
    },
    premiumAdhanTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      marginBottom: 4,
    },
    premiumAdhanSize: {
      fontSize: 14,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
    },
    premiumAdhanActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    downloadProgressContainer: {
      alignItems: "center",
      minWidth: 80,
      maxWidth: 120,
      gap: 6,
    },
    downloadProgressRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      gap: 8,
    },
    progressBarPremium: {
      width: 80,
      height: 6,
      backgroundColor: "rgba(78, 205, 196, 0.2)",
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFillPremium: {
      height: "100%",
      backgroundColor: "#4ECDC4",
      borderRadius: 2,
    },
    progressTextPremium: {
      fontSize: 12,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      fontWeight: "600",
    },
    downloadButtonPremium: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(78, 205, 196, 0.1)",
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: "#4ECDC4",
    },
    downloadButtonTextPremium: {
      marginLeft: 6,
      fontSize: 14,
      color: "#4ECDC4",
      fontWeight: "600",
    },
    previewButtonPremium: {
      backgroundColor: "rgba(78, 205, 196, 0.1)",
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#4ECDC4",
    },
    deleteButtonPremium: {
      backgroundColor: "rgba(255, 107, 107, 0.1)",
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#FF6B6B",
    },
    cancelDownloadButton: {
      backgroundColor: "rgba(255, 107, 107, 0.2)",
      borderRadius: 20,
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FF6B6B",
    },
    downloadedContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minWidth: 180,
      gap: 12,
      flexWrap: "nowrap",
    },
    downloadedIndicator: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(78, 205, 196, 0.1)",
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: "rgba(78, 205, 196, 0.3)",
      flexShrink: 0,
      minWidth: 120,
      maxWidth: 160,
      flexWrap: "nowrap",
    },
    downloadedText: {
      marginLeft: 6,
      fontSize: 13,
      color: "#4ECDC4",
      fontWeight: "600",
      flexShrink: 0,
    },
    actionsContainer: {
      marginVertical: 25,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    applyButton: {
      backgroundColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.9)",
      paddingVertical: 16,
      paddingHorizontal: 50,
      borderRadius: 16,
      elevation: 8,
      shadowColor: currentTheme === "light" ? colors.shadow : "#D4AF37",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? colors.primary : "rgba(212, 175, 55, 0.4)",
      minWidth: 200,
      alignItems: "center",
    },
    applyButtonText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "bold",
      letterSpacing: 1,
      textTransform: "uppercase",
      textAlign: "center",
      textShadowColor:
        currentTheme === "light" ? "rgba(0, 0, 0, 0.3)" : "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    premiumBuySection: {
      alignItems: "center",
      padding: 20,
      backgroundColor: "rgba(255, 215, 0, 0.1)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.3)",
      marginTop: 16,
    },
    premiumBuyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#FFD700",
      marginBottom: 8,
      textAlign: "center",
    },
    premiumBuySubtitle: {
      fontSize: 14,
      fontWeight: "400",
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      marginBottom: 16,
      textAlign: "center",
      lineHeight: 20,
    },
    premiumBuyButton: {
      backgroundColor: "#FFD700",
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
      shadowColor: "#FFD700",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.5)",
      marginBottom: 12,
    },
    premiumBuyButtonText: {
      color: "#1A1A1A",
      fontSize: 16,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    premiumStatusSection: {
      alignItems: "center",
      padding: 20,
      backgroundColor: "rgba(78, 205, 196, 0.1)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(78, 205, 196, 0.3)",
      marginTop: 16,
    },
    premiumStatusHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    premiumStatusTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#4ECDC4",
      marginLeft: 8,
    },
    premiumStatusText: {
      fontSize: 14,
      fontWeight: "400",
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 16,
    },
    premiumLogoutButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 107, 107, 0.1)",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(255, 107, 107, 0.3)",
    },
    premiumLogoutButtonText: {
      marginLeft: 6,
      fontSize: 14,
      color: "#FF6B6B",
      fontWeight: "600",
    },
    premiumStatusContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    section: {
      marginBottom: 20,
    },
    backupSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      marginLeft: 8,
    },
    iconColor: {
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    settingInfo: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      marginBottom: 4,
    },
    settingValue: {
      fontSize: 14,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
    },
    settingDescription: {
      fontSize: 12,
      color: currentTheme === "light" ? colors.textSecondary : "#94A3B8",
      marginTop: 2,
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginLeft: 8,
    },
    toggle: {
      width: 48,
      height: 24,
      borderRadius: 12,
      backgroundColor: currentTheme === "light" ? "#E2E8F0" : "#475569",
      padding: 2,
      justifyContent: "center",
    },
    toggleActive: {
      backgroundColor: currentTheme === "light" ? colors.primary : "#4ECDC4",
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#FFFFFF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    toggleThumbActive: {
      transform: [{ translateX: 24 }],
    },
    actionButtons: {
      flexDirection: "row",
      gap: 12,
      marginTop: 16,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    primaryButton: {
      backgroundColor: currentTheme === "light" ? colors.primary : "#4ECDC4",
      borderColor: currentTheme === "light" ? colors.primary : "#4ECDC4",
    },
    secondaryButton: {
      backgroundColor: "transparent",
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },
    secondaryButtonText: {
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    syncStatus: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor:
        currentTheme === "light"
          ? "rgba(78, 205, 196, 0.1)"
          : "rgba(78, 205, 196, 0.2)",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(78, 205, 196, 0.3)",
    },
    syncStatusText: {
      fontSize: 12,
      color: "#4ECDC4",
      fontWeight: "500",
      marginLeft: 6,
    },
    upgradeContainer: {
      alignItems: "center",
      padding: 20,
      backgroundColor: "rgba(255, 215, 0, 0.1)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.3)",
      marginTop: 16,
    },
    upgradeTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#FFD700",
      marginTop: 12,
      marginBottom: 8,
      textAlign: "center",
    },
    upgradeDescription: {
      fontSize: 14,
      fontWeight: "400",
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 16,
    },
    upgradeButton: {
      backgroundColor: "#FFD700",
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      shadowColor: "#FFD700",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.5)",
    },
    upgradeButtonText: {
      color: "#1A1A1A",
      fontSize: 14,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 12,
    },
    gridButton: {
      width: "30%",
      aspectRatio: 1,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    gridButtonActive: {
      borderColor: currentTheme === "light" ? colors.primary : "#4ECDC4",
      backgroundColor:
        currentTheme === "light"
          ? "rgba(78, 205, 196, 0.1)"
          : "rgba(78, 205, 196, 0.2)",
      shadowColor: currentTheme === "light" ? colors.primary : "#4ECDC4",
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    gridButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      textAlign: "center",
      marginTop: 8,
      lineHeight: 16,
    },
    gridButtonDisabled: {
      backgroundColor:
        currentTheme === "light"
          ? "rgba(107, 114, 128, 0.1)"
          : "rgba(107, 114, 128, 0.2)",
      borderColor:
        currentTheme === "light"
          ? "rgba(107, 114, 128, 0.3)"
          : "rgba(107, 114, 128, 0.4)",
      opacity: 0.6,
    },
    gridButtonTextDisabled: {
      color: currentTheme === "light" ? "#6B7280" : "#9CA3AF",
    },
    activeSectionContainer: {
      marginTop: 16,
      marginHorizontal: 16,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      overflow: "hidden",
    },
    activeSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    activeSectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    closeButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor:
        currentTheme === "light"
          ? "rgba(0, 0, 0, 0.05)"
          : "rgba(255, 255, 255, 0.1)",
    },
    activeSectionContent: {
      padding: 16,
    },
    sectionDescription: {
      fontSize: 14,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      lineHeight: 20,
    },
    themeSection: {
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 24,
      padding: 16,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    themeSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    themeSectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginLeft: 8,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    themeSwitchContainer: {
      flexDirection: "row",
      gap: 12,
    },
    themeOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(30, 41, 59, 0.8)",
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    themeOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeOptionText: {
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    applyChangesContainer: {
      position: "absolute",
      bottom: 90,
      left: 16,
      right: 16,
      zIndex: 1000,
      elevation: 1000,
    },
    applyChangesButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#FF6B35",
      paddingVertical: 18,
      paddingHorizontal: 20,
      borderRadius: 20,
      shadowColor: "#FF6B35",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 12,
      borderWidth: 2,
      borderColor: "#FF8A65",
    },
    applyChangesIconContainer: {
      position: "relative",
      marginRight: 12,
    },
    applyChangesBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: "#FFD700",
      width: 16,
      height: 16,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#FFFFFF",
    },
    applyChangesBadgeText: {
      color: "#FF6B35",
      fontSize: 10,
      fontWeight: "900",
      lineHeight: 12,
    },
    applyChangesTextContainer: {
      flex: 1,
      justifyContent: "center",
    },
    applyChangesButtonTitle: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.5,
      textShadowColor: "rgba(0, 0, 0, 0.4)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
      marginBottom: 2,
    },
    applyChangesButtonSubtitle: {
      color: "rgba(255, 255, 255, 0.9)",
      fontSize: 12,
      fontWeight: "500",
      letterSpacing: 0.3,
      opacity: 0.95,
    },
    accountSection: {
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(15, 23, 42, 0.8)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      shadowColor: currentTheme === "light" ? colors.shadow : "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      overflow: "hidden",
    },
    accountSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.2)",
    },
    accountSectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      flex: 1,
      marginLeft: 12,
    },
    editButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor:
        currentTheme === "light"
          ? "rgba(78, 205, 196, 0.1)"
          : "rgba(78, 205, 196, 0.2)",
      borderWidth: 1,
      borderColor: "rgba(78, 205, 196, 0.3)",
    },
    accountFormContainer: {
      padding: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      marginBottom: 8,
    },
    inputValue: {
      fontSize: 16,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
      padding: 12,
      backgroundColor:
        currentTheme === "light" ? colors.cardBG : "rgba(30, 41, 59, 0.8)",
      borderRadius: 8,
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    accountInput: {
      fontSize: 16,
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      padding: 12,
      backgroundColor:
        currentTheme === "light" ? colors.surface : "rgba(30, 41, 59, 0.9)",
      borderRadius: 8,
      borderWidth: 2,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.3)",
      marginRight: 8,
      alignItems: "center",
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    saveButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: "#4ECDC4",
      marginLeft: 8,
      gap: 8,
    },
    saveButtonDisabled: {
      backgroundColor: "#94A3B8",
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    subscriptionInfo: {
      padding: 16,
    },
    subscriptionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    subscriptionLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
    },
    subscriptionValue: {
      fontSize: 14,
      color: currentTheme === "light" ? colors.textSecondary : "#CBD5E1",
    },
    premiumBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 215, 0, 0.1)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.3)",
      gap: 4,
    },
    premiumBadgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#FFD700",
    },
    securityOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        currentTheme === "light" ? colors.border : "rgba(148, 163, 184, 0.2)",
    },
    securityOptionText: {
      fontSize: 14,
      fontWeight: "500",
      color: currentTheme === "light" ? colors.text : "#F8FAFC",
      flex: 1,
      marginLeft: 12,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      backgroundColor: "rgba(255, 107, 107, 0.1)",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(255, 107, 107, 0.3)",
      marginBottom: 12,
      gap: 8,
    },
    logoutButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FF6B6B",
    },
    deleteAccountButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.3)",
      gap: 8,
    },
    deleteAccountButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#EF4444",
    },
  });
