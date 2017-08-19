
// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: search function
//

module.exports = function(config) {

	// constants
	var _JTYP = config.statics.jsTypes;
	var _SCMA = config.statics.schema;
	var _ORD  = config.statics.order;

	
	// modules
	var _     = config.lodash;
	var utils = config.utils;
	var u     = utils.util;
	
	
	// takes in parameters for the pay-load array
	return function(order, model) {
		
		// get the schema for the current table
		var models       = config.models(model.version);
		var tableName    = model.tableName;
		var parentSchema = models._schema[tableName];
		
		
		// determine if the model is temporal and get the schema if it is
		var versioned    = _.has(parentSchema, _SCMA._versioned + '.' + _SCMA.model) ?
				           parentSchema._versioned.model : null;
		var childSchema  = versioned ? models._schema[versioned] : {};
		
		
		// create an orderList
		var orderList    = [];
		var sql          = '';

		// construct an order list
		if (typeof(order) === _JTYP.string) {
			
			// split the order string
			var list = order.split(',');
			
			// loop through each potential order object
			_.forEach(list, function(item) {
				
				// split each order object by a dot
				var o     = item.split('.');
				var field = o[0];
				var dir   = (o.length > 1) ? o[1] : _ORD.ascending;
				dir       = (dir === _ORD.ascending || dir === _ORD.descending) ? dir : _ORD.ascending;
				
				// push the order object
				orderList.push({
					field: field,
					direction: dir
				});
			});
		}
		else if (Array.isArray(order)) {
			orderList = order;
		}
		else if (order && typeof(order) === _JTYP.object) {
			orderList.push(order);
		}
		
		
		// prepare the order list
		_.forEach(orderList, function(o) {
			
			// prepare the current order object
			var oo = utils.order.prepareOrderObject(o, tableName, parentSchema, versioned, childSchema);
			
			// if the object is not null, add it
			if (oo) {
				sql = (sql !== '') ? sql + ',' : sql;
				sql += oo.field + ' ' + oo.direction;
			}
		});
		

		// set the order SQL
		model._var.orderSQL = sql || null;
	};
};