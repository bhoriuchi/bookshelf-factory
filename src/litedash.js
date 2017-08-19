'use strict';

function isArray(obj) {
  return Array.isArray(obj);
}

isArray._accepts = ['ANY'];

function forEach(obj, fn) {
  try {
    if (isArray(obj)) {
      var idx = 0;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = obj[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var val = _step.value;

          if (fn(val, idx) === false) break;
          idx++;
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    } else {
      for (var key in obj) {
        if (fn(obj[key], key) === false) break;
      }
    }
  } catch (err) {
    return;
  }
}

forEach._accepts = [Object, Array];

function first(array) {
  return !Array.isArray(array) || !array.length ? undefined : array[0];
}

first._accepts = [Array];

function isString(obj) {
  return typeof obj === 'string';
}

isString._accepts = ['ANY'];

function isNumber(obj) {
  return typeof obj === 'number' && !isNaN(obj);
}

isNumber._accepts = ['ANY'];

function toPath(pathString) {
  if (isArray(pathString)) return pathString;
  if (isNumber(pathString)) return [pathString];

  // taken from lodash - https://github.com/lodash/lodash
  var pathRx = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(\.|\[\])(?:\4|$))/g;
  var pathArray = [];

  if (isString(pathString)) {
    pathString.replace(pathRx, function (match, number, quote, string) {
      pathArray.push(quote ? string : number !== undefined ? Number(number) : match);
      return pathArray[pathArray.length - 1];
    });
  }
  return pathArray;
}

toPath._accepts = [String];

function get(obj, path, defaultValue) {
  var fields = isArray(path) ? path : toPath(path);

  var idx = 0;
  var length = fields.length;

  while (obj !== null && idx < length) {
    obj = obj[fields[idx++]];
  }

  return idx && idx === length ? obj : defaultValue;
}

get._accepts = [Object, Array];
get._dependencies = ['dash.isArray', 'dash.toPath'];

function has(obj, path) {
  path = toPath(path);

  var index = -1;
  var _path = path,
      length = _path.length;

  var result = false;
  var key = void 0;

  while (++index < length) {
    key = path[index];
    if (!(result = obj != null && Object.prototype.hasOwnProperty.call(obj, key))) {
      break;
    }
    obj = obj[key];
  }

  return result;
}

has._accepts = [Object, Array];
has._dependencies = ['dash.toPath'];

function set(obj, path, val) {
  var fields = Array.isArray(path) ? path : toPath(path);
  var prop = fields.shift();

  if (!fields.length) return obj[prop] = value;
  if (!has(obj, prop)) obj[prop] = fields.length >= 1 && typeof fields[0] === 'number' ? [] : {};

  set(obj[prop], fields, value);
}

set._accepts = [Object, Array];
set._dependencies = ['dash.toPath', 'dash.has'];

function isDate(obj) {
  return obj instanceof Date;
}

isDate._accepts = ['ANY'];

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};



















var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};



































var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

function isObject(obj) {
  return (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && obj !== null;
}

isObject._accepts = ['ANY'];

function isEmpty(obj) {
  if (obj === '' || obj === null || obj === undefined) return true;
  if ((obj instanceof Buffer || Array.isArray(obj)) && !obj.length) return true;
  if ((obj instanceof Map || obj instanceof Set) && !obj.size) return true;
  if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && !Object.keys(obj).length) return true;
  return false;
}

isEmpty._accepts = ['ANY'];

function isHash(obj) {
  return isObject(obj) && !isArray(obj) && !isDate(obj) && !isEmpty(obj);
}

isHash._accepts = ['ANY'];
isHash._dependencies = ['dash.isArray', 'dash.isDate', 'dash.isObject', 'dash.isEmpty'];

function includes(obj, key) {
  return isArray(obj) && obj.indexOf(key) !== -1;
}

includes._accepts = [Array];

// modified from http://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
function mergeDeep(target, source) {
  var seen = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

  if (includes(seen, target) || includes(seen, source)) return target;
  seen = seen.concat([target, source]);

  if (isHash(target) && isHash(source)) {
    for (var key in source) {
      if (isHash(source[key])) {
        if (!target[key]) Object.assign(target, defineProperty({}, key, {}));
        mergeDeep(target[key], source[key], seen.slice());
      } else {
        Object.assign(target, defineProperty({}, key, source[key]));
      }
    }
  }
  return target;
}

function merge() {
  var args = [].concat(Array.prototype.slice.call(arguments));

  if (args.length === 0) return {};else if (args.length === 1) return args[0];else if (!isHash(args[0])) return {};

  var target = args[0];
  var sources = args.slice(1);

  forEach(sources, function (source) {
    if (isHash(source)) mergeDeep(target, source);
  });
  return target;
}

