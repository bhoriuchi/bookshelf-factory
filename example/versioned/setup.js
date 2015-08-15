// create a database connection config
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


// import the modules
var factory   = require('../../lib/factory')(config);
var schema    = require('./versioned-schema')(factory.schemer.constants);
var data      = require('./versioned-data');
var models;
// validate the schema
schema = factory.prepareSchema(schema) || {};


// drop the schema
console.log('dropping');
factory.schemer.drop(schema).then(function() {
	console.log('syncing');
	// create a database
	return factory.schemer.sync(schema).then(function() {
		// load the data
		console.log('loading data');
		return factory.schemer.convertAndLoad(data, schema);
	});
})
.then(function() {
	console.log('Complete');
	// exit the app
	process.exit();
});











