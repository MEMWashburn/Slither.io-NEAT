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
var Network = neataptic.Network;
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

  // If loading failed
  botWindow.webContents.on('did-fail-load', function() {
    botWindow.loadURL('http://slither.io/')
  });

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

    setTimeout(function () {botWindow.webContents.send('send-info', info);}, 1000);
    //setTimeout(function () {botWindow.webContents.send('send-info', info);}, 15000);
    setTimeout(function () {info.brain = null; info = null;}, 1500);
    botWindow.webContents.removeAllListeners(['did-fail-load']);

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
var NEW_BOTS_PER_CYCLE = 5; // bots that can be initiated in one runNeat call
var PARALLEL_BOTS = 20;
var GAMES_PER_BOT = 5;
var HEADLESS = true;
var SEC = 3; // Seconds between runNeat calls to keep asynchronous nature
var IPC_RESEND = Math.round(30 / SEC);
var INITIAL_MAX_RUNTIME = 100; // Max seconds per game for slither bot
var RESET_GEN_TIMEOUT = 1800; // Seconds till timeout and restart the whole gen

// GA SETTINGS //
var POP_SIZE         = 50;
//var GENERATIONS      = 10;
var MUTATION_RATE    = 0.4; // 40%
var ELITISM          = Math.round(0.1 * POP_SIZE); // 10%
var CUSTOM_INIT_NET  = true; // Use network template

var initNetwork = function() {
  var net = new Network(49, 3); // create whatever network is good
  for (var c in net.connections) {
    // over write weights with magnitude > 1
    if (Math.abs(net.connections[c].weight) >= 1) {
      net.connections[c].weight = Math.random() * 2 - 1;
    }
  };
  return net;
};

function fitness(genome) {
  return Math.round(genome.scores.reduce(function(a,b) { return a + b;}) / genome.scores.length);
};

// INIT GLOBALS VARS //
neatControls = {
  running: false,
  paused: false,
  stop: false,
  continue: false,
  gen: 0 // generation to start on
};

neat = undefined;
ipcResend = 0;
evaled = -1;
resetGen = 0;
NEAT_BOT_STATS = ['bot.isEvalDone', 'bot.popID', 'bot.gen', 'bot.scores', 'bot.lifetimes', 'bot.ranks', 'bot.fpss', 'bot.gamesleft'/*, 'bot.brain != undefined'*/];

// HELPER FUNCTIONS //
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
    //brainsent: stats[8]
  }
};

function initNeat () {
  return new Neat(
    49, // inputs
    3, // outputs
    null, // evaluation handled externally, see fitness function above
    { // Options
      popsize: POP_SIZE,
      elitism: ELITISM,
      mutationRate: MUTATION_RATE,
      mutation: Methods.mutation.ALL
    }
  )
};

// Reset control variables
function resetVars() {
  evaled = -1;
  neat.state.time = 0;
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
  // Clear stat Listener
  ipcMain.removeAllListeners(['replyNeatStats'])
  neat.state.genDone = false;
}

  // New stats request
