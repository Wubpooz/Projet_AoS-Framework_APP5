# Rapport du projet d'Architecture Orientée Services
**Raphaël BINDA, Ola HNEINI, Mathieu WAHARTE**

&nbsp;  
## Parties effectuées par chacun
- Raphaël BINDA : Base de données, tests
- Ola HNEINI : Docker, documentation
- Mathieu WAHARTE : API, tests postman

&nbsp;  
## Prérequis
- [x] Gestion d’au moins deux types d’objets => Media et Collection (+ User / CollectionUser / CollectionMedia)
- [x] Implémentation des requêtes API classiques : GET, POST, PUT, DELETE
- [x] Pagination des résultats => support des paramètres `page`, `pageSize` et `cursor` sur /api/media et /api/collections
- [x] Filtrage des données via des paramètres optionnels (ex. : name, regex, etc.) => `tag`, `tags`, `platform`, `platforms`, `q` sur media ; `tag`, `tags`, `q` sur collections
- [x] Navigation dans l’arborescence des données (ex. : accéder aux documents d’un utilisateur via une URL comme http://localhost/user/1/document) => `GET /api/users/:userId/collections` pour lister les collections publiques d’un utilisateur
- [x] Documentation OpenAPI 3 détaillant le fonctionnement de l’API
- [x] Validation des entrées et sorties avec un validateur de données (ex. : Joi en Node.js)
- [x] Conteneurisation avec Docker : L’application devra pouvoir être exécutée en local via docker-compose.
- [x] Les tests : unitaire, manuel avec Postman ou bien automatisé


&nbsp;  
## Choix techniques et décisions d’architecture
L'architecture est un monolithe modulaire orientée services avec séparation claire entre les routes REST, services, schémas de donnée, middleware et base de données.  

### Stack et justification
- Runtime: **Bun**.
  Similaire et compatible avec Node.js. Bun est plus simple, rapide, intègre directement les tests et permet d'installer plus rapidement les dépendances. Le développement est plus fluide.
- Serveur HTTP : **Hono**
  Framework de prédiléction pour Bun, léger, simple à structurer, adapté aux API, supporte beaucoup de middlewares utiles (CORS, rate limiting, etc.), permet d’automatiser la documentation OpenAPI et d'autres fonctionnalités utiles.
- Validation:  **Zod**.
  Zod est un standard pour la validation. Il s'intégre aussi bien avec Hono. On peut facilement écrire un schéma, spécifier les types, des contraites supplémentaires, des optionnels etc.
- ORM: **Prisma**
  Modèle de données typé, migrations versionnées, client permettant d'interagir directement avec la base de données PostgreSQL depuis Typescript. On a aussi les types générés automatiquement à partir du modèle de données, ce qui réduit les erreurs et facilite le développement.
- Base de données: **PostgreSQL**.
  BDD relationnelle standarde, robuste et compatible Prisma.
- Authentification: **Better Auth**.
  Gestion extrement simple et centralisé des authentifications. S'intégre directement avec Prisma, gère les routes d'authentifications, propose des middlewares pour protéger les routes, différents types d'authentification adapté aux API comme aux applications. Il y a aussi de nombreux plugins utiles.
- Containerisation: **Docker**
- CI/CD: **GitHub Actions**


### Décisions de conception API
- Standardisation des endpoints par domaines (`auth`, `users`, `media`, `collections`).
- Automatisation de la documentation OpenAPI pour faciliter l’intégration et les tests. La documentation est générée à partir des routes et des schémas de validation Zod (présents dans`src/schemas`), ce qui garantit qu’elle reste à jour avec l’implémentation en utilisant `openAPIRouteHandler` et `swaggerUI` de Hono. De plus cela évite que lors de future modifications de l'API, la documentation soit oubliée ou mal mise à jour puisque c'est directement lié à l'implémentation. Ca rend aussi les choix plus intentionnels. 
- Gestion des droits par rôles sur les collections (OWNER, COLLABORATOR, READER, chercher `role || CollectionRole.READER`) et mécanisme d’invitation/acceptation par des endpoints dédiés (`/invitations`).
- Ajout d’un rate limiting global pour limiter les abus.
- (Bonus) Ajout d'un serveur MCP pour des usages d’assistant AI, avec des endpoints dédiés (`/mcp/collections`, `/mcp/media`) et une authentification basée sur les tokens d’API. C'est juste un "wrapper" sur l'API REST pour rendre plus facile l'intégration avec des outils d'assistant IA. Ce type de serveur peut être ensuite étendu pour ne plus être qu'un simple proxy et faire des actions plus complexes et "user-friendly".
- (Bonus) CI/CD avec GitHub Actions pour:  
  - Assurer que l'OpenAPI soit à jour avant de pousser (il est généré à partir du code et on veut vérifier que la version présente dans `docs/openapi.yaml` soit à jour pour les développeurs)
  - Faire tourner un build de l'application pour vérifier que tout compile correctement
  - Faire tourner les tests automatisés pour vérifier que les fonctionnalités principales fonctionnent et éviter les régressions
  - Faire tourner CodeQL pour vérifier qu'il n'y a pas de vulnérabilités de sécurité connues dans les dépendances utilisées


### Qualité, tests et exploitation
- Tests automatisés sur les couches routes/services/middleware pour limiter les régressions. Bun permet de les faire tourner.
- Collection Postman pour tester chaque endpoint (comme l'API est décrit dans l'OpenAPI, on a pu directement générer une collection Postman à partir de la documentation en utilisant leur IA, cela a permis de valider les endpoints facilement).  
  (Bonus) Ensuite nous avons essayé d'ajouter des scénarios, sans succès.


&nbsp;  
## Difficultés rencontrées et leur résolution
- Garder l’alignement entre modèle Prisma, migrations, validation Zod et OpenAPI => Automatisation de la documentation OpenAPI à partir des routes et des schémas de validation Zod, ce qui garantit qu’elle reste à jour avec l’implémentation ET Versionnement des changements base de données via migrations Prisma.
- Couvrir suffisamment les cas de test => collection Postman pour tester manuellement les endpoints, tests automatisés pour les fonctionnalités principales.
- Gérer la complexité de l’application => Modularisation par couches (routes/services/schemas/middleware) pour séparer les différentes responsabilités et faciliter la maintenance.
- Gestion de l'authentification et des rôles => Utilisation de Better Auth pour une gestion centralisée et simplifiée de l'authentification, avec des middlewares pour protéger les routes selon les rôles.
- Rester authentifié lors de l'utilisation de l'API => Utilisation du token Bearer.



&nbsp;  
## Les + ou - du cours
### Retours positifs
- Clair
- Structure simple a suivre et se concentre sur les points importants
- Bon équilibre entre théorie et pratique
- Technologies modernes et pertinentes

### Axes d’amélioration
- Ce serait peut-être plus intéressant en 1ère année?
- La classe se divisait en 2 groupes: ceux qui avaient déjà de l’expérience en développement et ceux qui n’en avaient pas. Du coup pour une partie de la classe c'était des acquis tandis que d'autres pouvaient avoir du mal a tout intégrer. Par contre comment régler ça?
