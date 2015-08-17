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
var schema    = require('./sample-schema')(factory.schemer.constants);


// validate the schema
schema = factory.prepareSchema(schema) || {};

			
// forge all of the model definitions
var models = factory.create(schema);


return models.station.forge().search([{search: 'test'}, {field: 'name', search: '.*', type: 'regex'}]).getResources().then(function(results) {
	//console.log(results.models[1].relations);
	console.log(JSON.stringify(results, null, '  '));
})
.then(function() {
	// exit the app
	process.exit();
});











