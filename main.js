
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

ipcMain.on('window-control', (ev, action) => {
  if (!mainWindow) return;
  switch (action) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      break;
    case 'close':
      mainWindow.close();
      break;
    case 'fullscreen':
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      break;
  }
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#151515',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'YTD (Youtube Downloader)',
    autoHideMenuBar: true
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // Hide the default application menu (File/Edit/etc.)
  try { Menu.setApplicationMenu(null); } catch (e) { /* ignore */ }
  try { mainWindow.removeMenu(); mainWindow.setMenuBarVisibility(false); } catch (e) { /* ignore */ }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-download-path', () => {
  const downloads = app.getPath('downloads');
  const ytdDir = path.join(downloads, 'YTD');
  try { fs.mkdirSync(ytdDir, { recursive: true }); } catch (e) { /* ignore */ }
  return ytdDir;
});

ipcMain.handle('choose-folder', async () => {
  const defaultDir = path.join(app.getPath('downloads'), 'YTD');
  try { fs.mkdirSync(defaultDir, { recursive: true }); } catch (e) { /* ignore */ }
  const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'], defaultPath: defaultDir });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

ipcMain.on('open-external', (ev, url) => {
  if (typeof url === 'string') shell.openExternal(url);
});

ipcMain.on('download-url', (ev, { url, outDir }) => {
  if (!url) {
    mainWindow.webContents.send('download-progress', { error: 'URL is empty' });
    return;
  }

  const defaultDir = path.join(app.getPath('downloads'), 'YTD');
  try { fs.mkdirSync(defaultDir, { recursive: true }); } catch (e) { /* ignore */ }
  const downloadDir = outDir || defaultDir;

  // Try to use yt-dlp-exec package binary if available, otherwise fallback to system 'yt-dlp' command
  const tryYtDlp = require('which').sync;
  let cmd = 'yt-dlp';
  try {
    // which.sync will throw if not found
    const bin = tryYtDlp('yt-dlp');
    if (bin) cmd = bin;
  } catch (e) {
    // fallthrough: assume yt-dlp is in PATH or yt-dlp-exec package will be used
  }

  // Ensure we download a single video, do not set file mtime to upload time,
  // restrict filenames to safe characters and output to the YTD downloads folder.
  const args = [
    '-o', path.join(downloadDir, '%(title)s.%(ext)s'),
    '--no-playlist',
    '--max-downloads', '1',
    '--no-mtime',
    '--restrict-filenames',
    '--newline',
    url
  ];

  const proc = spawn(cmd, args, { shell: true });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      mainWindow.webContents.send('download-progress', { line });
    }
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      mainWindow.webContents.send('download-progress', { line, stderr: true });
    }
  });

  proc.on('error', (err) => {
    mainWindow.webContents.send('download-progress', { error: String(err) });
  });

  proc.on('close', (code) => {
    mainWindow.webContents.send('download-progress', { done: true, code });
  });
});
