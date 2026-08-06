// Ce fichier remplace adhanIosAssets.ios.ts sur Android
// pour éviter d'inclure les sons lourds iOS dans le bundle.
// react-doctor-disable-next-line deslop/unused-export -- chargé dynamiquement via require("./adhanIosAssets"), invisible pour l'analyse statique
export const getAdhanIosSound = (soundName: string): any => {
  return null;
};
