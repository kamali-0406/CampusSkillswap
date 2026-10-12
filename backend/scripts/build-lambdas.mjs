// Bundles each Lambda (plus shared services/utils) into dist/<name>.zip, ready to upload to AWS Lambda.
// Handler to configure in Lambda: index.handler  | Runtime: Node.js 20.x or newer
// The AWS SDK v3 is already included in the Lambda runtime, so it is left out of the bundle.
import { build } from 'esbuild';
import AdmZip from 'adm-zip';
import { mkdirSync, rmSync, existsSync } from 'node:fs';

const names = ['users', 'skills', 'matching', 'requests', 'ratings'];
if (existsSync('dist')) rmSync('dist', { recursive: true });
mkdirSync('dist', { recursive: true });

for (const name of names) {
  await build({
    entryPoints: [`lambdas/${name}/index.js`], outfile: `dist/${name}/index.mjs`,
    bundle: true, platform: 'node', target: 'node20', format: 'esm', minify: false,
    external: ['@aws-sdk/*']
  });
  const zip = new AdmZip();
  zip.addLocalFile(`dist/${name}/index.mjs`);
  zip.writeZip(`dist/${name}.zip`);
  console.log(`built dist/${name}.zip`);
}
