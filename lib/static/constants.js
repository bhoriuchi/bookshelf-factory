// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Helper functions
//










module.exports = function(config) {

	
	
	
	
	
	
	
	
	
	// shorten variable name
	var _       = config.lodash;
	var schemer = config.schemer;
	
	
	
	
	
	// define constants used for lookup in schema
	var constants = {
			error: 'error',
			info: 'info',
			warning: 'warning',
			foreignKey: 'foreignKey',
			junction: 'junction',
			otherKey: 'otherKey',
			views: 'views',
			statusResponse: 'statusResponse',
			statusCodes: {
				OK: {_code: 200, message: 'OK'},
				CREATED: {_code: 201, message: 'Created'},
				NO_CONTENT: {_code: 204, message: 'No Content'},
				NOT_MODIFIED: {_code: 304, message: 'Not Modified'},
				BAD_REQUEST: {_code: 400, message: 'Bad Request'},
				FORBIDDEN: {_code: 403, message: 'Forbidden'},
				NOT_FOUND: {_code: 404, message: 'Not Found'},
				METHOD_NOT_ALLOWED: {_code: 405, message: 'Method Not Allowed'},
				NOT_ACCEPTABLE: {_code: 406, message: 'Not Acceptable'},
				CONFLICT: {_code: 409, message: 'Conflict'},
				INTERNAL_SERVER_ERROR: {_code: 500, message: 'Internal Server Error'},
				SQL_ERROR: {_code: 1500, message: 'SQL Error'}
			},
			methods: {
				save: 'save',
				update: 'update',
				remove: 'remove'
			},
			versioned: {
				parent: {
					active: 'active',
					use_current: 'use_current'
				},
				child: {
					id: 'id',
					parent_id: 'parent_id',
					published: 'published',
					version: 'version',
					valid_from: 'valid_from',
					valid_to: 'valid_to',
					change_notes: 'change_notes'
				}
			}
	};

	
	
	
	
	
	
	
	
	
	// add the constants from knex schemer 
	_.merge(constants, schemer.constants.relations);
	_.merge(constants, schemer.constants.extend);
	
	
	
	
	
	
	
	
	
	
	return constants;
};