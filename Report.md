# Rapport de projet
**Raphaël BINDA, Ola HNEINI, Mathieu WAHARTE**

&nbsp;  
## Choix techniques et décisions d’architecture
!!!!!TODO REDO with our real choices, details, justifications, difficultés rencontrées et mesures prises pour les surmonter.

### Architecture générale
- Architecture orientée services avec séparation claire entre **routes**, **services**, **schémas de validation**, **middleware** et **accès base de données**.
- Backend conçu comme une **API REST** principale, avec une exposition complémentaire via **MCP** (`/mcp`) pour des usages assistant/outillage.

### Stack et justification
- **Bun** comme runtime : démarrage rapide, outillage intégré (tests, scripts) et bonne productivité en développement.
- **Hono** pour le serveur HTTP : framework léger, simple à structurer, adapté aux API.
- **Zod** pour la validation : schémas explicites des entrées et erreurs de validation plus fiables.
- **Prisma** pour l’ORM : modèle de données typé, migrations versionnées, client généré.
- **PostgreSQL 16** comme base relationnelle : cohérent avec les besoins de relations (utilisateurs, collections, membres, invitations, médias).
- **Better Auth** pour l’authentification : flux register/login/logout/forgot/reset centralisés.

### Décisions de conception API
- Standardisation des endpoints par domaines (`auth`, `users`, `media`, `collections`).
- Documentation de l’API via **OpenAPI** (version servie et copie statique) pour faciliter l’intégration et les tests.
- Gestion des droits par rôles sur les collections (**OWNER**, **COLLABORATOR**, **READER**) et mécanisme d’invitation/acceptation.
- Ajout d’un **rate limiting** global pour limiter les abus.

### Qualité, tests et exploitation
- Tests automatisés sur les couches routes/services/middleware pour limiter les régressions.
- Environnement local reproductible via **Docker Compose** (API + PostgreSQL).
- Collection **Postman** structurée par domaines + scénarios pour validation fonctionnelle bout-en-bout.


&nbsp;  
## Difficultés rencontrées
- Garder l’alignement entre modèle Prisma, migrations, validation Zod et contrats d’API documentés?
- Stabiliser les scénarios d’invitation (création, acceptation/refus, changement de rôle, suppression) sans effets de bord?
- Couvrir suffisamment les cas de test (succès, erreurs métier, accès non autorisé)?

### Mesures prises
- Modularisation par couches (routes/services/schemas/middleware).
- Utilisation de tests automatisés et de scénarios Postman.
- Versionnement des changements base de données via migrations Prisma.
- Documentation OpenAPI pour clarifier les comportements attendus.


&nbsp;  
## Parties effectuées par chacun
- Raphaël BINDA : Base de données, tests
- Ola HNEINI : Docker, documentation
- Mathieu WAHARTE : API, tests postman


&nbsp;  
## Les + ou - du cours

### Retours positifs
- 

### Axes d’amélioration
- 

