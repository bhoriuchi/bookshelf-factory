// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: publish function
//

module.exports = function(config) {

	// constants
	var _SCMA       = config.statics.schema;
	var _FOPT       = config.statics.fetchOpts;
	var _STAT       = config.statics.httpStatus;
	var _VER        = config.statics.version;
	var _ACT        = config.statics.actions;
	var _REL        = config.statics.relations;
	var _ERR        = config.statics.errorCodes;
	
	// modules
	var _           = config.lodash;
	var Bookshelf   = config.bookshelf;
	var knex        = config.knex;
	var promise     = config.promise;
	var utils       = config.utils;
	var u           = utils.util;
	
	// setup function
	return function(opts, state) {
				
		// function that accepts a transaction
		return function(t) {
			
			var _self      = opts._self;
			
			// runtime variables
			var models     = config.models(_self.version);
			var schema     = models._schema;
			
			// variables
			var fetchOpts  = opts.fetchOpts;
			var jsonOpts   = opts.jsonOpts;
			var ids        = opts.ids;
			var publishing = opts.publishing;
			var tableName  = _self.tableName;
			var idAttr     = utils.schema.getIdAttribute(schema[tableName]) || _SCMA.id;
			var cTableName = schema[tableName]._versioned.model;
			var pModel     = models[tableName];
			var cModel     = models[cTableName];
			var dbType     = Bookshelf.knex.client.config.client;
			var actType    = state ? 'activate' : 'deactivate';
			
			// set the transaction
			fetchOpts.transacting = t;
			
			// set up the save options
			var saveOpts = {
					transacting: t,
					method: _ACT.update,
					patch: true
			};
			
			
			return utils.sql.getTime({transacting: t}).then(function(sysTime) {
				
				// get the time stamp
				var timestamp = sysTime.date;
				
				// get the valid to value to set
				var valid_to  = state ? null : timestamp;
				
				// loop through each id and attempt to publish
				return promise.map(ids, function(id) {

					// get the parent model
					return pModel.forge().query(function(qb) {
						qb.where(idAttr, id);
					})
					.fetch({transacting: t})
					.then(function(parent) {
						
						
						// check for results
						if (!parent) {
							throw u.newErr(
								_STAT.NOT_FOUND.code,
								_ERR.NOT_FOUND.detail,
								_ERR.NOT_FOUND.code,
								[tableName + ' with ID ' + id +
								 ' was not found',
								 'thrown from ' + actType]
							);
						}
						
						// check for active state and throw error if
						// already in the desired state
						if (u.toBoolean(parent.attributes.active) === state) {
							throw u.newErr(
								_STAT.BAD_REQUEST.code,
								_ERR.COULD_NOT_UPDATE.detail,
								_ERR.COULD_NOT_UPDATE.code,
								[tableName + ' with ID ' + id +
								 ' is already ' + actType + 'd',
								 'thrown from ' + actType]
							);
						}
						
						// validate that the draft version is not the current version
						if (parent.attributes.current_version === _VER.draft) {
							throw u.newErr(
								_STAT.BAD_REQUEST.code,
								_ERR.COULD_NOT_UPDATE.detail,
								_ERR.COULD_NOT_UPDATE.code,
								[tableName + ' with ID ' + id +
								 ' has never been published and cannot be ' +
								 actType + 'd',
								 'thrown from ' + actType]
							);
						}
						
						// get the child model
						return cModel.forge().query(function(qb) {
							
							// get the current version
							qb.where(_VER.child.parent_id, id)
							.andWhere(_VER.child.version, parent.attributes.current_version);
						})
						.fetch({transacting: t})
						.then(function(child) {
							
							// check for results
							if (!child) {
								throw u.newErr(
									_STAT.NOT_FOUND.code,
									_ERR.NOT_FOUND.detail,
									_ERR.NOT_FOUND.code,
									['version ' + parent.attributes.current_version +
									 ' could not be found for ' +
									 tableName + ' with ID ' + id,
									 'thrown from ' + actType]
								);
							}

							// set the parent state
							return parent.save({active: state}, {transacting: t, method: _ACT.update, patch: true})
							.then(function() {
								
								var newFetchOpts = _.clone(fetchOpts, true);
								
								// if deactivating
								if (!state) {
									// save the updates, and get the model
									return child.save({valid_to: timestamp}, {transacting: t, method: _ACT.update, patch: true})
									.then(function() {
										
										// add a version to the getResource fetchOpts 
										// otherwise a no content will be returned
										newFetchOpts.version = _VER.draft;
										
										return pModel.forge()
										.transaction(t)
										.getResource(id, newFetchOpts, jsonOpts)
										.end();
									});
								}
								
								
								newFetchOpts._dontSetValidTo = true;
								
								// if activating, publish the draft
								return pModel.forge()
								.transaction(t)
								.publish(id, newFetchOpts, jsonOpts)
								.end();
							});
						});
					});
				});
			});
		};
	};
};