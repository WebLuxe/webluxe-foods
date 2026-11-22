// Builds the files the site actually loads: js/app.min.js (fx + app), js/stage.min.js (stage + only the parts
// of three.js it uses) and js/vendor/qrcode.min.js. Run with `npm run build:js`.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const common = { minify: true, target: 'es2020', legalComments: 'none', logLevel: 'info' };
await build({ ...common, stdin: { contents: readFileSync('js/fx.js', 'utf8') + '\n' + readFileSync('js/app.js', 'utf8'), loader: 'js' }, outfile: 'js/app.min.js' });
await build({ ...common, entryPoints: ['js/stage.js'], bundle: true, format: 'esm', outfile: 'js/stage.min.js' });
await build({ ...common, entryPoints: ['js/vendor/qrcode.js'], outfile: 'js/vendor/qrcode.min.js' });
