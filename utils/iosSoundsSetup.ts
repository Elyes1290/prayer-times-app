import { Platform } from "react-native";

/**
 * Configuration des sons pour les notifications iOS
 *
 * Sur iOS, UNNotificationSound peut lire les sons depuis :
 * - Le bundle principal (compliqué avec Expo)
 * - Library/Sounds/ dans le dossier de l'app (RECOMMANDÉ)
 *
 * Cette fonction copie les sons depuis assets/sounds/ vers Library/Sounds/
 * au premier lancement de l'app.
 */

const SOUND_FILES = [
  "adhanaljazaer",
  "adhamalsharqawe",
  "ahmadelkourdi",
  "ahmadnafees",
  "dubai",
  "islamsobhi",
  "karljenkins",
  "mansourzahrani",
  "masjidquba",
  "misharyrachid",
  "mustafaozcan",
];

export async function setupIosSoundsForNotifications(): Promise<void> {
  if (Platform.OS !== "ios") {
    console.log("[iosSoundsSetup] Plateforme non-iOS, skip");
    return;
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("🎵 [iosSoundsSetup] Configuration sons iOS");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("ℹ️ Sur iOS, les sons pour UNNotificationSound doivent être");
  console.log("   dans le bundle de l'app (pas dans Library/Sounds)");
  console.log("ℹ️ Les sons sont inclus automatiquement lors du build EAS");
  console.log("ℹ️ par le hook eas-hooks/eas-build-post-install.sh");
  console.log("ℹ️ Aucune copie au runtime n'est nécessaire ni possible");
  console.log("ℹ️ (iOS sandbox empêche l'écriture dans Library/Sounds)");
  console.log("═══════════════════════════════════════════════════════════");
}

/* ANCIEN CODE - NE FONCTIONNE PAS SUR iOS (sandbox interdit Library/Sounds)
  try {
    // Le dossier Library/Sounds doit être dans le dossier de l'app
    // FileSystem.documentDirectory pointe vers Documents/
    // On remonte d'un niveau pour accéder à Library/Sounds
    console.log('[iosSoundsSetup] 📂 Calcul du chemin Library/Sounds...');
    console.log(`[iosSoundsSetup] documentDirectory: ${FileSystem.documentDirectory}`);
    
    const libraryPath = FileSystem.documentDirectory!.replace('Documents/', 'Library/');
    const soundsPath = `${libraryPath}Sounds`;
    
    console.log(`[iosSoundsSetup] ✅ Chemin calculé: ${soundsPath}`);
    
    // Créer le dossier Library/Sounds s'il n'existe pas
    console.log('[iosSoundsSetup] 🔍 Vérification existence du dossier...');
    const dirInfo = await FileSystem.getInfoAsync(soundsPath);
    console.log(`[iosSoundsSetup] Résultat: exists=${dirInfo.exists}, isDirectory=${dirInfo.isDirectory}`);
    
    if (!dirInfo.exists) {
      console.log('[iosSoundsSetup] 📁 Création du dossier Library/Sounds...');
      try {
        await FileSystem.makeDirectoryAsync(soundsPath, { intermediates: true });
        console.log('[iosSoundsSetup] ✅ Dossier créé avec succès');
      } catch (dirError) {
        console.error('[iosSoundsSetup] ❌ ERREUR création dossier:', dirError);
        throw dirError;
      }
    } else {
      console.log('[iosSoundsSetup] ✅ Dossier existe déjà');
    }

    // Copier chaque fichier son depuis les assets vers Library/Sounds
    let copiedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    console.log(`[iosSoundsSetup] 🎵 Début copie des ${SOUND_FILES.length} fichiers MP3...`);
    
    for (const soundName of SOUND_FILES) {
      console.log(`[iosSoundsSetup] ───────────────────────────────────────`);
      console.log(`[iosSoundsSetup] 🎵 Traitement: ${soundName}.mp3`);
      
      try {
        const destPath = `${soundsPath}/${soundName}.mp3`;
        console.log(`[iosSoundsSetup]    Destination: ${destPath}`);
        
        // Vérifier si le fichier existe déjà
        const fileInfo = await FileSystem.getInfoAsync(destPath);
        if (fileInfo.exists) {
          console.log(`[iosSoundsSetup]    ℹ️ Fichier déjà présent, skip`);
          skippedCount++;
          continue;
        }

        // Charger l'asset depuis assets/sounds/
        console.log(`[iosSoundsSetup]    📦 Chargement de l'asset depuis le bundle...`);
        const assetModule = {
          'adhanaljazaer': require('../assets/sounds/adhanaljazaer.mp3'),
          'adhamalsharqawe': require('../assets/sounds/adhamalsharqawe.mp3'),
          'ahmadelkourdi': require('../assets/sounds/ahmadelkourdi.mp3'),
          'ahmadnafees': require('../assets/sounds/ahmadnafees.mp3'),
          'dubai': require('../assets/sounds/dubai.mp3'),
          'islamsobhi': require('../assets/sounds/islamsobhi.mp3'),
          'karljenkins': require('../assets/sounds/karljenkins.mp3'),
          'mansourzahrani': require('../assets/sounds/mansourzahrani.mp3'),
          'masjidquba': require('../assets/sounds/masjidquba.mp3'),
          'misharyrachid': require('../assets/sounds/misharyrachid.mp3'),
          'mustafaozcan': require('../assets/sounds/mustafaozcan.mp3'),
        }[soundName];

        if (!assetModule) {
          console.error(`[iosSoundsSetup]    ❌ Asset module introuvable pour: ${soundName}`);
          errorCount++;
          continue;
        }

        console.log(`[iosSoundsSetup]    ✅ Asset module chargé`);
        console.log(`[iosSoundsSetup]    📥 Téléchargement de l'asset...`);
        
        const asset = Asset.fromModule(assetModule);
        console.log(`[iosSoundsSetup]    Asset créé: ${JSON.stringify({
          name: asset.name,
          type: asset.type,
          hash: asset.hash,
          uri: asset.uri,
          width: asset.width,
          height: asset.height
        })}`);
        
        await asset.downloadAsync();
        console.log(`[iosSoundsSetup]    ✅ Asset téléchargé`);
        console.log(`[iosSoundsSetup]    localUri: ${asset.localUri}`);

        if (asset.localUri) {
          // Copier le fichier vers Library/Sounds
          console.log(`[iosSoundsSetup]    📋 Copie de ${asset.localUri} vers ${destPath}...`);
          await FileSystem.copyAsync({
            from: asset.localUri,
            to: destPath,
          });
          console.log(`[iosSoundsSetup]    ✅ COPIÉ: ${soundName}.mp3`);
          copiedCount++;
        } else {
          console.error(`[iosSoundsSetup]    ❌ asset.localUri est null/undefined`);
          errorCount++;
        }
      } catch (error) {
        console.error(`[iosSoundsSetup]    ❌ ERREUR lors de la copie de ${soundName}:`, error);
        console.error(`[iosSoundsSetup]    Stack:`, (error as Error).stack);
        errorCount++;
      }
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`[iosSoundsSetup] ✅ Configuration terminée:`);
    console.log(`[iosSoundsSetup]    - ${copiedCount} sons copiés avec succès`);
    console.log(`[iosSoundsSetup]    - ${skippedCount} sons déjà présents`);
    console.log(`[iosSoundsSetup]    - ${errorCount} erreurs`);
    console.log('═══════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('[iosSoundsSetup] ❌ ERREUR FATALE configuration sons:', error);
    console.error('[iosSoundsSetup] Stack:', (error as Error).stack);
    console.error('═══════════════════════════════════════════════════════════');
    throw error;
  }
*/

/**
 * Obtient le chemin du son pour les notifications iOS
 */
export function getIosSoundPath(soundName: string): string {
  if (Platform.OS !== "ios") {
    return soundName;
  }

  // UNNotificationSound cherche les sons dans Library/Sounds/
  // Il faut juste donner le nom du fichier (sans le chemin)
  return `${soundName}.mp3`;
}

/**
 * Vérifie l'état des sons dans le bundle iOS (pour debug)
 */
export async function checkIosSoundsStatus(currentSound?: string): Promise<{
  libraryPath: string;
  soundsPath: string;
  directoryExists: boolean;
  availableSounds: string[];
  totalSounds: number;
  currentSoundExists: boolean;
  currentSoundPath?: string;
}> {
  if (Platform.OS !== "ios") {
    return {
      libraryPath: "N/A",
      soundsPath: "N/A",
      directoryExists: false,
      availableSounds: [],
      totalSounds: 0,
      currentSoundExists: false,
    };
  }

  try {
    console.log(
      "[checkIosSoundsStatus] 🔍 Vérification des sons dans le bundle iOS..."
    );
    console.log(
      "[checkIosSoundsStatus] ℹ️ Les sons sont inclus lors du build EAS"
    );
    console.log(
      "[checkIosSoundsStatus] ℹ️ par le hook eas-hooks/eas-build-post-install.sh"
    );

    // Utiliser le module natif pour lister les MP3 dans le bundle
    // (Évite les require() qui crashent si les fichiers ne sont pas dans Metro)
    const { NativeModules } = require("react-native");
    const { AdhanModule } = NativeModules;

    if (!AdhanModule || !AdhanModule.listAvailableSounds) {
      console.error(
        "[checkIosSoundsStatus] ❌ AdhanModule.listAvailableSounds non disponible"
      );
      return {
        libraryPath: "Erreur: module natif non disponible",
        soundsPath: "Erreur",
        directoryExists: false,
        availableSounds: [],
        totalSounds: 0,
        currentSoundExists: false,
      };
    }

    console.log("[checkIosSoundsStatus] 📞 Appel du module natif Swift...");
    const result = await AdhanModule.listAvailableSounds();
    const availableSounds: string[] = result.sounds || [];
    const bundlePath: string = result.bundlePath || "N/A";

    console.log(
      `[checkIosSoundsStatus] ✅ ${availableSounds.length} sons disponibles dans le bundle`
    );

    if (availableSounds.length > 0) {
      console.log("[checkIosSoundsStatus] 📋 Liste des sons:");
      availableSounds.forEach((sound) => console.log(`   - ${sound}`));
    }

    // Vérifier si le son actuel existe
    let currentSoundExists = false;
    if (currentSound) {
      const soundFileName = `${currentSound}.mp3`;
      currentSoundExists = availableSounds.includes(soundFileName);

      if (currentSoundExists) {
        console.log(
          `[checkIosSoundsStatus] ✅ Son actuel (${soundFileName}) est disponible`
        );
      } else {
        console.log(
          `[checkIosSoundsStatus] ❌ Son actuel (${soundFileName}) NON disponible`
        );
      }
    }

    return {
      libraryPath: bundlePath,
      soundsPath: "Bundle iOS (copié pendant EAS Build)",
      directoryExists: availableSounds.length > 0,
      availableSounds,
      totalSounds: availableSounds.length,
      currentSoundExists,
      currentSoundPath: currentSoundExists
        ? `Bundle: ${currentSound}.mp3`
        : undefined,
    };
  } catch (error) {
    console.error("[checkIosSoundsStatus] ❌ Erreur:", error);
    return {
      libraryPath: "Erreur",
      soundsPath: "Erreur",
      directoryExists: false,
      availableSounds: [],
      totalSounds: 0,
      currentSoundExists: false,
    };
  }
}
