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
var models;

var type = factory.schemer.constants.type;

var schema = {
	credential: {
	    id: {
	        type: type.uuid,
	        primary: true,
	        increments: true,
	        views: ['summary']
	    },
	    name: {
	        type: type.string,
	        size: 255,
	        views: ['summary']
	    },
	    username: {
	    	type: type.string,
	    	size: 255,
	    	views: ['summary']
	    },
	    encryptedKey: {
	    	type: type.string,
	    	size: 255
	    },
	    created: {
	    	type: type.string,
	    	size: 255
	    }
	}
};



// validate the schema
schema = factory.prepareSchema(schema) || {};

			
// forge all of the model definitions
models = factory.create(schema);


return models.credential.forge().getResources().then(function(results) {
	console.log(results);
})
.then(function() {
	// exit the app
	process.exit();
});











