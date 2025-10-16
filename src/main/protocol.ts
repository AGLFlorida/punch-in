import { protocol, net, app } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as fs from 'node:fs';

export function registerAppScheme() {
  protocol.registerSchemesAsPrivileged([{
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
  }]);
}

export async function attachStaticHandler() {
  const root = app.isPackaged
    ? path.join(process.resourcesPath, 'renderer')        // packaged: <App>.app/Contents/Resources/renderer
    : path.join(process.cwd(), 'dist', 'renderer');
  
  protocol.handle('app', (request) => {
    let rel = new URL(request.url).pathname; 
    rel = decodeURIComponent(rel).replace(/^\/+/, '');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';

    let filePath = path.join(root, rel);
    // if a directory sneaks through, serve its index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    return net.fetch(pathToFileURL(filePath).href);
  });
}
