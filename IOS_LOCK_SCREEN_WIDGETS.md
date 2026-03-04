# 🔒 iOS LOCK SCREEN WIDGETS - Horaires de Prière

## ✅ WIDGETS DISPONIBLES

### 🏠 **HOME SCREEN** (Écran d'accueil)

| Taille | Description | Contenu |
|--------|-------------|---------|
| **Small** | Petit carré | Prochaine prière + liste compacte |
| **Medium** | Rectangle moyen | Prochaine prière + toutes les prières |
| **Large** | Grand rectangle | Prochaine prière + toutes les prières (grandes polices) |

**Design** :
- ✅ Images de fond personnalisées (5 moments de la journée)
- ✅ Overlay noir 25% pour lisibilité
- ✅ Prochaine prière mise en évidence
- ✅ Toutes les prières affichées

---

### 🔒 **LOCK SCREEN** (Écran de verrouillage - iOS 16+)

#### 🔵 **Widget Circular** (Rond)
```
┌─────────┐
│  🌆     │  ← Emoji de la prochaine prière
│ Maghrib │  ← Nom de la prière
│  18:23  │  ← Heure
└─────────┘
```
**Usage** : Widget compact, idéal pour un coup d'œil rapide

---

#### 📏 **Widget Rectangular** (Rectangle)
```
┌────────────────────────┐
│ 🌆 Maghrib  18:23 (gras)│  ← Prochaine prière
│ 🌙 Isha     19:45       │  ← 2e prière
│ 🌅 Fajr     05:30       │  ← 3e prière
└────────────────────────┘
```
**Usage** : Voir les 3 prochaines prières d'un coup

---

#### 📝 **Widget Inline** (Texte)
```
Au-dessus de l'heure du lock screen :
🌆 Maghrib à 18:23
```
**Usage** : Information discrète et élégante

---

## 📱 COMMENT AJOUTER LES WIDGETS

### **Home Screen** (écran d'accueil)
1. Long press sur l'écran d'accueil
2. Cliquer "+"
3. Chercher "MyAdhan"
4. Choisir "Horaires de Prière"
5. Sélectionner la taille (Small/Medium/Large)

### **Lock Screen** (écran de verrouillage - iOS 16+)
1. Long press sur l'écran de verrouillage
2. Cliquer "Personnaliser"
3. Choisir "Lock Screen"
4. Cliquer "Ajouter un widget"
5. Chercher "MyAdhan"
6. Choisir le format :
   - **Circular** → Widget rond
   - **Rectangular** → Widget rectangle
   - **Inline** → Texte au-dessus de l'heure

---

## 🔄 RAFRAÎCHISSEMENT AUTOMATIQUE

Le widget se met à jour automatiquement dans ces cas :

| Déclencheur | Fréquence | Fiabilité |
|-------------|-----------|-----------|
| **Ouverture app** | Immédiat | 100% ✅ |
| **Save & Reprogram** | Immédiat | 100% ✅ |
| **Background Fetch** | Toutes les 6h | 80-90% ⚠️ |
| **Timeline iOS** | Toutes les 15 min | 100% ✅ |

**Note** : Le Background Fetch dépend d'iOS (machine learning). Plus l'app est utilisée, plus iOS la réveille souvent.

---

## 🎨 PERSONNALISATION

### **Images de fond** (Home Screen uniquement)
- 🌅 **Fajr** : `sky_fajr.png`
- ☀️ **Dhuhr** : `sky_dhuhr.png`
- 🌤️ **Asr** : `sky_asr.png`
- 🌆 **Maghrib** : `sky_maghrib.png`
- 🌙 **Isha** : `sky_isha.png`

**Emplacement** :
```
ios-native/PrayerTimesWidget/Assets.xcassets/
  ├── sky_fajr.imageset/sky_fajr.png
  ├── sky_dhuhr.imageset/sky_dhuhr.png
  ├── sky_asr.imageset/sky_asr.png
  ├── sky_maghrib.imageset/sky_maghrib.png
  └── sky_isha.imageset/sky_isha.png
```

**Lock Screen** : Pas d'images de fond (limité par iOS), juste emoji + texte

---

## 🐛 DEBUG

### **Si le widget affiche "Fajr 00:00"** :
1. Ouvrir l'app
2. Aller dans "More" → "Outils développeur" → "Widget iOS"
3. Cliquer "4. Rafraîchir Widget"
4. OU aller dans Paramètres → Cliquer "Save and Reprogram"

### **Si les images ne s'affichent pas** :
1. Vérifier que les 5 images PNG sont bien dans leurs dossiers
2. Rebuild l'app (les assets sont copiés au prebuild)
3. Fallback automatique sur dégradés si images manquantes

---

## 📊 COMPATIBILITÉ

| Fonctionnalité | iOS 14 | iOS 15 | iOS 16+ |
|----------------|---------|--------|---------|
| **Home Screen Small/Medium/Large** | ✅ | ✅ | ✅ |
| **Lock Screen Circular** | ❌ | ❌ | ✅ |
| **Lock Screen Rectangular** | ❌ | ❌ | ✅ |
| **Lock Screen Inline** | ❌ | ❌ | ✅ |
| **Images de fond** | ✅ | ✅ | ✅ |
| **Background Refresh** | ✅ | ✅ | ✅ |

---

## 🚀 PRÊT À BUILDER !

Tu as maintenant **7 widgets différents** :
- 3 Home Screen (Small, Medium, Large)
- 3 Lock Screen (Circular, Rectangular, Inline)
- 1 Widget Gallery (preview)

**Tous synchronisés automatiquement avec les horaires de l'app !** 🎉
