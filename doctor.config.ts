import type { ReactDoctorConfig } from "react-doctor/api";

export default {
  lint: true,
  deadCode: true,
  failOn: "error",
  ignore: {
    rules: [],
    files: [],
    overrides: [
      {
        files: [
          "__tests__/**"
        ],
        rules: [
          "react-doctor/no-prop-callback-in-render"
        ]
      },
      {
        files: [
          "components/AbonnementProtection.tsx",
          "hooks/useNativeDownload.ts"
        ],
        rules: [
          "react-doctor/effect-needs-cleanup"
        ]
      },
      {
        files: [
          "components/PaymentDebugInfo.tsx",
          "hooks/useFavoritesManager.ts",
          "hooks/usePrayerTimesCache.ts",
          "hooks/useQuranSurahData.ts"
        ],
        rules: [
          "react-doctor/no-loading-flag-reset-outside-finally"
        ]
      },
      {
        // apiClient.ts lit volontairement le corps de la réponse avant de
        // vérifier response.ok (pour récupérer le message d'erreur JSON de
        // l'API même en cas d'échec HTTP), puis vérifie bien le statut juste
        // après pour décider du comportement (retry / refresh token).
        files: ["utils/apiClient.ts"],
        rules: ["react-doctor/no-fetch-response-used-without-status-check"]
      },
      {
        // Pages HTML statiques (admin interne / conformité RGPD) hors du
        // bundle de l'app mobile : hors périmètre de cet audit React Native.
        files: ["api/**", "public/**"],
        rules: ["react-doctor/no-fetch-response-used-without-status-check"]
      }
    ]
  }
} satisfies ReactDoctorConfig;
