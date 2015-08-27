// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: publish function
//

module.exports = function(config) {

	// constants
	var _SCMA       = config.statics.schema;
	var _STAT       = config.statics.httpStatus;
	var _VER        = config.statics.version;
	var _ACT        = config.statics.actions;
	
	// modules
	var _           = config.lodash;
	var Bookshelf   = config.bookshelf;
	var promise     = config.promise;
	var utils       = config.utils;
	var u           = utils.util;
	
	// setup function
	return function(opts) {
		
		// function that accepts a transaction
		return function(t) {
			
			// runtime variables
			var models     = global._factoryModels;
			var schema     = models._schema;
			
			// variables
			var _self      = this;
			var tableName  = _self.tableName;
			var idAttr     = utils.schema.getIdAttribute(schema[tableName]) || _SCMA.id;
			var cTableName = schema[tableName]._versioned.model;
			var pModel     = models[tableName];
			var cModel     = models[cTableName];
			var dbType     = Bookshelf.knex.client.config.client;
			
			// set the transaction
			opts.transacting = t;
			
			// loop through each id and attempt to publish
			return promise.map(opts.ids, function(id) {
				
				// variables for each publish
				var where = u.newObj(idAttr, id);
				var current_date, new_start, saveData, saveOpts;
				
				// get the parent model
				return pModel.forge(where).fetch({transacting: t}).then(function(result) {
					
					// check for results
					if (!result) {
						throw 'Resource does not exist';
					}
					
					// update the version
					var current_version = result.attributes.current_version;
					var new_version     = current_version + 1;
					
					// get the system time
					return utils.sql.getTime({transacting: t}).then(function(sysTime) {
						
						// update the date to UTC
						var nowUTC = config.moment.utc(sysTime.date);
						
						// set the current_date variable
						current_date = new Date(nowUTC);

						// get the next start
						new_start = new Date(current_date.getTime());
						new_start.setSeconds(new_start.getSeconds() + 1);
						
						// format the dates in SQL compatible UTC format
						new_start    = config.moment.utc(new_start)
						               .format(utils.sql.specific[dbType].tsFormat);
						current_date = config.moment.utc(current_date)
			                           .format(utils.sql.specific[dbType].tsFormat);
						
						// get the previous version
						return cModel.forge().query(function(qb) {
							
							// if the current version is the draft version, provide a query that will
							// never be true so that no results are returned to then
							if (current_version === _VER.draft) {
								qb.whereRaw('1 = 2');
							}
							
							// otherwise get current version
							else {
								qb.where({parent_id: id}).andWhere({version: current_version});
							}
						})
						.fetch({transacting: t})
						.then(function(results) {
							
							// set the valid to date of the previously current version to the current date
							if (results) {
								
								saveData = {
									valid_to: current_date
								};
								saveOpts = {
									transacting: t,
									method: _ACT.update,
									patch: true
								};

								// save the previous version with a new valid_to date
								return results.save(saveData, saveOpts);
							}
						})
						.then(function() {
							
							// promote the draft version to the current version
							return cModel.forge().query(function(qb) {
								qb.where({parent_id: id}).andWhere({version: _VER.draft});
							})
							.fetch({
								withRelated: models._relations[cTableName],
								transacting: t
							})
							.then(function(results) {
								
								if (!results) {
									throw 'No draft version was found';
								}
								
								saveData = {
									valid_from: new_start,
									version: new_version,
									published: true
								};
								saveOpts = {
									transacting: t,
									method: _ACT.update,
									patch: true
								};
									
								return results.save(saveData, saveOpts);
							});
						});
					});
				});
			});
		};
	};
};