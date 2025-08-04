# Configuration Firebase

⚠️ **IMPORTANT** : Le fichier `google-services.json` contient des clés API sensibles et ne doit JAMAIS être commité dans le contrôle de version.

## Configuration pour Android

1. Téléchargez votre fichier `google-services.json` depuis la console Firebase
2. Placez-le dans `android/app/google-services.json`
3. Assurez-vous qu'il est dans le `.gitignore` (déjà configuré)

## Template de configuration

Un fichier template est disponible : `android/app/google-services.json.template`

Remplacez les valeurs suivantes :
- `YOUR_PROJECT_NUMBER` : Numéro du projet Firebase
- `YOUR_PROJECT_ID` : ID du projet Firebase
- `YOUR_MOBILE_SDK_APP_ID` : ID de l'application mobile
- `YOUR_FIREBASE_API_KEY` : Clé API Firebase

## Sécurité

🔐 **Régénération de clé requise** : Si vous aviez précédemment commité ce fichier, régénérez vos clés Firebase pour éviter tout risque de sécurité.

1. Allez dans la console Firebase
2. Paramètres du projet > Général
3. Dans "Vos applications", supprimez l'ancienne configuration
4. Créez une nouvelle configuration Android
5. Téléchargez le nouveau `google-services.json`