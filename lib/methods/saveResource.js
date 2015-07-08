// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	var util      = config.util;
	var models    = global._factoryModels;
	var schema    = models._schema;
	var constants = config.constants;
	var relations = config.relations;
	var STATUS    = constants.statusCodes;
	var _         = config.lodash;
	
	
	// return the function
	return function(obj, fetchOpts, jsonOpts) {
	
		
		// set defaults
		var where     = {};
		var idAttr    = (Array.isArray(this.idAttribute)) ? this.idAttribute[0] : this.idAttribute;
		var id        = (obj.hasOwnProperty(idAttr)) ? obj[idAttr] : [];
		var keep      = this._keep;
		var pretty    = this._pretty;
		var method    = constants.methods.save;
		var tableName = this.tableName;
		var rels      = [];
		
		
		// set default values
		fetchOpts      = fetchOpts || {};
		jsonOpts       = jsonOpts || { omitPivot: true };
		
		
		// check if a single id was supplied
		if (!Array.isArray(id)) {
			
			// set the where object and the method to updating
			where[idAttr] = id;
			method        = constants.methods.update;
			
		}
		
		
		// check payload
		var payload = util.checkPayload(this.tableName, obj, method);
		
		
		if (payload.passed) {

			
			// look through the payload to see if there are any relation values
			_.forEach(payload.payload, function(value, key) {

				// check for the type of relation match
				var relMatch = util.getCommonPropValue(Object.keys(schema[tableName][key]), relations);
				
				// if there was a match, remove the relation from the payload and add it to a relation
				// array to be processed later
				if (relMatch !== '') {
					
					rels.push({
						type: relMatch,
						key: key,
						value: payload.payload[key]
					});
					
					delete payload.payload[key];
				}
			});
			

			console.log(rels);
			
					
			// forge a model and save it
			return models[tableName].forge(where).save(payload.payload).then(function(model) {
				
				// this is where pivots/junctions will be updated
				
				
				return model;

			})
			.then(function(model) {
				
				// check for status only return option
				if (jsonOpts.hasOwnProperty(constants.statusResponse) && jsonOpts[constants.statusResponse]) {
					return util.statusPromise(STATUS.OK);
				}
				else {
					
					
					// check if pretty printing, otherwise return the model
					if (typeof (pretty) === 'object' && pretty.enabled) {
						return model.view(keep).pretty(pretty.spacing).getResource(model.attributes[idAttr]);
					}
					else {
						return model.view(keep).getResource(model.attributes[idAttr]);
					}
				}
			})
			.caught(function(e) {
				return util.statusPromise(_.merge(STATUS.SQL_ERROR, {error: e}));
			});
		}
		else {
			return util.statusPromise(_.merge(STATUS.BAD_REQUEST, {details: payload.details}));
		}
	};
};