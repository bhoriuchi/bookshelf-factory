// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: cache utils
//


module.exports = function(config) {
	
	// constants
	var _VER = config.statics.version;
	
	// modules
	var _    = config.lodash;
	var u    = config.utils.util;
	
	function factory(cfg) {
		
		// initialize the cache
		var cache = config.registry._factoryCache = {};
		
		var get = function(id, model, version) {
			if (_.has(cache, [version, model, id, 'object'].join('.'))) {
				cache[version][model][id].lastAccess = (new Date()).getTime();
				return cache[version][model][id].object;
			}
			return null;
		};
		var del = function(id, model, version) {
			if (_.has(cache, [version, model, id, 'object'].join('.'))) {
				delete cache[version][model][id];
				return true;
			}
			return false;
		};
		var clear = function() {
			config.mods.registry._factoryCache = {};
		};
		var clean = function() {
			console.log('clean the cache');
		};
			
			
		var onSave = function(id, model, version) {
			console.log('save', id, model, version);
		};
		var onDelete = function(id, model, version) {
			console.log('delete', id, model, version);
		};
		var onGet = function(id, model, version, trxid) {
			console.log(id, model, version, trxid);
		};

		
		
		return {
			cache: cache,
			onSave: onSave,
			onDelete: onDelete,
			onGet: onGet,
			get: get,
			del: del,
			clear: clear,
			clean: clean
		};
	}
	
	function redis(cfg) {
		var onSave = function(id, model, version) {
			console.log('save', id, model, version);
		};
		var onDelete = function(id, model, version) {
			console.log('delete', id, model, version);
		};
		var onGet = function(id, model, version) {
			console.log('get', id, model, version);
		};
		
		
		return {
			onSave: onSave,
			onDelete: onDelete,
			onGet: onGet
		};
	}
	
	function custom(cfg) {
		return cfg;
	}
	
	
	// return public functions
	return function(cacheConfig) {
		
		if (cacheConfig.type === 'redis') {
			return redis(cacheConfig);
		}
		else if (cacheConfig.type === 'custom') {
			return custom(cacheConfig);
		}
		else {
			return factory(cacheConfig);
		}
	};
};