// Android : pas de GIF animés embarqués (~7 Mo économisés) — images statiques uniquement.
import audioWave3Fix from "../assets/images/gif/audio_wave3_fix.png";
import chuteFix from "../assets/images/gif/chute_fix.png";
import riviereFix from "../assets/images/gif/riviere_fix.png";
import alqudsFix from "../assets/images/gif/alquds_fix.png";
import madinaFix from "../assets/images/gif/madina_fix.png";
import makkaFix from "../assets/images/gif/makka_fix.png";

export type AudioGifType =
  | "audio_wave3"
  | "chute"
  | "riviere"
  | "alquds"
  | "madina"
  | "makka";

export const AVAILABLE_GIFS = {
  audio_wave3: {
    id: "audio_wave3" as AudioGifType,
    name: "Ondes Audio",
    gifImage: audioWave3Fix,
    fixImage: audioWave3Fix,
    premium: false,
  },
  chute: {
    id: "chute" as AudioGifType,
    name: "Cascade",
    gifImage: chuteFix,
    fixImage: chuteFix,
    premium: true,
  },
  riviere: {
    id: "riviere" as AudioGifType,
    name: "Rivière",
    gifImage: riviereFix,
    fixImage: riviereFix,
    premium: true,
  },
  alquds: {
    id: "alquds" as AudioGifType,
    name: "Al-Quds 🏛️",
    gifImage: alqudsFix,
    fixImage: alqudsFix,
    premium: true,
  },
  madina: {
    id: "madina" as AudioGifType,
    name: "Médine 🕌",
    gifImage: madinaFix,
    fixImage: madinaFix,
    premium: true,
  },
  makka: {
    id: "makka" as AudioGifType,
    name: "Makka 🕋",
    gifImage: makkaFix,
    fixImage: makkaFix,
    premium: true,
  },
};

export const AVAILABLE_GIFS_LIST = Object.values(AVAILABLE_GIFS);
