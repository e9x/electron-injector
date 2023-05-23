# Electron Injector

A web-based Asar preload injector.

https://injector.sys32.dev/

See [how it works](./How-it-works.md)

## Features

- No .exe
- Simple
- Fast

## Tutorials

### Injecting a script with a URL

https://github.com/e9x/electron-injector/assets/76465669/981ff862-940c-4a6c-bfe7-1cfb787511cd

> 🛑 Make sure you backup your Asar file. 🛑
> 🛑 Make sure you only upload your backup of your Asar file! 🛑
> 🛑 Always remove your modifications from the Asar before uploading. Never upload your injected "app.asar" and try to inject it twice. 🛑

1. Go to https://injector.sys32.dev/
2. Right click a shortcut to the Electron program
3. Select "Open file location"
4. Open the "resources" folder
5. Rename "app.asar" to "app backup.asar"
   Keep a copy of the original Asar file to avoid losing it when you want to revert the changes.
6. Drag "app backup.asar" into the "Drag and drop .asar file here..." box on the website
7. Get your script URL
   The script URL isn't the same as the page for it.

   On GitHub, you have to click the "raw" button then copy the link from your address bar.

   Websites like pastebin.com won't work unless you enable "Disable WebSecurity". This is because of how pastebin has configured their CORS (Cross-Origin Resource Sharing).

8. Select the "Script URLs" tab
9. Enter your script URL into the box
10. Click on "Inject Script"
    This may take a few seconds. You will automatically be taken to the "Output" tab.
11. Download the output "app.asar"
12. Move the "app.asar" into the Electron "resources" folder

### Injecting a script with a file

https://github.com/e9x/electron-injector/assets/76465669/98e16584-cfeb-40d8-bb48-7f5e37ceb83f

> 🛑 Make sure you backup your Asar file. 🛑
> 🛑 Make sure you only upload your backup of your Asar file! 🛑
> 🛑 Always remove your modifications from the Asar before uploading. Never upload your injected "app.asar" and try to inject it twice. 🛑

1. Go to https://injector.sys32.dev/
2. Right click a shortcut to the Electron program
3. Select "Open file location"
4. Open the "resources" folder
5. Rename "app.asar" to "app backup.asar"
   Keep a copy of the original Asar file to avoid losing it when you want to revert the changes.
6. Drag "app backup.asar" into the "Drag and drop .asar file here..." box on the website
7. Select the "Upload JavaScript Files" tab.
8. Drag your script into the "Drag and drop your JavaScript files here..." box.
9. Click on "Inject Script"
   This may take a few seconds. You will automatically be taken to the "Output" tab.
10. Download the output "app.asar"
11. Move the "app.asar" into the "resources" folder

### Removing all the changes

https://github.com/e9x/electron-injector/assets/76465669/72cd4d62-4878-4f47-b228-5b8474d5aa72

1. Right click a shortcut to the Electron program
2. Select "Open file location"
3. Open the "resources" folder
4. Delete "app.asar"
5. Rename "app backup.asar" to "app.asar"

## Hosting quickstart

This is to host https://injector.sys32.dev/ locally.

```sh
git clone https://github.com/e9x/client-injector
cd client-injector
npm install
npm run dev
```