function requestStats() {
  neat.state.stats = new Array()
  neat.state.replies = new Array()
  neat.state.statsRecieved = false;
  ipcResend = 0;
  //console.log("NEAT:: \tStats Requested! (" + neat.state.time + ")");
  ipcMain.on('replyNeatStats', (event, arg) => {
    if (neat.state.replies.every(reply => reply.index != arg.index)) {
      neat.state.replies.push(arg)
    }
    if (neat.state.replies.length === neatBots.length) {
      //console.log("NEAT:: \tStats Recieved!! (" + neat.state.time + ")");
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

// MAIN NEAT FUNCTION //
function runNeat() {
  // Check for pause
  if (neatControls.paused) {
    setTimeout(runNeat, 1000);
    return;
  }
  // Check for stop
  if (neatControls.stop) {
    neat = undefined;
    neatControls.stop = false;
    neatControls.paused = false;
    neatControls.running = false;
    return;
  }

  // RUN NEAT //
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
      genomesRun: 0,
      maxRunTime: INITIAL_MAX_RUNTIME,
      time: 0
    }

    // Make our own initial neural nets
    if (CUSTOM_INIT_NET) {
      neat.population = [];
      for (var i = 0; i < neat.popsize; i++) {
        var copy;
        copy = initNetwork();
        copy.score = undefined;
        neat.population.push(copy);
      }
    }

    // Continue from a specified generation from popN file
    if (neatControls.continue) {
      neatControls.paused = true;
      neat.generation = neatControls.gen;
      fs.readFile("pop" + neatControls.gen, 'utf8', (err, data) => {
        if (err) throw err;

        var d = JSON.parse(data);
        neat.import(d.pop);

        neatControls.paused = false;
      })
    }
  }

  // Fitness scoring, elitism, crossover, and mutation
  if (neat.state.genDone) {
    var bestScore = 0;
    var worstScore = Number.MAX_SAFE_INTEGER;
    var sumScore = 0;
    var avgGametime = 0;
    var popSave = {
      generation: neat.generation,
      elitism: neat.elitism,
      mutation: neat.mutationRate,
      maxScore: 0,
      minScore: 0,
      averageScore: 0,
      pop: neat.export()
    }
    // Calculate fitness score for every genome
    for (var p in neat.population) {
      genome = neat.population[p];
      genome.score = fitness(genome);
      bestScore = Math.max (bestScore, genome.score);
      worstScore = Math.min (worstScore, genome.score);
      sumScore += genome.score;
      for (var i in genome.lifetimes) {
        avgGametime += genome.lifetimes[i];
      }
      popSave.pop[p].score = genome.score;
      popSave.pop[p].scores = genome.scores;
      popSave.pop[p].ranks = genome.ranks;
      popSave.pop[p].lifetimes = genome.lifetimes;
      popSave.pop[p].fpss = genome.fpss;
    }
    // Save current generation
    popSave.maxScore = bestScore;
    popSave.minScore = worstScore;
    popSave.averageScore = sumScore / neat.popsize;
    avgGametime /= neat.popsize * GAMES_PER_BOT;

    console.log("NEAT::    G E N E R A T I O N  C O M P L E T E    ::NEAT"
      + "\n\tGen: " + neat.generation
      + "\tAvg Gametime: " + avgGametime
      + " (Runtime: " + neat.state.time + "s)"
      + "\n\tScore:\tMax: " + bestScore
      + "\tAvg: " + popSave.averageScore
      + "\tMin: " + worstScore);

    fs.writeFile("pop" + neat.generation, JSON.stringify(popSave), function (err) {
      if (err) {
        console.log("ERR::\tSaving population failed!");
        return;
      }
      console.log("NEAT::\tPopulation saved.");

    })
    popSave = null;

    // Generate new population
    neat.sort();
    var newPopulation = [];

    // Elitism
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

    // Will return elites to normal (if mutated)
    for (var i = 0; i < neat.elitism; i++) {
      neat.population[i] = newPopulation[i];
    }
    neat.generation++;
    neat.state.maxRunTime += 1;
    RESET_GEN_TIMEOUT = (GAMES_PER_BOT + 2) * neat.state.maxRunTime;

    // Reset control variables
      resetVars();
  }

  // evaluation / simulation of slither.io bots
  else if (neat.state.statsRecieved){
    // Check on bots
    var botsDone = [];
    //var brains = 0;
    for (var s in neat.state.stats) {
      var stat = createLabeledStats(neat.state.stats[s]);
      //if (stat.brainsent) brains++;
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
      stat = null;
    }
    //console.log("NEAT:: \t\tBrains Found: " + brains + "/" + neatBots.length);

    // Remove bots that have completed their evaluation
    botsDone.forEach(function (item) {
      if (item) { item.close();}
    });

    // Evaluate a new genome if others have finished until all genomes are evaled
    var quota = 0;
    while (quota++ < NEW_BOTS_PER_CYCLE && neat.state.genomesRun < POP_SIZE && neat.state.botsRunning < PARALLEL_BOTS) {
      var info = {
        popid: neat.state.genomesRun,
        gen: neat.generation,
        gamesleft: GAMES_PER_BOT,
        maxruntime: neat.state.maxRunTime,
        brain: neat.population[neat.state.genomesRun].toJSON()
      };
      createNEATBotWindow(BOT_PATH, HEADLESS, info);
      info = null;
      neat.state.genomesRun++;
      neat.state.botsRunning++;
    }

    // Is this generation's evaluations finished?
    neat.state.genDone = neat.state.genomesEvaled == POP_SIZE;

    // If not, poll evaluating bots
    if (!neat.state.genDone) {
      requestStats();
    }
  }
  // Resend stats request if too long has passed
  else {
    if (ipcResend++ >= IPC_RESEND) {
      ipcMain.removeAllListeners(['replyNeatStats'])
      requestStats();
      ipcResend = 0;
    }
  }

  // Status reporting: report changes to num evaled and every minute
  if (evaled != neat.state.genomesEvaled || !(neat.state.time % 60)) {
    if (evaled != neat.state.genomesEvaled) {
      resetGen = 0;
    }
    evaled = neat.state.genomesEvaled;
    console.log("NEAT::\tGen: " + neat.generation + "\tPopulation Evaluated: " + neat.state.genomesEvaled + "/" + POP_SIZE + " (" + neat.state.time + "s)");
  }

  resetGen += SEC;
  neat.state.time += SEC;

  if (resetGen > RESET_GEN_TIMEOUT) {
    console.log("NEAT::\t!! G E N E R A T I O N  R E S E T !!" + "\n\tGen: " + neat.generation
      + "\tPopulation Evaluated: " + neat.state.genomesEvaled + "/" + POP_SIZE + " (" + neat.state.time + "s)"
      + "\nNEAT::\t!! G E N E R A T I O N  R E S E T !!");
    resetVars();
  }
  setTimeout(runNeat, 1000 * SEC);
}
