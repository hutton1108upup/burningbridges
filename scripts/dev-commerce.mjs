import http from 'node:http';
import path from 'node:path';
import {mkdir,readFile,stat} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {openDB} from './sqlite-db.mjs';
import worker from '../src/worker.mjs';
const root=path.resolve('public'),port=Number(process.env.PORT||3001),origin=`http://localhost:${port}`;
await mkdir('.local',{recursive:true});
const DB=openDB('.local/commerce.sqlite');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.mp4':'video/mp4','.ico':'image/x-icon'};
const ASSETS={async fetch(request) {
  const url=new URL(request.url),file=path.resolve(root,`.${decodeURIComponent(url.pathname)}`);
  if(file!==root && !file.startsWith(`${root}${path.sep}`))return new Response('Forbidden',{status:403});
  try {
    const info=await stat(file),actual=info.isDirectory()?path.join(file,'index.html'):file;
    const body=await readFile(actual),headers={'Content-Type':types[path.extname(actual)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
    const range=request.headers.get('range')?.match(/^bytes=(\d+)-(\d*)$/);
    if(range) {const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):body.length-1,body.length-1);if(start>end||start>=body.length)return new Response(null,{status:416});return new Response(body.subarray(start,end+1),{status:206,headers:{...headers,'Content-Range':`bytes ${start}-${end}/${body.length}`}});}
    return new Response(request.method==='HEAD'?null:body,{headers});
  } catch(error) {if(error.code==='ENOENT')return new Response('Not found',{status:404});throw error;}
}};
// Local development never loads or borrows payment keys. Hosted Waffo tests use
// a separately configured HTTPS Worker and an approved store.
const env={DB,ASSETS,SITE_ORIGIN:origin,PAYMENT_MODE:'test',GENERATION_MODE:'mock',CHECKOUT_ENABLED:'false',
  GOOGLE_LOGIN_ENABLED:process.env.GOOGLE_LOGIN_ENABLED,GOOGLE_CLIENT_ID:process.env.GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET:process.env.GOOGLE_CLIENT_SECRET,BETTER_AUTH_SECRET:process.env.BETTER_AUTH_SECRET};
const server=http.createServer(async(req,res)=>{
  try {
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    if(![`localhost:${port}`,`127.0.0.1:${port}`].includes(req.headers.host)){res.writeHead(403).end('Local host not allowed');return;}
    const requestOrigin=`http://${req.headers.host}`;
    const request=new Request(new URL(req.url,requestOrigin),{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
    const response=await worker.fetch(request,{...env,SITE_ORIGIN:requestOrigin});
    const responseHeaders=Object.fromEntries(response.headers);if(response.headers.getSetCookie().length)responseHeaders['set-cookie']=response.headers.getSetCookie();
    res.writeHead(response.status,responseHeaders);
    if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
  } catch {res.writeHead(500).end('Local service error');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local commerce website: ${origin} (checkout disabled; test fixtures only)`));
