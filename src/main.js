const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const {ipcMain} = require('electron')

const fs = require('fs');

/** Neataptic **/
const neataptic = require('neataptic');

/** Rename vars */
var Neat    = neataptic.Neat;
var Methods = neataptic.methods;
var Config  = neataptic.config;
var Architect = neataptic.architect;

/** Turn off warnings */
Config.warnings = false;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
allBots = new Array()
neatBots = new Array()

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
    while (neatBots[0] !== undefined) {
      neatBots[0].close();
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
    insertScriptToWindow(botWindow, `file://${dirname}/passStats.js`)

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

function createNEATBotWindow (codeUrl, headless, info) {
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

    setTimeout(function () {botWindow.webContents.send('send-info', info);}, 250);
  });

  // Add the bot to the list with bots
  neatBots.push(botWindow)

  botWindow.on('closed', function () {
    // If the window is closed, remove it from the allBots array
    var index = neatBots.indexOf(botWindow)
    if (index > -1) {
      neatBots.splice(index, 1)
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
  createWindow();
  runNeat();
})

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
  //console.log("Num bots: " + allBots.length)

  ipcMain.on('replyStats', (event, arg) => {
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
  }
})

///////////////////////////////////////////////////////////////////////////////
//////////////////// N E A T  S L I T H E R  I O //////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// SETTINGS //
var BOT_PATH = `file://${__dirname}/bot.neat.js`;
var PARALLEL_BOTS = 10;
var GAMES_PER_BOT = 2;
var HEADLESS = true;

// GA settings
var POP_SIZE         = 20;
var GENERATIONS      = 10;
var MUTATION_RATE    = 0.3;
var ELITISM          = Math.round(0.1 * POP_SIZE);

function fitness(genome) {
  return Math.round(genome.scores.reduce(function(a,b) { return a + b;}) / genome.scores.length);
}

neatControls = {
  running: false,
  paused: false,
  stop: false
}

neat = undefined
ipcResend = 0;
NEAT_BOT_STATS = ['bot.isEvalDone', 'bot.popID', 'bot.gen', 'bot.scores', 'bot.lifetimes', 'bot.ranks', 'bot.fpss', 'bot.gamesleft'];
function createLabeledStats(stats) {
  return {
    isEvalDone: stats[0],
    popID: stats[1],
    gen: stats[2],
    scores: stats[3],
    lifetimes: stats[4],
    ranks: stats[5],
    fpss: stats[6],
    gamesleft: stats[7]
  }
}

function initNeat () {
  return new Neat(
    49, // inputs
    3, // outputs
    null, // evaluation handled externally
    { // Options
      mutation: Methods.mutation.ALL,
      popsize: POP_SIZE,
      mutationRate: MUTATION_RATE,
      elitism: ELITISM
    }
  )
};

function requestStats() {
  //console.log("requestStats: requesting stats")
  // New stats request
  neat.state.stats = new Array()
  neat.state.replies = new Array()
  neat.state.statsRecieved = false;
  ipcResend = 0;

  ipcMain.on('replyNeatStats', (event, arg) => {
    if (neat.state.replies.every(reply => reply.index != arg.index)) {
      neat.state.replies.push(arg)
    }
    if (neat.state.replies.length === neatBots.length) {
      //console.log("requestStats: all bot stats recieved")
      ipcMain.removeAllListeners(['replyNeatStats'])

      neat.state.replies = neat.state.replies.sort(function (a, b) {
        return a.index - b.index
      })

      neat.state.stats = neat.state.replies.map(function (object) {
        return object.stats
      })
      neat.state.statsRecieved = true;
    }
  })

  neatBots.forEach(function (item, index, array) {
    item.webContents.send('getNeatStats', {'index': index, 'stats': NEAT_BOT_STATS})
  })
};

