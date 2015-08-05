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
	ntp: {
		"server": "pool.ntp.org"
	},
	debug: false
};

// import the modules
var promise   = require('bluebird');
var factory   = require('../../lib/factory')(config);
var schema    = require('./versioned-schema')(factory.schemer.constants);
var data      = require('./versioned-data');
var models;

// validate the schema
schema = factory.prepareSchema(schema) || {};


var operations = [
    {
    	name: 'Save New List',
    	show: true,
    	type: 'save',
    	model: 'list',
    	data: {
    		name: 'My List',
    		description: 'my gorcery list',
    		use_current: false,
    		change_notes: 'Im saving a new list',
    		items: [1,3,5,7],
    		shared_with: [1, 3],
    		owner: 2,
    		category: 1
    	}
    },
    {
    	name: 'Updating list',
    	show: true,
    	type: 'save',
    	model: 'list',
    	data: {
    		id: 3,
    		items: [2,4],
    		shared_with: [2],
    		owner: 3,
    		category: 2,
    		change_notes: 'I updated my notes'
    	}
    },
    {
    	name: 'Publishing list',
    	show: true,
    	type: 'publish',
    	model: 'list',
    	id: 3,
    	option: true
    },
    {
    	name: 'Updating list again',
    	show: true,
    	type: 'save',
    	model: 'list',
    	data: {
    		id: 3,
    		items: [1],
    		shared_with: [1],
    		owner: 2,
    		category: 1,
    		change_notes: 'save after publish'
    	}
    },
    {
    	name: 'Publishing list again',
    	show: true,
    	type: 'publish',
    	model: 'list',
    	id: 3,
    	option: true
    },
    {
    	name: 'Get list',
    	show: true,
    	type: 'get',
    	model: 'list',
    	id: 3,
    	option: {version: 0}
    }
];

// drop the schema
factory.schemer.drop(schema).then(function() {
	
	// create a database
	return factory.schemer.sync(schema).then(function() {
		// load the data
		return factory.schemer.convertAndLoad(data, schema);
		//return factory.schemer.loadData(data, schema);
	});
})
.then(function() {
	
	// forge all of the model definitions
	models = factory.create(schema);

	
	return promise.each(operations, function(op) {
		if (op.type === 'save') {
			return models[op.model]
			.forge()
			.view()
			.pretty()
			.saveResource(op.data)
			.then(function(results) {
				
				if (op.show) {
					console.log('#################', op.name, 'start #################');
					console.log(results);
					console.log('#################', op.name, 'end   #################');
					console.log('');
				}
			});
		}
		else if (op.type === 'publish') {
			return models[op.model]
			.forge()
			.publish(op.id, op.option)
			.then(function(results) {
				
				if (op.show) {
					console.log('#################', op.name, 'start #################');
					console.log(results);
					console.log('#################', op.name, 'end   #################');
					console.log('');
				}
			});
		}
		else if (op.type === 'get') {
			return models[op.model]
			.forge()
			.getResource(op.id, op.options)
			.then(function(results) {
				
				if (op.show) {
					console.log('#################', op.name, 'start #################');
					console.log(results);
					console.log('#################', op.name, 'end   #################');
					console.log('');
				}
			});
		}
		else if (op.type === 'getall') {
			return models[op.model]
			.forge()
			.getResources()
			.then(function(results) {
				
				if (op.show) {
					console.log('#################', op.name, 'start #################');
					console.log(results);
					console.log('#################', op.name, 'end   #################');
					console.log('');
				}
			});
		}
	});
})
.then(function() {
	// exit
	process.exit();
});
	
	
	

/*
.then(function() {
	
	return models.list.forge().publish(3).then(function(results) {
		console.log(results);
	});
	
})
.then(function() {
	
	return models.list.forge().publish(3).then(function(results) {
		console.log(results);
	});
	
})
*/