merge._accepts = [Object];
merge._dependencies = ['dash.isHash', 'dash.forEach', 'dash.includes'];

function intersection() {
  var args = [].concat(Array.prototype.slice.call(arguments));
  if (!args.length) return [];

  return args.reduce(function (prev, cur) {
    if (!isArray(prev) || !isArray(cur)) return [];
    var left = new Set(prev);
    var right = new Set(cur);
    var i = [].concat(toConsumableArray(left)).filter(function (item) {
      return right.has(item);
    });
    return [].concat(toConsumableArray(i));
  }, args[0]);
}

intersection._accepts = [Array];

/*
function range (number = 0, increment = 1) {
  return [ ...Array(number).keys() ].map(i => i * increment)
}
*/

function range(start, end, step) {
  if (end === undefined && step === undefined) {
    end = start;
    start = 0;
    step = 1;
  } else if (step === undefined) {
    step = 1;
  }

  // non numbers return empty array
  if (!isNumber(start) || !isNumber(end) || !isNumber(step) || !step) return [];
  if (start === end) return [start];

  var count = start;
  var _range = [];

  if (start < end) {
    while (count < end) {
      _range.push(count);
      count += Math.abs(step);
    }
  } else {
    while (count > end) {
      _range.push(count);
      count -= Math.abs(step);
    }
  }

  return _range;
}

range._accepts = [Number];

function keys(obj) {
  try {
    return isArray(obj) ? range(obj.length) : Object.keys(obj);
  } catch (err) {
    return [];
  }
}

keys._accepts = [Object, Array];
keys._dependencies = ['dash.isArray', 'dash.range'];

function pickBy(obj, fn) {
  var newObj = {};
  if (!isHash(obj)) return newObj;
  forEach(obj, function (v, k) {
    if (fn(v, k)) newObj[k] = v;
  });
  return newObj;
}

pickBy._accepts = [Object];
pickBy._dependencies = ['dash.isHash', 'dash.forEach'];

function union() {
  var args = [].concat(Array.prototype.slice.call(arguments));
  if (!args.length) return [];

  try {
    var u = args.reduce(function (prev, cur) {
      if (!isArray(prev) || !isArray(cur)) return [];
      return prev.concat(cur);
    }, []);

    return [].concat(toConsumableArray(new Set(u)));
  } catch (err) {
    console.error(err);
    return [];
  }
}

union._accepts = ['ANY'];

function isFunction(obj) {
  return typeof obj === 'function';
}

isFunction._accepts = ['ANY'];

function identity(value) {
  return value;
}

identity._accepts = ['ANY'];

function reduce(collection, iteratee, accumulator) {
  if (!isObject(collection) && !isArray(collection)) return undefined;
  if (!isFunction(iteratee)) {
    accumulator = iteratee;
    iteratee = identity;
  }

  accumulator = accumulator !== undefined ? accumulator : isArray(collection) ? collection.length ? collection[0] : undefined : keys(collection).length ? collection[keys(collection)[0]] : undefined;

  forEach(collection, function (value, key) {
    accumulator = iteratee(accumulator, value, key, collection);
  });

  return accumulator;
}

reduce._accepts = [Object, Array];
reduce._dependencies = ['dash.forEach', 'dash.isObject', 'dash.isArray', 'dash.isFunction', 'dash.identity', 'dash.keys'];

var _dash = {
  forEach: forEach,
  first: first,
  get: get,
  has: has,
  set: set,
  merge: merge,
  intersection: intersection,
  keys: keys,
  pickBy: pickBy,
  includes: includes,
  union: union,
  reduce: reduce,
  isHash: isHash,
  isFunction: isFunction,
  isObject: isObject,
  isArray: isArray,
  toPath: toPath,
  range: range,
  identity: identity,
  isDate: isDate,
  isEmpty: isEmpty,
  isString: isString,
  isNumber: isNumber
};

var DashChain = function DashChain(obj) {
  this._value = obj;
};

DashChain.prototype.value = function () {
  return this._value;
};

var dash = function dash(obj) {
  return new DashChain(obj);
};

var _loop = function _loop(name) {
  var fn = _dash[name];
  dash[name] = fn;
  if (fn._chainable !== false) {
    DashChain.prototype[name] = function () {
      var args = [this._value].concat([].concat(Array.prototype.slice.call(arguments)));
      this._value = fn.apply(this, args);
      return fn._terminates === true ? this._value : this;
    };
  }
};

for (var name in _dash) {
  _loop(name);
}

module.exports = dash;
