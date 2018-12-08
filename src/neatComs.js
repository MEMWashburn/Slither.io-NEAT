const {ipcRenderer} = require('electron');
//const neataptic = require('neataptic');

// pass the stats if asked for (asynchronous)
// https://github.com/electron/electron/blob/master/docs/api/ipc-main.md#sending-messages

ipcRenderer.on('getStats', (event, args) => {
	result = []

	args['stats'].forEach(function (item, index, array) {
    	result.push(eval(item))
  	})

	event.sender.send('replyStats', {'index': args['index'], 'stats': result})
});
