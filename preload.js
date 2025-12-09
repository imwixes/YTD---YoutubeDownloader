const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getDownloadPath: () => ipcRenderer.invoke('get-download-path'),
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  download: (url, outDir) => ipcRenderer.send('download-url', { url, outDir }),
  onProgress: (cb) => ipcRenderer.on('download-progress', (e, data) => cb(data)),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  windowControl: (action) => ipcRenderer.send('window-control', action)
});
