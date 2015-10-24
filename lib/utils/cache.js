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
		
		var get = function(id, model, modelVersion, requestVersion) {
			if (_.has(cache, [modelVersion, model, id, 'object'].join('.'))) {
				cache[modelVersion][model.tableName][id].lastAccess = (new Date()).getTime();
				return cache[modelVersion][model.tableName][id].object;
			}
			return null;
		};
		var del = function(id, model, modelVersion, requestVersion) {
			if (_.has(cache, [modelVersion, model.tableName, id].join('.'))) {
				delete cache[modelVersion][model.tableName][id];
				return true;
			}
			return false;
		};
		
		var set = function(id, model, modelVersion, obj, requestVersion) {
			if (!cache[modelVersion]) {
				cache[modelVersion] = {};
			}
			if (!cache[modelVersion][model.tableName]) {
				cache[modelVersion][model.tableName] = {};
			}
			if (!cache[modelVersion][model.tableName][id]) {
				cache[modelVersion][model.tableName][id] = [];
			}
		};
		
		
		var clear = function() {
			config.mods.registry._factoryCache = {};
		};
		var clean = function() {
			//console.log('clean the cache');
			return;
		};
			
			
		var onSave = function(id, model, modelVersion, requestVersion) {
			//console.log('save', id, model, modelVersion, requestVersion);
			return;
		};
		var onDelete = function(id, model, modelVersion, requestVersion) {
			//console.log('delete', id, model, modelVersion, requestVersion);
			return;
		};
		var onGet = function(id, model, modelVersion, requestVersion) {
			return;
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
		var onSave = function(id, model, modelVersion, requestVersion) {
			//console.log('save', id, model, modelVersion, requestVersion);
			return;
		};
		var onDelete = function(id, model, modelVersion, requestVersion) {
			//console.log('delete', id, model, modelVersion, requestVersion);
			return;
		};
		var onGet = function(id, model, modelVersion, requestVersion) {
			return;
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