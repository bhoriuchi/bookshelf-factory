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

var f = models.station;
console.log(f);
process.exit();


return models.station.forge()
.getResources()
.end()
.then(function(results) {

	console.log(JSON.stringify(results, null, '  '));
})
.then(function() {
	// exit the app
	process.exit();
});











