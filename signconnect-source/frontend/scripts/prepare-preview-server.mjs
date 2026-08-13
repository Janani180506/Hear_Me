import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const targetDir = resolve(projectRoot, '.output/public/server');
const targetFile = resolve(targetDir, 'server.js');
const serverBundlePath = resolve(projectRoot, '.output/server/index.mjs');

let serverBundleContent = '';
try {
  serverBundleContent = await readFile(serverBundlePath, 'utf8');
} catch {
  // The build output may not exist yet; the preview command will fail later if it does.
}

if (serverBundleContent.includes('function augmentReq(cfReq, ctx)')) {
  const patchedBundle = serverBundleContent.replace(
    `function augmentReq(cfReq, ctx) {
\tconst req = cfReq;
\treq.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
\treq.runtime ??= { name: "cloudflare" };
\treq.runtime.cloudflare = {
\t\t...req.runtime.cloudflare,
\t\t...ctx
\t};
\treq.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}`,
    `function augmentReq(cfReq, ctx) {
\tconst req = cfReq;
\tconst ip = cfReq.headers.get("cf-connecting-ip") || void 0;
\ttry {
\t\treq.ip = ip;
\t} catch {
\t\tObject.defineProperty(req, "ip", {
\t\t\tconfigurable: true,
\t\t\tenumerable: true,
\t\t\tget() {
\t\t\t\treturn ip;
\t\t\t},
\t\t});
\t}
\treq.runtime ??= { name: "cloudflare" };
\treq.runtime.cloudflare = {
\t\t...req.runtime.cloudflare,
\t\t...ctx
\t};
\treq.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}`,
  );

  if (patchedBundle !== serverBundleContent) {
    await writeFile(serverBundlePath, patchedBundle, 'utf8');
  }
}

const content = `import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = resolve(process.cwd());
const serverEntry = await import(pathToFileURL(resolve(projectRoot, '.output/server/index.mjs')).href);

export default {
  async fetch(request) {
    return serverEntry.default.fetch(request, {}, {});
  },
};
`;

await mkdir(targetDir, { recursive: true });
await writeFile(targetFile, content, 'utf8');
console.log(`Prepared preview server entry at ${targetFile}`);
