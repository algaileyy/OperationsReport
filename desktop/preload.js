const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  saveServerUrl: (url) => ipcRenderer.invoke("save-server-url", url),
  getCurrentUrl: () => ipcRenderer.invoke("get-current-url"),
});
