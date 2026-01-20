# Restaurant Room Builder

Application Nuxt 4 interactive pour la gestion et la réservation de places dans un restaurant.

## Fonctionnalités

- **Builder de salle (Restaurateur)** : Interface glisser-déposer pour placer les tables et les chaises.
- **Réservation (Client)** : Interface pour sélectionner et réserver des chaises spécifiques.
- **Technologie** : Nuxt 4 (Nitro), Drizzle ORM, MySQL/MariaDB, Vue.js + SVG.

## Prérequis

- Node.js
- MySQL / MariaDB

## Installation

1. Installez les dépendances :
```bash
npm install
```

2. Configurez vos variables d'environnement dans un fichier `.env` :
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_DATABASE=restaurant_db
```

3. Créez la base de données :
```sql
CREATE DATABASE restaurant_db;
```

4. Appliquez les migrations Drizzle pour créer les tables :
```bash
npx drizzle-kit push
```

## Lancement

Démarrez le serveur de développement :
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`.
