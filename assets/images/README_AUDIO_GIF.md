r# Guide : Ajouter un GIF animé pour la lecture audio 🎵

## Où placer le GIF

Remplace le fichier `assets/images/audio_wave.gif` par ton propre GIF animé.

## Spécifications recommandées

### Dimensions

- **Largeur** : 300-500px (pour couvrir toute la modal)
- **Hauteur** : 400-600px (pour couvrir toute la modal)
- **Ratio** : ~3:4 (portrait) ou optimisé pour mobile

### Format

- **Type** : GIF animé
- **Taille** : < 500KB pour de bonnes performances
- **Boucle** : Infinie (loop)
- **FPS** : 15-24 images/seconde

## Idées d'animations

### 🎵 Ondes sonores

- Barres d'égaliseur qui bougent
- Cercles qui s'agrandissent (comme des ondes)
- Forme d'onde audio animée

### 🎼 Éléments musicaux

- Notes de musique qui flottent
- Clé de sol qui brille
- Portée musicale animée

### 📿 Thème islamique

- Calligraphie arabe animée
- Géométrie islamique en mouvement
- Motifs traditionnels qui tournent

## Outils recommandés

### Création de GIF

- **Photoshop** : Animation timeline
- **After Effects** : Export GIF
- **Canva** : Templates GIF
- **GIMP** : Création gratuite

### Optimisation

- **TinyPNG** : Compression GIF
- **EZGIF** : Édition en ligne
- **ImageOptim** : Optimisation Mac

## Code d'intégration

Le GIF s'affiche automatiquement **en arrière-plan de toute la modal** pendant la lecture :

```javascript
<ImageBackground
  source={
    currentlyPlaying === currentRecitation?.id && isPlaying
      ? require("../assets/images/audio_wave.gif")
      : require("../assets/images/parchment_bg.jpg")
  }
  style={styles.audioModalContent}
  imageStyle={{
    borderRadius: 20,
    opacity: currentlyPlaying === currentRecitation?.id && isPlaying ? 0.4 : 0.3,
  }}
>
```

## Personnalisation des styles

Dans `QuranScreen.tsx`, tu peux modifier l'opacité et les effets :

```javascript
// Opacité du GIF en arrière-plan
imageStyle={{
  borderRadius: 20,
  opacity: currentlyPlaying === currentRecitation?.id && isPlaying ? 0.4 : 0.3,
}}

// Overlay pour la lisibilité du texte
backgroundColor: currentlyPlaying === currentRecitation?.id && isPlaying
  ? "rgba(255, 255, 255, 0.85)"  // Plus transparent avec GIF
  : "rgba(255, 255, 255, 0.95)"  // Moins transparent sans GIF
```

## Test de performance

1. **Lecture fluide** : Le GIF ne doit pas ralentir l'app
2. **Taille mémoire** : < 500KB recommandé
3. **Chargement** : Doit apparaître instantanément

## Exemples de sources

### Sites de GIF gratuits

- **Lottiefiles** : Animations vectorielles
- **Giphy** : Bibliothèque de GIF
- **Flaticon** : Icônes animées

### Thèmes recherchés

- "audio waves gif"
- "music animation gif"
- "sound visualizer gif"
- "islamic pattern animation"

---

**Note** : Pour de meilleures performances, considère utiliser Lottie au lieu de GIF pour des animations complexes.
