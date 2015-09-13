// v0.1.0 models

module.exports = function(dream) {
	return {
		group: require('./group')(dream),
		station: require('./station')(dream),
		survivor: require('../v0.1.0/survivor')(dream),
		user: require('../v0.1.0/user')(dream),
		action: require('../v0.1.0/action')(dream),
		whitelist: require('../v0.1.0/whitelist')(dream)
	};
};
