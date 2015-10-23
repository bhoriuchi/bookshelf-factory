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
	debug: true
};

// import the modules
var factory   = require('../../lib/factory')(config);
var schema    = require('./sample-schema')(factory.schemer.constants);


// validate the schema
schema = factory.prepareSchema(schema) || {};

			
// forge all of the model definitions
var models = factory.create(schema);


return models.actor.forge()
//.view(['!character.groups.station', '!nicknames'])
.getResource(2)
.end()
.then(function(results) {

	console.log(JSON.stringify(results, null, '  '));
})
.then(function() {
	// exit the app
	process.exit();
});











