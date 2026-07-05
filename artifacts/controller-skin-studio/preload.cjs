const { contextBridge, ipcRenderer } = require('electron');

// Exposed to the renderer as window.electronAPI. Kept deliberately narrow —
// three calls, nothing else — since contextIsolation is on and we don't want
// to hand the renderer anything more powerful than it needs.
contextBridge.exposeInMainWorld('electronAPI', {
  libraryLoad:   (section) => ipcRenderer.invoke('library:load', section),
  libraryAdd:    (section, name, dataUrl) => ipcRenderer.invoke('library:add', section, name, dataUrl),
  libraryRemove: (section, id) => ipcRenderer.invoke('library:remove', section, id),
});
