import React, { useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  FlatList,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTranslation } from "react-i18next";

const bgImage = require("../assets/images/prayer-bg.png");
type Nom = {
  key: string;
  arabic: string;
  translit: string;
  french: string;
  meaning: string;
};

const names: Nom[] = [
  {
    key: "allah",
    arabic: "الله",
    translit: "Allah",
    french: "Allah",
    meaning:
      "« Le Dieu » littéralement, le seul qui mérite l’adoration des croyants",
  },
  {
    key: "arRahman",
    arabic: "الرحمن",
    translit: "Ar-Rahmān",
    french: "Le tout Miséricordieux",
    meaning:
      "Celui qui pardonne, qui a de la compassion et qui accorde les bienfaits aux musulmans",
  },
  {
    key: "arRahim",
    arabic: "الرحيم",
    translit: "Ar-Rahīm",
    french: "Le Très Miséricordieux",
    meaning:
      "Celui qui pardonne, qui a de la compassion et qui accorde les bienfaits aux musulmans",
  },
  {
    key: "alMalik",
    arabic: "الملك",
    translit: "Al-Malik",
    french: "Le Souverain",
    meaning: "Le Souverain, Le Roi, Le suzerain",
  },
  {
    key: "alQuddus",
    arabic: "القدوس",
    translit: "Al-Quddūs",
    french: "Le Saint",
    meaning:
      "Représente tous les saints, ce nom est même plus proche de l’infiniment saint",
  },
  {
    key: "asSalam",
    arabic: "السلام",
    translit: "As-Salām",
    french: "La Paix",
    meaning:
      "Allah répand la paix sur l’univers, la sécurité et le salut de l’humanité.",
  },
  {
    key: "alMumin",
    arabic: "المؤمن",
    translit: "Al-Mu’min",
    french: "La Sauvegarde",
    meaning: "Le Fidèle, le Sécurisant, le confiant",
  },
  {
    key: "alMuhaymin",
    arabic: "المهيمن",
    translit: "Al-Mouhaymin",
    french: "Le Préservateur",
    meaning:
      "Le Surveillant, le Témoin, le Préservateur, le Dominateur, souligne l’omniscience d’Allah",
  },
  {
    key: "alAziz",
    arabic: "العزيز",
    translit: "Al-‘Aziz",
    french: "Le Tout Puissant",
    meaning:
      "Celui qui détient l’infinie puissance, celui que l’on chérit et que l’on adore",
  },
  {
    key: "alJabbar",
    arabic: "الجبار",
    translit: "Al-Djabbār",
    french: "Celui qui domine et contraint",
    meaning: "Celui qui pose et lève les contraintes, régit l’univers",
  },
  {
    key: "alMutakabbir",
    arabic: "المتكبر",
    translit: "Al-Mutakabbir",
    french: "L’inaccessible",
    meaning: "Le Superbe, Celui qui se magnifie",
  },
  {
    key: "alKhaliq",
    arabic: "الخالق",
    translit: "Al-Khāliq",
    french: "Le Créateur",
    meaning:
      "Le Créateur, le Déterminant, Celui qui donne la mesure de toute chose",
  },
  {
    key: "alBari",
    arabic: "البارئ",
    translit: "Al-Bāri’",
    french: "Le Producteur",
    meaning: "Le Créateur, le Producteur, le Novateur",
  },
  {
    key: "alMusawwir",
    arabic: "المصور",
    translit: "Al-Musawwir",
    french: "Celui qui façonne ses créatures",
    meaning:
      "Celui qui crée les créatures sous différents aspects, différentes formes et en nombres différents",
  },
  {
    key: "alGhaffar",
    arabic: "الغفار",
    translit: "Al-Ghaffār",
    french: "Qui absout beaucoup",
    meaning: "Celui qui pardonne les péchés des croyants",
  },
  {
    key: "alQahhar",
    arabic: "القهار",
    translit: "Al-Qahhār",
    french: "L’Irrésistible",
    meaning: "Le Tout et Très Contraignant, le Dominateur Suprême",
  },
  {
    key: "alWahhab",
    arabic: "الوهاب",
    translit: "Al-Wahhāb",
    french: "Le Très Généreux",
    meaning: "Celui qui donne sans attendre de recevoir",
  },
  {
    key: "arRazzaq",
    arabic: "الرزاق",
    translit: "Ar-Razzāq",
    french: "Celui qui accorde la subsistance",
    meaning:
      "Celui qui accorde la subsistance à toutes les créatures sur la Terre",
  },
  {
    key: "alFattah",
    arabic: "الفتاح",
    translit: "Al-Fattāh",
    french: "Celui qui accorde la victoire",
    meaning:
      "Celui qui ouvre les portes du succès, de la subsistance et des solutions. Celui qui accorde la victoire, la guidance, et juge entre les créatures.",
  },
  {
    key: "alAlim",
    arabic: "العليم",
    translit: "Al-‘Alīm",
    french: "L’Omniscient",
    meaning: "Le Très-Savant, l’Omniscient",
  },
  {
    key: "alQabid",
    arabic: "القابض",
    translit: "Al-Qabid",
    french: "Celui qui retient et qui rétracte",
    meaning: "Celui qui retient et qui rétracte conformément à une sagesse",
  },
  {
    key: "alBasit",
    arabic: "الباسط",
    translit: "Al-Bāsit",
    french: "Celui qui étend Sa générosité",
    meaning:
      "Celui qui augmente et multiplie la subsistance conformément à une perfection et sans la moindre imperfection",
  },
  {
    key: "alKhafid",
    arabic: "الخافض",
    translit: "Al-Khāfid",
    french: "Celui qui abaisse",
    meaning:
      "Celui qui destine les oppresseurs et les orgueilleux au rabaissement et au châtiment",
  },
  {
    key: "arRafi",
    arabic: "الرافع",
    translit: "Ar-Rāfi‘",
    french: "Celui qui élève",
    meaning:
      "Celui qui destine les ‘awliya’, i-e les saints, à l’adoration qui leur apporte l’honneur et les hauts degrés",
  },
  {
    key: "alMuizz",
    arabic: "المعز",
    translit: "Al-Mu‘izz",
    french: "Celui qui rend puissant",
    meaning:
      "Celui qui destine aux ‘awliya’, i-e aux saints, les bienfaits durables du Paradis",
  },
  {
    key: "alMuzil",
    arabic: "المذل",
    translit: "Al-Moudhill",
    french: "Celui qui humilie les fiers",
    meaning: "Celui qui destine les non-croyants à un séjour en enfer",
  },
  {
    key: "asSami",
    arabic: "السميع",
    translit: "As-Samī‘",
    french: "L’Audient, Celui qui entend toute chose",
    meaning:
      "Celui qui entend tout, celui qui accorde les demandes à ceux qui l’invoquent",
  },
  {
    key: "alBasir",
    arabic: "البصير",
    translit: "Al-Basīr",
    french: "Le Voyant, Celui qui voit toute chose",
    meaning: "Celui qui voit toute créature ou chose qui existe",
  },
  {
    key: "alHakam",
    arabic: "الحكم",
    translit: "Al-Hakam",
    french: "L’Arbitre",
    meaning: "Celui qui départage les créatures et installe l’équité",
  },
  {
    key: "alAdl",
    arabic: "العدل",
    translit: "Al-‘Adl",
    french: "Le Juste",
    meaning: "Exempté de toute injustice ou inégalité",
  },
  {
    key: "alLatif",
    arabic: "اللطيف",
    translit: "Al-Latīf",
    french: "Le Bon dans l’épreuve",
    meaning: "Celui qui octroie assez de bienfaits",
  },
  {
    key: "alKhabir",
    arabic: "الخبير",
    translit: "Al-Khabīr",
    french: "Le Bien-Informé",
    meaning: "Rien ne lui échappe",
  },
  {
    key: "alHalim",
    arabic: "الحليم",
    translit: "Al-Halīm",
    french: "Le Doux, le Très Clément",
    meaning: "Celui qui est affectueux",
  },
  {
    key: "alAzim",
    arabic: "العظيم",
    translit: "Al-Adhīm",
    french: "L’Immense, l’Eminent",
    meaning: "Son influence est totale",
  },
  {
    key: "alGhafur",
    arabic: "الغفور",
    translit: "Al-Ḡafhūr",
    french: "Qui Pardonne",
    meaning: "Celui qui pardonne plusieurs fois sans compter",
  },
  {
    key: "ashShakur",
    arabic: "الشكور",
    translit: "Ash-Shakūr",
    french: "Le Très-Reconnaissant",
    meaning:
      "Attribut d’immenses récompenses pour des adorations faciles à réaliser",
  },
  {
    key: "alAli",
    arabic: "العلي",
    translit: "Al-‘Ali",
    french: "L’Elevé",
    meaning: "Le Sublime, l’Elevé, le Très-Haut",
  },
  {
    key: "alKabir",
    arabic: "الكبير",
    translit: "Al-Kabīr",
    french: "L’Infiniment Grand",
    meaning: "L’Infiniment Grand, plus élevé en Qualités que Ses créatures",
  },
  {
    key: "alHafiz",
    arabic: "الحفيظ",
    translit: "Al-Hafīdh",
    french: "Le Gardien",
    meaning:
      "Celui qui protège et préserve les créatures du mal, des préjudices et de la perdition selon une destinée créée",
  },
  {
    key: "alMuqit",
    arabic: "المقيت",
    translit: "Al-Muqīt",
    french: "Qui nourrit tout le monde",
    meaning: "Accorde tous les moyens de subsistance nécessaires",
  },
  {
    key: "alHasib",
    arabic: "الحسيب",
    translit: "Al-Hasīb",
    french: "Qui règle le compte de tout le monde",
    meaning: "Celui qui tient compte de tout, Celui qui suffit à ses créatures",
  },
  {
    key: "alJalil",
    arabic: "الجليل",
    translit: "Al-Jalīl",
    french: "Le Majestueux",
    meaning:
      "Le Majestueux, qui s’attribue la grandeur du Pouvoir et la Gloire de Sa dignité",
  },
  {
    key: "alKarim",
    arabic: "الكريم",
    translit: "Al-Karīm",
    french: "Le Noble",
    meaning: "Le Tout-Généreux, le Noble-Généreux, pur de toute abjection",
  },
  {
    key: "arRaqib",
    arabic: "الرقيب",
    translit: "Ar-Raqīb",
    french: "L’Observateur",
    meaning: "Le Vigilant, Celui qui observe",
  },
  {
    key: "alMujib",
    arabic: "المجيب",
    translit: "Al-Mujīb",
    french: "Celui qui exauce les prières",
    meaning:
      "Celui qui exauce, Celui qui répond au nécessiteux et au désireux qui Le prie",
  },
  {
    key: "alWasi",
    arabic: "الواسع",
    translit: "Al-Wāsi‘",
    french: "Le Vaste",
    meaning: "L’Ample, le Vaste, l’Immense",
  },
  {
    key: "alHakim",
    arabic: "الحكيم",
    translit: "Al-Hakīm",
    french: "Le Sage",
    meaning: "L’Infiniment Sage",
  },
  {
    key: "alWadud",
    arabic: "الودود",
    translit: "Al-Wadūd",
    french: "Qui aime beaucoup",
    meaning: "Le Bien-Aimant, le Bien-Aimé",
  },
  {
    key: "alMajid",
    arabic: "المجيد",
    translit: "Al-Majīd",
    french: "Le Très Glorieux",
    meaning:
      "Le Très Glorieux, doté d’un Pouvoir parfait, de Haute Dignité, de Compassion, de Générosité et de Douceur",
  },
  {
    key: "alBaith",
    arabic: "الباعث",
    translit: "Al-Bā‘ith",
    french: "Qui ressuscite",
    meaning:
      "Celui qui ressuscite Ses serviteurs après la mort, Celui qui incite",
  },
  {
    key: "ashShahid",
    arabic: "الشهيد",
    translit: "Ashahīd",
    french: "Le Témoin",
    meaning: "Le Témoin, qui n’ignore rien de ce qui arrive",
  },
  {
    key: "alHaqq",
    arabic: "الحق",
    translit: "Al-Haqq",
    french: "Le Vrai",
    meaning: "Le Vrai, dont l’Existence est la seule véritable",
  },
  {
    key: "alWakil",
    arabic: "الوكيل",
    translit: "Al-Wakīl",
    french: "Le Tuteur",
    meaning:
      "Le Gérant, l’Intendant, Celui à qui on se confie et dont le soutien ne fléchit jamais",
  },
  {
    key: "alQawi",
    arabic: "القوي",
    translit: "Al-Qawi",
    french: "Le Fort",
    meaning:
      "Le Très-Fort, le Très-Puissant, Celui qui possède le Pouvoir complet",
  },
  {
    key: "alMatin",
    arabic: "المتين",
    translit: "Al-Matīn",
    french: "Le Robuste",
    meaning:
      "Le Très-Ferme, l’Inébranlable qui jamais ne fléchit ou ne fatigue",
  },
  {
    key: "alWali",
    arabic: "الولي",
    translit: "Al-Wa’li",
    french: "Le Protecteur",
    meaning:
      "Celui préserve les serviteurs croyants, ainsi les prophètes et ceux qui les respectent et les suivent",
  },
  {
    key: "alHamid",
    arabic: "الحميد",
    translit: "Al-Hamīd",
    french: "Le Louable",
    meaning:
      "Celui qui mérite plus que tout autre le remerciement, la glorification et le chant d’éloge",
  },
  {
    key: "alMuhsi",
    arabic: "المحصي",
    translit: "Al-Muhsi",
    french: "Qui connaît les comptes de tous",
    meaning:
      "Celui dont le savoir cerne toute chose, Celui qui garde en compte",
  },
  {
    key: "alMubdi",
    arabic: "المبدئ",
    translit: "Al-Mubdi‘",
    french: "L’Auteur",
    meaning: "Celui qui produit sans modèle, Celui qui donne l’Origine",
  },
  {
    key: "alMuid",
    arabic: "المعيد",
    translit: "Al-Mu‘īd",
    french: "Qui fait rentrer tout le monde dans le néant",
    meaning:
      "Celui qui redonne existence après la mort, Celui qui réintègre, qui répète",
  },
  {
    key: "alMuhyi",
    arabic: "المحيي",
    translit: "Al-Muhyī",
    french: "Qui donne la vie",
    meaning: "Celui qui fait vivre, qui donne la vie",
  },
  {
    key: "alMumit",
    arabic: "المميت",
    translit: "Al-Mumīt",
    french: "Qui donne la mort",
    meaning: "Celui qui fait mourir le vivant",
  },
  {
    key: "alHayy",
    arabic: "الحي",
    translit: "Al-Hayy",
    french: "Le Vivant",
    meaning: "Le Vivant, dont la vie est différente de notre vie",
  },
  {
    key: "alQayyum",
    arabic: "القيوم",
    translit: "Al-Qayyūm",
    french: "L’Immuable",
    meaning: "L’Immuable, le Subsistant par Soi",
  },
  {
    key: "alWajid",
    arabic: "الواجد",
    translit: "Al-Wājid",
    french: "Qui existe",
    meaning: "L’Opulent, Celui qui trouve tout ce qu’Il veut",
  },
  {
    key: "alMajid",
    arabic: "الماجد",
    translit: "Al-Mājid",
    french: "L’Illustre",
    meaning: "Le Noble, le Majestueux, Celui qui a plein de Gloire",
  },
  {
    key: "alWahid",
    arabic: "الواحد",
    translit: "Al-Wāhid",
    french: "L’Unique",
    meaning: "L’Unique, sans associé, le Seul, l’Un",
  },
  {
    key: "asSamad",
    arabic: "الصمد",
    translit: "As-Samad",
    french: "L’ Eternel Seigneur",
    meaning:
      "Le Maître absolu, le Soutien universel, Celui en qui on place sa confiance",
  },
  {
    key: "alQadir",
    arabic: "القادر",
    translit: "Al-Qādir",
    french: "Le Déterminant",
    meaning: "Le Puissant, le Déterminant, le Détenteur du pouvoir",
  },
  {
    key: "alMuqtadir",
    arabic: "المقتدر",
    translit: "Al-Muqtadir",
    french: "Le Tout Puissant",
    meaning: "Celui qui a pouvoir sur tout, le Détenteur Absolu du pouvoir",
  },
  {
    key: "alMuqaddim",
    arabic: "المقدم",
    translit: "Al-Muqaddim",
    french: "Qui a tout précédé",
    meaning: "Celui qui met en avant, Celui qui précède ou devance",
  },
  {
    key: "alMuakhkhir",
    arabic: "المؤخر",
    translit: "Al-Mu’akhir",
    french: "Celui qui retarde / diffère",
    meaning:
      "Celui qui remet à plus tard, qui place qui Il veut à l’arrière, selon Sa sagesse et Sa volonté.",
  },
  {
    key: "alAwwal",
    arabic: "الأول",
    translit: "Al-Awwal",
    french: "Le Premier, dont l’existence n’a pas de début",
    meaning: "Celui qui existe sans entrer en existence",
  },
  {
    key: "alAkhir",
    arabic: "الآخر",
    translit: "Al-Ākhir",
    french: "Le Dernier, dont l’existence n’a pas de fin",
    meaning: "Celui qui est éternel",
  },
  {
    key: "adhDhahir",
    arabic: "الظاهر",
    translit: "Adh-Dhāhir",
    french: "L’Extérieur, l’Apparent",
    meaning: "Celui dont l’existence se manifeste partout dans l’univers",
  },
  {
    key: "alBatin",
    arabic: "الباطن",
    translit: "Al-Bātin",
    french: "L’Intérieur, le Caché",
    meaning:
      "Notion de transcendance, Allah est partout, même dans ce que l’on ne voit pas",
  },
  {
    key: "alWaliyy",
    arabic: "الواليي",
    translit: "Al-Wāly",
    french: "Le Monarque",
    meaning: "Le Maître très proche, Celui qui dirige",
  },
  {
    key: "alMutaali",
    arabic: "المتعالي",
    translit: "Al-Muta’āli",
    french: "Le Sublime",
    meaning: "L’Exalté, l’Elevé, pur de tout attribut de la création",
  },
  {
    key: "alBarr",
    arabic: "البر",
    translit: "Al-Barr",
    french: "Le Bienfaiteur",
    meaning: "Le Bon, le Bienveillant, le Bienfaisant, envers ses créatures",
  },
  {
    key: "atTawwab",
    arabic: "التواب",
    translit: "At-Tawwab",
    french: "Qui ne cesse d’accueillir le repentir",
    meaning:
      "Celui qui ne cesse d’accueillir le repentir sincère de ses adorateurs et qui leur accorde Son Pardon",
  },
  {
    key: "alMuntaqim",
    arabic: "المنتقم",
    translit: "Al-Muntaqim",
    french: "Le Vengeur",
    meaning:
      "Celui qui a le dessus sur Ses ennemis et les punit pour leurs péchés",
  },
  {
    key: "alAfuww",
    arabic: "العفو",
    translit: "Al-Afuww",
    french: "L’Indulgent",
    meaning: "Celui qui efface, l’Indulgent dont le pardon est large",
  },
  {
    key: "arRauf",
    arabic: "الرؤوف",
    translit: "Al-Ra’ūf",
    french: "Le Bienveillant en grâce",
    meaning: "Le Très-Doux, le Très-Bienveillant, à la miséricorde extrême",
  },
  {
    key: "malikulMulk",
    arabic: "مالك الملك",
    translit: "Mālik-ul-Mulk",
    french: "Le Maître du Pouvoir",
    meaning:
      "Le Possesseur du Royaume, qui contrôle son règne et donne un règne à qui Il veut",
  },
  {
    key: "dhulJalaliWalIkram",
    arabic: "ذو الجلال و الإكرام",
    translit: "Dhul-Jalāli-wal-Ikrām",
    french: "Détenteur de Majesté qui mérite d’être Exalté",
    meaning:
      "Le Détenteur de la Majesté et de la Générosité, qui mérite d’être Exalté et non renié",
  },
  {
    key: "alMuqsit",
    arabic: "المقسط",
    translit: "Al-Muqsit",
    french: "L’Equitable",
    meaning: "Celui qui rend justice, sans léser quiconque",
  },
  {
    key: "alJami",
    arabic: "الجامع",
    translit: "Al-Jāmi‘",
    french: "Le Rassembleur",
    meaning: "Celui qui rassemble, qui réunit",
  },
  {
    key: "alGhani",
    arabic: "الغني",
    translit: "Al-Ḡhani",
    french: "Le Riche par excellence",
    meaning: "Le Suffisant par soi, Celui qui n’a besoin de personne",
  },
  {
    key: "alMughni",
    arabic: "المغنى",
    translit: "Al-Mughni",
    french: "Qui satisfait les besoins de Ses créatures",
    meaning:
      "Celui qui confère la suffisance et satisfait les besoins de Ses créatures",
  },
  {
    key: "alMani",
    arabic: "المانع",
    translit: "Al-Māni‘",
    french: "Le Défenseur",
    meaning:
      "Celui qui empêche, Celui qui protège et donne victoire à Ses pieux croyants",
  },
  {
    key: "adDarr",
    arabic: "الضار",
    translit: "Ad-Dār",
    french: "Qui peut nuire (à ceux qui L’offensent)",
    meaning: "Celui qui contrarie, Celui qui peut nuire à ceux qui L’offensent",
  },
  {
    key: "anNafi",
    arabic: "النافع",
    translit: "An-Nāfi‘",
    french: "L’Utile",
    meaning:
      "Celui qui accorde le profit, l’Utile, Celui qui facilite à qui Il veut",
  },
  {
    key: "anNur",
    arabic: "النور",
    translit: "An-Nūr",
    french: "La Lumière",
    meaning: "Celui qui guide les croyants vers la lumière de la foi",
  },
  {
    key: "alHadi",
    arabic: "الهادي",
    translit: "Al-Hādi",
    french: "Le Guide",
    meaning:
      "Celui qui destine à certaines créatures de bénéficier de la guidée et de la droiture",
  },
  {
    key: "alBadi",
    arabic: "البديع",
    translit: "Al-Badī‘",
    french: "L’inventeur",
    meaning:
      "Le Novateur, Celui qui a créé toute chose et les a formées sans exemple précédent",
  },
  {
    key: "alBaqi",
    arabic: "الباقي",
    translit: "Al-Baqi",
    french: "Le Permanent",
    meaning:
      "Son existence est éternelle. Il est impossible de penser sa non existence",
  },
  {
    key: "alWarith",
    arabic: "الوارث",
    translit: "Al-Wārith",
    french: "L’Héritier",
    meaning:
      "Celui qui existe et ne change pas alors que les créatures sont anéanties",
  },
  {
    key: "arRashid",
    arabic: "الرشيد",
    translit: "Ar-Rashīd",
    french: "Qui agit avec droiture",
    meaning: "Celui qui agit avec droiture, Celui qui dirige avec sagesse",
  },
  {
    key: "asSabur",
    arabic: "الصبور",
    translit: "As-Sabur",
    french: "Le Patient",
    meaning: "Le Très-Constant, qui recule la punition des pécheurs",
  },
];
const namesWithNumber = names.map((n, i) => ({ ...n, number: i + 1 }));

