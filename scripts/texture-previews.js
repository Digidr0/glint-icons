import { readdir, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const textureDirectory = fileURLToPath(new URL('../src/assets/textures/', import.meta.url));
export const previewDirectory = fileURLToPath(new URL('../src/assets/texture-previews/', import.meta.url));
const imageExtension = /\.(png|jpe?g|webp)$/i;
const recipe = '192-webp-q78-v1';

export async function generatePreview(source, outputDirectory = previewDirectory) {
  const bytes = await readFile(source);
  const fingerprint = createHash('sha256').update(recipe).update(bytes).digest('hex');
  const name = source.split(/[\\/]/).pop();
  const output = join(outputDirectory, `${name}.webp`);
  const stamp = `${output}.sha256`;
  try {
    if ((await readFile(stamp, 'utf8')) === fingerprint && (await stat(output)).size > 0) return false;
  } catch { /* First generation or missing preview. */ }
  await mkdir(outputDirectory, { recursive: true });
  // Only one source is decoded at a time by generateTexturePreviews.
  const preview = await sharp(bytes).rotate().resize(192, 192, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  await writeFile(output, preview);
  await writeFile(stamp, fingerprint);
  return true;
}

export async function generateTexturePreviews() {
  const entries = await readdir(textureDirectory, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (entry.isFile() && imageExtension.test(entry.name)) {
      if (await generatePreview(join(textureDirectory, entry.name))) count++;
    }
  }
  return count;
}

export function texturePreviewsPlugin() {
  let queue = Promise.resolve();
  return {
    name: 'glint-texture-previews',
    async buildStart() { await generateTexturePreviews(); },
    configureServer(server) {
      const update = path => {
        if (resolve(dirname(path)) !== resolve(textureDirectory) || !imageExtension.test(path)) return;
        queue = queue.then(() => generatePreview(path)).catch(error => server.config.logger.error(`Texture preview: ${error.message}`));
      };
      server.watcher.on('add', update).on('change', update);
      server.httpServer?.once('close', () => {
        server.watcher.off('add', update).off('change', update);
      });
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Generated ${await generateTexturePreviews()} texture previews.`);
}
