import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const port = Number(process.env.PORT || 3000);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.mp4':'video/mp4','.woff2':'font/woff2'};
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let filename = path.resolve(root, '.' + pathname);
    if (filename !== root && !filename.startsWith(root + path.sep)) {
      res.writeHead(403).end('Forbidden'); return;
    }
    const info = await stat(filename);
    if (info.isDirectory()) filename = path.join(filename, 'index.html');
    const body = await readFile(filename);
    const headers = {'Content-Type':types[path.extname(filename)] || 'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Math.min(range[2] ? Number(range[2]) : body.length - 1, body.length - 1);
      if (start > end || start >= body.length) {res.writeHead(416, {'Content-Range':`bytes */${body.length}`}).end(); return;}
      res.writeHead(206, {...headers,'Content-Range':`bytes ${start}-${end}/${body.length}`,'Content-Length':end-start+1});
      res.end(req.method === 'HEAD' ? undefined : body.subarray(start, end+1)); return;
    }
    res.writeHead(200, {...headers,'Content-Length':body.length});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    if (error.code === 'ENOENT') res.writeHead(404).end('Page not found');
    else {console.error(error); res.writeHead(500).end('Local server error');}
  }
});
server.on('error', error => {console.error(error.message); process.exitCode=1;});
server.listen(port, '127.0.0.1', () => console.log(`Local website: http://localhost:${port}`));
