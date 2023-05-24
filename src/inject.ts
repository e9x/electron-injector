import {
  compileAsar,
  isFolder,
  createFile,
  openAsar,
  resolvePath,
  modifyFile,
} from "./Asar";

interface ElectronPackage {
  main: string;
}

export enum SourceType {
  url,
  code,
}

function generateHook(
  preload: string,
  devTools: boolean,
  disableWebSecurity: boolean
) {
  const webPreferences: Record<string, unknown> = {};

  if (disableWebSecurity) webPreferences.webSecurity = false;
  if (devTools) webPreferences.devtools = true;

  return (
    "(() => {" +
    '"use strict";' +
    'const { resolve } = require("path");' +
    'const { BrowserWindow } = require("electron");' +
    `const customPreload = resolve(__dirname, ${JSON.stringify(preload)});` +
    "function hooked(options = {}) {" +
    "const webPreferences = options.webPreferences || {};" +
    // don't inject into incompatible windows
    // we might break the client by trying to "fix" them
    // official krunker.io client has nodeIntegration enabled on the splash window
    // but not the game window
    "if (webPreferences.nodeIntegration || webPreferences.sandbox || webPreferences.contextIsolation) return new BrowserWindow(options);" +
    `const bw = new BrowserWindow({ ...options, webPreferences: {  ...webPreferences, preload: customPreload, ...${JSON.stringify(
      webPreferences
    )} } });` +
    (devTools
      ? 'bw.webContents.openDevTools({ active: true, mode: "undocked" });'
      : "") +
    'bw.webContents.on("ipc-message-sync", (event, channel) => { if (channel === "original-preload") event.returnValue = webPreferences.preload });' +
    "return bw;" +
    "};" +
    "const electronModule = require.cache.electron;" +
    "const electronExports = electronModule.exports;" +
    "const descs = Object.getOwnPropertyDescriptors(electronExports);" +
    "descs.BrowserWindow.get = () => hooked;" +
    "const newExports = Object.defineProperties({}, descs);" +
    'Object.defineProperty(electronModule, "exports", { get: () => newExports, configurable: true, enumerable: true });' +
    "})();"
  );
}

export async function injectScript(
  blob: Blob,
  sourceType: SourceType,
  value: string,
  devTools: boolean,
  disableWebSecurity: boolean
) {
  const asar = await openAsar(blob);

  const preloadFile = "custom-preload.js";

  // we use eval() to expose require() and other nodejs functions to the userscripts
  // this is dangerous but very good for making cheats harder to detect
  const preloadEval =
    sourceType === SourceType.code
      ? `try { eval(${JSON.stringify(
          value + "\n//# sourceURL=injected"
        )}) } catch (err) { console.error(err) }`
      : `for (const src of ${JSON.stringify(
          value.split(",").map((val) => val.trim())
        )}) try {` +
        "const http = new XMLHttpRequest();" +
        'http.open("GET", src, false);' +
        "http.send();" +
        'try{eval(http.responseText + "\\n//# sourceURL=" + src) } catch (err) { console.error(err) }' +
        "} catch (err) { console.error(err) }";

  const preload =
    preloadEval +
    'const originalPreload = require("electron").ipcRenderer.sendSync("original-preload");' +
    "if (originalPreload) require(originalPreload);";

  const main = generateHook(preloadFile, devTools, disableWebSecurity);

  const pkgFile = resolvePath(asar, "package.json");
  if (isFolder(pkgFile)) throw new TypeError("package.json was a folder");

  const pkg = JSON.parse(await asar.getFile(pkgFile).text()) as ElectronPackage;

  const mainFile = resolvePath(asar, pkg.main);
  if (isFolder(mainFile)) throw new TypeError("entry point was a folder");

  const mainDir = resolvePath(asar, `${pkg.main}/..`);
  if (!isFolder(mainDir))
    throw new TypeError("failure finding entry point dir");

  const mainJS = await asar.getFile(mainFile).text();

  if (preloadFile in mainDir.files)
    throw new TypeError(
      "Asar is already injected. Remove your modifications to the Asar before trying to inject."
    );

  mainDir.files[preloadFile] = await createFile(new Blob([preload]));
  await modifyFile(mainFile, new Blob([main + mainJS]));

  return await compileAsar(asar);
}
