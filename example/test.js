// create a database connection config
var db = {
	"client": "mysql",
	"connection": {
		"host": "127.0.0.1",
		"user": "db",
		"password": "password",
		"database": "test",
		"charset": "utf8"
	}
};





// import the modules
var factory   = require('../lib/factory')({ db: db });
var schema    = require('./schema')(factory.schemer.constants);
var data      = require('./sample-data');


// drop the schema
factory.schemer.drop(schema).then(function() {
	
	// create a database
	return factory.schemer.sync(schema).then(function() {
		// load the data
		return factory.schemer.convertAndLoad(data, schema).then(function() {
			
			// forge all of the model definitions
			var models = factory.create(schema);
			
			var limit1 = function(qb) {
				qb.limit(1);
			};

			
			models.survivor.forge().getResources({
				view: 'summary',
				query: function(qb) {
					qb.limit(1);
				}
			})
			.then(function(results) {

				// pretty print the results
				console.log(JSON.stringify(results, null, ' '));
				process.exit();
				
			});
		});
	});
});








