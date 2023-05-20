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
  openDevTools: boolean,
  disableWebSecurity: boolean
) {
  return (
    "(() => {" +
    '"use strict";' +
    'const { join } = require("path");' +
    'const { BrowserWindow } = require("electron");' +
    "const electronModule = require.cache.electron;" +
    "const electronExports = electronModule.exports;" +
    "const descs = Object.getOwnPropertyDescriptors(electronExports);" +
    `const customPreload = join(__dirname, ${JSON.stringify(preload)});` +
    "function hooked(options) {" +
    "const oldPreload = options && options.webPreferences ? options.webPreferences.preload : undefined;" +
    `const bw = new BrowserWindow({ ...(options || {}), webPreferences: {  ...(options.webPreferences || {}), preload: customPreload, sandbox: false${
      disableWebSecurity ? ", webSecurity: false" : ""
    } } });` +
    (openDevTools ? 'bw.webContents.openDevTools({ mode: "undocked" });' : "") +
    'bw.webContents.on("ipc-message-sync", (event, channel) => { if (channel === "original-preload") event.returnValue = oldPreload; });' +
    "return bw;" +
    "};" +
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
  openDevTools: boolean,
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

  const main = generateHook(preloadFile, openDevTools, disableWebSecurity);

  const pkgFile = resolvePath(asar, "package.json");
  if (isFolder(pkgFile)) throw new Error("package.json was a folder");

  const pkg = JSON.parse(await asar.getFile(pkgFile).text()) as ElectronPackage;

  const mainFile = resolvePath(asar, pkg.main);

  if (isFolder(mainFile)) throw new Error("entry point was a folder");

  const mainJS = await asar.getFile(mainFile).text();

  await createFile(asar, preloadFile, new Blob([preload]));

  await modifyFile(mainFile, new Blob([main + mainJS]));

  return await compileAsar(asar);
}
