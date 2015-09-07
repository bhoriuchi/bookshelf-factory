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
			
			// runtime variables
			var models     = global._factoryModels;
			var schema     = models._schema;
			
			// variables
			var _self      = opts._self;
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
			var pubType    = state ? 'publish' : 'unpublish';
			
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
				
				// loop through each id and attempt to publish
				return promise.map(ids, function(id) {
					
					
					// get the parent model
					return cModel.forge()
					.query(function(qb) {
						
						// update the version filter for the child
						var verFilter = utils.sql.getVersionFilter(
							idAttr,
							tableName,
							cTableName,
							timestamp,
							_.clone(fetchOpts, true),
							false
						);
						
						
						// get a temporal object that is valid by reusing the version
						// filter SQL where the parent_id is the same as the parent id
						qb.where(_VER.child.parent_id, '=', id)
						.andWhereRaw(verFilter);
						
					})
					.fetch({transacting: t})
					.then(function(result) {
						
						// check for results
						if (!result) {
							throw u.newErr(
								_STAT.NOT_FOUND.code,
								_ERR.NOT_FOUND.detail,
								_ERR.NOT_FOUND.code,
								[tableName + ' with ID ' + id + ' was not found',
								 'thrown from ' + pubType]
							);
						}
						
						// check if already published
						if (u.toBoolean(result.attributes.published) === state) {
							throw u.newErr(
								_STAT.BAD_REQUEST.code,
								_ERR.COULD_NOT_UPDATE.detail,
								_ERR.COULD_NOT_UPDATE.code,
								[tableName + ' with ID ' + id + ' is already ' + pubType + 'ed',
								 'thrown from ' + pubType]
							);
						}
						
						// update the published attribute
						return cModel.forge()
						.query(function(qb) {
							qb.where('id', result.id)
							.andWhere('version', result.attributes.version);
						})
						.save({ published: state }, saveOpts)
						.then(function(save) {
							
							if (!save) {
								throw u.newErr(
									_STAT.BAD_REQUEST.code,
									_ERR.COULD_NOT_UPDATE.detail,
									_ERR.COULD_NOT_UPDATE.code,
									[tableName + ' with ID ' + id + ' could not be ' + pubType + 'ed',
									 'thrown from ' + pubType]
								);
							}

							
							return pModel.forge()
							.transaction(t)
							.getResource(result.attributes.parent_id, fetchOpts, jsonOpts)
							.end();
						});
					});
				});
			});
		};
	};
};