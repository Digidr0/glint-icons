import { defineConfig } from 'vite';
import { texturePreviewsPlugin } from './scripts/texture-previews.js';

export default defineConfig({ plugins: [texturePreviewsPlugin()] });
