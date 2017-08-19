// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Search function
//



module.exports = function(config) {
	
	// constants
	var _JTYP = config.statics.jsTypes;
	var _ORD  = config.statics.order;
	
	// modules
	var _     = config.lodash;
	
	
	// function to prepare the object 
	function prepareOrderObject(obj, pTable, pSchema, cTable, cSchema) {
		
		var orderObj = {};
		
		// check of the order object has a field
		if (!obj ||
			typeof(obj) !== _JTYP.object ||
			!_.has(obj, _ORD.field)) {
			
			return null;
		}
		
		// check if the field exists and is orderable
		if (_.contains(_.keys(pSchema), obj.field) &&
			pSchema[obj.field].orderable !== false) {
			orderObj.field = '`' + pTable + '`.`' + obj.field + '`';
		}
		else if (_.contains(_.keys(cSchema), obj.field) &&
				cSchema[obj.field].orderable !== false) {
			orderObj.field = '`v`.`' + obj.field + '`';
		}
		
		// if not return null
		if (!orderObj.field) {
			return null;
		}
		
		
		// set the order object
		orderObj.field     = obj.field;
		orderObj.direction = (obj.direction === _ORD.ascending ||
				             obj.direction === _ORD.descending) ?
				             obj.direction : _ORD.ascending;
		
		
		// return the order object
		return orderObj;
	}
	
	
	
	// return the public functions
	return {
		prepareOrderObject: prepareOrderObject
	};
};