// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	var dotprune  = config.dotprune;
	var models    = global._factoryModels;
	var utils     = config.utils;
	var _         = config.lodash;
	var TYPE      = config.schemer.constants.type;
	var promise   = config.promise;
	var Bookshelf = config.bookshelf;
	
	
	// return the function
	return function(fetchOpts, jsonOpts) {
		
		// set an object for fetch opts if it wasnt provided
		fetchOpts             = fetchOpts || {};
		jsonOpts              = jsonOpts || { omitPivot: true };
		jsonOpts.omitPivot    = jsonOpts.omitPivot || true;
		
		
		// update the current depth
		fetchOpts._depth      = fetchOpts.hasOwnProperty('_depth') ?
				(fetchOpts._depth + 1) : 0;
				
		
		// update the circular references
		fetchOpts._circular   = fetchOpts.hasOwnProperty('_circular') ?
				_.union(fetchOpts._circular, [this.tableName]) : [this.tableName];

		
		// set the bypass for pretty print. this is used for the getResource function
		// since it needs to return a single resource and not an array with a single resource
		var ugly              = (jsonOpts.hasOwnProperty('_ugly') && jsonOpts._ugly) ? true : false;
		
		
		// set the relation for fetch. the user can optinally specify which relations
		// they want included otherwise the generated relations will be used
		fetchOpts.withRelated = (fetchOpts.hasOwnProperty('withRelated')) ?
				fetchOpts.withRelated : models._relations[this.tableName];
		
		
		// get the view properties as a local variable
		var _self             = this;
		var _parent           = null;
		var _timestamp        = null;
		var _verFilter        = null;
		var dbType            = Bookshelf.knex.client.config.client;
		var tableName         = this.tableName;
		var searchSQL         = this._searchSQL;
		var keep              = this._keep;
		var pretty            = this._pretty;
		var idAttr            = this.idAttribute;
		var schema            = models._schema[this.tableName];
		var rid               = '_RID_DELETE_THIS_OBJECT_ASDFJKL';
		var v                 = (schema.hasOwnProperty('_versioned') &&
							 	 schema._versioned.hasOwnProperty('model') &&
						 		 models._schema.hasOwnProperty(schema._versioned.model)) ?
								 schema._versioned.model : null;
		
		
		// determine if the model is versioned or basic. if the model is
		// versioned then get the system time and join the parent model with 
		// a valid version. other wise run a basic query
		if (v) {
			
			// get the system time
			_parent = utils.sql.getTime().then(function(sysTime) {
				
				// convert the database time to utc for comparison
				_timestamp = config.moment.utc(sysTime.date).format('YYYY-MM:DD HH:mm:ss z');
				
				// run a query that joins the parent with a valid version
				return _self.query(function(qb) {
					
					// create a join query so that the parent and version can be queried
					// as a single table
					var joinSQL = 'inner join (select `%s`.* from `%s` ' +
		              'where %s) v on `%s`.`%s` ' +
		              '= `v`.`parent_id`';
					
					// get the version filter SQL
					_verFilter = utils.sql.getVersionFilter(v, _timestamp, fetchOpts);
					
					// update the query builder with the join and search
					qb.joinRaw(utils.string.parse(joinSQL, v, v, _verFilter, tableName, idAttr))
					.andWhereRaw(searchSQL);
					
					
				}).fetchAll(fetchOpts);
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
					var res = _.merge({}, result.attributes);

					
					// look through each relation
					return promise.each(_.keys(result.relations), function(relField) {
						
						var relObj  = result.relations[relField];
						var relData = relObj.relatedData;

						
						if (relObj.relatedData.type === 'hasOne' ||
								relObj.relatedData.type === 'belongsTo') {
							
							if (!relObj.hasOwnProperty('id')) {
								res[relField] = null;
							}
							else {
								
								return models[relData.targetTableName].forge()
								.getResource(
									relObj.id,
									_.omit(fetchOpts, 'withRelated'),
									_.merge({_unformatted: true}, jsonOpts)
								)
								.then(function(result) {
									
									if (result && !result.hasOwnProperty('_code')) {
										res[relField] = result;
									}
								});
							}
						}
						else if (relObj.relatedData.type === 'hasMany' ||
								relObj.relatedData.type === 'belongsToMany') {
							
							res[relField] = [];
							
							if (relObj.length > 0) {
								
								return promise.each(relObj.models, function(relModel) {

									return models[relData.targetTableName].forge()
									.getResource(
										relModel.id,
										_.omit(fetchOpts, 'withRelated'),
										_.merge({_unformatted: true}, jsonOpts)
									)
									.then(function(result) {
										if (result && !result.hasOwnProperty('_code')) {
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
							if (res.hasOwnProperty('use_current') && res.use_current === 1 &&
									(!fetchOpts.hasOwnProperty('_saving') || !fetchOpts._saving)) {
								delete fetchOpts.version;
							}
							

							// get the specific version
							return models[schema._versioned.model].query(function(qb) {
								
								// get a temporal object that is valid by reusing the version
								// filter sql where the parent_id is the same as the parent id
								qb.where('parent_id', '=', result[idAttr])
								.andWhereRaw(_verFilter);
							})
							// omit the withRelated so that the model uses its own
							.getResources(_.omit(fetchOpts, 'withRelated'), jsonOpts)
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
								/* legacy code
								else {
									
									// if no results, put in a key to remove
									result[rid] = rid;
								}*/
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
		
		// post processing includes removal of invalid version results
		// field filtering, and pretty printing
		.then(function(results) {

			/* legacy code
			// remove any results that have the generated rid parameter
			var filtered = _.remove(results, function(o){
				return !o.hasOwnProperty(rid);
			});
			

			// filter the object to return only the requested fields
			var resultObject = dotprune.prune(filtered, keep);
			*/
			
			// filter the object to return only the requested fields
			var resultObject = dotprune.prune(results, keep);
			
			// optionally pretty print the object
			if (typeof (pretty) === 'object' && pretty.enabled && !ugly) {
				return JSON.stringify(resultObject, null, pretty.spacing);
			}
			else {
				return resultObject;
			}
		});
	};
};