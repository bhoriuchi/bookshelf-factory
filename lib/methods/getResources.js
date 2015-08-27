// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Main get function. Gets deep objects unless otherwise
//              specified by maxDepth.
//


module.exports = function(config) {
	
	// constants
	var _TYPE                 = config.schemer.constants.type;
	var _STAT                 = config.statics.httpStatus;
	var _JTYP                 = config.statics.jsType;
	var _FOPT                 = config.statics.fetchOpts;
	var _VER                  = config.statics.version;
	var _REL                  = config.statics.relations;
	
	// modules
	var dotprune              = config.dotprune;
	var utils                 = config.utils;
	var _                     = config.lodash;
	var promise               = config.promise;
	var Bookshelf             = config.bookshelf;
	var s                     = utils.schema;
	var u                     = utils.util;
	
	// return the function
	return function(fetchOpts, jsonOpts) {
		
		// runtime variables
		var models            = global._factoryModels;
		
		// set properties
		var _self             = this;
		var tableName         = _self.tableName;
		var searchSQL         = _self._searchSQL;
		var keep              = _self._keep;
		var idAttr            = _self.idAttribute;
		var schema            = models._schema[tableName];
		var v                 = s.getVersionedModel(schema, models._schema);
		var dbType            = Bookshelf.knex.client.config.client;
		
		// null properties
		var _parent, _timestamp, _verFilter;
		_parent = _timestamp = _verFilter = null;
		
		// set an object for fetch opts if it wasnt provided
		fetchOpts             = fetchOpts            || {};
		jsonOpts              = jsonOpts             || { omitPivot: true, omitForeign: true };
		jsonOpts.omitPivot    = jsonOpts.omitPivot   || true;
		jsonOpts.omitForeign  = jsonOpts.omitForeign || true;
		
		// update the current depth
		fetchOpts._depth      = fetchOpts.hasOwnProperty(_FOPT._depth) ?
				                (fetchOpts._depth + 1) : 0;
				
		
		// update the circular references
		fetchOpts._circular   = fetchOpts.hasOwnProperty(_FOPT._circular) ?
				                _.union(fetchOpts._circular, [tableName]) :
				                [tableName];
		
		// set the relation for fetch. the user can optinally specify which relations
		// they want included otherwise the generated relations will be used
		fetchOpts.withRelated = (fetchOpts.hasOwnProperty(_FOPT.withRelated)) ?
				                fetchOpts.withRelated : _self.getRelations();
		
		
		// filter out any relations that conflict with the view/fields specified
		// in order to minimize unnecessary queries. this is an optimization
		fetchOpts.withRelated = utils.view.filterRelated(_self._keep, fetchOpts.withRelated);
		
				
		// determine if the model is versioned or basic. if the model is
		// versioned then get the system time and join the parent model with 
		// a valid version. other wise run a basic query
		if (v) {
			
			// clone the fetch opts
			var childFetchOpts = utils.relation.relationFetchOpts(fetchOpts, _VER.type.child);

			// get the system time
			_parent = utils.sql.getTime(fetchOpts).then(function(sysTime) {
				
				// convert the database time to utc for comparison
				_timestamp = config.moment.utc(sysTime.date)
				             .format(utils.sql.specific[dbType].tsFormat);
				
				// run a query that joins the parent with a valid version
				return _self.query(function(qb) {
					
					// create a join query so that the parent and version can be queried
					// as a single table
					var joinSQL = 'inner join (select `%s`.* from `%s` ' +
		                          'where %s) v on `%s`.`%s` = `v`.`' +
		                          _VER.child.parent_id + '`';
					
					// get the version filter SQL
					_verFilter = utils.sql.getVersionFilter(v, _timestamp, childFetchOpts);
					
					// update the query builder with the join and search
					qb.joinRaw(utils.string.parse(joinSQL, v, v, _verFilter, tableName, idAttr))
					.andWhereRaw(searchSQL);
					
					
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
		_self.results = _parent.then(function(results) {

			// check for results
			if (results.length > 0) {
				
				// store the model
				var model = results.model;

				// look through each result
				return promise.map(results.models, function(result) {

					// create a new object with the non-related results
					var res = _.clone(result.attributes, true);
					
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
									relData,
									relField
								);

								
								// get the model
								return models[sel].forge()
								.view(utils.view.nextView(relField, keep))
								.getResource(
									relObj.id,
									utils.relation.relationFetchOpts(fetchOpts),
									jsonOpts
								)
								.end()
								.then(function(result) {
									
									if (!u.isErr(result)) {
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
										relData,
										relField
									);
									
									// get the model
									return models[sel].forge()
									.view(utils.view.nextView(relField, keep))
									.getResource(
										relModel.id,
										utils.relation.relationFetchOpts(fetchOpts),
										jsonOpts
									)
									.end()
									.then(function(result) {
										if (!u.isErr(result)) {
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

							
							// remove the version parameter if use_current is set
							// and we are not performing a save
							// this will force the else condition in the query to
							// look for objects valid now
							if (res.hasOwnProperty(_VER.parent.use_current) &&
									u.toBoolean(res.use_current) === true) {
								delete childFetchOpts.version;
							}

							// if saving, always get the draft version
							if (fetchOpts._saving) {
								childFetchOpts.version = _VER.draft;
							}
							
							// remove fields that would alter the child
							delete childFetchOpts.withRelated;
							delete childFetchOpts._saving;

							
							// get the specific version
							return models[schema._versioned.model].forge()
							.view(keep)
							.query(function(qb) {
								
								// get a temporal object that is valid by reusing the version
								// filter sql where the parent_id is the same as the parent id
								qb.where(_VER.child.parent_id, '=', result[idAttr])
								.andWhereRaw(_verFilter);
							})
							// omit the withRelated so that the model uses its own
							.getResources(childFetchOpts, jsonOpts)
							.end()
							.then(function(ver) {
								
								// if there is a result
								if (ver.length > 0) {
									ver = ver[0];
									
									// delete the system values
									delete ver.id;
									delete ver.published;
									delete ver.parent_id;
									delete ver.valid_from;
									delete ver.valid_to;
									
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
		})
		// catch any errors and print an error message
		.caught(function(err) {
			return u.wrapPromise(err);
		});
		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.deleteResources
		};
		return _self;
	};
};