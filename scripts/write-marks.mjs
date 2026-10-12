import { copyFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = resolve(here, 'icon.png')
const publicDir = resolve(here, '..', 'public')

copyFileSync(source, resolve(publicDir, 'favicon.png'))
copyFileSync(source, resolve(publicDir, 'og.png'))
