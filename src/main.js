const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const {ipcMain} = require('electron')

/** Neataptic **/
const neataptic = require('neataptic');

/** Rename vars */
var Neat    = neataptic.Neat;
var Methods = neataptic.Methods;
var Config  = neataptic.config;
var Architect = neataptic.Architect;

/** Turn off warnings */
Config.warnings = false;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

allBots = new Array()

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`)

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    while (allBots[0] !== undefined) {
      allBots[0].close();
    }
    mainWindow = null;
  })
}

function insertScriptToWindow (targetWindow, url) {
  var greasemonkey = `GM_info = {'script': {'version': 'test version'}};`;
  var script =  `
    var scr = document.createElement("script");
    scr.type="text/javascript";
    scr.src="${url}";
    document.getElementsByTagName("head")[0].appendChild(scr);
  `
  targetWindow.webContents.executeJavaScript(greasemonkey + script)
}

function createBotWindow (codeUrl, headless) {
  // Create the browser window.
  var botWindow = new BrowserWindow({width: 800, height: 600, show: !headless, webPreferences: {webSecurity : false}})

  // and load slither.io of the app.
  botWindow.loadURL('http://slither.io/')

  // If loading is completed
  botWindow.webContents.on('did-finish-load', function() {

    // Insert the latest bot script
    insertScriptToWindow(botWindow, codeUrl)

    // Get the dirname as a url
    var dirname = __dirname.replace(/\\/g,'/')

    // Insert 'passStats.js', to communicate for the stats
    insertScriptToWindow(botWindow, `file://${dirname}/neatComs.js`)

    botWindow.webContents.executeJavaScript(`window.botUrl = '${codeUrl}'`)
    botWindow.webContents.executeJavaScript(`window.headless = ` + headless)
  });

  // Add the bot to the list with bots
  allBots.push(botWindow)

  botWindow.on('closed', function () {
    // If the window is closed, remove it from the allBots array
    var index = allBots.indexOf(botWindow)
    if (index > -1) {
      allBots.splice(index, 1)
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.on('getAllStats', (event, args) => {
  var allStats = new Array()
  var allReplies = new Array()
  var originalEvent = event
  console.log("Num bots: " + allBots.length)

  ipcMain.on('replyStats', (event, arg) => {
    // console.log(arg)
    // if (arg['bot.isRunning'] == false) {
    //   console.log("Bot no longer running, time here")
    // }

    allReplies.push(arg)
    if (allReplies.length === allBots.length) {
      ipcMain.removeAllListeners(['replyStats'])

      allReplies = allReplies.sort(function (a, b) {
        return a.index - b.index
      })

      allStats = allReplies.map(function (object) {
        return object.stats
      })

      originalEvent.sender.send('replyAllStats', allStats)
    }
  })
  allBots.forEach(function (item, index, array) {
    item.webContents.send('getStats', {'index': index, 'stats': args})
  })
})

// Run n bots, if headless is true won't show window
ipcMain.on('submit-code', (event, args) => {
  for (var i = 0; i < args.n; i++) {
    newBotWindow = createBotWindow(args.codeUrl, args.headless)
    //console.log(args.n)
  }
})

// Debug
ipcMain.on('debug', (event, n) => {
  console.log(n)
})
