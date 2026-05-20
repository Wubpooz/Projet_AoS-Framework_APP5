### 1. Structure de l'Application et Fonctionnalités

Puisque le backend gère déjà des "Media" (films, séries, livres) et des "Collections", l'application s'appellera **MediaTracker**.

#### Les 4 Pages Requises (Navigation)

1. **Catalogue (Home) :** Liste paginée issue de `GET /api/media`. Barre de recherche avec délai (*debounce*) et annulation de requête (*AbortController*). Filtres par type (FILM, SERIES, etc.) et tags.
2. **Détail d'un Média (`/media/:id`) :** Affiche toutes les infos d'un média. Permet de l'ajouter à une de ses collections.
3. **Mes Collections (`/collections`) :** Gère les listes personnelles (requiert d'être connecté -> **Route Guard**). Appelle `GET /api/collections`.
4. **Tableau de bord / Statistiques (`/stats`) :** Affiche des graphiques ou des compteurs calculés à partir du store Pinia (ex: "Vous avez 45 médias dans vos collections, dont 80% de films").

#### Composants Réutilisables (Exigences techniques)

1. `MediaCard.vue` : Affiche un média (Props : item, Emits : clic, Slot : bouton d'action personnalisé).
2. `AppModal.vue` : Modale réutilisable rendue hors de l'arbre DOM (*Teleport* - **Bonus**).
3. `CustomRating.vue` ou `CustomSelect.vue` : Composant avec liaison bidirectionnelle personnalisée (`v-model`) pour noter un média ou filtrer par type.
4. `StatWidget.vue` : Petite carte affichant un chiffre clé sur le dashboard.
5. `SearchBar.vue` : Champ de recherche avec debounce intégré.

---

### 2. Répartition des Tâches (Équipe de 4 personnes)

Chaque membre a environ 12h de travail. La répartition suivante équilibre l'architecture, la logique métier, l'UI et les tests.

#### 🧑‍💻 Développeur A : Lead Architecture, Authentification & Déploiement

*Son rôle : Mettre en place les fondations, la connexion avec le backend existant et l'infrastructure.*

* **Initialisation :** Setup du projet Vue 3 + Vite + TypeScript + Pinia + Vue Router.
* **Routage & Lazy Loading :** Configuration du router avec chargement différé (`() => import(...)`) pour les écrans secondaires.
* **Authentification (Bonus validé) :** Connexion avec `POST /api/auth/login` et `GET /api/auth/me`. Stockage du token Bearer et configuration de l'intercepteur HTTP (ex: Axios ou fetch custom).
* **Sécurité :** Mise en place des *Navigation Guards* (empêcher l'accès à `/collections` et `/stats` si non connecté).
* **DevOps :** Gestion des variables d'environnement (`.env.example`), configuration du build de production et déploiement public (ex: Vercel, Netlify ou Render).

#### 🧑‍💻 Développeur B : Catalogue, Recherche & Performances

*Son rôle : Gérer le flux principal de données (la page la plus lourde de l'application) et la fluidité.*

* **Page Catalogue :** Consommation de `GET /api/media` avec pagination (ou infinite scroll).
* **Recherche Optimisée :** Implémentation d'un champ de recherche avec *debounce* (ne pas spammer l'API à chaque lettre).
* **Annulation de requêtes :** Utilisation d'`AbortController` pour annuler une recherche en cours si l'utilisateur change de page ou tape un nouveau mot.
* **Détail Média :** Création de la vue `/media/:id` avec récupération des données spécifiques.
* **Bonus (KeepAlive) :** Maintenir l'état de la page catalogue (scroll et filtres) lors d'un retour depuis la page détail avec `<KeepAlive>`.

#### 🧑‍💻 Développeur C : État Centralisé, Collections & V-Model Custom

*Son rôle : Gérer l'expérience personnelle de l'utilisateur (le "cœur" interactif).*

* **Store Pinia :** Création du store pour centraliser les listes de l'utilisateur. Appel à `GET /api/collections` et persistance locale des données courantes pour éviter les requêtes redondantes.
* **Gestion des listes :** UI et logique pour ajouter/retirer un média d'une collection (`POST /api/collections/{id}/media` et `DELETE`).
* **Réflexion globale :** S'assurer qu'un média déjà dans une liste affiche une icône spécifique partout dans l'application (catalogue, détail) en lisant le store Pinia.
* **Composant v-model :** Création du composant complexe avec liaison bidirectionnelle (par exemple, un `CustomSelect.vue` pour choisir dans quelle collection ajouter le média, ou un système de notation par étoiles).

#### 🧑‍💻 Développeur D : Statistiques, UI Avancée & Tests

*Son rôle : Mettre en valeur la donnée, soigner l'expérience utilisateur et assurer la qualité du code.*

* **Dashboard / Statistiques :** Création de la page `/stats` qui agrège les données du store Pinia en temps réel (total des films, répartition par type, etc. via des `computed`).
* **Composants UI (Slots & Teleport) :** Création de `MediaCard.vue` (avec injection de contenu via `<slot>`) et de `AppModal.vue` (en utilisant `<Teleport>` pour contourner les z-index).
* **Bonus UI :** Implémentation du Dark Mode persistant (respectant les préférences système) et des transitions de page Vue (`<Transition>`).
* **Tests Automatisés :** Mise en place de Vitest/Vue Test Utils. Écriture des tests requis :
* Test d'une fonction métier (ex: le calcul des statistiques).
* Test du composant `CustomRating` ou `MediaCard`.
* Test du Store Pinia.



---