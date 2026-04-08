# 🕌 Histoires des Prophètes (عليهم السلام)

## 📂 Structure des dossiers

```
api/translations/prophet-stories/
├── muhammad/          # Histoires du Prophète Muhammad (ﷺ)
│   └── prophet_stories_*.json
└── adam/             # Histoires du Prophète Adam (AS)
    └── adam_stories_*.json
```

## 📚 Histoires du Prophète Adam (AS)

Ce dossier contient les traductions des histoires du Prophète Adam (AS) pour l'application Prayer Times.

## ✅ Structure des histoires (10 histoires)

### 1. **La création d'Adam** (`creation_of_adam`)
- **Catégorie**: Création
- **Difficulté**: Débutant
- **Chapitres**: 4
- **Sources**: Coran 2:30-34, 15:26-29, 38:71-76
- **Thèmes**: Khalifa, argile, insufflation de l'âme, prosternation des anges

### 2. **Adam au Paradis** (`adam_in_paradise`)
- **Catégorie**: Paradis
- **Difficulté**: Débutant
- **Chapitres**: 3
- **Sources**: Coran 2:35, 7:19, 20:117-119
- **Thèmes**: Jannah, Hawwa, vie bénie

### 3. **L'interdiction et la rébellion d'Iblis** (`prohibition_and_iblis`)
- **Catégorie**: Paradis
- **Difficulté**: Intermédiaire
- **Chapitres**: 4
- **Sources**: Coran 2:34-36, 7:11-18, 15:30-43
- **Thèmes**: Iblis, refus, orgueil, expulsion

### 4. **La tentation et la désobéissance** (`temptation_and_disobedience`)
- **Catégorie**: Paradis
- **Difficulté**: Intermédiaire
- **Chapitres**: 3
- **Sources**: Coran 2:36, 7:20-22, 20:120-121
- **Thèmes**: Waswasah, arbre interdit, désobéissance

### 5. **Le repentir** (`repentance`)
- **Catégorie**: Paradis
- **Difficulté**: Débutant
- **Chapitres**: 3
- **Sources**: Coran 2:37, 7:23
- **Thèmes**: Tawbah, Istighfar, pardon divin

### 6. **La descente sur Terre** (`descent_to_earth`)
- **Catégorie**: Vie terrestre
- **Difficulté**: Intermédiaire
- **Chapitres**: 3
- **Sources**: Coran 2:38-39, 7:24-25, 20:123
- **Thèmes**: Hubut, mission terrestre, guidance

### 7. **Adam et Hawwa sur Terre** (`adam_hawwa_on_earth`)
- **Catégorie**: Vie terrestre
- **Difficulté**: Intermédiaire
- **Chapitres**: 3
- **Sources**: Hadiths authentiques
- **Thèmes**: Séparation, retrouvailles, Arafat, construction de la vie

### 8. **Les enfants d'Adam : Qabil et Habil** (`qabil_and_habil`)
- **Catégorie**: Lignée prophétique
- **Difficulté**: Intermédiaire
- **Chapitres**: 3
- **Sources**: Coran 5:27-31
- **Thèmes**: Qurban, Taqwa, conflit

### 9. **Le premier meurtre et ses leçons** (`first_murder`)
- **Catégorie**: Lignée prophétique
- **Difficulté**: Avancé
- **Chapitres**: 4
- **Sources**: Coran 5:30-32
- **Thèmes**: Qatl, remords, corbeau, conséquences

### 10. **Adam, le premier prophète** (`adam_first_prophet`)
- **Catégorie**: Prophétie
- **Difficulté**: Intermédiaire
- **Chapitres**: 3
- **Sources**: Hadiths authentiques
- **Thèmes**: Nabi, Risalah, Hikmah, mort

## 📖 Traductions disponibles

- ✅ **Français** (`adam_stories_fr.json`) - Version complète

### 🚧 À traduire
- ⏳ Anglais (`adam_stories_en.json`)
- ⏳ Arabe (`adam_stories_ar.json`)
- ⏳ Turc (`adam_stories_tr.json`)
- ⏳ Espagnol (`adam_stories_es.json`)
- ⏳ Allemand (`adam_stories_de.json`)
- ⏳ Italien (`adam_stories_it.json`)
- ⏳ Néerlandais (`adam_stories_nl.json`)
- ⏳ Portugais (`adam_stories_pt.json`)
- ⏳ Russe (`adam_stories_ru.json`)
- ⏳ Bengali (`adam_stories_bn.json`)
- ⏳ Ourdou (`adam_stories_ur.json`)
- ⏳ Persan (`adam_stories_fa.json`)

## 🗄️ Base de données

Les métadonnées ont été ajoutées dans le script SQL :
- **Fichier**: `scripts/create-prophet-stories-tables-keys-only.sql`
- **Tables mises à jour**:
  - `prophet_stories` (10 nouvelles histoires)
  - `prophet_story_chapters` (33 nouveaux chapitres)
  - `prophet_story_glossary` (48 nouveaux termes)

## 🔧 API

L'API `api/prophet-stories.php` a été mise à jour pour supporter Adam (AS) :

### Endpoints

**Liste des prophètes disponibles** :
```
GET /api/prophet-stories.php?action=prophets&lang=fr
```

**Catalogue des histoires d'Adam** :
```
GET /api/prophet-stories.php?action=catalog&prophet=adam&lang=fr
```

**Contenu d'une histoire** :
```
GET /api/prophet-stories.php?action=story&id=creation_of_adam&lang=fr
```

## 📊 Statistiques

- **Total histoires**: 10
- **Total chapitres**: 33
- **Total termes glossaire**: 48
- **Temps de lecture total**: ~90 minutes
- **Mots total**: ~10,900 mots

## 🎯 Sources

Toutes les histoires sont basées UNIQUEMENT sur des sources islamiques authentiques :
- ✅ Coran (Versets en arabe + traduction française)
- ✅ Hadiths Sahih (Bukhari, Muslim)
- ✅ Traditions authentiques (Sira, Tafsir)

❌ **Aucune invention** - Fidélité totale aux textes islamiques
