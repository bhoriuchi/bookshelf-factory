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
//console.log('Final', schema.listversion.shared_with);
//process.exit();
var operations = [
    {
        name: 'Save John Doe',
        show: true,
        type: 'save',
        model: 'user',
        data: {
            name: 'John Doe',
        }
	},
    {
        name: 'Save Jane Doe',
        show: true,
        type: 'save',
        model: 'user',
        data: {
            name: 'Jane Doe',
        }
	},
    {
        name: 'Save Foreal Doe',
        show: true,
        type: 'save',
        model: 'user',
        data: {
            name: 'Foreal Doe',
        }
	},
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
    	type: 'save1',
    	model: 'list',
    	data: {
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
    	type: 'publish1',
    	model: 'list',
    	option: true
    },
    {
    	name: 'Updating list again',
    	show: true,
    	type: 'save1',
    	model: 'list',
    	data: {
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
    	type: 'publish1',
    	model: 'list',
    	option: true
    },
    {
    	name: 'Get list',
    	show: true,
    	type: 'get1',
    	model: 'list',
    	option: {}
    }
];

// drop the schema
factory.schemer.drop(schema).then(function() {
	
	// create a database
	return factory.schemer.sync(schema).then(function() {
		// load the data
		return factory.schemer.convertAndLoad(data, schema);
	});
})
.then(function() {
	
	var resid = null;
	
	// forge all of the model definitions
	models = factory.create(schema);
	

	
	return promise.each(operations, function(op) {
		if (op.type === 'save') {
			
			if (resid !== null) {
				op.data.id = resid;
			}
			
			return models[op.model]
			.forge()
			.view()
			.saveResource(op.data)
			.then(function(results) {
				
				//resid = results.id;
				
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
			.publish(resid, op.option)
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
			.getResource(resid, op.options)
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













