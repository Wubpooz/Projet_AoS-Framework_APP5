### Répartition des Tâches

#### Ola : Base, Routage et Authentification
* **Configuration initiale :** Initialisation du projet avec Vue 3, Vite, TypeScript et configuration du routeur.
* **Interface (Pages) :** Création du layout global (Menu de navigation statique) et de la page de Connexion/Inscription.
* **Intégration API :** Connexion aux routes `/api/auth/login` et `/api/auth/me` pour récupérer et stocker le token de session.
* **Logique spécifique :** Implémentation des "Navigation Guards" dans Vue Router pour bloquer l'accès aux pages privées (Collections, Statistiques) aux utilisateurs non connectés.
* **Tests :** Écriture des tests unitaires pour vérifier la logique de validation de l'authentification et les redirections du routeur.

#### Bill : Catalogue, Recherche et Performances
* **Interface (Pages) :** Création de la page principale affichant la liste du catalogue global.
* **Intégration API :** Consommation de la route `/api/media` avec prise en charge de la pagination.
* **Logique spécifique 1 (Debounce) :** Implémentation d'une barre de recherche fluide qui retarde l'appel réseau pour ne pas l'exécuter à chaque frappe.
* **Logique spécifique 2 (AbortController) :** Ajout de l'annulation des requêtes réseau obsolètes en cas de nouvelle recherche ou de changement de page.
* **Tests :** Écriture des tests unitaires pour valider la fonction de délai (debounce) et le filtrage des éléments.

#### Raphaël : État Centralisé et Interactions
* **Interface (Pages) :** Création de la page "Mes Collections" et de la page "Détail d'un média" (accessible via l'URL `/media/:id`).
* **Intégration API :** Connexion aux routes `/api/collections` pour lire, ajouter et supprimer des médias de la liste personnelle.
* **Logique spécifique 1 (Pinia) :** Création du store centralisé pour stocker les collections et refléter leur statut (ex: afficher une icône si le média est déjà ajouté) sur toutes les pages de l'application.
* **Logique spécifique 2 (v-model) :** Développement d'un composant d'interface avec liaison bidirectionnelle personnalisée (ex: un composant d'évaluation ou un sélecteur de tag personnalisé).
* **Tests :** Écriture des tests unitaires pour valider les actions de mise à jour et l'état par défaut du store Pinia.

#### Mathieu : Synthèse, UI Avancée et Déploiement
* **Interface (Pages) :** Création de la page "Statistiques" affichant des données agrégées à l'utilisateur.
* **Logique spécifique 1 (Données dérivées) :** Création de variables calculées (`computed`) basées sur le store Pinia pour alimenter les graphiques ou compteurs (totaux, moyennes, répartition par type).
* **Logique spécifique 2 (Teleport & Slots) :** Développement d'un composant de modale réutilisable rendu en dehors de l'arbre DOM principal, incluant l'injection de contenu dynamique.
* **Déploiement et Configuration :** Gestion des variables d'environnement (`.env.example`), configuration de la compilation pour la production et déploiement de l'application sur un hébergeur public.
* **Tests :** Écriture des tests d'intégration vérifiant le bon calcul des statistiques et leur affichage dans l'interface.
