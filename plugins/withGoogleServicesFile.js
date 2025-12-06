const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Plugin Expo pour injecter GoogleService-Info.plist depuis une variable d'environnement
 */
module.exports = function withGoogleServicesFile(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;
      const targetPath = path.join(iosRoot, "GoogleService-Info.plist");

      // Si la variable d'environnement existe, décode le base64 et écrit le fichier
      const base64Content = process.env.GOOGLE_SERVICES_INFO_PLIST_BASE64;
      
      if (base64Content) {
        console.log("✅ Found GOOGLE_SERVICES_INFO_PLIST_BASE64 environment variable");
        console.log("✅ Writing GoogleService-Info.plist to", targetPath);
        
        const content = Buffer.from(base64Content, "base64").toString("utf-8");
        fs.writeFileSync(targetPath, content, "utf-8");
        
        console.log("✅ GoogleService-Info.plist written successfully!");
      } else {
        console.log("⚠️  GOOGLE_SERVICES_INFO_PLIST_BASE64 not found, checking if file exists locally...");
        
        // Fallback: si le fichier existe déjà localement, on le copie
        const localPath = path.join(config.modRequest.projectRoot, "ios", "GoogleService-Info.plist");
        if (fs.existsSync(localPath)) {
          console.log("✅ Found local GoogleService-Info.plist, copying to", targetPath);
          fs.copyFileSync(localPath, targetPath);
        } else {
          console.warn("⚠️  GoogleService-Info.plist not found in environment or locally");
        }
      }

      return config;
    },
  ]);
};

