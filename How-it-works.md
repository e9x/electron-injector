# How it works

A lot of the behavior is similar to the [client patcher](https://github.com/y9x/client-patcher).

1. Open the Electron Asar archive
   This file is similar to a zip archive. It contains all the scripts for the client.

   You can find this by opening the folder where the Electron executable can be found. There will be a folder named "resources". Inside of it, you'll find the app.asar.

   Tools that can be used to open the Asar archive are:

   - 7-Zip - [Asar7z](https://www.tc4shell.com/en/7zip/asar/)
   - [@electron/asar](https://www.npmjs.com/package/@electron/asar)

2. Open package.json and locate the entry point
   Electron apps are structured like NodeJS libraries. The package file contains a field named "main". This allows NodeJS and Electron to determine the location of the main entry point.

   In the case of Electron, this entry point is executed in the [main process](https://www.electronjs.org/docs/latest/tutorial/process-model#the-main-process).

   The main process is responsible for creating the [BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window) which has an API for running a script everytime a page loads.

3. Hook BrowserWindow and run our own preload.

   We can use require.cache to overwrite the exports on the `electron` module. By default, Electron freezes the module exports and makes all the descriptors unconfigurable. This can be bypased by overriding the exports on the module itself.

   ```js
   (() => {
     "use strict";
     const { BrowserWindow } = require("electron");
     const electronModule = require.cache.electron;
     const electronExports = electronModule.exports;

     const descs = Object.getOwnPropertyDescriptors(electronExports);

     function hooked(options) {
       const bw = new BrowserWindow(options);

       console.log("Stole the BrowserWindow:", bw, options);

       return bw;
     }

     descs.BrowserWindow.get = () => {
       return hooked;
     };

     const newExports = Object.defineProperties({}, descs);

     Object.defineProperty(electronModule, "exports", {
       get: () => newExports,
       configurable: true,
       enumerable: true,
     });
   })();
   ```

   All we have to do is modify the entry point and add this code before everything else.

4. Change the preload to a custom one and make sure the original is executed
   The original preload can be accessed via `options.webPreferences.preload`. For the purpose of this, explanation, this part will be omitted.
