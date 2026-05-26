const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const http = require('http')
const fs = require('fs')

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

  console.log('⚡ [Electron/Supervisor] Booting internal static web server...')
  webProcess = serveStatic(webDir, NEXT_PORT)
}

function serveStatic(webDir, port) {
  const mimeTypes = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
    '.txt': 'text/plain', '.webp': 'image/webp'
  };
  
  const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';
    
    // Prevent directory traversal
    urlPath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
    
    let filePath = path.join(webDir, urlPath);
    
    // Handle Next.js clean URLs by appending .html
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      if (fs.existsSync(filePath + '.html')) {
        filePath += '.html';
      } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
        filePath = path.join(filePath, 'index.html');
      } else {
        filePath = path.join(webDir, '404.html');
      }
    }
    
    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });
  
  server.listen(port, '127.0.0.1');
  return server;
}

function getLoadingHTML() {
  let logoB64 = '';
  try {
    const logoPath = path.join(__dirname, 'build/logo.jpg');
    if (fs.existsSync(logoPath)) {
      logoB64 = 'data:image/jpeg;base64,' + fs.readFileSync(logoPath, 'base64');
    }
  } catch (e) {
    console.error('Failed to load logo image:', e);
  }

  const logoHtml = logoB64 
    ? `<img src="${logoB64}" class="app-logo" alt="FinNBiz Logo">`
    : `<div class="logo">FinNBiz</div><div class="tagline">Desktop Ledger Suite</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #020617; /* Very dark slate, almost black */
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 24px;
    }
    .app-logo {
      width: 240px;
      height: auto;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(132, 204, 22, 0.2);
    }
    .logo {
      font-size: 36px;
      font-weight: 800;
      background: linear-gradient(135deg, #84cc16, #a3e635); /* Bright green */
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -1px;
    }
    .tagline {
      font-size: 14px;
      color: #94a3b8;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #1e293b;
      border-top-color: #84cc16; /* Bright green */
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .status {
      font-size: 14px;
      color: #84cc16; /* Bright green */
      font-weight: 500;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  ${logoHtml}
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
      webProcess.close()
    } catch (e) {
      console.error('Failed to close Web server:', e)
    }
  }
  if (process.platform !== 'darwin') app.quit()
})
