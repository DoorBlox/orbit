import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { assertProductionConfig } from './production-guard.mjs';

// Keep native modules and a deliberately small public distribution allowlist.
export const browserModules = [
  'app.js','board.js','constellation.js','csv.js','data.js','journal.js','scene.js','stickies.js',
  'backup.js','dates.js','layout.js','model.js','storage.js','widgets.js','styles.css',
  'bootstrap.js','auth/controller.js','auth/shell.js','cloud/client-config.js',
  'cloud/mappers.js','cloud/repository.js','cloud/sync.js','cloud/owner-tools.js',
];
export const sdkBuildOptions=(root,outdir)=>({
  entryPoints:[path.join(root,'src/cloud/client.js')],outfile:path.join(outdir,'src/cloud/client.js'),
  bundle:true,platform:'browser',format:'esm',target:['es2022'],minify:false,
  sourcemap:false,legalComments:'eof',logLevel:'silent',
});

const loopback = host => ['localhost','127.0.0.1','[::1]'].includes(host);
function publicUrl(value, label, originOnly = false) {
  let url;
  try { url = new URL(value); } catch { throw Error(`${label} must be an absolute URL.`); }
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback(url.hostname))) ||
      url.username || url.password || url.search || url.hash || (originOnly && url.pathname !== '/')) {
    throw Error(`${label} requires HTTPS (or local loopback HTTP), without credentials, query or fragment${originOnly ? ', and must be an origin' : ''}.`);
  }
  return originOnly ? url.origin : url.href;
}
function publicKey(value) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return value;
  // Local/older Supabase stacks use a public JWT. Allow only the unprivileged anon role.
  try {
    const parts = value.split('.');
    if (parts.length !== 3 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) throw Error();
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload.role === 'anon') return value;
  } catch { /* Fail closed without reflecting the rejected key. */ }
  throw Error('ORBIT_SUPABASE_PUBLISHABLE_KEY must be a publishable key or legacy anon JWT; secret/service-role keys cannot enter browser output.');
}

export function resolveBuildConfig(env = process.env, productionOptions) {
  const url = (env.ORBIT_SUPABASE_URL || '').trim();
  const key = (env.ORBIT_SUPABASE_PUBLISHABLE_KEY || '').trim();
  let site = (env.ORBIT_SITE_URL || '').trim();
  // Vercel supplies the immutable deployment hostname before a preview build starts.
  // Use only that exact safe hostname; never infer a production redirect or wildcard.
  if (!site && (url || key) && env.VERCEL_ENV === 'preview' && env.VERCEL_URL) {
    const host = env.VERCEL_URL;
    if (host.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+vercel\.app$/i.test(host)) {
      throw Error('Preview VERCEL_URL must be an exact *.vercel.app hostname without scheme, credentials, port or path.');
    }
    site = `https://${host}/`;
  }
  if (env.ORBIT_PUBLIC_RELEASE && env.ORBIT_PUBLIC_RELEASE !== 'false') {
    throw Error('Public release is not enabled for this milestone. Protected preview builds require publicRelease:false.');
  }
  if (!url && !key && !site) {
    if(env.VERCEL_ENV==='production')throw Error('Production requires all public cloud inputs together; local fallback is forbidden.');
    return null;
  }
  if (!url || !key || !site) throw Error('Configured cloud builds require ORBIT_SUPABASE_URL, ORBIT_SUPABASE_PUBLISHABLE_KEY and ORBIT_SITE_URL together.');
  const config = Object.freeze({
    supabaseUrl: publicUrl(url, 'ORBIT_SUPABASE_URL', true),
    publishableKey: publicKey(key),
    siteUrl: publicUrl(site, 'ORBIT_SITE_URL'),
    publicRelease: false,
  });
  if(env.VERCEL_ENV==='production')assertProductionConfig(config,productionOptions);
  return config;
}

export async function buildDist({ root = process.cwd(), outdir = path.join(root, 'dist'), env = process.env } = {}) {
  const config = resolveBuildConfig(env); // Reject unsafe/partial config before replacing a prior artifact.
  await rm(outdir, { recursive:true, force:true });
  await mkdir(path.join(outdir,'src'), { recursive:true });
  await cp(path.join(root,'index.html'), path.join(outdir,'index.html'));
  await mkdir(path.join(outdir,'assets'), {recursive:true});
  await cp(path.join(root,'assets','orbit.svg'), path.join(outdir,'assets','orbit.svg'));
  for (const file of browserModules) {
    await mkdir(path.dirname(path.join(outdir,'src',file)), { recursive:true });
    await cp(path.join(root,'src',file), path.join(outdir,'src',file));
  }
  // Bundle only the SDK boundary. All scrapbook/auth/repository modules stay native ESM.
  await build(sdkBuildOptions(root,outdir));
  await writeFile(path.join(outdir,'src/runtime-config.js'), `// Build-generated allowlisted public configuration. No privileged credentials.\nexport const runtimeConfig = ${JSON.stringify(config)};\n`);
  const index = await readFile(path.join(outdir,'index.html'), 'utf8');
  for (const ref of ['./src/bootstrap.js','./src/styles.css']) {
    if (!index.includes(ref)) throw Error(`Build missing browser entry: ${ref}`);
  }
  console.log(`Build complete: preserved spatial UI, native modules and one SDK bundle (${config ? 'protected cloud preview' : 'local prototype'}).`);
  return { config, outdir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await buildDist();
