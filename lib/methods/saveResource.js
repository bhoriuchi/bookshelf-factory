// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	// shorten the modules
	var Bookshelf  = config.bookshelf;
	var schemer    = config.schemer;
	var Promise    = config.promise;
	var utils      = config.utils;
	var constants  = config.constants;
	var relations  = config.relations;
	var _          = config.lodash;
	var relutil    = config.utils.relation;
	var STATUS     = constants.statusCodes;
	var models     = global._factoryModels;
	var schema     = models._schema;



	
	
	// return the function
	return function(obj, fetchOpts, jsonOpts) {
	
		
		// set defaults and variables
		var where        = {};
		var rels         = [];
		var idAttr       = (Array.isArray(this.idAttribute)) ? this.idAttribute[0] : this.idAttribute;
		var id           = (obj.hasOwnProperty(idAttr)) ? obj[idAttr] : [];
		var method       = constants.methods.save;
		var patch        = false;
		var keep         = this._keep;
		var pretty       = this._pretty;
		var tableName    = this.tableName;
		var parentModel  = null;
		var dev_version  = constants.versioned.dev_version;
		var payload, parent, child, useModel;
		
		// set default values
		fetchOpts      = fetchOpts || {};
		jsonOpts       = jsonOpts || { omitPivot: true };
		
		
		// check if a single id was supplied
		if (!Array.isArray(id)) {
			
			// set the where object and the method to updating
			where[idAttr] = id;
			method        = constants.methods.update;
			patch         = true;
			
		}

		
		
		
		
		// get the system time and a uuid
		return utils.sql.getTime().then(function(sysTime) {
			
			// set the managed check after evaluating the fetch options
			var managedCheck = fetchOpts.hasOwnProperty('_managedCheck') ? fetchOpts._managedCheck : true;
			payload = utils.payload.checkPayload(tableName, obj, method, managedCheck, sysTime);
			
			
			// shorten the payload
			parent  = payload.payload.parent;
			child   = payload.payload.child;
			

			// if the payload passed figure out if there are any relations
			// then try to save the payload
			if (payload.passed) {

				
				// look through each payload
				_.forEach(payload.payload, function(pl, key) {
					
					// look through the payload to see if there are any relation values
					_.forEach(pl.payload, function(value, key) {
						
						// check for the type of relation match
						var relMatch = utils.util.getCommonPropValue(Object.keys(schema[pl.table][key]), relations);
						
						
						// if there was a match, remove the relation from the payload and add it to a relation
						// array to be processed later
						if (relMatch !== '') {
							

							pl.relations.push({
								type: relMatch,
								key: key,
								value: pl.payload[key]
							});

							
							delete pl.payload[key];
						}
						
						
						// also delete any ignorable values passed if they are not relations
						// or if the value is null
						else if(schemer.util.ignorable(schema[pl.table][key], key) || value === null) {

							delete pl.payload[key];
						}

					});
				});


				// actual save function that can be used in a transaction
				var save = function(t) {
					
					// forge a model and save it
					return models[parent.table]
					.forge(where)
					.save(parent.payload, {transacting: t, method: method, patch: patch})
					.tap(function(model) {
						parentModel = model;
						return relutil.updateRelations(parent.relations, model, t);
					})
					.then(function(model) {
						
						// if there is a child payload, process it
						if (payload.payload.hasOwnProperty('child')) {
							
							fetchOpts.version = 0;
							fetchOpts._saving = true;
							
							// set the child's parent_id to the parent model id
							child.payload.parent_id = model.id;
							
							
							// create a query for the dev version
							var q = models[child.table]
							.forge()
							.query(function(qb) {
								qb.where({parent_id: model.id}).andWhere({version: dev_version});
							});
							
							
							// attempt to fetch the child model
							return q.fetch().then(function(result) {
								
								
								// if the there is a result, set the use model to that result
								// this is a workaround for an issue in bookshelf where updating
								// an existing record does not return its complete data, specifically
								// the full relation data
								if (result) {
									useModel = result;
								}
								
								
								// attempt to save the child
								return q.save(child.payload, {
									transacting: t,
									method: method,
									patch: patch
								})
								.tap(function(childModel){
									
									// if there is a useModel, use it, otherwise use the childModel
									// which will be sufficient when saving a new record
									useModel = useModel || childModel;
									
									
									// update the fetch options with the version
									//_.merge(fetchOpts, {version: dev_version});
									fetchOpts.version = dev_version;

									
									// update relations using the use model
									return relutil.updateRelations(child.relations, useModel, t);
								});
							});
						}
						return model;
					})
					.then(function() {
						return parentModel;
					});
				};
				
				
				// in order to use the save function in outside transactions, like publish
				// use a fetch option to return the function, otherwise continue on
				if (fetchOpts.hasOwnProperty('_returnSave') && fetchOpts._returnSave) {
					return save;
				}
				
				
				// try to update the model in a transaction
				return Bookshelf.transaction(save)
				.then(function(model) {

					
					// check for status only return option
					if (jsonOpts.hasOwnProperty(constants.statusResponse) && jsonOpts[constants.statusResponse]) {
						return utils.util.wrapPromise(STATUS.OK);
					}
					else {

						
						// check if pretty printing, otherwise return the model
						if (typeof (pretty) === 'object' && pretty.enabled) {
							return model.view(keep).pretty(pretty.spacing).getResource(model.attributes[idAttr], fetchOpts);
						}
						else {
							return model.view(keep).getResource(model.attributes[idAttr], fetchOpts);
						}
					}
				})
				.caught(function(e) {
					return utils.util.wrapPromise(_.merge(STATUS.SQL_ERROR, {error: e}));
				});
			}
			else {
				return utils.util.wrapPromise(_.merge(STATUS.BAD_REQUEST, {details: payload.details}));
			}
			
		});
	};
};