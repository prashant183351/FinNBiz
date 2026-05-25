const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '../../..')
const BUNDLED_DIR = path.resolve(__dirname, '../bundled')

function copyBundle() {
  console.log('📦 Cleaning bundled directory...')
  fs.rmSync(BUNDLED_DIR, { recursive: true, force: true })
  fs.mkdirSync(path.join(BUNDLED_DIR, 'api'), { recursive: true })
  fs.mkdirSync(path.join(BUNDLED_DIR, 'web'), { recursive: true })

  console.log('📦 Copying API...')
  fs.cpSync(path.join(ROOT_DIR, 'apps/api/dist'), path.join(BUNDLED_DIR, 'api/dist'), { recursive: true, dereference: true })
  fs.cpSync(path.join(ROOT_DIR, 'apps/api/prisma'), path.join(BUNDLED_DIR, 'api/prisma'), { recursive: true, dereference: true })
  fs.cpSync(path.join(ROOT_DIR, 'apps/api/node_modules'), path.join(BUNDLED_DIR, 'api/node_modules'), { recursive: true, dereference: true })
  fs.copyFileSync(path.join(ROOT_DIR, 'apps/api/package.json'), path.join(BUNDLED_DIR, 'api/package.json'))

  console.log('📦 Copying Web...')
  fs.cpSync(path.join(ROOT_DIR, 'apps/web/.next'), path.join(BUNDLED_DIR, 'web/.next'), { recursive: true, dereference: true })
  fs.cpSync(path.join(ROOT_DIR, 'apps/web/public'), path.join(BUNDLED_DIR, 'web/public'), { recursive: true, dereference: true })
  fs.cpSync(path.join(ROOT_DIR, 'apps/web/node_modules'), path.join(BUNDLED_DIR, 'web/node_modules'), { recursive: true, dereference: true })
  fs.copyFileSync(path.join(ROOT_DIR, 'apps/web/package.json'), path.join(BUNDLED_DIR, 'web/package.json'))

  console.log('✅ Bundling complete!')
}

copyBundle()
