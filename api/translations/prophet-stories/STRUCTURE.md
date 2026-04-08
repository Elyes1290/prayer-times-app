# 📂 Structure des traductions - Histoires des Prophètes

## 🗂️ Organisation des fichiers

```
api/translations/prophet-stories/
│
├── README.md                  # Documentation principale
├── STRUCTURE.md              # Ce fichier
│
├── muhammad/                 # 🕌 Prophète Muhammad (ﷺ)
│   ├── .gitkeep
│   ├── prophet_stories_fr.json   ✅
│   ├── prophet_stories_en.json   ✅
│   ├── prophet_stories_ar.json   ✅
│   ├── prophet_stories_tr.json   ✅
│   ├── prophet_stories_es.json   ✅
│   ├── prophet_stories_de.json   ✅
│   ├── prophet_stories_it.json   ✅
│   ├── prophet_stories_nl.json   ✅
│   ├── prophet_stories_pt.json   ✅
│   ├── prophet_stories_ru.json   ✅
│   ├── prophet_stories_bn.json   ✅
│   ├── prophet_stories_ur.json   ✅
│   └── prophet_stories_fa.json   ✅
│
├── adam/                     # 🕌 Prophète Adam (AS)
│   ├── adam_stories_fr.json      ✅
│   ├── adam_stories_en.json      ⏳ À traduire
│   ├── adam_stories_ar.json      ⏳ À traduire
│   ├── adam_stories_tr.json      ⏳ À traduire
│   ├── adam_stories_es.json      ⏳ À traduire
│   ├── adam_stories_de.json      ⏳ À traduire
│   ├── adam_stories_it.json      ⏳ À traduire
│   ├── adam_stories_nl.json      ⏳ À traduire
│   ├── adam_stories_pt.json      ⏳ À traduire
│   ├── adam_stories_ru.json      ⏳ À traduire
│   ├── adam_stories_bn.json      ⏳ À traduire
│   ├── adam_stories_ur.json      ⏳ À traduire
│   └── adam_stories_fa.json      ⏳ À traduire
│
└── nuh/                      # 🕌 Prophète Noé (AS)
    ├── nuh_stories_fr.json       ✅
    └── nuh_stories_*.json        ⏳ À traduire (en, ar, tr, es, de, it, nl, pt, ru, bn, ur, fa)
```

## 🔧 Configuration API

Le fichier `api/prophet-stories.php` a été mis à jour pour supporter la nouvelle structure :

```php
function loadTranslations($lang, $prophetName = 'muhammad') {
    if ($prophetName === 'adam') {
        // Adam : api/translations/prophet-stories/adam/
        $jsonFile = __DIR__ . "/translations/prophet-stories/adam/adam_stories_{$lang}.json";
    } else {
        // Muhammad : api/translations/prophet-stories/muhammad/
        $jsonFile = __DIR__ . "/translations/prophet-stories/muhammad/prophet_stories_{$lang}.json";
    }
    // ...
}
```

## 🚫 .gitignore

Les fichiers JSON sont exclus de Git car ils sont servis depuis le serveur :

```gitignore
# Prophet Stories translations (served from server API)
api/translations/prophet-stories/muhammad/prophet_stories_*.json
api/translations/prophet-stories/adam/adam_stories_*.json
```

## 📊 Statistiques

### Muhammad (ﷺ)
- **Histoires** : 19
- **Chapitres** : 60
- **Langues** : 13 (fr, en, ar, tr, es, de, it, nl, pt, ru, bn, ur, fa)

### Adam (AS)
- **Histoires** : 10
- **Chapitres** : 33
- **Langues** : 1 (fr) - 12 à traduire

## 🎯 Utilisation de l'API

### Lister les prophètes disponibles
```bash
GET /api/prophet-stories.php?action=prophets&lang=fr
```

### Catalogue des histoires de Muhammad (ﷺ)
```bash
GET /api/prophet-stories.php?action=catalog&prophet=muhammad&lang=fr
```

### Catalogue des histoires d'Adam (AS)
```bash
GET /api/prophet-stories.php?action=catalog&prophet=adam&lang=fr
```

### Catalogue des histoires de Noé (AS)
```bash
GET /api/prophet-stories.php?action=catalog&prophet=nuh&lang=fr
```

### Obtenir une histoire spécifique
```bash
GET /api/prophet-stories.php?action=story&id=creation_of_adam&lang=fr
```

## ✅ Prochaines étapes

1. ✅ Structure organisée en dossiers séparés
2. ✅ API mise à jour
3. ✅ .gitignore configuré
4. ⏳ Traduire les histoires d'Adam dans les 12 autres langues
5. ⏳ Tester l'API avec les nouvelles histoires
