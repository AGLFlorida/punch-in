import { protocol, net } from 'electron';
import path from 'node:path';

export function registerAppScheme() {
  protocol.registerSchemesAsPrivileged([{
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
  }]);
}

export async function attachStaticHandler() {
  const root = path.join(process.cwd(), 'dist', 'renderer');
  protocol.handle('app', (request) => {
    // app://-/index.html, app://-/_next/..., app://-/reports/index.txt, etc.
    let rel = new URL(request.url).pathname; // starts with "/"
    if (rel === '/' || rel.endsWith('/')) rel += 'index.html';
    const filePath = path.join(root, decodeURIComponent(rel));
    return net.fetch(`file://${filePath}`);
  });
}
