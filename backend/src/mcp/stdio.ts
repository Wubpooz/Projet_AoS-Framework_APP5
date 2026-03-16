import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import env from '../../env';
import { createAosMcpServer } from './server';

async function main() {
  if (!env.MCP_ENABLED) {
    console.error('MCP is disabled. Set MCP_ENABLED=true to start the stdio server.');
    process.exit(1);
  }

  const server = createAosMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('AoS MCP server running on stdio');
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('Failed to start AoS MCP stdio server', error);
    process.exit(1);
  });
}
