import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.env.NEXT_TEST_WASM_DIR ??= path.join(repositoryRoot, 'node_modules', '@next', 'swc-wasm-nodejs')

await import('next/dist/bin/next')