const HEADER_HEIGHT = 110;

function removeAccents(str: string) {
  return (
    str
      // Pour le français/translit
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Pour l’arabe, enlève les harakat
      .replace(/[\u064B-\u0652]/g, "")
  );
}

const AsmaulHusnaScreen = () => {
  const [search, setSearch] = useState("");
  const { t: tMain } = useTranslation(); // Pour les titres, placeholders, etc (namespace 'translation')
  const { t: tAsma } = useTranslation("asmaulhusna"); // Pour les 99 noms et leurs significations
  const insets = useSafeAreaInsets();

  const filteredNames = namesWithNumber.filter((item, idx) => {
    const query = removeAccents(search.trim().toLowerCase());
    if (!query) return true;

    // Récupère la traduction depuis le namespace "asmaulhusna"
    const name = tAsma(`asmaulhusna_${item.key}`);
    const meaning = tAsma(`asmaulhusna_${item.key}_meaning`);

    return (
      (idx + 1).toString().includes(query) ||
      removeAccents(item.arabic).includes(query) ||
      removeAccents(item.translit.toLowerCase()).includes(query) ||
      removeAccents(name.toLowerCase()).includes(query) ||
      removeAccents(meaning.toLowerCase()).includes(query)
    );
  });

  return (
    <ImageBackground source={bgImage} style={styles.background}>
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.header}>{tMain("asmaulhusna_title")}</Text>
        <TextInput
          placeholder={tMain("asmaulhusna_search_placeholder")}
          value={search}
          onChangeText={setSearch}
          style={styles.searchBar}
          placeholderTextColor="#b6a47e"
        />
      </View>
      <FlatList
        data={filteredNames}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <ImageBackground
            source={bgImage}
            style={styles.cardBG}
            imageStyle={{ borderRadius: 18, resizeMode: "cover" }}
          >
            <View style={styles.cardContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.arabic}>
                  {item.number}. {item.arabic}
                </Text>
                <Text style={styles.translit}>
                  {item.translit} — {tAsma(`asmaulhusna_${item.key}`)}
                </Text>
                <Text style={styles.meaning}>
                  {tAsma(`asmaulhusna_${item.key}_meaning`)}
                </Text>
              </View>
            </View>
          </ImageBackground>
        )}
        contentContainerStyle={{
          ...styles.container,
          paddingBottom: insets.bottom + 10,
        }}
        keyboardShouldPersistTaps="handled"
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
    backgroundColor: "#f5eee1",
  },
  headerContainer: {
    // plus de position/top/width ici
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    color: "#744c10",
    textShadowColor: "#fff9e6",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 8,
  },
  searchBar: {
    width: "90%",
    backgroundColor: "#fff8ec",
    borderRadius: 8,
    fontSize: 16,
    color: "#744c10",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#e4d4b8",
    marginTop: 2,
    marginBottom: 8,
  },
  container: {
    padding: 18,
    paddingBottom: 32,
  },
  cardBG: {
    borderRadius: 18,
    overflow: "hidden",
    marginVertical: 8,
    minHeight: 90,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 18,
  },
  arabic: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#b37a22",
    textAlign: "right",
    marginBottom: 4,
  },
  translit: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7d5a27",
    marginBottom: 2,
    textAlign: "left",
  },
  meaning: {
    fontSize: 13,
    color: "#333",
    fontStyle: "italic",
    textAlign: "left",
    marginTop: 2,
  },
});

export default AsmaulHusnaScreen;
