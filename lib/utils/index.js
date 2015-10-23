// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: utils
//


module.exports = function(config) {

	// since the utils are dependent on each other
	// they need to be added to the config in a
	// specific order
	config.utils = {};
	
	// no dependencies
	config.utils.util       = require('./util')(config);
	config.utils.string     = require('./string')(config);
	config.utils.validate   = require('./validate')(config);
	
	// dependent on util
	config.utils.view       = require('./view')(config);
	config.utils.order      = require('./order')(config);
	config.utils.schema     = require('./schema')(config);
	config.utils.cache      = require('./cache')(config);
	
	// dependent on validate
	config.utils.relation   = require('./relation')(config);
	
	// dependent on validate, string
	config.utils.sql        = require('./sql')(config);
	
	// dependent on schema, sql
	config.utils.search     = require('./search')(config);
	
	// dependent on schema, validate
	config.utils.payload    = require('./payload')(config);
	
	// too many deps
	config.utils.model        = require('./model')(config);
	config.utils.pagination   = require('./pagination')(config);
	
	// return the utils
	return config.utils;
};