const API_VERSION = '2022-11-28';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const cors = {
      'Access-Control-Allow-Origin': env.PAGES_ORIGIN,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
      'Vary': 'Origin',
      'Cache-Control': 'no-store'
    };
    if (request.method === 'OPTIONS') return new Response(null, {status:204,headers:cors});
    if (origin && origin !== env.PAGES_ORIGIN) return response({error:'Origin not allowed'},403,cors);
    try {
      if (url.pathname === '/auth/start' && request.method === 'GET') return authStart(url, env);
      if (url.pathname === '/auth/callback' && request.method === 'GET') return authCallback(url, env);
      if (url.pathname === '/api/me' && request.method === 'GET') {
        const viewer = await authorize(request, env);
        return response({login:viewer.login,permission:viewer.permission},200,cors);
      }
      if (url.pathname === '/api/entries' && request.method === 'GET') return response({entries:await listEntries(env)},200,cors);
      if (url.pathname === '/api/entries' && request.method === 'POST') {
        const viewer = await authorize(request, env);
        const input = await parseEntry(request);
        const now = new Date().toISOString();
        const entry = {...input,id:crypto.randomUUID(),schemaVersion:1,createdAt:now,updatedAt:now,createdBy:viewer.login,updatedBy:viewer.login};
        await writeEntry(env,entry,null,viewer.token,`Create intake ${entry.id}`);
        return response({entry},201,cors);
      }
      const match = url.pathname.match(/^\/api\/entries\/([a-zA-Z0-9-]+)$/);
      if (match) {
        const id = match[1];
        if (request.method === 'GET') return response({entry:(await readEntry(env,id)).entry},200,cors);
        const viewer = await authorize(request, env);
        const current = await readEntry(env,id,viewer.token);
        if (request.method === 'PUT') {
          const input = await parseEntry(request);
          const entry = {...input,id,schemaVersion:1,createdAt:current.entry.createdAt,createdBy:current.entry.createdBy,updatedAt:new Date().toISOString(),updatedBy:viewer.login};
          await writeEntry(env,entry,current.sha,viewer.token,`Update intake ${id}`);
          return response({entry},200,cors);
        }
        if (request.method === 'DELETE') {
          await github(env,`/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/data/entries/${id}.json`,{
            method:'DELETE',token:viewer.token,body:{message:`Delete intake ${id}`,sha:current.sha,branch:'main'}
          });
          return response({deleted:true,id},200,cors);
        }
      }
      return response({error:'Not found'},404,cors);
    } catch (error) {
      return response({error:error.message || 'Request failed'},error.status || 500,cors);
    }
  }
};

