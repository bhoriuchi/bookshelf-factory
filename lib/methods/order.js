// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: order the results
//


module.exports = function(config) {
	
	// constants
	var _JTYP = config.statics.jsTypes;
	var _SCMA = config.statics.schema;
	var _ORD  = config.statics.order;

	
	// modules
	var _     = config.lodash;
	var utils = config.utils;
	
	
	// return the function
	return function(order) {
		
		var _self     = this;
		
		
		// get the schema for the current table
		var tableName    = this.tableName;
		var parentSchema = global._factoryModels._schema[this.tableName];
		
		
		// determine if the model is temporal and get the schema if it is
		var versioned    = _.has(parentSchema, _SCMA._versioned + '.' + _SCMA.model) ?
				           parentSchema._versioned.model : null;
		var childSchema  = versioned ? global._factoryModels._schema[versioned] : {};
		
		
		// create an orderList
		var orderList    = [];
		var sql          = '';

		// construct an order list
		if (typeof(order) === _JTYP.string) {
			orderList.push({
				field: order,
				direction: _ORD.ascending
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
		_self._orderSQL = sql || null;

		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.order
		};

		return _self;
	};
};