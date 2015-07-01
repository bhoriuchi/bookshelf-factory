// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: methods
//


module.exports = function(config) {

	
	return {
		view: require('./view')(config),
		getRelations: require('./getRelations')(config),
		getResources: require('./getResources')(config),
		getResource: require('./getResource')(config),
		saveResource: require('./saveResource')(config),
		deleteResource: require('./deleteResource')(config),
		pretty: require('./pretty')(config)
	};
};