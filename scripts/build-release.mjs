import { buildDist } from './build.mjs';

// Uses exactly the same fail-closed path as a Vercel Production build. This
// command builds locally only; it never deploys or changes hosted settings.
await buildDist({env:{...process.env,VERCEL_ENV:'production'}});
