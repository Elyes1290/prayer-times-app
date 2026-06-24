import audioWave3Gif from "../assets/images/gif/audio_wave3.gif";
import audioWave3Fix from "../assets/images/gif/audio_wave3_fix.png";
import chuteGif from "../assets/images/gif/chute.gif";
import chuteFix from "../assets/images/gif/chute_fix.png";
import riviereGif from "../assets/images/gif/riviere.gif";
import riviereFix from "../assets/images/gif/riviere_fix.png";
import alqudsGif from "../assets/images/gif/alquds.gif";
import alqudsFix from "../assets/images/gif/alquds_fix.png";
import madinaGif from "../assets/images/gif/madina.gif";
import madinaFix from "../assets/images/gif/madina_fix.png";
import makkaGif from "../assets/images/gif/makka.gif";
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
    gifImage: audioWave3Gif,
    fixImage: audioWave3Fix,
    premium: false,
  },
  chute: {
    id: "chute" as AudioGifType,
    name: "Cascade",
    gifImage: chuteGif,
    fixImage: chuteFix,
    premium: true,
  },
  riviere: {
    id: "riviere" as AudioGifType,
    name: "Rivière",
    gifImage: riviereGif,
    fixImage: riviereFix,
    premium: true,
  },
  alquds: {
    id: "alquds" as AudioGifType,
    name: "Al-Quds 🏛️",
    gifImage: alqudsGif,
    fixImage: alqudsFix,
    premium: true,
  },
  madina: {
    id: "madina" as AudioGifType,
    name: "Médine 🕌",
    gifImage: madinaGif,
    fixImage: madinaFix,
    premium: true,
  },
  makka: {
    id: "makka" as AudioGifType,
    name: "Makka 🕋",
    gifImage: makkaGif,
    fixImage: makkaFix,
    premium: true,
  },
};

export const AVAILABLE_GIFS_LIST = Object.values(AVAILABLE_GIFS);