function response(data,status,headers={}) {
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff',...headers}});
}
function encode64(bytes) { let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary); }
function decode64(value) { const binary=atob(value.replace(/\s/g,''));return Uint8Array.from(binary,ch=>ch.charCodeAt(0)); }
function base64url(bytes) { return encode64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function fromBase64url(text) { return decode64(text.replace(/-/g,'+').replace(/_/g,'/')); }
async function key(env,usage) {
  if (!env.SESSION_KEY) throw new Error('Session key missing');
  const bytes=await crypto.subtle.digest('SHA-256',encoder.encode(env.SESSION_KEY));
  return crypto.subtle.importKey('raw',bytes,{name:usage,hash:'SHA-256'},false,usage==='HMAC'?['sign','verify']:['encrypt','decrypt']);
}
async function sign(value,env) { return base64url(new Uint8Array(await crypto.subtle.sign('HMAC',await key(env,'HMAC'),encoder.encode(value)))); }
async function seal(value,env) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(env,'AES-GCM'),encoder.encode(JSON.stringify(value))));
  return `${base64url(iv)}.${base64url(cipher)}`;
}
async function unseal(text,env) {
  try {
    const [a,b]=text.split('.');
    const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64url(a)},await key(env,'AES-GCM'),fromBase64url(b));
    const value=JSON.parse(decoder.decode(clear));
    if (!value.token || value.exp < Date.now()) throw new Error('Session expired');
    return value;
  } catch { throw Object.assign(new Error('Sign in again'),{status:401}); }
}
function allowedReturn(raw,env) {
  const value=new URL(raw || `${env.PAGES_ORIGIN}${env.PAGES_PATH}`);
  if (value.origin!==env.PAGES_ORIGIN || !value.pathname.startsWith(env.PAGES_PATH)) throw Object.assign(new Error('Invalid return URL'),{status:400});
  return value.href;
}
async function authStart(url,env) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) throw new Error('GitHub OAuth not configured');
  const back=allowedReturn(url.searchParams.get('return'),env);
  const payload=base64url(encoder.encode(JSON.stringify({back,exp:Date.now()+10*60*1000,nonce:crypto.randomUUID()})));
  const state=`${payload}.${await sign(payload,env)}`;
  const callback=`${url.origin}/auth/callback`;
  const target=new URL('https://github.com/login/oauth/authorize');
  target.searchParams.set('client_id',env.GITHUB_CLIENT_ID);
  target.searchParams.set('redirect_uri',callback);
  target.searchParams.set('scope','public_repo');
  target.searchParams.set('state',state);
  return Response.redirect(target.href,302);
}
async function authCallback(url,env) {
  const raw=url.searchParams.get('state') || '';
  const [payload,signature]=raw.split('.');
  if (!payload || !signature || signature!==await sign(payload,env)) throw Object.assign(new Error('Invalid sign-in state'),{status:400});
  const state=JSON.parse(decoder.decode(fromBase64url(payload)));
  if (state.exp < Date.now()) throw Object.assign(new Error('Sign-in expired'),{status:400});
  const back=new URL(allowedReturn(state.back,env));
  if (url.searchParams.get('error')) {back.hash=`${back.hash||'#/'}?auth_error=${encodeURIComponent(url.searchParams.get('error'))}`;return Response.redirect(back.href,302);}
  const code=url.searchParams.get('code');
  if (!code) throw Object.assign(new Error('Missing GitHub code'),{status:400});
  const tokenResponse=await fetch('https://github.com/login/oauth/access_token',{
    method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},
    body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:`${url.origin}/auth/callback`})
  });
  const tokenData=await tokenResponse.json();
  if (!tokenData.access_token) throw Object.assign(new Error(tokenData.error_description || 'GitHub token exchange failed'),{status:401});
  const viewer=await github(env,'/user',{token:tokenData.access_token});
  const permission=await github(env,`/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/collaborators/${viewer.login}/permission`,{token:tokenData.access_token});
  if (!['admin','maintain','write'].includes(permission.permission)) {
    back.hash=`${back.hash||'#/'}?auth_error=${encodeURIComponent('Repository write access required')}`;
    return Response.redirect(back.href,302);
  }
  const session=await seal({token:tokenData.access_token,login:viewer.login,exp:Date.now()+8*60*60*1000},env);
  back.hash=`${back.hash||'#/'}?session=${encodeURIComponent(session)}`;
  return Response.redirect(back.href,302);
}
async function authorize(request,env) {
  const header=request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) throw Object.assign(new Error('Sign in with GitHub'),{status:401});
  const session=await unseal(header.slice(7),env);
  const viewer=await github(env,'/user',{token:session.token});
  const permission=await github(env,`/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/collaborators/${viewer.login}/permission`,{token:session.token});
  if (!['admin','maintain','write'].includes(permission.permission)) throw Object.assign(new Error('Repository write access required'),{status:403});
  return {token:session.token,login:viewer.login,permission:permission.permission};
}
async function github(env,path,{method='GET',token,body}={}) {
  const result=await fetch(`https://api.github.com${path}`,{
    method,headers:{'Accept':'application/vnd.github+json','X-GitHub-Api-Version':API_VERSION,'User-Agent':'launch-engine-intake',...(token?{'Authorization':`Bearer ${token}`}:{}) ,...(body?{'Content-Type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined
  });
  if (result.status===204) return null;
  const data=await result.json().catch(()=>({}));
  if (!result.ok) throw Object.assign(new Error(data.message || `GitHub API ${result.status}`),{status:result.status});
  return data;
}
function contentPath(env,id) { return `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/data/entries/${id}.json`; }
async function readEntry(env,id,token) {
  const data=await github(env,contentPath(env,id),{token});
  return {entry:JSON.parse(decoder.decode(decode64(data.content))),sha:data.sha};
}
async function listEntries(env) {
  const files=await github(env,`/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/data/entries?ref=main`);
  const records=await Promise.all((Array.isArray(files)?files:[]).filter(file=>file.type==='file'&&file.name.endsWith('.json')).map(async file=>{
    const {entry}=await readEntry(env,file.name.slice(0,-5));
    return {id:entry.id,customerOrganization:entry.profile?.customerOrganization||'',workloadName:entry.profile?.workloadName||entry.workloads?.[0]?.name||'',engagementType:entry.profile?.engagementType||'',targetRegions:entry.profile?.targetRegions||'',targetGoLive:entry.profile?.targetGoLive||'',updatedAt:entry.updatedAt||''};
  }));
  return records.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
async function parseEntry(request) {
  const text=await request.text();
  if (text.length>250000) throw Object.assign(new Error('Entry exceeds 250 KB'),{status:413});
  let entry;
  try {entry=JSON.parse(text);} catch {throw Object.assign(new Error('Invalid JSON'),{status:400});}
  if (!entry || typeof entry!=='object' || Array.isArray(entry)) throw Object.assign(new Error('Invalid entry'),{status:400});
  return entry;
}
async function writeEntry(env,entry,sha,token,message) {
  const content=encode64(encoder.encode(`${JSON.stringify(entry,null,2)}\n`));
  return github(env,contentPath(env,entry.id),{method:'PUT',token,body:{message,content,branch:'main',...(sha?{sha}:{})}});
}
