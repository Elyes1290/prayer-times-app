# 🔐 Configuration des Secrets GitHub Actions

## Secrets Requis

Pour que le CI/CD fonctionne correctement, vous devez configurer les secrets suivants dans votre repository GitHub :

### 1. EXPO_TOKEN

- **Description** : Token d'authentification Expo pour les builds
- **Où l'obtenir** : https://expo.dev/accounts/[username]/settings/access-tokens
- **Usage** : Build des applications Android/iOS

### 2. SSH_PRIVATE_KEY

- **Description** : Clé SSH privée pour se connecter au serveur de production
- **Format** : Contenu complet de la clé privée (id_rsa)
- **Usage** : Déploiement automatique sur le serveur

### 3. DB_PASSWORD

- **Description** : Mot de passe de la base de données MySQL
- **Usage** : Mise à jour automatique de la base de données

### 4. CODECOV_TOKEN (Optionnel)

- **Description** : Token Codecov pour l'upload des rapports de couverture
- **Usage** : Suivi de la couverture de code

## Configuration des Secrets

1. Allez dans votre repository GitHub
2. Cliquez sur "Settings" → "Secrets and variables" → "Actions"
3. Cliquez sur "New repository secret"
4. Ajoutez chaque secret avec sa valeur correspondante

## Variables d'Environnement

Vous pouvez aussi configurer des variables d'environnement (non sensibles) :

- `NODE_VERSION` : Version de Node.js (défaut: 20.x)
- `EXPO_VERSION` : Version d'Expo (défaut: latest)

## Test de la Configuration

Après avoir configuré les secrets, poussez un commit sur la branche `main` pour déclencher le pipeline CI/CD.

## Monitoring

- **Actions** : https://github.com/[username]/[repo]/actions
- **Codecov** : https://codecov.io/gh/[username]/[repo]
- **Expo** : https://expo.dev/accounts/[username]/projects/[project]/builds
