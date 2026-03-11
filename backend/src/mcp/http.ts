import { Hono } from 'hono';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import env from '../../env';
import { createAosMcpServer, type McpDependencies } from './server';

export const createMcpRoutes = (dependencies: Partial<McpDependencies> = {}) => {
  const router = new Hono();

  router.all('/', async (c) => {
    if (!env.MCP_ENABLED) {
      return c.json({
        error: 'MCP is disabled',
      }, 404);
    }

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const server = createAosMcpServer(dependencies);

    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  });

  return router;
};