function runNeat() {
  if (neatControls.paused) {
    setTimeout(runNeat, 1000);
    return;
  }

  if (neatControls.stop) {

    neat = undefined;
    neatControls.stop = false;
    neatControls.paused = false;
    neatControls.running = false;

    return;
  }

  neatControls.running = true;

  if (neat === undefined) {
    neat = initNeat();
    neat.state = {
      genDone: false,
      statsRecieved: true,
      replies: [],
      stats: [],
      genomesEvaled: 0,
      botsRunning: 0,
      genomesRun: 0
    }
    // Make our own initial neural nets
    if (false) {
      neat.population = [];
      for (var i = 0; i < neat.popsize; i++) {
        var copy;
        copy = new Architect.Random (neat.input, 10, neat.output);
        copy.score = undefined;
        neat.population.push(copy);
      }
    }
  }

  // Fitness scoring, elitism, crossover, and mutation
  if (neat.state.genDone) {
    var bestScore = 0;
    var popSave = neat.export();
    for (var p in neat.population) {
      genome = neat.population[p];
      genome.score = fitness(geneome);
      bestScore = Math.max (bestScore, genome.score);
      popSave[p].score = genome.score;
      popSave[p].scores = genome.scores;
      popSave[p].ranks = genome.ranks;
      popSave[p].lifetimes = genome.lifetimes;
      popSave[p].fpss = genome.fpss;
    }
    console.log("NEAT::\tGen " + neat.generation + "\tBest Score: " + bestScore);

    fs.writeFile("pop" + neat.generation, JSON.stringify(popSave), function (err) {
      if (err) {
        console.log("Saving population failed!");
        return;
      }
      console.log("Population saved.");
    })

    neat.sort();
    var newPopulation = [];

    // ELITISM
    for (var i = 0; i < neat.elitism; i++) {
      newPopulation.push(neat.population[i]);
    }

    // Breeding
    for (var i = 0; i < neat.popsize - neat.elitism; i++) {
      newPopulation.push(neat.getOffspring());
    }

    // Replace old population and mutate
    neat.population = newPopulation;
    neat.mutate();

    // Reset
    neat.generation++;
    neat.state.replies = [];
    neat.state.stats = [];
    neat.state.statsRecieved = true;
    neat.state.genomesEvaled = 0;
    neat.state.genomesRun = 0;
    neat.state.botsRunning = 0;
    // Clear bots running (if any)
    while (neatBots[0] !== undefined) {
      if (neatBots[0]) { neatBots[0].close();}
    }
    neat.state.genDone = false;
  }
  // evaluation / simulation of slither.io bot
  else if (neat.state.statsRecieved){
    //console.log("stats got ");
    // Check on bots
    var botsDone = [];
    for (var s in neat.state.stats) {
      var stat = createLabeledStats(neat.state.stats[s]);
      if (stat.isEvalDone) {
        botsDone.push(neatBots[s]);
        neat.state.botsRunning--;
        var genome = neat.population[stat.popID];
        genome.scores = stat.scores;
        genome.ranks = stat.ranks;
        genome.lifetimes = stat.lifetimes;
        genome.fpss = stat.fpss;
        neat.state.genomesEvaled++;
      }
    }
    botsDone.forEach(function (item) {
      if (item) { item.close();}
    });

    // Evaluate a new genome if other finished until all genomes are evaled
    while (neat.state.genomesRun < POP_SIZE && neat.state.botsRunning < PARALLEL_BOTS) {
      createNEATBotWindow(BOT_PATH, HEADLESS, {
        popid: neat.state.genomesRun,
        gen: neat.generation,
        gamesleft: GAMES_PER_BOT,
        brain: neat.population[neat.state.genomesRun].toJSON()
      });
      neat.state.genomesRun++;
      neat.state.botsRunning++;
    }

    // Is this generation's evaluations finished?
    neat.state.genDone = neat.state.genomesEvaled == POP_SIZE;

    if (!neat.state.genDone) {
      requestStats();
    }
  }
  else {
    if (ipcResend++ == 10) {
      ipcMain.removeAllListeners(['replyNeatStats'])
      requestStats();
      ipcResend = 0;
    }
  }

  console.log("NEAT::\tGen: " + neat.generation + "\tPopulation Evaluated: " + neat.state.genomesEvaled + "/" + POP_SIZE);
  setTimeout(runNeat, 1000);
}
