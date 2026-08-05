// Guard: this file must be run by Electron, not plain Node.js.
// Running `node main.js` directly causes ipcMain to be undefined.
if (!process.versions.electron) {
  console.error("Error: run with Electron, not Node.js.\n  npm run start   (development)\n  or double-click Operations Report.exe");
  process.exit(1);
}

const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const path = require("path");
const fs = require("fs");

function configPath() {
  // Portable app: keep config.json next to the .exe so it survives updates
  // and teammates can hand-edit it if needed, same as the finfo app.
  const dir = app.isPackaged ? path.dirname(process.execPath) : __dirname;
  return path.join(dir, "config.json");
}

function readConfig() {
  try {
    const raw = fs.readFileSync(configPath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.appUrl === "string" && /^https?:\/\//.test(parsed.appUrl)) {
      return parsed;
    }
  } catch {
    // no config yet, or it's invalid — fall through to null
  }
  return null;
}

function writeConfig(config) {
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), "utf-8");
}

let mainWindow;

function loadInputPage(win, appUrl) {
  const url = new URL("/input", appUrl).toString();
  win.loadURL(url);
}

function showSetup(win) {
  win.loadFile(path.join(__dirname, "setup.html"));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    title: "Operations Report",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setMenu(
    Menu.buildFromTemplate([
      {
        label: "File",
        submenu: [
          {
            label: "Change Server URL...",
            click: () => showSetup(mainWindow),
          },
          { label: "Reload", role: "reload" },
          { type: "separator" },
          { label: "Exit", role: "quit" },
        ],
      },
    ])
  );

  // Open any target="_blank" links (e.g. GitHub links) in the real browser
  // instead of a new Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const config = readConfig();
  if (config) {
    loadInputPage(mainWindow, config.appUrl);
  } else {
    showSetup(mainWindow);
  }
}

ipcMain.handle("save-server-url", (_event, appUrl) => {
  try {
    const url = new URL(appUrl);
    if (!/^https?:$/.test(url.protocol)) throw new Error("URL must start with http:// or https://");
  } catch (err) {
    return { ok: false, error: err.message };
  }
  writeConfig({ appUrl });
  loadInputPage(mainWindow, appUrl);
  return { ok: true };
});

ipcMain.handle("get-current-url", () => {
  const config = readConfig();
  return config?.appUrl ?? "";
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
