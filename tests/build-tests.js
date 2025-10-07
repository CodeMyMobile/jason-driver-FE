import { build } from 'esbuild'
import { rmSync } from 'fs'

rmSync('tests/dist', { recursive: true, force: true })

await build({
  entryPoints: ['src/utils/time.ts', 'src/api/client.ts'],
  outdir: 'tests/dist',
  bundle: false,
  format: 'esm',
  platform: 'node',
  sourcemap: false,
  target: 'es2022',
})
