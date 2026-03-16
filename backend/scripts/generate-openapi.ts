import { writeFile } from 'node:fs/promises';
import app from '../src/index';

type OpenApiDocument = {
  paths?: Record<string, Record<string, { responses?: Record<string, { description?: string }> }>>;
};

const defaultResponseDescriptions: Record<string, Record<string, string>> = {
  '/openapi': {
    get: 'OpenAPI specification document',
  },
  '/docs': {
    get: 'Interactive API documentation UI',
  },
  '/health': {
    get: 'Health check response',
  },
};

function ensureResponseDescriptions(doc: OpenApiDocument): OpenApiDocument {
  if (!doc.paths) {
    return doc;
  }

  for (const [path, methods] of Object.entries(defaultResponseDescriptions)) {
    for (const [method, description] of Object.entries(methods)) {
      const operation = doc.paths[path]?.[method];
      const okResponse = operation?.responses?.['200'];
      if (okResponse && !okResponse.description) {
        okResponse.description = description;
      }
    }
  }

  return doc;
}

const request = new Request('http://localhost/openapi', {
  headers: {
    Accept: 'application/yaml',
  },
});

const response = await app.fetch(request);
if (!response.ok) {
  const body = await response.text();
  throw new Error(`OpenAPI generation failed: ${response.status} ${body}`);
}

const output = await response.text();
let formattedOutput = output;

try {
  const parsed = JSON.parse(output) as OpenApiDocument;
  const sanitized = ensureResponseDescriptions(parsed);
  formattedOutput = `${JSON.stringify(sanitized, null, 2)}\n`;
} catch {
  if (!output.endsWith('\n')) {
    formattedOutput = `${output}\n`;
  }
}
const targetPath = new URL('../../docs/openapi.yml', import.meta.url);
await writeFile(targetPath, formattedOutput);

console.log(`OpenAPI spec written to ${targetPath.pathname}`);
