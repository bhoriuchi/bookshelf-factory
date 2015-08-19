// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: misc utils
//


module.exports = function(config) {
	
	
	// for returning a status instead of an object. can be used to speed up save operations
	function wrapPromise(result) {

		return new Promise(function(resolve) {
			resolve(result);
		});
	}
	
	
	
	
	
	// get the common property of 2 lists
	function getCommonPropValue(sourceList, compareList) {
		
		// check that both arguments are arrays
		if (!Array.isArray(sourceList) || !Array.isArray(compareList)) {
			return '';
		}
		
		
		// look through each source and evaluate against the compare list
		for (var i = 0; i < sourceList.length; i++) {
			for (var j = 0; j < compareList.length; j++) {
				if (sourceList[i] === compareList[j]) {
					return compareList[j];
				}
			}
		}
		
		
		// if the function did not return true by now, then there are no
		// common properties
		return '';
	}
	
	
	// function to conver value to boolean
	function toBoolean(value) {
		var strValue = String(value).toLowerCase();
		strValue = ((!isNaN(strValue) && strValue !== '0') &&
				strValue !== '' &&
				strValue !== 'null' &&
				strValue !== 'undefined') ? '1' : strValue;
		return strValue === 'true' || strValue === '1' ? true : false;
	}
	
	
	return {
		wrapPromise: wrapPromise,
		getCommonPropValue: getCommonPropValue,
		toBoolean: toBoolean
	};
	
	
};