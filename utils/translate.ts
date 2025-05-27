import axios from "axios";

const API_KEY = "AIzaSyDKpAPxDvTyGCye8TKYa7dTWz1LTeLZu_o"; // Mets ta clé API ici

async function translateText(text: string, targetLang: string) {
  try {
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
      {
        q: text,
        target: targetLang,
        format: "text",
      }
    );
    return response.data.data.translations[0].translatedText;
  } catch (error) {
    console.error("Erreur traduction:", error);
    return text; // En cas d’erreur, renvoyer le texte original
  }
}

export default translateText;
