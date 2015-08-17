// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: utils
//


module.exports = function(config) {

	
	// require each module and return it
	return {
		relation: require('./relation')(config),
		schema: require('./schema')(config),
		search: require('./search')(config)
	};
};