// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: get function
//

module.exports = function(config) {

	// constants
	var _TYPE         = config.schemer.constants.type;
	var _STAT         = config.statics.httpStatus;
	var _JTYP         = config.statics.jsType;
	var _ACT          = config.statics.actions;
	var _VER          = config.statics.version;
	var _REL          = config.statics.relations;
	
	// modules
	var _             = config.lodash;
	var promise       = config.promise;
	var dotprune      = config.dotprune;
	var methodcore    = config.methodcore;
	var utils         = config.utils;
	var parse         = utils.string.parse;
	var s             = utils.schema;
	var u             = utils.util;
	
	// takes in parameters for the pay-load array
	return function(opts) {

		
		// model variables
		var _self     = opts.model;
		var tableName = _self.tableName;
		var searchSQL = _self._searchSQL;
		var keep      = _self._keep;
		var idAttr    = _self.idAttribute;
		
		
		// runtime variables
		var models    = global._factoryModels;
		var schema    = models._schema[_self.tableName];
		var v         = s.getVersionedModel(schema, models._schema);
		

		// options
		var fetchOpts = _.clone(opts.fetchOpts, true);
		var jsonOpts  = opts.jsonOpts;

		
		// takes a transaction as its parameter and executes the save
		return function(t) {
			
			var _parent, _verFilter;
			var timestamp;

			// set the transaction
			fetchOpts.transacting = t;
			
			
			// determine if the model is temporal or basic. if the model is
			// temporal then get the system time and join the parent model with 
			// a valid version. other wise run a basic query
			if (v) {
				
				// clone the fetch opts
				var childFetchOpts = utils.relation.relationFetchOpts(
					null,
					null,
					fetchOpts,
					_VER.type.child
				);

				// get the system time
				_parent = utils.sql.getTime({transacting: t}).then(function(sysTime) {
					
					timestamp = sysTime.date;
					
					// run a query that joins the parent with a valid version
					return _self.query(function(qb) {
						
						
						
						// get the version filter SQL
						_verFilter = utils.sql.getVersionFilter(
							idAttr,
							tableName,
							v,
							timestamp,
							childFetchOpts,
							true
						);
						
						// create a join query so that the parent and version can be queried
						// as a single table
						var joinSQL = parse(
							'inner join (select `%s`.* from `%s`, `%s` ' +
			                'where %s) v on `%s`.`%s` = `v`.`' +
			                _VER.child.parent_id + '`',
			                v, v, tableName, _verFilter, tableName, idAttr);
						
						// update the search SQL
						var publishedSQL = (fetchOpts._reqPub && fetchOpts.version !== 0 && !fetchOpts._saving) ?
								           parse('`v`.`%s` = true', _VER.child.published) : null;
			
						// update the query builder with the join and search
						qb.distinct(tableName + '.*')
						.joinRaw(joinSQL)
						.andWhereRaw(searchSQL)
						.andWhereRaw(publishedSQL);

						
						
					})
					.fetchAll(childFetchOpts)
					.then(function(results) {
						return results;
					});
				});
			}
			else {
				
				// run a standard query for basic models
				_parent = _self.query(function(qb) {
					qb.whereRaw(searchSQL);
				})
				.fetchAll(fetchOpts);
			}
			
			
			// process the results from the fetchAll
			return _parent.then(function(results) {

				// check for results
				if (results.length > 0) {
					
					// store the model
					var model = results.model;

					// look through each result
					return promise.map(results.models, function(result) {

						// create a new object with the non-related results
						var res = result.toJSON({shallow: true});
						
						// check for omitForeign, and remove any foreign keys
						if (jsonOpts.omitForeign && schema._foreignKeys) {
							res = _.omit(res, function(value, key) {
								return _.contains(schema._foreignKeys, key);
							});
						}

						// look through each relation
						return promise.each(_.keys(result.relations), function(relField) {

							// set relation data
							var sel          = null;
							var relObj       = result.relations[relField];
							var relData      = relObj.relatedData;

							
							// check each relation type and attempt to get the models
							if (relData.type === _REL.hasOne ||
									relData.type === _REL.belongsTo) {
								
								// if the related object has no id, set it to null
								if (!relObj.id) {
									res[relField] = null;
								}
								else {

									// figure out if a version model was returned and if
									// so get its parent model
									sel = s.selectModel(
										relData.targetTableName,
										models,
										relObj
									);

									// get the model
									return models[sel.table].forge()
									.transaction(t)
									.view(utils.view.nextView(relField, keep))
									.getResource(
										sel.id,
										utils.relation.relationFetchOpts(sel.table, sel.id, fetchOpts),
										jsonOpts
									)
									.end()
									.then(function(result) {

										if (!u.isErr(result) && !u.isStatus(result)) {
											res[relField] = result;
										}
										else {
											res[relField] = null;
										}
									});
								}
							}
							else if (relObj.relatedData.type === _REL.hasMany ||
									relObj.relatedData.type === _REL.belongsToMany) {
								
								res[relField] = [];
								
								if (relObj.length > 0) {
								
									return promise.each(relObj.models, function(relModel) {
										
										// figure out if a version model was returned and if
										// so get its parent model
										sel = s.selectModel(
											relData.targetTableName,
											models,
											relModel
										);

										// get the model
										return models[sel.table].forge()
										.transaction(t)
										.view(utils.view.nextView(relField, keep))
										.getResource(
											sel.id,
											utils.relation.relationFetchOpts(sel.table, sel.id, fetchOpts),
											jsonOpts
										)
										.end()
										.then(function(result) {
		
											if (!u.isErr(result) && !u.isStatus(result)) {
												res[relField].push(result);
											}
										});
									});
								}
							}
						})
						.then(function() {
							
							// check for a temporal object
							if (v) {

								var cFetchOpts = _.clone(childFetchOpts, true);
								
								// if use_current is set to true and the draft version has not
								// been requested, remove the version to force using current
								if (u.toBoolean(res.use_current) && cFetchOpts.version !== _VER.draft) {
									delete cFetchOpts.version;
								}

								// if saving, always get the draft version
								if (fetchOpts._saving) {
									cFetchOpts.version = _VER.draft;
								}
								
								// remove fields that would alter the child
								delete cFetchOpts.withRelated;
								//delete cFetchOpts._saving;
								
								// subtract 1 from the depth to align the depth with the 
								// parent who has already incremented the depth
								cFetchOpts._depth--;

								
								// get the specific version
								return models[v].forge()
								.transaction(t)
								.view(keep)
								.query(function(qb) {
									
									// update the version filter for the child
									var verFilter = utils.sql.getVersionFilter(
										idAttr,
										tableName,
										v,
										timestamp,
										cFetchOpts,
										false
									);
									
									
									// get a temporal object that is valid by reusing the version
									// filter SQL where the parent_id is the same as the parent id
									qb.where(_VER.child.parent_id, '=', result[idAttr])
									.andWhereRaw(verFilter);
								})
								// omit the withRelated so that the model uses its own
								.getResources(cFetchOpts, jsonOpts)
								.end()
								.then(function(ver) {
									
									// if there is a result
									if (ver.length > 0) {
										ver = ver[0];
										
										// delete the system values if omitVersion specified
										if (jsonOpts.omitVersion) {
											
											// filter the version data except for the actual version number
											ver = _.omit(ver, function(value, key) {
												return _.contains(Object.keys(_VER.child), key) &&
												       key !== _VER.child.version;
											});
										}
										
										// and merge the results
										_.merge(res, ver);
									}
								});
							}
						})
						.then(function() {
							return res;
						});
					});
				}
				
				// if no results return an empty array
				return [];
			})
			
			// post processing
			.then(function(results) {
				
				// filter the object to return only the requested fields
				return dotprune.prune(results, keep);
			});
		};
	};
};