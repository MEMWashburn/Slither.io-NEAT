const {ipcRenderer} = require('electron');
//const neataptic = require('neataptic');

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
	if (args.popid) { bot.popID = args.popid};
	if (args.gen) { bot.gen = args.gen};
	if (args.gamesleft) { bot.gamesleft = args.gamesleft};
	if (args.brain) { bot.brain = args.brain};
});
