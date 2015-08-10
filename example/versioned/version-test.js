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
var _         = require('lodash');
var CONST     = factory.constants;
var relations = factory.relations;
var schemer   = factory.schemer;
var OPTS      = schemer.constants.options;
var TYPE      = schemer.constants.type;
var util      = factory.util;





var infect = function(schema) {

	var foreignKey, relTable;
	var spread = false;
	
	_.forEach(schema, function(tableSchema, tableName) {
		_.forEach(tableSchema, function(colSchema, colName) {
			
			var pk = util.getIdAttribute(tableSchema);
			var relation = _.intersection(_.keys(colSchema), [CONST.hasMany, CONST.hasOne]);

			
			if (relation.length > 0) {
				
				relTable   = colSchema[relation];
				foreignKey = colSchema[CONST.foreignKey] || colName + '_' + tableName + '_' + pk;
				relation   = relation[0];
				
				// verify that the target table has the foreign key defined
				if (!schema[relTable].hasOwnProperty(foreignKey)) {
					schema[relTable][foreignKey] = factory.schemaUtil.getPrimarySchema(schema[tableName][pk]);
					
					if (colSchema.hasOwnProperty(OPTS.nullable) && colSchema[OPTS.nullable]) {
						schema[relTable][foreignKey][OPTS.nullable] = true;
					}

					// set the foreignKey on the schema
					schema[tableName][colName][CONST.foreignKey] = foreignKey;
				}

				
				if (_.has(colSchema, 'versioned') && colSchema.versioned &&
						!schema[relTable][foreignKey].hasOwnProperty('versioned')) {
					schema[relTable][foreignKey].versioned = true;
					spread = true;
				}
			}
			
			
			
	
		});
	});

	return {
		spread: spread,
		schema: schema
	};
};


var infection = infect(schema);

while (infection.spread) {
	console.log('Infection Spreading');
	infection = infect(infection.schema);
}

console.log('Outbreak contained');

console.log(JSON.stringify(infection.schema, null, '  '));


process.exit();
