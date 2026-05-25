const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const http = require('http')

let mainWindow = null
let apiProcess = null
let webProcess = null

const NEXT_PORT = 3000
const API_PORT = 3001

function checkServerReady(port, callback) {
  const req = http.request({ port, host: '127.0.0.1', path: '/', method: 'GET' }, (res) => {
    // Treat any response status code (including redirects, auth errors, etc.) as the server being alive
    if (res.statusCode) {
      callback()
    } else {
      setTimeout(() => checkServerReady(port, callback), 500)
    }
  })
  req.on('error', () => {
    setTimeout(() => checkServerReady(port, callback), 500)
  })
  req.end()
}

function startServers() {
  const isPackaged = app.isPackaged;
  
  const apiDir = isPackaged ? path.join(process.resourcesPath, 'bundled/api') : path.join(__dirname, '../api');
  const webDir = isPackaged ? path.join(process.resourcesPath, 'bundled/web') : path.join(__dirname, '../web');

  const dbPath = path.resolve(apiDir, 'prisma/dev.db')
  const dbUrl = `file:${dbPath}`

  const apiEntry = path.join(apiDir, 'dist/index.js')
  const webEntry = path.join(webDir, 'node_modules/next/dist/bin/next')

  console.log(`⚡ [Electron/Supervisor] SQLite Database Path: ${dbPath}`)
  console.log(`⚡ [Electron/Supervisor] Packaged Mode: ${isPackaged}`)
  console.log('⚡ [Electron/Supervisor] Booting background Express API server...')

  apiProcess = spawn('node', [apiEntry], {
    cwd: apiDir,
    env: { ...process.env, PORT: API_PORT, DATABASE_URL: dbUrl }
  })

  apiProcess.stdout.on('data', (data) => console.log(`[API]: ${data}`))
  apiProcess.stderr.on('data', (data) => console.error(`[API ERROR]: ${data}`))

  console.log('⚡ [Electron/Supervisor] Booting background Next.js Web server...')
  webProcess = spawn('node', [
    webEntry,
    'start',
    '-p',
    NEXT_PORT
  ], {
    cwd: webDir,
    env: { ...process.env, PORT: NEXT_PORT }
  })

  webProcess.stdout.on('data', (data) => console.log(`[WEB]: ${data}`))
  webProcess.stderr.on('data', (data) => console.error(`[WEB ERROR]: ${data}`))
}

function getLoadingHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #020617;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 24px;
    }
    .logo {
      font-size: 36px;
      font-weight: 800;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -1px;
    }
    .tagline {
      font-size: 14px;
      color: #64748b;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #1e293b;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .status {
      font-size: 13px;
      color: #475569;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="logo">FinNBiz</div>
  <div class="tagline">Desktop Ledger Suite</div>
  <div class="spinner"></div>
  <div class="status">Starting services, please wait...</div>
</body>
</html>`
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'FinNBiz - Desktop Ledger Suite',
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Show loading screen immediately — no more black screen!
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getLoadingHTML())}`)

  console.log('⏳ [Electron/Supervisor] Waiting for Next.js web application to be ready...')
  checkServerReady(NEXT_PORT, () => {
    console.log('🚀 [Electron/Supervisor] Next.js server is ready! Loading window...')
    if (mainWindow) {
      mainWindow.loadURL(`http://localhost:${NEXT_PORT}`)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  startServers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  console.log('🔌 [Electron/Supervisor] Window closed. Stopping background servers gracefully...')
  if (apiProcess) {
    try {
      apiProcess.kill()
    } catch (e) {
      console.error('Failed to kill API process:', e)
    }
  }
  if (webProcess) {
    try {
      webProcess.kill()
    } catch (e) {
      console.error('Failed to kill Web process:', e)
    }
  }
  if (process.platform !== 'darwin') app.quit()
})
