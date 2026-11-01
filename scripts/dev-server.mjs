import { createServer } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';
// Local-only development server. Serve only the browser-visible app, never .env/docs/supabase.
const root = path.resolve(process.argv.includes('--dist') ? 'dist' : '.');
const port = Number(process.env.PORT || 4173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.svg':'image/svg+xml', '.json':'application/json; charset=utf-8',
 '.png':'image/png','.webp':'image/webp'};
const server = createServer(async (req,res)=>{
  try {
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if(pathname.includes('\\') || pathname.includes('\0') || /%2f|%5c|%00/i.test(pathname)){
      res.writeHead(400).end();return;
    }
    const permitted = pathname === '/' || pathname === '/index.html' ||
      (pathname.startsWith('/src/') && !pathname.split('/').includes('..')) ||
      (pathname.startsWith('/assets/') && !pathname.split('/').includes('..'));
    if(!permitted){res.writeHead(404).end('Not found');return;}
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if(!file.startsWith(root + path.sep)){res.writeHead(403).end();return;}
    const s=await stat(file);
    if(!s.isFile()){res.writeHead(404).end();return;}
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream',
       'x-content-type-options':'nosniff','cache-control':'no-store'});
    if(req.method === 'HEAD'){res.end();return;}
    res.end(await readFile(file));
  } catch {res.writeHead(404).end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`ORBIT ${root.endsWith('dist')?'dist':'source'} at http://127.0.0.1:${port}`));
