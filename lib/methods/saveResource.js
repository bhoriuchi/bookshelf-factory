// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	var util      = config.util;
	var models    = global._factoryModels;
	var constants = config.constants;
	var STATUS    = constants.statusCodes;
	var _         = config.lodash;
	
	
	// return the function
	return function(obj, fetchOpts, jsonOpts) {
	
		
		var where  = {};
		var idAttr = (Array.isArray(this.idAttribute)) ? this.idAttribute[0] : this.idAttribute;
		var id     = (obj.hasOwnProperty(idAttr)) ? obj[idAttr] : [];
		var keep   = this._keep;
		var pretty = this._pretty;
		
		// set default values
		fetchOpts      = fetchOpts || {};
		jsonOpts       = jsonOpts || { omitPivot: true };
		
		// check if a single id was supplied
		if (!Array.isArray(id)) {
			
			// set the where object
			where[idAttr] = id;
			
		}
		
		
		// forge a model and save it
		return models[this.tableName].forge(where).save(obj).then(function(model) {
			
			// check for status only return option
			if (jsonOpts.hasOwnProperty(constants.statusResponse) && jsonOpts[constants.statusResponse]) {
				return util.statusPromise(STATUS.OK);
			}
			else {
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
	};
};