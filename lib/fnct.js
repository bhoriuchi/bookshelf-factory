// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Creates bookshelf models using knex-schemer's 
//              schema definition format
//

module.exports = function(config) {
	
	
	// shorten the passed variables
	var Promise   = config.promise;
	var _         = config.lodash;
	var constants = config.constants;
	var relations = config.relations;
	var schemer   = config.schemer;
	var models    = config.models;
	
	
	
	var viewMethod = function(view) {
		view = view || '';
		
		this._keep = (Array.isArray(view)) ? view : util.compileViewFilter(view, this.tableName, models._schema, '');
		return this;
	};
	
	
	
	
	
	return {
		view: view
	};
};