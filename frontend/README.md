# Frontend - T-ESP-901-81606-PAR_LudoKan

## 🚀 Initialisation du projet frontend

Ce projet utilise **React** avec **Vite** et **TypeScript**.  
Il inclut la configuration de **ESLint** et **Prettier** pour garantir la qualité et la cohérence du code.

---

### 📦 Structure du projet

```
frontend/
├── public/
├── src/
│   ├── assets/           # Images, logos, fichiers statiques
│   ├── components/       # Composants réutilisables
│   ├── pages/            # Pages principales
│   ├── services/         # Appels API, intégrations externes, logique métier
│   ├── utils/            # Fonctions utilitaires, constantes, validateurs, formateurs
│   ├── layouts/          # Composants de structure de page
│   ├── types/            # Interfaces et définitions de types TypeScript
│   ├── tests/            # Tests unitaires et d’intégration
│   ├── config/           # Fichiers de configuration de l’application
│   ├── App.tsx           # Composant racine
│   ├── main.tsx          # Point d'entrée de l'application
│   └── index.css         # Styles globaux
├── .eslintrc.js          # Configuration ESLint
├── .prettierrc           # Configuration Prettier
├── tsconfig.json         # Configuration TypeScript
├── package.json          # Dépendances et scripts
├── vite.config.ts        # Configuration Vite
└── README.md             # Documentation du projet
```

---

### 🧑‍💻 Bonnes pratiques de code

#### Nommage

- **Fonctions** : utiliser des verbes descriptifs en anglais (ex : `getUser`, `fetchData`, `handleClick`)
- **Composants React** : nom en PascalCase (ex : `UserProfile`, `Navbar`)
- **Variables** : nom explicite en camelCase (ex : `userList`, `isLoading`)
- **Types & Interfaces** : nom en PascalCase, préfixer les interfaces par `I` si besoin (ex : `User`, `IUser`)
- **Enums** : nom en PascalCase, valeurs en MAJUSCULES (ex : `Status`, `Status.ACTIVE`)

#### Organisation

- Grouper le code par fonctionnalité ou domaine
- Séparer la logique métier (services) de la présentation (composants)
- Utiliser des fichiers dédiés pour les types, constantes et utilitaires

#### Style

- Respecter la configuration Prettier pour le formatage
- Utiliser ESLint pour détecter les erreurs et incohérences
- Commenter le code complexe ou non évident

---

### ⚙️ Installation

```sh
# Installe les dépendances
npm install
```

---

### 🏃‍♂️ Scripts

- **Démarrer le serveur de développement :**
  ```sh
  npm run dev
  ```
- **Construire le projet pour la production :**
  ```sh
  npm run build
  ```
- **Linter le code :**
  ```sh
  npm run lint
  ```
- **Formater le code :**
  ```sh
  npm run format
  ```

---

### 🛠️ Outils & Dépendances

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)

---

### 📁 Dossiers principaux

- **assets/** : Images et fichiers statiques
- **components/** : Composants réutilisables
- **pages/** : Pages principales de l’application

---

### 📄 Licence

Ce projet est sous licence MIT.