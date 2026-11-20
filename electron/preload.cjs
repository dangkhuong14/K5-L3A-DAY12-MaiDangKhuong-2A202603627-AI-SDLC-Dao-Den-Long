// Narrow bridge between the game page and the Electron main process (leaderboard file + benchmark reporting).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ddlNative', {
  electron: process.versions.electron,
  lbGet: () => ipcRenderer.invoke('lb:get'),
  lbSave: entries => ipcRenderer.invoke('lb:save', entries),
  benchFirstFrame: (epochMs, info) => ipcRenderer.send('bench:first', epochMs, info),
  benchDone: dts => ipcRenderer.send('bench:done', dts)
});
