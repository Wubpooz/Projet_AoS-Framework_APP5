# Tâches Mathieu

## Page Statistiques
- Présentation des statistiques de l'utilisateur
- Tests du bon calcul des statistiques et de leur affichage dans l'interface avant le déploiement.


## UI
- **Logique spécifique 1 (Données dérivées) :** Création de variables calculées (`computed`) basées sur le store Pinia pour alimenter les graphiques ou compteurs (totaux, moyennes, répartition par type).
- **Logique spécifique 2 (Teleport & Slots) :** Développement d'un composant de modale réutilisable rendu en dehors de l'arbre DOM principal, incluant l'injection de contenu dynamique.



## CI/CD
- Déploiement Vercel (will use the same domain, avoids CORS issues and better-auth session cookie problems  and cleaner).
  - On Vercel:
    - Keep root directory as `.`
    - Build command: `cd frontend && bun install && bun run build`
    - Output directory: `frontend/dist`
    - Configure environment variables for production (DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, FRONTEND_URL, NODE_ENV).
  - Hosted cloud DB (Neon or Supabase) and use the connection URI (for Neon, use the -pooler one) & migrate the data before deployment with `bunx prisma migrate deploy --schema=backend/prisma/schema.prisma` in Vercel or locally.
  - Update the code:
    - Create `api/index.ts` in the root of the repository to export the Hono app using Hono's Vercel adapter: 
      ```typescript
      // api/index.ts (create in the repository root)
      import { handle } from 'hono/vercel';
      import app from '../backend/src/index';

      // Export handlers for the HTTP methods Vercel will route
      export const GET = handle(app);
      export const POST = handle(app);
      export const PATCH = handle(app);
      export const DELETE = handle(app);
      export const OPTIONS = handle(app);
      ```

    - Create `vercel.json` at the root of your repository to route all `/api/*` traffic to our serverless function:
      ```json
      {
        "rewrites": [
          {
            "source": "/api/(.*)",
            "destination": "/api"
          }
        ]
      }
      ```
    - Update CORS and CSRF in `backend/src/index.ts`:  
      ```typescript
      // Restruc the pool size in production to prevent exhausting database connections in serverless environments
      import { PrismaClient } from '../generated/prisma/client';
      import { PrismaPg } from '@prisma/adapter-pg';
      import { Pool } from 'pg';

      const isProd = process.env.NODE_ENV === 'production';

      const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        // Limit connection pool size in serverless environments to prevent exhaustion
        max: isProd ? 2 : 10, 
        idleTimeoutMillis: 10000,
      });

      const adapter = new PrismaPg(pool);
      const prisma = new PrismaClient({ adapter });

      export default prisma;



      // Update CORS configuration
      app.use(
        "*",
        cors({
          origin: (origin) => {
            // In production, allow the requested origin if it's our own domain
            // In development, fall back to localhost
            return process.env.NODE_ENV === 'production' ? origin : "http://localhost:3000";
          },
          allowHeaders: ["Content-Type", "Authorization", "MCP-Protocol-Version", "Mcp-Session-Id", "Last-Event-ID"],
          allowMethods: ["POST", "GET", "PATCH", "DELETE", "OPTIONS"],
          exposeHeaders: ["Content-Length", "set-auth-token", "MCP-Protocol-Version", "Mcp-Session-Id"],
          maxAge: 600,
          credentials: true
        })
      );

      // Update CSRF configuration
      if (process.env.NODE_ENV === 'production') {
        app.use(csrf({
          // Trust requests coming from the same host in production
          origin: (origin) => {
            return origin; 
          },
          secFetchSite: ['same-origin', 'same-site']
        }));
      }
      ```
    
- Gestion des secrets et variables d'environnement
- Tests d'intégration dans le pipeline CI/CD pour valider les fonctionnalités avant le déploiement.
