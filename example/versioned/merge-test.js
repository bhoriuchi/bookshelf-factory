
var config = {
	"client": "mysql",
	"connection": {
		"host": "127.0.0.1",
		"user": "db",
		"password": "password",
		"database": "test",
		"charset": "utf8"
	},
	debug: false
};

var factory = require('../../lib/factory.js')(config);


// create multi version api
var schemas   = [];

// version 0.1.0
schemas.push({
	schema: require('./schema/v0.1.0')(factory),
	version: '0.1.0',
	priority: 2
});
// version 0.1.1
schemas.push({
	schema: require('./schema/v0.1.1')(factory),
	version: '0.1.1',
	priority: 1
});





process.exit();