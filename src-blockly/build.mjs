/**
 * Bundles the Blockly block into `admin/blockly.js`.
 *
 * The editor loads that file with a plain `<script>` tag, so the output has to be a self-contained
 * classic script - hence `iife` and no external imports.
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

await build({
    entryPoints: [join(ROOT, 'src-blockly', 'blockly.ts')],
    outfile: join(ROOT, 'admin', 'blockly.js'),
    bundle: true,
    format: 'iife',
    // The editor also runs in older browsers than the toolchain's default target
    target: 'es2020',
    // Keep the German and Russian words as they are instead of \u-escaping them
    charset: 'utf8',
    banner: {
        js:
            '// GENERATED FILE - do not edit.\n' +
            '// Source: src-blockly/blockly.ts - rebuild with `npm run build:blockly`.',
    },
    logLevel: 'info',
});
