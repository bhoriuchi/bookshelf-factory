// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: core method code
//


module.exports = function(config) {

	// require each module and return it
	return {
		activate: require('./activate')(config),
		clone: require('./clone')(config),
		del: require('./delete')(config),
		get: require('./get')(config),
		getId: require('./getId')(config),
		order: require('./order')(config),
		publish: require('./publish')(config),
		publishDraft: require('./publishDraft')(config),
		save: require('./save')(config),
		search: require('./search')(config)
	};
};