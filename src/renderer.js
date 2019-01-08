// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

window.checkVariables = ['botUrl', 'bot.isBotRunning', 'bot.scores'];
const {ipcRenderer} = require('electron');
const {dialog} = require('electron').remote;

var n = 1;
document.getElementById('set-variable-num').value = "" + n;
var headless = false;
document.getElementById('headless').checked = headless;
var path = '';

$('#select-file').click(function () {
    var path = dialog.showOpenDialog({
        properties: ['openFile'], 
        filters: [
            {name: 'Javascript file', extensions: ['js']},
            {name: 'All files', extensions: ['*']},
        ]
    })[0];
    // That nasty escape character :/
    path = path.replace(/\\/g,'/');
    submitCode('file://' + path, 
        document.getElementById("set-variable-num").valueAsNumber,
        document.getElementById("headless").checked);
})

$('#submit-code').click(function() {
    submitCode('file://' + path, 
        document.getElementById("set-variable-num").valueAsNumber,
        document.getElementById("headless").checked);
})

ipcRenderer.on('replyAllStats', (event, args) => {
    $('#table-bots tbody tr').remove();
    for (var i = 0; i < args.length; i++) {
        var current = args[i];
        $('#table-bots tbody').append($('<tr>'));
        var currentRow = $('#table-bots tbody tr:last-child');
        for (var j = 0; j < window.checkVariables.length; j++) {
            var currentVariable = window.checkVariables[j];
            currentRow.append($('<td>').text(current[j]));
        }
    }
});

$('#update-stats').click(function() {
    ipcRenderer.send('getAllStats', window.checkVariables);
})
$('#add-variable').click(function() {
    window.checkVariables.push($('#add-variable-text').val());
    updateTableHead();
})

// Configure number of bots to run per gen / whether or not headless here
function submitCode(codeUrl, n, headless) {
    args = {
        codeUrl: codeUrl,
        n: n,
        headless: headless
    };
    // Create a new bot window in main.js
    ipcRenderer.send('submit-code', args);
}
 
function updateTableHead() {
    $('#table-bots thead th').remove();
    for (var i = 0; i < window.checkVariables.length; i++) {
        var currentVariable = window.checkVariables[i];
        $('#th-variables').append($('<th>').text(currentVariable));
    }
}

$('document').ready(function() {
    updateTableHead();
})