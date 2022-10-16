const { app, BrowserWindow, Menu, Tray, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const url = require('url')
const shell = require("electron").shell
const os = require('os')
const ip = require('ip')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

let tray

function createWindow () {
    // Create the browser window.style.css
    win = new BrowserWindow({
        center: true,
        width: 1024,
        height: 768,
        minWidth: 640,
        minHeight: 480,
        webPreferences: {
            nodeIntegration: true,
            // https://www.electronjs.org/docs/latest/tutorial/context-isolation/
            contextIsolation: false,
            //preload: path.join(__dirname, '../dist/preload.js'),
            // Enable websecurity for PROD build
            webSecurity: process.env.ELECTRON_START_URL === null
        }
    });

    const menuTemplate = [
        {
            label: 'Copiosus',
            submenu: [
                {
                    label: 'Quit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.isQuitting = true;
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Dev Tools',
                    accelerator: 'CmdOrCtrl+I',
                    click: () => {
                        if (win) {
                            win.webContents.toggleDevTools();
                        }
                    }
                },
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (win) {
                            win.webContents.reload();
                        }
                    }
                }
            ]
        },
        {
            label: 'Window',
            submenu: [
                {
                    label: 'Bring All to Front',
                    accelerator: 'CmdOrCtrl+W',
                    click: () => {
                        if (win === null) {
                            createWindow();
                        } else {
                            win.show();
                        }
                    }
                }
            ]
        }
    ];

    // Due to a bug in electron we need to have hotkeys in menu. Otherwise they don't work.
    if (process.platform === 'darwin') {
        menuTemplate.push({
            label: 'Edit',
            submenu: [
                {role: 'undo'},
                {role: 'redo'},
                {type: 'separator'},
                {role: 'cut'},
                {role: 'copy'},
                {role: 'paste'},
                {role: 'pasteandmatchstyle'},
                {role: 'delete'},
                {role: 'selectall'}
            ]
        })
    }

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    if (process.platform !== 'darwin') {

        var trayMenu = Menu.buildFromTemplate([
            {
                label: 'Open',
                click: () => {
                    if (win === null) {
                        createWindow();
                    } else {
                        win.show();
                    }
                }
            },
            {
                label: 'Quit',
                click: () => {
                    app.isQuitting = true;
                    app.quit();
                }
            },
        ]);

        tray = new Tray(path.join(__dirname, "images/icons/png/64x64.png"));
        tray.setToolTip("Copiosus");
        tray.setContextMenu(trayMenu);
        tray.setIgnoreDoubleClickEvents(true);
        tray.on("click", function() {
            if (win === null) {
                createWindow();
            } else {
                win.show();
            }
        });
    }

    // Let system handle files when opening new windows (e.g. <a href> with target=_blank)
    win.webContents.on('new-window', function(event, url) {
        event.preventDefault();
        shell.openExternal(url);
    });

    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, '../dist/index.html'),
        protocol: 'file:',
        slashes: true
    });

    win.webContents.on("did-finish-load", () => {

        /*
         * We need to load the custom library here since require doesn't work in
         * react as well as import doesn't seem to the load module correctly.
         */

        // TODO: Fix path
        var video = `window.video = require('/Users/dabeku/Documents/dev/electron_copiosus-client/build/Release/video.node')`;
        if (process.platform !== 'darwin') {
            video = "window.video = require('C:\\\\Dev\\\\node_video\\\\build\\\\Release\\\\video')";
        }
        win.webContents.executeJavaScript(video);
        let dgram = `window.dgram = require('dgram')`;
        win.webContents.executeJavaScript(dgram);
        let net = `window.net = require('net')`;
        win.webContents.executeJavaScript(net);
    });

    win.loadURL(startUrl);

    // and load the index.html of the app.
    /*win.loadURL(url.format({
        pathname: path.join(__dirname, '../dist/index.html'),
        protocol: 'file:',
        slashes: true
    }))*/

    // Open the DevTools: cmd + alt + i
    /*win.webContents.openDevTools(
        { mode: 'bottom' }
    );*/

    // Emitted when the window is closed.
    win.on('closed', () => {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            win = null
        }
    )

    win.on('close', (evt) => {
        if (!app.isQuitting) {
            evt.preventDefault();
            win.hide();
        }
        return false;
    })
}

// Close app if there is another instance running
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    console.log("Another instance of the app is already running. Quit.");
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        console.log("Someone tried to run a second instance, we should focus our window.");
        if (win) {
            win.show();
        }
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow();
    } else {
        win.show();
    }
});

// Required to set flag here too to allow quit by OS (taskbar, etc.)
app.on("before-quit", function() {
    app.isQuitting = true;
});

if (process.platform !== 'darwin') {
    app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true
    });
}

// Required to make notifications work in Windows
app.setAppUserModelId("com.verbosus.copiosus");

ipcMain.on("get-app-version", (event) => {
    event.returnValue = app.getVersion();
});

ipcMain.on("is-open-at-login", (event) => {
    event.returnValue = app.getLoginItemSettings().openAtLogin;
});

ipcMain.on("set-login-item-settings", (event, openAtLogin, openAsHidden) => {
    app.setLoginItemSettings({
        openAtLogin: openAtLogin,
        openAsHidden: openAsHidden
    });
    event.returnValue = true;
});

ipcMain.on("exists", (event, absolutePath) => {
    event.returnValue = fs.existsSync(absolutePath);
});

ipcMain.on("mkdirs", (event, absolutePath) => {
    fs.mkdirSync(absolutePath, {
        recursive: true
    });
    event.returnValue = true;
});

ipcMain.on("get-separator", (event) => {
    event.returnValue = path.sep;
});

ipcMain.on("write-file", (event, args) => {
    fs.writeFile(args.absolutePath, args.data, (err) => {
        event.sender.send("write-file-" + args.absolutePath, err);
    });
});

ipcMain.on("read-file", (event, args) => {
    fs.readFile(args.absolutePath, (err, data) => {
        event.sender.send("read-file-" + args.absolutePath, {
            err: err,
            data: data
        });
    });
});

ipcMain.on("get-path", (event, folder) => {
    event.returnValue = app.getPath(folder);
});

ipcMain.on("stat-sync", (event, folder) => {
    event.returnValue = fs.statSync(folder);
});

ipcMain.on("open-item", (event, absolutePath) => {
    // Problem with mas build when using shell.openItem()
    //shell.openItem(absolutePath);
    shell.openExternal('file://' + absolutePath);
    event.returnValue = true;
});

ipcMain.on("network-interfaces", (event) => {
    event.returnValue = os.networkInterfaces();
});

ipcMain.on("subnet", (event, address, netmask) => {
    event.returnValue = ip.subnet(address, netmask).broadcastAddress;
});