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
const env={DB,ASSETS,SITE_ORIGIN:origin,PAYMENT_MODE:'test',GENERATION_MODE:'mock',CHECKOUT_ENABLED:'false'};
const server=http.createServer(async(req,res)=>{
  try {
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const request=new Request(new URL(req.url,origin),{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
    const response=await worker.fetch(request,env);
    res.writeHead(response.status,Object.fromEntries(response.headers));
    if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
  } catch {res.writeHead(500).end('Local service error');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local commerce website: ${origin} (checkout disabled; test fixtures only)`));
