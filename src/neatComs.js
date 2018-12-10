const {ipcRenderer} = require('electron');
const neataptic = require('neataptic');

// pass the stats if asked for (asynchronous)
// https://github.com/electron/electron/blob/master/docs/api/ipc-main.md#sending-messages

ipcRenderer.on('getNeatStats', (event, args) => {
	result = []

	args['stats'].forEach(function (item, index, array) {
    	result.push(eval(item))
  	})

	event.sender.send('replyNeatStats', {'index': args['index'], 'stats': result})
});

ipcRenderer.on('send-info', (events, args) => {
	if (bot.brain != undefined) {return; }

	if (args.popid !== undefined) { bot.popID = args.popid};
	if (args.gen !== undefined) { bot.gen = args.gen};
	if (args.gamesleft > 0) { bot.gamesleft = args.gamesleft};
	if (args.brain) { bot.brain = neataptic.Network.fromJSON(args.brain)};

	args.brain = null;
});
