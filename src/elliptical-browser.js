/**
 * @license
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modern -o ./dist/lodash.js`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
;(function() {

  /** Used as a safe reference for `undefined` in pre ES5 environments */
  var undefined;

  /** Used to pool arrays and objects used internally */
  var arrayPool = [],
      objectPool = [];

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used to prefix keys to avoid issues with `__proto__` and properties on `Object.prototype` */
  var keyPrefix = +new Date + '';

  /** Used as the size when optimizations are enabled for large arrays */
  var largeArraySize = 75;

  /** Used as the max size of the `arrayPool` and `objectPool` */
  var maxPoolSize = 40;

  /** Used to detect and test whitespace */
  var whitespace = (
    // whitespace
    ' \t\x0B\f\xA0\ufeff' +

    // line terminators
    '\n\r\u2028\u2029' +

    // unicode category "Zs" space separators
    '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000'
  );

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /**
   * Used to match ES6 template delimiters
   * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-literals-string-literals
   */
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

  /** Used to match regexp flags from their coerced string values */
  var reFlags = /\w*$/;

  /** Used to detected named functions */
  var reFuncName = /^\s*function[ \n\r\t]+\w/;

  /** Used to match "interpolate" template delimiters */
  var reInterpolate = /<%=([\s\S]+?)%>/g;

  /** Used to match leading whitespace and zeros to be removed */
  var reLeadingSpacesAndZeros = RegExp('^[' + whitespace + ']*0+(?=.$)');

  /** Used to ensure capturing order of template delimiters */
  var reNoMatch = /($^)/;

  /** Used to detect functions containing a `this` reference */
  var reThis = /\bthis\b/;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to assign default `context` object properties */
  var contextProps = [
    'Array', 'Boolean', 'Date', 'Function', 'Math', 'Number', 'Object',
    'RegExp', 'String', '_', 'attachEvent', 'clearTimeout', 'isFinite', 'isNaN',
    'parseInt', 'setTimeout'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Used to identify object classifications that `_.clone` supports */
  var cloneableClasses = {};
  cloneableClasses[funcClass] = false;
  cloneableClasses[argsClass] = cloneableClasses[arrayClass] =
  cloneableClasses[boolClass] = cloneableClasses[dateClass] =
  cloneableClasses[numberClass] = cloneableClasses[objectClass] =
  cloneableClasses[regexpClass] = cloneableClasses[stringClass] = true;

  /** Used as an internal `_.debounce` options object */
  var debounceOptions = {
    'leading': false,
    'maxWait': 0,
    'trailing': false
  };

  /** Used as the property descriptor for `__bindData__` */
  var descriptor = {
    'configurable': false,
    'enumerable': false,
    'value': null,
    'writable': false
  };

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /** Used as a reference to the global object */
  var root = (objectTypes[typeof window] && window) || this;

  /** Detect free variable `exports` */
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  /** Detect free variable `module` */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect the popular CommonJS extension `module.exports` */
  var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root` */
  var freeGlobal = objectTypes[typeof global] && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
    root = freeGlobal;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * The base implementation of `_.indexOf` without support for binary searches
   * or `fromIndex` constraints.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {*} value The value to search for.
   * @param {number} [fromIndex=0] The index to search from.
   * @returns {number} Returns the index of the matched value or `-1`.
   */
  function baseIndexOf(array, value, fromIndex) {
    var index = (fromIndex || 0) - 1,
        length = array ? array.length : 0;

    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * An implementation of `_.contains` for cache objects that mimics the return
   * signature of `_.indexOf` by returning `0` if the value is found, else `-1`.
   *
   * @private
   * @param {Object} cache The cache object to inspect.
   * @param {*} value The value to search for.
   * @returns {number} Returns `0` if `value` is found, else `-1`.
   */
  function cacheIndexOf(cache, value) {
    var type = typeof value;
    cache = cache.cache;

    if (type == 'boolean' || value == null) {
      return cache[value] ? 0 : -1;
    }
    if (type != 'number' && type != 'string') {
      type = 'object';
    }
    var key = type == 'number' ? value : keyPrefix + value;
    cache = (cache = cache[type]) && cache[key];

    return type == 'object'
      ? (cache && baseIndexOf(cache, value) > -1 ? 0 : -1)
      : (cache ? 0 : -1);
  }

  /**
   * Adds a given value to the corresponding cache object.
   *
   * @private
   * @param {*} value The value to add to the cache.
   */
  function cachePush(value) {
    var cache = this.cache,
        type = typeof value;

    if (type == 'boolean' || value == null) {
      cache[value] = true;
    } else {
      if (type != 'number' && type != 'string') {
        type = 'object';
      }
      var key = type == 'number' ? value : keyPrefix + value,
          typeCache = cache[type] || (cache[type] = {});

      if (type == 'object') {
        (typeCache[key] || (typeCache[key] = [])).push(value);
      } else {
        typeCache[key] = true;
      }
    }
  }

  /**
   * Used by `_.max` and `_.min` as the default callback when a given
   * collection is a string value.
   *
   * @private
   * @param {string} value The character to inspect.
   * @returns {number} Returns the code unit of given character.
   */
  function charAtCallback(value) {
    return value.charCodeAt(0);
  }

  /**
   * Used by `sortBy` to compare transformed `collection` elements, stable sorting
   * them in ascending order.
   *
   * @private
   * @param {Object} a The object to compare to `b`.
   * @param {Object} b The object to compare to `a`.
   * @returns {number} Returns the sort order indicator of `1` or `-1`.
   */
  function compareAscending(a, b) {
    var ac = a.criteria,
        bc = b.criteria,
        index = -1,
        length = ac.length;

    while (++index < length) {
      var value = ac[index],
          other = bc[index];

      if (value !== other) {
        if (value > other || typeof value == 'undefined') {
          return 1;
        }
        if (value < other || typeof other == 'undefined') {
          return -1;
        }
      }
    }
    // Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
    // that causes it, under certain circumstances, to return the same value for
    // `a` and `b`. See https://github.com/jashkenas/underscore/pull/1247
    //
    // This also ensures a stable sort in V8 and other engines.
    // See http://code.google.com/p/v8/issues/detail?id=90
    return a.index - b.index;
  }

  /**
   * Creates a cache object to optimize linear searches of large arrays.
   *
   * @private
   * @param {Array} [array=[]] The array to search.
   * @returns {null|Object} Returns the cache object or `null` if caching should not be used.
   */
  function createCache(array) {
    var index = -1,
        length = array.length,
        first = array[0],
        mid = array[(length / 2) | 0],
        last = array[length - 1];

    if (first && typeof first == 'object' &&
        mid && typeof mid == 'object' && last && typeof last == 'object') {
      return false;
    }
    var cache = getObject();
    cache['false'] = cache['null'] = cache['true'] = cache['undefined'] = false;

    var result = getObject();
    result.array = array;
    result.cache = cache;
    result.push = cachePush;

    while (++index < length) {
      result.push(array[index]);
    }
    return result;
  }

  /**
   * Used by `template` to escape characters for inclusion in compiled
   * string literals.
   *
   * @private
   * @param {string} match The matched character to escape.
   * @returns {string} Returns the escaped character.
   */
  function escapeStringChar(match) {
    return '\\' + stringEscapes[match];
  }

  /**
   * Gets an array from the array pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Array} The array from the pool.
   */
  function getArray() {
    return arrayPool.pop() || [];
  }

  /**
   * Gets an object from the object pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Object} The object from the pool.
   */
  function getObject() {
    return objectPool.pop() || {
      'array': null,
      'cache': null,
      'criteria': null,
      'false': false,
      'index': 0,
      'null': false,
      'number': null,
      'object': null,
      'push': null,
      'string': null,
      'true': false,
      'undefined': false,
      'value': null
    };
  }

  /**
   * Releases the given array back to the array pool.
   *
   * @private
   * @param {Array} [array] The array to release.
   */
  function releaseArray(array) {
    array.length = 0;
    if (arrayPool.length < maxPoolSize) {
      arrayPool.push(array);
    }
  }

  /**
   * Releases the given object back to the object pool.
   *
   * @private
   * @param {Object} [object] The object to release.
   */
  function releaseObject(object) {
    var cache = object.cache;
    if (cache) {
      releaseObject(cache);
    }
    object.array = object.cache = object.criteria = object.object = object.number = object.string = object.value = null;
    if (objectPool.length < maxPoolSize) {
      objectPool.push(object);
    }
  }

  /**
   * Slices the `collection` from the `start` index up to, but not including,
   * the `end` index.
   *
   * Note: This function is used instead of `Array#slice` to support node lists
   * in IE < 9 and to ensure dense arrays are returned.
   *
   * @private
   * @param {Array|Object|string} collection The collection to slice.
   * @param {number} start The start index.
   * @param {number} end The end index.
   * @returns {Array} Returns the new array.
   */
  function slice(array, start, end) {
    start || (start = 0);
    if (typeof end == 'undefined') {
      end = array ? array.length : 0;
    }
    var index = -1,
        length = end - start || 0,
        result = Array(length < 0 ? 0 : length);

    while (++index < length) {
      result[index] = array[start + index];
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Create a new `lodash` function using the given context object.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} [context=root] The context object.
   * @returns {Function} Returns the `lodash` function.
   */
  function runInContext(context) {
    // Avoid issues with some ES3 environments that attempt to use values, named
    // after built-in constructors like `Object`, for the creation of literals.
    // ES5 clears this up by stating that literals must use built-in constructors.
    // See http://es5.github.io/#x11.1.5.
    context = context ? _.defaults(root.Object(), context, _.pick(root, contextProps)) : root;

    /** Native constructor references */
    var Array = context.Array,
        Boolean = context.Boolean,
        Date = context.Date,
        Function = context.Function,
        Math = context.Math,
        Number = context.Number,
        Object = context.Object,
        RegExp = context.RegExp,
        String = context.String,
        TypeError = context.TypeError;

    /**
     * Used for `Array` method references.
     *
     * Normally `Array.prototype` would suffice, however, using an array literal
     * avoids issues in Narwhal.
     */
    var arrayRef = [];

    /** Used for native method references */
    var objectProto = Object.prototype;

    /** Used to restore the original `_` reference in `noConflict` */
    var oldDash = context._;

    /** Used to resolve the internal [[Class]] of values */
    var toString = objectProto.toString;

    /** Used to detect if a method is native */
    var reNative = RegExp('^' +
      String(toString)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/toString| for [^\]]+/g, '.*?') + '$'
    );

    /** Native method shortcuts */
    var ceil = Math.ceil,
        clearTimeout = context.clearTimeout,
        floor = Math.floor,
        fnToString = Function.prototype.toString,
        getPrototypeOf = isNative(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf,
        hasOwnProperty = objectProto.hasOwnProperty,
        push = arrayRef.push,
        setTimeout = context.setTimeout,
        splice = arrayRef.splice,
        unshift = arrayRef.unshift;

    /** Used to set meta data on functions */
    var defineProperty = (function() {
      // IE 8 only accepts DOM elements
      try {
        var o = {},
            func = isNative(func = Object.defineProperty) && func,
            result = func(o, o, o) && func;
      } catch(e) { }
      return result;
    }());

    /* Native method shortcuts for methods with the same name as other `lodash` methods */
    var nativeCreate = isNative(nativeCreate = Object.create) && nativeCreate,
        nativeIsArray = isNative(nativeIsArray = Array.isArray) && nativeIsArray,
        nativeIsFinite = context.isFinite,
        nativeIsNaN = context.isNaN,
        nativeKeys = isNative(nativeKeys = Object.keys) && nativeKeys,
        nativeMax = Math.max,
        nativeMin = Math.min,
        nativeParseInt = context.parseInt,
        nativeRandom = Math.random;

    /** Used to lookup a built-in constructor by [[Class]] */
    var ctorByClass = {};
    ctorByClass[arrayClass] = Array;
    ctorByClass[boolClass] = Boolean;
    ctorByClass[dateClass] = Date;
    ctorByClass[funcClass] = Function;
    ctorByClass[objectClass] = Object;
    ctorByClass[numberClass] = Number;
    ctorByClass[regexpClass] = RegExp;
    ctorByClass[stringClass] = String;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object which wraps the given value to enable intuitive
     * method chaining.
     *
     * In addition to Lo-Dash methods, wrappers also have the following `Array` methods:
     * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`, `splice`,
     * and `unshift`
     *
     * Chaining is supported in custom builds as long as the `value` method is
     * implicitly or explicitly included in the build.
     *
     * The chainable wrapper functions are:
     * `after`, `assign`, `bind`, `bindAll`, `bindKey`, `chain`, `compact`,
     * `compose`, `concat`, `countBy`, `create`, `createCallback`, `curry`,
     * `debounce`, `defaults`, `defer`, `delay`, `difference`, `filter`, `flatten`,
     * `forEach`, `forEachRight`, `forIn`, `forInRight`, `forOwn`, `forOwnRight`,
     * `functions`, `groupBy`, `indexBy`, `initial`, `intersection`, `invert`,
     * `invoke`, `keys`, `map`, `max`, `memoize`, `merge`, `min`, `object`, `omit`,
     * `once`, `pairs`, `partial`, `partialRight`, `pick`, `pluck`, `pull`, `push`,
     * `range`, `reject`, `remove`, `rest`, `reverse`, `shuffle`, `slice`, `sort`,
     * `sortBy`, `splice`, `tap`, `throttle`, `times`, `toArray`, `transform`,
     * `union`, `uniq`, `unshift`, `unzip`, `values`, `where`, `without`, `wrap`,
     * and `zip`
     *
     * The non-chainable wrapper functions are:
     * `clone`, `cloneDeep`, `contains`, `escape`, `every`, `find`, `findIndex`,
     * `findKey`, `findLast`, `findLastIndex`, `findLastKey`, `has`, `identity`,
     * `indexOf`, `isArguments`, `isArray`, `isBoolean`, `isDate`, `isElement`,
     * `isEmpty`, `isEqual`, `isFinite`, `isFunction`, `isNaN`, `isNull`, `isNumber`,
     * `isObject`, `isPlainObject`, `isRegExp`, `isString`, `isUndefined`, `join`,
     * `lastIndexOf`, `mixin`, `noConflict`, `parseInt`, `pop`, `random`, `reduce`,
     * `reduceRight`, `result`, `shift`, `size`, `some`, `sortedIndex`, `runInContext`,
     * `template`, `unescape`, `uniqueId`, and `value`
     *
     * The wrapper functions `first` and `last` return wrapped values when `n` is
     * provided, otherwise they return unwrapped values.
     *
     * Explicit chaining can be enabled by using the `_.chain` method.
     *
     * @name _
     * @constructor
     * @category Chaining
     * @param {*} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns a `lodash` instance.
     * @example
     *
     * var wrapped = _([1, 2, 3]);
     *
     * // returns an unwrapped value
     * wrapped.reduce(function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * // returns a wrapped value
     * var squares = wrapped.map(function(num) {
     *   return num * num;
     * });
     *
     * _.isArray(squares);
     * // => false
     *
     * _.isArray(squares.value());
     * // => true
     */
    function lodash(value) {
      // don't wrap if already wrapped, even if wrapped by a different `lodash` constructor
      return (value && typeof value == 'object' && !isArray(value) && hasOwnProperty.call(value, '__wrapped__'))
       ? value
       : new lodashWrapper(value);
    }

    /**
     * A fast path for creating `lodash` wrapper objects.
     *
     * @private
     * @param {*} value The value to wrap in a `lodash` instance.
     * @param {boolean} chainAll A flag to enable chaining for all methods
     * @returns {Object} Returns a `lodash` instance.
     */
    function lodashWrapper(value, chainAll) {
      this.__chain__ = !!chainAll;
      this.__wrapped__ = value;
    }
    // ensure `new lodashWrapper` is an instance of `lodash`
    lodashWrapper.prototype = lodash.prototype;

    /**
     * An object used to flag environments features.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    var support = lodash.support = {};

    /**
     * Detect if functions can be decompiled by `Function#toString`
     * (all but PS3 and older Opera mobile browsers & avoided in Windows 8 apps).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.funcDecomp = !isNative(context.WinRTError) && reThis.test(runInContext);

    /**
     * Detect if `Function#name` is supported (all but IE).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.funcNames = typeof Function.name == 'string';

    /**
     * By default, the template delimiters used by Lo-Dash are similar to those in
     * embedded Ruby (ERB). Change the following template settings to use alternative
     * delimiters.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    lodash.templateSettings = {

      /**
       * Used to detect `data` property values to be HTML-escaped.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'escape': /<%-([\s\S]+?)%>/g,

      /**
       * Used to detect code to be evaluated.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'evaluate': /<%([\s\S]+?)%>/g,

      /**
       * Used to detect `data` property values to inject.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'interpolate': reInterpolate,

      /**
       * Used to reference the data object in the template text.
       *
       * @memberOf _.templateSettings
       * @type string
       */
      'variable': '',

      /**
       * Used to import variables into the compiled template.
       *
       * @memberOf _.templateSettings
       * @type Object
       */
      'imports': {

        /**
         * A reference to the `lodash` function.
         *
         * @memberOf _.templateSettings.imports
         * @type Function
         */
        '_': lodash
      }
    };

    /*--------------------------------------------------------------------------*/

    /**
     * The base implementation of `_.bind` that creates the bound function and
     * sets its meta data.
     *
     * @private
     * @param {Array} bindData The bind data array.
     * @returns {Function} Returns the new bound function.
     */
    function baseBind(bindData) {
      var func = bindData[0],
          partialArgs = bindData[2],
          thisArg = bindData[4];

      function bound() {
        // `Function#bind` spec
        // http://es5.github.io/#x15.3.4.5
        if (partialArgs) {
          // avoid `arguments` object deoptimizations by using `slice` instead
          // of `Array.prototype.slice.call` and not assigning `arguments` to a
          // variable as a ternary expression
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        // mimic the constructor's `return` behavior
        // http://es5.github.io/#x13.2.2
        if (this instanceof bound) {
          // ensure `new bound` is an instance of `func`
          var thisBinding = baseCreate(func.prototype),
              result = func.apply(thisBinding, args || arguments);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisArg, args || arguments);
      }
      setBindData(bound, bindData);
      return bound;
    }

    /**
     * The base implementation of `_.clone` without argument juggling or support
     * for `thisArg` binding.
     *
     * @private
     * @param {*} value The value to clone.
     * @param {boolean} [isDeep=false] Specify a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {Array} [stackA=[]] Tracks traversed source objects.
     * @param {Array} [stackB=[]] Associates clones with source counterparts.
     * @returns {*} Returns the cloned value.
     */
    function baseClone(value, isDeep, callback, stackA, stackB) {
      if (callback) {
        var result = callback(value);
        if (typeof result != 'undefined') {
          return result;
        }
      }
      // inspect [[Class]]
      var isObj = isObject(value);
      if (isObj) {
        var className = toString.call(value);
        if (!cloneableClasses[className]) {
          return value;
        }
        var ctor = ctorByClass[className];
        switch (className) {
          case boolClass:
          case dateClass:
            return new ctor(+value);

          case numberClass:
          case stringClass:
            return new ctor(value);

          case regexpClass:
            result = ctor(value.source, reFlags.exec(value));
            result.lastIndex = value.lastIndex;
            return result;
        }
      } else {
        return value;
      }
      var isArr = isArray(value);
      if (isDeep) {
        // check for circular references and return corresponding clone
        var initedStack = !stackA;
        stackA || (stackA = getArray());
        stackB || (stackB = getArray());

        var length = stackA.length;
        while (length--) {
          if (stackA[length] == value) {
            return stackB[length];
          }
        }
        result = isArr ? ctor(value.length) : {};
      }
      else {
        result = isArr ? slice(value) : assign({}, value);
      }
      // add array properties assigned by `RegExp#exec`
      if (isArr) {
        if (hasOwnProperty.call(value, 'index')) {
          result.index = value.index;
        }
        if (hasOwnProperty.call(value, 'input')) {
          result.input = value.input;
        }
      }
      // exit for shallow clone
      if (!isDeep) {
        return result;
      }
      // add the source value to the stack of traversed objects
      // and associate it with its clone
      stackA.push(value);
      stackB.push(result);

      // recursively populate clone (susceptible to call stack limits)
      (isArr ? forEach : forOwn)(value, function(objValue, key) {
        result[key] = baseClone(objValue, isDeep, callback, stackA, stackB);
      });

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * The base implementation of `_.create` without support for assigning
     * properties to the created object.
     *
     * @private
     * @param {Object} prototype The object to inherit from.
     * @returns {Object} Returns the new object.
     */
    function baseCreate(prototype, properties) {
      return isObject(prototype) ? nativeCreate(prototype) : {};
    }
    // fallback for browsers without `Object.create`
    if (!nativeCreate) {
      baseCreate = (function() {
        function Object() {}
        return function(prototype) {
          if (isObject(prototype)) {
            Object.prototype = prototype;
            var result = new Object;
            Object.prototype = null;
          }
          return result || context.Object();
        };
      }());
    }

    /**
     * The base implementation of `_.createCallback` without support for creating
     * "_.pluck" or "_.where" style callbacks.
     *
     * @private
     * @param {*} [func=identity] The value to convert to a callback.
     * @param {*} [thisArg] The `this` binding of the created callback.
     * @param {number} [argCount] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     */
    function baseCreateCallback(func, thisArg, argCount) {
      if (typeof func != 'function') {
        return identity;
      }
      // exit early for no `thisArg` or already bound by `Function#bind`
      if (typeof thisArg == 'undefined' || !('prototype' in func)) {
        return func;
      }
      var bindData = func.__bindData__;
      if (typeof bindData == 'undefined') {
        if (support.funcNames) {
          bindData = !func.name;
        }
        bindData = bindData || !support.funcDecomp;
        if (!bindData) {
          var source = fnToString.call(func);
          if (!support.funcNames) {
            bindData = !reFuncName.test(source);
          }
          if (!bindData) {
            // checks if `func` references the `this` keyword and stores the result
            bindData = reThis.test(source);
            setBindData(func, bindData);
          }
        }
      }
      // exit early if there are no `this` references or `func` is bound
      if (bindData === false || (bindData !== true && bindData[1] & 1)) {
        return func;
      }
      switch (argCount) {
        case 1: return function(value) {
          return func.call(thisArg, value);
        };
        case 2: return function(a, b) {
          return func.call(thisArg, a, b);
        };
        case 3: return function(value, index, collection) {
          return func.call(thisArg, value, index, collection);
        };
        case 4: return function(accumulator, value, index, collection) {
          return func.call(thisArg, accumulator, value, index, collection);
        };
      }
      return bind(func, thisArg);
    }

    /**
     * The base implementation of `createWrapper` that creates the wrapper and
     * sets its meta data.
     *
     * @private
     * @param {Array} bindData The bind data array.
     * @returns {Function} Returns the new function.
     */
    function baseCreateWrapper(bindData) {
      var func = bindData[0],
          bitmask = bindData[1],
          partialArgs = bindData[2],
          partialRightArgs = bindData[3],
          thisArg = bindData[4],
          arity = bindData[5];

      var isBind = bitmask & 1,
          isBindKey = bitmask & 2,
          isCurry = bitmask & 4,
          isCurryBound = bitmask & 8,
          key = func;

      function bound() {
        var thisBinding = isBind ? thisArg : this;
        if (partialArgs) {
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        if (partialRightArgs || isCurry) {
          args || (args = slice(arguments));
          if (partialRightArgs) {
            push.apply(args, partialRightArgs);
          }
          if (isCurry && args.length < arity) {
            bitmask |= 16 & ~32;
            return baseCreateWrapper([func, (isCurryBound ? bitmask : bitmask & ~3), args, null, thisArg, arity]);
          }
        }
        args || (args = arguments);
        if (isBindKey) {
          func = thisBinding[key];
        }
        if (this instanceof bound) {
          thisBinding = baseCreate(func.prototype);
          var result = func.apply(thisBinding, args);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisBinding, args);
      }
      setBindData(bound, bindData);
      return bound;
    }

    /**
     * The base implementation of `_.difference` that accepts a single array
     * of values to exclude.
     *
     * @private
     * @param {Array} array The array to process.
     * @param {Array} [values] The array of values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     */
    function baseDifference(array, values) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          isLarge = length >= largeArraySize && indexOf === baseIndexOf,
          result = [];

      if (isLarge) {
        var cache = createCache(values);
        if (cache) {
          indexOf = cacheIndexOf;
          values = cache;
        } else {
          isLarge = false;
        }
      }
      while (++index < length) {
        var value = array[index];
        if (indexOf(values, value) < 0) {
          result.push(value);
        }
      }
      if (isLarge) {
        releaseObject(values);
      }
      return result;
    }

    /**
     * The base implementation of `_.flatten` without support for callback
     * shorthands or `thisArg` binding.
     *
     * @private
     * @param {Array} array The array to flatten.
     * @param {boolean} [isShallow=false] A flag to restrict flattening to a single level.
     * @param {boolean} [isStrict=false] A flag to restrict flattening to arrays and `arguments` objects.
     * @param {number} [fromIndex=0] The index to start from.
     * @returns {Array} Returns a new flattened array.
     */
    function baseFlatten(array, isShallow, isStrict, fromIndex) {
      var index = (fromIndex || 0) - 1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];

        if (value && typeof value == 'object' && typeof value.length == 'number'
            && (isArray(value) || isArguments(value))) {
          // recursively flatten arrays (susceptible to call stack limits)
          if (!isShallow) {
            value = baseFlatten(value, isShallow, isStrict);
          }
          var valIndex = -1,
              valLength = value.length,
              resIndex = result.length;

          result.length += valLength;
          while (++valIndex < valLength) {
            result[resIndex++] = value[valIndex];
          }
        } else if (!isStrict) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * The base implementation of `_.isEqual`, without support for `thisArg` binding,
     * that allows partial "_.where" style comparisons.
     *
     * @private
     * @param {*} a The value to compare.
     * @param {*} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {Function} [isWhere=false] A flag to indicate performing partial comparisons.
     * @param {Array} [stackA=[]] Tracks traversed `a` objects.
     * @param {Array} [stackB=[]] Tracks traversed `b` objects.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     */
    function baseIsEqual(a, b, callback, isWhere, stackA, stackB) {
      // used to indicate that when comparing objects, `a` has at least the properties of `b`
      if (callback) {
        var result = callback(a, b);
        if (typeof result != 'undefined') {
          return !!result;
        }
      }
      // exit early for identical values
      if (a === b) {
        // treat `+0` vs. `-0` as not equal
        return a !== 0 || (1 / a == 1 / b);
      }
      var type = typeof a,
          otherType = typeof b;

      // exit early for unlike primitive values
      if (a === a &&
          !(a && objectTypes[type]) &&
          !(b && objectTypes[otherType])) {
        return false;
      }
      // exit early for `null` and `undefined` avoiding ES3's Function#call behavior
      // http://es5.github.io/#x15.3.4.4
      if (a == null || b == null) {
        return a === b;
      }
      // compare [[Class]] names
      var className = toString.call(a),
          otherClass = toString.call(b);

      if (className == argsClass) {
        className = objectClass;
      }
      if (otherClass == argsClass) {
        otherClass = objectClass;
      }
      if (className != otherClass) {
        return false;
      }
      switch (className) {
        case boolClass:
        case dateClass:
          // coerce dates and booleans to numbers, dates to milliseconds and booleans
          // to `1` or `0` treating invalid dates coerced to `NaN` as not equal
          return +a == +b;

        case numberClass:
          // treat `NaN` vs. `NaN` as equal
          return (a != +a)
            ? b != +b
            // but treat `+0` vs. `-0` as not equal
            : (a == 0 ? (1 / a == 1 / b) : a == +b);

        case regexpClass:
        case stringClass:
          // coerce regexes to strings (http://es5.github.io/#x15.10.6.4)
          // treat string primitives and their corresponding object instances as equal
          return a == String(b);
      }
      var isArr = className == arrayClass;
      if (!isArr) {
        // unwrap any `lodash` wrapped values
        var aWrapped = hasOwnProperty.call(a, '__wrapped__'),
            bWrapped = hasOwnProperty.call(b, '__wrapped__');

        if (aWrapped || bWrapped) {
          return baseIsEqual(aWrapped ? a.__wrapped__ : a, bWrapped ? b.__wrapped__ : b, callback, isWhere, stackA, stackB);
        }
        // exit for functions and DOM nodes
        if (className != objectClass) {
          return false;
        }
        // in older versions of Opera, `arguments` objects have `Array` constructors
        var ctorA = a.constructor,
            ctorB = b.constructor;

        // non `Object` object instances with different constructors are not equal
        if (ctorA != ctorB &&
              !(isFunction(ctorA) && ctorA instanceof ctorA && isFunction(ctorB) && ctorB instanceof ctorB) &&
              ('constructor' in a && 'constructor' in b)
            ) {
          return false;
        }
      }
      // assume cyclic structures are equal
      // the algorithm for detecting cyclic structures is adapted from ES 5.1
      // section 15.12.3, abstract operation `JO` (http://es5.github.io/#x15.12.3)
      var initedStack = !stackA;
      stackA || (stackA = getArray());
      stackB || (stackB = getArray());

      var length = stackA.length;
      while (length--) {
        if (stackA[length] == a) {
          return stackB[length] == b;
        }
      }
      var size = 0;
      result = true;

      // add `a` and `b` to the stack of traversed objects
      stackA.push(a);
      stackB.push(b);

      // recursively compare objects and arrays (susceptible to call stack limits)
      if (isArr) {
        // compare lengths to determine if a deep comparison is necessary
        length = a.length;
        size = b.length;
        result = size == length;

        if (result || isWhere) {
          // deep compare the contents, ignoring non-numeric properties
          while (size--) {
            var index = length,
                value = b[size];

            if (isWhere) {
              while (index--) {
                if ((result = baseIsEqual(a[index], value, callback, isWhere, stackA, stackB))) {
                  break;
                }
              }
            } else if (!(result = baseIsEqual(a[size], value, callback, isWhere, stackA, stackB))) {
              break;
            }
          }
        }
      }
      else {
        // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
        // which, in this case, is more costly
        forIn(b, function(value, key, b) {
          if (hasOwnProperty.call(b, key)) {
            // count the number of properties.
            size++;
            // deep compare each property value.
            return (result = hasOwnProperty.call(a, key) && baseIsEqual(a[key], value, callback, isWhere, stackA, stackB));
          }
        });

        if (result && !isWhere) {
          // ensure both objects have the same number of properties
          forIn(a, function(value, key, a) {
            if (hasOwnProperty.call(a, key)) {
              // `size` will be `-1` if `a` has more properties than `b`
              return (result = --size > -1);
            }
          });
        }
      }
      stackA.pop();
      stackB.pop();

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * The base implementation of `_.merge` without argument juggling or support
     * for `thisArg` binding.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {Array} [stackA=[]] Tracks traversed source objects.
     * @param {Array} [stackB=[]] Associates values with source counterparts.
     */
    function baseMerge(object, source, callback, stackA, stackB) {
      (isArray(source) ? forEach : forOwn)(source, function(source, key) {
        var found,
            isArr,
            result = source,
            value = object[key];

        if (source && ((isArr = isArray(source)) || isPlainObject(source))) {
          // avoid merging previously merged cyclic sources
          var stackLength = stackA.length;
          while (stackLength--) {
            if ((found = stackA[stackLength] == source)) {
              value = stackB[stackLength];
              break;
            }
          }
          if (!found) {
            var isShallow;
            if (callback) {
              result = callback(value, source);
              if ((isShallow = typeof result != 'undefined')) {
                value = result;
              }
            }
            if (!isShallow) {
              value = isArr
                ? (isArray(value) ? value : [])
                : (isPlainObject(value) ? value : {});
            }
            // add `source` and associated `value` to the stack of traversed objects
            stackA.push(source);
            stackB.push(value);

            // recursively merge objects and arrays (susceptible to call stack limits)
            if (!isShallow) {
              baseMerge(value, source, callback, stackA, stackB);
            }
          }
        }
        else {
          if (callback) {
            result = callback(value, source);
            if (typeof result == 'undefined') {
              result = source;
            }
          }
          if (typeof result != 'undefined') {
            value = result;
          }
        }
        object[key] = value;
      });
    }

    /**
     * The base implementation of `_.random` without argument juggling or support
     * for returning floating-point numbers.
     *
     * @private
     * @param {number} min The minimum possible value.
     * @param {number} max The maximum possible value.
     * @returns {number} Returns a random number.
     */
    function baseRandom(min, max) {
      return min + floor(nativeRandom() * (max - min + 1));
    }

    /**
     * The base implementation of `_.uniq` without support for callback shorthands
     * or `thisArg` binding.
     *
     * @private
     * @param {Array} array The array to process.
     * @param {boolean} [isSorted=false] A flag to indicate that `array` is sorted.
     * @param {Function} [callback] The function called per iteration.
     * @returns {Array} Returns a duplicate-value-free array.
     */
    function baseUniq(array, isSorted, callback) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          result = [];

      var isLarge = !isSorted && length >= largeArraySize && indexOf === baseIndexOf,
          seen = (callback || isLarge) ? getArray() : result;

      if (isLarge) {
        var cache = createCache(seen);
        indexOf = cacheIndexOf;
        seen = cache;
      }
      while (++index < length) {
        var value = array[index],
            computed = callback ? callback(value, index, array) : value;

        if (isSorted
              ? !index || seen[seen.length - 1] !== computed
              : indexOf(seen, computed) < 0
            ) {
          if (callback || isLarge) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
      if (isLarge) {
        releaseArray(seen.array);
        releaseObject(seen);
      } else if (callback) {
        releaseArray(seen);
      }
      return result;
    }

    /**
     * Creates a function that aggregates a collection, creating an object composed
     * of keys generated from the results of running each element of the collection
     * through a callback. The given `setter` function sets the keys and values
     * of the composed object.
     *
     * @private
     * @param {Function} setter The setter function.
     * @returns {Function} Returns the new aggregator function.
     */
    function createAggregator(setter) {
      return function(collection, callback, thisArg) {
        var result = {};
        callback = lodash.createCallback(callback, thisArg, 3);

        var index = -1,
            length = collection ? collection.length : 0;

        if (typeof length == 'number') {
          while (++index < length) {
            var value = collection[index];
            setter(result, value, callback(value, index, collection), collection);
          }
        } else {
          forOwn(collection, function(value, key, collection) {
            setter(result, value, callback(value, key, collection), collection);
          });
        }
        return result;
      };
    }

    /**
     * Creates a function that, when called, either curries or invokes `func`
     * with an optional `this` binding and partially applied arguments.
     *
     * @private
     * @param {Function|string} func The function or method name to reference.
     * @param {number} bitmask The bitmask of method flags to compose.
     *  The bitmask may be composed of the following flags:
     *  1 - `_.bind`
     *  2 - `_.bindKey`
     *  4 - `_.curry`
     *  8 - `_.curry` (bound)
     *  16 - `_.partial`
     *  32 - `_.partialRight`
     * @param {Array} [partialArgs] An array of arguments to prepend to those
     *  provided to the new function.
     * @param {Array} [partialRightArgs] An array of arguments to append to those
     *  provided to the new function.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {number} [arity] The arity of `func`.
     * @returns {Function} Returns the new function.
     */
    function createWrapper(func, bitmask, partialArgs, partialRightArgs, thisArg, arity) {
      var isBind = bitmask & 1,
          isBindKey = bitmask & 2,
          isCurry = bitmask & 4,
          isCurryBound = bitmask & 8,
          isPartial = bitmask & 16,
          isPartialRight = bitmask & 32;

      if (!isBindKey && !isFunction(func)) {
        throw new TypeError;
      }
      if (isPartial && !partialArgs.length) {
        bitmask &= ~16;
        isPartial = partialArgs = false;
      }
      if (isPartialRight && !partialRightArgs.length) {
        bitmask &= ~32;
        isPartialRight = partialRightArgs = false;
      }
      var bindData = func && func.__bindData__;
      if (bindData && bindData !== true) {
        // clone `bindData`
        bindData = slice(bindData);
        if (bindData[2]) {
          bindData[2] = slice(bindData[2]);
        }
        if (bindData[3]) {
          bindData[3] = slice(bindData[3]);
        }
        // set `thisBinding` is not previously bound
        if (isBind && !(bindData[1] & 1)) {
          bindData[4] = thisArg;
        }
        // set if previously bound but not currently (subsequent curried functions)
        if (!isBind && bindData[1] & 1) {
          bitmask |= 8;
        }
        // set curried arity if not yet set
        if (isCurry && !(bindData[1] & 4)) {
          bindData[5] = arity;
        }
        // append partial left arguments
        if (isPartial) {
          push.apply(bindData[2] || (bindData[2] = []), partialArgs);
        }
        // append partial right arguments
        if (isPartialRight) {
          unshift.apply(bindData[3] || (bindData[3] = []), partialRightArgs);
        }
        // merge flags
        bindData[1] |= bitmask;
        return createWrapper.apply(null, bindData);
      }
      // fast path for `_.bind`
      var creater = (bitmask == 1 || bitmask === 17) ? baseBind : baseCreateWrapper;
      return creater([func, bitmask, partialArgs, partialRightArgs, thisArg, arity]);
    }

    /**
     * Used by `escape` to convert characters to HTML entities.
     *
     * @private
     * @param {string} match The matched character to escape.
     * @returns {string} Returns the escaped character.
     */
    function escapeHtmlChar(match) {
      return htmlEscapes[match];
    }

    /**
     * Gets the appropriate "indexOf" function. If the `_.indexOf` method is
     * customized, this method returns the custom method, otherwise it returns
     * the `baseIndexOf` function.
     *
     * @private
     * @returns {Function} Returns the "indexOf" function.
     */
    function getIndexOf() {
      var result = (result = lodash.indexOf) === indexOf ? baseIndexOf : result;
      return result;
    }

    /**
     * Checks if `value` is a native function.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a native function, else `false`.
     */
    function isNative(value) {
      return typeof value == 'function' && reNative.test(value);
    }

    /**
     * Sets `this` binding data on a given function.
     *
     * @private
     * @param {Function} func The function to set data on.
     * @param {Array} value The data array to set.
     */
    var setBindData = !defineProperty ? noop : function(func, value) {
      descriptor.value = value;
      defineProperty(func, '__bindData__', descriptor);
    };

    /**
     * A fallback implementation of `isPlainObject` which checks if a given value
     * is an object created by the `Object` constructor, assuming objects created
     * by the `Object` constructor have no inherited enumerable properties and that
     * there are no `Object.prototype` extensions.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     */
    function shimIsPlainObject(value) {
      var ctor,
          result;

      // avoid non Object objects, `arguments` objects, and DOM elements
      if (!(value && toString.call(value) == objectClass) ||
          (ctor = value.constructor, isFunction(ctor) && !(ctor instanceof ctor))) {
        return false;
      }
      // In most environments an object's own properties are iterated before
      // its inherited properties. If the last iterated property is an object's
      // own property then there are no inherited enumerable properties.
      forIn(value, function(value, key) {
        result = key;
      });
      return typeof result == 'undefined' || hasOwnProperty.call(value, result);
    }

    /**
     * Used by `unescape` to convert HTML entities to characters.
     *
     * @private
     * @param {string} match The matched character to unescape.
     * @returns {string} Returns the unescaped character.
     */
    function unescapeHtmlChar(match) {
      return htmlUnescapes[match];
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Checks if `value` is an `arguments` object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an `arguments` object, else `false`.
     * @example
     *
     * (function() { return _.isArguments(arguments); })(1, 2, 3);
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    function isArguments(value) {
      return value && typeof value == 'object' && typeof value.length == 'number' &&
        toString.call(value) == argsClass || false;
    }

    /**
     * Checks if `value` is an array.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an array, else `false`.
     * @example
     *
     * (function() { return _.isArray(arguments); })();
     * // => false
     *
     * _.isArray([1, 2, 3]);
     * // => true
     */
    var isArray = nativeIsArray || function(value) {
      return value && typeof value == 'object' && typeof value.length == 'number' &&
        toString.call(value) == arrayClass || false;
    };

    /**
     * A fallback implementation of `Object.keys` which produces an array of the
     * given object's own enumerable property names.
     *
     * @private
     * @type Function
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names.
     */
    var shimKeys = function(object) {
      var index, iterable = object, result = [];
      if (!iterable) return result;
      if (!(objectTypes[typeof object])) return result;
        for (index in iterable) {
          if (hasOwnProperty.call(iterable, index)) {
            result.push(index);
          }
        }
      return result
    };

    /**
     * Creates an array composed of the own enumerable property names of an object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names.
     * @example
     *
     * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
     * // => ['one', 'two', 'three'] (property order is not guaranteed across environments)
     */
    var keys = !nativeKeys ? shimKeys : function(object) {
      if (!isObject(object)) {
        return [];
      }
      return nativeKeys(object);
    };

    /**
     * Used to convert characters to HTML entities:
     *
     * Though the `>` character is escaped for symmetry, characters like `>` and `/`
     * don't require escaping in HTML and have no special meaning unless they're part
     * of a tag or an unquoted attribute value.
     * http://mathiasbynens.be/notes/ambiguous-ampersands (under "semi-related fun fact")
     */
    var htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    /** Used to convert HTML entities to characters */
    var htmlUnescapes = invert(htmlEscapes);

    /** Used to match HTML entities and HTML characters */
    var reEscapedHtml = RegExp('(' + keys(htmlUnescapes).join('|') + ')', 'g'),
        reUnescapedHtml = RegExp('[' + keys(htmlEscapes).join('') + ']', 'g');

    /*--------------------------------------------------------------------------*/

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object. Subsequent sources will overwrite property assignments of previous
     * sources. If a callback is provided it will be executed to produce the
     * assigned values. The callback is bound to `thisArg` and invoked with two
     * arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @type Function
     * @alias extend
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param {Function} [callback] The function to customize assigning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * _.assign({ 'name': 'fred' }, { 'employer': 'slate' });
     * // => { 'name': 'fred', 'employer': 'slate' }
     *
     * var defaults = _.partialRight(_.assign, function(a, b) {
     *   return typeof a == 'undefined' ? b : a;
     * });
     *
     * var object = { 'name': 'barney' };
     * defaults(object, { 'name': 'fred', 'employer': 'slate' });
     * // => { 'name': 'barney', 'employer': 'slate' }
     */
    var assign = function(object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      if (argsLength > 3 && typeof args[argsLength - 2] == 'function') {
        var callback = baseCreateCallback(args[--argsLength - 1], args[argsLength--], 2);
      } else if (argsLength > 2 && typeof args[argsLength - 1] == 'function') {
        callback = args[--argsLength];
      }
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          result[index] = callback ? callback(result[index], iterable[index]) : iterable[index];
        }
        }
      }
      return result
    };

    /**
     * Creates a clone of `value`. If `isDeep` is `true` nested objects will also
     * be cloned, otherwise they will be assigned by reference. If a callback
     * is provided it will be executed to produce the cloned values. If the
     * callback returns `undefined` cloning will be handled by the method instead.
     * The callback is bound to `thisArg` and invoked with one argument; (value).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to clone.
     * @param {boolean} [isDeep=false] Specify a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the cloned value.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * var shallow = _.clone(characters);
     * shallow[0] === characters[0];
     * // => true
     *
     * var deep = _.clone(characters, true);
     * deep[0] === characters[0];
     * // => false
     *
     * _.mixin({
     *   'clone': _.partialRight(_.clone, function(value) {
     *     return _.isElement(value) ? value.cloneNode(false) : undefined;
     *   })
     * });
     *
     * var clone = _.clone(document.body);
     * clone.childNodes.length;
     * // => 0
     */
    function clone(value, isDeep, callback, thisArg) {
      // allows working with "Collections" methods without using their `index`
      // and `collection` arguments for `isDeep` and `callback`
      if (typeof isDeep != 'boolean' && isDeep != null) {
        thisArg = callback;
        callback = isDeep;
        isDeep = false;
      }
      return baseClone(value, isDeep, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }

    /**
     * Creates a deep clone of `value`. If a callback is provided it will be
     * executed to produce the cloned values. If the callback returns `undefined`
     * cloning will be handled by the method instead. The callback is bound to
     * `thisArg` and invoked with one argument; (value).
     *
     * Note: This method is loosely based on the structured clone algorithm. Functions
     * and DOM nodes are **not** cloned. The enumerable properties of `arguments` objects and
     * objects created by constructors other than `Object` are cloned to plain `Object` objects.
     * See http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the deep cloned value.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * var deep = _.cloneDeep(characters);
     * deep[0] === characters[0];
     * // => false
     *
     * var view = {
     *   'label': 'docs',
     *   'node': element
     * };
     *
     * var clone = _.cloneDeep(view, function(value) {
     *   return _.isElement(value) ? value.cloneNode(true) : undefined;
     * });
     *
     * clone.node == view.node;
     * // => false
     */
    function cloneDeep(value, callback, thisArg) {
      return baseClone(value, true, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }

    /**
     * Creates an object that inherits from the given `prototype` object. If a
     * `properties` object is provided its own enumerable properties are assigned
     * to the created object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} prototype The object to inherit from.
     * @param {Object} [properties] The properties to assign to the object.
     * @returns {Object} Returns the new object.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * function Circle() {
     *   Shape.call(this);
     * }
     *
     * Circle.prototype = _.create(Shape.prototype, { 'constructor': Circle });
     *
     * var circle = new Circle;
     * circle instanceof Circle;
     * // => true
     *
     * circle instanceof Shape;
     * // => true
     */
    function create(prototype, properties) {
      var result = baseCreate(prototype);
      return properties ? assign(result, properties) : result;
    }

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object for all destination properties that resolve to `undefined`. Once a
     * property is set, additional defaults of the same property will be ignored.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param- {Object} [guard] Allows working with `_.reduce` without using its
     *  `key` and `object` arguments as sources.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var object = { 'name': 'barney' };
     * _.defaults(object, { 'name': 'fred', 'employer': 'slate' });
     * // => { 'name': 'barney', 'employer': 'slate' }
     */
    var defaults = function(object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (typeof result[index] == 'undefined') result[index] = iterable[index];
        }
        }
      }
      return result
    };

    /**
     * This method is like `_.findIndex` except that it returns the key of the
     * first element that passes the callback check, instead of the element itself.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [callback=identity] The function called per
     *  iteration. If a property name or object is provided it will be used to
     *  create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {string|undefined} Returns the key of the found element, else `undefined`.
     * @example
     *
     * var characters = {
     *   'barney': {  'age': 36, 'blocked': false },
     *   'fred': {    'age': 40, 'blocked': true },
     *   'pebbles': { 'age': 1,  'blocked': false }
     * };
     *
     * _.findKey(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => 'barney' (property order is not guaranteed across environments)
     *
     * // using "_.where" callback shorthand
     * _.findKey(characters, { 'age': 1 });
     * // => 'pebbles'
     *
     * // using "_.pluck" callback shorthand
     * _.findKey(characters, 'blocked');
     * // => 'fred'
     */
    function findKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwn(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * This method is like `_.findKey` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [callback=identity] The function called per
     *  iteration. If a property name or object is provided it will be used to
     *  create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {string|undefined} Returns the key of the found element, else `undefined`.
     * @example
     *
     * var characters = {
     *   'barney': {  'age': 36, 'blocked': true },
     *   'fred': {    'age': 40, 'blocked': false },
     *   'pebbles': { 'age': 1,  'blocked': true }
     * };
     *
     * _.findLastKey(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => returns `pebbles`, assuming `_.findKey` returns `barney`
     *
     * // using "_.where" callback shorthand
     * _.findLastKey(characters, { 'age': 40 });
     * // => 'fred'
     *
     * // using "_.pluck" callback shorthand
     * _.findLastKey(characters, 'blocked');
     * // => 'pebbles'
     */
    function findLastKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwnRight(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over own and inherited enumerable properties of an object,
     * executing the callback for each property. The callback is bound to `thisArg`
     * and invoked with three arguments; (value, key, object). Callbacks may exit
     * iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * Shape.prototype.move = function(x, y) {
     *   this.x += x;
     *   this.y += y;
     * };
     *
     * _.forIn(new Shape, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'x', 'y', and 'move' (property order is not guaranteed across environments)
     */
    var forIn = function(collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
        for (index in iterable) {
          if (callback(iterable[index], index, collection) === false) return result;
        }
      return result
    };

    /**
     * This method is like `_.forIn` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * Shape.prototype.move = function(x, y) {
     *   this.x += x;
     *   this.y += y;
     * };
     *
     * _.forInRight(new Shape, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'move', 'y', and 'x' assuming `_.forIn ` logs 'x', 'y', and 'move'
     */
    function forInRight(object, callback, thisArg) {
      var pairs = [];

      forIn(object, function(value, key) {
        pairs.push(key, value);
      });

      var length = pairs.length;
      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(pairs[length--], pairs[length], object) === false) {
          break;
        }
      }
      return object;
    }

    /**
     * Iterates over own enumerable properties of an object, executing the callback
     * for each property. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, key, object). Callbacks may exit iteration early by
     * explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   console.log(key);
     * });
     * // => logs '0', '1', and 'length' (property order is not guaranteed across environments)
     */
    var forOwn = function(collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (callback(iterable[index], index, collection) === false) return result;
        }
      return result
    };

    /**
     * This method is like `_.forOwn` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwnRight({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   console.log(key);
     * });
     * // => logs 'length', '1', and '0' assuming `_.forOwn` logs '0', '1', and 'length'
     */
    function forOwnRight(object, callback, thisArg) {
      var props = keys(object),
          length = props.length;

      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        var key = props[length];
        if (callback(object[key], key, object) === false) {
          break;
        }
      }
      return object;
    }

    /**
     * Creates a sorted array of property names of all enumerable properties,
     * own and inherited, of `object` that have function values.
     *
     * @static
     * @memberOf _
     * @alias methods
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names that have function values.
     * @example
     *
     * _.functions(_);
     * // => ['all', 'any', 'bind', 'bindAll', 'clone', 'compact', 'compose', ...]
     */
    function functions(object) {
      var result = [];
      forIn(object, function(value, key) {
        if (isFunction(value)) {
          result.push(key);
        }
      });
      return result.sort();
    }

    /**
     * Checks if the specified property name exists as a direct property of `object`,
     * instead of an inherited property.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @param {string} key The name of the property to check.
     * @returns {boolean} Returns `true` if key is a direct property, else `false`.
     * @example
     *
     * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
     * // => true
     */
    function has(object, key) {
      return object ? hasOwnProperty.call(object, key) : false;
    }

    /**
     * Creates an object composed of the inverted keys and values of the given object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to invert.
     * @returns {Object} Returns the created inverted object.
     * @example
     *
     * _.invert({ 'first': 'fred', 'second': 'barney' });
     * // => { 'fred': 'first', 'barney': 'second' }
     */
    function invert(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = {};

      while (++index < length) {
        var key = props[index];
        result[object[key]] = key;
      }
      return result;
    }

    /**
     * Checks if `value` is a boolean value.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a boolean value, else `false`.
     * @example
     *
     * _.isBoolean(null);
     * // => false
     */
    function isBoolean(value) {
      return value === true || value === false ||
        value && typeof value == 'object' && toString.call(value) == boolClass || false;
    }

    /**
     * Checks if `value` is a date.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a date, else `false`.
     * @example
     *
     * _.isDate(new Date);
     * // => true
     */
    function isDate(value) {
      return value && typeof value == 'object' && toString.call(value) == dateClass || false;
    }

    /**
     * Checks if `value` is a DOM element.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a DOM element, else `false`.
     * @example
     *
     * _.isElement(document.body);
     * // => true
     */
    function isElement(value) {
      return value && value.nodeType === 1 || false;
    }

    /**
     * Checks if `value` is empty. Arrays, strings, or `arguments` objects with a
     * length of `0` and objects with no own enumerable properties are considered
     * "empty".
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object|string} value The value to inspect.
     * @returns {boolean} Returns `true` if the `value` is empty, else `false`.
     * @example
     *
     * _.isEmpty([1, 2, 3]);
     * // => false
     *
     * _.isEmpty({});
     * // => true
     *
     * _.isEmpty('');
     * // => true
     */
    function isEmpty(value) {
      var result = true;
      if (!value) {
        return result;
      }
      var className = toString.call(value),
          length = value.length;

      if ((className == arrayClass || className == stringClass || className == argsClass ) ||
          (className == objectClass && typeof length == 'number' && isFunction(value.splice))) {
        return !length;
      }
      forOwn(value, function() {
        return (result = false);
      });
      return result;
    }

    /**
     * Performs a deep comparison between two values to determine if they are
     * equivalent to each other. If a callback is provided it will be executed
     * to compare values. If the callback returns `undefined` comparisons will
     * be handled by the method instead. The callback is bound to `thisArg` and
     * invoked with two arguments; (a, b).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} a The value to compare.
     * @param {*} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'name': 'fred' };
     * var copy = { 'name': 'fred' };
     *
     * object == copy;
     * // => false
     *
     * _.isEqual(object, copy);
     * // => true
     *
     * var words = ['hello', 'goodbye'];
     * var otherWords = ['hi', 'goodbye'];
     *
     * _.isEqual(words, otherWords, function(a, b) {
     *   var reGreet = /^(?:hello|hi)$/i,
     *       aGreet = _.isString(a) && reGreet.test(a),
     *       bGreet = _.isString(b) && reGreet.test(b);
     *
     *   return (aGreet || bGreet) ? (aGreet == bGreet) : undefined;
     * });
     * // => true
     */
    function isEqual(a, b, callback, thisArg) {
      return baseIsEqual(a, b, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 2));
    }

    /**
     * Checks if `value` is, or can be coerced to, a finite number.
     *
     * Note: This is not the same as native `isFinite` which will return true for
     * booleans and empty strings. See http://es5.github.io/#x15.1.2.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is finite, else `false`.
     * @example
     *
     * _.isFinite(-101);
     * // => true
     *
     * _.isFinite('10');
     * // => true
     *
     * _.isFinite(true);
     * // => false
     *
     * _.isFinite('');
     * // => false
     *
     * _.isFinite(Infinity);
     * // => false
     */
    function isFinite(value) {
      return nativeIsFinite(value) && !nativeIsNaN(parseFloat(value));
    }

    /**
     * Checks if `value` is a function.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     */
    function isFunction(value) {
      return typeof value == 'function';
    }

    /**
     * Checks if `value` is the language type of Object.
     * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(1);
     * // => false
     */
    function isObject(value) {
      // check if the value is the ECMAScript language type of Object
      // http://es5.github.io/#x8
      // and avoid a V8 bug
      // http://code.google.com/p/v8/issues/detail?id=2291
      return !!(value && objectTypes[typeof value]);
    }

    /**
     * Checks if `value` is `NaN`.
     *
     * Note: This is not the same as native `isNaN` which will return `true` for
     * `undefined` and other non-numeric values. See http://es5.github.io/#x15.1.2.4.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `NaN`, else `false`.
     * @example
     *
     * _.isNaN(NaN);
     * // => true
     *
     * _.isNaN(new Number(NaN));
     * // => true
     *
     * isNaN(undefined);
     * // => true
     *
     * _.isNaN(undefined);
     * // => false
     */
    function isNaN(value) {
      // `NaN` as a primitive is the only value that is not equal to itself
      // (perform the [[Class]] check first to avoid errors with some host objects in IE)
      return isNumber(value) && value != +value;
    }

    /**
     * Checks if `value` is `null`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `null`, else `false`.
     * @example
     *
     * _.isNull(null);
     * // => true
     *
     * _.isNull(undefined);
     * // => false
     */
    function isNull(value) {
      return value === null;
    }

    /**
     * Checks if `value` is a number.
     *
     * Note: `NaN` is considered a number. See http://es5.github.io/#x8.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a number, else `false`.
     * @example
     *
     * _.isNumber(8.4 * 5);
     * // => true
     */
    function isNumber(value) {
      return typeof value == 'number' ||
        value && typeof value == 'object' && toString.call(value) == numberClass || false;
    }

    /**
     * Checks if `value` is an object created by the `Object` constructor.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * _.isPlainObject(new Shape);
     * // => false
     *
     * _.isPlainObject([1, 2, 3]);
     * // => false
     *
     * _.isPlainObject({ 'x': 0, 'y': 0 });
     * // => true
     */
    var isPlainObject = !getPrototypeOf ? shimIsPlainObject : function(value) {
      if (!(value && toString.call(value) == objectClass)) {
        return false;
      }
      var valueOf = value.valueOf,
          objProto = isNative(valueOf) && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);

      return objProto
        ? (value == objProto || getPrototypeOf(value) == objProto)
        : shimIsPlainObject(value);
    };

    /**
     * Checks if `value` is a regular expression.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a regular expression, else `false`.
     * @example
     *
     * _.isRegExp(/fred/);
     * // => true
     */
    function isRegExp(value) {
      return value && typeof value == 'object' && toString.call(value) == regexpClass || false;
    }

    /**
     * Checks if `value` is a string.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a string, else `false`.
     * @example
     *
     * _.isString('fred');
     * // => true
     */
    function isString(value) {
      return typeof value == 'string' ||
        value && typeof value == 'object' && toString.call(value) == stringClass || false;
    }

    /**
     * Checks if `value` is `undefined`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `undefined`, else `false`.
     * @example
     *
     * _.isUndefined(void 0);
     * // => true
     */
    function isUndefined(value) {
      return typeof value == 'undefined';
    }

    /**
     * Creates an object with the same keys as `object` and values generated by
     * running each own enumerable property of `object` through the callback.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new object with values of the results of each `callback` execution.
     * @example
     *
     * _.mapValues({ 'a': 1, 'b': 2, 'c': 3} , function(num) { return num * 3; });
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     *
     * var characters = {
     *   'fred': { 'name': 'fred', 'age': 40 },
     *   'pebbles': { 'name': 'pebbles', 'age': 1 }
     * };
     *
     * // using "_.pluck" callback shorthand
     * _.mapValues(characters, 'age');
     * // => { 'fred': 40, 'pebbles': 1 }
     */
    function mapValues(object, callback, thisArg) {
      var result = {};
      callback = lodash.createCallback(callback, thisArg, 3);

      forOwn(object, function(value, key, object) {
        result[key] = callback(value, key, object);
      });
      return result;
    }

    /**
     * Recursively merges own enumerable properties of the source object(s), that
     * don't resolve to `undefined` into the destination object. Subsequent sources
     * will overwrite property assignments of previous sources. If a callback is
     * provided it will be executed to produce the merged values of the destination
     * and source properties. If the callback returns `undefined` merging will
     * be handled by the method instead. The callback is bound to `thisArg` and
     * invoked with two arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var names = {
     *   'characters': [
     *     { 'name': 'barney' },
     *     { 'name': 'fred' }
     *   ]
     * };
     *
     * var ages = {
     *   'characters': [
     *     { 'age': 36 },
     *     { 'age': 40 }
     *   ]
     * };
     *
     * _.merge(names, ages);
     * // => { 'characters': [{ 'name': 'barney', 'age': 36 }, { 'name': 'fred', 'age': 40 }] }
     *
     * var food = {
     *   'fruits': ['apple'],
     *   'vegetables': ['beet']
     * };
     *
     * var otherFood = {
     *   'fruits': ['banana'],
     *   'vegetables': ['carrot']
     * };
     *
     * _.merge(food, otherFood, function(a, b) {
     *   return _.isArray(a) ? a.concat(b) : undefined;
     * });
     * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot] }
     */
    function merge(object) {
      var args = arguments,
          length = 2;

      if (!isObject(object)) {
        return object;
      }
      // allows working with `_.reduce` and `_.reduceRight` without using
      // their `index` and `collection` arguments
      if (typeof args[2] != 'number') {
        length = args.length;
      }
      if (length > 3 && typeof args[length - 2] == 'function') {
        var callback = baseCreateCallback(args[--length - 1], args[length--], 2);
      } else if (length > 2 && typeof args[length - 1] == 'function') {
        callback = args[--length];
      }
      var sources = slice(arguments, 1, length),
          index = -1,
          stackA = getArray(),
          stackB = getArray();

      while (++index < length) {
        baseMerge(object, sources[index], callback, stackA, stackB);
      }
      releaseArray(stackA);
      releaseArray(stackB);
      return object;
    }

    /**
     * Creates a shallow clone of `object` excluding the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a callback is provided it will be executed for each
     * property of `object` omitting the properties the callback returns truey
     * for. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|...string|string[]} [callback] The properties to omit or the
     *  function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object without the omitted properties.
     * @example
     *
     * _.omit({ 'name': 'fred', 'age': 40 }, 'age');
     * // => { 'name': 'fred' }
     *
     * _.omit({ 'name': 'fred', 'age': 40 }, function(value) {
     *   return typeof value == 'number';
     * });
     * // => { 'name': 'fred' }
     */
    function omit(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var props = [];
        forIn(object, function(value, key) {
          props.push(key);
        });
        props = baseDifference(props, baseFlatten(arguments, true, false, 1));

        var index = -1,
            length = props.length;

        while (++index < length) {
          var key = props[index];
          result[key] = object[key];
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function(value, key, object) {
          if (!callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * Creates a two dimensional array of an object's key-value pairs,
     * i.e. `[[key1, value1], [key2, value2]]`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns new array of key-value pairs.
     * @example
     *
     * _.pairs({ 'barney': 36, 'fred': 40 });
     * // => [['barney', 36], ['fred', 40]] (property order is not guaranteed across environments)
     */
    function pairs(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        var key = props[index];
        result[index] = [key, object[key]];
      }
      return result;
    }

    /**
     * Creates a shallow clone of `object` composed of the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a callback is provided it will be executed for each
     * property of `object` picking the properties the callback returns truey
     * for. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|...string|string[]} [callback] The function called per
     *  iteration or property names to pick, specified as individual property
     *  names or arrays of property names.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object composed of the picked properties.
     * @example
     *
     * _.pick({ 'name': 'fred', '_userid': 'fred1' }, 'name');
     * // => { 'name': 'fred' }
     *
     * _.pick({ 'name': 'fred', '_userid': 'fred1' }, function(value, key) {
     *   return key.charAt(0) != '_';
     * });
     * // => { 'name': 'fred' }
     */
    function pick(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var index = -1,
            props = baseFlatten(arguments, true, false, 1),
            length = isObject(object) ? props.length : 0;

        while (++index < length) {
          var key = props[index];
          if (key in object) {
            result[key] = object[key];
          }
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function(value, key, object) {
          if (callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * An alternative to `_.reduce` this method transforms `object` to a new
     * `accumulator` object which is the result of running each of its own
     * enumerable properties through a callback, with each callback execution
     * potentially mutating the `accumulator` object. The callback is bound to
     * `thisArg` and invoked with four arguments; (accumulator, value, key, object).
     * Callbacks may exit iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] The custom accumulator value.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var squares = _.transform([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], function(result, num) {
     *   num *= num;
     *   if (num % 2) {
     *     return result.push(num) < 3;
     *   }
     * });
     * // => [1, 9, 25]
     *
     * var mapped = _.transform({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     * });
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function transform(object, callback, accumulator, thisArg) {
      var isArr = isArray(object);
      if (accumulator == null) {
        if (isArr) {
          accumulator = [];
        } else {
          var ctor = object && object.constructor,
              proto = ctor && ctor.prototype;

          accumulator = baseCreate(proto);
        }
      }
      if (callback) {
        callback = lodash.createCallback(callback, thisArg, 4);
        (isArr ? forEach : forOwn)(object, function(value, index, object) {
          return callback(accumulator, value, index, object);
        });
      }
      return accumulator;
    }

    /**
     * Creates an array composed of the own enumerable property values of `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property values.
     * @example
     *
     * _.values({ 'one': 1, 'two': 2, 'three': 3 });
     * // => [1, 2, 3] (property order is not guaranteed across environments)
     */
    function values(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        result[index] = object[props[index]];
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array of elements from the specified indexes, or keys, of the
     * `collection`. Indexes may be specified as individual arguments or as arrays
     * of indexes.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {...(number|number[]|string|string[])} [index] The indexes of `collection`
     *   to retrieve, specified as individual indexes or arrays of indexes.
     * @returns {Array} Returns a new array of elements corresponding to the
     *  provided indexes.
     * @example
     *
     * _.at(['a', 'b', 'c', 'd', 'e'], [0, 2, 4]);
     * // => ['a', 'c', 'e']
     *
     * _.at(['fred', 'barney', 'pebbles'], 0, 2);
     * // => ['fred', 'pebbles']
     */
    function at(collection) {
      var args = arguments,
          index = -1,
          props = baseFlatten(args, true, false, 1),
          length = (args[2] && args[2][args[1]] === collection) ? 1 : props.length,
          result = Array(length);

      while(++index < length) {
        result[index] = collection[props[index]];
      }
      return result;
    }

    /**
     * Checks if a given value is present in a collection using strict equality
     * for comparisons, i.e. `===`. If `fromIndex` is negative, it is used as the
     * offset from the end of the collection.
     *
     * @static
     * @memberOf _
     * @alias include
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {*} target The value to check for.
     * @param {number} [fromIndex=0] The index to search from.
     * @returns {boolean} Returns `true` if the `target` element is found, else `false`.
     * @example
     *
     * _.contains([1, 2, 3], 1);
     * // => true
     *
     * _.contains([1, 2, 3], 1, 2);
     * // => false
     *
     * _.contains({ 'name': 'fred', 'age': 40 }, 'fred');
     * // => true
     *
     * _.contains('pebbles', 'eb');
     * // => true
     */
    function contains(collection, target, fromIndex) {
      var index = -1,
          indexOf = getIndexOf(),
          length = collection ? collection.length : 0,
          result = false;

      fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex) || 0;
      if (isArray(collection)) {
        result = indexOf(collection, target, fromIndex) > -1;
      } else if (typeof length == 'number') {
        result = (isString(collection) ? collection.indexOf(target, fromIndex) : indexOf(collection, target, fromIndex)) > -1;
      } else {
        forOwn(collection, function(value) {
          if (++index >= fromIndex) {
            return !(result = value === target);
          }
        });
      }
      return result;
    }

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of `collection` through the callback. The corresponding value
     * of each key is the number of times the key was returned by the callback.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy(['one', 'two', 'three'], 'length');
     * // => { '3': 2, '5': 1 }
     */
    var countBy = createAggregator(function(result, value, key) {
      (hasOwnProperty.call(result, key) ? result[key]++ : result[key] = 1);
    });

    /**
     * Checks if the given callback returns truey value for **all** elements of
     * a collection. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias all
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if all elements passed the callback check,
     *  else `false`.
     * @example
     *
     * _.every([true, 1, null, 'yes']);
     * // => false
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.every(characters, 'age');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.every(characters, { 'age': 36 });
     * // => false
     */
    function every(collection, callback, thisArg) {
      var result = true;
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if (!(result = !!callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return (result = !!callback(value, index, collection));
        });
      }
      return result;
    }

    /**
     * Iterates over elements of a collection, returning an array of all elements
     * the callback returns truey for. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias select
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that passed the callback check.
     * @example
     *
     * var evens = _.filter([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [2, 4, 6]
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.filter(characters, 'blocked');
     * // => [{ 'name': 'fred', 'age': 40, 'blocked': true }]
     *
     * // using "_.where" callback shorthand
     * _.filter(characters, { 'age': 36 });
     * // => [{ 'name': 'barney', 'age': 36, 'blocked': false }]
     */
    function filter(collection, callback, thisArg) {
      var result = [];
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            result.push(value);
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result.push(value);
          }
        });
      }
      return result;
    }

    /**
     * Iterates over elements of a collection, returning the first element that
     * the callback returns truey for. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias detect, findWhere
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the found element, else `undefined`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': false },
     *   { 'name': 'fred',    'age': 40, 'blocked': true },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': false }
     * ];
     *
     * _.find(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => { 'name': 'barney', 'age': 36, 'blocked': false }
     *
     * // using "_.where" callback shorthand
     * _.find(characters, { 'age': 1 });
     * // =>  { 'name': 'pebbles', 'age': 1, 'blocked': false }
     *
     * // using "_.pluck" callback shorthand
     * _.find(characters, 'blocked');
     * // => { 'name': 'fred', 'age': 40, 'blocked': true }
     */
    function find(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            return value;
          }
        }
      } else {
        var result;
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result = value;
            return false;
          }
        });
        return result;
      }
    }

    /**
     * This method is like `_.find` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the found element, else `undefined`.
     * @example
     *
     * _.findLast([1, 2, 3, 4], function(num) {
     *   return num % 2 == 1;
     * });
     * // => 3
     */
    function findLast(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forEachRight(collection, function(value, index, collection) {
        if (callback(value, index, collection)) {
          result = value;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over elements of a collection, executing the callback for each
     * element. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection). Callbacks may exit iteration early by
     * explicitly returning `false`.
     *
     * Note: As with other "Collections" methods, objects with a `length` property
     * are iterated like arrays. To avoid this behavior `_.forIn` or `_.forOwn`
     * may be used for object iteration.
     *
     * @static
     * @memberOf _
     * @alias each
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|string} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEach(function(num) { console.log(num); }).join(',');
     * // => logs each number and returns '1,2,3'
     *
     * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { console.log(num); });
     * // => logs each number and returns the object (property order is not guaranteed across environments)
     */
    function forEach(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (++index < length) {
          if (callback(collection[index], index, collection) === false) {
            break;
          }
        }
      } else {
        forOwn(collection, callback);
      }
      return collection;
    }

    /**
     * This method is like `_.forEach` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias eachRight
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|string} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEachRight(function(num) { console.log(num); }).join(',');
     * // => logs each number from right to left and returns '3,2,1'
     */
    function forEachRight(collection, callback, thisArg) {
      var length = collection ? collection.length : 0;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (length--) {
          if (callback(collection[length], length, collection) === false) {
            break;
          }
        }
      } else {
        var props = keys(collection);
        length = props.length;
        forOwn(collection, function(value, key, collection) {
          key = props ? props[--length] : --length;
          return callback(collection[key], key, collection);
        });
      }
      return collection;
    }

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of a collection through the callback. The corresponding value
     * of each key is an array of the elements responsible for generating the key.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * // using "_.pluck" callback shorthand
     * _.groupBy(['one', 'two', 'three'], 'length');
     * // => { '3': ['one', 'two'], '5': ['three'] }
     */
    var groupBy = createAggregator(function(result, value, key) {
      (hasOwnProperty.call(result, key) ? result[key] : result[key] = []).push(value);
    });

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of the collection through the given callback. The corresponding
     * value of each key is the last element responsible for generating the key.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * var keys = [
     *   { 'dir': 'left', 'code': 97 },
     *   { 'dir': 'right', 'code': 100 }
     * ];
     *
     * _.indexBy(keys, 'dir');
     * // => { 'left': { 'dir': 'left', 'code': 97 }, 'right': { 'dir': 'right', 'code': 100 } }
     *
     * _.indexBy(keys, function(key) { return String.fromCharCode(key.code); });
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     *
     * _.indexBy(characters, function(key) { this.fromCharCode(key.code); }, String);
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     */
    var indexBy = createAggregator(function(result, value, key) {
      result[key] = value;
    });

    /**
     * Invokes the method named by `methodName` on each element in the `collection`
     * returning an array of the results of each invoked method. Additional arguments
     * will be provided to each invoked method. If `methodName` is a function it
     * will be invoked for, and `this` bound to, each element in the `collection`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|string} methodName The name of the method to invoke or
     *  the function invoked per iteration.
     * @param {...*} [arg] Arguments to invoke the method with.
     * @returns {Array} Returns a new array of the results of each invoked method.
     * @example
     *
     * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
     * // => [[1, 5, 7], [1, 2, 3]]
     *
     * _.invoke([123, 456], String.prototype.split, '');
     * // => [['1', '2', '3'], ['4', '5', '6']]
     */
    function invoke(collection, methodName) {
      var args = slice(arguments, 2),
          index = -1,
          isFunc = typeof methodName == 'function',
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        result[++index] = (isFunc ? methodName : value[methodName]).apply(value, args);
      });
      return result;
    }

    /**
     * Creates an array of values by running each element in the collection
     * through the callback. The callback is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias collect
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of the results of each `callback` execution.
     * @example
     *
     * _.map([1, 2, 3], function(num) { return num * 3; });
     * // => [3, 6, 9]
     *
     * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { return num * 3; });
     * // => [3, 6, 9] (property order is not guaranteed across environments)
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(characters, 'name');
     * // => ['barney', 'fred']
     */
    function map(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = lodash.createCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        var result = Array(length);
        while (++index < length) {
          result[index] = callback(collection[index], index, collection);
        }
      } else {
        result = [];
        forOwn(collection, function(value, key, collection) {
          result[++index] = callback(value, key, collection);
        });
      }
      return result;
    }

    /**
     * Retrieves the maximum value of a collection. If the collection is empty or
     * falsey `-Infinity` is returned. If a callback is provided it will be executed
     * for each value in the collection to generate the criterion by which the value
     * is ranked. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the maximum value.
     * @example
     *
     * _.max([4, 2, 8, 6]);
     * // => 8
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.max(characters, function(chr) { return chr.age; });
     * // => { 'name': 'fred', 'age': 40 };
     *
     * // using "_.pluck" callback shorthand
     * _.max(characters, 'age');
     * // => { 'name': 'fred', 'age': 40 };
     */
    function max(collection, callback, thisArg) {
      var computed = -Infinity,
          result = computed;

      // allows working with functions like `_.map` without using
      // their `index` argument as a callback
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value > result) {
            result = value;
          }
        }
      } else {
        callback = (callback == null && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg, 3);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current > computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the minimum value of a collection. If the collection is empty or
     * falsey `Infinity` is returned. If a callback is provided it will be executed
     * for each value in the collection to generate the criterion by which the value
     * is ranked. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the minimum value.
     * @example
     *
     * _.min([4, 2, 8, 6]);
     * // => 2
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.min(characters, function(chr) { return chr.age; });
     * // => { 'name': 'barney', 'age': 36 };
     *
     * // using "_.pluck" callback shorthand
     * _.min(characters, 'age');
     * // => { 'name': 'barney', 'age': 36 };
     */
    function min(collection, callback, thisArg) {
      var computed = Infinity,
          result = computed;

      // allows working with functions like `_.map` without using
      // their `index` argument as a callback
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value < result) {
            result = value;
          }
        }
      } else {
        callback = (callback == null && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg, 3);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current < computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the value of a specified property from all elements in the collection.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {string} property The name of the property to pluck.
     * @returns {Array} Returns a new array of property values.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.pluck(characters, 'name');
     * // => ['barney', 'fred']
     */
    var pluck = map;

    /**
     * Reduces a collection to a value which is the accumulated result of running
     * each element in the collection through the callback, where each successive
     * callback execution consumes the return value of the previous execution. If
     * `accumulator` is not provided the first element of the collection will be
     * used as the initial `accumulator` value. The callback is bound to `thisArg`
     * and invoked with four arguments; (accumulator, value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @alias foldl, inject
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] Initial value of the accumulator.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var sum = _.reduce([1, 2, 3], function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * var mapped = _.reduce({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     *   return result;
     * }, {});
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function reduce(collection, callback, accumulator, thisArg) {
      if (!collection) return accumulator;
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);

      var index = -1,
          length = collection.length;

      if (typeof length == 'number') {
        if (noaccum) {
          accumulator = collection[++index];
        }
        while (++index < length) {
          accumulator = callback(accumulator, collection[index], index, collection);
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          accumulator = noaccum
            ? (noaccum = false, value)
            : callback(accumulator, value, index, collection)
        });
      }
      return accumulator;
    }

    /**
     * This method is like `_.reduce` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias foldr
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] Initial value of the accumulator.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var list = [[0, 1], [2, 3], [4, 5]];
     * var flat = _.reduceRight(list, function(a, b) { return a.concat(b); }, []);
     * // => [4, 5, 2, 3, 0, 1]
     */
    function reduceRight(collection, callback, accumulator, thisArg) {
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);
      forEachRight(collection, function(value, index, collection) {
        accumulator = noaccum
          ? (noaccum = false, value)
          : callback(accumulator, value, index, collection);
      });
      return accumulator;
    }

    /**
     * The opposite of `_.filter` this method returns the elements of a
     * collection that the callback does **not** return truey for.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that failed the callback check.
     * @example
     *
     * var odds = _.reject([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [1, 3, 5]
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.reject(characters, 'blocked');
     * // => [{ 'name': 'barney', 'age': 36, 'blocked': false }]
     *
     * // using "_.where" callback shorthand
     * _.reject(characters, { 'age': 36 });
     * // => [{ 'name': 'fred', 'age': 40, 'blocked': true }]
     */
    function reject(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);
      return filter(collection, function(value, index, collection) {
        return !callback(value, index, collection);
      });
    }

    /**
     * Retrieves a random element or `n` random elements from a collection.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to sample.
     * @param {number} [n] The number of elements to sample.
     * @param- {Object} [guard] Allows working with functions like `_.map`
     *  without using their `index` arguments as `n`.
     * @returns {Array} Returns the random sample(s) of `collection`.
     * @example
     *
     * _.sample([1, 2, 3, 4]);
     * // => 2
     *
     * _.sample([1, 2, 3, 4], 2);
     * // => [3, 1]
     */
    function sample(collection, n, guard) {
      if (collection && typeof collection.length != 'number') {
        collection = values(collection);
      }
      if (n == null || guard) {
        return collection ? collection[baseRandom(0, collection.length - 1)] : undefined;
      }
      var result = shuffle(collection);
      result.length = nativeMin(nativeMax(0, n), result.length);
      return result;
    }

    /**
     * Creates an array of shuffled values, using a version of the Fisher-Yates
     * shuffle. See http://en.wikipedia.org/wiki/Fisher-Yates_shuffle.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to shuffle.
     * @returns {Array} Returns a new shuffled collection.
     * @example
     *
     * _.shuffle([1, 2, 3, 4, 5, 6]);
     * // => [4, 1, 6, 3, 5, 2]
     */
    function shuffle(collection) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        var rand = baseRandom(0, ++index);
        result[index] = result[rand];
        result[rand] = value;
      });
      return result;
    }

    /**
     * Gets the size of the `collection` by returning `collection.length` for arrays
     * and array-like objects or the number of own enumerable properties for objects.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to inspect.
     * @returns {number} Returns `collection.length` or number of own enumerable properties.
     * @example
     *
     * _.size([1, 2]);
     * // => 2
     *
     * _.size({ 'one': 1, 'two': 2, 'three': 3 });
     * // => 3
     *
     * _.size('pebbles');
     * // => 7
     */
    function size(collection) {
      var length = collection ? collection.length : 0;
      return typeof length == 'number' ? length : keys(collection).length;
    }

    /**
     * Checks if the callback returns a truey value for **any** element of a
     * collection. The function returns as soon as it finds a passing value and
     * does not iterate over the entire collection. The callback is bound to
     * `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias any
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if any element passed the callback check,
     *  else `false`.
     * @example
     *
     * _.some([null, 0, 'yes', false], Boolean);
     * // => true
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.some(characters, 'blocked');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.some(characters, { 'age': 1 });
     * // => false
     */
    function some(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if ((result = callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return !(result = callback(value, index, collection));
        });
      }
      return !!result;
    }

    /**
     * Creates an array of elements, sorted in ascending order by the results of
     * running each element in a collection through the callback. This method
     * performs a stable sort, that is, it will preserve the original sort order
     * of equal elements. The callback is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an array of property names is provided for `callback` the collection
     * will be sorted by each property value.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Array|Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of sorted elements.
     * @example
     *
     * _.sortBy([1, 2, 3], function(num) { return Math.sin(num); });
     * // => [3, 1, 2]
     *
     * _.sortBy([1, 2, 3], function(num) { return this.sin(num); }, Math);
     * // => [3, 1, 2]
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36 },
     *   { 'name': 'fred',    'age': 40 },
     *   { 'name': 'barney',  'age': 26 },
     *   { 'name': 'fred',    'age': 30 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(_.sortBy(characters, 'age'), _.values);
     * // => [['barney', 26], ['fred', 30], ['barney', 36], ['fred', 40]]
     *
     * // sorting by multiple properties
     * _.map(_.sortBy(characters, ['name', 'age']), _.values);
     * // = > [['barney', 26], ['barney', 36], ['fred', 30], ['fred', 40]]
     */
    function sortBy(collection, callback, thisArg) {
      var index = -1,
          isArr = isArray(callback),
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      if (!isArr) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      forEach(collection, function(value, key, collection) {
        var object = result[++index] = getObject();
        if (isArr) {
          object.criteria = map(callback, function(key) { return value[key]; });
        } else {
          (object.criteria = getArray())[0] = callback(value, key, collection);
        }
        object.index = index;
        object.value = value;
      });

      length = result.length;
      result.sort(compareAscending);
      while (length--) {
        var object = result[length];
        result[length] = object.value;
        if (!isArr) {
          releaseArray(object.criteria);
        }
        releaseObject(object);
      }
      return result;
    }

    /**
     * Converts the `collection` to an array.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to convert.
     * @returns {Array} Returns the new converted array.
     * @example
     *
     * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
     * // => [2, 3, 4]
     */
    function toArray(collection) {
      if (collection && typeof collection.length == 'number') {
        return slice(collection);
      }
      return values(collection);
    }

    /**
     * Performs a deep comparison of each element in a `collection` to the given
     * `properties` object, returning an array of all elements that have equivalent
     * property values.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Object} props The object of property values to filter by.
     * @returns {Array} Returns a new array of elements that have the given properties.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'pets': ['hoppy'] },
     *   { 'name': 'fred',   'age': 40, 'pets': ['baby puss', 'dino'] }
     * ];
     *
     * _.where(characters, { 'age': 36 });
     * // => [{ 'name': 'barney', 'age': 36, 'pets': ['hoppy'] }]
     *
     * _.where(characters, { 'pets': ['dino'] });
     * // => [{ 'name': 'fred', 'age': 40, 'pets': ['baby puss', 'dino'] }]
     */
    var where = filter;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array with all falsey values removed. The values `false`, `null`,
     * `0`, `""`, `undefined`, and `NaN` are all falsey.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to compact.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.compact([0, 1, false, 2, '', 3]);
     * // => [1, 2, 3]
     */
    function compact(array) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];
        if (value) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Creates an array excluding all values of the provided arrays using strict
     * equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {...Array} [values] The arrays of values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
     * // => [1, 3, 4]
     */
    function difference(array) {
      return baseDifference(array, baseFlatten(arguments, true, true, 1));
    }

    /**
     * This method is like `_.find` except that it returns the index of the first
     * element that passes the callback check, instead of the element itself.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': false },
     *   { 'name': 'fred',    'age': 40, 'blocked': true },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': false }
     * ];
     *
     * _.findIndex(characters, function(chr) {
     *   return chr.age < 20;
     * });
     * // => 2
     *
     * // using "_.where" callback shorthand
     * _.findIndex(characters, { 'age': 36 });
     * // => 0
     *
     * // using "_.pluck" callback shorthand
     * _.findIndex(characters, 'blocked');
     * // => 1
     */
    function findIndex(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0;

      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        if (callback(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }

    /**
     * This method is like `_.findIndex` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': true },
     *   { 'name': 'fred',    'age': 40, 'blocked': false },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': true }
     * ];
     *
     * _.findLastIndex(characters, function(chr) {
     *   return chr.age > 30;
     * });
     * // => 1
     *
     * // using "_.where" callback shorthand
     * _.findLastIndex(characters, { 'age': 36 });
     * // => 0
     *
     * // using "_.pluck" callback shorthand
     * _.findLastIndex(characters, 'blocked');
     * // => 2
     */
    function findLastIndex(array, callback, thisArg) {
      var length = array ? array.length : 0;
      callback = lodash.createCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(array[length], length, array)) {
          return length;
        }
      }
      return -1;
    }

    /**
     * Gets the first element or first `n` elements of an array. If a callback
     * is provided elements at the beginning of the array are returned as long
     * as the callback returns truey. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias head, take
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the first element(s) of `array`.
     * @example
     *
     * _.first([1, 2, 3]);
     * // => 1
     *
     * _.first([1, 2, 3], 2);
     * // => [1, 2]
     *
     * _.first([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [1, 2]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': true,  'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': false, 'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.first(characters, 'blocked');
     * // => [{ 'name': 'barney', 'blocked': true, 'employer': 'slate' }]
     *
     * // using "_.where" callback shorthand
     * _.pluck(_.first(characters, { 'employer': 'slate' }), 'name');
     * // => ['barney', 'fred']
     */
    function first(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = -1;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[0] : undefined;
        }
      }
      return slice(array, 0, nativeMin(nativeMax(0, n), length));
    }

    /**
     * Flattens a nested array (the nesting can be to any depth). If `isShallow`
     * is truey, the array will only be flattened a single level. If a callback
     * is provided each element of the array is passed through the callback before
     * flattening. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to flatten.
     * @param {boolean} [isShallow=false] A flag to restrict flattening to a single level.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new flattened array.
     * @example
     *
     * _.flatten([1, [2], [3, [[4]]]]);
     * // => [1, 2, 3, 4];
     *
     * _.flatten([1, [2], [3, [[4]]]], true);
     * // => [1, 2, 3, [[4]]];
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 30, 'pets': ['hoppy'] },
     *   { 'name': 'fred',   'age': 40, 'pets': ['baby puss', 'dino'] }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.flatten(characters, 'pets');
     * // => ['hoppy', 'baby puss', 'dino']
     */
    function flatten(array, isShallow, callback, thisArg) {
      // juggle arguments
      if (typeof isShallow != 'boolean' && isShallow != null) {
        thisArg = callback;
        callback = (typeof isShallow != 'function' && thisArg && thisArg[isShallow] === array) ? null : isShallow;
        isShallow = false;
      }
      if (callback != null) {
        array = map(array, callback, thisArg);
      }
      return baseFlatten(array, isShallow);
    }

    /**
     * Gets the index at which the first occurrence of `value` is found using
     * strict equality for comparisons, i.e. `===`. If the array is already sorted
     * providing `true` for `fromIndex` will run a faster binary search.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {boolean|number} [fromIndex=0] The index to search from or `true`
     *  to perform a binary search on a sorted array.
     * @returns {number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 1
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 4
     *
     * _.indexOf([1, 1, 2, 2, 3, 3], 2, true);
     * // => 2
     */
    function indexOf(array, value, fromIndex) {
      if (typeof fromIndex == 'number') {
        var length = array ? array.length : 0;
        fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex || 0);
      } else if (fromIndex) {
        var index = sortedIndex(array, value);
        return array[index] === value ? index : -1;
      }
      return baseIndexOf(array, value, fromIndex);
    }

    /**
     * Gets all but the last element or last `n` elements of an array. If a
     * callback is provided elements at the end of the array are excluded from
     * the result as long as the callback returns truey. The callback is bound
     * to `thisArg` and invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.initial([1, 2, 3]);
     * // => [1, 2]
     *
     * _.initial([1, 2, 3], 2);
     * // => [1]
     *
     * _.initial([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [1]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': false, 'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': true,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.initial(characters, 'blocked');
     * // => [{ 'name': 'barney',  'blocked': false, 'employer': 'slate' }]
     *
     * // using "_.where" callback shorthand
     * _.pluck(_.initial(characters, { 'employer': 'na' }), 'name');
     * // => ['barney', 'fred']
     */
    function initial(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : callback || n;
      }
      return slice(array, 0, nativeMin(nativeMax(0, length - n), length));
    }

    /**
     * Creates an array of unique values present in all provided arrays using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of shared values.
     * @example
     *
     * _.intersection([1, 2, 3], [5, 2, 1, 4], [2, 1]);
     * // => [1, 2]
     */
    function intersection() {
      var args = [],
          argsIndex = -1,
          argsLength = arguments.length,
          caches = getArray(),
          indexOf = getIndexOf(),
          trustIndexOf = indexOf === baseIndexOf,
          seen = getArray();

      while (++argsIndex < argsLength) {
        var value = arguments[argsIndex];
        if (isArray(value) || isArguments(value)) {
          args.push(value);
          caches.push(trustIndexOf && value.length >= largeArraySize &&
            createCache(argsIndex ? args[argsIndex] : seen));
        }
      }
      var array = args[0],
          index = -1,
          length = array ? array.length : 0,
          result = [];

      outer:
      while (++index < length) {
        var cache = caches[0];
        value = array[index];

        if ((cache ? cacheIndexOf(cache, value) : indexOf(seen, value)) < 0) {
          argsIndex = argsLength;
          (cache || seen).push(value);
          while (--argsIndex) {
            cache = caches[argsIndex];
            if ((cache ? cacheIndexOf(cache, value) : indexOf(args[argsIndex], value)) < 0) {
              continue outer;
            }
          }
          result.push(value);
        }
      }
      while (argsLength--) {
        cache = caches[argsLength];
        if (cache) {
          releaseObject(cache);
        }
      }
      releaseArray(caches);
      releaseArray(seen);
      return result;
    }

    /**
     * Gets the last element or last `n` elements of an array. If a callback is
     * provided elements at the end of the array are returned as long as the
     * callback returns truey. The callback is bound to `thisArg` and invoked
     * with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the last element(s) of `array`.
     * @example
     *
     * _.last([1, 2, 3]);
     * // => 3
     *
     * _.last([1, 2, 3], 2);
     * // => [2, 3]
     *
     * _.last([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [2, 3]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': false, 'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': true,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.pluck(_.last(characters, 'blocked'), 'name');
     * // => ['fred', 'pebbles']
     *
     * // using "_.where" callback shorthand
     * _.last(characters, { 'employer': 'na' });
     * // => [{ 'name': 'pebbles', 'blocked': true, 'employer': 'na' }]
     */
    function last(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[length - 1] : undefined;
        }
      }
      return slice(array, nativeMax(0, length - n));
    }

    /**
     * Gets the index at which the last occurrence of `value` is found using strict
     * equality for comparisons, i.e. `===`. If `fromIndex` is negative, it is used
     * as the offset from the end of the collection.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=array.length-1] The index to search from.
     * @returns {number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 4
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 1
     */
    function lastIndexOf(array, value, fromIndex) {
      var index = array ? array.length : 0;
      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? nativeMax(0, index + fromIndex) : nativeMin(fromIndex, index - 1)) + 1;
      }
      while (index--) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Removes all provided values from the given array using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to modify.
     * @param {...*} [value] The values to remove.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [1, 2, 3, 1, 2, 3];
     * _.pull(array, 2, 3);
     * console.log(array);
     * // => [1, 1]
     */
    function pull(array) {
      var args = arguments,
          argsIndex = 0,
          argsLength = args.length,
          length = array ? array.length : 0;

      while (++argsIndex < argsLength) {
        var index = -1,
            value = args[argsIndex];
        while (++index < length) {
          if (array[index] === value) {
            splice.call(array, index--, 1);
            length--;
          }
        }
      }
      return array;
    }

    /**
     * Creates an array of numbers (positive and/or negative) progressing from
     * `start` up to but not including `end`. If `start` is less than `stop` a
     * zero-length range is created unless a negative `step` is specified.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {number} [start=0] The start of the range.
     * @param {number} end The end of the range.
     * @param {number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns a new range array.
     * @example
     *
     * _.range(4);
     * // => [0, 1, 2, 3]
     *
     * _.range(1, 5);
     * // => [1, 2, 3, 4]
     *
     * _.range(0, 20, 5);
     * // => [0, 5, 10, 15]
     *
     * _.range(0, -4, -1);
     * // => [0, -1, -2, -3]
     *
     * _.range(1, 4, 0);
     * // => [1, 1, 1]
     *
     * _.range(0);
     * // => []
     */
    function range(start, end, step) {
      start = +start || 0;
      step = typeof step == 'number' ? step : (+step || 1);

      if (end == null) {
        end = start;
        start = 0;
      }
      // use `Array(length)` so engines like Chakra and V8 avoid slower modes
      // http://youtu.be/XAqIpGU8ZZk#t=17m25s
      var index = -1,
          length = nativeMax(0, ceil((end - start) / (step || 1))),
          result = Array(length);

      while (++index < length) {
        result[index] = start;
        start += step;
      }
      return result;
    }

    /**
     * Removes all elements from an array that the callback returns truey for
     * and returns an array of removed elements. The callback is bound to `thisArg`
     * and invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to modify.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of removed elements.
     * @example
     *
     * var array = [1, 2, 3, 4, 5, 6];
     * var evens = _.remove(array, function(num) { return num % 2 == 0; });
     *
     * console.log(array);
     * // => [1, 3, 5]
     *
     * console.log(evens);
     * // => [2, 4, 6]
     */
    function remove(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        var value = array[index];
        if (callback(value, index, array)) {
          result.push(value);
          splice.call(array, index--, 1);
          length--;
        }
      }
      return result;
    }

    /**
     * The opposite of `_.initial` this method gets all but the first element or
     * first `n` elements of an array. If a callback function is provided elements
     * at the beginning of the array are excluded from the result as long as the
     * callback returns truey. The callback is bound to `thisArg` and invoked
     * with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias drop, tail
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.rest([1, 2, 3]);
     * // => [2, 3]
     *
     * _.rest([1, 2, 3], 2);
     * // => [3]
     *
     * _.rest([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [3]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': true,  'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': false,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true, 'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.pluck(_.rest(characters, 'blocked'), 'name');
     * // => ['fred', 'pebbles']
     *
     * // using "_.where" callback shorthand
     * _.rest(characters, { 'employer': 'slate' });
     * // => [{ 'name': 'pebbles', 'blocked': true, 'employer': 'na' }]
     */
    function rest(array, callback, thisArg) {
      if (typeof callback != 'number' && callback != null) {
        var n = 0,
            index = -1,
            length = array ? array.length : 0;

        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : nativeMax(0, callback);
      }
      return slice(array, n);
    }

    /**
     * Uses a binary search to determine the smallest index at which a value
     * should be inserted into a given sorted array in order to maintain the sort
     * order of the array. If a callback is provided it will be executed for
     * `value` and each element of `array` to compute their sort ranking. The
     * callback is bound to `thisArg` and invoked with one argument; (value).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to inspect.
     * @param {*} value The value to evaluate.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index at which `value` should be inserted
     *  into `array`.
     * @example
     *
     * _.sortedIndex([20, 30, 50], 40);
     * // => 2
     *
     * // using "_.pluck" callback shorthand
     * _.sortedIndex([{ 'x': 20 }, { 'x': 30 }, { 'x': 50 }], { 'x': 40 }, 'x');
     * // => 2
     *
     * var dict = {
     *   'wordToNumber': { 'twenty': 20, 'thirty': 30, 'fourty': 40, 'fifty': 50 }
     * };
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return dict.wordToNumber[word];
     * });
     * // => 2
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return this.wordToNumber[word];
     * }, dict);
     * // => 2
     */
    function sortedIndex(array, value, callback, thisArg) {
      var low = 0,
          high = array ? array.length : low;

      // explicitly reference `identity` for better inlining in Firefox
      callback = callback ? lodash.createCallback(callback, thisArg, 1) : identity;
      value = callback(value);

      while (low < high) {
        var mid = (low + high) >>> 1;
        (callback(array[mid]) < value)
          ? low = mid + 1
          : high = mid;
      }
      return low;
    }

    /**
     * Creates an array of unique values, in order, of the provided arrays using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of combined values.
     * @example
     *
     * _.union([1, 2, 3], [5, 2, 1, 4], [2, 1]);
     * // => [1, 2, 3, 5, 4]
     */
    function union() {
      return baseUniq(baseFlatten(arguments, true, true));
    }

    /**
     * Creates a duplicate-value-free version of an array using strict equality
     * for comparisons, i.e. `===`. If the array is sorted, providing
     * `true` for `isSorted` will use a faster algorithm. If a callback is provided
     * each element of `array` is passed through the callback before uniqueness
     * is computed. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias unique
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {boolean} [isSorted=false] A flag to indicate that `array` is sorted.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a duplicate-value-free array.
     * @example
     *
     * _.uniq([1, 2, 1, 3, 1]);
     * // => [1, 2, 3]
     *
     * _.uniq([1, 1, 2, 2, 3], true);
     * // => [1, 2, 3]
     *
     * _.uniq(['A', 'b', 'C', 'a', 'B', 'c'], function(letter) { return letter.toLowerCase(); });
     * // => ['A', 'b', 'C']
     *
     * _.uniq([1, 2.5, 3, 1.5, 2, 3.5], function(num) { return this.floor(num); }, Math);
     * // => [1, 2.5, 3]
     *
     * // using "_.pluck" callback shorthand
     * _.uniq([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }, { 'x': 2 }]
     */
    function uniq(array, isSorted, callback, thisArg) {
      // juggle arguments
      if (typeof isSorted != 'boolean' && isSorted != null) {
        thisArg = callback;
        callback = (typeof isSorted != 'function' && thisArg && thisArg[isSorted] === array) ? null : isSorted;
        isSorted = false;
      }
      if (callback != null) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      return baseUniq(array, isSorted, callback);
    }

    /**
     * Creates an array excluding all provided values using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to filter.
     * @param {...*} [value] The values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
     * // => [2, 3, 4]
     */
    function without(array) {
      return baseDifference(array, slice(arguments, 1));
    }

    /**
     * Creates an array that is the symmetric difference of the provided arrays.
     * See http://en.wikipedia.org/wiki/Symmetric_difference.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of values.
     * @example
     *
     * _.xor([1, 2, 3], [5, 2, 1, 4]);
     * // => [3, 5, 4]
     *
     * _.xor([1, 2, 5], [2, 3, 5], [3, 4, 5]);
     * // => [1, 4, 5]
     */
    function xor() {
      var index = -1,
          length = arguments.length;

      while (++index < length) {
        var array = arguments[index];
        if (isArray(array) || isArguments(array)) {
          var result = result
            ? baseUniq(baseDifference(result, array).concat(baseDifference(array, result)))
            : array;
        }
      }
      return result || [];
    }

    /**
     * Creates an array of grouped elements, the first of which contains the first
     * elements of the given arrays, the second of which contains the second
     * elements of the given arrays, and so on.
     *
     * @static
     * @memberOf _
     * @alias unzip
     * @category Arrays
     * @param {...Array} [array] Arrays to process.
     * @returns {Array} Returns a new array of grouped elements.
     * @example
     *
     * _.zip(['fred', 'barney'], [30, 40], [true, false]);
     * // => [['fred', 30, true], ['barney', 40, false]]
     */
    function zip() {
      var array = arguments.length > 1 ? arguments : arguments[0],
          index = -1,
          length = array ? max(pluck(array, 'length')) : 0,
          result = Array(length < 0 ? 0 : length);

      while (++index < length) {
        result[index] = pluck(array, index);
      }
      return result;
    }

    /**
     * Creates an object composed from arrays of `keys` and `values`. Provide
     * either a single two dimensional array, i.e. `[[key1, value1], [key2, value2]]`
     * or two arrays, one of `keys` and one of corresponding `values`.
     *
     * @static
     * @memberOf _
     * @alias object
     * @category Arrays
     * @param {Array} keys The array of keys.
     * @param {Array} [values=[]] The array of values.
     * @returns {Object} Returns an object composed of the given keys and
     *  corresponding values.
     * @example
     *
     * _.zipObject(['fred', 'barney'], [30, 40]);
     * // => { 'fred': 30, 'barney': 40 }
     */
    function zipObject(keys, values) {
      var index = -1,
          length = keys ? keys.length : 0,
          result = {};

      if (!values && length && !isArray(keys[0])) {
        values = [];
      }
      while (++index < length) {
        var key = keys[index];
        if (values) {
          result[key] = values[index];
        } else if (key) {
          result[key[0]] = key[1];
        }
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function that executes `func`, with  the `this` binding and
     * arguments of the created function, only after being called `n` times.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {number} n The number of times the function must be called before
     *  `func` is executed.
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var saves = ['profile', 'settings'];
     *
     * var done = _.after(saves.length, function() {
     *   console.log('Done saving!');
     * });
     *
     * _.forEach(saves, function(type) {
     *   asyncSave({ 'type': type, 'complete': done });
     * });
     * // => logs 'Done saving!', after all saves have completed
     */
    function after(n, func) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      return function() {
        if (--n < 1) {
          return func.apply(this, arguments);
        }
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with the `this`
     * binding of `thisArg` and prepends any additional `bind` arguments to those
     * provided to the bound function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to bind.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var func = function(greeting) {
     *   return greeting + ' ' + this.name;
     * };
     *
     * func = _.bind(func, { 'name': 'fred' }, 'hi');
     * func();
     * // => 'hi fred'
     */
    function bind(func, thisArg) {
      return arguments.length > 2
        ? createWrapper(func, 17, slice(arguments, 2), null, thisArg)
        : createWrapper(func, 1, null, null, thisArg);
    }

    /**
     * Binds methods of an object to the object itself, overwriting the existing
     * method. Method names may be specified as individual arguments or as arrays
     * of method names. If no method names are provided all the function properties
     * of `object` will be bound.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object to bind and assign the bound methods to.
     * @param {...string} [methodName] The object method names to
     *  bind, specified as individual method names or arrays of method names.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var view = {
     *   'label': 'docs',
     *   'onClick': function() { console.log('clicked ' + this.label); }
     * };
     *
     * _.bindAll(view);
     * jQuery('#docs').on('click', view.onClick);
     * // => logs 'clicked docs', when the button is clicked
     */
    function bindAll(object) {
      var funcs = arguments.length > 1 ? baseFlatten(arguments, true, false, 1) : functions(object),
          index = -1,
          length = funcs.length;

      while (++index < length) {
        var key = funcs[index];
        object[key] = createWrapper(object[key], 1, null, null, object);
      }
      return object;
    }

    /**
     * Creates a function that, when called, invokes the method at `object[key]`
     * and prepends any additional `bindKey` arguments to those provided to the bound
     * function. This method differs from `_.bind` by allowing bound functions to
     * reference methods that will be redefined or don't yet exist.
     * See http://michaux.ca/articles/lazy-function-definition-pattern.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object the method belongs to.
     * @param {string} key The key of the method.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var object = {
     *   'name': 'fred',
     *   'greet': function(greeting) {
     *     return greeting + ' ' + this.name;
     *   }
     * };
     *
     * var func = _.bindKey(object, 'greet', 'hi');
     * func();
     * // => 'hi fred'
     *
     * object.greet = function(greeting) {
     *   return greeting + 'ya ' + this.name + '!';
     * };
     *
     * func();
     * // => 'hiya fred!'
     */
    function bindKey(object, key) {
      return arguments.length > 2
        ? createWrapper(key, 19, slice(arguments, 2), null, object)
        : createWrapper(key, 3, null, null, object);
    }

    /**
     * Creates a function that is the composition of the provided functions,
     * where each function consumes the return value of the function that follows.
     * For example, composing the functions `f()`, `g()`, and `h()` produces `f(g(h()))`.
     * Each function is executed with the `this` binding of the composed function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {...Function} [func] Functions to compose.
     * @returns {Function} Returns the new composed function.
     * @example
     *
     * var realNameMap = {
     *   'pebbles': 'penelope'
     * };
     *
     * var format = function(name) {
     *   name = realNameMap[name.toLowerCase()] || name;
     *   return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
     * };
     *
     * var greet = function(formatted) {
     *   return 'Hiya ' + formatted + '!';
     * };
     *
     * var welcome = _.compose(greet, format);
     * welcome('pebbles');
     * // => 'Hiya Penelope!'
     */
    function compose() {
      var funcs = arguments,
          length = funcs.length;

      while (length--) {
        if (!isFunction(funcs[length])) {
          throw new TypeError;
        }
      }
      return function() {
        var args = arguments,
            length = funcs.length;

        while (length--) {
          args = [funcs[length].apply(this, args)];
        }
        return args[0];
      };
    }

    /**
     * Creates a function which accepts one or more arguments of `func` that when
     * invoked either executes `func` returning its result, if all `func` arguments
     * have been provided, or returns a function that accepts one or more of the
     * remaining `func` arguments, and so on. The arity of `func` can be specified
     * if `func.length` is not sufficient.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to curry.
     * @param {number} [arity=func.length] The arity of `func`.
     * @returns {Function} Returns the new curried function.
     * @example
     *
     * var curried = _.curry(function(a, b, c) {
     *   console.log(a + b + c);
     * });
     *
     * curried(1)(2)(3);
     * // => 6
     *
     * curried(1, 2)(3);
     * // => 6
     *
     * curried(1, 2, 3);
     * // => 6
     */
    function curry(func, arity) {
      arity = typeof arity == 'number' ? arity : (+arity || func.length);
      return createWrapper(func, 4, null, null, null, arity);
    }

    /**
     * Creates a function that will delay the execution of `func` until after
     * `wait` milliseconds have elapsed since the last time it was invoked.
     * Provide an options object to indicate that `func` should be invoked on
     * the leading and/or trailing edge of the `wait` timeout. Subsequent calls
     * to the debounced function will return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true` `func` will be called
     * on the trailing edge of the timeout only if the the debounced function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to debounce.
     * @param {number} wait The number of milliseconds to delay.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=false] Specify execution on the leading edge of the timeout.
     * @param {number} [options.maxWait] The maximum time `func` is allowed to be delayed before it's called.
     * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * // avoid costly calculations while the window size is in flux
     * var lazyLayout = _.debounce(calculateLayout, 150);
     * jQuery(window).on('resize', lazyLayout);
     *
     * // execute `sendMail` when the click event is fired, debouncing subsequent calls
     * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
     *   'leading': true,
     *   'trailing': false
     * });
     *
     * // ensure `batchLog` is executed once after 1 second of debounced calls
     * var source = new EventSource('/stream');
     * source.addEventListener('message', _.debounce(batchLog, 250, {
     *   'maxWait': 1000
     * }, false);
     */
    function debounce(func, wait, options) {
      var args,
          maxTimeoutId,
          result,
          stamp,
          thisArg,
          timeoutId,
          trailingCall,
          lastCalled = 0,
          maxWait = false,
          trailing = true;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      wait = nativeMax(0, wait) || 0;
      if (options === true) {
        var leading = true;
        trailing = false;
      } else if (isObject(options)) {
        leading = options.leading;
        maxWait = 'maxWait' in options && (nativeMax(wait, options.maxWait) || 0);
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      var delayed = function() {
        var remaining = wait - (now() - stamp);
        if (remaining <= 0) {
          if (maxTimeoutId) {
            clearTimeout(maxTimeoutId);
          }
          var isCalled = trailingCall;
          maxTimeoutId = timeoutId = trailingCall = undefined;
          if (isCalled) {
            lastCalled = now();
            result = func.apply(thisArg, args);
            if (!timeoutId && !maxTimeoutId) {
              args = thisArg = null;
            }
          }
        } else {
          timeoutId = setTimeout(delayed, remaining);
        }
      };

      var maxDelayed = function() {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        maxTimeoutId = timeoutId = trailingCall = undefined;
        if (trailing || (maxWait !== wait)) {
          lastCalled = now();
          result = func.apply(thisArg, args);
          if (!timeoutId && !maxTimeoutId) {
            args = thisArg = null;
          }
        }
      };

      return function() {
        args = arguments;
        stamp = now();
        thisArg = this;
        trailingCall = trailing && (timeoutId || !leading);

        if (maxWait === false) {
          var leadingCall = leading && !timeoutId;
        } else {
          if (!maxTimeoutId && !leading) {
            lastCalled = stamp;
          }
          var remaining = maxWait - (stamp - lastCalled),
              isCalled = remaining <= 0;

          if (isCalled) {
            if (maxTimeoutId) {
              maxTimeoutId = clearTimeout(maxTimeoutId);
            }
            lastCalled = stamp;
            result = func.apply(thisArg, args);
          }
          else if (!maxTimeoutId) {
            maxTimeoutId = setTimeout(maxDelayed, remaining);
          }
        }
        if (isCalled && timeoutId) {
          timeoutId = clearTimeout(timeoutId);
        }
        else if (!timeoutId && wait !== maxWait) {
          timeoutId = setTimeout(delayed, wait);
        }
        if (leadingCall) {
          isCalled = true;
          result = func.apply(thisArg, args);
        }
        if (isCalled && !timeoutId && !maxTimeoutId) {
          args = thisArg = null;
        }
        return result;
      };
    }

    /**
     * Defers executing the `func` function until the current call stack has cleared.
     * Additional arguments will be provided to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to defer.
     * @param {...*} [arg] Arguments to invoke the function with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.defer(function(text) { console.log(text); }, 'deferred');
     * // logs 'deferred' after one or more milliseconds
     */
    function defer(func) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var args = slice(arguments, 1);
      return setTimeout(function() { func.apply(undefined, args); }, 1);
    }

    /**
     * Executes the `func` function after `wait` milliseconds. Additional arguments
     * will be provided to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to delay.
     * @param {number} wait The number of milliseconds to delay execution.
     * @param {...*} [arg] Arguments to invoke the function with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.delay(function(text) { console.log(text); }, 1000, 'later');
     * // => logs 'later' after one second
     */
    function delay(func, wait) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var args = slice(arguments, 2);
      return setTimeout(function() { func.apply(undefined, args); }, wait);
    }

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided it will be used to determine the cache key for storing the result
     * based on the arguments provided to the memoized function. By default, the
     * first argument provided to the memoized function is used as the cache key.
     * The `func` is executed with the `this` binding of the memoized function.
     * The result cache is exposed as the `cache` property on the memoized function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] A function used to resolve the cache key.
     * @returns {Function} Returns the new memoizing function.
     * @example
     *
     * var fibonacci = _.memoize(function(n) {
     *   return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
     * });
     *
     * fibonacci(9)
     * // => 34
     *
     * var data = {
     *   'fred': { 'name': 'fred', 'age': 40 },
     *   'pebbles': { 'name': 'pebbles', 'age': 1 }
     * };
     *
     * // modifying the result cache
     * var get = _.memoize(function(name) { return data[name]; }, _.identity);
     * get('pebbles');
     * // => { 'name': 'pebbles', 'age': 1 }
     *
     * get.cache.pebbles.name = 'penelope';
     * get('pebbles');
     * // => { 'name': 'penelope', 'age': 1 }
     */
    function memoize(func, resolver) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var memoized = function() {
        var cache = memoized.cache,
            key = resolver ? resolver.apply(this, arguments) : keyPrefix + arguments[0];

        return hasOwnProperty.call(cache, key)
          ? cache[key]
          : (cache[key] = func.apply(this, arguments));
      }
      memoized.cache = {};
      return memoized;
    }

    /**
     * Creates a function that is restricted to execute `func` once. Repeat calls to
     * the function will return the value of the first call. The `func` is executed
     * with the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var initialize = _.once(createApplication);
     * initialize();
     * initialize();
     * // `initialize` executes `createApplication` once
     */
    function once(func) {
      var ran,
          result;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      return function() {
        if (ran) {
          return result;
        }
        ran = true;
        result = func.apply(this, arguments);

        // clear the `func` variable so the function may be garbage collected
        func = null;
        return result;
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with any additional
     * `partial` arguments prepended to those provided to the new function. This
     * method is similar to `_.bind` except it does **not** alter the `this` binding.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var greet = function(greeting, name) { return greeting + ' ' + name; };
     * var hi = _.partial(greet, 'hi');
     * hi('fred');
     * // => 'hi fred'
     */
    function partial(func) {
      return createWrapper(func, 16, slice(arguments, 1));
    }

    /**
     * This method is like `_.partial` except that `partial` arguments are
     * appended to those provided to the new function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var defaultsDeep = _.partialRight(_.merge, _.defaults);
     *
     * var options = {
     *   'variable': 'data',
     *   'imports': { 'jq': $ }
     * };
     *
     * defaultsDeep(options, _.templateSettings);
     *
     * options.variable
     * // => 'data'
     *
     * options.imports
     * // => { '_': _, 'jq': $ }
     */
    function partialRight(func) {
      return createWrapper(func, 32, null, slice(arguments, 1));
    }

    /**
     * Creates a function that, when executed, will only call the `func` function
     * at most once per every `wait` milliseconds. Provide an options object to
     * indicate that `func` should be invoked on the leading and/or trailing edge
     * of the `wait` timeout. Subsequent calls to the throttled function will
     * return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true` `func` will be called
     * on the trailing edge of the timeout only if the the throttled function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to throttle.
     * @param {number} wait The number of milliseconds to throttle executions to.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=true] Specify execution on the leading edge of the timeout.
     * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new throttled function.
     * @example
     *
     * // avoid excessively updating the position while scrolling
     * var throttled = _.throttle(updatePosition, 100);
     * jQuery(window).on('scroll', throttled);
     *
     * // execute `renewToken` when the click event is fired, but not more than once every 5 minutes
     * jQuery('.interactive').on('click', _.throttle(renewToken, 300000, {
     *   'trailing': false
     * }));
     */
    function throttle(func, wait, options) {
      var leading = true,
          trailing = true;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      if (options === false) {
        leading = false;
      } else if (isObject(options)) {
        leading = 'leading' in options ? options.leading : leading;
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      debounceOptions.leading = leading;
      debounceOptions.maxWait = wait;
      debounceOptions.trailing = trailing;

      return debounce(func, wait, debounceOptions);
    }

    /**
     * Creates a function that provides `value` to the wrapper function as its
     * first argument. Additional arguments provided to the function are appended
     * to those provided to the wrapper function. The wrapper is executed with
     * the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {*} value The value to wrap.
     * @param {Function} wrapper The wrapper function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var p = _.wrap(_.escape, function(func, text) {
     *   return '<p>' + func(text) + '</p>';
     * });
     *
     * p('Fred, Wilma, & Pebbles');
     * // => '<p>Fred, Wilma, &amp; Pebbles</p>'
     */
    function wrap(value, wrapper) {
      return createWrapper(wrapper, 16, [value]);
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function that returns `value`.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} value The value to return from the new function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var object = { 'name': 'fred' };
     * var getter = _.constant(object);
     * getter() === object;
     * // => true
     */
    function constant(value) {
      return function() {
        return value;
      };
    }

    /**
     * Produces a callback bound to an optional `thisArg`. If `func` is a property
     * name the created callback will return the property value for a given element.
     * If `func` is an object the created callback will return `true` for elements
     * that contain the equivalent object properties, otherwise it will return `false`.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} [func=identity] The value to convert to a callback.
     * @param {*} [thisArg] The `this` binding of the created callback.
     * @param {number} [argCount] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // wrap to create custom callback shorthands
     * _.createCallback = _.wrap(_.createCallback, function(func, callback, thisArg) {
     *   var match = /^(.+?)__([gl]t)(.+)$/.exec(callback);
     *   return !match ? func(callback, thisArg) : function(object) {
     *     return match[2] == 'gt' ? object[match[1]] > match[3] : object[match[1]] < match[3];
     *   };
     * });
     *
     * _.filter(characters, 'age__gt38');
     * // => [{ 'name': 'fred', 'age': 40 }]
     */
    function createCallback(func, thisArg, argCount) {
      var type = typeof func;
      if (func == null || type == 'function') {
        return baseCreateCallback(func, thisArg, argCount);
      }
      // handle "_.pluck" style callback shorthands
      if (type != 'object') {
        return property(func);
      }
      var props = keys(func),
          key = props[0],
          a = func[key];

      // handle "_.where" style callback shorthands
      if (props.length == 1 && a === a && !isObject(a)) {
        // fast path the common case of providing an object with a single
        // property containing a primitive value
        return function(object) {
          var b = object[key];
          return a === b && (a !== 0 || (1 / a == 1 / b));
        };
      }
      return function(object) {
        var length = props.length,
            result = false;

        while (length--) {
          if (!(result = baseIsEqual(object[props[length]], func[props[length]], null, true))) {
            break;
          }
        }
        return result;
      };
    }

    /**
     * Converts the characters `&`, `<`, `>`, `"`, and `'` in `string` to their
     * corresponding HTML entities.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} string The string to escape.
     * @returns {string} Returns the escaped string.
     * @example
     *
     * _.escape('Fred, Wilma, & Pebbles');
     * // => 'Fred, Wilma, &amp; Pebbles'
     */
    function escape(string) {
      return string == null ? '' : String(string).replace(reUnescapedHtml, escapeHtmlChar);
    }

    /**
     * This method returns the first argument provided to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} value Any value.
     * @returns {*} Returns `value`.
     * @example
     *
     * var object = { 'name': 'fred' };
     * _.identity(object) === object;
     * // => true
     */
    function identity(value) {
      return value;
    }

    /**
     * Adds function properties of a source object to the destination object.
     * If `object` is a function methods will be added to its prototype as well.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Function|Object} [object=lodash] object The destination object.
     * @param {Object} source The object of functions to add.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.chain=true] Specify whether the functions added are chainable.
     * @example
     *
     * function capitalize(string) {
     *   return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
     * }
     *
     * _.mixin({ 'capitalize': capitalize });
     * _.capitalize('fred');
     * // => 'Fred'
     *
     * _('fred').capitalize().value();
     * // => 'Fred'
     *
     * _.mixin({ 'capitalize': capitalize }, { 'chain': false });
     * _('fred').capitalize();
     * // => 'Fred'
     */
    function mixin(object, source, options) {
      var chain = true,
          methodNames = source && functions(source);

      if (!source || (!options && !methodNames.length)) {
        if (options == null) {
          options = source;
        }
        ctor = lodashWrapper;
        source = object;
        object = lodash;
        methodNames = functions(source);
      }
      if (options === false) {
        chain = false;
      } else if (isObject(options) && 'chain' in options) {
        chain = options.chain;
      }
      var ctor = object,
          isFunc = isFunction(ctor);

      forEach(methodNames, function(methodName) {
        var func = object[methodName] = source[methodName];
        if (isFunc) {
          ctor.prototype[methodName] = function() {
            var chainAll = this.__chain__,
                value = this.__wrapped__,
                args = [value];

            push.apply(args, arguments);
            var result = func.apply(object, args);
            if (chain || chainAll) {
              if (value === result && isObject(result)) {
                return this;
              }
              result = new ctor(result);
              result.__chain__ = chainAll;
            }
            return result;
          };
        }
      });
    }

    /**
     * Reverts the '_' variable to its previous value and returns a reference to
     * the `lodash` function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @returns {Function} Returns the `lodash` function.
     * @example
     *
     * var lodash = _.noConflict();
     */
    function noConflict() {
      context._ = oldDash;
      return this;
    }

    /**
     * A no-operation function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @example
     *
     * var object = { 'name': 'fred' };
     * _.noop(object) === undefined;
     * // => true
     */
    function noop() {
      // no operation performed
    }

    /**
     * Gets the number of milliseconds that have elapsed since the Unix epoch
     * (1 January 1970 00:00:00 UTC).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @example
     *
     * var stamp = _.now();
     * _.defer(function() { console.log(_.now() - stamp); });
     * // => logs the number of milliseconds it took for the deferred function to be called
     */
    var now = isNative(now = Date.now) && now || function() {
      return new Date().getTime();
    };

    /**
     * Converts the given value into an integer of the specified radix.
     * If `radix` is `undefined` or `0` a `radix` of `10` is used unless the
     * `value` is a hexadecimal, in which case a `radix` of `16` is used.
     *
     * Note: This method avoids differences in native ES3 and ES5 `parseInt`
     * implementations. See http://es5.github.io/#E.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} value The value to parse.
     * @param {number} [radix] The radix used to interpret the value to parse.
     * @returns {number} Returns the new integer value.
     * @example
     *
     * _.parseInt('08');
     * // => 8
     */
    var parseInt = nativeParseInt(whitespace + '08') == 8 ? nativeParseInt : function(value, radix) {
      // Firefox < 21 and Opera < 15 follow the ES3 specified implementation of `parseInt`
      return nativeParseInt(isString(value) ? value.replace(reLeadingSpacesAndZeros, '') : value, radix || 0);
    };

    /**
     * Creates a "_.pluck" style function, which returns the `key` value of a
     * given object.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} key The name of the property to retrieve.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var characters = [
     *   { 'name': 'fred',   'age': 40 },
     *   { 'name': 'barney', 'age': 36 }
     * ];
     *
     * var getName = _.property('name');
     *
     * _.map(characters, getName);
     * // => ['barney', 'fred']
     *
     * _.sortBy(characters, getName);
     * // => [{ 'name': 'barney', 'age': 36 }, { 'name': 'fred',   'age': 40 }]
     */
    function property(key) {
      return function(object) {
        return object[key];
      };
    }

    /**
     * Produces a random number between `min` and `max` (inclusive). If only one
     * argument is provided a number between `0` and the given number will be
     * returned. If `floating` is truey or either `min` or `max` are floats a
     * floating-point number will be returned instead of an integer.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {number} [min=0] The minimum possible value.
     * @param {number} [max=1] The maximum possible value.
     * @param {boolean} [floating=false] Specify returning a floating-point number.
     * @returns {number} Returns a random number.
     * @example
     *
     * _.random(0, 5);
     * // => an integer between 0 and 5
     *
     * _.random(5);
     * // => also an integer between 0 and 5
     *
     * _.random(5, true);
     * // => a floating-point number between 0 and 5
     *
     * _.random(1.2, 5.2);
     * // => a floating-point number between 1.2 and 5.2
     */
    function random(min, max, floating) {
      var noMin = min == null,
          noMax = max == null;

      if (floating == null) {
        if (typeof min == 'boolean' && noMax) {
          floating = min;
          min = 1;
        }
        else if (!noMax && typeof max == 'boolean') {
          floating = max;
          noMax = true;
        }
      }
      if (noMin && noMax) {
        max = 1;
      }
      min = +min || 0;
      if (noMax) {
        max = min;
        min = 0;
      } else {
        max = +max || 0;
      }
      if (floating || min % 1 || max % 1) {
        var rand = nativeRandom();
        return nativeMin(min + (rand * (max - min + parseFloat('1e-' + ((rand +'').length - 1)))), max);
      }
      return baseRandom(min, max);
    }

    /**
     * Resolves the value of property `key` on `object`. If `key` is a function
     * it will be invoked with the `this` binding of `object` and its result returned,
     * else the property value is returned. If `object` is falsey then `undefined`
     * is returned.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Object} object The object to inspect.
     * @param {string} key The name of the property to resolve.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = {
     *   'cheese': 'crumpets',
     *   'stuff': function() {
     *     return 'nonsense';
     *   }
     * };
     *
     * _.result(object, 'cheese');
     * // => 'crumpets'
     *
     * _.result(object, 'stuff');
     * // => 'nonsense'
     */
    function result(object, key) {
      if (object) {
        var value = object[key];
        return isFunction(value) ? object[key]() : value;
      }
    }

    /**
     * A micro-templating method that handles arbitrary delimiters, preserves
     * whitespace, and correctly escapes quotes within interpolated code.
     *
     * Note: In the development build, `_.template` utilizes sourceURLs for easier
     * debugging. See http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
     *
     * For more information on precompiling templates see:
     * http://lodash.com/custom-builds
     *
     * For more information on Chrome extension sandboxes see:
     * http://developer.chrome.com/stable/extensions/sandboxingEval.html
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} text The template text.
     * @param {Object} data The data object used to populate the text.
     * @param {Object} [options] The options object.
     * @param {RegExp} [options.escape] The "escape" delimiter.
     * @param {RegExp} [options.evaluate] The "evaluate" delimiter.
     * @param {Object} [options.imports] An object to import into the template as local variables.
     * @param {RegExp} [options.interpolate] The "interpolate" delimiter.
     * @param {string} [sourceURL] The sourceURL of the template's compiled source.
     * @param {string} [variable] The data object variable name.
     * @returns {Function|string} Returns a compiled function when no `data` object
     *  is given, else it returns the interpolated text.
     * @example
     *
     * // using the "interpolate" delimiter to create a compiled template
     * var compiled = _.template('hello <%= name %>');
     * compiled({ 'name': 'fred' });
     * // => 'hello fred'
     *
     * // using the "escape" delimiter to escape HTML in data property values
     * _.template('<b><%- value %></b>', { 'value': '<script>' });
     * // => '<b>&lt;script&gt;</b>'
     *
     * // using the "evaluate" delimiter to generate HTML
     * var list = '<% _.forEach(people, function(name) { %><li><%- name %></li><% }); %>';
     * _.template(list, { 'people': ['fred', 'barney'] });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // using the ES6 delimiter as an alternative to the default "interpolate" delimiter
     * _.template('hello ${ name }', { 'name': 'pebbles' });
     * // => 'hello pebbles'
     *
     * // using the internal `print` function in "evaluate" delimiters
     * _.template('<% print("hello " + name); %>!', { 'name': 'barney' });
     * // => 'hello barney!'
     *
     * // using a custom template delimiters
     * _.templateSettings = {
     *   'interpolate': /{{([\s\S]+?)}}/g
     * };
     *
     * _.template('hello {{ name }}!', { 'name': 'mustache' });
     * // => 'hello mustache!'
     *
     * // using the `imports` option to import jQuery
     * var list = '<% jq.each(people, function(name) { %><li><%- name %></li><% }); %>';
     * _.template(list, { 'people': ['fred', 'barney'] }, { 'imports': { 'jq': jQuery } });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // using the `sourceURL` option to specify a custom sourceURL for the template
     * var compiled = _.template('hello <%= name %>', null, { 'sourceURL': '/basic/greeting.jst' });
     * compiled(data);
     * // => find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector
     *
     * // using the `variable` option to ensure a with-statement isn't used in the compiled template
     * var compiled = _.template('hi <%= data.name %>!', null, { 'variable': 'data' });
     * compiled.source;
     * // => function(data) {
     *   var __t, __p = '', __e = _.escape;
     *   __p += 'hi ' + ((__t = ( data.name )) == null ? '' : __t) + '!';
     *   return __p;
     * }
     *
     * // using the `source` property to inline compiled templates for meaningful
     * // line numbers in error messages and a stack trace
     * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
     *   var JST = {\
     *     "main": ' + _.template(mainText).source + '\
     *   };\
     * ');
     */
    function template(text, data, options) {
      // based on John Resig's `tmpl` implementation
      // http://ejohn.org/blog/javascript-micro-templating/
      // and Laura Doktorova's doT.js
      // https://github.com/olado/doT
      var settings = lodash.templateSettings;
      text = String(text || '');

      // avoid missing dependencies when `iteratorTemplate` is not defined
      options = defaults({}, options, settings);

      var imports = defaults({}, options.imports, settings.imports),
          importsKeys = keys(imports),
          importsValues = values(imports);

      var isEvaluating,
          index = 0,
          interpolate = options.interpolate || reNoMatch,
          source = "__p += '";

      // compile the regexp to match each delimiter
      var reDelimiters = RegExp(
        (options.escape || reNoMatch).source + '|' +
        interpolate.source + '|' +
        (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
        (options.evaluate || reNoMatch).source + '|$'
      , 'g');

      text.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
        interpolateValue || (interpolateValue = esTemplateValue);

        // escape characters that cannot be included in string literals
        source += text.slice(index, offset).replace(reUnescapedString, escapeStringChar);

        // replace delimiters with snippets
        if (escapeValue) {
          source += "' +\n__e(" + escapeValue + ") +\n'";
        }
        if (evaluateValue) {
          isEvaluating = true;
          source += "';\n" + evaluateValue + ";\n__p += '";
        }
        if (interpolateValue) {
          source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
        }
        index = offset + match.length;

        // the JS engine embedded in Adobe products requires returning the `match`
        // string in order to produce the correct `offset` value
        return match;
      });

      source += "';\n";

      // if `variable` is not specified, wrap a with-statement around the generated
      // code to add the data object to the top of the scope chain
      var variable = options.variable,
          hasVariable = variable;

      if (!hasVariable) {
        variable = 'obj';
        source = 'with (' + variable + ') {\n' + source + '\n}\n';
      }
      // cleanup code by stripping empty strings
      source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
        .replace(reEmptyStringMiddle, '$1')
        .replace(reEmptyStringTrailing, '$1;');

      // frame code as the function body
      source = 'function(' + variable + ') {\n' +
        (hasVariable ? '' : variable + ' || (' + variable + ' = {});\n') +
        "var __t, __p = '', __e = _.escape" +
        (isEvaluating
          ? ', __j = Array.prototype.join;\n' +
            "function print() { __p += __j.call(arguments, '') }\n"
          : ';\n'
        ) +
        source +
        'return __p\n}';

      // Use a sourceURL for easier debugging.
      // http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
      var sourceURL = '\n/*\n//# sourceURL=' + (options.sourceURL || '/lodash/template/source[' + (templateCounter++) + ']') + '\n*/';

      try {
        var result = Function(importsKeys, 'return ' + source + sourceURL).apply(undefined, importsValues);
      } catch(e) {
        e.source = source;
        throw e;
      }
      if (data) {
        return result(data);
      }
      // provide the compiled function's source by its `toString` method, in
      // supported environments, or the `source` property as a convenience for
      // inlining compiled templates during the build process
      result.source = source;
      return result;
    }

    /**
     * Executes the callback `n` times, returning an array of the results
     * of each callback execution. The callback is bound to `thisArg` and invoked
     * with one argument; (index).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {number} n The number of times to execute the callback.
     * @param {Function} callback The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns an array of the results of each `callback` execution.
     * @example
     *
     * var diceRolls = _.times(3, _.partial(_.random, 1, 6));
     * // => [3, 6, 4]
     *
     * _.times(3, function(n) { mage.castSpell(n); });
     * // => calls `mage.castSpell(n)` three times, passing `n` of `0`, `1`, and `2` respectively
     *
     * _.times(3, function(n) { this.cast(n); }, mage);
     * // => also calls `mage.castSpell(n)` three times
     */
    function times(n, callback, thisArg) {
      n = (n = +n) > -1 ? n : 0;
      var index = -1,
          result = Array(n);

      callback = baseCreateCallback(callback, thisArg, 1);
      while (++index < n) {
        result[index] = callback(index);
      }
      return result;
    }

    /**
     * The inverse of `_.escape` this method converts the HTML entities
     * `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#39;` in `string` to their
     * corresponding characters.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} string The string to unescape.
     * @returns {string} Returns the unescaped string.
     * @example
     *
     * _.unescape('Fred, Barney &amp; Pebbles');
     * // => 'Fred, Barney & Pebbles'
     */
    function unescape(string) {
      return string == null ? '' : String(string).replace(reEscapedHtml, unescapeHtmlChar);
    }

    /**
     * Generates a unique ID. If `prefix` is provided the ID will be appended to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} [prefix] The value to prefix the ID with.
     * @returns {string} Returns the unique ID.
     * @example
     *
     * _.uniqueId('contact_');
     * // => 'contact_104'
     *
     * _.uniqueId();
     * // => '105'
     */
    function uniqueId(prefix) {
      var id = ++idCounter;
      return String(prefix == null ? '' : prefix) + id;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object that wraps the given value with explicit
     * method chaining enabled.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {*} value The value to wrap.
     * @returns {Object} Returns the wrapper object.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36 },
     *   { 'name': 'fred',    'age': 40 },
     *   { 'name': 'pebbles', 'age': 1 }
     * ];
     *
     * var youngest = _.chain(characters)
     *     .sortBy('age')
     *     .map(function(chr) { return chr.name + ' is ' + chr.age; })
     *     .first()
     *     .value();
     * // => 'pebbles is 1'
     */
    function chain(value) {
      value = new lodashWrapper(value);
      value.__chain__ = true;
      return value;
    }

    /**
     * Invokes `interceptor` with the `value` as the first argument and then
     * returns `value`. The purpose of this method is to "tap into" a method
     * chain in order to perform operations on intermediate results within
     * the chain.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {*} value The value to provide to `interceptor`.
     * @param {Function} interceptor The function to invoke.
     * @returns {*} Returns `value`.
     * @example
     *
     * _([1, 2, 3, 4])
     *  .tap(function(array) { array.pop(); })
     *  .reverse()
     *  .value();
     * // => [3, 2, 1]
     */
    function tap(value, interceptor) {
      interceptor(value);
      return value;
    }

    /**
     * Enables explicit method chaining on the wrapper object.
     *
     * @name chain
     * @memberOf _
     * @category Chaining
     * @returns {*} Returns the wrapper object.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // without explicit chaining
     * _(characters).first();
     * // => { 'name': 'barney', 'age': 36 }
     *
     * // with explicit chaining
     * _(characters).chain()
     *   .first()
     *   .pick('age')
     *   .value();
     * // => { 'age': 36 }
     */
    function wrapperChain() {
      this.__chain__ = true;
      return this;
    }

    /**
     * Produces the `toString` result of the wrapped value.
     *
     * @name toString
     * @memberOf _
     * @category Chaining
     * @returns {string} Returns the string result.
     * @example
     *
     * _([1, 2, 3]).toString();
     * // => '1,2,3'
     */
    function wrapperToString() {
      return String(this.__wrapped__);
    }

    /**
     * Extracts the wrapped value.
     *
     * @name valueOf
     * @memberOf _
     * @alias value
     * @category Chaining
     * @returns {*} Returns the wrapped value.
     * @example
     *
     * _([1, 2, 3]).valueOf();
     * // => [1, 2, 3]
     */
    function wrapperValueOf() {
      return this.__wrapped__;
    }

    /*--------------------------------------------------------------------------*/

    // add functions that return wrapped values when chaining
    lodash.after = after;
    lodash.assign = assign;
    lodash.at = at;
    lodash.bind = bind;
    lodash.bindAll = bindAll;
    lodash.bindKey = bindKey;
    lodash.chain = chain;
    lodash.compact = compact;
    lodash.compose = compose;
    lodash.constant = constant;
    lodash.countBy = countBy;
    lodash.create = create;
    lodash.createCallback = createCallback;
    lodash.curry = curry;
    lodash.debounce = debounce;
    lodash.defaults = defaults;
    lodash.defer = defer;
    lodash.delay = delay;
    lodash.difference = difference;
    lodash.filter = filter;
    lodash.flatten = flatten;
    lodash.forEach = forEach;
    lodash.forEachRight = forEachRight;
    lodash.forIn = forIn;
    lodash.forInRight = forInRight;
    lodash.forOwn = forOwn;
    lodash.forOwnRight = forOwnRight;
    lodash.functions = functions;
    lodash.groupBy = groupBy;
    lodash.indexBy = indexBy;
    lodash.initial = initial;
    lodash.intersection = intersection;
    lodash.invert = invert;
    lodash.invoke = invoke;
    lodash.keys = keys;
    lodash.map = map;
    lodash.mapValues = mapValues;
    lodash.max = max;
    lodash.memoize = memoize;
    lodash.merge = merge;
    lodash.min = min;
    lodash.omit = omit;
    lodash.once = once;
    lodash.pairs = pairs;
    lodash.partial = partial;
    lodash.partialRight = partialRight;
    lodash.pick = pick;
    lodash.pluck = pluck;
    lodash.property = property;
    lodash.pull = pull;
    lodash.range = range;
    lodash.reject = reject;
    lodash.remove = remove;
    lodash.rest = rest;
    lodash.shuffle = shuffle;
    lodash.sortBy = sortBy;
    lodash.tap = tap;
    lodash.throttle = throttle;
    lodash.times = times;
    lodash.toArray = toArray;
    lodash.transform = transform;
    lodash.union = union;
    lodash.uniq = uniq;
    lodash.values = values;
    lodash.where = where;
    lodash.without = without;
    lodash.wrap = wrap;
    lodash.xor = xor;
    lodash.zip = zip;
    lodash.zipObject = zipObject;

    // add aliases
    lodash.collect = map;
    lodash.drop = rest;
    lodash.each = forEach;
    lodash.eachRight = forEachRight;
    lodash.extend = assign;
    lodash.methods = functions;
    lodash.object = zipObject;
    lodash.select = filter;
    lodash.tail = rest;
    lodash.unique = uniq;
    lodash.unzip = zip;

    // add functions to `lodash.prototype`
    mixin(lodash);

    /*--------------------------------------------------------------------------*/

    // add functions that return unwrapped values when chaining
    lodash.clone = clone;
    lodash.cloneDeep = cloneDeep;
    lodash.contains = contains;
    lodash.escape = escape;
    lodash.every = every;
    lodash.find = find;
    lodash.findIndex = findIndex;
    lodash.findKey = findKey;
    lodash.findLast = findLast;
    lodash.findLastIndex = findLastIndex;
    lodash.findLastKey = findLastKey;
    lodash.has = has;
    lodash.identity = identity;
    lodash.indexOf = indexOf;
    lodash.isArguments = isArguments;
    lodash.isArray = isArray;
    lodash.isBoolean = isBoolean;
    lodash.isDate = isDate;
    lodash.isElement = isElement;
    lodash.isEmpty = isEmpty;
    lodash.isEqual = isEqual;
    lodash.isFinite = isFinite;
    lodash.isFunction = isFunction;
    lodash.isNaN = isNaN;
    lodash.isNull = isNull;
    lodash.isNumber = isNumber;
    lodash.isObject = isObject;
    lodash.isPlainObject = isPlainObject;
    lodash.isRegExp = isRegExp;
    lodash.isString = isString;
    lodash.isUndefined = isUndefined;
    lodash.lastIndexOf = lastIndexOf;
    lodash.mixin = mixin;
    lodash.noConflict = noConflict;
    lodash.noop = noop;
    lodash.now = now;
    lodash.parseInt = parseInt;
    lodash.random = random;
    lodash.reduce = reduce;
    lodash.reduceRight = reduceRight;
    lodash.result = result;
    lodash.runInContext = runInContext;
    lodash.size = size;
    lodash.some = some;
    lodash.sortedIndex = sortedIndex;
    lodash.template = template;
    lodash.unescape = unescape;
    lodash.uniqueId = uniqueId;

    // add aliases
    lodash.all = every;
    lodash.any = some;
    lodash.detect = find;
    lodash.findWhere = find;
    lodash.foldl = reduce;
    lodash.foldr = reduceRight;
    lodash.include = contains;
    lodash.inject = reduce;

    mixin(function() {
      var source = {}
      forOwn(lodash, function(func, methodName) {
        if (!lodash.prototype[methodName]) {
          source[methodName] = func;
        }
      });
      return source;
    }(), false);

    /*--------------------------------------------------------------------------*/

    // add functions capable of returning wrapped and unwrapped values when chaining
    lodash.first = first;
    lodash.last = last;
    lodash.sample = sample;

    // add aliases
    lodash.take = first;
    lodash.head = first;

    forOwn(lodash, function(func, methodName) {
      var callbackable = methodName !== 'sample';
      if (!lodash.prototype[methodName]) {
        lodash.prototype[methodName]= function(n, guard) {
          var chainAll = this.__chain__,
              result = func(this.__wrapped__, n, guard);

          return !chainAll && (n == null || (guard && !(callbackable && typeof n == 'function')))
            ? result
            : new lodashWrapper(result, chainAll);
        };
      }
    });

    /*--------------------------------------------------------------------------*/

    /**
     * The semantic version number.
     *
     * @static
     * @memberOf _
     * @type string
     */
    lodash.VERSION = '2.4.1';

    // add "Chaining" functions to the wrapper
    lodash.prototype.chain = wrapperChain;
    lodash.prototype.toString = wrapperToString;
    lodash.prototype.value = wrapperValueOf;
    lodash.prototype.valueOf = wrapperValueOf;

    // add `Array` functions that return unwrapped values
    forEach(['join', 'pop', 'shift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        var chainAll = this.__chain__,
            result = func.apply(this.__wrapped__, arguments);

        return chainAll
          ? new lodashWrapper(result, chainAll)
          : result;
      };
    });

    // add `Array` functions that return the existing wrapped value
    forEach(['push', 'reverse', 'sort', 'unshift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        func.apply(this.__wrapped__, arguments);
        return this;
      };
    });

    // add `Array` functions that return new wrapped values
    forEach(['concat', 'slice', 'splice'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        return new lodashWrapper(func.apply(this.__wrapped__, arguments), this.__chain__);
      };
    });

    return lodash;
  }

  /*--------------------------------------------------------------------------*/

  // expose Lo-Dash
  var _ = runInContext();

  // some AMD build optimizers like r.js check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lo-Dash to the global object even when an AMD loader is present in
    // case Lo-Dash is loaded with a RequireJS shim config.
    // See http://requirejs.org/docs/api.html#config-shim
    root._ = _;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define(function() {
      return _;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports && freeModule) {
    // in Node.js or RingoJS
    if (moduleExports) {
      (freeModule.exports = _)._ = _;
    }
    // in Narwhal or Rhino -require
    else {
      freeExports._ = _;
    }
  }
  else {
    // in a browser or Rhino
    root._ = _;
  }
}.call(this));

/*
 * =============================================================
 * elliptical.utils
 * =============================================================
 *
 * utils + lodash
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('lodash'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['lodash'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical=root.elliptical || {};
        root.elliptical.utils = factory(_);
        root.returnExports = root.elliptical.utils;
    }
}(this, function (_) {
    return {
        /* assign lodash to elliptical.utils._ */
        _:_,


        /**
         * Turns any object in an array.
         * @param array {Array}
         * @param results {Array} optional
         * @returns {Array} a new array or results
         */
        makeArray: function(array, results)
        {
            var ret = results || [];

            if (array != null)
            {
                var type = typeof array;
                if (array.length == null || type === "string" || type === "function"
                    || type === "regexp")
                {
                    ret.push(array);
                } else
                {
                    _.merge(ret, array);
                }
            }

            return ret;
        },

        concatArgs: function(arr, args){
            return this.makeArray(arr).concat(this.makeArray(args));
        },

        mergeArrays: function (array) {
            var a = array.concat();
            for (var i = 0; i < a.length; ++i) {
                for (var j = i + 1; j < a.length; ++j) {
                    if (a[i] === a[j])
                        a.splice(j--, 1);
                }
            }

            return a;
        },

        cloneArray:function(arr){
            return arr.slice(0);
        },

        extend: function()
        {
            // copy reference to target object
            var target = arguments[0] ||
            {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;

            // Handle a deep copy situation
            if (typeof target === "boolean")
            {
                deep = target;
                target = arguments[1] ||
                {};
                // skip the boolean and the target
                i = 2;
            }

            // Handle case when target is a string or something (possible in deep copy)
            if (typeof target !== "object" && !typeof target === 'function')
            {
                target =
                {};
            }

            for (; i < length; i++)
            {
                // Only deal with non-null/undefined values
                if ((options = arguments[i]) !== null)
                {
                    // Extend the base object
                    for (name in options)
                    {
                        src = target[name];
                        copy = options[name];

                        // Prevent never-ending loop
                        if (target === copy)
                        {
                            continue;
                        }

                        // Recurse if we're merging object literal values or arrays
                        if (deep && copy && (isPlainObject(copy) || isArray(copy)))
                        {
                            var clone = src && (isPlainObject(src) || isArray(src)) ? src
                                : isArray(copy) ? [] :
                            {};

                            // Never move original objects, clone them
                            target[name] = extend(deep, clone, copy);

                            // Don't bring in undefined values
                        } else if (typeof copy !== "undefined")
                        {
                            target[name] = copy;
                        }
                    }
                }
            }

            // Return the modified object
            return target;
        },

        /**
         * monkey patch browsers(IE) that do not support Function.name
         *
         */
        patchFunctionName:function(){
            if (Function.prototype.name === undefined && Object.defineProperty !== undefined) {
                Object.defineProperty(Function.prototype, 'name', {
                    get: function() {
                        var funcNameRegex = /function\s([^(]{1,})\(/;
                        var results = (funcNameRegex).exec((this).toString());
                        return (results && results.length > 1) ? results[1].trim() : "";
                    },
                    set: function(value) {}
                });
            }
        },



        /**
         * remove of an array of items from an array
         * @param arr1 {Array}
         * @param arr2 {Array}
         * @returns {Array}
         */
        removeFromArray: function (arr1, arr2) {

            for (var i = 0; i < arr1.length; i++) {
                if (this.inArray(arr2, arr1[i])) {
                    arr1.splice(i, 1);
                }
            }

            return arr1;
        },

        /**
         * empty an array
         * @param arr {Array}
         */
        emptyArray:function(arr){
            arr.splice(0,arr.length);
        },


        isValidArrayIndex: function(val){
            return /^[0-9]+$/.test(String(val));
        },



        /**
         * generate a guid string
         * @returns {string}
         */
        guid: function () {
            var S4 = function () {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            };
            return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
        },

        /**
         * generate a random string of length
         * @param length
         * @returns {string}
         */
        randomString: function (length) {
            var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            var result = '';
            for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
            return result;
        },

        /**
         * generate a random id string of 16 numbers
         * @returns {string}
         */
        idString: function () {
            var length=16;
            var chars = '0123456789';
            var result = '';
            for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
            return result;
        },

        /**
         * returns an empty guid string
         * @returns {string}
         */
        emptyGuid: function(){
            return '00000000-0000-0000-0000-000000000000';
        },

        isEmptyGuid:function(g){
            var test=this.emptyGuid();
            return (g===test);
        },


        /**
         * tests for window to determine if browser environment
         * @returns {boolean}
         */
        isBrowser: function(){
            return typeof window != 'undefined';
        },

        isIPAddress:function(ip){
            return (/^(\d\d?)|(1\d\d)|(0\d\d)|(2[0-4]\d)|(2[0-5])\.(\d\d?)|(1\d\d)|(0\d\d)|(2[0-4]\d)|(2[0-5])\.(\d\d?)|(1\d\d)|(0\d\d)|(2[0-4]\d)|(2[0-5])$/.test(ip));
        },

        isLocalHost:function(host){
            host=host.toLowerCase();
            if(host==='localhost'){
                return true
            }else if(host.indexOf('127.0.0.1')> -1){
                return true;
            }else {
                if(this.isIPAddress(host)){
                    return (isLocalBlock(host));
                }else{
                    return false;
                }
            }

            function isLocalBlock(ip){
                var x = ip.split("."), x1, x2, x3, x4;
                if (x.length == 4) {
                    x1 = parseInt(x[0], 10);
                    x2 = parseInt(x[1], 10);
                    x3 = parseInt(x[2], 10);
                    x4 = parseInt(x[3], 10);

                    return ((x1===10) || (x1===172 && x2===16) || (x1===192) && (x2===168));
                }
                return false;
            }
        },

        //{month:'Jan',usage:100},{month:'Jan',usage:145}, {usage:'prevYearUsage'}==>{month:'Jan',usage:100,prevYearUsage:145}
        extendObjProp:function(a,b,propMap){
            for (var key in b) {
                if(b.hasOwnProperty(key) && propMap.hasOwnProperty(key)){
                    a[propMap[key]]=b[key];
                }
            }
            return a;
        },

        /*
         a=[{month:'Jan',usage:100}...{month:'Dec',usage:175}]
         b=[{month:'Jan',usage:90}...{month:'Dec',usage:165}]
         propMap={usage:'prevYearUsage'}
         ===>[{month:'Jan',usage:100,prevYearUsage:90},{month:'Dec',usage:175,prevYearUsage:165}]
         */
        mergeObjArraysProp:function(a,b,propMap){
            var arr=[];
            if(_.isArray(a) && _.isArray(b) && a.length=== b.length){
                for(var i=0;i< a.length;i++){
                    arr.push(this.extendObjProp(a[i],b[i],propMap));
                }
                return arr;

            }else{
                return arr;
            }
        },

        /**
         * returns a crrent date string
         * @returns {string}
         */
        currentDate:function(){
            var obj=this.currentDateObj();
            return (obj.month + '/' + obj.day + '/' + obj.year);
        },

        encodeURISection:function(url,index){
            if(this.strFirstChar(url)==='/'){
                url=this.trimFirstChar(url);
            }
            var arr=url.split('/');
            var section=arr[index];
            section=encodeURIComponent(section);
            var length=arr.length;
            var url_='';
            for(var i=0;i<length;i++){
                url_+=(i===index) ? '/' + section : '/' + arr[i];
            }

            return url_;
        },

        /**
         * return an object representing current date
         * @returns {{day: number, month: number, year: number}}
         */
        currentDateObj:function(){

            var currentDate = new Date();
            var day = currentDate.getDate();
            var month = currentDate.getMonth() + 1;
            var year = currentDate.getFullYear();
            return{
                day:day,
                month:month,
                year:year
            };
        },

        /**
         * get first char of string
         * @param s {String}
         * @returns {string}
         */
        strFirstChar:function(s){
            return s.charAt(0);
        },

        /**
         * get last char of string
         * @param s {String}
         * @returns {String}
         */
        strLastChar:function(s){
            return s.slice(-1);

        },

        /**
         * returns first n chars of string
         * @param s {String}
         * @param n {Number}
         * @returns {string}
         */
        strFirstNChars:function(s,n){
            return s.substr(0,n);
        },

        /**
         * returns last n chars of string
         * @param s {String}
         * @param nv{Number}
         * @returns {string}
         */
        strLastNChars:function(s,n){
            return s.substr(s.length - n);
        },

        /**
         * trim first chr from string
         * @param s {String}
         * @returns {String}
         */
        trimFirstChar:function(s){
            return s.substring(1);
        },

        /**
         * trim last chr from string
         * @param s {String}
         * @returns {String}
         */
        trimLastChar:function(s){
            return s.substring(0, s.length-1);
        },

        trimLastNChars:function(s,n){
            return s.substring(0, s.length-n);
        },

        ellipsisTrim:function(s,maxLength){
            var ret=s;
            if (ret.length > maxLength) {
                ret = ret.substr(0,maxLength-4) + " ...";
            }
            return ret;
        },

        /**
         * replaces a string with another string at index
         *
         * @param string {String}
         * @param index {Number}
         * @param replaceStr {String}
         * @returns {string}
         */
        stringReplaceAt: function(string,index, replaceStr) {
            return string.substr(0, index) + replaceStr + string.substr(index+replaceStr.length);
        },

        /**
         * inserts a string value at specified index in a string
         * @param string {String}
         * @param index {Number}
         * @param insertStr {String}
         * @returns {string}
         */
        stringInsertAt:function(string,index,insertStr){
            return string.substr(0, index) + insertStr + string.substr(index);
        },

        /**
         * validates type to be numeric
         * @param n {Object}
         * @returns {boolean}
         */
        isNumeric: function(n){
            return !isNaN(parseFloat(n)) && isFinite(n);
        },

        /**
         * converts a dash delimited string to a camelCase string
         *
         * @param s {String}
         * @returns {String}
         */
        dashToCamelCase:function(s){
            return s.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
        },

        /**
         * camel case to space separated
         * @param s {String}
         * @returns {String}
         */
        camelCaseToSpace:function(s){
            var rex = /([A-Z])([A-Z])([a-z])|([a-z])([A-Z])/g;
            return s.replace( rex, '$1$4 $2$3$5' );
        },

        /**
         * converts a space delimited string to a dash delimited string
         *
         * @param s {String}
         * @returns {String}
         */
        spaceToDash:function(s){
            return s.replace(/\s+/g, '-').toLowerCase();
        },

        /**
         * validates if the value of an object prop is an array
         *
         * @param obj {Object}
         * @param prop {String}
         * @returns {boolean}
         */
        isPropertyArray:function(obj,prop){
            return !!((_.isArray(obj[prop])));
        },

        /**
         * is object/value in array
         * @param arr {Array}
         * @param obj {Object}
         * @returns {Boolean}
         */
        inArray:function(arr,obj){
            return  _.find(arr,function(o){
                return _.isEqual(o,obj);
            })
        },




        /**
         * validates if the value of an object prop by index is an array
         *
         *
         * @param obj {Object}
         * @param index {Number}
         * @returns {boolean}
         */
        isPropertyByIndexArray:function(obj,index){
            try{
                var o=obj[Object.keys(obj)[index]];
                return !!((_.isArray(o)));
            }catch(ex){
                return false;
            }

        },

        /**
         * gets the value of an object prop by index
         *
         *
         * @param obj {Object}
         * @param index {Number}
         * @returns value
         */
        objectPropertyByIndex:function(obj,index){
            return obj[Object.keys(obj)[index]];
        },



        /**
         * converts a delimited path into an array of props
         * 'items.0.FirstName' --> [items,0,FirstName]
         *
         * @param path {String}
         * @param separator {String}
         * @returns {Array}
         */
        splitPath:function(path,separator){
            if (typeof separator == 'undefined') {
                separator = '.';
            }
            if ((typeof path ==='undefined') || path === '') {
                return [];
            } else {
                if (_.isArray(path)) {
                    return path.slice(0);
                } else {
                    return path.toString().split(separator);
                }
            }
        },

        /**
         * resolves the value of an object path
         * obj, 'items.0.FirstName'  --> 'John','FirstName'
         * returns an array of value,prop
         *
         * @param a {Object}
         * @param path {String}
         * @param options {Object}
         * @returns {Array}
         */
        resolvePath: function(a, path, options){
            var e, k, last, stack;
            if (options == null) {
                options = {};
            }
            stack = this.splitPath(path);
            last = [stack.pop()];
            e = a;
            while ((k = stack.shift()) !== void 0) {
                if (e[k] !== void 0) {
                    e = e[k];
                } else {
                    stack.unshift(k);
                    break;
                }
            }
            if (options.force) {
                while ((k = stack.shift()) !== void 0) {
                    if ((typeof stack[0] === 'number') || ((stack.length === 0) && (typeof last[0] === 'number'))) {
                        e[k] = [];
                    } else {
                        e[k] = {};
                    }
                    e = e[k];
                }
            } else {
                while ((k = stack.pop()) !== void 0) {
                    last.unshift(k);
                }
            }
            return [e, last];
        },

        /**
         * resolves the value of an object path
         * obj, 'items.0.FirstName'  --> 'John'
         *
         * @param obj {Object}
         * @param path {String}
         * @returns value
         */
        objectPropertyByPath: function(obj,path){
            try{
                var pathArray=this.splitPath(path);
                var a=obj;
                pathArray.forEach(function(p){
                    var b=a[p];
                    a=b;
                });
                return a;
            }catch(ex){
                return undefined;
            }

        },

        /**
         * returns the index of an element with idProp==id in an array
         * @param obj {Object}
         * @param id {String}
         * @param idProp {String}
         * @returns {Number}
         */
        objectIndexById:function(obj,id,idProp){
            if(idProp===undefined){
                idProp='id';
            }
            var arr=this.objectPropertyByIndex(obj,0);
            if(arr.length && arr.length > 0){
                var len=arr.length;
                var index;
                for(var i=0;i<len;i++){
                    if(arr[i][idProp]===id){
                        index=i;
                        break;
                    }
                }
                return index;
            }else{
                return undefined;
            }
        },

        assignValueToPath:function(obj,path,value){
            try{
                var pathArray=this.splitPath(path);
                var a=obj;
                var len=pathArray.length;
                var max=len-1;
                for(var i=0;i<len;i++){
                    if(i===max){
                        a[pathArray[i]]=value;
                    } else{
                        var b=a[pathArray[i]];
                        a=b;
                    }
                }
            }catch(ex){

            }
        },

        /**
         * return the length of an array property of an object by path
         * @param obj {Object}
         * @param path {String}
         * @returns {Number}
         */
        arrayPropertyLengthByPath:function(obj,path){
            //console.log(path);
            var prop=this.objectPropertyByPath(obj,path);
            return (prop && _.isArray(prop)) ? prop.length : null;

        },

        /**
         * returns the index of the path
         * @param path {String}
         * @returns {Number}
         */
        getIndexFromPath:function(path){
            if(path !==undefined){
                var parts=path.split('.');
                var length;
                if(parts.length){
                    length=parts.length;
                    length--;
                    return parts[length];

                }else{
                    return undefined;
                }
            }else{
                return undefined;
            }

        },

        /**
         * is path part of an array
         * @param path {String}
         * @returns {Boolean}
         */
        isPathInArray:function(path){
            var index=this.getIndexFromPath(path);
            return (index !== undefined) ? this.isNumeric(index) : undefined;
        },


        /**
         * converts an array(of contexts and indices) and a property into a path string
         * [{index:5,context:User},{index:0,context:Address}],City ---> User.5.Address.0.City
         * @param arr {Array}
         * @param prop {String}
         * @returns {String}
         */
        createPath: function(arr,prop){
            var path='';
            if(arr && arr.length){
                arr.forEach(function(obj){
                    path+=obj.context + '.' + obj.modelIndex + '.';
                });

                (typeof prop !=='undefined') ? path+=prop : path=path.substring(0, path.length - 1);
                return path;
            }
        },

        /**
         * converts an array of object properties into a path
         * @param arr {Array}
         * @returns {String} path
         */
        createPathFromArray:function(arr){
            var path='';
            if(arr && arr.length){
                var index=0;
                arr.forEach(function(obj){
                    path+=(index < arr.length -1) ? obj + '.' : obj;
                    index++;
                });
                return path;
            }
        },

        /**
         * deletes an obj prop by path
         * @param obj {Object}
         * @param path {String}
         */
        deleteObjectPropertyByPath: function(obj,path){
            var pathArray=this.splitPath(path);
            var a=obj;
            var len=pathArray.length;
            var max=len-1;
            for(var i=0;i<len;i++){
                if(i===max){
                    delete a[pathArray[i]];
                } else{
                    var b=a[pathArray[i]];
                    a=b;
                }
            }
        },

        /**
         * tests if a prop is the last node in a path
         * @param path {String}
         * @param prop {String}
         * @returns {boolean}
         */
        isPathProperty: function(path,prop){
            var splitPath=this.splitPath(path);
            var prop_=splitPath.pop();
            return ((prop_=== prop));
        },

        /**
         * deletes an object from a $scope model list by id value
         * @param obj {Object}
         * @param idProp {String}
         * @param id {String|Value}
         * @returns {Number} the index of the deleted object
         */
        deleteObjectByIdFromArrayProp: function(obj,idProp,id){
            var index=null;
            if(!this.isPropertyByIndexArray(obj,0)){
                return index;
            }
            var arr=obj[Object.keys(obj)[0]];
            for(var i=0;i<arr.length;i++){
                if(arr[i][idProp].toString()===id.toString()){
                    arr.splice(i,1);
                    index=i;
                    break;
                }
            }

            return index;
        },


        /**
         * finds an object in a $scope model list by id
         * @param obj {Object}
         * @param idProp {String}
         * @param id {String|Value}
         * @returns {*}
         */
        selectObjectByIdFromArrayProp: function(obj,idProp,id){
            var obj_;
            var index=null;
            if(!this.isPropertyByIndexArray(obj,0)){
                return index;
            }
            var arr=obj[Object.keys(obj)[0]];
            for(var i=0;i<arr.length;i++){
                if(arr[i][idProp].toString()===id.toString()){
                    obj_=arr[i];
                    break;
                }
            }

            return obj_;

        },

        /**
         * finds an object in an array by id
         * @param arr {Array}
         * @param id {String}|{Number}
         * @param propId {String}
         * @returns {Object}
         */
        findById: function(arr,id,propId){
            if(typeof propId==='undefined'){
                propId='id';
            }
            return _.find(arr, function(obj) {
                return obj[propId]===id;
            });

        },

        /**
         * inserts an index into a model list path(at path index=1)
         * @param path {String}
         * @param index {Number}
         * @returns {String}
         */
        replaceIndexInPath: function(path,index){
            var arr=this.splitPath(path);
            arr[1]=index;
            return arr.join('.');

        },

        observerMapPath:function(path){
            var arr=this.splitPath(path);
            var num=this.isNumeric;
            if(arr && arr.length){
                var mapped= _.map(arr,function(v){
                    return (num(v)) ? '['+ v.toString() + ']' : v;
                });

                return mapped.join('.').replace(/.\[/,'[');

            }else{
                return path;
            }
        },



        /**
         * returns the changes between two objects as properties on the returned object
         * ex: n={FirstName:'John',LastName:'Smith'},o={FirstName:'Bob',LastName:'Smith'} ===> {FirstName:'John'}
         * @param n {Object}
         * @param o {Object}
         * @returns {Object}
         */
        objChangedProps:function(n,o){
            var obj={};
            var keys= _.keys(n);
            keys.forEach(function(v){
                if(!_.isEqual(n[v],o[v])){
                    obj[v]=n[v];
                }
            });
            return obj;
        },

        parseCurrency:function(v){
            if(typeof v==='string'){
                v= v.replace('$','');
                v= v.replace(/,/g,'');
                v=parseFloat(v);
            }
            return v;
        },

        extendedAmount: function(v,q){
            if(typeof v==='string'){
                v= v.replace('$','');
                v=parseFloat(v);
            }
            return this.formatCurrency(v*q);
        },

        formatCurrency:function(value){
            value=parseFloat(value);
            return value.toFixed(2);

        },


        extFormatCurrency:function(m,v,symbolPrefix){

            if(typeof m==='number' || typeof m==='string' && (arguments.length===1 || typeof v==='boolean')){
                v=m;
                v=parseFloat(v);
                m='#,##0.00';
            }
            if(typeof symbolPrefix==='undefined'){
                symbolPrefix=false;
            }


            //convert any string to number according to formation sign.
            var v = m.charAt(0) == '-'? -v: +v;
            var isNegative = v<0? v= -v: 0; //process only abs(), and turn on flag.

            //search for separator for grp & decimal, anything not digit, not +/- sign, not #.
            var result = m.match(/[^\d\-\+#]/g);
            var Decimal = (result && result[result.length-1]) || '.'; //treat the right most symbol as decimal
            var Group = (result && result[1] && result[0]) || ',';  //treat the left most symbol as group separator

            //split the decimal for the format string if any.
            var m = m.split( Decimal);
            //Fix the decimal first, toFixed will auto fill trailing zero.
            v = v.toFixed( m[1] && m[1].length);
            v = +(v) + ''; //convert number to string to trim off *all* trailing decimal zero(es)

            //fill back any trailing zero according to format
            var pos_trail_zero = m[1] && m[1].lastIndexOf('0'); //look for last zero in format
            var part = v.split('.');
            //integer will get !part[1]
            if (!part[1] || part[1] && part[1].length <= pos_trail_zero) {
                v = (+v).toFixed( pos_trail_zero+1);
            }
            var szSep = m[0].split( Group); //look for separator
            m[0] = szSep.join(''); //join back without separator for counting the pos of any leading 0.

            var pos_lead_zero = m[0] && m[0].indexOf('0');
            if (pos_lead_zero > -1 ) {
                while (part[0].length < (m[0].length - pos_lead_zero)) {
                    part[0] = '0' + part[0];
                }
            }
            else if (+part[0] == 0){
                part[0] = '';
            }

            v = v.split('.');
            v[0] = part[0];

            //process the first group separator from decimal (.) only, the rest ignore.
            //get the length of the last slice of split result.
            var pos_separator = ( szSep[1] && szSep[ szSep.length-1].length);
            if (pos_separator) {
                var integer = v[0];
                var str = '';
                var offset = integer.length % pos_separator;
                for (var i=0, l=integer.length; i<l; i++) {

                    str += integer.charAt(i); //ie6 only support charAt for sz.
                    //-pos_separator so that won't trail separator on full length
                    if (!((i-offset+1)%pos_separator) && i<l-pos_separator ) {
                        str += Group;
                    }
                }
                v[0] = str;
            }

            v[1] = (m[1] && v[1])? Decimal+v[1] : "";
            var curr=(isNegative?'-':'') + v[0] + v[1]; //put back any negation and combine integer and fraction.
            return (symbolPrefix)? '$' + curr : curr;
        },

        changeRecordsResult:function(){
            return {
                added:[],
                changed:[],
                removed:[]
            };
        },

        objectChangeRecord:function(){
            return{
                object:undefined,
                value:undefined,
                oldValue:undefined,
                path:undefined,
                name:undefined,
                root:undefined

            }
        },

        /**
         * returns the changes between two objects as properties on the returned object
         * ex: n={FirstName:'John',LastName:'Smith'},o={FirstName:'Bob',LastName:'Smith'} ===> {FirstName:'John'}
         * @param n {Object}
         * @param o {Object}
         * @returns {Object}
         */
        objectChangedProps:function(n,o){
            var obj={};
            var keys= _.keys(n);
            keys.forEach(function(v){
                if(!_.isEqual(n[v],o[v])){
                    obj[v]=n[v];
                }
            });
            return obj;
        },

        isModelList:function(obj){
            var keys= _.keys(obj).length;
            //if keys > 1, model
            if(keys > 1){
                return null;
            }else{
                //else if keys <=1, test if prop is an array(model list)
                var o=obj[Object.keys(obj)[0]];
                return (_.isArray(o)) ? o : null;
            }
        },

        /**
         * generate an difference summary report between two object states.
         * returns a result object with added,changed,removed array props
         *
         * summary report is intended to handle two object types: (i) model/document (ii) model list
         *
         * (i) a model is where the object represents a singleton document
         *
         * (ii) a model list is an object whose first prop/key is an array; so it acts as an array of documents or document container
         * Each element of the array prop corresponds to a unique document and should have a unique id key
         *
         *
         *
         * @param newObj {Object}
         * @param oldObj {Object}
         * @param id {String} Model id prop
         * @returns {Object}
         */
        objDiffReport: function(newObj,oldObj,id){
            var self=this;
            var newObj_;
            var oldObj_;
            var OBJ_;
            var result=this.changeRecordsResult();

            if(typeof id==='undefined'){
                id='id';
            }


            var _o=isModelList(oldObj);
            (_o) ? modelListSummary(_o) : modelSummary();


            //test for model list; returns the array if true, null if false
            function isModelList(oldObj_) {
                var keys= _.keys(oldObj).length;
                //if keys > 1, model
                if(keys > 1){
                    return null;
                }else{
                    //else if keys <=1, test if prop is an array(model list)
                    var o=oldObj_[Object.keys(oldObj_)[0]];
                    return (_.isArray(o)) ? o : null;
                }

            }


            return result;


            function modelListSummary(_o){
                var _n=newObjModelList();
                if(!_n){
                    result=null;
                    return false;
                }
                difference(_n,_o);
            }

            function modelSummary(){
                if(!_.isEqual(newObj,oldObj)){
                    /*result.changed.push({
                        object:newObj,
                        oldObject:oldObj
                    });*/
                    newObj_=newObj;
                    oldObj_=oldObj;
                    OBJ_=undefined;
                    var chg_=objectChangeRecord(newObj,oldObj,'');
                    result.changed.push(chg_);
                }
            }

            function objectChangeRecord(n,o,path){
                var obj=self.objectChangeRecord();
                var keys= _.keys(n);
                keys.forEach(function(v){
                    if(!_.isEqual(n[v],o[v])){
                        var path_=(path !=='') ? path + '.' + v : v;
                        if(typeof n[v] ==='object' && n[v] !==null){
                            if(!_.isArray(n[v])){
                                objectChangeRecord(n[v],o[v],path);
                            }else{
                                var index_=0;
                                var ov=o[v];
                                n[v].forEach(function(oo){
                                    if(!_.isEqual(oo,ov[index_])){
                                        path_+='.' + index_;
                                        objectChangeRecord(oo,ov[index_],path_);
                                        index_++;
                                    }else{
                                        index_++;
                                    }
                                });
                            }
                        }else{
                            obj.object=n;
                            obj.value=n[v];
                            obj.oldValue=o[v];
                            obj.path=path_;
                            obj.name=v;
                            obj.root=newObj_;

                            OBJ_=obj;
                        }
                    }
                });

                return OBJ_;
            }

            function newObjModelList(){
                var n=newObj[Object.keys(newObj)[0]];
                return (_.isArray(n)) ? n : null;
            }

            function difference(n,o){
                var oIds = {};
                o.forEach(function(obj){
                    oIds[obj[id]] = obj;
                });

                var nIds={};
                n.forEach(function(obj){
                    nIds[obj[id]] = obj;
                });

                var nArr=[],
                    oArr=[],
                    uArr=[];

                // return all elements in n not in o==added
                nArr= n.filter(function(obj){
                    return !(obj[id] in oIds);
                });

                // return all elements in o not in n==removed
                oArr= o.filter(function(obj){
                    return !(obj[id] in nIds);
                });

                //return unequal for common elements==changed
                n.forEach(function(obj){
                    var oo= _.find(o,function(__o){return __o[id]===obj[id]});
                    if( !(_.isEqual(oo,obj) || oo ===undefined) ){
                        /*uArr.push({
                            object:obj,
                            oldObject:oo
                        });*/
                        newObj_=obj;
                        oldObj_=oo;
                        OBJ_=undefined;
                        var chg_=objectChangeRecord(obj,oo,'');
                        uArr.push(chg_);
                    }
                });

                //update result
                result.added=result.added.concat(nArr);
                result.changed=result.changed.concat(uArr);
                result.removed=result.removed.concat(oArr);

            }
        },

        nativeObjDiffReport:function(obj,changeRecords){
            var result=this.changeRecordsResult();
            var self=this;
            var _o=this.isModelList(obj);
            var path_;
            if(changeRecords && changeRecords.length){
                changeRecords.forEach(function(c){
                    if(_o){
                        if(c.addedCount && c.addedCount>0 && c.type==='splice'){
                            result.added.push(c.object[c.index]);
                        }
                        if(c.removed && c.removed.length>0 && c.type==='splice'){
                            result.removed=result.removed.concat(c.removed);
                        }
                        if(c.type==='update'){
                            path_=pathReplace(c.path);
                            var u_={
                                object: c.object,
                                path: path_,
                                value: c.value,
                                oldValue: c.oldValue,
                                name: c.name,
                                root: c.root
                            };
                            result.changed.push(u_);
                        }
                    }else{
                        path_=pathReplace(c.path);
                        var chg_={
                            object: c.object,
                            value:self.objectPropertyByPath(obj,path_),
                            oldValue: c.oldValue,
                            path:path_,
                            name: c.name,
                            root: c.root
                        };

                        result.changed.push(chg_);
                    }
                });
            }

            function pathReplace(p){
                var n= p.replace(/\//g,'.');
                if(self.strFirstChar(n)==='.'){
                    n=self.trimFirstChar(n);
                }
                return n;
            }

            return result;
        }
    };


}));








/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
                q.process();
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                q.process();
            }
        };
        return q;
    };
    
    async.priorityQueue = function (worker, concurrency) {
        
        function _compareTasks(a, b){
          return a.priority - b.priority;
        };
        
        function _binarySearch(sequence, item, compare) {
          var beg = -1,
              end = sequence.length - 1;
          while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);
            if (compare(item, sequence[mid]) >= 0) {
              beg = mid;
            } else {
              end = mid - 1;
            }
          }
          return beg;
        }
        
        function _insert(q, data, priority, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  priority: priority,
                  callback: typeof callback === 'function' ? callback : null
              };
              
              q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }
        
        // Start with a normal queue
        var q = async.queue(worker, concurrency);
        
        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
          _insert(q, data, priority, callback);
        };
        
        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

/*
 * =============================================================
 * elliptical.Class
 * =============================================================
 *
 * Classical inheritance pattern adopted from JavascriptMVC(which is an implementation of the Resig pattern), sans the jQuery dependency.
 * https://github.com/jupiterjs/jquerymx/blob/master/class/class.js
 *
 * var MyClass=Class.extend({},{});
 *
 * examples.:
 *
 * var MyClass=Class.extend({
 *
 * //@static
 *    method1:function(){
 *       return 'method1';
 *    }
 * },{
 *
 * //@prototype
 *    init:function(arg){
 *      this.name=arg;
 *    },
 *
 *    method1: function(){
 *       return this.name;
 *    }
 *
 * });
 *
 * MyClass.method1() //  'method1'
 * var myClassInstance=new MyClass('Bob');
 *
 * myClassInstance instanceof MyClass // true
 * myClassInstance.method1()  // 'Bob'
 *
 * var AnotherClass=Class.extend({  //define only instance props and methods
 *    init:function(arg){
 *        this.name=arg;
 *    },
 *    method1: function(){
 *       return this.name;
 *    }
 * });
 *
 * var anotherClassInstance=new AnotherClass('Fred');
 * anotherClassInstance instanceof AnotherClass // true
 * anotherClassInstance.method1()  // 'Fred'
 *
 * var Class2=Class.extend({
 *      prop1:true
 *      method1:function(){
 *        return 'method1';
 *      }
 * },
 * {
 *    init:function(arg){
 *      this.name=arg;
 *    },
 *
 *    method1: function(){
 *       return this.name;
 *    }
 * });
 *
 * var Class3=Class2.extend({
 *      prop1:false,
 *      prop2:true,
 *      method2:function(){
 *         return 'method2';
 *      }
 *
 * },{
 *     method2: function(){
 *       return this.name + ' from method 2';
 *     }
 * });
 *
 * var myClass3=new Class3('Jane');
 * Class2.prop1 //true
 * Class3.prop1 //false
 * myClass3 instanceof Class2  //true
 * myClass3 instanceof Class3  //true
 *
 * myClass3.method2() // 'Jane from method 2'
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.Class=factory(root.elliptical.utils);
        root.returnExports = root.elliptical.Class;
    }
}(this, function (utils) {
        var _=utils._,
        initializing = false,
        makeArray = utils.makeArray,
        isFunction = _.isFunction,
        isArray = _.isArray,
        extend = utils.extend,
        concatArgs = utils.concatArgs,


    /* tests if we can get super in .toString() */
    fnTest = /xyz/.test(function()
    {
        xyz;
    }) ? /\b_super\b/ : /.*/,


        /**
         * overwrites an object with methods, sets up _super
         * @param newProps {Object}
         * @param oldProps {Object}
         * @param addTo {Object}
         */
        inheritProps = function(newProps, oldProps, addTo)
        {

            addTo = addTo || newProps;
            for ( var name in newProps)
            {
                /* Check if we're overwriting an existing function */
                addTo[name] = isFunction(newProps[name]) && isFunction(oldProps[name])
                    && fnTest.test(newProps[name]) ? (function(name, fn)
                {
                    return function()
                    {
                        var tmp = this._super, ret;

                        /* Add a new ._super() method that is the same method, but on the super-class */
                        this._super = oldProps[name];

                        /* The method only need to be bound temporarily, so we remove it when we're done executing */
                        ret = fn.apply(this, arguments);
                        this._super = tmp;

                        return ret;
                    };
                })(name, newProps[name]) : newProps[name];
            }
        };

    var clss =function()
    {
        if (arguments.length)
        {
            clss.extend.apply(clss, arguments);
        }
    };

    /* @Static */
    extend(
        clss,
        {
            /**
             * Returns a callback function for a function on this Class.
             * Proxy ensures that 'this' is set appropriately.
             * @param funcs {Array}
             * @returns {Function} the callback function
             */
            proxy : function(funcs)
            {
                /* args that should be curried */
                var args = makeArray(arguments), self;

                funcs = args.shift();

                if (!isArray(funcs))
                {
                    funcs = [ funcs ];
                }

                self = this;
                for ( var i = 0; i < funcs.length; i++)
                {
                    if (typeof funcs[i] == "string"
                        && !isFunction(this[funcs[i]]))
                    {
                        throw ("class.js "
                            + (this.fullName || this.Class.fullName)
                            + " does not have a " + funcs[i] + "method!");
                    }
                }
                return function class_cb()
                {
                    var cur = concatArgs(args, arguments), isString, length = funcs.length, f = 0, func;
                    for (; f < length; f++)
                    {
                        func = funcs[f];
                        if (!func)
                        {
                            continue;
                        }

                        isString = typeof func == "string";
                        if (isString && self._set_called)
                        {
                            self.called = func;
                        }

                        cur = (isString ? self[func] : func).apply(self, cur
                            || []);
                        if (f < length - 1)
                        {
                            cur = !isArray(cur) || cur._use_call ? [ cur ]
                                : cur;
                        }
                    }
                    return cur;
                };
            },

            /**
             * Creates a new instance of the class.
             * @returns {Class} instance of the class
             */
            newInstance: function() {
                var inst = this.rawInstance(),
                    args;
                /* call setup if there is a setup */
                if ( inst.setup ) {
                    args = inst.setup.apply(inst, arguments);
                }
                /* call init if there is an init, if setup returned args, use those as the arguments */
                if ( inst.init ) {
                    inst.init.apply(inst, isArray(args) ? args : arguments);
                }
                return inst;
            },

            /**
             * Setup gets called on the inherting class with the base class followed by the inheriting class's raw properties.
             * Setup will deeply extend a static defaults property on the base class with properties on the base class.
             * @param baseClass {Object}
             * @param fullName {String}
             * @returns {Arguments}
             */
            setup: function( baseClass, fullName ) {
                this.defaults = extend(true, {}, baseClass.defaults, this.defaults);
                return arguments;
            },

            /**
             * returns the raw instance before application of setup and init
             * @returns {Class}
             */
            rawInstance: function() {
                initializing = true;
                var inst = new this();
                initializing = false;
                return inst;
            },

            /**
             * NOTE: support for namespacing fullName dropped because of its reliance on globals (S.Francis)
             * @param klass {Object}
             * @param proto {Object}
             * @returns {Class}
             */
            extend: function(klass, proto) {
                if(!proto) {
                    proto = klass;
                    klass = null;
                }
                proto = proto || {};
                var _super_class = this,
                    _super = this.prototype, prototype;

                /* Instantiate a base class (but only create the instance, don't run the init constructor */
                initializing = true;
                prototype = new this();
                initializing = false;
                /* Copy the properties over onto the new prototype */
                inheritProps(proto, _super, prototype);

                /* The dummy class constructor */

                function Class() {
                    /* All construction is actually done in the init method */
                    if ( initializing ) return;

                    /* extending */
                    if ( this.constructor !== Class && arguments.length ) {
                        return arguments.callee.extend.apply(arguments.callee, arguments);
                    } else { /* we are being called with new */
                        return this.Class.newInstance.apply(this.Class, arguments);
                    }
                }
                /* copy old stuff onto class */
                for ( name in this ) {
                    if ( this.hasOwnProperty(name) && ['prototype', 'defaults'].indexOf(name) == -1 ) {
                        Class[name] = this[name];
                    }
                }

                /* static inheritance */
                inheritProps(klass, this, Class);

                /* set things that can't be overwritten */
                extend(Class, {
                    prototype: prototype,
                    constructor: Class
                });

                //make sure our prototype looks nice
                Class.prototype.Class = Class.prototype.constructor = Class;

                var args = Class.setup.apply(Class, utils.concatArgs([_super_class],arguments));

                if ( Class.init ) {
                    Class.init.apply(Class, args || []);
                }

                /* @Prototype*/
                return Class;
            }
        });


    clss.callback=clss.prototype.callback=clss.prototype.proxy=clss.proxy;

    return clss;


}));





/*
 * =============================================================
 * elliptical.Controller
 * =============================================================
 *
 * Controller factory for an expressJS style application function/object
 * var Controller = new elliptical.Controller(app);
 *
 * Controller(route,f1,...fn,{
 *   Get:function(req,res,next){}
 *   Post:function(req,res,next){}
 *   Put: function(req,res,next){}
 *   Delete: function(req,res,next){}
 * });
 *
 * or:
 *
 * Controller(route/@action,f1,...fn,{
 *   Get:{
 *      Action1:function(req,res,next){},
 *      ActionN:function(req,res,next){},
 *   },
 *   Post:{
 *      Action1:function(req,res,next){},
 *      ActionN:function(req,res,next){},
 *   },
 *   Put:{
 *      Action1:function(req,res,next){},
 *      ActionN:function(req,res,next){},
 *   },
 *   Delete:{
 *      Action1:function(req,res,next){},
 *      ActionN:function(req,res,next){},
 *   },
 * });
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils'], factory);
    } else {
        root.elliptical.Controller = factory(root.elliptical.utils);
        root.returnExports = root.elliptical.Controller;
    }
}(this, function (utils) {


    /* Controller is a simple factory for the app function. It accepts the app function as an argument and returns a function
     * with a variable arg list of (route,f1,...fn,obj}, where route=route{String}, f1,...fn =middleware, and the last arg
     * is a plain object that binds a callback to a http method
     * obj={Get:func(req,res,next),Post:func(req,res,next),Put:func(req,res,next),Delete:func(req,res,next)}
     *
     * the first arg of the list must be the route and the last one must be the plain object.
     *
     * Controller can also group an arbitrary number of Actions around a http method and a base route:
     * Example:
     * Controller('/Company/@action',{
     *   Get:{
     *      Home:function(req,res,next){},
     *      About:function(req,res,next){},
     *      Contact:function(req,res,next){},
     *   },
     *   Post:{
     *      Contact:function(req,res,next){}
     *   }
     * }
     *
     * instead of app.get('/Company/Home',function(req,res,next){}),app.get('/Company/About',function(req,res,next){})
     *            app.get('/Company/Contact',function(req,res,next){}),app.post('/Company/Contact',function(req,res,next){})
     *
      * */
    var Controller=function(app){
        this.app=app;
        /**
         * @param route {String}
         * @param obj {Object}
         * @returns {Function}
         */
        return function(route,obj){
            var args = [].slice.call(arguments);
            var route_=args[0];
            if(typeof route_ !=='string'){
                throw 'Controller requires a route as the first parameter';
            }
            var obj_=args.pop();
            if(typeof obj_ ==='object'){
                ['Get','Post','Put','Delete'].forEach(function(v){
                    if(obj_[v] && typeof obj_[v]==='function'){
                        var clonedArgs=utils.cloneArray(args);
                        clonedArgs.push(obj_[v]);
                        app[v.toLowerCase()].apply(app,clonedArgs);
                    }else{ //@action grouping,NOTE: @action must be the param name
                        for(var prop in obj_[v]){
                            var clonedArgs_=utils.cloneArray(args);
                            if(prop==='Index'){
                                clonedArgs_[0]=clonedArgs_[0].replace(/@action/g,'');
                            }else{
                                var prop_=prop.replace(/_/,'-'); //ex: '/Sign-In' ---> Sign_In:fn()
                                clonedArgs_[0]=clonedArgs_[0].replace(/@action/g,prop_);
                            }

                            clonedArgs_.push(obj_[v][prop]);
                            app[v.toLowerCase()].apply(app,clonedArgs_);
                        }
                    }
                });
            }else{
                throw 'Controller requires the last function parameter to be an object';
            }
        }
    };

    return Controller;
}));

/*
 * =============================================================
 * elliptical.factory
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.factory=factory(root.elliptical.utils);
        root.returnExports = root.elliptical.factory;
    }
}(this, function (utils) {
    var _=utils._;

    var factory={
        partial:function(){
            var args = [].slice.call(arguments);
            return _.partial.apply(this,args);
        },

        partialRight:function(){
            var args = [].slice.call(arguments);
            return _.partialRight.apply(this,args);
        },

        curry:function(){
            var args = [].slice.call(arguments);
            return _.curry.apply(this,args);
        },

        defer:function(){
            var args = [].slice.call(arguments);
            return _.defer.apply(this,args);
        },

        delay:function(){
            var args = [].slice.call(arguments);
            return _.delay.apply(this,args);
        },

        after:function(){
            var args = [].slice.call(arguments);
            return _.after.apply(this,args);
        },

        bind:function(){
            var args = [].slice.call(arguments);
            return _.bind.apply(this,args);
        },

        bindKey:function(){
            var args = [].slice.call(arguments);
            return _.bindKey.apply(this,args);
        },

        bindAll:function(){
            var args = [].slice.call(arguments);
            return _.bindAll.apply(this,args);
        },

        debounce:function(){
            var args = [].slice.call(arguments);
            return _.debounce.apply(this,args);
        },

        throttle:function(){
            var args = [].slice.call(arguments);
            return _.throttle.apply(this,args);
        },


        wrap:function(){
            var args = [].slice.call(arguments);
            return _.wrap.apply(this,args);
        },

        memoize:function(){
            var args = [].slice.call(arguments);
            return _.memoize.apply(this,args);
        }

    };

    return factory;

}));

/*
 * =============================================================
 * elliptical.Model
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../class/class'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../class/class'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.Model=factory(root.elliptical.Class);
        root.returnExports = root.elliptical.Model;
    }
}(this, function (Class) {

    var Model = Class.extend({
            id: 'id', //{String} set a custom id property other than 'id'
            _data: null, //{Object}
            '@class': null, //{String}
            $provider: {}, //{Class|Object|Function}
            $paginationProvider:null,//{Class|Object|Function}


            /**
             * @static
             */

            /**
             * get all models by class or get model by id
             * @param params {Object}
             * @param query {Object}
             * @param callback {Function}
             * @public
             */
            get: function (params, query,callback) {
                this.__isImplemented('get');
                if(typeof query==='function'){
                    callback=query;
                    query={};
                }
                var self = this,
                    $provider = this.$provider,
                    $paginationProvider=this.$paginationProvider,
                    classType = this['@class'],
                    result;

                $provider.get(params, classType, query, function (err, data) {
                    if(!err){

                        if (query.paginate && $paginationProvider) {
                            result=$paginationProvider.get(query,data);
                            self._data=result.data;
                        }else{
                            result=data;
                            self._data=data;
                        }
                    }
                    if (callback) {
                        callback(err, result);
                    }
                });
            },


            /**
             * query model
             * @param params {Object}
             * @param query {Object}
             * @param callback {Function}
             * @public
             */
            query: function (params, query,callback) {
                this.__isImplemented('query');
                var self=this,
                    $provider = this.$provider,
                    $paginationProvider=this.$paginationProvider,
                    result;

                $provider.query(params, query,function (err, data) {
                    if(!err){
                        if (query.paginate && $paginationProvider) {
                            result=$paginationProvider.get(query,data);
                            self._data=result.data;
                        }else{
                            result=data;
                            self._data=data;
                        }
                    }
                    if (callback) {
                        callback(err, result);
                    }
                });
            },


            /**
             * post model
             * @param params {Object}
             * @param callback {Function}
             * @public
             */
            post: function (params, callback) {
                this.__isImplemented('post');
                var $provider = this.$provider,
                    classType = this['@class'];
                $provider.post(params, classType,callback);

            },

            /**
             * put model
             * @param params {Object}
             * @param callback {Function}
             * @public
             */
            put: function (params, callback) {
                var $provider = this.$provider,
                    classType = this['@class'];
                $provider.put(params, classType,callback);

            },

            /**
             * patch model (~merge)
             * @param params {Object}
             * @param callback
             */
            patch: function (params, callback) {
                this.__isImplemented('patch');
                var $provider = this.$provider,
                    classType = this['@class'];
                $provider.patch(params, classType,callback);

            },

            /**
             * delete model
             * @param params {Object}
             * @param callback {Function}
             * @public
             */
            delete: function (params, callback) {
                this.__isImplemented('delete');
                var $provider = this.$provider,
                    classType = this['@class'];
                $provider.delete(params, classType, callback);

            },

            /**
             * command
             * @param params {Object}
             * @param callback {Function}
             * @public
             */
            command: function (params, callback) {
                this.__isImplemented('command');
                var $provider = this.$provider;
                $provider.command(params, callback);
            },

            /**
             * sets the model providers for implementation
             * @param $provider {Object}
             * @param $pagination {Object}
             * @public
             */
            $setProviders: function ($provider,$pagination) {
                this.$provider = $provider;
                this.$paginationProvider=$pagination;
            },

            __isImplemented:function(method){
                if(!this.$provider[method]){
                    throw new Error(method + ' not implemented');
                }
            }

        },

        /**
         * @prototype
         */

        {
            _data: null,

            /**
             *
             * @param params {Object}
             * @public
             */
            init: function (params) {
                /* this will get passed up as the params in below methods if params not explicitly passed in the calls */
                this._data = params;
                this.$query={};
            },

            /**
             * @param params {Object}
             * @param callback {Function}
             * @public
             */
            get: function (params,callback) {
                var data = this._data,
                    query=this.$query;

                (typeof params==='function') ? callback=params : data=params;
                this.constructor.get(data,query, callback);
            },

            /**
             * @param params {Object}
             * @param callback {Function}
             * @public
             */
            save: function (params,callback) {
                var data = this._data;
                var length=arguments.length;
                if(length===0){
                    params=data;
                }else if(length===1 && typeof params==='function'){
                    callback=params;
                    params=data;
                }
                var idProp=this.constructor.id;
                if(params===undefined || params[idProp]===undefined){
                    /* posting a new model */
                    this.constructor.post(params, callback);
                }else{
                    /* put an update */
                    this.constructor.put(params, callback);
                }
            },

            /**
             * @param params {Object}
             * @param callback {Function}
             */
            put: function (params,callback) {
                var data = this._data;
                (typeof params==='function') ? callback=params : data=params;
                this.constructor.put(data, callback);
            },

            /**
             * @param params {Object}
             * @param callback {Function}
             */
            patch: function (params,callback) {
                var data = this._data;
                (typeof params==='function') ? callback=params : data=params;
                this.constructor.query(data, callback);
            },

            /**
             * @param params {Object}
             * @param callback {Function}
             * @public
             */
            query: function (params,callback) {
                var data = this._data,
                    query=this.$query;

                (typeof params==='function') ? callback=params : data=params;
                this.constructor.query(data, query,callback);
            },

            /**
             *
             * @param str {String}
             */
            filter: function (str) {
                this.$query.filter = str;
                return this;
            },

            /**
             *
             * @param str {String}
             */
            orderBy: function (str) {
                this.$query.orderBy = str;
                return this;
            },

            /**
             *
             * @param num {Number}
             */
            top: function (num) {
                this.$query.top = num;
                return this;
            },

            /**
             *
             * @param num {Number}
             */
            skip: function (num) {
                this.$query.skip = num;
                return this;
            },

            /**
             *
             * @param params {Object}
             */
            paginate: function (params) {
                try{
                    params.page=parseInt(params.page);
                }catch(ex){
                    params.page=1;
                }
                this.$query.paginate = params;
                return this;
            },

            /**
             * @param params {Object}
             * @param callback  {Function}
             * @public
             */
            delete: function (params,callback) {
                var data = this._data;
                (typeof params==='function') ? callback=params : data=params;
                this.constructor.delete(data, callback);
            },

            /**
             * @param params {Object}
             * @param callback {Function}
             * @public
             */
            command: function (params,callback) {
                var data = this._data;
                (typeof params==='function') ? callback=params : data=params;
                this.constructor.command(data, callback);
            }

        });


    return Model;



}));



/*
 * =============================================================
 * elliptical.noop
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.noop=factory();
        root.returnExports = root.elliptical.noop;
    }
}(this, function () {

    return{
        noop:function(){},
        throwErr:function(err){
            if (err) {
                throw err;
            }
        },
        doop:function(fn,args,context){
            if(typeof fn==='function') {
                return fn.apply(context, args);
            }
        }
    }


}));
/*
 * =============================================================
 * elliptical.debounce
 * =============================================================
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.debounce=factory(root.elliptical.utils);
        root.returnExports = root.elliptical.debounce;
    }
}(this, function (utils) {

    var _=utils._;

    return function debounce(fn,delay,opts){
        if(typeof delay==='undefined'){
            delay=1000;
        }
        if(typeof opts==='undefined'){
            opts={};
        }
        _.debounce(fn,delay,opts);
    }


}));

/*
 * =============================================================
 * elliptical.Interval
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('./debounce'),require('./throttle'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['./debounce','./throttle'], factory);
    } else {
        root.elliptical.Interval=factory(root.elliptical.debounce,root.elliptical.throttle);
        root.returnExports = root.elliptical.Interval;
    }
}(this, function (debounce,throttle) {

    return function Interval(opts){
        this.delay=opts.delay;
        this.timeOutId=null;
        if(opts.thread==='throttle'){
            this.thread=throttle;
        }else if(opts.thread==='debounce'){
            this.thread=debounce;
        }else{
            this.thread=_exe;
        }

        this.run=function(fn){
            var self=this;
            this.timeOutId=setInterval(function(){
                self.thread(fn,{
                    delay:10
                });

            },self.delay);
        };

        this.terminate=function(){
            clearInterval(this.timeOutId);
        }
    };


    function _exe(fn,opts){
        fn();
    }

}));


/*
 * =============================================================
 * elliptical.throttle
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.throttle=factory(root.elliptical.utils);
        root.returnExports = root.elliptical.throttle;
    }
}(this, function (utils) {

    var _=utils._;

    return function throttle(fn,delay,opts){
        if(typeof delay==='undefined'){
            delay=1000;
        }
        if(typeof opts==='undefined'){
            opts={};
        }
        _.throttle(fn,delay,opts);
    }


}));

/*
 * =============================================================
 * elliptical.proto
 * =============================================================
 *
 * EcmaScript5 inheritance pattern mostly culled from:
 * https://github.com/daffl/uberproto
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.proto=factory();
        root.returnExports = root.elliptical.proto;
    }
}(this, function () {

    var proto={

        /**
         *
         * @returns {Object}
         */
        create: function () {
            var instance = Object.create(this),
                init = typeof instance.__init === 'string' ? instance.__init : 'init';
            if (typeof instance[init] === "function") {
                instance[init].apply(instance, arguments);
            }
            return instance;
        },


        /**
         * Mixin a given set of properties
         * @param prop {Object} The properties to mix in
         * @param obj {Object} [optional] The object to add the mixin
         */
        mixin: function (prop, obj) {
            var self = obj || this,
                fnTest = /\b_super\b/,
                _super = Object.getPrototypeOf(self) || self.prototype,
                _old;

            // Copy the properties over
            for (var name in prop) {
                // store the old function which would be overwritten
                _old = self[name];
                // Check if we're overwriting an existing function
                self[name] = (typeof prop[name] === "function" && typeof _super[name] === "function" && fnTest.test(prop[name])) ||
                    (typeof _old === "function" && typeof prop[name] === "function") ? //
                    (function (old, name, fn) {
                        return function () {
                            var tmp = this._super;

                            // Add a new ._super() method that is the same method
                            // but either pointing to the prototype method
                            // or to the overwritten method
                            this._super = (typeof old === 'function') ? old : _super[name];

                            // The method only need to be bound temporarily, so we
                            // remove it when we're done executing
                            var ret = fn.apply(this, arguments);
                            this._super = tmp;

                            return ret;
                        };
                    })(_old, name, prop[name]) : prop[name];
            }

            return self;
        },


        /**
         * Extend the current or a given object with the given property
         * and return the extended object.
         * @param prop {Object} The properties to extend with
         * @param obj {Object} [optional] The object to extend from
         * @returns {Object} The extended object
         */
        extend: function (prop, obj) {
            return this.mixin(prop, Object.create(obj || this));
        },


        /**
         * Return a callback function with this set to the current or a given context object.
         * @param name {String} Name of the method to proxy
         * @param args... [optional] Arguments to use for partial application
         */
        proxy: function (name) {
            var fn = this[name],
                args = Array.prototype.slice.call(arguments, 1);

            args.unshift(this);
            return fn.bind.apply(fn, args);
        }
    };

    return proto;
}));


/*
 * =============================================================
 * elliptical.Provider
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../class/class'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../class/class'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.Provider=factory(root.elliptical.Class);
        root.returnExports = root.elliptical.Provider;
    }
}(this, function (Class) {

    var Provider=Class.extend({
        '@class':null
    },{});

    return Provider;


}));
/*
 * =============================================================
 * elliptical.$Provider
 * =============================================================
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../class/class'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../class/class'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.$Provider=factory(root.elliptical.Class);
        root.returnExports = root.elliptical.$Provider;
    }
}(this, function (Class) {

    var $Provider = function(name){
        return Class.extend({
            '@class':name

        },{});
    };

    return $Provider;


}));

/*
 * =============================================================
 * elliptical.Service
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../model/model'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../model/model'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.Service=factory(root.elliptical.Model);
        root.returnExports = root.elliptical.Service;
    }
}(this, function (Model) {

    var Service=Model.extend({
        _data:null, //{Object}
        '@class':null,
        $provider:null

    },{});

    return Service;




}));


/*
 * =============================================================
 * elliptical.View
 * =============================================================
 *
 */

//umd pattern
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'),require('../class/class'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils','../class/class'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.View=factory(root.elliptical.utils,root.elliptical.Class);
        root.returnExports = root.elliptical.View;
    }
}(this, function (utils,Class) {


    var isBrowser=utils.isBrowser,
        _=utils._,
        isFunction=_.isFunction;



        var View = Class.extend({
                _data:{}, //{Object}
                transition:null, //{String},
                $provider:null, //{Object}
                selector:'[data-container="base"]', //{String}
                selectorSet:false,
                clientContextRootNamespace:'$$', //{String}
                pushContextToClient:true,

                /**
                 * static render method
                 * @param template {String}
                 * @param context {Object}
                 * @param transition {String}
                 * @param callback {Function}
                 * @returns callback
                 * @public
                 */
                render: function(template,context,transition,callback){
                    if(isFunction(transition)){
                        callback=transition;
                        transition=null;
                    }
                    this.selector=this.$getSelector();
                    this.$provider.render(template,context,function(err,out){
                        //_render(err,out,selector,transition,callback);
                        if(callback){
                            callback(err,out)
                        }
                    });
                },

                /**
                 * set the template provider
                 * @param $provider {Function}
                 * @public
                 */
                $setProvider:function($provider){
                    this.$provider=$provider;
                },

                /**
                 * set the DOM selector
                 * @param selector {String}
                 */
                $setSelector:function(selector){
                    this.selectorSet=true;
                    this.selector=selector;
                },

                $getSelector:function(){
                    if(typeof window !=='undefined'){
                        if(this.selectorSet){
                            return this.selector;
                        }else{
                            var selector=($('html').hasClass('customelements')) ? 'ui-container[name="base"]' : '[data-container="base"]';
                            this.selector=selector;
                            return selector;
                        }
                    }

                }


            },
            {
                /**
                 * new instance init
                 * @param $provider {Function}
                 * @param selector {String}
                 */
                init:function($provider,selector){
                    if(typeof $provider === 'undefined'){
                        $provider=this.constructor.$provider;
                        selector=this.constructor.$getSelector();
                    }
                    else if(typeof $provider === 'string'){
                        selector=$provider;
                        $provider=this.constructor.$provider;
                    }else if(typeof selector != 'string'){
                        selector=this.constructor.$getSelector();
                    }
                    this.constructor._data.$provider= new $provider(true);
                    this.constructor._data.selector= selector;

                },

                /**
                 * prototype render method
                 * @param template {String}
                 * @param context {Object}
                 * @param transition {String}
                 * @param callback {Function}
                 * @returns callback
                 * @public
                 */
                render: function(template,context,transition,callback){
                    if(isFunction(transition)){
                        callback=transition;
                        transition=this.constructor.transition;
                    }
                    var selector=this.constructor._data.selector;
                    this.constructor._data.$provider.render(template,context,function(err,out){
                        if(callback){
                            callback(err,out);
                        }
                    });
                }
            });







    return View;
}));

/*
 * =============================================================
 * elliptical.crypto.base64
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical=root.elliptical || {};
        root.elliptical.crypto=elliptical.crypto || {};
        root.elliptical.crypto.base64=factory();
        root.returnExports = root.elliptical.crypto.base64;
    }
}(this, function () {
    var base64 = {

        // private property
        _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

        // public method for encoding
        encode : function (input) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;

            input = Base64._utf8_encode(input);

            while (i < input.length) {

                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }

                output = output +
                    this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                    this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

            }

            return output;
        },

        // public method for decoding
        decode : function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;

            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

            while (i < input.length) {

                enc1 = this._keyStr.indexOf(input.charAt(i++));
                enc2 = this._keyStr.indexOf(input.charAt(i++));
                enc3 = this._keyStr.indexOf(input.charAt(i++));
                enc4 = this._keyStr.indexOf(input.charAt(i++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + String.fromCharCode(chr1);

                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }

            }

            output = Base64._utf8_decode(output);

            return output;

        },

        // private method for UTF-8 encoding
        _utf8_encode : function (string) {
            string = string.replace(/\r\n/g,"\n");
            var utftext = "";

            for (var n = 0; n < string.length; n++) {

                var c = string.charCodeAt(n);

                if (c < 128) {
                    utftext += String.fromCharCode(c);
                }
                else if((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
                else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }

            }

            return utftext;
        },

        // private method for UTF-8 decoding
        _utf8_decode : function (utftext) {
            var string = "";
            var i = 0;
            var c = c1 = c2 = 0;

            while ( i < utftext.length ) {

                c = utftext.charCodeAt(i);

                if (c < 128) {
                    string += String.fromCharCode(c);
                    i++;
                }
                else if((c > 191) && (c < 224)) {
                    c2 = utftext.charCodeAt(i+1);
                    string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                    i += 2;
                }
                else {
                    c2 = utftext.charCodeAt(i+1);
                    c3 = utftext.charCodeAt(i+2);
                    string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    i += 3;
                }

            }

            return string;
        }

    };

    return base64;

}));












/*
 * =============================================================
 * elliptical.crypto
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('./base64'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['./base64'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical = root.elliptical || {};
        root.elliptical.crypto=factory(root.elliptical.crypto.base64);
        root.returnExports = root.elliptical.crypto;
    }
}(this, function (basic) {

    var base64=basic.base64;
    var crypto={};
    crypto.base64=base64;
    crypto.base64Encrypt=function(o,n){
        return 'Basic ' + base64.encode(o + ":" + n);

    };

    return crypto;

}));
/*
 * =============================================================
 * elliptical.http.browser
 * =============================================================
 */


//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory($);
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.http=root.elliptical.http | {};
        root.elliptical.http.browser=factory(root.$);
        root.returnExports = root.elliptical.http.browser;
    }
}(this, function ($) {

    var browser={
        send: function (params, callback) {
            var settings = {
                type: params.method || 'GET',
                dataType: params.dataType || 'json',
                url: params.protocol + '://' + params.host + ':' + (params.port || 80) + params.path

            };

            if (params.data) {
                params.data = JSON.stringify(params.data);
                settings.data = params.data;
                settings.contentType = 'application/json';

            }
            if (params.authorization) {
                settings.beforeSend = function (req) {
                    req.setRequestHeader('Authorization', params.authorization);
                }
            }

            var ajax = $.ajax(settings).done(function (data, status) {
                try {
                    if(typeof data==='string'){
                        data=JSON.parse(data);
                    }
                    callback(null, data);

                } catch (ex) {

                    var _err = {
                        statusCode: 500,
                        message: ex
                    };
                    callback(_err, null);
                }

            }).fail(function (data, status, errThrown) {
                var err={};
                err.statusCode=data.status;
                err.message=errThrown;

                callback(err, null);
            });
        }
    };

    return browser;
}));

/*
 * =============================================================
 * elliptical.http
 * =============================================================
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        var transport=require('./node');
        if(typeof window != 'undefined'){
            //we are in a browserify bundle
            transport=require('./browser');
        }
        module.exports = factory(transport,require('elliptical-crypto'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['./browser','elliptical-crypto'], factory);
    } else {
        // Browser globals (root is window)
        var browser=root.elliptical.http.browser;
        var crypto=root.elliptical.crypto;
        var http=factory(browser,crypto);
        http.browser=browser;
        root.elliptical.http=http;
        root.returnExports = root.elliptical.http;
    }
}(this, function (transport,crypto) {

    var http={
        send: function (options, callback) {
            transport.send(options,function(err,data){
                if (callback) {
                    callback(err, data);
                }
            });
        },

        base64Encrypt: crypto.base64Encrypt,

        base64:crypto.base64,

        encodeSessionToken: function(token){
            var authorization = 'Session ' + token;
            return authorization;
        },

        encodeOAuthToken: function(token){
            var authorization = 'OAuth ' + token;
            return authorization;
        }


    };

    http.crypto=crypto;

    return http;


}));

/*
 * =============================================================
 * elliptical.Router
 * =============================================================
 * Dependencies:
 * elliptical-utils,elliptical-mvc,elliptical-event,elliptical-url
 *
 * elliptical.Router implements a client-side version of "node express routing"
  * supports: (i) both html5 & hashTag routing
  *           (ii) virtual directories
  *           (iii) middleware
  *
  * Router consists of 5 classes: Listener,History,Location,Route & Router
  *
  * For a matched route, Router emits a data object with two properties:
  *  (i) route(path)
  *  (ii) the callback handlers, including a return function that matches the signature fn(req,res,next), binding params,body,query,route and
  *       statusCode to a request object
  *
  *       SAMPLE EXAMPLE IMPLEMENTATION
  *       var Router=require('elliptical-router');
  *       var Event=require('elliptical-event');
  *       var App=function(Router,Event){
  *           this.Router=Router;
  *           this.get=function(route,callbacks){
  *              this.Router.get(route,callbacks)
  *           }
  *           this.post=function(route,callbacks){
  *              this.Router.post(route,callbacks);
  *           }
  *           this.listen=function(){
  *              Event.on('onRouteDispatch',function(data){
  *                 _callStack(data.route,data.handlers);
  *              });
  *           }
  *
  *           function _callStack(route,handlers){
  *               //handle middleware callstack
  *           }
  *       }
  *
  *       var app=new App(Router,Event);
  *       app.get('/my/route/:id',function(req,res,next){
  *            var id=req.id;
  *            //do stuff
  *       });
  *
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'),require('elliptical-mvc'),require('elliptical-event'),require('elliptical-url'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils','elliptical-mvc','elliptical-event','elliptical-url'], factory);
    } else {
        root.elliptical.Router=factory(root.elliptical.utils,root.elliptical,root.elliptical.Event,root.elliptical.url);
        root.returnExports = root.elliptical.Router;
    }
}(this, function (utils,elliptical,Event,url) {
    var Class=elliptical.Class,
        _=utils._;

    var Listener=Class.extend({
        events:{
            request:'elliptical.onDocumentRequest',
            click:'touchclick',
            orientation:'onOrientationChange'
        },
        backButtonSelector:'[data-role="back"]',

        on:function(){
            var self=this;

            $(window).on(this.events.request, function (event,data) {
                self.forward(data);
            });

            $(document).on(this.events.click, this.backButtonSelector, function (event) {
                Router.history();
            });

            $(window).on(this.events.orientation, function (event, data) {
                data.method='get';
                self.forward(event,data);
            });
        },

        off:function(){
            var self=this;

            $(window).off(this.events.request, function (event,data) {
                self.forward(data);
            });

            $(document).off(this.events.click, this.backButtonSelector, function (event) {
                Router.history();
            });

            $(window).off(this.events.orientation, function (event, data) {
                data.method='get';
                self.forward(event,data);
            });


        },

        reset:function(){
            this.off();
            this.on();
        },

        forward: function(data){
            var route=data.route;
            var params={};
            var method=data.method;
            Router.location(route,method,params);
        }

    },{});



    var History=Class.extend({
        stateObject:null,

        poppedDelay:700,

        pushHistory:false,

        push:function(){
            if(this.pushHistory){
                var stateObject=this.stateObject;
                var title = '';
                stateObject.route = Location.hashify(stateObject.route);
                window.history.pushState(stateObject, title, stateObject.route);
            }
        },

        pop:function(event){
            var self=this;
            var isTouch= $.support.touch || false;
            if (event.originalEvent.state) {
                var route = event.originalEvent.state.route;
                var params = event.originalEvent.state.params;
                var method = event.originalEvent.state.method;

                this.pushHistory = false;
                if (isTouch) {
                    setTimeout(function () {
                        Route.location(route,method,params);

                    }, self.poppedDelay);
                } else {
                    Route.location(route,method,params);
                }
            }
        },

        start:function(){
            var self=this;
            var route=Location.path();
            var params=Location.search;
            var method = 'get';
            var stateObj = { route: route, params: params, method: method };
            this.stateObject = stateObj;
            this.pushHistory = true;
            Route.location(stateObj.route,'get',params);
            $(window).on('popstate', function (event) {
                self.pop(event);
            });
        },

        end: function(){
            var self=this;
            this.stateObject = null;
            this.pushHistory = false;
            $(window).off('popstate', function (event) {
                self.pop(event);
            });
        }

    },{});

    var Route=Class.extend({
        dispatchEvent:'elliptical.onRouteDispatch',

        add: function (method, route, callbacks) {
            if (this.verify(route, method)) {
                var rte = { route: route, method: method, handle: callbacks };
                Router.routes.push(rte);
                if (Router.debug) {
                    var msg='route: ' + route + ' has been added. Method: ' + method;
                    (Router.enabled) ? console.log(msg) : Router.messageQueue.push(msg);
                }
            }
        },

        remove:function(route,method){
            var index = -1;
            Router.routes.forEach(function(obj,i){
                var route_=obj.route;
                var method_=obj.method;
                if(route===route_ && method===method_){
                    index=i;
                }
            });
            if (index > -1) {
                Router.routes.splice(index, 1);
                if (Router.debug) {
                    console.log('route: ' + route + ' has been removed');
                }
            }
        },

        verify: function (route, method) {
            var bool=true;
            Router.routes.every(function(obj){
                var route_=obj.route;
                var method_=obj.method;
                if(route===route_ && method===method_){
                    bool= false;
                }
            });

            return bool;
        },

        decodeUrl:function(url){
            return decodeURIComponent(url.replace(/\+/g, '%20'));
        },

        deserialize:function(s){
            var data = s.split("&");
            var p = [];
            for (var i = 0; i < data.length; i++) {
                var pair = this.decodeUrl(data[i]).split("=");
                var _name = pair[0];
                var value = pair[1];
                var entry = { name: _name, value: value };
                p.push(entry);

            }
            return p;
        },

        location:function(route, method,params){

            route=Location.deHashify(route);
            History.push();

            if (!this.dispatch(route,method,params)) {
                //error --------->no matched route
                //emit the error

                var handlers = [];
                handlers.push(this.error);
                var data_={
                    route:route,
                    handlers:handlers
                };

                Event.emit(this.dispatchEvent,data_);
            }
        },

        dispatch:function(route, method, params){
            var self=this;
            var dispatchEvent=this.dispatchEvent;
            var success = false;
            var routes=Router.routes;
            /* routes should be case insensitive */
            route=route.toLowerCase();
            routes.forEach(function(obj,index){
                var body={};
                var query={};
                var route_ = obj.route;
                /* routes should be case insensitive */
                route_=route_.toLowerCase();
                var routePath=Location.toPath(route);
                var rule = url.match(route_);
                var data = rule.parse(routePath);

                if ((data != null) && (obj.method.toLowerCase() === method.toLowerCase()) &&(!success)) {
                    if(method.toLowerCase()!='get'){
                        body=url.body(data);
                    }
                    /* query component */
                    query=url.query(route);

                    //populate the array of route handlers
                    var handlers = [];
                    var fn = self.next(data,body,query,routePath);
                    handlers.push(fn);

                    var callbacks = obj.handle;
                    for (var i = 0; i < callbacks.length; i++) {
                        handlers.push(callbacks[i]);
                    }

                    //emit the dispatch event
                    var data_={
                        route:routePath,
                        handlers:handlers
                    };

                    Event.emit(dispatchEvent,data_);
                    success = true;
                }

            });

            return success;

            /**
             * parses a location hashtag
             * if hashTag is set and location has hashtag but registered route does not, trim hashtag from location
             * @param route {String}  the registered route
             * @param location {String} the triggered route
             * @returns {*}
             */
            function parseHashTag(route,location){
                if(window.elliptical.$hashTag){
                    if((location).charAt(1) ==='#'){
                       if((route).charAt(1) !== '#'){
                           location=location.substring(2);
                       }
                    }
                }
                return location;
            }
        },

        next: function(params, body,query, route){
            return function (req, res, next) {
                res.statusCode = 200;
                req.params = params;
                req.query=query;
                req.route = route;
                req.body = body;
                next();
            }
        },

        error: function(req, res, next){
            res.statusCode = 404;
            var err = 'Page does not exist';
            next();
        }

    },{});

    /* replaces the native window.location object */
    var Location=Class.extend({
        "@class":'Location',

        /**
         * if hashTag bit is set, adds a hashtag to the route, if not already present
         * @param route {String}
         * @returns {String}
         */
        hashify:function(route){
            var virtualRoot=Router.virtualRoot;
            var isVirtual=(virtualRoot !== '/');
            if(Router.hashTag && isVirtual){
                if(route.indexOf(virtualRoot) !==0){
                    route=virtualRoot + route;
                }
                var index=virtualRoot.length;
                if((route).charAt(index + 1) !== '#'){
                    route=utils.stringInsertAt(route,index,'/#');
                }
            }else if(Router.hashTag){
                if((route).charAt(1) !== '#'){
                    route='/#' + route;
                }
            }else if(isVirtual){
                if(route.indexOf(virtualRoot) !==0){
                    route=virtualRoot + route;
                }
            }


            return route;
        },

        /**
         * if hashTag bit is set, removes the leading hashtag from the route
         * @param route {String}
         * @returns {String}
         */
        deHashify:function(route){
            var virtualRoot=Router.virtualRoot;
            if(virtualRoot !=='/'){
                if(route.indexOf(virtualRoot)===0){
                    route=route.replace(virtualRoot,'');
                }
            }
            if(Router.hashTag){
                if((route).charAt(1) === '#'){
                    route=route.substring(2);
                }
            }
            return route;
        },

        hashRoot:function(route){
            if(Router.hashTag && route.slice(-1)==='#'){
                route+='/';
                return route;
            }else{
                return route;
            }
        },

        /**
         * replaces location.path, favtoring out virtual root and hashtag
         * @returns {string}
         */
        path:function(){
            var hashTag=window.elliptical.$hashTag;
            var virtualRoot=window.elliptical.$virtualRoot;
            var path;
            if(hashTag){
                path=location.hash;
                if((path).charAt(0) ==='#'){
                    path=path.substring(1);
                }
                if(path===''){
                    path='/';
                }
                path=this.toPath(path);
            }else{
                path=location.pathname;
                if(virtualRoot!=='/' ){
                    if(path.indexOf(virtualRoot)===0){
                        path=path.replace(virtualRoot,'');
                    }
                }
            }

            return path;

        },

        toPath:function(route){
            var rte=route.split('?');
            return rte[0];
        },

        /**
         * triggers a registered route
         * @param route {String}
         */
        redirect:function(route){
            //note: application.js will overwrite this if History enabled
            location.href=route;
        },

        /**
         * reloads the current route
         */
        reload:function(){
            //note: application.js will overwrite this if History enabled
            location.reload();
        },

        url:url,
        href:location.href,
        host:location.host,
        hostname:location.hostname,
        origin:location.origin,
        protocol:location.protocol,
        port:location.port,
        search:location.search



    },{});

    var Router = Class.extend({
        "@class":'Router',
        validMethods:['get','post','put','delete'],
        enabled:false,
        debug:true,
        callbacks:[],
        routes:[],
        virtualRoot:'/',
        hashTag:false,
        messageQueue:[],


        get:function(route,callbacks){
            this.parseMethod('get',route,callbacks);
        },

        post:function(route,callbacks){
            this.parseMethod('post',route,callbacks);
        },

        put:function(route,callbacks){
            this.parseMethod('put',route,callbacks);
        },

        delete:function(route,callbacks){
            this.parseMethod('delete',route,callbacks);
        },

        parseMethod:function(method,route,callbacks){
            if(!_.contains(this.validMethods,method)){
                return false;
            }
            var handlers = [];
            if ('string' != typeof route) {
                route = '/';
            }
            var args = Array.prototype.slice.call(arguments, 0);
            for (var i = 0; i < args.length; i++) {
                if (typeof args[i] === 'function') {
                    handlers.push(args[i]);
                }
            }
            if (args.length < 1) {
                console.log('error adding route: "' + route + '".  A route must have at least one handler function.')
            } else {
                Route.add(method, route, handlers);
            }

        },

        remove:function(route, method){
            if (!this.enabled) {
                return false;
            }
            Route.remove(route, method);
        },

        removeAll:function(){
            var self=this;
            if (!this.enabled) {
                return false;
            }
            this.routes.forEach(function(obj){
                self.remove(obj.route,obj.method);
            });
        },

        location: function(route, method,params, delay){
            if (!this.enabled) {
                return false;
            }
            if(typeof params==='undefined'){
                params={};
            }
            route=url.sanitize(route);
            route=Location.hashRoot(route);

            var stateObj = { route: route, params: params, method: method };
            History.stateObject = stateObj;
            History.pushHistory = true;

            if (typeof delay != 'undefined') {
                setTimeout(function () {
                    Route.location(route,method,params);
                }, delay);
            } else {
                Route.location(route, method, params);
            }
        },




        start:function(){
            if (this.enabled) {    /* if already started, exit */
                return false;
            }
            this.enabled = true;
            History.start();
            Listener.on();
            if (this.debug) {
                var msg = 'Router has started in debug mode';
                console.log(msg);
                this.messageQueue.forEach(function(m){
                    console.log(m);
                });
                this.messageQueue.length=0;
            }
        },


        pause: function(){
            this.enabled=false;
            Listener.off();
        },

        resume:function(){
            this.enabled=false;
            Listener.on();
        },

        history:function(pages, delay){
            if (typeof delay != 'undefined') {
                setTimeout(function () {
                    if (typeof pages === 'undefined') {
                        window.history.back();
                    } else {
                        window.history.go(pages);
                    }

                }, delay);
            } else {
                if (typeof pages === 'undefined') {
                    window.history.back();
                } else {
                    window.history.go(pages);
                }
            }
        },

        end: function(){
            this.enabled=false;
            this.routes=[];
            History.end();
            Listener.off();
        },

        /**
         * set Route event provider and event name
         * @param $event {Object}
         * @param eventName {String}
         */
        $provider:function($event,eventName){
            if(typeof $event==='string'){
                Route.dispatchEvent=eventName;
            }else if(typeof $event !== 'undefined'){
                Event=$event;
                if(typeof eventName==='string'){
                    Route.dispatchEvent=eventName;
                }
            }
        },

        /* configure Listener/Event settings */
        configure:function(opts){
            if(opts.request){
                Listener.events.request=opts.request;
            }
            if(opts.orientation){
                Listener.events.orientation=opts.orientation;
            }
            if(opts.click){
                Listener.events.click=opts.click;
            }
            if(opts.backButtonSelector){
                Listener.backButtonSelector=opts.backButtonSelector;
            }
            if(opts.dispatchEvent){
                Route.dispatchEvent=opts.dispatchEvent;
            }
            /* reset Listener */
            Listener.reset();
        }


    },{});


    Router.Location=Location;


    return Router;
}));

/*
 * =============================================================
 * elliptical.middleware.authorization v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * none
 *
 * elliptical http authorization middleware
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        root.elliptical.middleware = root.elliptical.middleware || {};
        root.elliptical.middleware.authorization=factory();
        root.returnExports = root.elliptical.middleware.authorization;
    }
}(this, function () {

    return function authorization(callback) {
        return function authorization(req, res, next) {
            try{
                var app=req.app,
                    locations=app.locations,
                    acl=null,
                    authenticate=true,
                    utils=app.utils;

                var route=req._parsedUrl.pathname;

                for(var i=0;i<locations.length;i++){
                    if(utils.strLastNChars(locations[i].path,2)==='**'){
                        var location=utils.trimLastNChars(locations[i].path,2);
                        if(route.toLowerCase().indexOf(location.toLowerCase())===0){
                            acl=locations[i];
                            break;
                        }
                    }else if(route.toLowerCase()===locations[i].path.toLowerCase()){
                        acl=locations[i];
                        break;
                    }
                }

                if(acl){
                    var exclude=acl.exclude;
                    for(var i=0;i<exclude.length;i++){
                        if(utils.strLastNChars(exclude[i],2)==='**'){
                            var check=utils.trimLastNChars(exclude[i],2);
                            if(route.toLowerCase().indexOf(check.toLowerCase())===0){
                                authenticate=false;
                                break;
                            }
                        }else if(route.toLowerCase()===exclude[i].toLowerCase()){
                            authenticate=false;
                            break;
                        }
                    }
                    if(authenticate){
                        req.location=route;
                        if(callback){
                            callback(req,res,next);
                        }else{
                            next();
                        }
                    }else{
                        next();
                    }
                }else{
                    next();
                }
            }catch(ex){
                next(ex);
            }
        }
    };
}));


/*
 * =============================================================
 * elliptical.middleware.globalCallback v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * none
 *
 * simple callback middleware
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        root.elliptical.middleware = root.elliptical.middleware || {};
        root.elliptical.middleware.globalCallback=factory();
        root.returnExports = root.elliptical.middleware.globalCallback;
    }
}(this, function () {

    return function globalCallback(callback) {
        return function globalCallback(req, res, next) {
            try{
                if(!req.context){
                    req.context={};
                }
                if(callback){
                    callback(req,res,next);
                }else{
                    next();
                }
            }catch(ex){
                next(ex);
            }
        }
    };

}));

/*
 * =============================================================
 * elliptical.middleware.http404 v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * none
 *
 * elliptical http 404 error middleware
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        root.elliptical.middleware = root.elliptical.middleware || {};
        root.elliptical.middleware.http404=factory();
        root.returnExports = root.elliptical.middleware.http404;
    }
}(this, function () {

    return function http404(template,callback) {
        return function http404(req, res, next) {
            if(typeof template==='undefined' || typeof template==='function'){
                if(typeof template==='function'){
                    callback=template;
                }
                template = 'http-status';
            }

            var app=req.app;
            var STRINGS=app.settings.STRINGS;
            var _404;
            if(STRINGS && STRINGS._404){
                _404=STRINGS._404;
            }else{
                _404={
                    statusCode:404,
                    message:'Page Not Found',
                    description:'The resource you are looking for could have been removed, had its name changed, or is temporarily unavailable.  Please review the following URL and make sure that it is spelled correctly.'
                };
            }

            if(callback){
                callback(_404,req,res,next,function(err_,req_,res_,next){
                    render_(err_,req_,res_);
                });
            }else{
                render_(_404,req,res);
            }



            function render_(error,request,response){
                response.context.statusCode = error.statusCode;
                response.context.message = error.message;
                response.context.description = error.description;
                response.context.url = request.url;

                response.render(template, response.context);
            }

        }
    }


}));


/*
 * =============================================================
 * elliptical.middleware.http404 v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * none
 *
 * elliptical http 404 error middleware
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        root.elliptical.middleware = root.elliptical.middleware || {};
        root.elliptical.middleware.httpError=factory();
        root.returnExports = root.elliptical.middleware.httpError;
    }
}(this, function () {

    return function httpError(template,callback) {
        return function httpError(err,req, res, next) {
            if(typeof template==='undefined' || typeof template==='function'){
                if(typeof template==='function'){
                    callback=template;
                }
                template = 'http-status';
            }
            var e={};
            if(err.stack){
                e.statusCode=500;
                e.description=err.stack;
                e.message='Internal Server Error';
            }else{
                e.statusCode=err.statusCode;
                e.description=err.description;
                e.message=err.message;
            }

            if(callback){
                callback(e,req,res,next,function(err_,req_,res_,next){
                    render_(err_,req_,res_);
                });
            }else{
                render_(e,req,res);
            }

        };

        function render_(error,request,response){
            response.context.statusCode=error.statusCode;
            response.context.description=error.description;
            response.context.message=error.message;
            response.context.url=request.url;
            response.render(template, response.context);
        }
    }


}));


/*
 * =============================================================
 * elliptical.middleware.logonIdentity v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * none
 *
 * simple callback middleware
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        root.elliptical.middleware = root.elliptical.middleware || {};
        root.elliptical.middleware.logonIdenity=factory();
        root.returnExports = root.elliptical.middleware.logonIdentity;
    }
}(this, function () {

    return function logonIdentity(tokenKey,identityTokenKey,callback) {
        return function logonIdentity(req, res, next) {
            try{
                var identity;
                if(req.cookies[tokenKey] && req.cookies[identityTokenKey] && !req.session.membership){
                    identity=req.cookies[identityTokenKey];
                    identity=JSON.parse(identity);
                    var identityToken=identity.authToken;
                    callback.call(this,req.cookies[tokenKey],identityToken,req,res,next);
                }else if(req.cookies[identityTokenKey]){
                    identity=req.cookies[identityTokenKey];
                    identity=JSON.parse(identity);

                    res.context.adminIdentity=identity;
                    //console.log(res.context.adminIdentity);
                }
                next();
            }catch(ex){
                next(ex);
            }
        }
    };

}));

/*
 * =============================================================
 * elliptical.middleware.service v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * none
 *
 * elliptical service injection middleware
 * assigns response,request objects as properties to passed services(and the services' providers)
 * and passes the services to a created services array on the request object
 *
 * In this way services are made global to the application(routes or controller actions) and service providers
 * have access to the real-time req,res objects
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        root.elliptical.middleware = root.elliptical.middleware || {};
        root.elliptical.middleware.service=factory();
        root.returnExports = root.elliptical.middleware.service;
    }
}(this, function () {

    return function service() {
        var args = [].slice.call(arguments);
        return function service(req, res, next) {
            req.services=[];
            req.service=function(name){
                var obj_=null;
                var model=null;
                if(req.services && req.services.length > 0){
                    req.services.forEach(function(obj){
                        if(obj.name===name){
                            obj_=obj.service;
                        }else if(obj.name==='Model'){
                            model=obj.service.extend({},{}); //if model, extend it so that each is a separate copy
                            model["@class"]=name;
                        }
                    });
                }
                return (obj_) ? obj_ : model;
            };

            try{
                for(var i=0;i<args.length;i++){
                    var name=(args[i]["@class"]);
                    if(!name){
                        if(args[i].constructor && args[i].constructor["@class"]){
                            name=args[i].constructor["@class"];
                        }else{
                            name='Model';
                        }
                    }
                    args[i].req=req;
                    args[i].res=res;
                    if(args[i].$provider){
                        args[i].$provider.req=req;
                        args[i].$provider.res=res;
                    }
                    req.services.push({
                        name:name,
                        service:args[i]
                    });
                }
                next();

            }catch(ex){
                next(ex);
            }
        }
    }

}));

/*
 * =============================================================
 * elliptical.middleware.sessionSync v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-utils
 *
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils'], factory);
    } else {
        root.elliptical.middleware = root.elliptical.middleware || {};
        root.elliptical.middleware.sessionSync=factory(root.elliptical);
        root.returnExports = root.elliptical.middleware.sessionSync;
    }
}(this, function (utils) {
    var _=utils._;
    return function sessionSync() {
        return function sessionSync(req, res, next) {
            try{
                if(typeof window !=='undefined'){
                    var session= sessionStorage.getItem('sessionStore');

                    if(session){
                        session=JSON.parse(session);
                        _.defaults(req.session,session);
                    }
                }

                var Session=req.service('Session');
                Session.get(function(err,data){
                    if(data){
                        try{
                            _.defaults(req.session,data);
                        }catch(ex){

                        }
                    }
                    next();
                });


            }catch(ex){
                next(ex);
            }
        }
    };

}));

/*!
 * jQuery Cookie Plugin v1.3.1
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2013 Klaus Hartl
 * Released under the MIT license
 */



(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as anonymous module.
        define(['jquery'], factory);
    }else if (typeof module === 'object' && module.exports) {
        //CommonJS module

        if(typeof window!='undefined'){
            factory($);
        }

    } else {
        // Browser globals.
        factory($);
    }
}(function ($) {

    var pluses = /\+/g;

    function raw(s) {
        return s;
    }

    function decoded(s) {
        return decodeURIComponent(s.replace(pluses, ' '));
    }

    function converted(s) {
        if (s.indexOf('"') === 0) {
            // This is a quoted cookie as according to RFC2068, unescape
            s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        try {
            return config.json ? JSON.parse(s) : s;
        } catch(er) {}
    }

    var config = $.cookie = function (key, value, options) {

        // write
        if (value !== undefined) {
            options = $.extend({}, config.defaults, options);

            if (typeof options.expires === 'number') {
                var days = options.expires, t = options.expires = new Date();
                t.setDate(t.getDate() + days);
            }

            value = config.json ? JSON.stringify(value) : String(value);

            return (document.cookie = [
                config.raw ? key : encodeURIComponent(key),
                '=',
                config.raw ? value : encodeURIComponent(value),
                options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
                options.path    ? '; path=' + options.path : '',
                options.domain  ? '; domain=' + options.domain : '',
                options.secure  ? '; secure' : ''
            ].join(''));
        }

        // read
        var decode = config.raw ? raw : decoded;
        var cookies = document.cookie.split('; ');
        var result = key ? undefined : {};
        for (var i = 0, l = cookies.length; i < l; i++) {
            var parts = cookies[i].split('=');
            var name = decode(parts.shift());
            var cookie = decode(parts.join('='));

            if (key && key === name) {
                result = converted(cookie);
                break;
            }

            if (!key) {
                result[name] = converted(cookie);
            }
        }

        return result;
    };

    config.defaults = {};

    $.removeCookie = function (key, options) {
        if ($.cookie(key) !== undefined) {
            // Must not alter options, thus extending a fresh object...
            $.cookie(key, '', $.extend({}, options, { expires: -1 }));
            return true;
        }
        return false;
    };

    return $;

}));



/*
 * =============================================================
 * elliptical.providers.$cookie v0.9.0.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'),require('./cookie'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc','./cookie'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.providers=root.elliptical.providers || {};
        root.elliptical.providers.$cookie = factory(root.elliptical);
        root.returnExports = root.elliptical.providers.$cookie;
    }
}(this, function (elliptical) {

    var $cookie=elliptical.Provider.extend({


        /**
         *
         * @param key {String}
         * @returns {Object}
         */

        get:function(key){
            return (typeof key==='undefined') ? $.cookie() : $.cookie(key);
        },

        /**
         *
         * @param params {Object}
         * @returns {Object}
         */
        post:function(params){
            var name=params.key;
            var value=params.value;
            var options=params.options;
            return $.cookie(name, value, options);
        },

        /**
         *
         * @param params {Object}
         * @returns {Object}
         */
        put:function(params){
            var name=params.key;
            var value=params.value;
            var options=params.options;
            return $.cookie(name, value, options);
        },

        /**
         *
         * @param key {String}
         * @returns {Object}
         */
        delete:function(key){
            return $.removeCookie(key);
        }

    },{});



    return $cookie;

}));



/*
 * =============================================================
 * elliptical.providers.$identity v0.9.0.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-mvc
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.providers=root.elliptical.providers || {};
        root.elliptical.providers.$identity = factory(root.elliptical);
        root.returnExports = root.elliptical.providers.$identity;
    }
}(this, function (elliptical) {

    var $identity=elliptical.Provider.extend({
        tokenKey:'authToken',
        identityTokenKey:'authIdentity',

        on:function(token,profile,callback){
            var req=this.req,
                res=this.res,
                session=req.session,
                membership=session.membership;

            var err=null;
            if(!membership){
                err.statusCode=401;
                err.message='No membership object available';
                callback(err,null);
            }else{
                //store current profile in cookie
                var aI={};
                aI.authToken=req.cookies[this.tokenKey];
                aI.profile=membership.profile;
                aI.roles=membership.roles;
                console.log(aI);
                res.cookie(this.identityTokenKey,JSON.stringify(aI));
                console.log(this.tokenKey);
                console.log(token);
                //set impersonated profile
                res.cookie(this.tokenKey,token);
                membership.profile=profile;

                callback(err,null);
            }
        },

        off:function(callback){
            var req=this.req,
                res=this.res,
                session=req.session,
                membership=session.membership;
            var err=null;
            if(!membership){
                err.statusCode=401;
                err.message='No membership object available';
                callback.call(this,err,null);
            }else{
                //restore profile
                var identity=req.cookies[this.identityTokenKey];
                identity=JSON.parse(identity);
                var authToken=identity.authToken;
                res.cookie(this.tokenKey,authToken);

                //delete cookie reference
                res.clearCookie(this.identityTokenKey);

                callback(err,identity);
            }
        },

        setKeys:function(params){
            if(typeof params.tokenKey !=='undefined'){
                this.tokenKey=params.tokenKey;
            }
            if(typeof params.identityTokenKey !=='undefined'){
                this.identityTokenKey=params.identityTokenKey;
            }
        }


    },{});



    return $identity;

}));


/*
 * =============================================================
 * elliptical.providers.$memory v0.9.0.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'),require('elliptical-utils'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc','elliptical-utils'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.providers=root.elliptical.providers || {};
        root.elliptical.providers.$memory = factory(root.elliptical,root.elliptical.utils);
        root.returnExports = root.elliptical.providers.$memory;
    }
}(this, function (elliptical,utils) {
    var async=elliptical.async;
    var _=utils._;

    var $memory=elliptical.Provider.extend({

        store: [],
        /* the memory store: an array of key/value pairs
         store=[obj1,obj2,...objN], where obj[i]={key:<key>,val:<val>}
         */

        index:[]
        /* array of index objects that contain the keys for each model type
         index=[obj1,obj2,...objN], where obj[i]={model:<model>,keys:<[key1,key2,...keyM]>}
         */


    },{
        /* prototype methods */

        /**
         *
         * @param params {Object}
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        get: function(params,model,callback){
            var id=params.id;
            if(typeof id==='undefined'){
                /* get all */
                this.getAll(model,function(err,data){
                    if(callback){
                        callback(err,data);
                    }
                });
            }else{
                /* get by id */
                this.getByKey(id,function(err,data){
                    if(callback){
                        callback(err,data);
                    }
                });
            }
        },



        /**
         *
         * @param key {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        getByKey: function (key, callback) {
            var store = this.constructor.store;
            var err = null;
            var val;

            try {
                for (var i = 0; i < store.length; i++) {
                    if (store[i].key === key) {
                        val = store[i].val;
                        break;
                    }
                }

                if (typeof val === 'undefined') {
                    err={
                        statusCode:404,
                        message:'key does not exist'
                    };

                    val = null;
                }

                if (callback) {

                    callback(err, val);

                }else{
                    return val;
                }
            } catch (ex) {
                if (callback) {
                    callback(ex, null);
                }
            }

        },

        /**
         *
         * @param keys {Array}
         * @param fn {Function}
         * @returns fn
         * @public
         */
        mget: function (keys, fn) {
            var err = null;
            var vals = [];
            var self = this;
            try {
                var length = keys.length;
                if (length > 0) {

                    async.forEach(keys, function (key, callback) {
                        self.getByKey(key, function (err, val) {
                            if (!err) {
                                vals.push(val);
                                callback(); //inform async that the iterator has completed
                            } else {
                                throw new Error(err);
                            }

                        });

                    }, function (err) {
                        if (!err) {
                            if (fn) {
                                fn(err, vals);
                            }
                        } else {
                            if (fn) {
                                fn(err, []);
                            }
                        }

                    });
                } else {
                    if (fn) {
                        err={
                            statusCode:400,
                            message:'invalid keys'
                        };
                        //err = 'invalid keys';
                        fn(err, []);
                    }
                }
            } catch (ex) {
                if (fn) {
                    fn(ex, []);
                }
            }
        },

        /**
         *
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        getAll:function(model,callback){
            var index=this.constructor.index;
            var modelIndex=_getModelIndex(model,index);
            var keyArray=modelIndex.keys;

            this.mget(keyArray,function(err,data){
                if(callback){
                    callback(err,data);
                }
            })

        },

        /**
         * returns the entire array store
         * @param callback {Function}
         * @public
         */
        list: function(callback){
            var store=this.constructor.store;
            if(callback){
                callback(null,store);
            }
        },

        /**
         *
         * @param params {Object}
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        post: function(params,model,callback){
            var id=utils.guid();
            params.id=id;
            this.set(id,params,model,function(err,data){
                if(callback){
                    callback(err,data);
                }
            });

        },

        /**
         *
         * @param params {Object}
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        put: function(params,model,callback){
            var id=params.id;
            this.set(id,params,model,function(err,data){
                if(callback){
                    callback(err,data);
                }
            });
        },




        /**
         *
         * @param key {String}
         * @param val {Object}
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        set: function (key, val, model, callback) {

            var store = this.constructor.store;
            var index = this.constructor.index;
            var err = null;
            //if object already exists, then we merge val with the old object to get a new object, delete the old object, insert the new object
            try {
                var obj=_validateKey(key,model, store,index);
                var oVal={};
                if(!obj){
                    oVal=val;
                }else{
                    oVal=_.extend(obj, val);

                }
                var cacheObj = {
                    key: key,
                    val: oVal
                };

                store.push(cacheObj);

                if (callback) {
                    callback(err, val);
                }
            } catch (ex) {
                if (callback) {
                    callback(ex, {});
                }
            }

        },

        /**
         *
         * @param pairArray {Array}
         * @param model {String}
         * @param fn {Function}
         * @returns fn
         * @public
         */
        mset: function (pairArray,model, fn) {
            var err = null;
            var vals = [];
            var self = this;
            try {
                var length = pairArray.length;
                if (length > 0 && length % 2 === 0) {
                    var list=_createObjectList(pairArray);
                    async.forEach(list, function (item, callback) {
                        self.set(item.key,item.val,model, function (err, val) {
                            if (!err) {
                                vals.push(val);
                                callback(); //inform async that the iterator has completed
                            } else {
                                throw new Error(err);
                            }

                        });

                    }, function (err) {
                        if (!err) {
                            if (fn) {
                                fn(err, vals);
                            }
                        } else {
                            if (fn) {
                                fn(err, []);
                            }
                        }

                    });
                } else {
                    if (fn) {
                        err={
                            statusCode:400,
                            message:'invalid keys'
                        };
                        fn(err, []);
                    }
                }
            } catch (ex) {
                if (fn) {
                    fn(ex, []);
                }
            }
        },

        /**
         *
         * @param key {String}
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        remove: function (key,model, callback) {
            var store = this.constructor.store;
            var index=this.constructor.index;
            var err = null;

            try {
                _removeKeyFromIndex(key,model,index);
                _deleteKey(key, store);
                if (callback) {
                    callback(null);
                }
            } catch (ex) {
                if (callback) {
                    callback(ex);
                }
            }

        },



        /**
         *
         * @param params {Object}
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        delete: function(params,model,callback){
            var id=params.id;
            this.remove(id,model,function(err,data){
                if(callback){
                    callback(err,data);
                }
            });
        },



        flushModel:function(model,callback){
            var index = this.constructor.index;
            var modelIndex=_getModelIndex(model,index);
            try{
                if(!modelIndex){
                    if(callback){
                        return callback(null,null);
                    }
                }
                var keyArray=modelIndex.keys;
                for (var i = 0, max = keyArray.length; i < max; i++) {
                    var key=keyArray[i];
                    _deleteKey(key);
                }
                _removeModelIndex(model,index);
                if(callback){
                    callback(null,null);
                }
            }catch(ex){
                if(callback){
                    callback(err,null);
                }
            }


        },

        /**
         * clears the entire store and index
         * @param callback {Function}
         * @returns callback
         * @public
         */
        flushAll: function (callback) {
            var store = this.constructor.store;
            var index = this.constructor.index;
            var err = null;

            try {
                store.splice(0, store.length);
                index.splice(0, index.length);
                if (callback) {
                    callback(null);
                }
            } catch (ex) {
                if (callback) {
                    callback(ex);
                }
            }

        },

        /**
         *
         * @param callback {Function}
         * @returns callback
         * @public
         */
        length: function (callback) {
            var store = this.constructor.store;
            var err = null;

            try {
                var length = store.length;
                if (callback) {
                    callback(err, length);
                }
            } catch (ex) {
                if (callback) {
                    callback(ex, 0);
                }
            }

        },



        /**
         *
         * @param params {Object}
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        query: function(params,model,callback){
            throw new Error('query not implemented');
        },

        /**
         *
         * @param params {Object}
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        command: function(params,model,callback){
            throw new Error('command not implemented');
        }



    });

    /**
     *  validates a key against the store index
     *
     *  get model index
     *  if exists
     *    check if key exists,
     *    if key exists, delete object from store
     *     return obj
     *    else, insert key into index
     *     return null
     *  else
     *    create model index
     *    insert key
     *    return null
     *
     * @param key {String}
     * @param model {String}
     * @param store {Array}
     * @param index {Array}
     * @returns {Object}\null
     * @private
     */

    function _validateKey(key, model,store,index) {
        var obj=_getModelIndex(model,index);
        if(obj){
            if(_isModelIndexKey(key,obj)){
                return _deleteKey(key,store);
            }else{
                _insertModelIndexKey(key,obj);
                return null;
            }

        }else{
            _createModelIndex(key,model,index);
            return null;
        }

    }


    /**
     * get the model index
     * @param model {String}
     * @param index {Array}
     * @returns {Object}|null
     * @private
     */
    function _getModelIndex(model,index){
        var obj=null;
        for (var i = 0, max = index.length; i < max; i++) {
            if (index[i].model === model) {
                obj=index[i];
                break;
            }
        }
        return obj;
    }


    /**
     * is the key already indexed
     * @param key {String}
     * @param modelIndex {Object}
     * @returns {boolean}
     * @private
     */
    function _isModelIndexKey(key,modelIndex){
        var keyArray=modelIndex.keys;
        var exists=false;
        for (var i = 0, max = keyArray.length; i < max; i++) {
            if (keyArray[i] === key) {
                exists=true;
                break;
            }
        }
        return exists;
    }


    /**
     * insert a new modelIndex
     * @param key {String}
     * @param model {String}
     * @param index {Array}
     * @private
     */
    function _createModelIndex(key,model,index){
        var newModelIndex={};
        newModelIndex.model=model;
        newModelIndex.keys=[];
        newModelIndex.keys.push(key);
        index.push(newModelIndex);
    }


    /**
     * delete key/val pair object from the store
     * returns the deleted object
     * @param key {String}
     * @param store {Array}
     * @returns {Object}
     * @private
     */
    function _deleteKey(key, store) {
        var obj=null;
        for (var i = 0, max = store.length; i < max; i++) {
            if (store[i].key === key) {
                obj=store[i].val;
                store.splice(i, 1);
                break;
            }
        }

        return obj;
    }

    function _removeKeyFromIndex(key,model,index){
        var modelIndex=_getModelIndex(model,index);
        var keyArray=modelIndex.keys;
        for (var i = 0, max = keyArray.length; i < max; i++) {
            if (keyArray[i] === key) {
                keyArray.splice(i, 1);
                break;
            }
        }
    }

    /**
     * inserts key into the model index
     * @param key {String}
     * @param modelIndex {Object}
     * @private
     */
    function _insertModelIndexKey(key,modelIndex){
        var keyArray=modelIndex.keys;
        keyArray.push(key);
    }

    /**
     * remove the model index from the index
     * @param model {String}
     * @param index {Array}
     */
    function _removeModelIndex(model,index){
        for (var i = 0, max = index.length; i < max; i++) {
            if (index[i].model === model) {
                index.splice(i,1);
                break;
            }
        }
    }


    /**
     * create an array of objects from a pairArray
     * @param pairArray
     * @returns {Array}
     * @private
     */
    function _createObjectList(pairArray){
        var objArray=[];
        for (var i = 0, max = pairArray.length; i < max; i++) {
            if(i===0 || i%2===0){
                var obj={};
                obj.key=pairArray[i];
                var j=i+1;
                obj.val=pairArray[j];
                objArray.push(obj);
            }
        }

        return objArray;
    }



    return $memory;

}));



/*
 * =============================================================
 * elliptical.providers.$odata v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.providers=root.elliptical.providers || {};
        root.elliptical.providers.$odata = factory(root.elliptical);
        root.returnExports = root.elliptical.providers.$odata;
    }
}(this, function (elliptical) {

    var $odata=elliptical.Provider.extend({

        filter:function(endpoint,filter){
            var encodedFilter = '$filter=' + encodeURIComponent(filter);
            return (endpoint.indexOf('?') > -1) ? '&' + encodedFilter : '?' + encodedFilter;
        },

        orderBy:function(endpoint,orderBy){
            var encodedOrderBy = '$orderby=' + encodeURIComponent(orderBy);
            return (endpoint.indexOf('?') > -1) ? '&' + encodedOrderBy : '?' + encodedOrderBy;
        },

        top:function(endpoint,top){
            var encodedTop = '$top=' + top;
            return (endpoint.indexOf('?') > -1) ? '&' + encodedTop : '?' + encodedTop;
        },

        skip:function(endpoint,skip){
            var encodedSkip = '$skip=' + skip;
            return (endpoint.indexOf('?') > -1) ? '&' + encodedSkip : '?' + encodedSkip;
        },

        paginate:function(endpoint,params){
            var page=params.page,
                pageSize=params.pageSize,
                skip,
                encodedPaginate;

            if(typeof page==='undefined' || typeof pageSize==='undefined'){
                return endpoint;
            }else{
                page--;
                skip=page*pageSize;
                encodedPaginate=(skip > 0) ? '$skip=' + skip + '&$top=' + pageSize + '&$inlinecount=allpages' : '$top=' + pageSize + '&$inlinecount=allpages';
                return (endpoint.indexOf('?') > -1) ? '&' + encodedPaginate : '?' + encodedPaginate;
            }
        }

    },{});

    return $odata;


}));



/*
 * =============================================================
 * elliptical.providers.$pagination v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 *
 * returns a pagination ui context(object) for template binding
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.providers=root.elliptical.providers || {};
        root.elliptical.providers.$pagination=factory(root.elliptical);
        root.returnExports = root.elliptical.providers.$pagination;
    }
}(this, function (elliptical) {
    /**
     * @param paginate {Object}
     * @param pagination {Object}
     * @param data {Object}
     * @returns {Object}
     */

    var $pagination=elliptical.Provider.extend({
        count:'count',
        data:'data',
        spread:10,

         get:function(params,data){

             var count_=this.count;
             var data_=this.data;
             var spread_=this.spread;

             if(params.paginate){
                 var filter=params.filter;
                 var orderBy=params.orderBy;
                 params=params.paginate;
                 if(filter !== undefined){
                     params.filter=filter;
                 }
                 if(orderBy !== undefined){
                     params.orderBy=orderBy;
                 }
;             }

             return _pagination(params,data);

             /**
              *
              * @param params {Object}
              * @param result {Object}
              *
              * @returns {Object}
              * @qpi private
              */
             function _pagination(params,result) {
                 var baseUrl,page,count,pageSize,pageSpread,data;
                 baseUrl=params.baseUrl;
                 page=params.page;

                 count=result[count_];
                 data=result[data_];

                 pageSize=params.pageSize;
                 pageSpread=spread_;
                 try {
                     page = parseInt(page);
                 } catch (ex) {
                     page = 1;
                 }

                 var pageCount = parseInt(count / pageSize);
                 var remainder=count % pageSize;
                 if(pageCount < 1){
                     pageCount=1;
                 }else if(remainder > 0){
                     pageCount++;
                 }

                 //pagination object
                 var pagination = {
                     page: page,
                     pageCount: pageCount,
                     prevPage: baseUrl,
                     prevClass: 'hide',
                     nextPage: baseUrl,
                     nextClass: 'hide',
                     pages: [],
                     count:count

                 };
                 //assign pagination properties
                 //prev
                 if (page > 1) {
                     pagination.prevClass = '';
                     pagination.prevPage = assignUrl(baseUrl,parseInt(page - 1),params);
                 }
                 //next
                 if (page < pageCount) {
                     pagination.nextClass = '';
                     pagination.nextPage = assignUrl(baseUrl,parseInt(page + 1),params);
                 }

                 //get page links

                 if (pageCount > 1) {
                     pagination.pages = _pageLinks(baseUrl, page, pageCount,pageSpread,params);

                 }

                 return{
                     pagination:pagination,
                     data:data
                 };

             }


             /**
              *
              * @param baseUrl {String}
              * @param page {Number}
              * @param pageCount {Number}
              * @param pageSpread {Number}
              * @returns {Array}
              * @api private
              */
             function _pageLinks(baseUrl, page, pageCount,pageSpread,params) {
                 var pages = [];
                 if (pageSpread > pageCount) {
                     pageSpread = pageCount;
                 }

                 if (page <= pageSpread) {

                     for (var i = 0; i < pageSpread; i++) {
                         var obj = {
                             page: i + 1,
                             pageUrl:assignUrl(baseUrl,parseInt(i + 1),params)
                         };

                         if (i === parseInt(page - 1)) {
                             obj.activePage = 'active';
                         }
                         pages.push(obj);
                     }
                     return pages;
                 } else {
                     var halfSpread = parseInt(pageSpread / 2);
                     var beginPage, endPage;
                     if (pageCount < page + halfSpread) {
                         endPage = pageCount;
                         beginPage = endPage - pageSpread;
                     } else {
                         endPage = page + halfSpread;
                         beginPage = page - halfSpread;
                     }
                     for (var i = beginPage; i < endPage + 1; i++) {
                         var obj = {
                             page: i,
                             pageUrl:assignUrl(baseUrl,i,params)
                         };
                         if (i === page) {
                             obj.activePage = 'active';
                         }
                         pages.push(obj);
                     }
                     return pages;
                 }
             }

             function assignUrl(baseUrl,index,params){
                 var isFiltered=false;
                 var pageUrl=baseUrl + '/' + index;
                 if(params.filter){
                     isFiltered=true;
                     pageUrl+='?' + '$filter=' + encodeURIComponent(params.filter);
                 }
                 if(params.orderBy){
                     pageUrl+=(isFiltered) ? '&$orderby=' + encodeURIComponent(params.orderBy) : '?$orderby=' + encodeURIComponent(params.orderBy);
                 }

                 return pageUrl;
             }

         }


    },{});


    return $pagination;


}));


/*
 * =============================================================
 * elliptical.providers.$rest v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-mvc
 * elliptical-http
 * $odata
 *
 * rest provider
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'),require('elliptical-http'),require('../odata/odata'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc','elliptical-http','../odata/odata'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.providers=root.elliptical.providers || {};
        root.elliptical.providers.$rest = factory(root.elliptical,root.elliptical.http,root.elliptical.$odata);
        root.returnExports = root.elliptical.providers.$rest;
    }
}(this, function (elliptical,http,odata) {
    var factory=elliptical.factory;
    var async=elliptical.async;

    var $rest=elliptical.Provider.extend({
        _data:null,
        port: null,
        path: null,
        host: null,
        protocol:null,
        $queryProvider:odata,
        onSend: null,

        /**
         * constructor
         * @param opts {Object}
         * @param $queryProvider {Object}
         */
        init:function(opts,$queryProvider){
            this.host=opts.host || 'locahost';
            this.port = opts.port || 80;
            this.path = opts.path || '/api';
            this.protocol=opts.protocol || 'http';

            if($queryProvider !== undefined){
                this.$queryProvider=$queryProvider;
            }
        },

        /**
         * http get
         * @param params {Object}
         * @param model {String}
         * @param query {Object}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        get: function (params, model, query,callback) {
            if(typeof query ==='function'){
                callback=query;


            }

            var options=this._getOptions(model,'GET',undefined);

            var q = '';
            var i = 0;
            for (var key in params) {
                if (params.hasOwnProperty(key)) {
                    var val = encodeURIComponent(params[key]);
                    if (i === 0) {
                        q+='?' + key + '=' + val;
                        i++;
                    } else {
                        q+='&' + key + '=' + val;
                    }
                }
            }
            if (q !== '') {
                options.path+='/' + q;
            }

            //test query options
            if(typeof query.filter !== 'undefined'){
                options.path += this.$queryProvider.filter(options.path,query.filter);
            }

            if(typeof query.orderBy !== 'undefined'){
                options.path += this.$queryProvider.orderBy(options.path,query.orderBy);
            }

            if(typeof query.paginate !== 'undefined'){
                options.path += this.$queryProvider.paginate(options.path,query.paginate);
            }else{
                //don't allow mixing of paginate with skip/top since paginate is more or less a convenience wrapper for skip & top
                if(typeof query.skip !== 'undefined'){
                    options.path += this.$queryProvider.skip(options.path,query.skip);
                }

                if(typeof query.top !== 'undefined'){
                    options.path += this.$queryProvider.top(options.path,query.top);
                }
            }

            //send
            this._send(options,model,callback);

        },

        /**
         * http post
         * @param params {Object}
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        post: function (params, model, callback) {
            var options = this._getOptions(model,'POST',params);
            this._send(options,model,callback);

        },

        /**
         * non-standard http implementation of a "merge"
         * @param params {Object}
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        patch: function (params, model, callback) {
            throw new Error('patch not implemented');
        },


        /**
         * http put
         * @param params {Object}
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        put: function (params, model,callback) {
            var options = this._getOptions(model,'PUT',params);
            this._send(options,model,callback);
        },


        /**
         * http delete
         * @param params {Object}
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        delete: function (params, model, callback) {
            var options=this._getOptions(model,'DELETE',undefined);
            var q = '';
            var i = 0;
            for (var key in params) {
                if (params.hasOwnProperty(key)) {
                    var val = encodeURIComponent(params[key]);
                    if (i === 0) {
                        q+= '?' + key + '=' + val;
                        i++;
                    } else {
                        q+='&' + key + '=' + val;
                    }
                }
            }
            if (q != '') {
                options.path+= '/' + q;
            }
            //send
            this._send(options,model,callback);
        },



        /**
         * non-standard http implementation of a sql query
         * @param params {Object}
         * @param model {String}
         * @param opts {Object}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        query: function (params, model,opts, callback) {
            throw new Error('query not implemented');
        },


        /**
         * non-standard http implementation of a sql command
         * @param params {Object}
         * @param model {String}
         * @param opts {Object}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        command: function (params, model,opts, callback) {
            throw new Error('command not implemented');
        },


        /**
         * send the request
         * @param options {Object}
         * @param model {String}
         * @param callback {Function}
         * @returns callback
         * @private
         */
        _send:function(options,model,callback){

            /* we asynchronously pass through to _onAuthenticate and _onSend(if a callback has been defined)
               using the async waterfall pattern before passing off to http.
               Note: _onAuthenticate should be implemented by extending the $rest provider and overwriting the current
               method which does nothing but pass through. You can also implement authentication by relying on the _onSend
               callback, which does pass up the request object, if available.
               ex:
                  $myRestProvider.onSend=function(req, options, model,callback){
                      options.authorization=http.encodeSessionToken(req.cookies.authToken);
                      callback.call(this,null,options);
                  };

                  pass the options object back as the data param in the callback
             */
            var req=this.req || {};
            var funcArray=[];
            var onAuth=factory.partial(this._onAuthentication,options,model).bind(this);
            funcArray.push(onAuth);
            if(typeof this.onSend==='function'){
                var onSendCallback=this.onSend;
                var onSend=factory.partial(this._onSend,onSendCallback,req,model).bind(this);
                funcArray.push(onSend);
            }
            async.waterfall(funcArray,function(err,result){
                (err) ? callback(err,null) : http.send(result,callback);
            });

        },

        /**
         * set authorization/authentication on the request; implement by extending the $rest provider and class
         * and overwriting the method, returning options in the callback
         * @param options {Object}
         * @param model {String}
         * @param callback {Function}
         * @private
         */
        _onAuthentication:function(options,model,callback){
            if(callback){
                callback.call(this,null,options);
            }
        },


        /**
         * calls an onSend provided callback, if defined
         * @param fn {Function}
         * @param req {Object}
         * @param model {String}
         * @param options {Object}
         * @param callback {Function}
         * @private
         */
        _onSend: function (fn,req,model,options,callback) {
            fn.call(this,req, options, model, callback);
        },

        /**
         * constructs the request options object
         * @param method {String}
         * @param model {String}
         * @param data {Object}
         * @returns {Object}
         * @private
         */
        _getOptions:function(model,method,data){
            var options = {};
            options.host = this.host;
            options.port = this.port;
            options.method = method;
            options.path = this.path;
            options.path = options.path + '/' + model;
            options.protocol=this.protocol;
            if(data && data !==undefined){
                options.data=data;
            }
            return options;
        }


    });



    return $rest;

}));





/*
 * =============================================================
 * elliptical.providers.session.$cookie v0.9.0.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'),require('../cookie/cookie'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc','../cookie/cookie'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.providers=root.elliptical.providers || {};
        root.elliptical.providers.$session=root.elliptical.providers.$session || {};
        root.elliptical.providers.$session.$cookie = factory(root.elliptical);
        root.returnExports = root.elliptical.providers.$session.$cookie;
    }
}(this, function (elliptical) {

    var $cookie=elliptical.Provider.extend({
        key:'sessionStore',

        /**
         * @param params {Object}
         * @param callback {Function}
         * @returns {Object}
         */

        get:function(params,callback){
            var key=(params.key===undefined) ? this.key : params.key;
            var session=$.cookie(key);
            session=(typeof session !== 'undefined') ? JSON.parse(session) : {};
            if(callback){
                return callback(null,session);
            }else{
                return session;
            }
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         * @returns {Object}
         */
        put:function(params,callback){
            var key=(params.key===undefined) ? this.key : params.key;
            var session=(typeof params.session==='object') ? JSON.stringify(params.session) : params.session;
            $.cookie(key, session, {path:'/'});
            if(callback){
                callback(null,session);
            }else{
                return session;
            }
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         * @returns {*}
         */
        delete:function(params,callback){
            var key=(params.key===undefined) ? this.key : params.key;
            $.removeCookie(key);
            if(callback){
                callback(null,null);
            }
        },

        $setKey:function(key){
            this.key=key;
        }

    },{});



    return $cookie;

}));


/*
 * =============================================================
 * elliptical.providers.session.$local v0.9.0.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.providers=root.elliptical.providers || {};
        root.elliptical.providers.session=root.elliptical.providers.session || {};
        root.elliptical.providers.session.$local = factory(root.elliptical);
        root.returnExports = root.elliptical.providers.session.$local;
    }
}(this, function (elliptical) {

    var $local=elliptical.Provider.extend({
        key:'sessionStore',

        /**
         * @param params {Object}
         * @param callback {Function}
         * @returns {Object}
         */
        get:function(params,callback){
            var key=(params===undefined || params.key===undefined) ? this.key : params.key;
            var session=localStorage.getItem(key);
            try{
                session=JSON.parse(session);
            }catch(ex){
                session={};
            }

            if(callback){
                callback(null,session);
            }else{
                return session;
            }
        },

        /**
         * @param params {Object}
         * @param callback {Function}
         * @returns {Object}
         */
        put:function(params,callback){
            var key=(params===undefined || params.key===undefined) ? this.key : params.key;
            var session=(typeof params.session==='object') ? JSON.stringify(params.session) : params.session;
            localStorage.setItem(key,session);
            if(callback){
                callback(null,session);
            }else{
                return session;
            }
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         * @returns {*}
         */
        delete:function(params,callback){
            var key=(params===undefined || params.key===undefined) ? this.key : params.key;
            localStorage.removeItem(key);
            if(callback){
                callback(null,null);
            }
        },

        $setKey:function(key){
            this.key=key;
        }


    },{});



    return $local;

}));




/*
 * =============================================================
 * elliptical.providers.session.$storage v0.9.0.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.providers=root.elliptical.providers || {};
        root.elliptical.providers.session=root.elliptical.providers.session || {};
        root.elliptical.providers.session.$storage = factory(root.elliptical);
        root.returnExports = root.elliptical.providers.session.$storage;
    }
}(this, function (elliptical) {

    var $storage=elliptical.Provider.extend({
        key:'sessionStore',

        /**
         * @param params {Object}
         * @param callback {Function}
         * @returns {Object}
         */
        get:function(params,callback){
            var key=(params===undefined || params.key===undefined) ? this.key : params.key;
            var session=sessionStorage.getItem(key);
            try{
                session=JSON.parse(session);
            }catch(ex){
                session={};
            }

            if(callback){
                callback(null,session);
            }else{
                return session;
            }
        },

        /**
         * @param params {Object}
         * @param callback {Function}
         * @returns {Object}
         */
        put:function(params,callback){
            var key=(params===undefined || params.key===undefined) ? this.key : params.key;
            var session=(typeof params.session==='object') ? JSON.stringify(params.session) : params.session;
            sessionStorage.setItem(key,session);
            if(callback){
                callback(null,session);
            }else{
                return session;
            }
        },

        /**
         *
         * @param params {Object}
         * @param callback {String}
         * @returns {*}
         */
        delete:function(params,callback){
            var key=(params===undefined || params.key===undefined) ? this.key : params.key;
            sessionStorage.removeItem(key);
            if(callback){
                callback(null,null);
            }
        },

        $setKey:function(key){
            this.key=key;
        }


    },{});



    return $storage;

}));



/*
 * =============================================================
 * elliptical.providers.$template v0.9.0.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'),require('elliptical-utils'),require('elliptical-dustjs'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc','elliptical-utils','elliptical-dustjs'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.providers=root.elliptical.providers || {};
        root.elliptical.providers.$template = factory(root.elliptical,dust);
        root.returnExports = root.elliptical.providers.$template;
    }
}(this, function (elliptical,utils,dust) {

    var _=utils._;
    dust.optimizers.format = function (ctx, node) {
        return node;
    };

    var $template=elliptical.Provider.extend({
        _data: {},

        $store: null,

        base: {
            server: 'base',
            client: 'base-client'
        },

        $provider: dust,

        compile: dust.compile,

        cache: dust.cache,

        model: 'template',

        api: '/api/template',

        namespace:null,


        /**
         *
         * @returns {String}
         * @public
         */
        getBase: function () {
            return (utils.isBrowser()) ? this.base.client : this.base.server;

        },

        /**
         *
         * @param opts {Object}
         */
        $setOpts: function(opts){
            if(opts){
                if(typeof opts.model !== 'undefined'){
                    this.model=opts.model;
                }
                if(typeof opts.api !== 'undefined'){
                    this.api=opts.api;
                }
                if(typeof opts.base !== 'undefined'){
                    this.base=opts.base;
                }
            }
        },

        $setProvider:function($provider){
            this.$provider=$provider;

        },

        /**
         *
         * @param template {String}
         * @param context {Object}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        render: function (template, context, callback) {
            var $provider=this.$provider;
            var cache=$provider.cache;

            if (_.isEmpty(cache)){
                _loadTemplateCacheFromStore(this.model,this.$store,this.$provider,this.api,function(){
                    $provider.render(template,context,function(err,out){
                        if(callback){
                            callback(err,out);
                        }
                    });
                });
            }else{
                $provider.render(template,context,function(err,out){
                    if(callback){
                        callback(err,out);
                    }
                });
            }
        },

        /**
         * set the provider as a global to the window object
         * on the browser side, if compiled templates are referenced in script tag, you'll need to set
         * a reference to dust on the window object
         */
        setBrowserGlobal:function(){
            if(typeof window != 'undefined'){
                window.dust=this.$provider;
            }
        }

    },{
        /**
         * new instance init
         * @param base {boolean}
         */
        init: function (base) {
            if (base) {
                this.constructor._data.base = true;
            }
        },

        /**
         * renders with a context base
         * use render method on template provider's prototype to mixin a base context
         *
         * @param template {String}
         * @param context {Object}
         * @param callback {Function}
         * @returns callback
         * @public
         */
        render: function (template, context, callback) {

            if (this.constructor._data.base) {
                var baseRender = {
                    render: this.constructor.getBase()
                };
                var base = this.constructor.$provider.makeBase(baseRender);
                context=base.push(context);
            }

            this.constructor.render(template,context,function(err,out){
                if(callback){
                    callback(err,out);
                }
            });
        }
    });

    /**
     * if template cache is empty, load it from the store or client-side, load it from scripts
     * @param model {String}
     * @param $store {Object}
     * @param $provider {Object}
     * @param api {String}
     * @param callback {Function}
     * @private
     */
    function _loadTemplateCacheFromStore(model, $store, $provider, api, callback) {
        if(!utils.isBrowser()){
            $store.getAll(model,function(err,data){
                for(var i= 0, max=data.length;i<max;i++){
                    var obj=JSON.parse(data[i]);
                    dust.loadSource(obj);
                }
                callback();
            });


        }else{

            //continue to query at intervals for cache to load from script
            var iterations=0;
            var process=new elliptical.Interval({
                delay:10
            });
            process.run(function(){
                checkCache($provider,process,iterations,callback);
            })
        }
    }

    function checkCache($provider,process,iterations,callback){
        var cache=$provider.cache;
        if(!utils._.isEmpty(cache)){
            process.terminate();
            if(callback){
                callback();
            }
        }else{
            if(iterations > 1000){
                process.terminate();
                if(callback){
                    callback();
                }
            }else{
                iterations++;
            }
        }
    }


    return $template;

}));


/*
 * =============================================================
 * elliptical.providers.$transitions v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        if(typeof window !=='undefined'){
            module.exports = factory(require('elliptical-mvc'),require('ellipsis-animation'));
        }

    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc','ellipsis-animation'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.providers=root.elliptical.providers || {};
        root.elliptical.providers.$transitions=factory(root.elliptical);
        root.returnExports = root.elliptical.providers.$transitions;
    }
}(this, function (elliptical) {
    var _selector='[data-placeholder="content"]';
    if($('html').hasClass('customelements')){
        //_selector='ui-content-placeholder';
    }

    var Transitions=elliptical.Provider.extend({

        render:function(selector,html,transition,callback){
            var element=$(selector);

            if(transition !== 'none'){
                _transitionOut(function(){
                    element.html(html);
                    element.show();
                    _transitionIn(function(){

                    })
                });

            }else{
                element.html(html);
                if(callback){
                    callback.call(this);
                }
            }



            function _transitionOut(callback){
                var opts = {};
                opts.duration=300;
                opts.preset='fadeOut';

                element.transition(opts, function () {
                    callback.call(element[ 0 ]);

                });
            }

            function _transitionIn(callback){
                var opts = {};
                opts.duration=300;
                opts.preset=transition;
                var element_=$(_selector);
                element_.transition(opts, function () {
                    callback.call(element_[ 0 ]);

                });
            }
        }


    },{});

    return Transitions;
}));


/*
 * =============================================================
 * elliptical.providers.$validation v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.providers=root.elliptical.providers || {};
        root.elliptical.providers$validation=factory(root.elliptical);
        root.returnExports = root.elliptical.providers.$validation;
    }
}(this, function (elliptical) {

    var $validation=elliptical.Provider.extend({

        schemas:[],

        submitLabel:'submitLabel',

        successMessage:'Successfully Submitted...',

        post: function (form,name,callback) {
            var err = null;
            var schema = this.getSchema(name);
            for (var key in schema) {
                if (schema.hasOwnProperty(key)) {
                    if (schema[key].required && (typeof form[key] === 'undefined' || form[key] === '')) {
                        form[key + '_placeholder'] = 'Required...';
                        form[key + '_error'] = 'error';
                        if(!err){
                            err=this.error();
                        }
                    }else if(schema[key].confirm){
                        if(form[key] && form['confirm' + key]){
                            if(form[key] != form['confirm' + key]){
                                form[key + '_placeholder'] = 'Does Not Match...';
                                form[key + '_error'] = 'error';
                                form['confirm' + key + '_placeholder'] = 'Does Not Match...';
                                form['confirm' + key + '_error'] = 'error';
                                if(!err){
                                    err=this.error();
                                }
                            }
                        }
                    }else if(schema[key].validate && typeof schema[key].validate==='function' && form[key]){
                        var msg=schema[key].validate(form);
                        if(msg){
                            form[key + '_placeholder'] = msg;
                            form[key + '_error'] = 'error';
                            form[key]='';
                            if(!err){
                                err=this.error();
                            }
                        }
                    }
                }
            }
            if(err){
                form=this.addSubmitLabel(form,false);
                callback(err,form);
            }else{
                form=this.deleteProperties(form);
                callback(null,form);
            }


        },

        onError:function(form,msg){
            form=this.addSubmitLabel(form,msg,false);
            return form;
        },

        onSuccess:function(form){
            form=this.addEmptySubmitLabel(form);
            return form;
        },

        getSchema: function (name) {
            var schema = null;
            for (var i = 0; i < this.schemas.length; i++) {
                if (this.schemas[i].name.toLowerCase() === name.toLowerCase()) {
                    schema = this.schemas[i].schema;
                    break;
                }
            }
            return schema;
        },

        error:function(msg){
            if(typeof msg==='undefined'){
                msg='Form Submission Error';
            }
            var err={};
            err.message=msg;
            err.css='error';
            err.cssDisplay='visible';
            return err;
        },

        addSubmitLabel:function(form,msg,valid){
            if(typeof valid==='undefined'){
                valid=msg;
                msg=undefined;
            }
            var obj;
            if(valid){
                obj=this.success();
            }else{
                obj=this.error(msg);
            }
            form[this.submitLabel]=obj;
            return form;
        },

        addEmptySubmitLabel:function(form){
            form[this.submitLabel]=this.emptyLabelObject();
            return form;
        },

        success:function(){
            var msg={};
            msg.message=this.successMessage;
            msg.css='success';
            msg.cssDisplay='visible';
            return msg;
        },

        emptyLabelObject:function(){
            var msg={};
            msg.message='&nbsp;';
            msg.css='';
            msg.cssDisplay='';
            return msg;
        },

        deleteProperties:function(form){
            for (var key in form) {
                if (form.hasOwnProperty(key)) {
                    if(form['confirm' + key]){
                        delete form['confirm' + key];
                    }
                    if(form['confirm' + key + '_placeholder']){
                        delete form['confirm' + key + '_placeholder'];
                    }
                    if(form['confirm' + key + '_error']){
                        delete form['confirm' + key + '_error'];
                    }
                    if(form[key + '_placeholder']){
                        delete form[key + '_placeholder'];
                    }
                    if(form[key + '_error']){
                        delete form[key + '_error'];
                    }
                }
            }

            return form;
        }

    },{});

    return $validation;
}));



/*
 * =============================================================
 * elliptical.services.Cookie v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'),require('elliptical-providers'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc','elliptical-providers'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.services=root.elliptical.services || {};
        root.elliptical.services.Log=factory(root.elliptical,root.elliptical.providers);
        root.returnExports = root.elliptical.services.Cookie;
    }
}(this, function (elliptical,providers) {

    var $cookie=providers.$cookie;
    var Cookie=elliptical.Service.extend({
        '@class':'Cookie', //{String}
        $provider:$cookie,

        get:function(key){
            return this.$provider.get(key);
        },

        post:function(params){
            return this.$provider.post(params);
        },

        put:function(params){
            return this.$provider.put(params);
        },

        delete:function(key){
            return this.$provider.delete(key);
        }



    },{});

    return Cookie;



}));
/*
 * =============================================================
 * elliptical.services.Identity v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-mvc,elliptical.providers.$identity
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'),require('elliptical-providers'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc','elliptical-providers'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.services=root.elliptical.services || {};
        root.elliptical.services.Identity=factory(root.elliptical,root.elliptical.providers);
        root.returnExports = root.elliptical.services.Identity;
    }
}(this, function (elliptical,providers) {

    var $identity=providers.$identity;

    var Identity=elliptical.Service.extend({
        '@class':'Identity', //{String}
        $provider:$identity,

        on:function(token,profile,callback){
            this.$provider.on(token,profile,callback);
        },

        off:function(callback){
            this.$provider.off(callback);
        },

        setKeys:function(params){
            this.$provider.setKeys(params);
        }


    },{});

    return Identity;



}));

/*
 * =============================================================
 * elliptical.services.Log v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-mvc
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.services=root.elliptical.services || {};
        root.elliptical.services.Log=factory(root.elliptical);
        root.returnExports = root.elliptical.services.Log;
    }
}(this, function (elliptical) {

    var Log=elliptical.Service.extend({
        '@class':'Log' //{String}



    },{});

    return Log;



}));

/*
 * =============================================================
 * elliptical.services.Membership v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-mvc
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.services=root.elliptical.services || {};
        root.elliptical.services.Membership=factory(root.elliptical);
        root.returnExports = root.elliptical.services.Membership;
    }
}(this, function (elliptical) {


    var Membership = elliptical.Service.extend({
        '@class':'Membership', //{String}


        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        login: function(params,callback){
            if(!this.$provider.login){
                throw new Error('login method not implemented');
            }
            this.$provider.login(params,callback);
        },

        authenticate:function(params,callback){
            if(!this.$provider.authenticate){
                throw new Error('authenticate method not implemented');
            }
            this.$provider.authenticate(params,callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        resetPassword: function(params,callback){
            if(!this.$provider.resetPassword){
                throw new Error('resetPassword method not implemented');
            }
            this.$provider.resetPassword(params,callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        changePassword: function(params,callback){
            if(!this.$provider.changePassword){
                throw new Error('changePassword method not implemented');
            }
            this.$provider.changePassword(params,callback);
        },

        /**
         *
         * @param callback {Function}
         */
        logout: function(callback){
            if(!this.$provider.logout){
                throw new Error('logout method not implemented');
            }
            this.$provider.logout(callback);
        },

        /**
         * @param params {Object}
         * @param callback {Function}
         */
        signUp: function(params,callback){
            if(!this.$provider.signUp){
                throw new Error('signUp method not implemented');
            }
            this.$provider.signUp(params,callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        roleExists: function(params,callback){
            if(!this.$provider.roleExists){
                throw new Error('roleExists method not implemented');
            }
            this.$provider.roleExists(params,callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        isUserInRole: function(params,callback){
            if(!this.$provider.isUserInRole){
                throw new Error('isUserInRole method not implemented');
            }
            this.$provider.isUserInRole(params,callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        isUserInRoles: function(params,callback){
            if(!this.$provider.isUserInRoles){
                throw new Error('isUserInRoles method not implemented');
            }
            this.$provider.isUserInRoles(params,callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        getRolesForUser: function(params,callback){
            if(!this.$provider.getRolesForUser){
                throw new Error('getRolesForUser method not implemented');
            }
            this.$provider.getRolesForUser(params,callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        addUserToRole: function(params,callback){
            if(!this.$provider.addUserToRole){
                throw new Error('addUserToRoles method not implemented');
            }
            this.$provider.addUserToRole(params,callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        removeUserFromRole: function(params,callback){
            if(!this.$provider.removeUserFromRole){
                throw new Error('removeUserFromRoles method not implemented');
            }
            this.$provider.removeUserFromRole(params,callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        getUsersInRole: function(params,callback){
            if(!this.$provider.getUsersInRole){
                throw new Error('getUsersInRole method not implemented');
            }
            this.$provider.getUsersInRole(params,callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        createRole: function(params,callback){
            if(!this.$provider.createRole){
                throw new Error('createRole method not implemented');
            }
            this.$provider.createRole(params,callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        deleteRole: function(params,callback){
            if(!this.$provider.deleteRole){
                throw new Error('deleteRole method not implemented');
            }
            this.$provider.deleteRole(params,callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        isAuthenticated: function(params,callback){
            if(!this.$provider.isAuthenticated){
                throw new Error('isAuthenticated method not implemented');
            }
            if(params===undefined && callback===undefined){
                return this.$provider.isAuthenticated(params,callback);
            }else{
                this.$provider.isAuthenticated(params,callback);
            }
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        profile: function(params,callback){
            if(!this.$provider.profile){
                throw new Error('profile method not implemented');
            }
            this.$provider.profile(params,callback);
        }



    },{

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        login: function(params,callback){
            var data = this._data;
            (typeof params==='function') ? callback=params : data=params;
            this.constructor.login(data, callback);
        },

        /**
         *
         * @param params {object}
         * @param callback {Function}
         */
        signUp:function(params,callback){
            var data = this._data;
            (typeof params==='function') ? callback=params : data=params;
            this.constructor.signUp(data, callback);
        },

        /**
         *
         *
         * @param callback {Function}
         */
        logout: function(callback){
            this.constructor.logout(callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        roleExists: function(params,callback){
            var data = this._data;
            (typeof params==='function') ? callback=params : data=params;
            this.constructor.roleExists(data, callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        isUserInRole: function(params,callback){
            var data = this._data;
            (typeof params==='function') ? callback=params : data=params;
            this.constructor.isUserInRole(data, callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        isUserInRoles: function(params,callback){
            var data = this._data;
            (typeof params==='function') ? callback=params : data=params;
            this.constructor.isUserInRoles(data, callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        getRolesForUser: function(params,callback){
            var data = this._data;
            (typeof params==='function') ? callback=params : data=params;
            this.constructor.getRolesForUser(data, callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        addUserToRoles: function(params,callback){
            var data = this._data;
            (typeof params==='function') ? callback=params : data=params;
            this.constructor.addUserToRoles(data, callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        removeUserFromRoles: function(params,callback){
            var data = this._data;
            (typeof params==='function') ? callback=params : data=params;
            this.constructor.removeUserFromRoles(data, callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        getUsersInRole: function(params,callback){
            var data = this._data;
            (typeof params==='function') ? callback=params : data=params;
            this.constructor.getUsersInRole(data, callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        createRole: function(params,callback){
            var data = this._data;
            (typeof params==='function') ? callback=params : data=params;
            this.constructor.createRole(data, callback);
        },

        /**
         *
         * @param params {Object}
         * @param callback {Function}
         */
        deleteRole: function(params,callback){
            var data = this._data;
            (typeof params==='function') ? callback=params : data=params;
            this.constructor.deleteRole(data, callback);
        },

        profile:function(params,callback){
            var data = this._data;
            (typeof params==='function') ? callback=params : data=params;
            this.constructor.profile(data, callback);
        }

    });

    return Membership;


}));


/*
 * =============================================================
 * elliptical.services.Message v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-mvc
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.services=root.elliptical.services || {};
        root.elliptical.services.Message=factory(root.elliptical);
        root.returnExports = root.elliptical.services.Message;
    }
}(this, function (elliptical) {

    var Message=elliptical.Service.extend({
        '@class':'Message' //{String}



    },{});

    return Message;



}));

/*
 * =============================================================
 * elliptical.services.Role v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-mvc
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.services=root.elliptical.services || {};
        root.elliptical.services.Role=factory(root.elliptical);
        root.returnExports = root.elliptical.services.Role;
    }
}(this, function (elliptical) {

    var Role=elliptical.Service.extend({
        '@class':'Role' //{String}



    },{});

    return Role;



}));

/*
 * =============================================================
 * elliptical.services.Schema v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-mvc
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.services=root.elliptical.services || {};
        root.elliptical.services.Schema=factory(root.elliptical);
        root.returnExports = root.elliptical.services.Schema;
    }
}(this, function (elliptical) {

    var Schema=elliptical.Service.extend({
        '@class':'Schema' //{String}



    },{});

    return Schema;



}));

/*
 * =============================================================
 * elliptical.services.Session v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-mvc
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.services=root.elliptical.services || {};
        root.elliptical.services.Session=factory(root.elliptical);
        root.returnExports = root.elliptical.services.Session;
    }
}(this, function (elliptical) {


    var Session=elliptical.Service.extend({
        '@class':'Session', //{String}

        get:function(params,callback) {
            return this.$provider.get(params,callback);
        },

        put:function(params,callback){
            return this.$provider.put(params,callback);
        },

        delete:function(params,callback){
            return this.$provider.delete(params,callback);
        }


    },{

        init:function($provider){
            ($provider!==undefined) ? this.$provider=$provider : this.$provider=null;

        },

        get:function(params,callback) {
            var $provider=(this.$provider) ? this.$provider : this.constructor.$provider;
            return $provider.get(params,callback);
        },

        put:function(params,callback){
            var $provider=(this.$provider) ? this.$provider : this.constructor.$provider;
            return $provider.put(params,callback);
        },

        delete:function(params,callback){
            var $provider=(this.$provider) ? this.$provider : this.constructor.$provider;
            return $provider.delete(params,callback);
        }


    });

    return Session;


}));

/*
 * =============================================================
 * elliptical.services.Validation v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-mvc,elliptical-providers
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'),require('elliptical-providers'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc','elliptical-providers'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.services=root.elliptical.services || {};
        root.elliptical.services.Log=factory(root.elliptical,root.elliptical.providers);
        root.returnExports = root.elliptical.services.Validation;
    }
}(this, function (elliptical,providers) {
    var $validation=providers.$validation;

    var Validation=elliptical.Service.extend({
        '@class':'Validation', //{String},
        $provider:$validation,
        schemas:null,

        /**
         *
         * @param data {Object}
         * @param name {String}
         * @param callback {Function}
         */
        post:function(data,name,callback){
            this.$provider.schemas=this.schemas;
            this.$provider.post(data,name,callback);
        },

        /**
         *
         * @param data {Object}
         * @returns {Object}
         */
        onSuccess:function(data){
            return this.$provider.onSuccess(data);
        },

        /**
         *
         * @param data {Object}
         * @param msg {String}
         * @returns {Object}
         */
        onError:function(data,msg){
            return this.$provider.onError(data,msg);
        }



    },{});

    return Validation;



}));



/*
 * =============================================================
 * elliptical-delegate
 * =============================================================
 *
 * dependencies:
 *
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'),require('elliptical-event'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc','elliptical-event'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.Delegate = factory(root.elliptical,root.elliptical.Event);
        root.returnExports = root.elliptical.Delegate;
    }
}(this, function (elliptical,Event) {

    var Delegate=elliptical.Class.extend({
        bindings:null,

        init:function(bindings){
            this.bindings=bindings;

        },

        on:function(){
            var bindings=this.bindings;
            if(bindings && bindings.length){
                bindings.forEach(function(binding){
                    var eventName=binding.event;
                    var name=binding.delegate;
                    _bind(eventName,name);
                });
            }

            function _bind(eventName,name){
                $(document).on(eventName, '[delegate="'+ name +'"]', function (event) {
                    if (_validTarget(eventName,'delegate-target')) {
                        _handleEvent(event);
                    }

                });

                $(document).on(eventName, '[data-delegate="'+ name +'"]', function (event) {
                    if (_validTarget(event,'data-delegate-target')) {
                        _handleEvent(event);
                    }

                });
            }

            function _validTarget(event,attr){
                if(event.target===event.currentTarget){
                    return true;
                }else{
                    return ($(event.currentTarget).attr(attr)!==undefined);
                }
            }

            function _handleEvent(event) {
                var target = $(event.currentTarget);
                var evt,channel,camelCase;
                camelCase=false;
                if(target.attr('event')){
                    evt=target.attr('event');
                }else{
                    evt=target.attr('data-event');
                }
                if(target.attr('channel')){
                    channel=target.attr('channel');
                }else{
                    channel=target.attr('data-channel');
                }
                if(target.attr('camel-case')){
                    camelCase=target.attr('camel-case');
                }else if(target.attr('data-camel-case')){
                    camelCase=target.attr('data-camel-case');
                }

                /* pass the element attributes as the event data */
                var opts= $.element.getOpts(target[0],camelCase);
                //delete props channel and delegate-event
                if(opts.channel){
                    delete opts.channel;
                }
                if(opts.event){
                    delete opts.event;
                }
                if(opts.delegate){
                    delete opts.delegate;
                }
                if(opts.camelCase){
                    delete opts.camelCase;
                }

                opts.target=target[0];
                if (typeof channel !== 'undefined' && evt !== 'sync') {
                    Event.emit(channel + '.' + evt, opts);
                }
            }
        },

        off:function(){
            var bindings=this.bindings;
            if(bindings && bindings.length){
                bindings.forEach(function(binding){
                    var eventName=binding.event;
                    var name=binding.delegate;
                    _unbind(eventName,name);
                });
            }

            function _unbind(eventName,name){
                $(document).off(event, '[delegate="'+ name +'"]');
                $(document).on(eventName, '[data-delegate="'+ name +'"]');
            }
        }

    });

    return Delegate;


}));
/*
 * =============================================================
 * jQuery.browser
 * =============================================================
 *
 * replaces the deprecated jQuery.browser that has now been removed from jQuery 1.9+
 *
 *
 * Dependencies:
 * jQuery 2.0 +
 *
 *
 */
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function () {
    var browser = {};
    browser.mozilla = false;
    browser.webkit = false;
    browser.opera = false;
    browser.msie = false;

    var nAgt = navigator.userAgent;
    browser.name = navigator.appName;
    browser.fullVersion = '' + parseFloat(navigator.appVersion);
    browser.majorVersion = parseInt(navigator.appVersion, 10);
    var nameOffset, verOffset, ix;

// Opera
    if ((verOffset = nAgt.indexOf("Opera")) != -1) {
        browser.opera = true;
        browser.name = "Opera";
        browser.fullVersion = nAgt.substring(verOffset + 6);
        if ((verOffset = nAgt.indexOf("Version")) != -1)
            browser.fullVersion = nAgt.substring(verOffset + 8);
    }
// MSIE
    else if ((verOffset = nAgt.indexOf("MSIE")) != -1) {
        browser.msie = true;
        browser.name = "Microsoft Internet Explorer";
        browser.fullVersion = nAgt.substring(verOffset + 5);
    }
// Chrome
    else if ((verOffset = nAgt.indexOf("Chrome")) != -1) {
        browser.webkit = true;
        browser.name = "Chrome";
        browser.fullVersion = nAgt.substring(verOffset + 7);
    }
// Safari
    else if ((verOffset = nAgt.indexOf("Safari")) != -1) {
        browser.webkit = true;
        browser.name = "Safari";
        browser.fullVersion = nAgt.substring(verOffset + 7);
        if ((verOffset = nAgt.indexOf("Version")) != -1)
            browser.fullVersion = nAgt.substring(verOffset + 8);
    }
// Firefox
    else if ((verOffset = nAgt.indexOf("Firefox")) != -1) {
        browser.mozilla = true;
        browser.name = "Firefox";
        browser.fullVersion = nAgt.substring(verOffset + 8);
    }
// Other
    else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) <
        (verOffset = nAgt.lastIndexOf('/'))) {
        browser.name = nAgt.substring(nameOffset, verOffset);
        browser.fullVersion = nAgt.substring(verOffset + 1);
        if (browser.name.toLowerCase() === browser.name.toUpperCase()) {
            browser.name = navigator.appName;
        }
    }else if(nAgt.indexOf('Mozilla') !== -1 && nAgt.indexOf('Firefox')===-1){
        browser.msie = true;
        browser.name = "Internet Explorer";
        browser.fullVersion = '11';
    }
// trim the fullVersion string at semicolon/space if present
    if ((ix = browser.fullVersion.indexOf(";")) != -1)
        browser.fullVersion = browser.fullVersion.substring(0, ix);
    if ((ix = browser.fullVersion.indexOf(" ")) != -1)
        browser.fullVersion = browser.fullVersion.substring(0, ix);

    browser.majorVersion = parseInt('' + browser.fullVersion, 10);
    if (isNaN(browser.majorVersion)) {
        browser.fullVersion = '' + parseFloat(navigator.appVersion);
        browser.majorVersion = parseInt(navigator.appVersion, 10);
    }
    browser.version = browser.majorVersion;

    $.browser = $.browser || browser;

    return $;


}));




/*
 * =============================================================
 * jQuery.support
 * =============================================================
 *
 * almost all tests adopted from Modernizr
 *
 *
 *
 * Dependencies:
 * jQuery 2.0+
 *
 *
 */
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function () {
    var support = {},


        docElement = document.documentElement,

        mod = 'ellipsis',

        modElem = document.createElement(mod),

        mStyle = modElem.style,

        toString = {}.toString,

        prefixes = ' -webkit- -moz- -o- -ms- '.split(' '),

        omPrefixes = 'Webkit Moz O ms',

        cssomPrefixes = omPrefixes.split(' '),

        domPrefixes = omPrefixes.toLowerCase().split(' '),

        ns = {'svg':'http://www.w3.org/2000/svg'},

        classes = [],

        slice = classes.slice,

        featureName,
        injectElementWithStyles = function (rule, callback, nodes, testnames) {

            var style, ret, node, docOverflow,
                div = document.createElement('div'),
                body = document.body,
                fakeBody = body || document.createElement('body');

            if (parseInt(nodes, 10)) {
                while (nodes--) {
                    node = document.createElement('div');
                    node.id = testnames ? testnames[nodes] : mod + (nodes + 1);
                    div.appendChild(node);
                }
            }

            style = ['&#173;', '<style id="s', mod, '">', rule, '</style>'].join('');
            div.id = mod;
            (body ? div : fakeBody).innerHTML += style;
            fakeBody.appendChild(div);
            if (!body) {
                fakeBody.style.background = '';
                fakeBody.style.overflow = 'hidden';
                docOverflow = docElement.style.overflow;
                docElement.style.overflow = 'hidden';
                docElement.appendChild(fakeBody);
            }

            ret = callback(div, rule);
            if (!body) {
                fakeBody.parentNode.removeChild(fakeBody);
                docElement.style.overflow = docOverflow;
            } else {
                div.parentNode.removeChild(div);
            }

            return !!ret;

        },

        testMediaQuery = function (mq) {

            var matchMedia = window.matchMedia || window.msMatchMedia;
            if (matchMedia) {
                return matchMedia(mq).matches;
            }

            var bool;

            injectElementWithStyles('@media ' + mq + ' { #' + mod + ' { position: absolute; } }', function (node) {
                bool = (window.getComputedStyle ?
                    getComputedStyle(node, null) :
                    node.currentStyle)['position'] == 'absolute';
            });

            return bool;

        },



        _hasOwnProperty = ({}).hasOwnProperty, hasOwnProp;

    function setCss(str) {
        mStyle.cssText = str;
    }

    function setCssAll(str1, str2) {
        return setCss(prefixes.join(str1 + ';') + ( str2 || '' ));
    }

    function is(obj, type) {
        return typeof obj === type;
    }

    function contains(str, substr) {
        return !!~('' + str).indexOf(substr);
    }

    function testProps(props, prefixed) {
        for (var i in props) {
            var prop = props[i];
            if (!contains(prop, "-") && mStyle[prop] !== undefined) {
                return prefixed == 'pfx' ? prop : true;
            }
        }
        return false;
    }

    function testDOMProps(props, obj, elem) {
        for (var i in props) {
            var item = obj[props[i]];
            if (item !== undefined) {

                if (elem === false){
                    return props[i];
                }

                if (is(item, 'function')) {
                    return item.bind(elem || obj);
                }

                return item;
            }
        }
        return false;
    }

    function prefixed(prop, obj, elem) {
        if (!obj) {
            return testPropsAll(prop, 'pfx');
        } else {
            return testPropsAll(prop, obj, elem);
        }
    }

    function testPropsAll(prop, prefixed, elem) {

        var ucProp = prop.charAt(0).toUpperCase() + prop.slice(1),
            props = (prop + ' ' + cssomPrefixes.join(ucProp + ' ') + ucProp).split(' ');

        if (is(prefixed, "string") || is(prefixed, "undefined")) {
            return testProps(props, prefixed);

        } else {
            props = (prop + ' ' + (domPrefixes).join(ucProp + ' ') + ucProp).split(' ');
            return testDOMProps(props, prefixed, elem);
        }
    }



    //touch
    support.touch = testTouch();
    function testTouch() {
        var bool;

        if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
            bool = true;
        } else {
            injectElementWithStyles(['@media (', prefixes.join('touch-enabled),('), mod, ')', '{#ellipsis{top:9px;position:absolute}}'].join(''), function (node) {
                bool = node.offsetTop === 9;
            });
        }

        return bool;
    }

    //canvas
    support.canvas = testCanvas();
    function testCanvas() {
        var elem = document.createElement('canvas');
        return !!(elem.getContext && elem.getContext('2d'));

    }

    //geolocation
    support.geolocation = testGeolocation();
    function testGeolocation() {
        return 'geolocation' in navigator;
    }

    //history
    support.history = testHistory();
    function testHistory() {
        return !!(window.history && history.pushState);
    }

    //dragdrop
    support.dragdrop = testDragDrop();
    function testDragDrop() {
        var div = document.createElement('div');
        return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
    }

    //websockets
    support.websockets = testWebSockets();
    function testWebSockets() {
        return 'WebSocket' in window || 'MozWebSocket' in window;
    }

    //css3dtransforms
    support.css3dtransforms = testCSSTransform3d();
    function testCSSTransform3d() {
        var ret = !!testPropsAll('perspective');

        if (ret && 'webkitPerspective' in docElement.style) {

            injectElementWithStyles('@media (transform-3d),(-webkit-transform-3d){#ellipsis{left:9px;position:absolute;height:3px;}}', function (node, rule) {
                ret = node.offsetLeft === 9 && node.offsetHeight === 3;
            });
        }
        return ret;

    }

    //video
    support.video = testVideo();
    function testVideo() {
        var elem = document.createElement('video'),
            bool = false;

        try {
            if (bool = !!elem.canPlayType) {
                bool = new Boolean(bool);
                bool.ogg = elem.canPlayType('video/ogg; codecs="theora"').replace(/^no$/, '');

                bool.h264 = elem.canPlayType('video/mp4; codecs="avc1.42E01E"').replace(/^no$/, '');

                bool.webm = elem.canPlayType('video/webm; codecs="vp8, vorbis"').replace(/^no$/, '');
            }

        } catch (e) {
        }

        return bool;
    }

    //audio
    support.audio = testAudio();
    function testAudio() {
        var elem = document.createElement('audio'),
            bool = false;

        try {
            if (bool = !!elem.canPlayType) {
                bool = new Boolean(bool);
                bool.ogg = elem.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, '');
                bool.mp3 = elem.canPlayType('audio/mpeg;').replace(/^no$/, '');

                bool.wav = elem.canPlayType('audio/wav; codecs="1"').replace(/^no$/, '');
                bool.m4a = ( elem.canPlayType('audio/x-m4a;') ||
                    elem.canPlayType('audio/aac;')).replace(/^no$/, '');
            }
        } catch (e) {
        }

        return bool;
    }

    //localstorage
    support.localstorage = testLocalStorage();
    function testLocalStorage() {
        try {
            localStorage.setItem(mod, mod);
            localStorage.removeItem(mod);
            return true;
        } catch (e) {
            return false;
        }
    }

    //sessionstorage
    support.sessionstorage = testSessionStorage();
    function testSessionStorage() {
        try {
            sessionStorage.setItem(mod, mod);
            sessionStorage.removeItem(mod);
            return true;
        } catch (e) {
            return false;
        }
    }

    //web workers
    support.webworkers = testWebWorkers();
    function testWebWorkers() {
        return !!window.Worker;
    }

    //application cache
    support.applicationcache = testApplicationCache();
    function testApplicationCache() {
        return !!window.applicationCache;
    }

    //svg
    support.svg = testSVG();
    function testSVG() {
        return !!document.createElementNS && !!document.createElementNS(ns.svg, 'svg').createSVGRect;
    }

    //inline svg
    support.inlinesvg = testInlineSVG();
    function testInlineSVG() {
        var div = document.createElement('div');
        div.innerHTML = '<svg/>';
        return (div.firstChild && div.firstChild.namespaceURI) == ns.svg;
    }

    //svg clip paths
    support.svgclippaths = testSVGClipPaths();
    function testSVGClipPaths() {
        return !!document.createElementNS && /SVGClipPath/.test(toString.call(document.createElementNS(ns.svg, 'clipPath')));
    }

    //webkit background clip
    support.backgroundclip = testBackgroundClip();
    function testBackgroundClip() {

        if (/Android/.test(navigator.userAgent)) {
            return false;
        }
        var ele = document.createElement("ellipsis");
        var ret = ((typeof ele.style.webkitBackgroundClip !== 'undefined') && ( ele.style.webkitBackgroundClip = 'text'));
        var textSupport = ele.style.webkitBackgroundClip == 'text';
        return textSupport;

    }

    //content editable
    support.contenteditbale = testContentEditable();
    function testContentEditable() {
        return 'contentEditable' in document.documentElement;
    }

    //overflow scrolling
    support.overflowscrolling = testOverflowScrolling();
    function testOverflowScrolling() {
        return testPropsAll('overflowScrolling');
    }

    //css resize
    support.cssresize = testResize();
    function testResize() {
        return testPropsAll('resize');
    }

    //postmessage
    support.postmessage = testPostMessage();
    function testPostMessage() {
        return !!window.postMessage;
    }

    //dataview
    support.dataview = testDataView();
    function testDataView() {
        return (typeof DataView !== 'undefined' && 'getFloat64' in DataView.prototype);
    }

    //dataset
    support.dataset = testDataSet();
    function testDataSet() {
        var n = document.createElement("div");
        n.setAttribute("data-a-b", "c");
        return !!(n.dataset && n.dataset.aB === "c");
    }

    //progressbar
    support.progressbar = testProgressBar();
    function testProgressBar() {
        return document.createElement('progress').max !== undefined;
    }

    //meter
    support.meter = testMeter();
    function testMeter() {
        return document.createElement('meter').max !== undefined;
    }

    //filesystem
    support.filesystem = testFilesystem();
    function testFilesystem() {
        return !!prefixed('requestFileSystem', window);
    }

    //filereader
    support.filereader = testFileReader();
    function testFileReader() {
        return !!(window.File && window.FileList && window.FileReader);
    }

    //fullscreen
    support.fullscreen = testFullScreen();
    function testFullScreen() {
        for(var i = 0; i < domPrefixes.length; i++) {
            if( document[domPrefixes[i].toLowerCase() + 'CancelFullScreen']){
                return true;
            }

        }
        return !!document['cancelFullScreen'] || false;
    }

    //cors
    support.cors = testCors();
    function testCors() {
        return !!(window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest());
    }

    //battery
    support.battery = testBattery();
    function testBattery() {
        return !!prefixed('battery', navigator);
    }

    //low battery
    support.lowbattery = testLowBattery();
    function testLowBattery() {
        var minLevel = 0.20,
            battery = prefixed('battery', navigator);
        return !!(battery && !battery.charging && battery.level <= minLevel);
    }

    //flexbox
    support.flexbox=testFlexbox();
    function testFlexbox(){
        return testPropsAll('flexWrap');
    }

    //indexedDB
    support.indexeddb=testIndexedDB();
    function testIndexedDB(){
        return !!testPropsAll("indexedDB", window);
    }

    //hsla
    support.hsla=hsla();
    function hsla(){
        setCss('background-color:hsla(120,40%,100%,.5)');
        return contains(mStyle.backgroundColor, 'rgba') || contains(mStyle.backgroundColor, 'hsla');
    }

    //multiple backgrounds
    support.multiplebgs=multiplebgs();
    function multiplebgs(){
        setCss('background:url(https://),url(https://),red url(https://)');
        return (/(url\s*\(.*?){3}/).test(mStyle.background);
    }

    //css columns
    support.csscolumns=cssColumns();
    function cssColumns(){
        return testPropsAll('columnCount');
    }

    //css reflections
    support.cssreflections=cssReflections();
    function cssReflections(){
        return testPropsAll('boxReflect');
    }


    //form validation
    support.formvalidation = testFormValidation();
    function testFormValidation() {
        var form = document.createElement('form');
        if ( !('checkValidity' in form) ) {
            return false;
        }
        var body = document.body,

            html = document.documentElement,

            bodyFaked = false,

            invaildFired = false,

            input,

            formvalidationapi = true;

        // Prevent form from being submitted
        form.onsubmit = function(e) {
            //Opera does not validate form, if submit is prevented
            if ( !window.opera ) {
                e.preventDefault();
            }
            e.stopPropagation();
        };

        // Calling form.submit() doesn't trigger interactive validation,
        // use a submit button instead
        //older opera browsers need a name attribute
        form.innerHTML = '<input name="modTest" required><button></button>';

        // FF4 doesn't trigger "invalid" event if form is not in the DOM tree
        // Chrome throws error if invalid input is not visible when submitting
        form.style.position = 'absolute';
        form.style.top = '-99999em';

        // We might in <head> in which case we need to create body manually
        if ( !body ) {
            bodyFaked = true;
            body = document.createElement('body');
            //avoid crashing IE8, if background image is used
            body.style.background = "";
            html.appendChild(body);
        }

        body.appendChild(form);

        input = form.getElementsByTagName('input')[0];

        // Record whether "invalid" event is fired
        input.oninvalid = function(e) {
            invaildFired = true;
            e.preventDefault();
            e.stopPropagation();
        };

        //presto Opera does not fully support the validationMessage property
        var formvalidationmessage = !!input.validationMessage;

        // Submit form by clicking submit button
        form.getElementsByTagName('button')[0].click();

        // Don't forget to clean up
        body.removeChild(form);
        bodyFaked && html.removeChild(body);

        return invaildFired;
    }
    support.init=function(){
        var html=$('html');
        html.removeClass('no-js');
        html.addClass('js');
        var tests=['touch','canvas','svg','history','formvalidation','localstorage','sessionstorage','meter','backgroundclip','inlinesvg',
            'svgclippaths','css3dtransforms','video','audio','progressbar','cssresize','postmessage','overflowscrolling','flexbox',
            'indexeddb','hsla','multiplebgs','csscolumns','cssreflections'];

        tests.forEach(function(t){
            support[t] ? html.addClass(t) : html.addClass('no-' + t);
        });

        //old ie
        if($.browser && $.browser.msie){
            if($.browser.majorVersion===6){
                html.addClass('ie6');
            }else if($.browser.majorVersion===7){
                html.addClass('ie7');
            }else if($.browser.majorVersion===8){
                html.addClass('ie8');
            }
        }

    };

    support.stickyFooter=function(){
        if($.browser.msie){
            var stickyFooter=$('.ui-sticky-footer');
            if(stickyFooter[0]){
                stickyFooter.addClass('ns');
            }
        }


    };


    support.init();
    support.stickyFooter();
    $.support = $.support || {};
    $.extend($.support, support);

    return $;

}));




/*
 * =============================================================
 * jQuery.utils
 * =============================================================
 *
 *
 *
 * Dependencies:
 * jQuery 2.0+
 *
 *
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function () {
    var utils={};
    utils.datetime={

        isDate: function(obj){
            return (/Date/).test(Object.prototype.toString.call(obj)) && !isNaN(obj.getTime());
        },

        isLeapYear: function(year){
            return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
        },

        getDaysInMonth: function(year, month){
            return [31, this.isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
        },

        setToStartOfDay: function(date){
            if (this.isDate(date)) date.setHours(0,0,0,0);
        },

        compareDates: function(a,b){
            // weak date comparison (use setToStartOfDay(date) to ensure correct result)
            return a.getTime() === b.getTime();
        },

        /**
         *
         * @returns {string}
         */
        currentDate: function () {
            var currentDate = new Date();
            var day = currentDate.getDate();
            var month = currentDate.getMonth() + 1;
            var year = currentDate.getFullYear();
            return (month + '/' + day + '/' + year);
        }
    };

    utils.array={
        isArray: function(obj){
            return (/Array/).test(Object.prototype.toString.call(obj));
        }
    };

    utils.string={
        dashToCamelCase:function(s){
            return s.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
        },

        random:function(){
            return Math.floor((Math.random()*100000)+1).toString();
        }
    };

    utils.color={
        rgb2hex: function(rgb){
            if (  rgb.search("rgb") == -1 ) {
                return rgb;
            }
            else if ( rgb == 'rgba(0, 0, 0, 0)' ) {
                return 'transparent';
            }
            else {
                rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/);
                function hex(x) {
                    return ("0" + parseInt(x).toString(16)).slice(-2);
                }
                return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
            }
        }
    };

    utils.url={
        /**
         *
         * @param ji {String}
         * @returns {String}
         */
        queryString: function (ji) {
            var hu = window.location.search.substring(1);
            var gy = hu.split("&");
            for (i = 0; i < gy.length; i++) {
                var ft = gy[i].split("=");
                if (ft[0] == ji) {
                    return ft[1];
                }
            }
            return null;
        },

        /**
         *
         * @returns {Array}
         */
        queryStringObjectArray: function () {
            var arr = [];
            var hu = window.location.search.substring(1);
            var gy = hu.split("&");
            for (i = 0; i < gy.length; i++) {
                var ft = gy[i].split("=");
                if (ft[0] == ji) {
                    return ft[1];
                }
                var obj = {};
                obj.prop = ft[0];
                obj.val = ft[1];
                arr.push(obj);
            }

            return arr;
        },

        /**
         *
         * @returns {Array}
         */
        queryStringFilterArray: function () {
            var arr = [];
            var hu = window.location.search.substring(1);
            var gy = hu.split("&");
            for (i = 0; i < gy.length; i++) {
                var ft = gy[i].split("=");
                var obj = {};
                obj.filter = ft[0];
                obj.val = ft[1];
                if (obj.filter != '') {
                    arr.push(obj);
                }

            }

            return arr;
        }
    };

    utils.image={
        /**
         *
         * @param img {Object}
         * @param data {Object}
         * @returns {Object}
         */
        aspectRatio: function (img, data) {
            var width = img.width();
            var height = img.height();
            var aRatio = height / width;
            data.aspectRatio = aRatio;
            if (typeof data.height != 'undefined') {
                data.width = parseInt((1 / aRatio) * data.height);
            } else if (typeof data.width != 'undefined') {
                data.height = parseInt(aRatio * data.width);
            }

            return data;
        }
    };


    $.utils = $.utils || {};
    $.extend($.utils, utils);

    /* String/Number prototypes  */
    String.prototype.toCamelCase=function(){
        return this.replace(/[-_]([a-z])/g, function (g) { return g[1].toUpperCase(); });
    };
    String.prototype.toTitleCase=function(){
        return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    };
    String.prototype.toPixel = function(){
        var val=parseInt(this,10);
        val = val.toString() + 'px';
        return val;
    };
    Number.prototype.toPixel = function(){
        var val=parseInt(this,10);
        val = val.toString() + 'px';
        return val;
    };
    String.prototype.toFloatPixel = function(){
        var val = this.toString() + 'px';
        return val;
    };
    Number.prototype.toFloatPixel = function(){
        var val = this.toString() + 'px';
        return val;
    };
    String.prototype.toInteger=function(){
        return parseInt(this.replace('px',''),10);
    };
    String.prototype.toMillisecond = function(){
        var val=parseInt(this,10);
        val = val.toString() + 'ms';
        return val;
    };
    Number.prototype.toMillisecond = function(){
        var val=parseInt(this,10);
        val = val.toString() + 'ms';
        return val;
    };



    /**
     * replaces an element's class based on a wildcard pattern
     * @param removals {String}
     * @param additions {String}
     * @returns {Object}
     * @public
     *
     * ex: average rating
     *     $span.alterClass('icon-star-*', 'icon-star-3');
     *     $span.icon-star-2 => $span.icon-star-3
     */
    $.fn.alterClass = function ( removals, additions ) {

        var self = this;

        if ( removals.indexOf( '*' ) === -1 ) {
            // Use native jQuery methods if there is no wildcard matching
            self.removeClass( removals );
            return !additions ? self : self.addClass( additions );
        }

        var patt = new RegExp( '\\s' +
            removals.
                replace( /\*/g, '[A-Za-z0-9-_]+' ).
                split( ' ' ).
                join( '\\s|\\s' ) +
            '\\s', 'g' );

        self.each( function ( i, it ) {
            var cn = ' ' + it.className + ' ';
            while ( patt.test( cn ) ) {
                cn = cn.replace( patt, ' ' );
            }
            it.className = $.trim( cn );
        });

        return !additions ? self : self.addClass( additions );
    };

    /**
     * extends jQuery 'find' to additionally filter the jQuery object against the selector
     * example uses: querying mutation records
     * @param selector {String}
     * @returns {Object}
     * @public
     */
    $.fn.selfFind = function(selector) {
        return this.find(selector).add(this.filter(selector))
    };

    /**
     * clear select list
     * @param opts
     * @returns {$.fn}
     */
    $.fn.clearSelect=function(opts){
        (typeof opts.defaultOption ==='undefined') ? this.children.remove() : this.children('option:not(:first)').remove();
        return this;

    };

    $.fn.findTextNodes=function(){
        return this.contents().filter(function(){return this.nodeType===3});
    };

    $.fn.findTextNodeDescendants=function(){
        return this.find('*').contents().filter(function(){return this.nodeType===3});
    };

    /**
     *  returns first matched children in an iterative children query as "children"
     * @param selector
     * @returns {*|jQuery|HTMLElement}
     */
    $.fn.closestChildren=function(selector){
        if (!selector || selector === '') {
            return $();
        }
        var result=$();
        this.each(function() {
            var $this = $(this);
            var queue = [];
            queue.push($this);
            while (queue.length > 0) {
                var node = queue.shift();
                var children = node.children();
                for (var i = 0; i < children.length; ++i) {
                    var $child = $(children[i]);
                    if ($child.is(selector)) {
                        result=children;
                        return false;
                    } else {
                        queue.push($child);
                    }
                }
            }
        });

        return result;
    };





    return $;


}));






//platform bootstrapper facade
if(typeof global==='undefined'){
    global=window;
}
global.Platform = global.Platform || {};
global.logFlags = global.logFlags || {};

/*
 * Copyright 2012 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

if (typeof WeakMap === 'undefined') {
  (function() {
    var defineProperty = Object.defineProperty;
    var counter = Date.now() % 1e9;

    var WeakMap = function() {
      this.name = '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
    };

    WeakMap.prototype = {
      set: function(key, value) {
        var entry = key[this.name];
        if (entry && entry[0] === key)
          entry[1] = value;
        else
          defineProperty(key, this.name, {value: [key, value], writable: true});
      },
      get: function(key) {
        var entry;
        return (entry = key[this.name]) && entry[0] === key ?
            entry[1] : undefined;
      },
      delete: function(key) {
        var entry = key[this.name];
        if (!entry) return false;
        var hasValue = entry[0] === key;
        entry[0] = entry[1] = undefined;
        return hasValue;
      },
      has: function(key) {
        var entry = key[this.name];
        if (!entry) return false;
        return entry[0] === key;
      }
    };

    window.WeakMap = WeakMap;
  })();
}

/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
window.CustomElements = window.CustomElements || {flags:{}};
/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

(function(scope){

var logFlags = window.logFlags || {};
var IMPORT_LINK_TYPE = window.HTMLImports ? HTMLImports.IMPORT_LINK_TYPE : 'none';

// walk the subtree rooted at node, applying 'find(element, data)' function
// to each element
// if 'find' returns true for 'element', do not search element's subtree
function findAll(node, find, data) {
  var e = node.firstElementChild;
  if (!e) {
    e = node.firstChild;
    while (e && e.nodeType !== Node.ELEMENT_NODE) {
      e = e.nextSibling;
    }
  }
  while (e) {
    if (find(e, data) !== true) {
      findAll(e, find, data);
    }
    e = e.nextElementSibling;
  }
  return null;
}

// walk all shadowRoots on a given node.
function forRoots(node, cb) {
  var root = node.shadowRoot;
  while(root) {
    forSubtree(root, cb);
    root = root.olderShadowRoot;
  }
}

// walk the subtree rooted at node, including descent into shadow-roots,
// applying 'cb' to each element
function forSubtree(node, cb) {
  //logFlags.dom && node.childNodes && node.childNodes.length && console.group('subTree: ', node);
  findAll(node, function(e) {
    if (cb(e)) {
      return true;
    }
    forRoots(e, cb);
  });
  forRoots(node, cb);
  //logFlags.dom && node.childNodes && node.childNodes.length && console.groupEnd();
}

// manage lifecycle on added node
function added(node) {
  if (upgrade(node)) {
    insertedNode(node);
    return true;
  }
  inserted(node);
}

// manage lifecycle on added node's subtree only
function addedSubtree(node) {
  forSubtree(node, function(e) {
    if (added(e)) {
      return true;
    }
  });
}

// manage lifecycle on added node and it's subtree
function addedNode(node) {
  return added(node) || addedSubtree(node);
}

// upgrade custom elements at node, if applicable
function upgrade(node) {
  if (!node.__upgraded__ && node.nodeType === Node.ELEMENT_NODE) {
    var type = node.getAttribute('is') || node.localName;
    var definition = scope.registry[type];
    if (definition) {
      logFlags.dom && console.group('upgrade:', node.localName);
      scope.upgrade(node);
      logFlags.dom && console.groupEnd();
      return true;
    }
  }
}

function insertedNode(node) {
  inserted(node);
  if (inDocument(node)) {
    forSubtree(node, function(e) {
      inserted(e);
    });
  }
}

// TODO(sorvell): on platforms without MutationObserver, mutations may not be
// reliable and therefore attached/detached are not reliable.
// To make these callbacks less likely to fail, we defer all inserts and removes
// to give a chance for elements to be inserted into dom.
// This ensures attachedCallback fires for elements that are created and
// immediately added to dom.
var hasPolyfillMutations = (!window.MutationObserver ||
    (window.MutationObserver === window.JsMutationObserver));
scope.hasPolyfillMutations = hasPolyfillMutations;

var isPendingMutations = false;
var pendingMutations = [];
function deferMutation(fn) {
  pendingMutations.push(fn);
  if (!isPendingMutations) {
    isPendingMutations = true;
    var async = (window.Platform && window.Platform.endOfMicrotask) ||
        setTimeout;
    async(takeMutations);
  }
}

function takeMutations() {
  isPendingMutations = false;
  var $p = pendingMutations;
  for (var i=0, l=$p.length, p; (i<l) && (p=$p[i]); i++) {
    p();
  }
  pendingMutations = [];
}

function inserted(element) {
  if (hasPolyfillMutations) {
    deferMutation(function() {
      _inserted(element);
    });
  } else {
    _inserted(element);
  }
}

// TODO(sjmiles): if there are descents into trees that can never have inDocument(*) true, fix this
function _inserted(element) {
  // TODO(sjmiles): it's possible we were inserted and removed in the space
  // of one microtask, in which case we won't be 'inDocument' here
  // But there are other cases where we are testing for inserted without
  // specific knowledge of mutations, and must test 'inDocument' to determine
  // whether to call inserted
  // If we can factor these cases into separate code paths we can have
  // better diagnostics.
  // TODO(sjmiles): when logging, do work on all custom elements so we can
  // track behavior even when callbacks not defined
  //console.log('inserted: ', element.localName);
  if (element.attachedCallback || element.detachedCallback || (element.__upgraded__ && logFlags.dom)) {
    logFlags.dom && console.group('inserted:', element.localName);
    if (inDocument(element)) {
      element.__inserted = (element.__inserted || 0) + 1;
      // if we are in a 'removed' state, bluntly adjust to an 'inserted' state
      if (element.__inserted < 1) {
        element.__inserted = 1;
      }
      // if we are 'over inserted', squelch the callback
      if (element.__inserted > 1) {
        logFlags.dom && console.warn('inserted:', element.localName,
          'insert/remove count:', element.__inserted)
      } else if (element.attachedCallback) {
        logFlags.dom && console.log('inserted:', element.localName);
        element.attachedCallback();
      }
    }
    logFlags.dom && console.groupEnd();
  }
}

function removedNode(node) {
  removed(node);
  forSubtree(node, function(e) {
    removed(e);
  });
}

function removed(element) {
  if (hasPolyfillMutations) {
    deferMutation(function() {
      _removed(element);
    });
  } else {
    _removed(element);
  }
}

function _removed(element) {
  // TODO(sjmiles): temporary: do work on all custom elements so we can track
  // behavior even when callbacks not defined
  if (element.attachedCallback || element.detachedCallback || (element.__upgraded__ && logFlags.dom)) {
    logFlags.dom && console.group('removed:', element.localName);
    if (!inDocument(element)) {
      element.__inserted = (element.__inserted || 0) - 1;
      // if we are in a 'inserted' state, bluntly adjust to an 'removed' state
      if (element.__inserted > 0) {
        element.__inserted = 0;
      }
      // if we are 'over removed', squelch the callback
      if (element.__inserted < 0) {
        logFlags.dom && console.warn('removed:', element.localName,
            'insert/remove count:', element.__inserted)
      } else if (element.detachedCallback) {
        element.detachedCallback();
      }
    }
    logFlags.dom && console.groupEnd();
  }
}

// SD polyfill intrustion due mainly to the fact that 'document'
// is not entirely wrapped
function wrapIfNeeded(node) {
  return window.ShadowDOMPolyfill ? ShadowDOMPolyfill.wrapIfNeeded(node)
      : node;
}

function inDocument(element) {
  var p = element;
  var doc = wrapIfNeeded(document);
  while (p) {
    if (p == doc) {
      return true;
    }
    p = p.parentNode || p.host;
  }
}

function watchShadow(node) {
  if (node.shadowRoot && !node.shadowRoot.__watched) {
    logFlags.dom && console.log('watching shadow-root for: ', node.localName);
    // watch all unwatched roots...
    var root = node.shadowRoot;
    while (root) {
      watchRoot(root);
      root = root.olderShadowRoot;
    }
  }
}

function watchRoot(root) {
  if (!root.__watched) {
    observe(root);
    root.__watched = true;
  }
}

function handler(mutations) {
  //
  if (logFlags.dom) {
    var mx = mutations[0];
    if (mx && mx.type === 'childList' && mx.addedNodes) {
        if (mx.addedNodes) {
          var d = mx.addedNodes[0];
          while (d && d !== document && !d.host) {
            d = d.parentNode;
          }
          var u = d && (d.URL || d._URL || (d.host && d.host.localName)) || '';
          u = u.split('/?').shift().split('/').pop();
        }
    }
    console.group('mutations (%d) [%s]', mutations.length, u || '');
  }
  //
  mutations.forEach(function(mx) {
    //logFlags.dom && console.group('mutation');
    if (mx.type === 'childList') {
      forEach(mx.addedNodes, function(n) {
        //logFlags.dom && console.log(n.localName);
        if (!n.localName) {
          return;
        }
        // nodes added may need lifecycle management
        addedNode(n);
      });
      // removed nodes may need lifecycle management
      forEach(mx.removedNodes, function(n) {
        //logFlags.dom && console.log(n.localName);
        if (!n.localName) {
          return;
        }
        removedNode(n);
      });
    }
    //logFlags.dom && console.groupEnd();
  });
  logFlags.dom && console.groupEnd();
};

var observer = new MutationObserver(handler);

function takeRecords() {
  // TODO(sjmiles): ask Raf why we have to call handler ourselves
  handler(observer.takeRecords());
  takeMutations();
}

var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);

function observe(inRoot) {
  observer.observe(inRoot, {childList: true, subtree: true});
}

function observeDocument(doc) {
  observe(doc);
}

function upgradeDocument(doc) {
  logFlags.dom && console.group('upgradeDocument: ', (doc.baseURI).split('/').pop());
  addedNode(doc);
  logFlags.dom && console.groupEnd();
}

function upgradeDocumentTree(doc) {
  doc = wrapIfNeeded(doc);
  //console.log('upgradeDocumentTree: ', (doc.baseURI).split('/').pop());
  // upgrade contained imported documents
  var imports = doc.querySelectorAll('link[rel=' + IMPORT_LINK_TYPE + ']');
  for (var i=0, l=imports.length, n; (i<l) && (n=imports[i]); i++) {
    if (n.import && n.import.__parsed) {
      upgradeDocumentTree(n.import);
    }
  }
  upgradeDocument(doc);
}

// exports
scope.IMPORT_LINK_TYPE = IMPORT_LINK_TYPE;
scope.watchShadow = watchShadow;
scope.upgradeDocumentTree = upgradeDocumentTree;
scope.upgradeAll = addedNode;
scope.upgradeSubtree = addedSubtree;
scope.insertedNode = insertedNode;

scope.observeDocument = observeDocument;
scope.upgradeDocument = upgradeDocument;

scope.takeRecords = takeRecords;

})(window.CustomElements);

/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

/**
 * Implements `document.registerElement`
 * @module CustomElements
*/

/**
 * Polyfilled extensions to the `document` object.
 * @class Document
*/

(function(scope) {

// imports

if (!scope) {
  scope = window.CustomElements = {flags:{}};
}
var flags = scope.flags;

// native document.registerElement?

var hasNative = Boolean(document.registerElement);
// For consistent timing, use native custom elements only when not polyfilling
// other key related web components features.
var useNative = !flags.register && hasNative && !window.ShadowDOMPolyfill && (!window.HTMLImports || HTMLImports.useNative);

if (useNative) {

  // stub
  var nop = function() {};

  // exports
  scope.registry = {};
  scope.upgradeElement = nop;

  scope.watchShadow = nop;
  scope.upgrade = nop;
  scope.upgradeAll = nop;
  scope.upgradeSubtree = nop;
  scope.observeDocument = nop;
  scope.upgradeDocument = nop;
  scope.upgradeDocumentTree = nop;
  scope.takeRecords = nop;
  scope.reservedTagList = [];

} else {

  /**
   * Registers a custom tag name with the document.
   *
   * When a registered element is created, a `readyCallback` method is called
   * in the scope of the element. The `readyCallback` method can be specified on
   * either `options.prototype` or `options.lifecycle` with the latter taking
   * precedence.
   *
   * @method register
   * @param {String} name The tag name to register. Must include a dash ('-'),
   *    for example 'x-component'.
   * @param {Object} options
   *    @param {String} [options.extends]
   *      (_off spec_) Tag name of an element to extend (or blank for a new
   *      element). This parameter is not part of the specification, but instead
   *      is a hint for the polyfill because the extendee is difficult to infer.
   *      Remember that the input prototype must chain to the extended element's
   *      prototype (or HTMLElement.prototype) regardless of the value of
   *      `extends`.
   *    @param {Object} options.prototype The prototype to use for the new
   *      element. The prototype must inherit from HTMLElement.
   *    @param {Object} [options.lifecycle]
   *      Callbacks that fire at important phases in the life of the custom
   *      element.
   *
   * @example
   *      FancyButton = document.registerElement("fancy-button", {
   *        extends: 'button',
   *        prototype: Object.create(HTMLButtonElement.prototype, {
   *          readyCallback: {
   *            value: function() {
   *              console.log("a fancy-button was created",
   *            }
   *          }
   *        })
   *      });
   * @return {Function} Constructor for the newly registered type.
   */
  function register(name, options) {
    //console.warn('document.registerElement("' + name + '", ', options, ')');
    // construct a defintion out of options
    // TODO(sjmiles): probably should clone options instead of mutating it
    var definition = options || {};
    if (!name) {
      // TODO(sjmiles): replace with more appropriate error (EricB can probably
      // offer guidance)
      throw new Error('document.registerElement: first argument `name` must not be empty');
    }
    if (name.indexOf('-') < 0) {
      // TODO(sjmiles): replace with more appropriate error (EricB can probably
      // offer guidance)
      throw new Error('document.registerElement: first argument (\'name\') must contain a dash (\'-\'). Argument provided was \'' + String(name) + '\'.');
    }
    // prevent registering reserved names
    if (isReservedTag(name)) {
      throw new Error('Failed to execute \'registerElement\' on \'Document\': Registration failed for type \'' + String(name) + '\'. The type name is invalid.');
    }
    // elements may only be registered once
    if (getRegisteredDefinition(name)) {
      throw new Error('DuplicateDefinitionError: a type with name \'' + String(name) + '\' is already registered');
    }
    // must have a prototype, default to an extension of HTMLElement
    // TODO(sjmiles): probably should throw if no prototype, check spec
    if (!definition.prototype) {
      // TODO(sjmiles): replace with more appropriate error (EricB can probably
      // offer guidance)
      throw new Error('Options missing required prototype property');
    }
    // record name
    definition.__name = name.toLowerCase();
    // ensure a lifecycle object so we don't have to null test it
    definition.lifecycle = definition.lifecycle || {};
    // build a list of ancestral custom elements (for native base detection)
    // TODO(sjmiles): we used to need to store this, but current code only
    // uses it in 'resolveTagName': it should probably be inlined
    definition.ancestry = ancestry(definition.extends);
    // extensions of native specializations of HTMLElement require localName
    // to remain native, and use secondary 'is' specifier for extension type
    resolveTagName(definition);
    // some platforms require modifications to the user-supplied prototype
    // chain
    resolvePrototypeChain(definition);
    // overrides to implement attributeChanged callback
    overrideAttributeApi(definition.prototype);
    // 7.1.5: Register the DEFINITION with DOCUMENT
    registerDefinition(definition.__name, definition);
    // 7.1.7. Run custom element constructor generation algorithm with PROTOTYPE
    // 7.1.8. Return the output of the previous step.
    definition.ctor = generateConstructor(definition);
    definition.ctor.prototype = definition.prototype;
    // force our .constructor to be our actual constructor
    definition.prototype.constructor = definition.ctor;
    // if initial parsing is complete
    if (scope.ready) {
      // upgrade any pre-existing nodes of this type
      scope.upgradeDocumentTree(document);
    }
    return definition.ctor;
  }

  function isReservedTag(name) {
    for (var i = 0; i < reservedTagList.length; i++) {
      if (name === reservedTagList[i]) {
        return true;
      }
    }
  }

  var reservedTagList = [
    'annotation-xml', 'color-profile', 'font-face', 'font-face-src',
    'font-face-uri', 'font-face-format', 'font-face-name', 'missing-glyph'
  ];

  function ancestry(extnds) {
    var extendee = getRegisteredDefinition(extnds);
    if (extendee) {
      return ancestry(extendee.extends).concat([extendee]);
    }
    return [];
  }

  function resolveTagName(definition) {
    // if we are explicitly extending something, that thing is our
    // baseTag, unless it represents a custom component
    var baseTag = definition.extends;
    // if our ancestry includes custom components, we only have a
    // baseTag if one of them does
    for (var i=0, a; (a=definition.ancestry[i]); i++) {
      baseTag = a.is && a.tag;
    }
    // our tag is our baseTag, if it exists, and otherwise just our name
    definition.tag = baseTag || definition.__name;
    if (baseTag) {
      // if there is a base tag, use secondary 'is' specifier
      definition.is = definition.__name;
    }
  }

  function resolvePrototypeChain(definition) {
    // if we don't support __proto__ we need to locate the native level
    // prototype for precise mixing in
    if (!Object.__proto__) {
      // default prototype
      var nativePrototype = HTMLElement.prototype;
      // work out prototype when using type-extension
      if (definition.is) {
        var inst = document.createElement(definition.tag);
        var expectedPrototype = Object.getPrototypeOf(inst);
        // only set nativePrototype if it will actually appear in the definition's chain
        if (expectedPrototype === definition.prototype) {
          nativePrototype = expectedPrototype;
        }
      }
      // ensure __proto__ reference is installed at each point on the prototype
      // chain.
      // NOTE: On platforms without __proto__, a mixin strategy is used instead
      // of prototype swizzling. In this case, this generated __proto__ provides
      // limited support for prototype traversal.
      var proto = definition.prototype, ancestor;
      while (proto && (proto !== nativePrototype)) {
        ancestor = Object.getPrototypeOf(proto);
        proto.__proto__ = ancestor;
        proto = ancestor;
      }
      // cache this in case of mixin
      definition.native = nativePrototype;
    }
  }

  // SECTION 4

  function instantiate(definition) {
    // 4.a.1. Create a new object that implements PROTOTYPE
    // 4.a.2. Let ELEMENT by this new object
    //
    // the custom element instantiation algorithm must also ensure that the
    // output is a valid DOM element with the proper wrapper in place.
    //
    return upgrade(domCreateElement(definition.tag), definition);
  }

  function upgrade(element, definition) {
    // some definitions specify an 'is' attribute
    if (definition.is) {
      element.setAttribute('is', definition.is);
    }
    // make 'element' implement definition.prototype
    implement(element, definition);
    // flag as upgraded
    element.__upgraded__ = true;
    // lifecycle management
    created(element);
    // attachedCallback fires in tree order, call before recursing
    scope.insertedNode(element);
    // there should never be a shadow root on element at this point
    scope.upgradeSubtree(element);
    // OUTPUT
    return element;
  }

  function implement(element, definition) {
    // prototype swizzling is best
    if (Object.__proto__) {
      element.__proto__ = definition.prototype;
    } else {
      // where above we can re-acquire inPrototype via
      // getPrototypeOf(Element), we cannot do so when
      // we use mixin, so we install a magic reference
      customMixin(element, definition.prototype, definition.native);
      element.__proto__ = definition.prototype;
    }
  }

  function customMixin(inTarget, inSrc, inNative) {
    // TODO(sjmiles): 'used' allows us to only copy the 'youngest' version of
    // any property. This set should be precalculated. We also need to
    // consider this for supporting 'super'.
    var used = {};
    // start with inSrc
    var p = inSrc;
    // The default is HTMLElement.prototype, so we add a test to avoid mixing in
    // native prototypes
    while (p !== inNative && p !== HTMLElement.prototype) {
      var keys = Object.getOwnPropertyNames(p);
      for (var i=0, k; k=keys[i]; i++) {
        if (!used[k]) {
          Object.defineProperty(inTarget, k,
              Object.getOwnPropertyDescriptor(p, k));
          used[k] = 1;
        }
      }
      p = Object.getPrototypeOf(p);
    }
  }

  function created(element) {
    // invoke createdCallback
    if (element.createdCallback) {
      element.createdCallback();
    }
  }

  // attribute watching

  function overrideAttributeApi(prototype) {
    // overrides to implement callbacks
    // TODO(sjmiles): should support access via .attributes NamedNodeMap
    // TODO(sjmiles): preserves user defined overrides, if any
    if (prototype.setAttribute._polyfilled) {
      return;
    }
    var setAttribute = prototype.setAttribute;
    prototype.setAttribute = function(name, value) {
      changeAttribute.call(this, name, value, setAttribute);
    }
    var removeAttribute = prototype.removeAttribute;
    prototype.removeAttribute = function(name) {
      changeAttribute.call(this, name, null, removeAttribute);
    }
    prototype.setAttribute._polyfilled = true;
  }

  // https://dvcs.w3.org/hg/webcomponents/raw-file/tip/spec/custom/
  // index.html#dfn-attribute-changed-callback
  function changeAttribute(name, value, operation) {
    name = name.toLowerCase();
    var oldValue = this.getAttribute(name);
    operation.apply(this, arguments);
    var newValue = this.getAttribute(name);
    if (this.attributeChangedCallback
        && (newValue !== oldValue)) {
      this.attributeChangedCallback(name, oldValue, newValue);
    }
  }

  // element registry (maps tag names to definitions)

  var registry = {};

  function getRegisteredDefinition(name) {
    if (name) {
      return registry[name.toLowerCase()];
    }
  }

  function registerDefinition(name, definition) {
    registry[name] = definition;
  }

  function generateConstructor(definition) {
    return function() {
      return instantiate(definition);
    };
  }

  var HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
  function createElementNS(namespace, tag, typeExtension) {
    // NOTE: we do not support non-HTML elements,
    // just call createElementNS for non HTML Elements
    if (namespace === HTML_NAMESPACE) {
      return createElement(tag, typeExtension);
    } else {
      return domCreateElementNS(namespace, tag);
    }
  }

  function createElement(tag, typeExtension) {
    // TODO(sjmiles): ignore 'tag' when using 'typeExtension', we could
    // error check it, or perhaps there should only ever be one argument
    var definition = getRegisteredDefinition(typeExtension || tag);
    if (definition) {
      if (tag == definition.tag && typeExtension == definition.is) {
        return new definition.ctor();
      }
      // Handle empty string for type extension.
      if (!typeExtension && !definition.is) {
        return new definition.ctor();
      }
    }

    if (typeExtension) {
      var element = createElement(tag);
      element.setAttribute('is', typeExtension);
      return element;
    }
    var element = domCreateElement(tag);
    // Custom tags should be HTMLElements even if not upgraded.
    if (tag.indexOf('-') >= 0) {
      implement(element, HTMLElement);
    }
    return element;
  }

  function upgradeElement(element) {
    if (!element.__upgraded__ && (element.nodeType === Node.ELEMENT_NODE)) {
      var is = element.getAttribute('is');
      var definition = getRegisteredDefinition(is || element.localName);
      if (definition) {
        if (is && definition.tag == element.localName) {
          return upgrade(element, definition);
        } else if (!is && !definition.extends) {
          return upgrade(element, definition);
        }
      }
    }
  }

  function cloneNode(deep) {
    // call original clone
    var n = domCloneNode.call(this, deep);
    // upgrade the element and subtree
    scope.upgradeAll(n);
    // return the clone
    return n;
  }
  // capture native createElement before we override it

  var domCreateElement = document.createElement.bind(document);
  var domCreateElementNS = document.createElementNS.bind(document);

  // capture native cloneNode before we override it

  var domCloneNode = Node.prototype.cloneNode;

  // exports

  document.registerElement = register;
  document.createElement = createElement; // override
  document.createElementNS = createElementNS; // override
  Node.prototype.cloneNode = cloneNode; // override

  scope.registry = registry;

  /**
   * Upgrade an element to a custom element. Upgrading an element
   * causes the custom prototype to be applied, an `is` attribute
   * to be attached (as needed), and invocation of the `readyCallback`.
   * `upgrade` does nothing if the element is already upgraded, or
   * if it matches no registered custom tag name.
   *
   * @method ugprade
   * @param {Element} element The element to upgrade.
   * @return {Element} The upgraded element.
   */
  scope.upgrade = upgradeElement;
}

// Create a custom 'instanceof'. This is necessary when CustomElements
// are implemented via a mixin strategy, as for example on IE10.
var isInstance;
if (!Object.__proto__ && !useNative) {
  isInstance = function(obj, ctor) {
    var p = obj;
    while (p) {
      // NOTE: this is not technically correct since we're not checking if
      // an object is an instance of a constructor; however, this should
      // be good enough for the mixin strategy.
      if (p === ctor.prototype) {
        return true;
      }
      p = p.__proto__;
    }
    return false;
  }
} else {
  isInstance = function(obj, base) {
    return obj instanceof base;
  }
}

// exports
scope.instanceof = isInstance;
scope.reservedTagList = reservedTagList;

// bc
document.register = document.registerElement;

scope.hasNative = hasNative;
scope.useNative = useNative;

})(window.CustomElements);

/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

(function(scope) {

// import

var IMPORT_LINK_TYPE = scope.IMPORT_LINK_TYPE;

// highlander object for parsing a document tree

var parser = {
  selectors: [
    'link[rel=' + IMPORT_LINK_TYPE + ']'
  ],
  map: {
    link: 'parseLink'
  },
  parse: function(inDocument) {
    if (!inDocument.__parsed) {
      // only parse once
      inDocument.__parsed = true;
      // all parsable elements in inDocument (depth-first pre-order traversal)
      var elts = inDocument.querySelectorAll(parser.selectors);
      // for each parsable node type, call the mapped parsing method
      forEach(elts, function(e) {
        parser[parser.map[e.localName]](e);
      });
      // upgrade all upgradeable static elements, anything dynamically
      // created should be caught by observer
      CustomElements.upgradeDocument(inDocument);
      // observe document for dom changes
      CustomElements.observeDocument(inDocument);
    }
  },
  parseLink: function(linkElt) {
    // imports
    if (isDocumentLink(linkElt)) {
      this.parseImport(linkElt);
    }
  },
  parseImport: function(linkElt) {
    if (linkElt.import) {
      parser.parse(linkElt.import);
    }
  }
};

function isDocumentLink(inElt) {
  return (inElt.localName === 'link'
      && inElt.getAttribute('rel') === IMPORT_LINK_TYPE);
}

var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);

// exports

scope.parser = parser;
scope.IMPORT_LINK_TYPE = IMPORT_LINK_TYPE;

})(window.CustomElements);
/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
(function(scope){

// bootstrap parsing
function bootstrap() {
  // parse document
  CustomElements.parser.parse(document);
  // one more pass before register is 'live'
  CustomElements.upgradeDocument(document);
  // set internal 'ready' flag, now document.registerElement will trigger 
  // synchronous upgrades
  CustomElements.ready = true;
  // async to ensure *native* custom elements upgrade prior to this
  // DOMContentLoaded can fire before elements upgrade (e.g. when there's
  // an external script)
  setTimeout(function() {
    // capture blunt profiling data
    CustomElements.readyTime = Date.now();
    if (window.HTMLImports) {
      CustomElements.elapsed = CustomElements.readyTime - HTMLImports.readyTime;
    }
    // notify the system that we are bootstrapped
    document.dispatchEvent(
      new CustomEvent('WebComponentsReady', {bubbles: true})
    );

    // install upgrade hook if HTMLImports are available
    if (window.HTMLImports) {
      HTMLImports.__importsParsingHook = function(elt) {
        CustomElements.parser.parse(elt.import);
      }
    }
  });
}

// CustomEvent shim for IE
if (typeof window.CustomEvent !== 'function') {
  window.CustomEvent = function(inType, params) {
    params = params || {};
    var e = document.createEvent('CustomEvent');
    e.initCustomEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable), params.detail);
    return e;
  };
  window.CustomEvent.prototype = window.Event.prototype;
}

// When loading at readyState complete time (or via flag), boot custom elements
// immediately.
// If relevant, HTMLImports must already be loaded.
if (document.readyState === 'complete' || scope.flags.eager) {
  bootstrap();
// When loading at readyState interactive time, bootstrap only if HTMLImports
// are not pending. Also avoid IE as the semantics of this state are unreliable.
} else if (document.readyState === 'interactive' && !window.attachEvent &&
    (!window.HTMLImports || window.HTMLImports.ready)) {
  bootstrap();
// When loading at other readyStates, wait for the appropriate DOM event to 
// bootstrap.
} else {
  var loadEvent = window.HTMLImports && !HTMLImports.ready ?
      'HTMLImportsLoaded' : 'DOMContentLoaded';
  window.addEventListener(loadEvent, bootstrap);
}

})(window.CustomElements);

/*
 * =============================================================
 * ellipsis.widget v0.9.1
 * =============================================================
 * Copyright (c) 2014 S. Francis, MIS Interactive
 * Licensed MIT
 *
 *
 * ellipsis extensions of the jQuery UI factory
 * uses the Polymer Platform to create custom elements/web components and creates a "stateful widget instance"
 * of a custom element on the jQuery object
 * other enhancements include: template rendering, animation support, media query support, device support, location support
 *
 * dependencies:
 * jquery widget ui factory
 * ellipsis platform
 * ellipsis utils
 *
 * provider dependencies:
 * dust.js-->template
 * ellipsis animation-->animation support -->transition plugin method for transitions, transforms provider for 3d transforms
 * ellipsis touch--->touch/gesture/media query/device support, jQuery special events for click,hover that trigger corresponding touch gestures
 */
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('ellipsis-utils'),require('ellipsis-platform'),require('./widget.factory'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ellipsis-utils','ellipsis-platform','./widget.factory'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function () {

    //init providers
    var touch_= $.touch || {};
    var transit_= $.transit || {};


    /* extend base prototype public options */
    /* for the most part, we follow a dependency injection/provider pattern for UI factory enhancements */
    var options = {
        $providers:{
            template:window.dust || {},
            device: touch_.device || {},
            mq: touch_.mq || {},
            transforms: transit_.transforms || {},
            location:function(url){window.location=url;},
            utils: $.utils || {}
        },
        $customElements:false,
        mqMaxWidth: $.touch.mqMaxWidth || 1024

    };
    window.ellipsis=window.ellipsis || {};
    $.extend($.Widget.prototype.options, options);

    /* private data store */
    var _data = {
        containerSelector: '[data-role="container"]',
        $containerSelector:'ui-container',
        drawerClass: 'touch-ui-drawer',
        drawerElement:'<div class="touch-ui-drawer"></div>',
        $drawerElement:'<touch-ui-drawer></touch-ui-drawer>',
        touchMenuClass: 'touch-ui-menu',
        touchDropdownClass: 'touch-ui-dropdown',
        menuElement:'<ul class="ui-menu"></ul>',
        $menuElement:'<ui-menu></ui-menu>',
        touchMenuElement:'<ul class="touch-ui-menu"></ul>',
        $touchMenuElement:'<touch-ui-menu></touch-ui-menu>',
        menuClass: 'ui-menu',
        listItem:'li',
        $listItem:'menu-item',
        listItemElement:'<li></li>',
        $listItemElement:'<menu-item></menu-item>',
        dropdownClass: 'ui-dropdown',
        dropdownElement:'<ul class="ui-dropdown"></ul>',
        $dropdownElement:'<ui-dropdown></ui-dropdown>',
        searchClass: 'ui-search',
        searchRole:'[data-role="search"]',
        $searchRole:'[role="search"]',
        overlayElement:'<div data-role="overlay"></div>',
        $overlayElement:'<ui-overlay></ui-overlay>',
        hardwareAcceleratedClass: 'ui-hardware-accelerated',
        leftBoxShadowClass: 'ui-left-box-shadow',
        fixedToggleContainerClass: 'ui-fixed-toggle-container',
        overflowContainerClass: 'ui-overflow-container',
        toggleSelector: '[data-role="toggle"]',
        $toggleSelector:'ui-toggle',
        loadingContainer:'.ui-loading-container',
        loading:'.ui-loading',
        loadingDelay:300,
        modalElement:'<div class="ui-modal"></div>',
        $modalElement:'<ui-modal></ui-modal>',
        modalClass:'ui-modal',
        modal:null,
        modalOpacity:.4,
        modalZIndex:999,
        click:'touchclick',
        hover:'touchhover',
        $elements:['ui-container','ui-overlay','ui-modal','ui-menu','menu-item','ui-brand','ui-search','ui-toggle','ui-collapse',
                'menu-item-dropdown','menu-item-search','menu-divider','grid-row','grid-columns',
                'ui-select','ui-input-addon','ui-input-icon','ui-loading','ui-notification','ui-slide-notification',
                'ui-flex-grid','grid-item','ui-flex-table',
                'ui-dropdown','ui-media-object','ui-box','ui-breadcrumb','breadcrumb-item','ui-menu-tab','ui-flex-list','ui-flex-gallery',
                'ui-flex-form','form-item','ui-badge','ui-semantic-label','ui-semantic-checkbox','ui-social','social-icon','ui-flex-container',
                'touch-ui-drawer','touch-ui-menu','touch-ui-dropdown','touch-ui-toggle','touch-ui-brand']

    };

    $.Widget.prototype._data = $.Widget.prototype._data || {};
    $.extend($.Widget.prototype._data, _data);



    /* private -------------------------------------------------------------------------------------------------------*/

    /**
     * use _getCreateEventData as a 'reserved hook' to bind the internal store to the instance
     * @private
     */
    $.Widget.prototype._getCreateEventData= function(){
        this._data=$.widget.extend({},this._data);
        //set our own data store record of an instance
        $.data(this.element[0],'custom-' + this.widgetName,this.widgetName);


        /* fire this to hook the original method */
        this._onCreateEventData();
    };


    /**
     * replaces _getCreateEventData for the instance method hook
     * @private
     */
    $.Widget.prototype._onCreateEventData= $.noop;


    /* expose an animation method for widget animations/transitions */
    /**
     *
     * @param element {Object}
     * @param options {Object}
     * @param callback {Function}
     * @private
     */
    $.Widget.prototype._transitions = function (element, options, callback) {
        options = options || {};
        if (options === {}) {
            options.duration = 300;
            options.preset = 'fadeIn';
        }
        if(options.preset==='none'){
            element.hide();
            return;
        }
        element.transition(options, function () {
            if (callback) {
                callback.call(element[ 0 ]);
            }
        });
    };

    /* expose render method for templates */
    /**
     *
     * @param element {Object}
     * @param options {Object}
     * @param callback {Function}
     * @private
     */
    $.Widget.prototype._render = function (element, options, callback) {
        var provider = $.Widget.prototype.options.$providers.template;
        var context=parseTemplateContext(options,provider);
        var template=templateReference(options,provider);
        provider.render(template, context, function (err, out) {
            var html=out;
            element.html(html);
            if (callback) {
                callback(err, html);
            }
        });
    };

    /**
     * method that returns parsed html from a rendered template(however, does not insert it into an element like 'render')
     * @param options {Object}
     * @param callback {Function}
     * @private
     */
    $.Widget.prototype._renderTemplate = function (options, callback) {
        options.parse=(options.parse !== undefined) ? options.parse : true;
        var provider = $.Widget.prototype.options.$providers.template;
        var context=parseTemplateContext(options,provider);
        var template=templateReference(options,provider);
        provider.render(template, context, function (err, out) {
            var html=out;
            var parsedHtml= (options.parse) ? $.parseHTML(html) : html;
            if (callback) {
                callback(err, parsedHtml);
            }
        });
    };

    /**
     * renders a ui-template element fragment
     * @param element {Object}
     * @param options {Object}
     * @param callback {Function}
     * @private
     */
    $.Widget.prototype._renderFragment = function (element, options, callback) {
        var provider = $.Widget.prototype.options.$providers.template;
        var context=parseTemplateContext(options,provider);
        var template=templateReference(options,provider);
        provider.render(template, context, function (err, out) {
            var html=out.replace(/<ui-template(.*?)>/g,'').replace(/<\/ui-template>/g,'');
            element.html(html);
            if (callback) {
                callback(err, html);
            }
        });
    };

    function parseTemplateContext(options,provider){
        if (provider === null) {
            throw new Error('Error: render requires a template provider to be set');
        }
        if (typeof options === 'undefined') {
            throw new Error('Error: render requires an options object');
        }
        if (typeof options.template === 'undefined' && typeof options.templateStr ==='undefined') {
            throw new Error('Error: template name or template string is required');
        }
        options.model = options.model || {};
        var context={};
        (options.context) ? context[options.context]=options.model : context=options.model;
        return context;
    }

    function templateReference(opts,$provider){
        if(opts.template){
            return opts.template
        }else if(opts.templateStr){
            var name='str_' + rndString(8);
            var compiled = $provider.compile(opts.templateStr, name);
            $provider.loadSource(compiled);

            return name;
        }else{
            return null;
        }
    }

    function rndString(length){
        var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var result = '';
        for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
        return result;
    }

    /**
     * converts a string into a html document
     * @param htmlString {String}
     * @returns {HTMLDocument}
     * @private
     */
    $.Widget.prototype._DOMParser=function(htmlString){
        return new DOMParser().parseFromString(htmlString, 'text/html');

    };

    /*key-value session store */
    /**
     * get value
     * @param key {String}
     * @returns {Object}
     * @private
     */
    $.Widget.prototype._getData = function (key) {
        return sessionStorage.getItem(key);
    };

    /**
     * set key/value
     * @param key {String}
     * @param val {Object}
     * @private
     */
    $.Widget.prototype._setData = function (key, val) {
        sessionStorage.setItem(key, val);
    };



    $.Widget.prototype._utils=$.Widget.prototype.options.$providers.utils || {};

    /**
     * private method that returns screen mode
     * @returns {string}
     * @private
     */
    $.Widget.prototype._mode = function () {
        return (this._support.device.viewport.width > this.options.mqMaxWidth) ? "desktop" : "touch";
    };



    /**
     *
     * @param obj {Object}
     * @returns {Object}
     * @private
     */
    $.Widget.prototype._offset=function(obj){
        var curleft = curtop = 0;
        if (obj.offsetParent) {
            do {
                curleft += obj.offsetLeft;
                curtop += obj.offsetTop;
            } while (obj = obj.offsetParent);
        }
        return{
            top:curtop,
            left:curleft
        }
    };

    /**
     * preload images from element
     * @param element {Object}
     * @param callback {Function}
     * @returns {boolean}
     * @private
     */
    $.Widget.prototype._preloadImages = function (element, callback) {
        var imgArray = [];
        var err = {};
        var data = {};
        var images = element.find('img').not('[data-src]');
        var length = images.length;
        var counter = 0;
        if (length === 0) {
            if (callback) {
                err.message = 'No images found in element';
                callback(err, null);
            }
            return false;
        }
        $.each(images, function (i, img) {
            var image = new Image();
            $(image).bind('load', function (event) {
                counter++;
                imgArray.push(image);
                if (counter === length) {
                    if (callback) {
                        data.images = imgArray;
                        data.length = counter;
                        callback(null, data);
                    }
                }
            });
            image.src = img.src;
        });
        return true;
    };


    /**
     *
     * @param evt {String}
     * @param data {Object}
     * @private
     */
    $.Widget.prototype._onEventTrigger = function (evt, data) {
        var event = $.Event(evt);

        this._trigger(evt, event, data);
        //this.element.trigger(evt,data);
        //$(window).trigger(evt,data);
    };

    /**
     * scrollTop event dispatcher
     * @param ypos {Number}
     * @param evt {String}
     * @private
     */
    $.Widget.prototype._scrollTop= function (ypos, evt) {
        if ($.type(ypos) !== "number") {
            ypos = 0;
        } else if (typeof evt === 'undefined') {
            evt = 'scrollTop';
        }

        setTimeout(function () {
            window.scrollTo(0, ypos);
            $(document).trigger(evt, { x: 0, y: ypos });
        }, 20);
    };

    /**
     *
     * @param element {Object}
     * @private
     */
    $.Widget.prototype._setHardwareAcceleration = function (element) {
        var provider=$.Widget.prototype.options.$providers.transforms;
        this._data.toggleAcceleration =provider.setHardwareAcceleration(element,this._data.hardwareAcceleratedClass);
    };

    /**
     *
     * @param element {Object}
     * @private
     */
    $.Widget.prototype._resetHardwareAcceleration = function (element) {
        var provider=$.Widget.prototype.options.$providers.transforms;
        provider.resetHardwareAcceleration(element,this._data.toggleAcceleration,this._data.hardwareAcceleratedClass);
    };

    $.Widget.prototype._setContainerOverflow = function (element) {
        var provider=$.Widget.prototype.options.$providers.transforms;
        this._data.toggleOverflow=provider.setContainerOverflow(element,this._data.overflowContainerClass);
    };

    /**
     *
     * @param element {Object}
     * @private
     */
    $.Widget.prototype._resetContainerOverflow = function (element) {
        var provider=$.Widget.prototype.options.$providers.transforms;
        provider.resetContainerOverflow(element,this._data.overflowContainerClass);
    };

    /**
     *
     * @param container {object}
     * @private
     */
    $.Widget.prototype._resetContainer = function (container) {
        var provider=$.Widget.prototype.options.$providers.transforms;
        provider.resetContainer(container,this._data.leftBoxShadowClass,this._data.fixedToggleContainerClass);
    };


    /**
     *
     * @param element {object}
     * @private
     */
    $.Widget.prototype._resetTransition = function (element) {
        var provider=$.Widget.prototype.options.$providers.transforms;
        provider.resetTransition(element);
    };

    /**
     *
     * @param element {object}
     * @private
     */
    $.Widget.prototype._resetTransform = function (element) {
        var provider=$.Widget.prototype.options.$providers.transforms;
        provider.resetTransform(element);
    };

    /**
     *
     * @param element {Object}
     * @param coordinates {Object}
     * @private
     */
    $.Widget.prototype._transform = function (element, coordinates) {
        var provider=$.Widget.prototype.options.$providers.transforms;
        provider.transform(element,coordinates);

    };

    /**
     *
     * @param element {object}
     * @param opts {object}
     * @param callback {function}
     * @private
     */
    $.Widget.prototype._3dTransition = function (element, opts, callback) {
        var provider=$.Widget.prototype.options.$providers.transforms;
        provider.transition3d(element,opts,callback);

    };

    /**
     * requestAnimationFrame wrapper
     * @type {window.requestAnimationFrame|*|Function}
     * @private
     */
    $.Widget.prototype._requestAnimationFrame = (
        window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            setTimeout(callback, 1000 / 60);
        }
        );



    /**
     * binds a touch gesture as a jquery object to the passed element
     * @param element {object}
     * @param obj (object}
     * @returns {object}
     * @private
     */
    $.Widget.prototype._touch = function (element,obj) {
        return element.touch(obj);
    };


    /**
     * queryable device info & media queries attached to the instance
     *
     * @private
     */
    $.Widget.prototype._support = Object.defineProperties({}, {
        'device':{
            get:function(){
                return $.Widget.prototype.options.$providers.device;
            },
            configurable: false
        },

        'mq':{
            get:function(){
                return $.Widget.prototype.options.$providers.mq;
            },
            configurable: false
        }
    });


    /**
     * @param opts {Object}
     * @param callback {Function}
     * @private
     */
    $.Widget.prototype._loadTemplate = function (opts,callback) {
        throw new Error('Load Template method not implemented for this widget');
    };

    /**
     * add modal overlay
     * @param element {Object}
     * @param opts {Object}
     * @param callback {Function}
     * @private
     */
    $.Widget.prototype._setModal = function (element,opts,callback) {
        var div=$('<div class="ui-modal"></div>');
        if(opts.cssClass){
            div.addClass(opts.cssClass);
        }

        if(opts.zIndex){
            div.css({
                'z-index':opts.zIndex
            });
        }
        this._data.modal=div;
        var opacity=(opts.opacity) ? opts.opacity : this._data.modalOpacity;
        div.css({
            opacity:0
        });
        element.append(div);

        this._transitions(div,{
            opacity:opacity,
            duration:250
        },function(){
            if(callback){
                callback();
            }
        });
    };

    /**
     * remove modal
     * @param callback {Function}
     * @private
     */
    $.Widget.prototype._removeModal = function (callback) {
        var self=this;
        var modal=this._data.modal;
        if(!modal || modal===undefined ){
            return;
        }
        this._transitions(modal,{
            opacity:0,
            duration:250
        },function(){
            modal.remove();
            self._data.modal=null;
            if(callback){
                callback();
            }
        });
    };

    /**
     * overwrite the jQuery UI _trigger method because 'name.event' more expressive than the run-on 'nameevent'
     * event subscribing:'widgetName + '.' + type;  'window.show', as opposed to 'windowshow'
     * @param type {String}
     * @param event {Object}
     * @param data {Object}
     * @returns {boolean}
     * @private
     */
    $.Widget.prototype._trigger=function( type, event, data ) {
        var prop, orig,
            callback = this.options[ type ];

        data = data || {};
        event = $.Event( event );
        event.type = ( type === this.widgetEventPrefix ?
            type :
            this.widgetEventPrefix + '.' + type ).toLowerCase();
        // the original event may come from any element
        // so we need to reset the target on the new event
        event.target = this.element[ 0 ];

        // copy original event properties over to the new event
        orig = event.originalEvent;
        if ( orig ) {
            for ( prop in orig ) {
                if ( !( prop in event ) ) {
                    event[ prop ] = orig[ prop ];
                }
            }
        }

        this.element.trigger( event, data );
        return !( $.isFunction( callback ) &&
            callback.apply( this.element[0], [ event ].concat( data ) ) === false ||
            event.isDefaultPrevented() );
    };

    /**
     * location handler
     * @param url {String}
     * @private
     */
    $.Widget.prototype._location=function(url){
        var fn=$.Widget.prototype.options.$providers.location;
        fn(url);
    };

    /**
     * registers custom tag as an custom element
     * @param tag {String}
     * @param ElementProto {Object}
     * @private
     */
    $.Widget.prototype._registerElement=function(tag,ElementProto){
        if(typeof ElementProto ==='undefined'){
            ElementProto=HTMLElement.prototype;
            ElementProto._name='HTMLElement';
        }
        var proto=Object.create(ElementProto);
        var object_={prototype:proto};

        /* register the element */
        if(ElementProto._name==='HTMLElement'){
            document.register(tag,object_);
        }else{
            object_=getExtendedObject(ElementProto._name,object_);
            document.register(tag,object_);
        }

    };

    /**
     * registers an array of custom tags as custom elements
     * @param arr (ofString or ofObject) object={name,prototype)
     * @private
     */
    $.Widget.prototype._registerElements=function(arr){

        if(typeof arr==='string'){ //support simple passing of a string
            $.Widget.prototype._registerElement(arr);
        }else{
            if(arr.length>0){
                arr.forEach(function(t){
                    (typeof t==='string') ? $.Widget.prototype._registerElement(t) : $.Widget.prototype._registerElement(t.name, t.prototype);
                });
            }
        }
    };

    $.Widget.prototype._instantiated=function(element,name){
        return(name=== $.data(element,'custom-' + name));
    };

    $.Widget.prototype._getAttrs=function(element,camelCase){
        return $.widget.getOpts(element,camelCase);
    }


    /* public --------------------------------------------------------------------------------------------------------*/


    /**
     *
     * @param opts {object} opts.model,opts.template
     * @param callback {function}
     * @public
     */
    $.Widget.prototype.loadTemplate = function (opts, callback) {
        this._loadTemplate(opts, function (err, out) {
            if (callback) {
                callback(err, out);
            }
        });
    };

    /**
     *
     * @param options {object}
     * @public
     */
    $.Widget.prototype.setOptions = function (options) {
        this._setOptions(options);
    };


    /* replace show,hide with css3 transitions */
    $.each({ show: "fadeIn", hide: "fadeOut" }, function (method, defaultEffect) {
        $.Widget.prototype[ "_" + method ] = function (element, options, callback) {
            var _event = (options) ? options.event : null;
            if (typeof options === "string") {
                options = { effect: options };
            }
            var hasOptions,
                effectName = !options ?
                    method :
                        options === true || typeof options === "number" ?
                    defaultEffect :
                    options.effect || defaultEffect;
            options = options || {};
            if (typeof options === "number") {
                options = { duration: options };
            }
            hasOptions = !$.isEmptyObject(options);
            options.complete = callback;
            if (options.delay) {
                element.delay(options.delay);
            }

            if (!options.duration) {
                options.duration = 300; //default value
            }

            //we are using our own CSS3 Transitions/animations implementation instead of jQuery UI Effects

            var obj = {};
            obj.duration = options.duration;
            obj.preset = options.effect;

            //test for css3 support; if not, then on 'show' or 'hide', just call the jquery methods
            if ($('html').hasClass('no-css3dtransforms') || options.effect === 'none') {
                if (_event === 'show') {
                    element.show();
                    if (callback) {
                        callback();

                    }
                } else if (_event === 'hide') {
                    element.hide();
                    if (callback) {
                        callback();

                    }
                }

            } else {
                this._transitions(element, obj, callback);
            }
        };
    });

    /**
     * expose render
     * @param element {Object}
     * @param opts {Object}
     * @param callback {Function}
     */
    $.widget.render=function(element,opts,callback){
        $.Widget.prototype._render(element,opts,callback);
    };


    /**
     * getters & setters for widget providers
     *
     */
    $.widget.$providers=function(opts){
        for (var key in opts) {
            if (opts.hasOwnProperty(key)) {
                $.Widget.prototype.options.$providers[key]=opts[key];
            }
        }
    };

    /**
     * getter/setter
     * @type {{options: void}}
     */
    $.widget.config={
        options:Object.defineProperties({}, {
            'mqMaxWidth':{
                get: function () {
                    return  $.Widget.prototype.options.mqMaxWidth;
                },
                set:function(val){
                    $.Widget.prototype.options.mqMaxWidth=val;

                }
            }
        })
    };

    /**
     * custom element info object
     * @returns {{Selector: string, customElements: boolean}}
     */
    $.widget.customElementsObj=function(){
        var Selector_='[data-ui]';
        var customElements=false;
        if($('html').hasClass('customelements')){
            Selector_='ui-element';
            customElements=true;
        }
        return {
            Selector:Selector_,
            customElements:customElements
        }
    };

    /**
     * mutation observer handler
     * parse mutations for widget/element instantiations
     * @param mutations {Array}
     */
    $.widget.onMutation=function(mutations){
        /* support data-ui and ui-element */
        var _custom= $.widget.customElementsObj();
        var Selector_=_custom.Selector;
        var customElements=_custom.customElements;

        /* pass along to any registered listeners */
        $(document).trigger('ellipsis.onMutation',{mutations:mutations});

        mutations.forEach(function (mutation) {
            var added=mutation.addedNodes;
            var removed=mutation.removedNodes;
            if(added.length>0){
                //look for ui-elements
                discoverUIElements(added,Selector_,customElements);
                //look for custom definition elements
                discoverCustomDefinitionElements(added);

            }else if(removed.length>0){
                try{
                    $(document).tooltip('remove',removed);
                }catch(ex){

                }
            }
        });
    };

    /**
     *
     * @param added {Array}
     * @param Selector {String}
     * @param customElements {Boolean}
     * @param doc {Boolean}
     */
    function discoverUIElements(added,Selector,customElements,doc){
        var ui=(doc) ? $(added).find(Selector) : $(added).selfFind(Selector);
        if(ui && ui.length >0){
            $.widget.instantiateUIElements(ui,customElements);
        }
    }

    /**
     *
     * @param added {Array}
     * @param doc {Boolean}
     */
    function discoverCustomDefinitionElements(added,doc){
        var definitions= $.widget.definitions;
        if(definitions && definitions.length){
            definitions.forEach(function(obj){
                var elements=(doc) ? $(added).find(obj.tagName) : $(added).selfFind(obj.tagName);
                if(elements && elements.length >0){
                    $.widget.instantiateCustomDefinitionElements(elements,obj.name);
                }
            });
        }
    }


    /**
     * instantiate custom ui-elements from queried jQuery array
     * @param ui {Array}
     * @param customElements {Boolean}
     */
    $.widget.instantiateUIElements=function(ui,customElements){
        $.each(ui,function(){
            var widget=(customElements) ? $(this).attr('name') : $(this).attr('data-ui');
            if(widget !==undefined){
                widget=widget.toCamelCase();
            }
            var camelCase =(customElements) ? $(this).attr('camel-case') : $(this).attr('data-camel-case');
            if(camelCase===undefined){
                camelCase=true;
            }
            var opts=getOpts(this,camelCase);
            if(opts.name){
                delete opts.name;
            }
            if(opts.ui){
                delete opts.ui;
            }
            if(widget !==undefined && !$.widget.instantiated(this,widget)){
                $(this)[widget](opts);
            }

        });
    };

    /**
     *
     * @param elements {Array}
     * @param name {String}
     */
    $.widget.instantiateCustomDefinitionElements=function(elements,name){
        $.each(elements,function(index,element){
            var camelCase =$(this).attr('camel-case');
            if(camelCase===undefined){
                camelCase=true;
            }
            //check not already instantiated
            var isInstantiated= $.widget.instantiated(element,name);
            if(!isInstantiated){
                var opts=getOpts(element,camelCase);
                $(element)[name](opts);
            }
        });
    };

    /**
     * custom definitions array reference
     * @type {Array}
     */
    $.widget.definitions=[];

    /**
     * register the element as a custom element (depends on Platform which polyfills document.register)
     * @param name {String}
     * @param tagName {String}
     * @param ElementProto {Object}
     * @param registerDef {Boolean}
     */
    $.widget.register=function(name,tagName,ElementProto,registerDef){
        //record the element definition
        var regElement_={};
        regElement_.name=name;
        regElement_.tagName=tagName;

        if(registerDef===undefined){
            registerDef=true;
        }

        //define the object
        var proto=Object.create(ElementProto);
        var object_={prototype:proto};

        /* custom element callbacks
        *  pass them onto the element instance, where the UI factory can hook into them
        * */
        proto.attachedCallback=function(){
            if(this._attachedCallback){
                this._attachedCallback();
            }
        };

        proto.detachedCallback=function(){
            if(this._detachedCallback){
                this._detachedCallback();
            }
        };

        proto.attributeChangedCallback= function(n,o,v){
            if(this._attributeChangedCallback){
                this._attributeChangedCallback(n,o,v);
            }
        };

        /* register the element */
        if(ElementProto._name==='HTMLElement'){
            document.register(tagName,object_);
        }else{
            regElement_.tagName='[is="' + tagName + '"]';
            object_=getExtendedObject(ElementProto._name,object_);
            document.register(tagName,object_);
        }

        if(registerDef){
            $.widget.definitions.push(regElement_);
        }


    };



    /**
     *
     * @param element {Object}
     * @param name {String}
     * @returns {boolean}
     */
    $.widget.instantiated=function(element,name){

        return(name=== $.data(element,'custom-' + name));

    };

    /**
     * register a custom tag as a custom element
     * @param tag
     * @param ElementProto
     */
    $.widget.registerElement=function(tag,ElementProto){
        $.Widget.prototype._registerElement(tag,ElementProto);
    };

    /**
     * register an array of custom tags as custom elements
     * @param arr
     */
    $.widget.registerElements=function(arr){
        $.Widget.prototype._registerElements(arr);
    };

    /**
     * registers the ellipsis css components as custom elements
     */
    $.widget.registerFrameworkElements=function(){
        var arr= $.Widget.prototype._data.$elements;
        arr.forEach(function(t){
            $.widget.registerElement(t);
        });
    };

    /**
     * registers template custom elements
     */
    $.widget.registerTemplateElements=function(){
        $.widget.registerElement('ui-template');
        $.widget.registerElement('ui-model');
    };


    /**
     *
     * @param element {Object}
     * @param camelCase {Boolean}
     * @returns {Object}
     */
    function getOpts(element,camelCase){
        if(camelCase===undefined){
            camelCase=true;
        }
        var opts={};
        $.each(element.attributes,function(i,obj){
            var opt=obj.name;
            var val=obj.value;
            if(!testAttr(opt)){
                var patt=/data-/;
                if(patt.test(opt)){
                    opt=opt.replace('data-','');
                }
                if(camelCase && camelCase !=='false'){
                    (opt !=='template') ? opts[opt.toCamelCase()]= val.toCamelCase() : (opts[opt]=val);
                }else{
                    opts[opt.toCamelCase()]= val;
                }
            }
        });

        return opts;
    }

    /**
     *
     * @param attr {String}
     * @returns {boolean}
     */
    function testAttr(attr){
        var patt=/href|tcmuri|rowspan|colspan|class|nowrap|cellpadding|cellspacing/;
        return patt.test(attr);
    }


    /**
     * returns element 'name' attribute value
     * @param that {Object} this context of caller
     * @param name {String}
     * @returns {String}
     */
    function getName(that,name){
        var nodeName=that.nodeName.toLowerCase();
        if(nodeName ==='input' || nodeName==='select'){
            return name;
        }else{
            var name_=$(that).attr('name');
            return (typeof name_ !== 'undefined') ? name_ : name;
        }

    }

    /**
     * extends the object to pass to document.register for HTML element interfaces that inherit from HTMLElement
     * extended object={prototype:proto,extends:name}
     * ex: HTMLInputElement-->obj.extends='input'
     * @param name {String}
     * @param obj {Object}
     * @returns {Object}
     */
    function getExtendedObject(name,obj){
        var type=name.replace(/HTML/g,'').replace(/Element/g,'');
        type=type.toLowerCase();
        obj.extends=type;
        return obj;
    }

    /**
     *
     * @param element {Object}
     * @param camelCase {Boolean}
     * @returns {Object}
     */
    $.widget.getOpts=function(element,camelCase){
        return getOpts(element,camelCase);
    };

    /**
     * set up an observer to enable declarative element invocation
     */
    (function(){
        $.widget.observer = new MutationObserver($.widget.onMutation);
        $.widget.observer.observe($('body')[0], {childList: true,subtree:true});

        //polymer ready event
        document.addEventListener('WebComponentsReady', function() {
            var _custom= $.widget.customElementsObj();
            var Selector_=_custom.Selector;

            discoverUIElements(document,Selector_,_custom.customElements,true);
            discoverCustomDefinitionElements(document,true);
        });

    })();


    return $;

}));






/*
 * =============================================================
 * ellipsis.element  v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * ellipsis element: the ellipsis UI factory
 *
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('./widget'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['./widget'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function ($) {

    /* customElements object */

    var customElements_=false;
    if($('html').hasClass('customelements')){
        customElements_=true;
    }

    /* define the base element  */
    $.widget('ellipsis.element',{

        /**
         * should never be overwritten, _initElement becomes the de facto dev hook
         * @private
         */
        _create:function(){
            /* init events array */
            this._data.events=[];
            $.extend(this.options, $.Widget.prototype.options);

            /* custom elements assignment */
            if(customElements_){
                this.options.$customElements=true;
                this._data.containerSelector=this._data.$containerSelector;
                this._data.overlayElement=this._data.$overlayElement;
                this._data.drawerElement=this._data.$drawerElement;
                this._data.listItem=this._data.$listItem;
                this._data.listItemElement=this._data.$listItemElement;
                this._data.menuElement=this._data.$menuElement;
                this._data.touchMenuElement=this._data.$touchMenuElement;
                this._data.searchRole=this._data.$searchRole;
                this._data.dropdownElement=this._data.$dropdownElement;
                this._data.toggleSelector=this._data.$toggleSelector;
                this._data.modalElement=this._data.$modalElement;
            }
            //this._onEventTrigger('loaded',{});
            this.__onCreate();
            this._onCreate();
            this._initElement();
            this.__onInit();
            var evt_=this.widgetName + '.loaded';
            $(window).trigger(evt_,{});
            if(customElements_){
                this.__componentCallbacks();
            }

        },

        /**
         * element hook for executing callstack of parent _initElement
         * @private
         */
        __onCreate: function(){
            /* we want "this" to be the widget instance */
            var widget=this;
            if(this.__initFunc && this.__initFunc.length){
                this.__initFunc.forEach(function(f){
                    f.call(widget);
                });
            }
        },


        _onCreate: $.noop,

        /**
         * init Element
         */
        _initElement: $.noop,

        /**
         * generally, should not overwrite this
         * @private
         */
        __onInit:function(){
            this._events();
            this._onInit();
        },

        /**
         * @private
         */
        _onInit: $.noop,


        /**
         * called by default by _onInit; event listener registrations should go here, although this is not a requirement
         */
        _events: $.noop,

        /**
         * event facade
         * register an event listener that is automatically disposed on _destroy()
         * if unbind=true, it is destroyed on any call to _unbindEvents() within the $.element lifecycle
         * NOTE: using the _event facade for event handling not a requirement, just a convenience. The convenience of this
         * facade pattern is not in writing event handlers per se, but in automating the cleanup
         *
         *
         * NOTE: the facade wrapper supports event delegation but does not automatically delegate
         * this._event(li,click,function(event){}) ---> no delegation, listener is attached to each li
         * this._event(ul,click,'li',function(event){}) -->delegation, listener is attached to ul, li clicks bubble up
         *
         * @param element {Object}
         * @param event {String}
         * @param selector {String}
         * @param unbind {Boolean}
         * @param callback {Function}
         * @private
         */
        _event: function (element, event, selector,unbind,callback) {
            var obj = {};
            obj.element = element;
            obj.event = event;

            //support 3-5 params
            var length=arguments.length;
            if(length===3){
                callback=(typeof selector==='function') ? selector : null;
                unbind=false;
                selector=null;
            }else if(length===4){
                callback=(typeof unbind==='function') ? unbind : null;
                if(typeof selector==='boolean'){
                    unbind=selector;
                    selector=null;
                }else{
                    unbind=false;
                }
            }
            obj.selector=selector;
            obj.unbind = unbind;
            obj.callback=callback;
            var arr = this._data.events;
            if ($.inArray(obj, arr) === -1) {
                this._data.events.push(obj);
            }
            if(selector){
                element.on(event,selector,function(){
                    var args = [].slice.call(arguments);
                    if(callback){
                        callback.apply(this,args);
                    }
                });
            }else{
                element.on(event,function(){
                    var args = [].slice.call(arguments);
                    if(callback){
                        callback.apply(this,args);
                    }
                });
            }

        },

        /**
         * unbinds registered event listeners. When called from _destroy(), all events are disposed, regardless.
         * If called during the $.element lifecycle, events are disposed if unbind flag was set at registration
         * @param destroy {Boolean}
         * @private
         */
        _unbindEvents: function (destroy) {
            if (typeof destroy === 'undefined') {
                destroy = false;
            }

            var events=this._data.events;
            $.each(events, function (index, obj) {
                if (!destroy) {
                    if (obj.unbind) {
                        (obj.selector) ? obj.element.off(obj.event,obj.selector,obj.callback) : obj.element.off(obj.event,obj.callback);
                        events.splice(index,1);
                    }
                } else {
                    (obj.selector) ? obj.element.off(obj.event,obj.selector,obj.callback) : obj.element.off(obj.event,obj.callback);
                }
            });

            if (destroy) {
                this._onUnbindEvents();
            }

        },

        /**
         * additional event cleanup, if needed, should be placed here. Invoked on _destroy()
         * @private
         */
        _onUnbindEvents: $.noop,

        /**
         *
         * @param opts {Object}
         * @private
         */
        _showLoader:function(opts){
            if(typeof opts==='undefined'){
                opts={};
            }
            var body=$('body');
            body.loading(opts);
        },

        /**
         *
         * @private
         */
        _hideLoader:function(){
            //this._data.loadingElement.loading('hide');
            var body=$('body');
            body.loading('hide');
        },

        /**
         * convenience wrapper for notification that uses $('body')
         * @param cssClass {String}
         * @param msg {String}
         * @param terminate {Boolean}
         * @param delay {Number}
         * @private
         */
        _notify:function(cssClass,msg,terminate,delay){
            var opts={};
            opts.cssClass=cssClass;
            opts.message=msg;
            opts.terminate=terminate;
            opts.terminateDelay=delay;
            this._notification($('body'),opts);
        },

        /**
         *
         * @param element {Object}
         * @param opts {Object}
         * @param callback {Function}
         * @private
         */
        _notification: function (element, opts, callback) {
            if(typeof opts==='function'){
                callback===opts;
                opts={};
            }else if(!opts){
                opts={};
            }

            opts.inline = opts.inline || false;
            opts.terminateTimeout=opts.terminateTimeout || 1000;
            opts.terminateDelay=opts.terminateDelay || 1000;
            opts.cssClass=opts.cssClass || 'info';
            opts.message=opts.message || 'processing...';
            opts.terminate=opts.terminate || false;


            element.notification(opts);
            element.notification('show');

            if (callback) {
                callback();
            }

        },

        _notificationLabel:function(opts,callback){
            if(this._data.notificationLabel){
                return;
            }
            opts=opts || {};
            opts.cssClass=opts.cssClass || 'info';
            opts.message=opts.message || 'message...';
            var label=$('<div class="ui-semantic-label ' + opts.cssClass + '">' + opts.message + '</div>');
            opts.inline=true;
            this._data.notificationLabel=label;
            this.element.append(label);
            this._notification(label,opts,callback);
        },

        _killNotificationLabel:function(){
            if(this._data.notificationLabel){
                this._data.notificationLabel.remove();
                this._data.notificationLabel=null;
            }
        },

        /**
         *
         * @param opts {Object}
         * @param callback {Function}
         * @private
         */
        _window: function (opts,callback) {
            opts.window=opts.window || {};
            opts.template=opts.template || 'ui-window';
            opts.window.modal = opts.window.modal || true;
            opts.window.animationIn=opts.window.animationIn || 'none';
            opts.context=opts.context || 'model';
            var container=$('<div data-window></div>');
            var body = $('body');
            body.append(container);
            var windowSelector=(this.options.$customElements) ? 'ui-window' : '.ui-window';
            this._render(container,opts,function(err,out){
                var window=container.find(windowSelector);
                window.window(opts.window);
                if(callback){
                    callback(null,window);
                }
                _onHide();

            });

            function _onHide(){
                $(window).on('window.hide',function(event,data){
                    try{
                        container[0].remove();
                    }catch(ex){
                        container.remove();
                    }

                    _off();
                });

            }
            function _off(){
                $(window).off('window.hide',function(event,data){
                    try{
                        container[0].remove();
                    }catch(ex){
                        container.remove();
                    }

                    _off();
                });
            }
        },

        /**
         * returns a window dimension based on passed height,width params and current viewport
         * @param maxWidth {Number}
         * @param maxHeight {Number}
         * @returns {Object}
         * @private
         */
        _getWindowDimensions:function(maxWidth,maxHeight){
            var win={
                height:maxHeight,
                width:maxWidth
            };

            var viewport=this._support.device.viewport;
            if(viewport.height < maxHeight){
                win.height=parseInt(.8*viewport.height);
            }
            if(viewport.width < maxWidth){
                win.width=parseInt(.7*viewport.width);
            }

            return win;

        },


        /**
         * destroy event
         * @private
         */
        _destroy: function () {

            this._unbindEvents(true);
            this.__onDispose();
            this._onDestroy();
            $.removeData(this.element[0],'custom-' + this.widgetName);

        },

        __onDispose:function(){
            var that=this;
            if(this.__disposeFunc && this.__disposeFunc.length){
                this.__disposeFunc.forEach(function(f){
                    f.call(that);
                });
            }
        },

        /* custom element callback events */

        __componentCallbacks:function(){
            var element=this.element[0];
            var self=this;
            element._attributeChangedCallback=function(name,oldValue,newValue){
                self._attributeChangedCallback(name,oldValue,newValue);
            };
            element._attachedCallback=function(){
                self._attachedCallback();
            };
            element._detachedCallback=function(){
                self._detachedCallback();
            };
        },

        _attachedCallback: $.noop,

        _detachedCallback: $.noop,

        _attributeChangedCallback: $.noop,



        /**
         * for cleanup
         * @private
         */
        _dispose: $.noop,


        /**
         * for cleanup
         * @private
         */
        _onDestroy: $.noop



    });


    /**
     * define the factory
     * @param ElementProto {Object} <optional>, only should be supplied if the element not derived from HTMLElement
     * @param name {String}
     * @param tagName {String} <optional>
     * @param base {Object} <optional>
     * @param prototype {Object}
     */
    $.element = function (ElementProto,name,tagName, base, prototype) {
        var baseObject;
        var tagName_=null;
        var ElementProto_=null;

        /* support 2-5 params */
        var length=arguments.length;
        if(length < 2){
            throw "Error: Element requires a minimum of two parameter types: string name and a singleton for the prototype"
        }else if(length===2){
            /*
                 $.element(ElementType,name) ---> $.element(name,prototype);
             */
            prototype = name;
            if(typeof ElementProto==='object'){
                throw "Error: Element requires a string name parameter";
            }
            if(typeof name!=='object'){
                throw "Error: Element requires a singleton for the prototype";
            }
            name=ElementProto;
            baseObject = $.ellipsis.element;
            base=null;
        }else if(length===3){
            /*
                $.element(ElementType,name,tagName) --->
                $.element(ElementType,name,prototype) or $.element(name,tagName,prototype) or $.element(name,base,prototype)
             */
            prototype=tagName;
            if(typeof ElementProto==='object'){
                if(typeof name!=='string'){
                    throw "Error: Element requires a string name parameter";
                }
                if(typeof tagName!=='object'){
                    throw "Error: Element requires a singleton for the prototype";
                }

                ElementProto_=ElementProto;
                baseObject = $.ellipsis.element;
                base=null;
            }else{
                if(typeof tagName==='object'){
                    if(typeof name==='string'){
                        tagName_=name;
                        baseObject = $.ellipsis.element;
                        base=null;
                    }else{
                        base=name;
                    }
                    name=ElementProto;
                }else{
                    throw "Error: Element requires a singleton for the prototype";
                }
            }


        }else if(length===4){
            /*
             $.element(ElementType,name,tagName,base) --->
             $.element(ElementType,name,tagName,prototype) or $.element(ElementType,name,base,prototype)
             or $.element(name,tagName,base,prototype)
             */
            prototype=base;
            if(typeof ElementProto==='object'){
                ElementProto_=ElementProto;
                if(typeof name!=='string'){
                    throw "Error: Element requires a string name parameter";
                }
                if(typeof tagName==='string'){
                    tagName_=tagName;
                    baseObject = $.ellipsis.element;
                    base=null;
                }else{
                    base=tagName;
                }
            }else{
                base=tagName;
                tagName_=name;
                name=ElementProto;
            }
        }else{
            /*
               $.element(ElementType,name,tagName,base,prototype)
             */
            ElementProto_=ElementProto;
            tagName_=tagName;

        }

        if(base){

            var initFunc=[];
            var disposeFunc=[];
            /* element inheritance creates a callstack for the parent elements' _initElement event,written to an array on the element prototype, so they get fired
               in sequence, avoiding being overwritten by the element's _initElement event
             */
            if($.utils.array.isArray(base)){ /* support passing in array of base elements, not just one */
                /* array */

                /* setup baseObject constructor */
                baseObject = function () {};
                baseObject._childConstructors = [];

                /* iterate and extend */
                base.forEach(function(obj){
                    /* obj.__initFunc array of _initElement gets concat'ed to the new stack */
                    if(obj.prototype.__initFunc && obj.prototype.__initFunc.length > 0){
                        initFunc=initFunc.concat(obj.prototype.__initFunc);
                    }
                    if(obj.prototype.__disposeFunc && obj.prototype.__disposeFunc.length > 0){
                        disposeFunc=disposeFunc.concat(obj.prototype.__disposeFunc);
                    }
                    $.extend(baseObject.prototype, obj.prototype, $.ellipsis.element.prototype);

                    /* push obj._initElement onto initFunc stack */
                    initFunc.push(obj.prototype._initElement);
                    disposeFunc.push(obj.prototype._dispose);
                });

                /* attach the stack to the prototype */
                if(initFunc.length > 0){
                    prototype.__initFunc=initFunc;
                }
                if(disposeFunc.length > 0){
                    prototype.__disposeFunc=disposeFunc;
                }

            }else{
                /* object */
                if (base.prototype._initElement) {
                    baseObject = base;
                    if(baseObject.prototype.__initFunc && baseObject.prototype.__initFunc.length > 0){
                        initFunc=initFunc.concat(baseObject.prototype.__initFunc);
                    }
                    if(baseObject.prototype.__disposeFunc && baseObject.prototype.__disposeFunc.length > 0){
                        disposeFunc=disposeFunc.concat(baseObject.prototype.__disposeFunc);
                    }
                    initFunc.push(baseObject.prototype._initElement);
                    disposeFunc.push(baseObject.prototype._dispose);
                } else {
                    /* base is not derived from element, so extend onto a baseObject constructor */
                    baseObject = function () {};
                    baseObject._childConstructors = [];
                    $.extend(baseObject.prototype, base.prototype, $.ellipsis.element.prototype);
                }

                if(initFunc.length > 0){
                    prototype.__initFunc=initFunc;
                }
                if(disposeFunc.length > 0){
                    prototype.__disposeFunc=disposeFunc;
                }
            }
        }

        /* implement using the extended jQuery UI factory */
        $.widget(name, baseObject, prototype);

        /* register the element as a custom element, if enabled */
        if(customElements_){
            if(!tagName_){
                tagName_=name.replace('.','-');
            }
            var name_= name.split( "." )[ 1 ];
            if(!ElementProto_){
                var __proto__=HTMLElement.prototype;
                __proto__._name='HTMLElement';
                __proto__._id=name_;
                __proto__._tag=tagName_;
                ElementProto_=__proto__;
            }else{
                ElementProto._id=name_;
                ElementProto._tag=tagName_;
            }
            $.widget.register(name_,tagName_,ElementProto_);


        }
    };

    //register framework css components as custom elements
    if(customElements_){
        $.element.custom=true;
        try{
            $.widget.registerFrameworkElements();
        }catch(ex){

        }
        $.widget.registerElement('ui-element');
    }

    //register template elements
    try{
        $.widget.registerTemplateElements();
    }catch(ex){

    }

    /* make public props/methods available on $.element */
    for(var key in $.widget){
        $.element[key]= $.widget[key];
    }




    return $;

}));
// Copyright 2012 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

(function(global) {
  'use strict';

  var testingExposeCycleCount = global.testingExposeCycleCount;

  // Detect and do basic sanity checking on Object/Array.observe.
  function detectObjectObserve() {
    if (typeof Object.observe !== 'function' ||
        typeof Array.observe !== 'function') {
      return false;
    }

    var records = [];

    function callback(recs) {
      records = recs;
    }

    var test = {};
    var arr = [];
    Object.observe(test, callback);
    Array.observe(arr, callback);
    test.id = 1;
    test.id = 2;
    delete test.id;
    arr.push(1, 2);
    arr.length = 0;

    Object.deliverChangeRecords(callback);
    if (records.length !== 5)
      return false;

    if (records[0].type != 'add' ||
        records[1].type != 'update' ||
        records[2].type != 'delete' ||
        records[3].type != 'splice' ||
        records[4].type != 'splice') {
      return false;
    }

    Object.unobserve(test, callback);
    Array.unobserve(arr, callback);

    return true;
  }

  var hasObserve = detectObjectObserve();

  function detectEval() {
    // Don't test for eval if we're running in a Chrome App environment.
    // We check for APIs set that only exist in a Chrome App context.
    if (typeof chrome !== 'undefined' && chrome.app && chrome.app.runtime) {
      return false;
    }

    // Firefox OS Apps do not allow eval. This feature detection is very hacky
    // but even if some other platform adds support for this function this code
    // will continue to work.
    if (navigator.getDeviceStorage) {
      return false;
    }

    try {
      var f = new Function('', 'return true;');
      return f();
    } catch (ex) {
      return false;
    }
  }

  var hasEval = detectEval();

  function isIndex(s) {
    return +s === s >>> 0;
  }

  function toNumber(s) {
    return +s;
  }

  function isObject(obj) {
    return obj === Object(obj);
  }

  var numberIsNaN = global.Number.isNaN || function(value) {
    return typeof value === 'number' && global.isNaN(value);
  }

  function areSameValue(left, right) {
    if (left === right)
      return left !== 0 || 1 / left === 1 / right;
    if (numberIsNaN(left) && numberIsNaN(right))
      return true;

    return left !== left && right !== right;
  }

  var createObject = ('__proto__' in {}) ?
    function(obj) { return obj; } :
    function(obj) {
      var proto = obj.__proto__;
      if (!proto)
        return obj;
      var newObject = Object.create(proto);
      Object.getOwnPropertyNames(obj).forEach(function(name) {
        Object.defineProperty(newObject, name,
                             Object.getOwnPropertyDescriptor(obj, name));
      });
      return newObject;
    };

  var identStart = '[\$_a-zA-Z]';
  var identPart = '[\$_a-zA-Z0-9]';
  var identRegExp = new RegExp('^' + identStart + '+' + identPart + '*' + '$');

  function getPathCharType(char) {
    if (char === undefined)
      return 'eof';

    var code = char.charCodeAt(0);

    switch(code) {
      case 0x5B: // [
      case 0x5D: // ]
      case 0x2E: // .
      case 0x22: // "
      case 0x27: // '
      case 0x30: // 0
        return char;

      case 0x5F: // _
      case 0x24: // $
        return 'ident';

      case 0x20: // Space
      case 0x09: // Tab
      case 0x0A: // Newline
      case 0x0D: // Return
      case 0xA0:  // No-break space
      case 0xFEFF:  // Byte Order Mark
      case 0x2028:  // Line Separator
      case 0x2029:  // Paragraph Separator
        return 'ws';
    }

    // a-z, A-Z
    if ((0x61 <= code && code <= 0x7A) || (0x41 <= code && code <= 0x5A))
      return 'ident';

    // 1-9
    if (0x31 <= code && code <= 0x39)
      return 'number';

    return 'else';
  }

  var pathStateMachine = {
    'beforePath': {
      'ws': ['beforePath'],
      'ident': ['inIdent', 'append'],
      '[': ['beforeElement'],
      'eof': ['afterPath']
    },

    'inPath': {
      'ws': ['inPath'],
      '.': ['beforeIdent'],
      '[': ['beforeElement'],
      'eof': ['afterPath']
    },

    'beforeIdent': {
      'ws': ['beforeIdent'],
      'ident': ['inIdent', 'append']
    },

    'inIdent': {
      'ident': ['inIdent', 'append'],
      '0': ['inIdent', 'append'],
      'number': ['inIdent', 'append'],
      'ws': ['inPath', 'push'],
      '.': ['beforeIdent', 'push'],
      '[': ['beforeElement', 'push'],
      'eof': ['afterPath', 'push']
    },

    'beforeElement': {
      'ws': ['beforeElement'],
      '0': ['afterZero', 'append'],
      'number': ['inIndex', 'append'],
      "'": ['inSingleQuote', 'append', ''],
      '"': ['inDoubleQuote', 'append', '']
    },

    'afterZero': {
      'ws': ['afterElement', 'push'],
      ']': ['inPath', 'push']
    },

    'inIndex': {
      '0': ['inIndex', 'append'],
      'number': ['inIndex', 'append'],
      'ws': ['afterElement'],
      ']': ['inPath', 'push']
    },

    'inSingleQuote': {
      "'": ['afterElement'],
      'eof': ['error'],
      'else': ['inSingleQuote', 'append']
    },

    'inDoubleQuote': {
      '"': ['afterElement'],
      'eof': ['error'],
      'else': ['inDoubleQuote', 'append']
    },

    'afterElement': {
      'ws': ['afterElement'],
      ']': ['inPath', 'push']
    }
  }

  function noop() {}

  function parsePath(path) {
    var keys = [];
    var index = -1;
    var c, newChar, key, type, transition, action, typeMap, mode = 'beforePath';

    var actions = {
      push: function() {
        if (key === undefined)
          return;

        keys.push(key);
        key = undefined;
      },

      append: function() {
        if (key === undefined)
          key = newChar
        else
          key += newChar;
      }
    };

    function maybeUnescapeQuote() {
      if (index >= path.length)
        return;

      var nextChar = path[index + 1];
      if ((mode == 'inSingleQuote' && nextChar == "'") ||
          (mode == 'inDoubleQuote' && nextChar == '"')) {
        index++;
        newChar = nextChar;
        actions.append();
        return true;
      }
    }

    while (mode) {
      index++;
      c = path[index];

      if (c == '\\' && maybeUnescapeQuote(mode))
        continue;

      type = getPathCharType(c);
      typeMap = pathStateMachine[mode];
      transition = typeMap[type] || typeMap['else'] || 'error';

      if (transition == 'error')
        return; // parse error;

      mode = transition[0];
      action = actions[transition[1]] || noop;
      newChar = transition[2] === undefined ? c : transition[2];
      action();

      if (mode === 'afterPath') {
        return keys;
      }
    }

    return; // parse error
  }

  function isIdent(s) {
    return identRegExp.test(s);
  }

  var constructorIsPrivate = {};

  function Path(parts, privateToken) {
    if (privateToken !== constructorIsPrivate)
      throw Error('Use Path.get to retrieve path objects');

    for (var i = 0; i < parts.length; i++) {
      this.push(String(parts[i]));
    }

    if (hasEval && this.length) {
      this.getValueFrom = this.compiledGetValueFromFn();
    }
  }

  // TODO(rafaelw): Make simple LRU cache
  var pathCache = {};

  function getPath(pathString) {
    if (pathString instanceof Path)
      return pathString;

    if (pathString == null || pathString.length == 0)
      pathString = '';

    if (typeof pathString != 'string') {
      if (isIndex(pathString.length)) {
        // Constructed with array-like (pre-parsed) keys
        return new Path(pathString, constructorIsPrivate);
      }

      pathString = String(pathString);
    }

    var path = pathCache[pathString];
    if (path)
      return path;

    var parts = parsePath(pathString);
    if (!parts)
      return invalidPath;

    var path = new Path(parts, constructorIsPrivate);
    pathCache[pathString] = path;
    return path;
  }

  Path.get = getPath;

  function formatAccessor(key) {
    if (isIndex(key)) {
      return '[' + key + ']';
    } else {
      return '["' + key.replace(/"/g, '\\"') + '"]';
    }
  }

  Path.prototype = createObject({
    __proto__: [],
    valid: true,

    toString: function() {
      var pathString = '';
      for (var i = 0; i < this.length; i++) {
        var key = this[i];
        if (isIdent(key)) {
          pathString += i ? '.' + key : key;
        } else {
          pathString += formatAccessor(key);
        }
      }

      return pathString;
    },

    getValueFrom: function(obj, directObserver) {
      for (var i = 0; i < this.length; i++) {
        if (obj == null)
          return;
        obj = obj[this[i]];
      }
      return obj;
    },

    iterateObjects: function(obj, observe) {
      for (var i = 0; i < this.length; i++) {
        if (i)
          obj = obj[this[i - 1]];
        if (!isObject(obj))
          return;
        observe(obj, this[0]);
      }
    },

    compiledGetValueFromFn: function() {
      var str = '';
      var pathString = 'obj';
      str += 'if (obj != null';
      var i = 0;
      var key;
      for (; i < (this.length - 1); i++) {
        key = this[i];
        pathString += isIdent(key) ? '.' + key : formatAccessor(key);
        str += ' &&\n     ' + pathString + ' != null';
      }
      str += ')\n';

      var key = this[i];
      pathString += isIdent(key) ? '.' + key : formatAccessor(key);

      str += '  return ' + pathString + ';\nelse\n  return undefined;';
      return new Function('obj', str);
    },

    setValueFrom: function(obj, value) {
      if (!this.length)
        return false;

      for (var i = 0; i < this.length - 1; i++) {
        if (!isObject(obj))
          return false;
        obj = obj[this[i]];
      }

      if (!isObject(obj))
        return false;

      obj[this[i]] = value;
      return true;
    }
  });

  var invalidPath = new Path('', constructorIsPrivate);
  invalidPath.valid = false;
  invalidPath.getValueFrom = invalidPath.setValueFrom = function() {};

  var MAX_DIRTY_CHECK_CYCLES = 1000;

  function dirtyCheck(observer) {
    var cycles = 0;
    while (cycles < MAX_DIRTY_CHECK_CYCLES && observer.check_()) {
      cycles++;
    }
    if (testingExposeCycleCount)
      global.dirtyCheckCycleCount = cycles;

    return cycles > 0;
  }

  function objectIsEmpty(object) {
    for (var prop in object)
      return false;
    return true;
  }

  function diffIsEmpty(diff) {
    return objectIsEmpty(diff.added) &&
           objectIsEmpty(diff.removed) &&
           objectIsEmpty(diff.changed);
  }

  function diffObjectFromOldObject(object, oldObject) {
    var added = {};
    var removed = {};
    var changed = {};

    for (var prop in oldObject) {
      var newValue = object[prop];

      if (newValue !== undefined && newValue === oldObject[prop])
        continue;

      if (!(prop in object)) {
        removed[prop] = undefined;
        continue;
      }

      if (newValue !== oldObject[prop])
        changed[prop] = newValue;
    }

    for (var prop in object) {
      if (prop in oldObject)
        continue;

      added[prop] = object[prop];
    }

    if (Array.isArray(object) && object.length !== oldObject.length)
      changed.length = object.length;

    return {
      added: added,
      removed: removed,
      changed: changed
    };
  }

  var eomTasks = [];
  function runEOMTasks() {
    if (!eomTasks.length)
      return false;

    for (var i = 0; i < eomTasks.length; i++) {
      eomTasks[i]();
    }
    eomTasks.length = 0;
    return true;
  }

  var runEOM = hasObserve ? (function(){
    var eomObj = { pingPong: true };
    var eomRunScheduled = false;

    Object.observe(eomObj, function() {
      runEOMTasks();
      eomRunScheduled = false;
    });

    return function(fn) {
      eomTasks.push(fn);
      if (!eomRunScheduled) {
        eomRunScheduled = true;
        eomObj.pingPong = !eomObj.pingPong;
      }
    };
  })() :
  (function() {
    return function(fn) {
      eomTasks.push(fn);
    };
  })();

  var observedObjectCache = [];

  function newObservedObject() {
    var observer;
    var object;
    var discardRecords = false;
    var first = true;

    function callback(records) {
      if (observer && observer.state_ === OPENED && !discardRecords)
        observer.check_(records);
    }

    return {
      open: function(obs) {
        if (observer)
          throw Error('ObservedObject in use');

        if (!first)
          Object.deliverChangeRecords(callback);

        observer = obs;
        first = false;
      },
      observe: function(obj, arrayObserve) {
        object = obj;
        if (arrayObserve)
          Array.observe(object, callback);
        else
          Object.observe(object, callback);
      },
      deliver: function(discard) {
        discardRecords = discard;
        Object.deliverChangeRecords(callback);
        discardRecords = false;
      },
      close: function() {
        observer = undefined;
        Object.unobserve(object, callback);
        observedObjectCache.push(this);
      }
    };
  }

  /*
   * The observedSet abstraction is a perf optimization which reduces the total
   * number of Object.observe observations of a set of objects. The idea is that
   * groups of Observers will have some object dependencies in common and this
   * observed set ensures that each object in the transitive closure of
   * dependencies is only observed once. The observedSet acts as a write barrier
   * such that whenever any change comes through, all Observers are checked for
   * changed values.
   *
   * Note that this optimization is explicitly moving work from setup-time to
   * change-time.
   *
   * TODO(rafaelw): Implement "garbage collection". In order to move work off
   * the critical path, when Observers are closed, their observed objects are
   * not Object.unobserve(d). As a result, it's possible that if the observedSet
   * is kept open, but some Observers have been closed, it could cause "leaks"
   * (prevent otherwise collectable objects from being collected). At some
   * point, we should implement incremental "gc" which keeps a list of
   * observedSets which may need clean-up and does small amounts of cleanup on a
   * timeout until all is clean.
   */

  function getObservedObject(observer, object, arrayObserve) {
    var dir = observedObjectCache.pop() || newObservedObject();
    dir.open(observer);
    dir.observe(object, arrayObserve);
    return dir;
  }

  var observedSetCache = [];

  function newObservedSet() {
    var observerCount = 0;
    var observers = [];
    var objects = [];
    var rootObj;
    var rootObjProps;

    function observe(obj, prop) {
      if (!obj)
        return;

      if (obj === rootObj)
        rootObjProps[prop] = true;

      if (objects.indexOf(obj) < 0) {
        objects.push(obj);
        Object.observe(obj, callback);
      }

      observe(Object.getPrototypeOf(obj), prop);
    }

    function allRootObjNonObservedProps(recs) {
      for (var i = 0; i < recs.length; i++) {
        var rec = recs[i];
        if (rec.object !== rootObj ||
            rootObjProps[rec.name] ||
            rec.type === 'setPrototype') {
          return false;
        }
      }
      return true;
    }

    function callback(recs) {
      if (allRootObjNonObservedProps(recs))
        return;

      var observer;
      for (var i = 0; i < observers.length; i++) {
        observer = observers[i];
        if (observer.state_ == OPENED) {
          observer.iterateObjects_(observe);
        }
      }

      for (var i = 0; i < observers.length; i++) {
        observer = observers[i];
        if (observer.state_ == OPENED) {
          observer.check_();
        }
      }
    }

    var record = {
      object: undefined,
      objects: objects,
      open: function(obs, object) {
        if (!rootObj) {
          rootObj = object;
          rootObjProps = {};
        }

        observers.push(obs);
        observerCount++;
        obs.iterateObjects_(observe);
      },
      close: function(obs) {
        observerCount--;
        if (observerCount > 0) {
          return;
        }

        for (var i = 0; i < objects.length; i++) {
          Object.unobserve(objects[i], callback);
          Observer.unobservedCount++;
        }

        observers.length = 0;
        objects.length = 0;
        rootObj = undefined;
        rootObjProps = undefined;
        observedSetCache.push(this);
      }
    };

    return record;
  }

  var lastObservedSet;

  function getObservedSet(observer, obj) {
    if (!lastObservedSet || lastObservedSet.object !== obj) {
      lastObservedSet = observedSetCache.pop() || newObservedSet();
      lastObservedSet.object = obj;
    }
    lastObservedSet.open(observer, obj);
    return lastObservedSet;
  }

  var UNOPENED = 0;
  var OPENED = 1;
  var CLOSED = 2;
  var RESETTING = 3;

  var nextObserverId = 1;

  function Observer() {
    this.state_ = UNOPENED;
    this.callback_ = undefined;
    this.target_ = undefined; // TODO(rafaelw): Should be WeakRef
    this.directObserver_ = undefined;
    this.value_ = undefined;
    this.id_ = nextObserverId++;
  }

  Observer.prototype = {
    open: function(callback, target) {
      if (this.state_ != UNOPENED)
        throw Error('Observer has already been opened.');

      addToAll(this);
      this.callback_ = callback;
      this.target_ = target;
      this.connect_();
      this.state_ = OPENED;
      return this.value_;
    },

    close: function() {
      if (this.state_ != OPENED)
        return;

      removeFromAll(this);
      this.disconnect_();
      this.value_ = undefined;
      this.callback_ = undefined;
      this.target_ = undefined;
      this.state_ = CLOSED;
    },

    deliver: function() {
      if (this.state_ != OPENED)
        return;

      dirtyCheck(this);
    },

    report_: function(changes) {
      try {
        this.callback_.apply(this.target_, changes);
      } catch (ex) {
        Observer._errorThrownDuringCallback = true;
        console.error('Exception caught during observer callback: ' +
                       (ex.stack || ex));
      }
    },

    discardChanges: function() {
      this.check_(undefined, true);
      return this.value_;
    }
  }

  var collectObservers = !hasObserve;
  var allObservers;
  Observer._allObserversCount = 0;

  if (collectObservers) {
    allObservers = [];
  }

  function addToAll(observer) {
    Observer._allObserversCount++;
    if (!collectObservers)
      return;

    allObservers.push(observer);
  }

  function removeFromAll(observer) {
    Observer._allObserversCount--;
  }

  var runningMicrotaskCheckpoint = false;

  var hasDebugForceFullDelivery = hasObserve && hasEval && (function() {
    try {
      eval('%RunMicrotasks()');
      return true;
    } catch (ex) {
      return false;
    }
  })();

  global.Platform = global.Platform || {};

  global.Platform.performMicrotaskCheckpoint = function() {
    if (runningMicrotaskCheckpoint)
      return;

    if (hasDebugForceFullDelivery) {
      eval('%RunMicrotasks()');
      return;
    }

    if (!collectObservers)
      return;

    runningMicrotaskCheckpoint = true;

    var cycles = 0;
    var anyChanged, toCheck;

    do {
      cycles++;
      toCheck = allObservers;
      allObservers = [];
      anyChanged = false;

      for (var i = 0; i < toCheck.length; i++) {
        var observer = toCheck[i];
        if (observer.state_ != OPENED)
          continue;

        if (observer.check_())
          anyChanged = true;

        allObservers.push(observer);
      }
      if (runEOMTasks())
        anyChanged = true;
    } while (cycles < MAX_DIRTY_CHECK_CYCLES && anyChanged);

    if (testingExposeCycleCount)
      global.dirtyCheckCycleCount = cycles;

    runningMicrotaskCheckpoint = false;
  };

  if (collectObservers) {
    global.Platform.clearObservers = function() {
      allObservers = [];
    };
  }

  function ObjectObserver(object) {
    Observer.call(this);
    this.value_ = object;
    this.oldObject_ = undefined;
  }

  ObjectObserver.prototype = createObject({
    __proto__: Observer.prototype,

    arrayObserve: false,

    connect_: function(callback, target) {
      if (hasObserve) {
        this.directObserver_ = getObservedObject(this, this.value_,
                                                 this.arrayObserve);
      } else {
        this.oldObject_ = this.copyObject(this.value_);
      }

    },

    copyObject: function(object) {
      var copy = Array.isArray(object) ? [] : {};
      for (var prop in object) {
        copy[prop] = object[prop];
      };
      if (Array.isArray(object))
        copy.length = object.length;
      return copy;
    },

    check_: function(changeRecords, skipChanges) {
      var diff;
      var oldValues;
      if (hasObserve) {
        if (!changeRecords)
          return false;

        oldValues = {};
        diff = diffObjectFromChangeRecords(this.value_, changeRecords,
                                           oldValues);
      } else {
        oldValues = this.oldObject_;
        diff = diffObjectFromOldObject(this.value_, this.oldObject_);
      }

      if (diffIsEmpty(diff))
        return false;

      if (!hasObserve)
        this.oldObject_ = this.copyObject(this.value_);

      this.report_([
        diff.added || {},
        diff.removed || {},
        diff.changed || {},
        function(property) {
          return oldValues[property];
        }
      ]);

      return true;
    },

    disconnect_: function() {
      if (hasObserve) {
        this.directObserver_.close();
        this.directObserver_ = undefined;
      } else {
        this.oldObject_ = undefined;
      }
    },

    deliver: function() {
      if (this.state_ != OPENED)
        return;

      if (hasObserve)
        this.directObserver_.deliver(false);
      else
        dirtyCheck(this);
    },

    discardChanges: function() {
      if (this.directObserver_)
        this.directObserver_.deliver(true);
      else
        this.oldObject_ = this.copyObject(this.value_);

      return this.value_;
    }
  });

  function ArrayObserver(array) {
    if (!Array.isArray(array))
      throw Error('Provided object is not an Array');
    ObjectObserver.call(this, array);
  }

  ArrayObserver.prototype = createObject({

    __proto__: ObjectObserver.prototype,

    arrayObserve: true,

    copyObject: function(arr) {
      return arr.slice();
    },

    check_: function(changeRecords) {
      var splices;
      if (hasObserve) {
        if (!changeRecords)
          return false;
        splices = projectArraySplices(this.value_, changeRecords);
      } else {
        splices = calcSplices(this.value_, 0, this.value_.length,
                              this.oldObject_, 0, this.oldObject_.length);
      }

      if (!splices || !splices.length)
        return false;

      if (!hasObserve)
        this.oldObject_ = this.copyObject(this.value_);

      this.report_([splices]);
      return true;
    }
  });

  ArrayObserver.applySplices = function(previous, current, splices) {
    splices.forEach(function(splice) {
      var spliceArgs = [splice.index, splice.removed.length];
      var addIndex = splice.index;
      while (addIndex < splice.index + splice.addedCount) {
        spliceArgs.push(current[addIndex]);
        addIndex++;
      }

      Array.prototype.splice.apply(previous, spliceArgs);
    });
  };

  function PathObserver(object, path) {
    Observer.call(this);

    this.object_ = object;
    this.path_ = getPath(path);
    this.directObserver_ = undefined;
  }

  PathObserver.prototype = createObject({
    __proto__: Observer.prototype,

    get path() {
      return this.path_;
    },

    connect_: function() {
      if (hasObserve)
        this.directObserver_ = getObservedSet(this, this.object_);

      this.check_(undefined, true);
    },

    disconnect_: function() {
      this.value_ = undefined;

      if (this.directObserver_) {
        this.directObserver_.close(this);
        this.directObserver_ = undefined;
      }
    },

    iterateObjects_: function(observe) {
      this.path_.iterateObjects(this.object_, observe);
    },

    check_: function(changeRecords, skipChanges) {
      var oldValue = this.value_;
      this.value_ = this.path_.getValueFrom(this.object_);
      if (skipChanges || areSameValue(this.value_, oldValue))
        return false;

      this.report_([this.value_, oldValue, this]);
      return true;
    },

    setValue: function(newValue) {
      if (this.path_)
        this.path_.setValueFrom(this.object_, newValue);
    }
  });

  function CompoundObserver(reportChangesOnOpen) {
    Observer.call(this);

    this.reportChangesOnOpen_ = reportChangesOnOpen;
    this.value_ = [];
    this.directObserver_ = undefined;
    this.observed_ = [];
  }

  var observerSentinel = {};

  CompoundObserver.prototype = createObject({
    __proto__: Observer.prototype,

    connect_: function() {
      if (hasObserve) {
        var object;
        var needsDirectObserver = false;
        for (var i = 0; i < this.observed_.length; i += 2) {
          object = this.observed_[i]
          if (object !== observerSentinel) {
            needsDirectObserver = true;
            break;
          }
        }

        if (needsDirectObserver)
          this.directObserver_ = getObservedSet(this, object);
      }

      this.check_(undefined, !this.reportChangesOnOpen_);
    },

    disconnect_: function() {
      for (var i = 0; i < this.observed_.length; i += 2) {
        if (this.observed_[i] === observerSentinel)
          this.observed_[i + 1].close();
      }
      this.observed_.length = 0;
      this.value_.length = 0;

      if (this.directObserver_) {
        this.directObserver_.close(this);
        this.directObserver_ = undefined;
      }
    },

    addPath: function(object, path) {
      if (this.state_ != UNOPENED && this.state_ != RESETTING)
        throw Error('Cannot add paths once started.');

      var path = getPath(path);
      this.observed_.push(object, path);
      if (!this.reportChangesOnOpen_)
        return;
      var index = this.observed_.length / 2 - 1;
      this.value_[index] = path.getValueFrom(object);
    },

    addObserver: function(observer) {
      if (this.state_ != UNOPENED && this.state_ != RESETTING)
        throw Error('Cannot add observers once started.');

      this.observed_.push(observerSentinel, observer);
      if (!this.reportChangesOnOpen_)
        return;
      var index = this.observed_.length / 2 - 1;
      this.value_[index] = observer.open(this.deliver, this);
    },

    startReset: function() {
      if (this.state_ != OPENED)
        throw Error('Can only reset while open');

      this.state_ = RESETTING;
      this.disconnect_();
    },

    finishReset: function() {
      if (this.state_ != RESETTING)
        throw Error('Can only finishReset after startReset');
      this.state_ = OPENED;
      this.connect_();

      return this.value_;
    },

    iterateObjects_: function(observe) {
      var object;
      for (var i = 0; i < this.observed_.length; i += 2) {
        object = this.observed_[i]
        if (object !== observerSentinel)
          this.observed_[i + 1].iterateObjects(object, observe)
      }
    },

    check_: function(changeRecords, skipChanges) {
      var oldValues;
      for (var i = 0; i < this.observed_.length; i += 2) {
        var object = this.observed_[i];
        var path = this.observed_[i+1];
        var value;
        if (object === observerSentinel) {
          var observable = path;
          value = this.state_ === UNOPENED ?
              observable.open(this.deliver, this) :
              observable.discardChanges();
        } else {
          value = path.getValueFrom(object);
        }

        if (skipChanges) {
          this.value_[i / 2] = value;
          continue;
        }

        if (areSameValue(value, this.value_[i / 2]))
          continue;

        oldValues = oldValues || [];
        oldValues[i / 2] = this.value_[i / 2];
        this.value_[i / 2] = value;
      }

      if (!oldValues)
        return false;

      // TODO(rafaelw): Having observed_ as the third callback arg here is
      // pretty lame API. Fix.
      this.report_([this.value_, oldValues, this.observed_]);
      return true;
    }
  });

  function identFn(value) { return value; }

  function ObserverTransform(observable, getValueFn, setValueFn,
                             dontPassThroughSet) {
    this.callback_ = undefined;
    this.target_ = undefined;
    this.value_ = undefined;
    this.observable_ = observable;
    this.getValueFn_ = getValueFn || identFn;
    this.setValueFn_ = setValueFn || identFn;
    // TODO(rafaelw): This is a temporary hack. PolymerExpressions needs this
    // at the moment because of a bug in it's dependency tracking.
    this.dontPassThroughSet_ = dontPassThroughSet;
  }

  ObserverTransform.prototype = {
    open: function(callback, target) {
      this.callback_ = callback;
      this.target_ = target;
      this.value_ =
          this.getValueFn_(this.observable_.open(this.observedCallback_, this));
      return this.value_;
    },

    observedCallback_: function(value) {
      value = this.getValueFn_(value);
      if (areSameValue(value, this.value_))
        return;
      var oldValue = this.value_;
      this.value_ = value;
      this.callback_.call(this.target_, this.value_, oldValue);
    },

    discardChanges: function() {
      this.value_ = this.getValueFn_(this.observable_.discardChanges());
      return this.value_;
    },

    deliver: function() {
      return this.observable_.deliver();
    },

    setValue: function(value) {
      value = this.setValueFn_(value);
      if (!this.dontPassThroughSet_ && this.observable_.setValue)
        return this.observable_.setValue(value);
    },

    close: function() {
      if (this.observable_)
        this.observable_.close();
      this.callback_ = undefined;
      this.target_ = undefined;
      this.observable_ = undefined;
      this.value_ = undefined;
      this.getValueFn_ = undefined;
      this.setValueFn_ = undefined;
    }
  }

  var expectedRecordTypes = {
    add: true,
    update: true,
    delete: true
  };

  function diffObjectFromChangeRecords(object, changeRecords, oldValues) {
    var added = {};
    var removed = {};

    for (var i = 0; i < changeRecords.length; i++) {
      var record = changeRecords[i];
      if (!expectedRecordTypes[record.type]) {
        console.error('Unknown changeRecord type: ' + record.type);
        console.error(record);
        continue;
      }

      if (!(record.name in oldValues))
        oldValues[record.name] = record.oldValue;

      if (record.type == 'update')
        continue;

      if (record.type == 'add') {
        if (record.name in removed)
          delete removed[record.name];
        else
          added[record.name] = true;

        continue;
      }

      // type = 'delete'
      if (record.name in added) {
        delete added[record.name];
        delete oldValues[record.name];
      } else {
        removed[record.name] = true;
      }
    }

    for (var prop in added)
      added[prop] = object[prop];

    for (var prop in removed)
      removed[prop] = undefined;

    var changed = {};
    for (var prop in oldValues) {
      if (prop in added || prop in removed)
        continue;

      var newValue = object[prop];
      if (oldValues[prop] !== newValue)
        changed[prop] = newValue;
    }

    return {
      added: added,
      removed: removed,
      changed: changed
    };
  }

  function newSplice(index, removed, addedCount) {
    return {
      index: index,
      removed: removed,
      addedCount: addedCount
    };
  }

  var EDIT_LEAVE = 0;
  var EDIT_UPDATE = 1;
  var EDIT_ADD = 2;
  var EDIT_DELETE = 3;

  function ArraySplice() {}

  ArraySplice.prototype = {

    // Note: This function is *based* on the computation of the Levenshtein
    // "edit" distance. The one change is that "updates" are treated as two
    // edits - not one. With Array splices, an update is really a delete
    // followed by an add. By retaining this, we optimize for "keeping" the
    // maximum array items in the original array. For example:
    //
    //   'xxxx123' -> '123yyyy'
    //
    // With 1-edit updates, the shortest path would be just to update all seven
    // characters. With 2-edit updates, we delete 4, leave 3, and add 4. This
    // leaves the substring '123' intact.
    calcEditDistances: function(current, currentStart, currentEnd,
                                old, oldStart, oldEnd) {
      // "Deletion" columns
      var rowCount = oldEnd - oldStart + 1;
      var columnCount = currentEnd - currentStart + 1;
      var distances = new Array(rowCount);

      // "Addition" rows. Initialize null column.
      for (var i = 0; i < rowCount; i++) {
        distances[i] = new Array(columnCount);
        distances[i][0] = i;
      }

      // Initialize null row
      for (var j = 0; j < columnCount; j++)
        distances[0][j] = j;

      for (var i = 1; i < rowCount; i++) {
        for (var j = 1; j < columnCount; j++) {
          if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
            distances[i][j] = distances[i - 1][j - 1];
          else {
            var north = distances[i - 1][j] + 1;
            var west = distances[i][j - 1] + 1;
            distances[i][j] = north < west ? north : west;
          }
        }
      }

      return distances;
    },

    // This starts at the final weight, and walks "backward" by finding
    // the minimum previous weight recursively until the origin of the weight
    // matrix.
    spliceOperationsFromEditDistances: function(distances) {
      var i = distances.length - 1;
      var j = distances[0].length - 1;
      var current = distances[i][j];
      var edits = [];
      while (i > 0 || j > 0) {
        if (i == 0) {
          edits.push(EDIT_ADD);
          j--;
          continue;
        }
        if (j == 0) {
          edits.push(EDIT_DELETE);
          i--;
          continue;
        }
        var northWest = distances[i - 1][j - 1];
        var west = distances[i - 1][j];
        var north = distances[i][j - 1];

        var min;
        if (west < north)
          min = west < northWest ? west : northWest;
        else
          min = north < northWest ? north : northWest;

        if (min == northWest) {
          if (northWest == current) {
            edits.push(EDIT_LEAVE);
          } else {
            edits.push(EDIT_UPDATE);
            current = northWest;
          }
          i--;
          j--;
        } else if (min == west) {
          edits.push(EDIT_DELETE);
          i--;
          current = west;
        } else {
          edits.push(EDIT_ADD);
          j--;
          current = north;
        }
      }

      edits.reverse();
      return edits;
    },

    /**
     * Splice Projection functions:
     *
     * A splice map is a representation of how a previous array of items
     * was transformed into a new array of items. Conceptually it is a list of
     * tuples of
     *
     *   <index, removed, addedCount>
     *
     * which are kept in ascending index order of. The tuple represents that at
     * the |index|, |removed| sequence of items were removed, and counting forward
     * from |index|, |addedCount| items were added.
     */

    /**
     * Lacking individual splice mutation information, the minimal set of
     * splices can be synthesized given the previous state and final state of an
     * array. The basic approach is to calculate the edit distance matrix and
     * choose the shortest path through it.
     *
     * Complexity: O(l * p)
     *   l: The length of the current array
     *   p: The length of the old array
     */
    calcSplices: function(current, currentStart, currentEnd,
                          old, oldStart, oldEnd) {
      var prefixCount = 0;
      var suffixCount = 0;

      var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
      if (currentStart == 0 && oldStart == 0)
        prefixCount = this.sharedPrefix(current, old, minLength);

      if (currentEnd == current.length && oldEnd == old.length)
        suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);

      currentStart += prefixCount;
      oldStart += prefixCount;
      currentEnd -= suffixCount;
      oldEnd -= suffixCount;

      if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
        return [];

      if (currentStart == currentEnd) {
        var splice = newSplice(currentStart, [], 0);
        while (oldStart < oldEnd)
          splice.removed.push(old[oldStart++]);

        return [ splice ];
      } else if (oldStart == oldEnd)
        return [ newSplice(currentStart, [], currentEnd - currentStart) ];

      var ops = this.spliceOperationsFromEditDistances(
          this.calcEditDistances(current, currentStart, currentEnd,
                                 old, oldStart, oldEnd));

      var splice = undefined;
      var splices = [];
      var index = currentStart;
      var oldIndex = oldStart;
      for (var i = 0; i < ops.length; i++) {
        switch(ops[i]) {
          case EDIT_LEAVE:
            if (splice) {
              splices.push(splice);
              splice = undefined;
            }

            index++;
            oldIndex++;
            break;
          case EDIT_UPDATE:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.addedCount++;
            index++;

            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
          case EDIT_ADD:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.addedCount++;
            index++;
            break;
          case EDIT_DELETE:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
        }
      }

      if (splice) {
        splices.push(splice);
      }
      return splices;
    },

    sharedPrefix: function(current, old, searchLength) {
      for (var i = 0; i < searchLength; i++)
        if (!this.equals(current[i], old[i]))
          return i;
      return searchLength;
    },

    sharedSuffix: function(current, old, searchLength) {
      var index1 = current.length;
      var index2 = old.length;
      var count = 0;
      while (count < searchLength && this.equals(current[--index1], old[--index2]))
        count++;

      return count;
    },

    calculateSplices: function(current, previous) {
      return this.calcSplices(current, 0, current.length, previous, 0,
                              previous.length);
    },

    equals: function(currentValue, previousValue) {
      return currentValue === previousValue;
    }
  };

  var arraySplice = new ArraySplice();

  function calcSplices(current, currentStart, currentEnd,
                       old, oldStart, oldEnd) {
    return arraySplice.calcSplices(current, currentStart, currentEnd,
                                   old, oldStart, oldEnd);
  }

  function intersect(start1, end1, start2, end2) {
    // Disjoint
    if (end1 < start2 || end2 < start1)
      return -1;

    // Adjacent
    if (end1 == start2 || end2 == start1)
      return 0;

    // Non-zero intersect, span1 first
    if (start1 < start2) {
      if (end1 < end2)
        return end1 - start2; // Overlap
      else
        return end2 - start2; // Contained
    } else {
      // Non-zero intersect, span2 first
      if (end2 < end1)
        return end2 - start1; // Overlap
      else
        return end1 - start1; // Contained
    }
  }

  function mergeSplice(splices, index, removed, addedCount) {

    var splice = newSplice(index, removed, addedCount);

    var inserted = false;
    var insertionOffset = 0;

    for (var i = 0; i < splices.length; i++) {
      var current = splices[i];
      current.index += insertionOffset;

      if (inserted)
        continue;

      var intersectCount = intersect(splice.index,
                                     splice.index + splice.removed.length,
                                     current.index,
                                     current.index + current.addedCount);

      if (intersectCount >= 0) {
        // Merge the two splices

        splices.splice(i, 1);
        i--;

        insertionOffset -= current.addedCount - current.removed.length;

        splice.addedCount += current.addedCount - intersectCount;
        var deleteCount = splice.removed.length +
                          current.removed.length - intersectCount;

        if (!splice.addedCount && !deleteCount) {
          // merged splice is a noop. discard.
          inserted = true;
        } else {
          var removed = current.removed;

          if (splice.index < current.index) {
            // some prefix of splice.removed is prepended to current.removed.
            var prepend = splice.removed.slice(0, current.index - splice.index);
            Array.prototype.push.apply(prepend, removed);
            removed = prepend;
          }

          if (splice.index + splice.removed.length > current.index + current.addedCount) {
            // some suffix of splice.removed is appended to current.removed.
            var append = splice.removed.slice(current.index + current.addedCount - splice.index);
            Array.prototype.push.apply(removed, append);
          }

          splice.removed = removed;
          if (current.index < splice.index) {
            splice.index = current.index;
          }
        }
      } else if (splice.index < current.index) {
        // Insert splice here.

        inserted = true;

        splices.splice(i, 0, splice);
        i++;

        var offset = splice.addedCount - splice.removed.length
        current.index += offset;
        insertionOffset += offset;
      }
    }

    if (!inserted)
      splices.push(splice);
  }

  function createInitialSplices(array, changeRecords) {
    var splices = [];

    for (var i = 0; i < changeRecords.length; i++) {
      var record = changeRecords[i];
      switch(record.type) {
        case 'splice':
          mergeSplice(splices, record.index, record.removed.slice(), record.addedCount);
          break;
        case 'add':
        case 'update':
        case 'delete':
          if (!isIndex(record.name))
            continue;
          var index = toNumber(record.name);
          if (index < 0)
            continue;
          mergeSplice(splices, index, [record.oldValue], 1);
          break;
        default:
          console.error('Unexpected record type: ' + JSON.stringify(record));
          break;
      }
    }

    return splices;
  }

  function projectArraySplices(array, changeRecords) {
    var splices = [];

    createInitialSplices(array, changeRecords).forEach(function(splice) {
      if (splice.addedCount == 1 && splice.removed.length == 1) {
        if (splice.removed[0] !== array[splice.index])
          splices.push(splice);

        return
      };

      splices = splices.concat(calcSplices(array, splice.index, splice.index + splice.addedCount,
                                           splice.removed, 0, splice.removed.length));
    });

    return splices;
  }

  global.Observer = Observer;
  global.Observer.runEOM_ = runEOM;
  global.Observer.observerSentinel_ = observerSentinel; // for testing.
  global.Observer.hasObjectObserve = hasObserve;
  global.ArrayObserver = ArrayObserver;
  global.ArrayObserver.calculateSplices = function(current, previous) {
    return arraySplice.calculateSplices(current, previous);
  };

  global.ArraySplice = ArraySplice;
  global.ObjectObserver = ObjectObserver;
  global.PathObserver = PathObserver;
  global.CompoundObserver = CompoundObserver;
  global.Path = Path;
  global.ObserverTransform = ObserverTransform;
})(typeof global !== 'undefined' && global && typeof module !== 'undefined' && module ? global : this || window);

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals (root is window)
        root._utils=root._utils || {};
        root._utils.forEach=factory();
        root.returnExports = root._utils.forEach;
    }
}(this, function () {
    var hasOwn = Object.prototype.hasOwnProperty;
    var toString = Object.prototype.toString;

    return function forEach (obj, fn, ctx) {
        if (toString.call(fn) !== '[object Function]') {
            throw new TypeError('iterator must be a function');
        }
        var l = obj.length;
        if (l === +l) {
            for (var i = 0; i < l; i++) {
                fn.call(ctx, obj[i], i, obj);
            }
        } else {
            for (var k in obj) {
                if (hasOwn.call(obj, k)) {
                    fn.call(ctx, obj[k], k, obj);
                }
            }
        }
    };

}));









(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('foreach'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['foreach'], factory);
    } else {
        // Browser globals (root is window)
        root._utils.jsonPointer=factory(root._utils.forEach);
        root.returnExports = root._utils.jsonPointer;
    }
}(this, function (forEach) {

    /**
     * Convenience wrapper around the api.
     * Calls `.get` when called with an `object` and a `pointer`.
     * Calls `.set` when also called with `value`.
     * If only supplied `object`, returns a partially applied function, mapped to the object.
     *
     * @param obj
     * @param pointer
     * @param value
     * @returns {*}
     */
    var each=forEach;
    function api (obj, pointer, value) {
        // .set()
        if (arguments.length === 3) {
            return api.set(obj, pointer, value);
        }
        // .get()
        if (arguments.length === 2) {
            return api.get(obj, pointer);
        }
        // Return a partially applied function on `obj`.
        var wrapped = api.bind(api, obj);

        // Support for oo style
        for (var name in api) {
            if (api.hasOwnProperty(name)) {
                wrapped[name] = api[name].bind(wrapped, obj);
            }
        }
        return wrapped;
    }


    /**
     * Lookup a json pointer in an object
     *
     * @param obj
     * @param pointer
     * @returns {*}
     */
    api.get = function get (obj, pointer) {
        var tok,
            refTokens = api.parse(pointer);
        while (refTokens.length) {
            tok = refTokens.shift();
            if (!obj.hasOwnProperty(tok)) {
                throw new Error('Invalid reference token: ' + tok);
            }
            obj = obj[tok];
        }
        return obj;
    };

    /**
     * Sets a value on an object
     *
     * @param obj
     * @param pointer
     * @param value
     */
    api.set = function set (obj, pointer, value) {
        var refTokens = api.parse(pointer),
            tok,
            nextTok = refTokens[0];
        while (refTokens.length > 1) {
            tok = refTokens.shift();
            nextTok = refTokens[0];

            if (!obj.hasOwnProperty(tok)) {
                if (nextTok.match(/^\d+$/)) {
                    obj[tok] = [];
                } else {
                    obj[tok] = {};
                }
            }
            obj = obj[tok];
        }
        obj[nextTok] = value;
        return this;
    };

    /**
     * Removes an attribute
     *
     * @param obj
     * @param pointer
     */
    api.remove = function (obj, pointer) {
        var refTokens = api.parse(pointer);
        var finalToken = refTokens.pop();
        if (finalToken === undefined) {
            throw new Error('Invalid JSON pointer for remove: "' + pointer + '"');
        }
        delete api.get(obj, api.compile(refTokens))[finalToken];
    };

    /**
     * Returns a (pointer -> value) dictionary for an object
     *
     * @param obj
     * @param {function} descend
     * @returns {}
     */
    api.dict = function dict (obj, descend) {
        var results = {};
        api.walk(obj, function (value, pointer) {
            results[pointer] = value;
        }, descend);
        return results;
    };

    /**
     * Iterates over an object
     * Iterator: function (value, pointer) {}
     *
     * @param obj
     * @param {function} iterator
     * @param {function} descend
     */
    api.walk = function walk (obj, iterator, descend) {
        var refTokens = [];

        descend = descend || function (value) {
            var type = Object.prototype.toString.call(value);
            return type === '[object Object]' || type === '[object Array]';
        };

        (function next (cur) {
            each(cur, function (value, key) {
                refTokens.push(String(key));
                if (descend(value)) {
                    next(value);
                } else {
                    iterator(value, api.compile(refTokens));
                }
                refTokens.pop();
            });
        }(obj));
    };

    /**
     * Tests if an object has a value for a json pointer
     *
     * @param obj
     * @param pointer
     * @returns {boolean}
     */
    api.has = function has (obj, pointer) {
        try {
            api.get(obj, pointer);
        } catch (e) {
            return false;
        }
        return true;
    };

    /**
     * Escapes a reference token
     *
     * @param str
     * @returns {string}
     */
    api.escape = function escape (str) {
        return str.toString().replace(/~/g, '~0').replace(/\//g, '~1');
    };

    /**
     * Unescapes a reference token
     *
     * @param str
     * @returns {string}
     */
    api.unescape = function unescape (str) {
        return str.replace(/~1/g, '/').replace(/~0/g, '~');
    };

    /**
     * Converts a json pointer into a array of reference tokens
     *
     * @param pointer
     * @returns {Array}
     */
    api.parse = function parse (pointer) {
        if (pointer === '') { return []; }
        if (pointer.charAt(0) !== '/') { throw new Error('Invalid JSON pointer: ' + pointer); }
        return pointer.substring(1).split(/\//).map(api.unescape);
    };

    /**
     * Builds a json pointer from a array of reference tokens
     *
     * @param refTokens
     * @returns {string}
     */
    api.compile = function compile (refTokens) {
        if (refTokens.length === 0) { return ''; }
        return '/' + refTokens.map(api.escape).join('/');
    };

    return api;


}));










(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('json-pointer'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['json-pointer'], factory);
    } else {
        // Browser globals (root is window)
        root.Nested=factory(root._utils.jsonPointer);
        root.returnExports = root.Nested;
    }
}(this, function (jsonPointer) {

    var pointer = jsonPointer;
    var Nested=Object.create(null);
// This weak map is used for `.deliverChangeRecords(callback)` calls, where the
// provided callback has to mapped to its corresponding delegate.
    var delegates = new WeakMap; // <callback, delegate>

// When using `.observe(obj, callback)`, instead of forwarding the provided
// `callback` to `Object.observe(obj, callback)` directly, a delegate for the
// `callback` is created. This delegate transforms changes before forwarding
// them to the actual `callback`.
    var Delegate = function(callback) {
        this.callback  = callback;
        this.observers = new WeakMap;

        var self = this;
        this.handleChangeRecords = function(records) {
            try {
                var changes = records.map(self.transform, self);
                changes = Array.prototype.concat.apply([], changes); // flatten
                self.callback(changes)
            } catch (err) {
                if (Nested.debug) console.error(err.stack)
            }
        }
    };

// This method transforms the received change record with using the
// corresponding observer for the object that got changed.
    Delegate.prototype.transform = function(record) {
        var observers = this.observers.get(record.object);
        observers = observers.filter(function(value, index, self) {
            return self.indexOf(value) === index
        });
        return observers.map(function(observer) {
            return observer.transform(record)
        })
    };

// Each callback/object pair gets its own observer, which is used to track
// positions of nested objects and transforms change records accordingly.
    var Observer = function(root, delegate, accept) {
        this.root     = root;
        this.delegate = delegate;
        this.callback = delegate.handleChangeRecords;
        this.accept   = accept;
        this.paths    = new WeakMap
    }

// Recursively observe an object and its nested objects.
    Observer.prototype.observe = function(obj, path, visited) {
        if (!path)    path = '';
        if (!visited) visited = new WeakMap;

        if (visited.has(obj)) {
            return
        }

        visited.set(obj, true);

        // if the object is already observed, i.e., already somewhere else in the
        // nested structure -> do not observe it again
        if (!hasAt(this.delegate.observers, obj, this)) {
            if (Array.isArray(obj) && !this.accept) {
                Object.observe(obj, this.callback, ['add', 'update', 'delete', 'splice'])
            } else {
                Object.observe(obj, this.callback, this.accept)
            }
        }

        // track path and belonging
        addAt(this.paths, obj, path);
        addAt(this.delegate.observers, obj, this);

        // traverse the properties to find nested objects and observe them, too
        for (var key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !==null) {
                this.observe(obj[key], path + '/' + pointer.escape(key), visited)
            }
        }
    };

// Recursively unobserve an object and its nested objects.
    Observer.prototype.unobserve = function(obj, path) {
        console.log(path);
        if (!obj)  obj = this.root;
        if (!path) path = '';

        if (!hasAt(this.delegate.observers, obj, this)) {
            return
        }

        // clean up
        removeAt(this.paths, obj, path);
        removeAt(this.delegate.observers, obj, this);

        if (!this.paths.has(obj)) {
            Object.unobserve(obj, this.callback)
        }

        // traverse the properties to find nested objects and unobserve them, too
        for (var key in obj) {
            if (typeof obj[key] === 'object') {
                this.unobserve(obj[key], path + '/' + pointer.escape(key))
            }
        }
    };

// Transform a change record, ie., add the following properties:
// - **root** - the root of the nested structure
// - **path** - a [JSON Pointer](http://tools.ietf.org/html/rfc6901)
//              (absolute from the root) to the changed property
    Observer.prototype.transform = function(change) {
        var key = String(change.name || change.index);

        var path = this.paths.get(change.object)[0] + '/' + pointer.escape(key);
        var record = {
            root: this.root,
            path: path
        };

        // the original change record ist not extensible -> copy
        for (var prop in change) {
            record[prop] = change[prop]
        }

        // unobserve deleted/replaced objects
        var deleted = change.oldValue && [change.oldValue] || change.removed || [];
        deleted.forEach(function(oldValue) {
            if (!oldValue || typeof oldValue !== 'object') {
                return
            }

            var invalidPaths = this.paths.get(oldValue).filter(function(path) {
                return !pointer.has(this.root, path) || pointer.get(this.root, path) !== oldValue
            }, this);

            //this.unobserve(oldValue, invalidPaths[0])
        }, this);

        // observe added/updated objects
        var value = change.object[key];
        if (typeof value === 'object') {
            var desc = Object.getOwnPropertyDescriptor(change.object, key);
            if (desc.enumerable === true) {
                this.observe(value, path)
            } else {
                this.unobserve(value, path)
            }
        }

        Object.preventExtensions(record);

        return record
    };

// Corresponds to `Object.observe()` but for nested objects.

    Nested.observe = function(obj, callback, accept) {
        if(obj===undefined){return false;}
        var delegate;

        if (!delegates.has(callback)) {
            delegate = new Delegate(callback);
            delegates.set(callback, delegate)
        } else {
            delegate = delegates.get(callback)
        }

        var observers = delegate.observers;
        if (observers.has(obj)) {
            return
        }

        var observer = new Observer(obj, delegate, accept);
        observer.observe(obj)
    };

// Corresponds to `Object.unobserve()` but for nested objects.
    Nested.unobserve = function(obj, callback) {
        if (!delegates.has(callback)) return;
        var delegate = delegates.get(callback);

        if (!delegate.observers.has(obj)) {
            return
        }
        console.log('nested unobserve');
        var observers = delegate.observers.get(obj);
        observers.forEach(function(observer) {
            observer.unobserve()
        })
    };

// Corresponds to `Object.deliverChangeRecords()` but for nested objects.
    Nested.deliverChangeRecords = function(callback) {

        if (typeof callback !== 'function') {
            throw new TypeError('Callback must be a function, given: ' + callback)
        }

        if (!delegates.has(callback)) return;

        var delegate = delegates.get(callback);
        Object.deliverChangeRecords(delegate.handleChangeRecords)
    };

// whether to log exceptions thrown during change record delivery
    Nested.debug = false;

// Helper function to check if a value exists in the array at the provided
// position in the provided WeakMap.
    function hasAt(map, key, value) {
        if (!map.has(key)) return false;
        return map.get(key).indexOf(value) !== -1
    }

// Helper function to add a value to an array at the provided position
// in the provided WeakMap.
    function addAt(map, key, value) {
        var set = (!map.has(key) && map.set(key, []), map.get(key));
        // if (set.indexOf(value) === -1)
        set.push(value)
    }

// Helper function to remove a value from the array at the provided position
// in the provided WeakMap.
    function removeAt(map, key, value) {
        // if (!map.has(key)) return
        var set = map.get(key);

        var index = set.indexOf(value);
        /*if (index > -1) */
        set.splice(index, 1);

        // if the set is empty, remove it from the WeakMap
        if (!set.length) map.delete(key)

    }

    return Nested;

}));



//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('observe-js'),require('elliptical-utils'),require('nested-observe'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['observe-js','elliptical-utils','nested-observe'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory(root,root.elliptical.utils,root.Nested);
    }
}(this, function (global,utils,Nested) {

    var _=utils._;

    /* necessary  private method/variable definitions copied over from observe-js ************************************************** */


    // Detect and do basic sanity checking on Object/Array.observe.
    function detectObjectObserve() {
        if (typeof Object.observe !== 'function' ||
            typeof Array.observe !== 'function') {
            return false;
        }

        //return false;

        var records = [];

        function callback(recs) {
            records = recs;
        }

        var test = {};
        var arr = [];
        Object.observe(test, callback);
        Array.observe(arr, callback);
        test.id = 1;
        test.id = 2;
        delete test.id;
        arr.push(1, 2);
        arr.length = 0;

        Object.deliverChangeRecords(callback);
        if (records.length !== 5)
            return false;

        if (records[0].type != 'add' ||
            records[1].type != 'update' ||
            records[2].type != 'delete' ||
            records[3].type != 'splice' ||
            records[4].type != 'splice') {
            return false;
        }

        Object.unobserve(test, callback);
        Array.unobserve(arr, callback);

        return true;
    }

    var hasObserve = detectObjectObserve();

    var OPENED = 1;

    function diffObjectFromOldObject(object, oldObject) {
        var added = {};
        var removed = {};
        var changed = {};

        for (var prop in oldObject) {
            var newValue = object[prop];

            if (newValue !== undefined && newValue === oldObject[prop])
                continue;

            if (!(prop in object)) {
                removed[prop] = undefined;
                continue;
            }

            if (newValue !== oldObject[prop])
                changed[prop] = newValue;
        }

        for (var prop in object) {
            if (prop in oldObject)
                continue;

            added[prop] = object[prop];
        }

        if (Array.isArray(object) && object.length !== oldObject.length)
            changed.length = object.length;

        return {
            added: added,
            removed: removed,
            changed: changed
        };
    }
    function getObservedObject(observer, object, arrayObserve) {
        var dir = observedObjectCache.pop() || newObservedObject();
        dir.open(observer);
        dir.observe(object, arrayObserve);
        return dir;
    }

    var observedObjectCache = [];

    function newObservedObject() {
        var observer;
        var object;
        var discardRecords = false;
        var first = true;

        function callback(records) {
            if (observer && observer.state_ === OPENED && !discardRecords)
                observer.check_(records);
        }
        return {
            open: function(obs) {
                if (observer)
                    throw Error('ObservedObject in use');

                if (!first)
                    Object.deliverChangeRecords(callback);

                observer = obs;
                first = false;
            },
            observe: function(obj, arrayObserve) {
                object = obj;
                if (arrayObserve)
                    Array.observe(object, callback);
                else
                    Object.observe(object, callback);
            },
            deliver: function(discard) {
                discardRecords = discard;
                Object.deliverChangeRecords(callback);
                discardRecords = false;
            },
            close: function() {
                observer = undefined;
                Object.unobserve(object, callback);
                observedObjectCache.push(this);
            }
        };
    }

    var expectedRecordTypes = {
        add: true,
        update: true,
        delete: true
    };


    function diffObjectFromChangeRecords(object, changeRecords, oldValues) {
        var added = {};
        var removed = {};

        for (var i = 0; i < changeRecords.length; i++) {
            var record = changeRecords[i];
            if (!expectedRecordTypes[record.type]) {
                console.error('Unknown changeRecord type: ' + record.type);
                console.error(record);
                continue;
            }

            if (!(record.name in oldValues))
                oldValues[record.name] = record.oldValue;

            if (record.type == 'update')
                continue;

            if (record.type == 'add') {
                if (record.name in removed)
                    delete removed[record.name];
                else
                    added[record.name] = true;

                continue;
            }

            // type = 'delete'
            if (record.name in added) {
                delete added[record.name];
                delete oldValues[record.name];
            } else {
                removed[record.name] = true;
            }
        }

        for (var prop in added)
            added[prop] = object[prop];

        for (var prop in removed)
            removed[prop] = undefined;

        var changed = {};
        for (var prop in oldValues) {
            if (prop in added || prop in removed)
                continue;

            var newValue = object[prop];
            if (oldValues[prop] !== newValue)
                changed[prop] = newValue;
        }

        return {
            added: added,
            removed: removed,
            changed: changed
        };
    }
    /* end of private method/variable declarations ****************************************************************/

    /* elliptical observe only uses the Polymer ObjectObserver and PathObserver implementations. It also uses
     its own object change report implementation
     */

    /* overwrite the ObjectObserver Constructor
     *  Note: if no id prop is passed to the constructor, the entire implementation defaults to the standard polymer one, including
     *  the change reporting
     * */

    //first, save the prototype
    var ObjectObserver_prototype=ObjectObserver.prototype;

    //modify the constructor
    ObjectObserver= function(object,id){
        Observer.call(this);
        this.value_ = object;
        this.oldObject_ = undefined;
        /* modification */
        if(typeof id !=='undefined'){
            this.__id=id;
        }
    };
    //reassign the old prototype back to the modified constructor
    ObjectObserver.prototype=ObjectObserver_prototype;

    //modifications to prototype methods to allow reporting custom to elliptical
    ObjectObserver.prototype.connect_=function(){
        /* modification
         * if __id exists on the Observer prototype, we implement elliptical assignment
         * */
        if (hasObserve) {
            if(this.__id !=='undefined'){
                //elliptical assignment, use nested-observe for deliver changes, allowing for deep observe changes
                Nested.observe(this.value_,this.check_.bind(this));
            }else{
                //polymer assignment
                this.directObserver_ = getObservedObject(this, this.value_,this.arrayObserve);
            }

        } else {
            /* modification */
            if(this.__id !=='undefined'){
                //elliptical assignment
                this.oldObject_= _.cloneDeep(this.value_);
            }else{
                //polymer assignment
                this.oldObject_ = this.copyObject(this.value_);
            }

        }
    };
    ObjectObserver.prototype.check_=function(changeRecords, skipChanges) {
        /* modification
         * if __id exists on the Observer prototype, we implement elliptical deep change reporting
         * */

        if(this.__id !=='undefined'){
            var diff_;
            if(hasObserve){
                if (!changeRecords){
                    return false;
                }
                diff_=utils.nativeObjDiffReport(this.value_,changeRecords);
                this.callback_.call(this,diff_);
                return true;
            }else{
                //elliptical reporting, polyfill
                if(_.isEqual(this.value_,this.oldObject_)){
                    return false;
                }

                var oldCopy=this.oldObject_;
                this.oldObject_= _.cloneDeep(this.value_);
                diff_=utils.objDiffReport(this.value_,oldCopy,this.__id);
                this.callback_.call(this,diff_);

                return true;
            }

        }else{
            //polymer reporting
            var diff;
            var oldValues;
            if (hasObserve) {
                if (!changeRecords)
                    return false;

                oldValues = {};
                diff = diffObjectFromChangeRecords(this.value_, changeRecords,
                    oldValues);
            } else {
                oldValues = this.oldObject_;
                diff = diffObjectFromOldObject(this.value_, this.oldObject_);
            }

            if (diffIsEmpty(diff))
                return false;

            if (!hasObserve)
                this.oldObject_ = this.copyObject(this.value_);

            this.report_([
                    diff.added || {},
                    diff.removed || {},
                    diff.changed || {},
                function(property) {
                    return oldValues[property];
                }
            ]);

            return true;
        }

    };

    ObjectObserver.prototype.disconnect_=function(){

        if (hasObserve) {
            if(this.__id !=='undefined'){
                Nested.unobserve(this.value_,function(){});
            }else{
                this.directObserver_.close();
                this.directObserver_ = undefined;
            }

        } else {
            this.oldObject_ = undefined;
        }
    };



    global.ObjectObserver=ObjectObserver;



    return global;

}));


// Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
// This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
// The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
// The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
// Code distributed by Google as part of the polymer project is also
// subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

(function(global) {
  'use strict';

  var filter = Array.prototype.filter.call.bind(Array.prototype.filter);

  function getTreeScope(node) {
    while (node.parentNode) {
      node = node.parentNode;
    }

    return typeof node.getElementById === 'function' ? node : null;
  }

  Node.prototype.bind = function(name, observable) {
    console.error('Unhandled binding to Node: ', this, name, observable);
  };

  Node.prototype.bindFinished = function() {};

  function updateBindings(node, name, binding) {
    var bindings = node.bindings_;
    if (!bindings)
      bindings = node.bindings_ = {};
      /* modification from original repo */
      if (bindings[name]){
          if(binding[name]){
              binding[name].close();
          }else{
              bindings[name].close();
          }
      }


      return bindings[name] = binding;

  }

  function returnBinding(node, name, binding) {
    return binding;
  }

  function sanitizeValue(value) {
    return value == null ? '' : value;
  }

  function updateText(node, value) {
    node.data = sanitizeValue(value);
  }

  function textBinding(node) {
    return function(value) {
      return updateText(node, value);
    };
  }

  var maybeUpdateBindings = returnBinding;

  Object.defineProperty(Platform, 'enableBindingsReflection', {
    get: function() {
      return maybeUpdateBindings === updateBindings;
    },
    set: function(enable) {
      maybeUpdateBindings = enable ? updateBindings : returnBinding;
      return enable;
    },
    configurable: true
  });

  Text.prototype.bind = function(name, value, oneTime) {
    if (name !== 'textContent')
      return Node.prototype.bind.call(this, name, value, oneTime);

    if (oneTime)
      return updateText(this, value);

    var observable = value;
    updateText(this, observable.open(textBinding(this)));
    return maybeUpdateBindings(this, name, observable);
  }

  function updateAttribute(el, name, conditional, value) {
    if (conditional) {
      if (value)
        el.setAttribute(name, '');
      else
        el.removeAttribute(name);
      return;
    }

    el.setAttribute(name, sanitizeValue(value));
  }

  function attributeBinding(el, name, conditional) {
    return function(value) {
      updateAttribute(el, name, conditional, value);
    };
  }

  Element.prototype.bind = function(name, value, oneTime) {
    var conditional = name[name.length - 1] == '?';
    if (conditional) {
      this.removeAttribute(name);
      name = name.slice(0, -1);
    }

    if (oneTime)
      return updateAttribute(this, name, conditional, value);


    var observable = value;
    updateAttribute(this, name, conditional,
        observable.open(attributeBinding(this, name, conditional)));

    return maybeUpdateBindings(this, name, observable);
  };

  var checkboxEventType;
  (function() {
    // Attempt to feature-detect which event (change or click) is fired first
    // for checkboxes.
    var div = document.createElement('div');
    var checkbox = div.appendChild(document.createElement('input'));
    checkbox.setAttribute('type', 'checkbox');
    var first;
    var count = 0;
    checkbox.addEventListener('click', function(e) {
      count++;
      first = first || 'click';
    });
    checkbox.addEventListener('change', function() {
      count++;
      first = first || 'change';
    });

    var event = document.createEvent('MouseEvent');
    event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false,
        false, false, false, 0, null);
    checkbox.dispatchEvent(event);
    // WebKit/Blink don't fire the change event if the element is outside the
    // document, so assume 'change' for that case.
    checkboxEventType = count == 1 ? 'change' : first;
  })();

  function getEventForInputType(element) {
    switch (element.type) {
      case 'checkbox':
        return checkboxEventType;
      case 'radio':
      case 'select-multiple':
      case 'select-one':
        return 'change';
      case 'range':
        if (/Trident|MSIE/.test(navigator.userAgent))
          return 'change';
      default:
        return 'input';
    }
  }

  function updateInput(input, property, value, santizeFn) {
    input[property] = (santizeFn || sanitizeValue)(value);
  }

  function inputBinding(input, property, santizeFn) {
    return function(value) {
      return updateInput(input, property, value, santizeFn);
    }
  }

  function noop() {}

  function bindInputEvent(input, property, observable, postEventFn) {
    var eventType = getEventForInputType(input);

    function eventHandler() {
      observable.setValue(input[property]);
      observable.discardChanges();
      (postEventFn || noop)(input);
      Platform.performMicrotaskCheckpoint();
    }
    input.addEventListener(eventType, eventHandler);

    return {
      close: function() {
        input.removeEventListener(eventType, eventHandler);
        observable.close();
      },

      observable_: observable
    }
  }

  function booleanSanitize(value) {
    return Boolean(value);
  }

  // |element| is assumed to be an HTMLInputElement with |type| == 'radio'.
  // Returns an array containing all radio buttons other than |element| that
  // have the same |name|, either in the form that |element| belongs to or,
  // if no form, in the document tree to which |element| belongs.
  //
  // This implementation is based upon the HTML spec definition of a
  // "radio button group":
  //   http://www.whatwg.org/specs/web-apps/current-work/multipage/number-state.html#radio-button-group
  //
  function getAssociatedRadioButtons(element) {
    if (element.form) {
      return filter(element.form.elements, function(el) {
        return el != element &&
            el.tagName == 'INPUT' &&
            el.type == 'radio' &&
            el.name == element.name;
      });
    } else {
      var treeScope = getTreeScope(element);
      if (!treeScope)
        return [];
      var radios = treeScope.querySelectorAll(
          'input[type="radio"][name="' + element.name + '"]');
      return filter(radios, function(el) {
        return el != element && !el.form;
      });
    }
  }

  function checkedPostEvent(input) {
    // Only the radio button that is getting checked gets an event. We
    // therefore find all the associated radio buttons and update their
    // check binding manually.
    if (input.tagName === 'INPUT' &&
        input.type === 'radio') {
      getAssociatedRadioButtons(input).forEach(function(radio) {
        var checkedBinding = radio.bindings_.checked;
        if (checkedBinding) {
          // Set the value directly to avoid an infinite call stack.
          checkedBinding.observable_.setValue(false);
        }
      });
    }
  }

  HTMLInputElement.prototype.bind = function(name, value, oneTime) {
    if (name !== 'value' && name !== 'checked')
      return HTMLElement.prototype.bind.call(this, name, value, oneTime);

    this.removeAttribute(name);
    var sanitizeFn = name == 'checked' ? booleanSanitize : sanitizeValue;
    var postEventFn = name == 'checked' ? checkedPostEvent : noop;

    if (oneTime)
      return updateInput(this, name, value, sanitizeFn);


    var observable = value;
    var binding = bindInputEvent(this, name, observable, postEventFn);
    updateInput(this, name,
                observable.open(inputBinding(this, name, sanitizeFn)),
                sanitizeFn);

    // Checkboxes may need to update bindings of other checkboxes.
    return updateBindings(this, name, binding);
  }

  HTMLTextAreaElement.prototype.bind = function(name, value, oneTime) {
    if (name !== 'value')
      return HTMLElement.prototype.bind.call(this, name, value, oneTime);

    this.removeAttribute('value');

    if (oneTime)
      return updateInput(this, 'value', value);

    var observable = value;
    var binding = bindInputEvent(this, 'value', observable);
    updateInput(this, 'value',
                observable.open(inputBinding(this, 'value', sanitizeValue)));
    return maybeUpdateBindings(this, name, binding);
  }

  function updateOption(option, value) {
    var parentNode = option.parentNode;;
    var select;
    var selectBinding;
    var oldValue;
    if (parentNode instanceof HTMLSelectElement &&
        parentNode.bindings_ &&
        parentNode.bindings_.value) {
      select = parentNode;
      selectBinding = select.bindings_.value;
      oldValue = select.value;
    }

    option.value = sanitizeValue(value);

    if (select && select.value != oldValue) {
      selectBinding.observable_.setValue(select.value);
      selectBinding.observable_.discardChanges();
      Platform.performMicrotaskCheckpoint();
    }
  }

  function optionBinding(option) {
    return function(value) {
      updateOption(option, value);
    }
  }

  HTMLOptionElement.prototype.bind = function(name, value, oneTime) {
    if (name !== 'value')
      return HTMLElement.prototype.bind.call(this, name, value, oneTime);

    this.removeAttribute('value');

    if (oneTime)
      return updateOption(this, value);

    var observable = value;
    var binding = bindInputEvent(this, 'value', observable);
    updateOption(this, observable.open(optionBinding(this)));
    return maybeUpdateBindings(this, name, binding);
  }

  HTMLSelectElement.prototype.bind = function(name, value, oneTime) {
    if (name === 'selectedindex')
      name = 'selectedIndex';

    if (name !== 'selectedIndex' && name !== 'value')
      return HTMLElement.prototype.bind.call(this, name, value, oneTime);

    this.removeAttribute(name);

    if (oneTime)
      return updateInput(this, name, value);

    var observable = value;
    var binding = bindInputEvent(this, name, observable);
    updateInput(this, name,
                observable.open(inputBinding(this, name)));

    // Option update events may need to access select bindings.
    return updateBindings(this, name, binding);
  }
})(this);



//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs

        module.exports = factory(require('elliptical-platform'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-platform'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {
    var utils= $.elliptical.utils;
    var _=utils._;

    //if Object.observe not natively supported,start dirty checking

    if(!$.elliptical.hasObjectObserve){
        $.elliptical.startDirtyCheck();
    }


    $.element('elliptical.scope',{

        options:{
            idProp:'id',
            dataBind:true
        },

        /**
         *
         * @private
         */
        _initElement:function(){
            this._data._timeOutId=null;
            this._data.scopeObserver=null;
            this._data.scopeId=this.options.idProp;
            this._data._discard=false;
            this.__initScope();

            if(this.options.dataBind){
                this.__initScopeObservable();
            }

        },

        /**
         * init a $scope on the instance
         * @private
         */
        __initScope:function(){
            this.$scope={};

        },

        /**
         * init a watcher that binds an observable to the $scope when it becomes non-empty
         * terminates itself when it calls _setObservable
         * the init watcher avoids the initial $scope setting by the developer firing a change event
         * since an inherited parent's _initElement event is sequentially is going to fire before the element's _initElement
         * @private
         */
        __initScopeObservable:function(){
            var self=this;
            this._data._timeOutId=setInterval(function(){
                if(!_.isEmpty(self.$scope)){
                    clearInterval(self._data._timeOutId);
                    self.__setObservable();
                    self._onScopeInit(self.__cloneScope());

                }
            },500);
        },

        /**
         * set the observable
         * @private
         */
        __setObservable:function(){
            var $scope=this.$scope;
            var self=this;
            var id=this.options.idProp;
            if(id===undefined){
                id='id';
            }

            var observer = new ObjectObserver($scope,id);
            observer.open(function(result){
                self.__onScopeChange(result);
            });
            /* save reference to the observer instance */
            this._data.scopeObserver=observer;

        },

        /**
         * destroy the scope observable
         * @private
         */
        __destroyObservable:function(){
            if(this._data.scopeObserver){
                this._data.scopeObserver.close();
                this._data.scopeObserver=null;
                this.$scope=null;
            }
        },

        /**
         * reset observable
         * @private
         */
        __resetObservable: function(){
            this.__destroyObservable();
            this.__setObservable();
        },

        /**
         * clone the scope object...changes to this will not effect observable
         * @returns {Object}
         * @private
         */
        __cloneScope:function(){
            return _.cloneDeep(this.$scope);

        },

        /**
         * clone an object
         * @param obj {Object}
         * @returns {Object}
         * @private
         */
        __cloneObject:function(obj){
            return _.cloneDeep(obj);
        },

        /**
         * returns scope length...(-1)==object, not array
         * @returns {Number}
         * @controller
         */
        __scopeLength:function(obj){
            var scope=(typeof obj==='undefined') ? this.$scope : obj;
            if(utils.isPropertyByIndexArray(scope,0)){
                var arr=utils.objectPropertyByIndex(scope,0);
                return arr.length;
            }else{
                return -1;  //object
            }
        },

        /**
         *
         * @private
         */
        __isModelList:function(){
            return (this.__scopeLength() > -1);
        },

        /**
         *
         * @param val {Object}
         * @private
         */
        _removeFromModelListById: function(val){
            var scope=this.$scope;
            var id=this._data.scopeId;
            utils.deleteObjectByIdFromArrayProp(scope,id,val);
        },

        /**
         *
         * @param val {Object}
         * @returns {Object}
         * @private
         *
         */
        _selectFromModelListById: function(val){
            var scope=this.$scope;
            var id=this._data.scopeId;
            if(id===undefined){
                id='id';
            }
            return utils.selectObjectByIdFromArrayProp(scope,id,val);

        },

        /**
         *
         * @param obj {Object}
         * @returns {Object}
         * @private
         */
        _selectFromModelListByObj:function(obj){
            var __o;
            var items=this.$scope[Object.keys(this._scope)[0]];
            items.forEach(function(o){
                if(_.isEqual(obj,o)){
                    __o=o;
                }
            });

            return __o;
        },

        _scopeIndexById:function(id){
            var idProp=this._data.scopeId;
            if(idProp===undefined){
                idProp='id';
            }
            return utils.objectIndexById(this.$scope,id,idProp);
        },

        /**
         * recycles the observable
         * @private
         */
        __recycle:function(){
            this.__destroyObservable();
            this.__setObservable();
        },

        /**
         * clears the watcher(that only sets up the observable).
         * as soon as a $scope has a non-empty value, the watcher terminates itself
         * @private
         */
        __clearWatch: function(){
            if(this._data.timeOutId){
                clearInterval(self._data._timeOutId);
            }
        },

        /**
         * hook for scope observable change
         *
         * @param result {Object}
         * @controller
         */
        __onScopeChange:function(result){
            if(!this._data._discard){
                this._onScopeChange(result);
            }

        },

        /**
         * console.log the current $scope
         * @param delay
         * @private
         */
        __printScope:function(delay){
            if(delay===undefined){
                delay=0;
            }
            var self=this;
            setTimeout(function(){
                console.log(self.$scope);
            },delay);

        },

        /**
         * returns changed object properties from the result param in _onScopeChange
         * @param obj
         * @returns {Object}
         * @private
         */
        _objectChange:function(obj){
            if(obj.object && obj.oldObject){
                return utils.objChangedProps(obj.object,obj.oldObject);
            }else{
                var chg_={};
                chg_[obj.name]=obj.value;
                return chg_;
            }
        },


        /**
         * destroy clean-up
         * @private
         */
        _dispose:function(){
            this.__clearWatch();
            this.__destroyObservable();
        },

        _onScopeInit: $.noop,

        _onScopeChange: $.noop,

        /**
         * gives the difference between two objects
         * @param n {Object}
         * @param o {Object}
         * @returns {Object}
         * @public
         */
        $changeReport:function(n,o){
            return utils.objChangedProps(n,o);
        }

    });

    return $;


}));
/*
 * =============================================================
 * elliptical-cache
 * =============================================================
 *
 * usage:
 *
 * var $cache=this._data.$cache;
 * $cache.set(node,{foo:'bar'});
 *
 * var data=$cache.get(node);
 * var bar = data.foo; =>'bar'
 *
 * clean-up:
 * $cache.reset();
 *
 * a replacement for jQuery data as an alternative to HTML5 dataset(data attributes as DOM datastore).
 * The issue with jQuery data is that node removal clears the jQuery cache for that node. This interferes, for example, in those cases that rely
 * on mutation observer callback for removedNodes in terms of any necessity of querying a node's data to perform an action or actions.
  * $cache doesn't destroy the nodes data on removal, leaving clean-up to the developer, with fallback to component destroy event.
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('ellipsis-element'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ellipsis-element'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

    $.element('elliptical.cache',{

       _initElement:function(){
           this._data.$cache=this.$cache();
       },

        $cache:function(){
            var cache={};
            var count=1;
            return {
                reset:function(){
                    count=1;
                    cache={};
                },

                set:function(node,data){
                    if(!node.__data){
                        node.__data=count++;
                    }
                    cache[node.__data]=data;
                },

                get:function(node){
                    return cache[node.__data];
                }
            }
        },

        _dispose:function(){
            var $cache=this._data.$cache;
            $cache.reset();
        }

    });

    return $;

}));
/*
 * =============================================================
 * elliptical.template
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-dustjs'),require('elliptical-scope'),require('elliptical-cache'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-dustjs','elliptical-scope','elliptical-cache'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory(root.dust);
    }
}(this, function (dust) {

    window.dust=dust;
    var utils= $.elliptical.utils;
    var _=utils._;
    if(typeof window.dust !== 'undefined'){
        $.widget.$providers({
            template:window.dust
        })
    }

    $.element('elliptical.template', [$.elliptical.scope, $.elliptical.cache],{

        /**
         * init
         * @private
         */
        _initElement:function(){
            this._data.Running=null;
            this._data.unlockInterval=300;
            this._data._intervalId=null;
            this._data.fragment=null;
            this._data.templateId=null;
            this._data.tree=[];
            this._data.pathObservers=[];
            this._data._setDiscardBit=true;
            this._data.modelPathTree=[];
            this._data.previouslyBound=false;
            this._data._watched=false;
            var __customElements=this.options.$customElements;
            this._data.modelNodeSelector=(!__customElements) ? '[data-node="model"]' : 'ui-model';
            this._data.attrId=(!__customElements) ? 'data-id' : 'model-id';
            var template=this.__getTemplateNode();
            if(template[0]){
                this._data.templateNode=template;
                this.__onScriptsLoaded();
            }

        },

        /**
         * watch for the client-side template scripts to be loaded in
         * @private
         */
        __onScriptsLoaded:function(){
            var self=this;
            this._data._intervalId=setInterval(function(){
                if($$.fragments !== undefined){
                    clearInterval(self._data._intervalId);
                    self.__bind();
                }
            },100);
        },


        /**
         * databind if we have a $scope, otherwise call the watcher
         * @param repeat {Boolean}
         * @private
         */
        __bind:function(repeat){
            var template=this._data.templateNode;
            this.__initTemplate(template);
            this.__initDOMObserver(template[0]);
            if(this.__isModelList()){
                (this.__scopeLength() > 0) ? this.__databind(template,repeat) : this.__watch(template,true,repeat);
            }else{
                (!_.isEmpty(this.$scope)) ? this.__databind(template,repeat) : this.__watch(template,false,repeat);
            }
        },

        /**
         *
         * @param template {Object}
         * @param isArray {Boolean}
         * @param repeat {Boolean}
         * @private
         */
        __watch:function(template,isArray,repeat){
            var self=this;
            this._data._watched=true;
            this._data.intervalId=setInterval(function(){
                if((isArray && self.__scopeLength() > 0 ) || (!isArray && !_.isEmpty(self.$scope))){
                    self._data._watched=false;
                    clearInterval(self._data.intervalId);
                    self.__databind(template,repeat);
                }
            },100);
        },

        /**
         *
         * @private
         */
        __getTemplateNode:function(){
            return this.element.find('ui-template');
        },

        /**
         * gets and parses the element template fragment
         * @param template {Object}
         * @private
         */
        __initTemplate:function(template){
            var fragment;
            var id=template.attr('id');
            var name=template.attr('name');
            if(typeof id !=='undefined'){
                this._data.templateId=id;
                fragment=this.__getFragmentById(id);
                this._data.fragment=fragment;
                if(fragment){
                    this.__parseTemplateFragment(fragment);
                }

            }else if(typeof name !=='undefined'){

            }
        },


        /**
         * init template fragment mutation observer for template DOM additions/removal
         * @param template {Object} Node Element
         * @private
         */
        __initDOMObserver:function(template){
            var self=this;
            var observer=new MutationObserver(function(mutations){
                mutations.forEach(function(mutation){
                    if(mutation.addedNodes && mutation.addedNodes.length>0){ //nodes added
                        self.__addedNodes(mutation.addedNodes);

                    }
                    if(mutation.removedNodes && mutation.removedNodes.length>0){ //nodes removed

                        self.__removedNodes(mutation.removedNodes);
                    }

                    /* fire the hook for the mutation record */
                    self._onDOMMutation(mutation);
                });

            });
            observer.observe(template, {childList: true,subtree:true});
            this._data.DOMObserver=observer;
        },

        /**
         * fetches the uncompiled string template fragment for the passed id
         * @param id {String}
         * @returns {String}
         * @private
         */
        __getFragmentById:function(id){
            var fragment;
            if (!$$.fragments.length > 0){
                return null;
            }
            $$.fragments.forEach(function(obj){
                if(obj.id===id){
                    fragment=obj.fragment;
                }
            });

            return fragment;
        },

        /**
         * parses a fragment into a contextKeyArray
         * a dom fragment is passed to dust.parse, which returns an array
         * the array is then further parsed into a contextKeyArray
         * contextKeyArray = array of cxt objects
         *
         * NOTE: context==section in the dustjs parlance
         *
         * cxt={
             *    index: {number} the context depth index
             *    context: {string} the context/section at the index
             *    cxt: {array} string of contexts(context/section tree) for each index up to current index
             *    key: {string} model prop/key
             * }
         *
         * the last object will be the array of context/section trees
         *
         * example: users=[
         *   {
             *    name:'Bob Smith'
             *    addresses:[{address:'1234 East Ave'},{address:'1673 Main St'}]
             *   },
         *   {
             *    name:'Jane Doe'
             *    addresses:[{address:'4321 West Ave'},{address:'9090 XYZ Ave'}]
             *   }
         * ]
         *
         * contextKeyArray=[
             *   {
             *     context:'users',
             *     cxt:['users'],
             *     index:0
             *   },
             *   {
             *     context:'users',
             *     cxt:['users'],
             *     index:0,
             *     key:'name'
             *   },
             *   {
             *     context:'addresses',
             *     cxt:['users','addresses'],
             *     index:1
             *   },
             *   {
             *     context:'addresses',
             *     cxt:['users','addresses'],
             *     index:1,
             *     key:'address'
             *   },
             *   {
             *     [
             *       {
             *        context:'users',
             *        cxt:['users'],
             *        index:0
             *       },
             *       {
             *        context:'addresses',
             *        cxt:['users','addresses'],
             *        index:1
             *       }
             *
             *
             *     ]
             *   }
         * ]
         * @param fragment {Object}
         * @private
         */
        __parseTemplateFragment:function(fragment){
            var provider=this.options.$providers.template;
            var parsed=provider.parse(fragment);
            var contextArray=[];
            var contextKeyArray=[];
            var index=0;
            var context;

            if(parsed.length && parsed.length >0){
                tree(parsed);
            }


            /**
             * recursively parses dust array to build our custom contextKeyArray to enable
             * matching node elements with a javascript model without having to resort to excessive data-path-annotations
             * @param arr {Array}
             */
            function tree(arr){
                if(arr && arr.length){
                    arr.forEach(function(obj){
                        if(obj[0]==='#' && _.isArray(obj)){
                            var obj_={
                                index:index,
                                context:obj[1][1],
                                cxt:getCxt(obj[1][1],index,false)
                            };
                            context=obj[1][1];
                            contextKeyArray.push(obj_);
                            contextArray.push(obj_);
                            var indexRef=index;
                            index++;
                            tree(obj);
                            index=indexRef;

                        }else if(obj[0]==='bodies'){
                            tree(obj[1]);
                        }else if(obj[0]==='reference'){
                            tree(obj[1]);
                        }else if(obj[0]==='body'){

                            obj.forEach(function(o){
                                if(o[0]==='reference'){
                                    var obj_={
                                        cxt:getCxt(context,index),
                                        context:context,
                                        index:index,
                                        key:o[1][1]
                                    };
                                    contextKeyArray.push(obj_);
                                }
                            });
                            tree(obj);
                        }
                    });
                }
            }

            /**
             * builds a context/section tree array for a passed context and context index(depth)
             * @param context {String}
             * @param index {Number}
             * @param dec {Boolean}
             * @returns {Array}
             */
            function getCxt(context,index,dec){
                if(typeof dec==='undefined'){
                    dec=true;
                }

                if(index > 0 && dec){
                    index--;
                }
                var arr=[];
                contextArray.forEach(function(obj){
                    if(obj.index < index){
                        arr.push(obj.context);
                    }
                });
                if(context){
                    arr.push(context);
                }

                return arr;
            }

            contextKeyArray.push(contextArray);
            this._data.contextKeyArray=contextKeyArray;

        },

        /**
         * returns template fragment model children (ui-model) nodes(jQuery objects)
         * @private
         * @returns {Array}
         */
        __templateModels: function(template){
            if(typeof template==='undefined'){
                template=this._data.templateNode;
            }
            var modelNode=this._data.modelNodeSelector;
            return (template) ? template.find(modelNode) : null;

        },

        _templateNodes:function(){
            return this.__templateModels();
        },

        _nodeById:function(id){
            var nodes=this._templateNodes();
            return nodes.selfFind('[model-id="' + id + '"]');
        },


        /**
         * bind path observers to DOM
         * @param template {Object}
         * @param repeat {Boolean}
         * @param redraw {Boolean}
         * @private
         */
        __databind:function(template,repeat,redraw){
            /* lock observer callbacks while data binding */
           this.__lock();

            var self=this;
            var $scope=this.$scope;

            var models=this.__templateModels(template);

            //two-way databind only: if the model is an array and model is already rendered
            if(this.__isModelList() && models && models.length > 0 && redraw===undefined) {
                $.each(models, function (i, model) {
                    self.__bindModel(model, i);
                });
            }else if(!_.isEmpty($scope) && repeat===undefined){
                //if we need to first render the model and then two-way databind
                this.__render($scope,function(){
                    self.__databind(template,false,undefined);
                });

            }else{
                //model is an object
                this.__bindModel(template[0],null);
            }
            /* mark DOM as bound(i.e., text Nodes have been created for keys) */
            this._data.previouslyBound=true;

            /* unlock observer callbacks */
            this.__unlock();

        },

        /**
         * renders the template fragment directly using the $scope
         * @param $scope {Object}
         * @param callback {Function}
         * @private
         */
        __render: function($scope,callback){
            var opts={};
            opts.template=this._data.templateId;
            if(this.__isModelList()){
                var prop=Object.keys($scope)[0];
                opts.model=$scope[prop];
                opts.context=prop;
            }else{
                opts.model=$scope;
            }
            opts.parse=false;
            this.__renderTemplate(opts,callback);
        },

        /**
         *
         * @param opts {Object}
         * @param callback {Function}
         * @private
         */
        __renderTemplate:function(opts,callback){
            var self=this;
            this._renderTemplate(opts,function(err,out){
                var html=out.replace(/<ui-template(.*?)>/g,'').replace(/<\/ui-template>/g,'');
                self._data.templateNode.html(html);
                if(callback){
                    callback(err,out);
                }
            });
        },

        /**
         * lock observer callbacks(scope and mutation)
         * @private
         */
        __lock:function(){
            this._data.Running=true;
            if(this._data._setDiscardBit){
                this._data._discard=true;
            }


        },

        /**
         * unlocks observer callbacks
         * if the mutation or scope observer callback is triggered during data binding, infinite
         * looping can result. so block this with flag settings
         * @private
         */
        __unlock:function(){
            var self=this;
            var unlockInterval=this._data.unlockInterval;
            setTimeout(function(){
                self._data.Running=null;
                self._data._discard=false;
                self._data._setDiscardBit=true;

            },unlockInterval);
        },

        /**
         * two-way binds a model to the template DOM fragment
         * @param fragment
         * @param index
         * @private
         */
        __bindModel:function(fragment,index){
            var self=this;
            var $scope=this.$scope;
            var contextIndex=0;
            var modelPathTree=[];
            var pathObservers=this._data.pathObservers;
            var templateNode=this._data.templateNode;
            if(!index && this.options.scope){
                setModelPath(0,this.options.scope,null);
            }
            /**
             *  pushes an object representing the resolved model path for the currently traversed node
             *  to the modelPathTree array
             *
             *  modelPathTree=array of {index:<number>,context:<string>,cxt:<array>,modelIndex:<number}}
             *  a modelPathTree and a key, for example, gives you a resolvable path for a node that can be passed to a pathObserver
             *
             *  the modelPathTree array records the resolved model path for each context/section in the current node tree hierarchy
             * @param cxtIndex {number} context/section depth
             * @param context {string} context/section name
             * @param modelIndex {number} model depth
             */
            function setModelPath(cxtIndex,context,modelIndex){
                var path_=self.__getTemplateContextArray();
                if(path_ && path_.length > 0){
                    path_.forEach(function(obj){
                        if(obj.index===cxtIndex && obj.context===context){
                            var cxt={
                                index:cxtIndex,
                                context:obj.context,
                                cxt:obj.cxt,
                                modelIndex:modelIndex
                            };
                            modelPathTree.push(cxt);

                        }
                    });
                }
            }

            /**
             * returns the last element of the modelPathTree array
             * @returns {Object}
             */
            function getLastRecordedModelPath(){
                return (modelPathTree.length > 0) ? modelPathTree[modelPathTree.length -1] : null;

            }

            /**
             * get context array by depth
             * @param cxtIndex{number}
             * @returns {Array}
             */
            function getModelContextByDepth(cxtIndex){
                var arr=[];
                var path_=self.__getTemplateContextArray();
                if(path_ && path_.length > 0){
                    path_.forEach(function(obj){
                        if(obj.index===cxtIndex){
                            arr.push(obj);
                        }
                    });
                }

                return arr;
            }

            /**
             * returns the context depth of a ui-model node relative to parent ui-template node
             * @param node {object} HTMLElement
             * @returns {number}
             */
            function modelDepth(node) {
                var depth = 0;
                var templateNode_ = templateNode[0];
                //simply get the parent of the current node until we reach the ui-template node.
                //test each parent for model node tag or attribute
                while (!(node===templateNode_)) {
                    node = $(node).parent()[0];
                    if(node.tagName==='UI-MODEL' || node.hasAttribute('data-node')){
                        depth++;
                    }
                }
                return depth;

            }


            /**
             * delete branches from tree that have index greater than the passed context index
             * @param cxtIndex
             */
            function popModelPathTree(cxtIndex){
                if(modelPathTree.length > 0){
                    _.remove(modelPathTree,function(obj){
                        return (obj.index > cxtIndex);
                    })
                }
            }
            function clearModelPathTree(){
                modelPathTree.length=0;
            }


            /**
             * sets the modelPathTree for the traversed node and passes any nodes with attributes to the parseNodeAttributes function
             * @param node {Object}
             * @private
             */
            function parseNode(node){

                //if <ui-model> node only
                if((node.tagName && node.tagName.toLowerCase()==='ui-model') ||(node.hasAttribute && node.hasAttribute('data-node'))){

                    /* resolve the model path for any <ui-model> node and insert into the modelPathTree.
                     The modelPathTree, along with any given node's data attributes(data-key=,data-attribute=),
                     is sufficient to set a pathObserver for a the given node within the node hierarchy
                     */

                    /* current context depth */
                    contextIndex=modelDepth(node);

                    var lastRecordedContext=getLastRecordedModelPath();
                    //if current depth less than last recorded depth, pop modelPathTree back to current depth
                    if(lastRecordedContext && lastRecordedContext.index > contextIndex){
                        popModelPathTree(contextIndex);
                    }


                    /* current model index.
                     NOTE: model index==applicable $scope index. it has no relation to any persistent backend index */
                    var parent=(contextIndex===0) ? self._data.templateNode[0] : $(node).parents(self._data.modelNodeSelector)[0];
                    /*  if there is only a single context at the tree depth, model index = <ui-model> DOM child index

                     Pagination NOTE: it is assumed pagination loads in a new scope with a different paginated view; two-way data-binding
                     will not work for $scope pagination, the nodes will not be synced with the $scope
                     */
                    if(parent===undefined){
                        parent=self._data.templateNode[0];
                    }

                    var modelIndex=$(parent).closestChildren(self._data.modelNodeSelector).index($(node));

                    //check if more than one context for this tree depth
                    var contextArr_=getModelContextByDepth(contextIndex);
                    var cxt_={};

                    if(contextArr_ && contextArr_.length > 1){
                        //multiple contexts at this tree depth

                        /* we have to correct model index, since it is calculated by simple children index in the DOM
                         for multiple contexts at the same depth, the model index is no longer synced with the DOM index
                         __getCurrentContextModelPath returns the correct model index for the context based on the DOM child index
                         and the $scope
                         */
                        cxt_=self.__getCurrentContextModelPath(modelPathTree,contextIndex,contextArr_,modelIndex);

                        if(lastRecordedContext && contextIndex > lastRecordedContext.index){
                            popModelPathTree(contextIndex);
                            setModelPath(contextIndex,cxt_.context,cxt_.modelIndex);

                        }else{
                            modelPathTree.pop();
                            setModelPath(contextIndex,cxt_.context,cxt_.modelIndex);
                        }

                        /* if current context tree depth greater than last recorded, just set the model path */
                    }else if(lastRecordedContext && contextIndex > lastRecordedContext.index) {
                        setModelPath(contextIndex, contextArr_[0].context, modelIndex);
                        //if last record but same depth as last record, pop and set:this refreshes model index
                    }else if(lastRecordedContext){
                        modelPathTree.pop();
                        setModelPath(contextIndex,contextArr_[0].context,modelIndex);
                        //if no last record, simply set
                    }else if(!lastRecordedContext && contextArr_.length > 0){
                        setModelPath(contextIndex,contextArr_[0].context,modelIndex);
                    }
                }else{

                    /* get reference to parent ui-model node */
                    var parent = $(node).parents(self._data.modelNodeSelector)[0];
                    /* get context index */
                    if(parent){
                        contextIndex=modelDepth(parent);

                    }else{
                        contextIndex=0;
                        clearModelPathTree();
                    }
                    var lastRecordedContext=getLastRecordedModelPath();
                    //if current depth less than last recorded depth, pop modelPathTree
                    if(lastRecordedContext && lastRecordedContext.index > contextIndex){
                        popModelPathTree(contextIndex);
                    }

                }

                //for non-textNodes with attributes
                if(node.nodeType !==3 && node.hasAttributes() || (node.tagName && node.tagName.toLowerCase()==='ui-model')){
                    parseNodeAttributes(node);
                }

            }

            /**
             * parses a node attributes to send for text binding or attribute binding
             * @param node {Object}
             * @private
             */
            function parseNodeAttributes(node){
                var id=self._data.scopeId;
                if(id===undefined){
                    id='id';
                }
                var key,keys,attr;

                $.each(node.attributes,function(i,attribute){
                    try{
                        if(attribute && attribute!==undefined){
                            if(attribute.name.indexOf('model')===0){
                                key=id;
                                attr=attribute.name;
                                var tuple_=[attr,key];
                                bindAttributeObserver(node,tuple_,attribute.value);
                            }else if(attribute.name.indexOf('data-bind')===0){
                                var values=attribute.value.split(',');

                                if(values.length){
                                    values.forEach(function(val){
                                        val=val.trim();
                                        var ntuple=val.split(':');
                                        var bindingType=ntuple[0];
                                        (bindingType==='text') ? bindTextNodeObserver(node,ntuple) : bindAttributeObserver(node,ntuple);
                                    });
                                }
                            }
                        }

                    }catch(ex){
                        console.log(ex);
                    }

                });


                //set index path for ui-model nodes
                if(node.tagName && node.tagName.toLowerCase()==='ui-model'){
                    setData(node);
                }


                /**
                 *bind an attribute name/value pair
                 * @param val {String} colon separated string(name:value)
                 * @private
                 */
                /*function _bindAttributeObserver(val){
                    var arr=val.split(':');
                    if(arr.length){
                        var attr=arr[0].trim();
                        var key=arr[1].trim();
                        bindAttributeObserver(node,attr,key);
                    }
                }*/

            }

            /**
             * creates a textNode and path observer for a bindable model property
             * @param node {Object}
             * @param tuple {Array}
             */
            function bindTextNodeObserver(node,tuple){
                //var values_=tuple.split(':');
                var key=tuple[1];
                var fn={};
                if(tuple.length > 2){
                    fn=parseFunction(tuple[2]);
                }
                var $cache=self._data.$cache;
                var previouslyBound=self._data.previouslyBound;
                var path = self.__createPath(modelPathTree, key);
                var value = utils.objectPropertyByPath($scope, path);
                /* if the tuple has a function attached, evaluate the value from the function */
                if(!_.isEmpty(fn)){
                    value=eval_(value,fn);
                    //update the path value of scope
                    utils.assignValueToPath($scope,path,value);
                }
                var $node=$(node);
                var text,$text;
                /* if fragment has been previously bound, we select textNode, otherwise create it */
                if(previouslyBound){
                    var $textNodes=$node.findTextNodes();
                    $.each($textNodes,function(i,t){
                        if(t.textContent===value){
                            $text=$(t);
                        }
                    });
                    text=($text && $text[0]) ? $text[0] : self.__createTextNode($node,node,value);
                }else{
                    /* create and append */
                    text=self.__createTextNode($node,node,value);
                }
                $cache.set(text,{observers:path});
                var obsPath=utils.observerMapPath(path);
                var observer = new PathObserver($scope, utils.observerMapPath(path));
                text.bind('textContent', observer);
                var observer_ = {
                    type: 'text',
                    value:'textContent',
                    node: text,
                    path:path,
                    observer: observer

                };

                pathObservers.push(observer_);

            }

            /**
             * bind path observers to attributes
             * @param node {Object}
             * @param tuple {Array}
             * @param mId {String}
             */
            function bindAttributeObserver(node,tuple,mId){
                var attribute=tuple[0];
                var key=tuple[1];
                var fn={};
                if(tuple.length > 2){
                    fn=parseFunction(tuple[2]);
                }
                var $cache=self._data.$cache;
                var observers_,id_;
                var path = self.__createPath(modelPathTree, key);
                var value = utils.objectPropertyByPath($scope, path);

                /* if the tuple has a function attached, evaluate the value from the function */
                if(!_.isEmpty(fn)){
                    value=eval_(value,fn);
                    //update the path value of scope
                    utils.assignValueToPath($scope,path,value);
                }
                var data=$cache.get(node);
                if(data){
                    observers_=data.observers;
                    id_=data.id;
                }else{
                    id_=mId;
                }
                if(observers_ && observers_.length > 0){
                    var obj_=null;
                    observers_.forEach(function(o){
                        if(o.value===attribute){
                            o.path=path;
                            o.value_=value;
                            obj_=o;
                        }
                    });
                    if(!obj_){
                        obj_={
                            value:attribute,
                            value_:value,
                            path:path
                        };
                        observers_.push(obj_);
                    }
                }else{
                    observers_=[];
                    obj_={
                        value:attribute,
                        value_:value,
                        path:path
                    };
                    observers_.push(obj_);
                    $cache.set(node,{observers:observers_,id:id_});
                }
                var obsPath=utils.observerMapPath(path);
                var observer = new PathObserver($scope, utils.observerMapPath(path));
                node.bind(attribute, observer);
                var observer_ = {
                    type: 'attribute',
                    value:attribute,
                    node: node,
                    path:path,
                    observer: observer

                };

                pathObservers.push(observer_);


            }

            /* parse a stringified function into method name + arg list */
            function parseFunction(sFunc){
                var argList;
                var args=sFunc.match(/\((.*?)\)/g);
                if(!args){
                    args='';
                }
                var func=sFunc.replace(args,'');
                args=args.replace('(','');
                args=args.replace(')','');
                if(args.length < 1){
                    argList=[]
                }else{
                    argList=args.split(',');
                }

                return{
                    func:func,
                    args:argList
                }
            }

            /* evaluates a template value from a passed function */
            function eval_(value,fn){
                var func=fn.func;
                var f,args;
                if(window.dust.helpers.inline[func]){//dust.helpers.inline
                    f=window.dust.helpers.inline[func];
                    args=fn.args;
                    (args.length >0) ? args.unshift(value) : args.push(value);
                    return f.apply(this,args);
                }else if(window[func]){//window
                    f=window[func];
                    args=fn.args;
                    (args.length >0) ? args.unshift(value) : args.push(value);
                    return f.apply(this,args);
                }else if(this[func]){ //controller instance prototype
                    f=this[func];
                    args=fn.args;
                    (args.length >0) ? args.unshift(value) : args.push(value);
                    return f.apply(this,args);
                }else{
                    return value;
                }

            }

            /**
             *  set the index path data for ui-model nodes
             * @param node {Object}
             */
            function setData(node){
                var $cache=self._data.$cache;
                var data=$cache.get(node);
                var observers,id;
                if(data){
                    observers=data.observers;
                    id=data.id;
                }
                var path = self.__createPath(modelPathTree);
                try{
                    index=utils.getIndexFromPath(path);
                }catch(ex){

                }

                $cache.set(node,{path:path,id:id,index:index,observers:observers});

            }


            /* walk the dom fragment with parseNode as the function */
            this.__traverseDOM(fragment,parseNode);

        },

        /**
         * standard walk-the-dom recursion
         * @param node {Element}
         * @param func {Function}
         * @private
         */
        __traverseDOM:function(node,func){
            func(node);
            node = node.firstChild;
            while (node) {
                this.__traverseDOM(node, func);
                node = node.nextSibling;
            }
        },

        /** //TODO: enable multiple keys mappings to text nodes within an element: ex: <h2 data-key="firstName,lastName">Hello, {firstName} {lastName}</h2>
         *  //currently, to have correctly functioning two-way binding, you would have to do something like:
         *  //<h2>Hello, <span data-key="firstName">{firstName}</span> <span data-key="lastName">{lastName}</span></h2>
         *  //not a show-stopper, but it is a bit of an inconvenience
         *
         * create text node
         * @param $node {Object} jQuery
         * @param node {Object} Element
         * @param value {String}
         * @returns {Text} {Object} jQuery
         * @private
         */
        __createTextNode: function($node,node,value){
            $node.text($node.text().replace(value, ''));
            var text = document.createTextNode(value);
            node.appendChild(text);

            return text;

        },

        /**
         * returns the context tree array from the contextKeyArray(i.e., returns the last item in the contextKeyArray)
         * @returns {Array}
         * @private
         */
        __getTemplateContextArray:function(){
            var contextKeyArray=this._data.contextKeyArray;
            return (contextKeyArray && contextKeyArray.length > 0) ? contextKeyArray[contextKeyArray.length -1] : [];

        },

        /**
         * returns a resolved path based on the passed modelPathTree and key
         * @param modelPathTree {Array}
         * @param key {String}
         * @returns {string} path
         * @private
         */
        __createPath: function(modelPathTree,key){
            var path='';
            modelPathTree.forEach(function(obj){
                if(typeof obj.modelIndex !== 'undefined'){
                    path += obj.context + '.' + obj.modelIndex + '.';
                }else{
                    path += obj.context + '.'
                }

            });

            (typeof key !=='undefined') ? path+=key : path=path.substring(0, path.length - 1);
            return path;

        },

        /**
         * returns a resolved context path based on the passed modelPathTree context index, and context
         * @param modelPathTree {Array}
         * @param cxtIndex {Number}
         * @param context {String}
         * @returns {String} path
         * @private
         */
        __createPathByContextIndex: function(modelPathTree,cxtIndex,context){
            var path='';
            modelPathTree.forEach(function(obj){
                if(obj.index <= cxtIndex){
                    path += obj.context + '.' + obj.modelIndex + '.';
                }

            });
            path += context;

            return path;
        },


        /**
         * @param modelPathTree {Array}
         * @param cxtIndex {Number}
         * @param contextArray {Array}
         * @param index {Number}
         * @returns {*}
         * @private
         */
        __getCurrentContextModelPath: function(modelPathTree,cxtIndex,contextArray,index){
            var self=this;
            var $scope=this.$scope;
            /*we need to calculate context/array lengths for contexts with equal hierarchy. The model index of the current
             node will then allow us to determine which context we are currently in.

             Hence, we need the resolved path for the context index==cIdx == (cxtIndex >0)? (cxtIndex-1) : 0;

             */

            var cIdx=(cxtIndex>0) ? cxtIndex-1 : 0;
            var pathArray=[];
            contextArray.forEach(function(obj){
                var path=self.__createPathByContextIndex(modelPathTree,cIdx,obj.context);
                var length=utils.arrayPropertyLengthByPath($scope,path);
                pathArray.push({length:length,context:obj.context,cxt:obj.cxt});
            });


            if(pathArray.length > 1){
                var obj_={};
                var cumlativeLength=0;

                for(var i=0;i<pathArray.length;i++){
                    if((index < pathArray[i].length + cumlativeLength)|| (!pathArray[i].length)){
                        obj_.modelIndex=index-cumlativeLength;
                        obj_.context=pathArray[i].context;
                        obj_.cxt=pathArray[i].cxt;
                        obj_.index=cxtIndex;
                        break;
                    }else{
                        cumlativeLength +=pathArray[i].length;
                    }
                }
                return obj_;
            }else{
                return {
                    modelIndex:index,
                    context:contextArray[0].context,
                    cxt:contextArray[0].cxt,
                    index:contextArray[0].index
                };
            }
        },

        /**
         * get parent model('ui-model') node of a node
         * @param node {Object}
         * @returns {Object}
         * @private
         */
        __getParentModelNode:function(node){
            var parent=$(node).parents(this._data.modelNodeSelector);
            if(parent[0]){
                return parent[0];
            }else{
                return this._data.templateNode[0];
            }
        },

        /**
         * onAddedNodes
         * @param added {Array}
         * @private
         */
        __addedNodes:function(added){
            if(this._data.Running){
                return;
            }
            if(this.__isModelList()){
                this.__rebind();
            }

        },

        /**
         * mutation handler for removed nodes.
         * deletes paths from the scope and rebinds path observers
         * @param removed{Array}
         * @private
         */
        __removedNodes:function(removed){
            /* exit if triggered during data-binding */
            if(this._data.Running){
                return;
            }
            var $scope=this.$scope;
            var self=this;
            var rebind_;
            var boolRebind=false;
            for(var i=0;i<removed.length;i++){
                var $cache=this._data.$cache;
                var node=removed[i];
                var observers=$cache.get(node);
                if(observers){
                    rebind_=this.__parseObservers(node,$scope);
                    if(rebind_){
                        boolRebind=true;
                    }
                }else{
                    var children=$(removed).findTextNodeDescendants();
                    if(children && children.length > 0){
                        $.each(children,function(i,obj){
                            rebind_=self.__parseObservers(obj,$scope);
                            if(rebind_){
                                boolRebind=true;
                            }
                        });
                    }
                }
            }

            if(boolRebind){
                this.__rebind();
            }

            this._onRemovedNodes(removed);
        },

        /**
         * performs a $scope splice or delete based on node path
         * @param node {Object}
         * @param $scope {Object}
         * @private
         */
        __parseObservers:function(node,$scope){
            var $cache=this._data.$cache;
            var observers=$cache.get(node);
            if(typeof observers !=='undefined'){
                var path=observers.path;
                /* determine if path if part of an array or object
                 if object, delete property
                 if array, splice
                 */
                //
                var isArray=utils.isPathInArray(path);
                (isArray) ? this.__spliceArray($scope,path) : utils.deleteObjectPropertyByPath($scope,path);
                return true;
            }else{
                return false;
            }
        },

        /**
         * splice an array $scope property
         * @param $scope {Object}
         * @param path {String}
         * @private
         */
        __spliceArray:function($scope,path){
            var index=utils.getIndexFromPath(path);
            if(index !== undefined){
                path=this.__parsePath(path,index);
                var arr=utils.objectPropertyByPath($scope,path);
                this._data._discard=false;
                this._data._setDiscardBit=false;
                arr.splice(index,1);


            }
        },

        /**
         * returns a path substring for the array property, removing the index of the array element
         * @param path {String}
         * @param index {Number}
         * @returns {string}
         * @private
         */
        __parsePath:function(path,index){
            return path.substring(0, path.length - (index.toString().length + 1));

        },


        /**
         * rebinds the pathObservers, called after a model removal or addition
         * @private
         */
        __rebind: function(){
            var template=this._data.templateNode;
            this.__unbindPathObservers();
            this.__databind(template);
        },


        /**
         * $scope change callback handler mediator
         * @param result {Object}
         * @private
         */
        __onScopeChange: function(result){
            if(result.removed && result.removed.length && result.removed.length > 0) {
                this.__onRemoved(result.removed)
            }

            this._onScopeChange(result);
        },


        /**
         * removes a ui-model node from the template by path
         * @param path {String}
         * @private
         */
        __onListRemove: function(path){

            var self=this;
            var fragment=this._data.templateNode[0];
            var $cache=this._data.$cache;

            function removeNode(node){
                if((node.tagName && node.tagName.toLowerCase()==='ui-model') ||(node.hasAttribute && node.hasAttribute('data-node'))){
                    var observers=$cache.get(node);
                    var index=observers.index;
                    if(index===path){
                        node.remove();
                        self._data.previouslyBound=true;
                        self.__rebind();
                    }
                }
            }

            /* walk the dom fragment with removeNode as the function */
            this.__traverseDOM(fragment,removeNode);

        },

        /**
         * adds a ui-model node to the template as the result of an array operation
         * @param path {String} the path reference to the array within the $scope
         * @param section {String} the section name
         * @param op {String} operation: push or unshift
         * @private
         */
        __onListAdd: function(path,section,op){

            var self=this;

            /* get template */
            var templateName=this._compileFragment(path,section);

            /* get parent model node of the array */
            var parent=this.__getParent(path,section);

            /* get insertion index */
            var insertionIndex=(op==='push' || op==='concat') ? this.__getPushInsertionIndex(path,section) : this.__getUnshiftInsertionIndex(path,section);

            /* get model */
            var model=this.__getModelFromPath(path,op);

            /* render */
            var opts={};
            opts.template=templateName;
            opts.model=model;
            opts.context=section;
            opts.parse=false;
            this._renderTemplate(opts,function(err,out){
                if(!err){
                    self.__insertRenderedTemplate(out,parent,insertionIndex);
                }
            });

        },

        /**
         * compile a fragment of an existing template into provider cache, by path and section
         * @param path {string]
         * @param section {string}
         * @returns {string}
         * @private
         */
        _compileFragment:function(path,section){
            //todo verify fragment has not previously been compiled
            var provider=this.options.$providers.template;
            var id=this._data.templateId;
            var templateName = id + '-' + section;
            var fragment=this.__getFragmentById(id);
            var match='{#' + section + '}.(.*?){\/' + section + '}';
            var partial=fragment.match(new RegExp(match,'g'));
            /* if number of matches > 1, assign correct partial */
            var partial_=(partial.length > 1) ? this.__getPartial(partial,path,section) : partial[0];
            var compiled=provider.compile(partial_,templateName);
            provider.loadSource(compiled);
            return templateName;
        },

        /**
         * get the model from the array path based on operation(push==last element, unshift=first element)
         * @param path {String}
         * @param operation {String}
         * @returns {Object}
         * @private
         */
        __getModelFromPath:function(path,operation){
            var $scope=this.$scope;
            var arr=utils.objectPropertyByPath($scope,path);
            //return (operation==='push') ? arr[arr.length-1] : arr[0];
            var ret;
            if(operation==='push'){
                return arr[arr.length-1];
            }else if(operation==='unshift'){
                return arr[0];
            }else{
                return arr;
            }
        },

        /**
         * returns the correct ui-model template fragment for section depths that have more than one context
         * @param partial {Array}
         * @param path {String}
         * @param section {String}
         * @returns {String} ui-model template fragment
         * @private
         */
        __getPartial:function(partial,path,section){
            var match = section + '.';
            var matches=path.match(new RegExp(match,'g'));
            var length=matches.length;
            return partial[length-1];
        },

        /**
         * gets the parent ui-model node
         * @param path {String}
         * @returns {Object} node
         * @private
         */
        __getParent:function(path){
            var paths=path.split('.');
            if (paths.length < 2){
                return this._data.templateNode[0];
            }else{
                var path_=this.__getParentPath(paths);
                return this.__getParentByPath(path_);
            }
        },

        /**
         * gets the parent model node path
         * @param arr {Array}
         * @returns {string}
         * @private
         */
        __getParentPath:function(arr){
            var length=arr.length-1;
            var path='';
            for(var i=0;i<length;i++){
                path+=arr[i] + '.';
            }
            return path.substring(0,path.length-1);
        },

        /**
         * runs the walk the dom routine to find the ui-model parent node(finds it by the set index path in the dom cache store)
         * @param path {String}
         * @returns {*}
         * @private
         */
        __getParentByPath:function(path){
            var fragment=this._data.templateNode[0];
            var $cache=this._data.$cache;
            var node_;
            function getNode(node){
                if((node.tagName && node.tagName.toLowerCase()==='ui-model') ||(node.hasAttribute && node.hasAttribute('data-node'))){
                    var observers=$cache.get(node);
                    var path_=observers.path;
                    if(path_===path){
                        node_=node;
                    }
                }
            }

            this.__traverseDOM(fragment,getNode);

            return node_;
        },

        /**
         *
         * for push: gets the insertion index to insert ui-model node into ui-model children
         * @param path {String}
         * @param section {String}
         * @returns {number}
         * @private
         */
        __getPushInsertionIndex:function(path,section){
            var $scope=this.$scope;
            var arr=this.__getContextArrayFromPath(path);
            var sectionContextProp=this.__getSectionContextProp(arr,section);
            if(sectionContextProp.count===1){
                return -1;
            }else{
                if(sectionContextProp.position===sectionContextProp.count -1){
                    return -1;
                }else{
                    var paths=path.split('.');
                    var parentPath=this.__getParentPath(paths);
                    var index=0;
                    for(var i=0;i<sectionContextProp.position + 1;i++){
                        var path_=(parentPath.length && parentPath.length > 0) ? parentPath + '.' + sectionContextProp.cxt[i] : sectionContextProp.cxt[i];
                        var length = utils.arrayPropertyLengthByPath($scope,path_);
                        index=index + length;
                    }
                    return index;
                }
            }
        },

        /**
         * for unshift: gets insertion index to insert ui-model node into a parent section's ui-model children
         * @param path {String}
         * @param section {String}
         * @returns {number}
         * @private
         */
        __getUnshiftInsertionIndex:function(path,section){
            var $scope=this.$scope;
            var arr=this.__getContextArrayFromPath(path);
            var sectionContextProp=this.__getSectionContextProp(arr,section);
            if(sectionContextProp.count===1){
                return 0;
            }else{

                var paths=path.split('.');
                var parentPath=this.__getParentPath(paths);
                var index=0;
                for(var i=0;i<sectionContextProp.position;i++){
                    var path_=parentPath + '.' + sectionContextProp.cxt[i];
                    var length = utils.arrayPropertyLengthByPath($scope,path_);
                    index=index + length;
                }
                return index;

            }
        },

        /**
         * returns a prop object for a template section, given a child context within that section
         * count: number of child contexts
         * position: position of our section in the list
         * cxt: array of the one-level down child contexts
         * @param arr {Array}
         * @param section {String}
         * @returns {Object}
         * @private
         */
        __getSectionContextProp:function(arr,section){
            var prop={};
            prop.count=arr.length;
            prop.cxt=arr;
            prop.position= _.indexOf(arr,section);

            return prop;

        },



        __getParentIndex:function(path){
            var paths=path.split('.');
            return path[0] + '.' + paths[1];
        },

        /**
         * returns the array of context blocks for a path
         * @param path {String}
         * @returns {Array}
         * @private
         */
        __getContextArrayFromPath:function(path){
            var self=this;
            var arr=[];
            var paths=path.split('.');
            paths.forEach(function(s){
                if(!self.__isNumeric(s)){
                    arr.push(s);
                }
            });

            var depth=arr.length-1;
            var contextArray=this.__getTemplateContextArray();
            var cxtArray=[];
            contextArray.forEach(function(obj){
                if(obj.index===depth){
                    cxtArray.push(obj.context);
                }
            });

            return cxtArray;

        },


        /**
         * numeric check for a string
         * @param p
         * @returns {boolean}
         * @private
         */
        __isNumeric:function(p){
            var p_ = parseInt(p);
            return !(isNaN(p_));
        },

        /**
         * inserts rendering into the template DOM fragment, discarding text nodes
         * @param out {Array}
         * @param parent {Object}
         * @param index {Number}
         * @private
         */
        __insertRenderedTemplate:function(out,parent,index){
            var fragment,$fragment;
            var $parent=$(parent);
            var models=$parent.closestChildren(this._data.modelNodeSelector);
            $fragment=this._fragmentModelParser(out);
            fragment=$fragment[0];
            var model;
            if(index===-1){
                $parent.append($fragment);
            }else if(index===0){
                model=models[0];
                parent.insertBefore(fragment, model);
            }else{
                model=models[index];
                parent.insertBefore(fragment, model);
            }

            this.__rebind();

        },

        _fragmentModelParser:function(fragment){
            var doc = this._DOMParser(fragment);
            return $(doc).find('ui-model');
        },


        /**
         * removes
         * @param removed
         * @private
         */
        __onRemoved:function(removed){
            var self=this;
            var rebind=false;
            var $cache=self._data.$cache;
            var id=this.options.idProp;
            if(id===undefined){
                id='id';
            }
            if(this.__isModelList()){
                removed.forEach(function(obj){
                    var models=self.__templateModels();
                    if(models && models.length > 0){
                        $.each(models,function(i,model){
                            var data=$cache.get(model);
                            if(data !==undefined && data.id !==undefined){
                                if(data.id===obj[id]){
                                    model.remove();
                                    rebind=true;
                                }
                            }else if(data && data.observers && data.observers.length){
                                data.observers.forEach(function(o){
                                    var id_=obj[id];
                                    if(o.value==='model-id' && o.value_===id_){
                                        model.remove();
                                        rebind=true;
                                    }
                                })
                            }
                        });
                    }
                });

                if(rebind){
                    self.__rebind();
                }
            }
        },


        /**
         * unbind path observers
         * @private
         */
        __unbindPathObservers:function(){
            var pathObservers=this._data.pathObservers;
            if(pathObservers && pathObservers.length && pathObservers.length >0){
                pathObservers.forEach(function(obj){
                    obj.observer.close();
                });
                utils.emptyArray(pathObservers);
            }
        },

        /**
         * unbind DOM mutation observer
         * @private
         */
        __unbindDOMObserver:function(){
            var DOMObserver=this._data.DOMObserver;
            if(DOMObserver){
                DOMObserver.disconnect();
            }

        },

        /**
         * unbind 2-way template binding
         * @private
         */
        __disposeTemplate: function(){
            this.__unbindDOMObserver();
            this.__unbindPathObservers();
        },

        /**
         * rebind template binding
         * @param render
         * @private
         */
        __rebindTemplate:function(render){
            if(this._data._watched){
                return false;
            }
            var repeat;
            if(typeof render==='undefined' || !render){
                repeat=true;
            }
            var template=this.__getTemplateNode();
            if(template[0]){
                this.__bind(repeat);
            }else if(this.options.loadedTemplate){
                this.__watchForTemplateInstance(repeat);
            }

            return true;
        },


        /**
         * watches for creation of a template instance before
         * firing template rebinding....e.g., ui-template tag is not initially part of the element DOM,
         * but included in the template rendered in by an element
         * @param repeat {Boolean}
         * @private
         */
        __watchForTemplateInstance:function(repeat){
            var self=this;
            var intervalId=setInterval(function(){
                var template=self.__getTemplateNode();
                if(template[0]){
                    clearInterval(intervalId);
                    self.__bind(repeat);
                }
            },100);
        },

        /**
         * reconnect disconnected MutationObserver
         * @private
         */
        __reconnect:function(){
            var observer=this._data.DOMObserver;
            if(observer){
                var template=this._data.templateNode;
                if(template[0]){
                    var node=template[0];
                    observer.observe(node, {childList: true,subtree:true});

                }
            }
        },

        /**
         *
         * @param delay {Number}
         * @private
         */
        _printPathObservers:function(delay){
           var self=this;
           if(delay===undefined){
               delay=0;
           }
            setTimeout(function(){
                console.log(self._data.pathObservers);
            },delay);
        },

        /**
         *
         * @param node {Object|Element}
         * @returns {String}
         * @private
         */
        _getModelIdByNode:function(node){
            return node.getAttribute('model-id');
        },

        /**
         *
         * @param target {Object} element
         * @returns {String}
         * @private
         */
        _getModelIdByTarget:function(target){
            var $target=$(target);
            var model=$target.parent('ui-model');
            return model.attr('model-id');
        },

        /**
         * returns the a model node cache object
         * @param node {Object} Element
         * @returns {Object}
         * @private
         */
        _getModelNodeCache:function(node){
            var $cache=this._data.$cache;
            return $cache.get(node);
        },

        /**
         * element cleanup onDelete
         * @private
         */
        _dispose:function(){
            this.__disposeTemplate();
        },


        _onDOMMutation: $.noop,

        _onRemovedNodes: $.noop,

        _onScopeChange: $.noop,

        /**
         * delete node facade
         * used to delete a model node from DOM via splice or shift operation passed in a function
         * NOTE: if you don't use the facade, then its up to the dev to handle $scope changes in terms of removing deletions from DOM
         * @param func {Function}
         * @public
         */
        $deleteNodes:function(func){
            var self=this;
            var path;
            this.__unbindPathObservers();
            var $scope=this.$scope;
            func.call(this);

            /* stringify passed function */
            var str=func.toString();

            /* splice */
            path=str.match(/scope.(.*?).splice/g);
            if(path && path.length){
                path.forEach(function(s){
                    s= s.replace('scope.','');
                    s= s.replace('.splice','');
                    var pos1=str.indexOf('splice(');
                    var pos2=str.indexOf(',',pos1);
                    pos1=pos1 + 7;
                    var index=str.substring(pos1,pos2);
                    var path_=s + '.' + index;
                    path_=path_.replace(/]/g,'');
                    path_=path_.replace(/[[\]]/g,'.');

                    /* remove from DOM */
                    self.__onListRemove(path_);

                })
            }

            /* shift */
            path=str.match(/scope.(.*?).shift/g);
            if(path && path.length){
                path.forEach(function(s){
                    s= s.replace('scope.','');
                    s= s.replace('.shift','');
                    var path_=s + '.0';
                    path_=path_.replace(/]/g,'');
                    path_=path_.replace(/[[\]]/g,'.');

                    /* remove from DOM */
                    self.__onListRemove(path_);

                })
            }

        },

        /**
         * add node facade
         * adds a ui-model node to the template DOM as a result of a push or unshift operation on the $scope passed in a function
         * NOTE: if you don't use the facade, then its up to the dev to handle $scope changes in terms of rendering additions
         * @param func {Function}
         */
        $addNodes:function(func){
            var self=this;
            var path;
            this.__unbindPathObservers();
            var $scope=this.$scope;
            func.call(this);

            /* stringify passed function */
            var str=func.toString();

            /* push */
            path=str.match(/scope.(.*?).push/g);

            if(path && path.length){
                path.forEach(function(s){
                    s= s.replace('scope.','');
                    s= s.replace('.push','');
                    var path_=s;
                    path_=path_.replace(/]/g,'');
                    path_=path_.replace(/[[\]]/g,'.');
                    var paths=path_.split('.');
                    var section=paths[paths.length-1];

                   /* add the model node to the template */
                    self.__onListAdd(path_,section,'push');
                })
            }

            /* unshift */
            path=str.match(/scope.(.*?).unshift/g);
            if(path && path.length){
                path.forEach(function(s){
                    s= s.replace('scope.','');
                    s= s.replace('.unshift','');
                    var path_=s;
                    path_=path_.replace(/]/g,'');
                    path_=path_.replace(/[[\]]/g,'.');
                    var paths=path_.split('.');
                    var section=paths[paths.length-1];

                    /* add the model node to the template */
                    self.__onListAdd(path_,section,'unshift');
                })
            }

            path=str.match(/scope.(.*?).concat/g);
            if(path && path.length){
                path=str.replace(/scope.(.*?).=/g,'');
                path=path.match(/scope.(.*?).concat/g);
                if(path && path.length){
                    path.forEach(function(s){
                        s= s.replace('scope.','');
                        s= s.replace('.concat','');
                        var path_=s;
                        path_=path_.replace(/]/g,'');
                        path_=path_.replace(/[[\]]/g,'.');
                        var paths=path_.split('.');
                        var section=paths[paths.length-1];
                        /* add the model nodes to the template */
                        self.__onListAdd(path_,section,'concat');
                    })
                }
            }


        },

        $empty:function(){
            var template=this.__getTemplateNode();
            if(this.__isModelList()){
                var prop=(this.options.scope !==undefined) ? this.options.scope : utils.objectPropertyByIndex(this.$scope,0);
                this.$scope[prop].length=0;
                template.empty();
            }else{
                this.$scope={};
                template.empty();
            }
        },

        $unbindTemplate: function(){
            this.__disposeTemplate();
        },

        $rebindTemplate:function(){
            this.__rebindTemplate();
        },

        $renderTemplate:function(opts,callback){
            opts.parse=false;
            this.__renderTemplate(opts,callback);
        },

        $rebind:function(){
            if(!this._data._watched){
                var template=this._data.templateNode;
                this.__unbindPathObservers();
                this.__databind(template,undefined,true);
                this.__reconnect();
            }
        }
    });

    return $;

}));

/*
 * =============================================================
 * elliptical.Event
 * =============================================================
 *
 * environment-independent Events/Pubsub implementation. Code culled in part from:
 * https://github.com/federico-lox/pubsub.js
 *
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs

        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.Event=factory();
        root.returnExports = root.elliptical.Event;
    }
}(this, function () {
    var Event={};
    (function (context) {


        /**
         * @private
         */
        function init() {
            //the channel subscription hash
            var channels = {},
            //help minification
                funcType = Function;

            return {
                /*
                 * @public
                 *
                 * Publish/Emit some data on a channel
                 *
                 * @param String channel The channel to publish on
                 * @param Mixed argument The data to publish, the function supports
                 * as many data parameters as needed
                 *
                 * @example Publish stuff on '/some/channel'.
                 * Anything subscribed will be called with a function
                 * signature like: function(a,b,c){ ... }
                 *
                 * Event.emit(
                 *		"/some/channel", "a", "b",
                 *		{total: 10, min: 1, max: 3}
                 * );
                 */
                emit: function () {
                    //help minification
                    var args = arguments,
                    // args[0] is the channel
                        subs = channels[args[0]],
                        len,
                        params,
                        x;

                    if (subs) {
                        len = subs.length;
                        params = (args.length > 1) ?
                            Array.prototype.splice.call(args, 1) : [];

                        //run the callbacks asynchronously,
                        //do not block the main execution process
                        setTimeout(
                            function () {
                                //executes callbacks in the order
                                //in which they were registered
                                for (x = 0; x < len; x += 1) {

                                    subs[x].apply(context, params);
                                }

                                //clear references to allow garbage collection
                                subs = context = params = null;
                            },
                            0
                        );
                    }
                },

                /*
                 * @public
                 *
                 * Register a callback on a channel
                 *
                 * @param String channel The channel to subscribe to
                 * @param Function callback The event handler, any time something is
                 * published on a subscribed channel, the callback will be called
                 * with the published array as ordered arguments
                 *
                 * @return Array A handle which can be used to unsubscribe this
                 * particular subscription
                 *
                 * @example Event.on(
                 *				"/some/channel",
                 *				function(data){ ... }
                 *			);
                 */
                on: function (channel, callback) {
                    if (typeof channel !== 'string') {
                        throw "invalid or missing channel";
                    }

                    if (!(callback instanceof funcType)) {
                        throw "invalid or missing callback";
                    }

                    if (!channels[channel]) {
                        channels[channel] = [];
                    }

                    channels[channel].push(callback);

                    return {channel: channel, callback: callback};
                },

                /*
                 * @public
                 *
                 * Disconnect a subscribed function f.
                 *
                 * @param Mixed handle The return value from a subscribe call or the
                 * name of a channel as a String
                 * @param Function callback [OPTIONAL] The event handler originaally
                 * registered, not needed if handle contains the return value
                 * of subscribe
                 *
                 * @example
                 * var handle = Event.on("/some/channel", function(){});
                 * Event.off(handle);
                 *
                 * or
                 *
                 * Event.off("/some/channel", callback);
                 */
                off: function (handle, callback) {
                    if (handle.channel && handle.callback) {
                        callback = handle.callback;
                        handle = handle.channel;
                    }

                    if (typeof handle !== 'string') {
                        throw "invalid or missing channel";
                    }

                    if (!(callback instanceof funcType)) {
                        throw "invalid or missing callback";
                    }

                    var subs = channels[handle],
                        x,
                        y = (subs instanceof Array) ? subs.length : 0;

                    for (x = 0; x < y; x += 1) {
                        if (subs[x] === callback) {
                            subs.splice(x, 1);
                            break;
                        }
                    }

                },
                /* convenient global unsubscribe/off  */
                flush: function () {
                    channels = {};
                },

                /* list the channels */
                list: function(callback){
                    if(callback){
                        callback(channels);
                    }
                }
            };
        }

        Event.init=init();

    }(this));

    return Event.init; //UMD

}));
/*
 * =============================================================
 * elliptical-pubsub
 * =============================================================
 *
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('ellipsis-element'),require('elliptical-event'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ellipsis-element','elliptical-event'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($,root.elliptical.Event);
    }
}(this, function ($,Event) {
    var utils= $.elliptical.utils;
    var _=utils._;

    $.element('elliptical.pubsub',{

       options:{
           channel:null,
           eventBlock:false
       },

        _initElement:function(){
            this._data.subscriptions=[];
            this._subscriptions();
        },

        /**
         * publish data to channel
         * @param channel {String}
         * @param data {Object}
         * @param delay {Number}
         * @param force {Boolean}
         * @private
         */
        _publish: function(channel,data,delay,force){
            //support 2-4 params
            var length=arguments.length;
            if(length===2){
                delay=0;
                force=false;
            }else if(length===3){
                if(typeof delay==='boolean'){
                    force=delay;
                    delay=0;
                }else{
                    force=false;
                }
            }

            if(!this.options.eventBlock || force){
                setTimeout(function(){
                    Event.emit(channel,data);
                },delay);
            }
        },

        /**
         * subscribe to data/message over channel
         * @param channel {String}
         * @param control {String} throttle/debounce
         * @param delay {Number}
         * @param fn {Function}
         * @private
         */
        _subscribe:function(channel,control,delay,fn){
            //support 2-4 params
            var length=arguments.length;
            if(length===2){
                fn=control;
                control=null;
                delay=null;

            }else if(length===3){
                fn=delay;
                delay=350;
            }

            var opts={};
            var func=null;
            if(control==='throttle'){
                func= _.throttle(fn,delay);
            }else if(control==='debounce'){
                opts.leading=true;
                opts.trailing=false;
                func= _.debounce(fn,delay,opts);
            }else{
                func=fn;
            }
            var sub={
                channel:channel,
                fn:func
            };
            if(!(this._data.subscriptions && this._data.subscriptions.length)){
                this._data.subscriptions=[];
            }
            this._data.subscriptions.push(sub);
            Event.on(channel,func);
        },

        _subscriptions: $.noop,

        /**
         * unbind subscriptions
         * @private
         */
        _unbindSubscriptions:function(){

            var subs=this._data.subscriptions;
            subs.forEach(function(obj){
                Event.off(obj.channel,obj.fn);
            });

        },

        _dispose:function(){
            this._unbindSubscriptions();
        }

    });

    return $;

}));
/*
 * =============================================================
 * elliptical-controller  v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * dependencies:
 * elliptical-template
 * elliptical-pubsub
 *
 * elliptical controller: the elliptical UI factory
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-template'),require('elliptical-pubsub'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-template','elliptical-pubsub'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function () {
    var utils= $.elliptical.utils;
    var _=utils._;

    /* custom elements flag, selector definitions */
    var DataSelector_='[data-controller]';
    var Selector_='ui-controller';



    /**
     * define $.elliptical.controller...$.elliptical.controller will the base Object used by $.controller
     */
    $.element('elliptical.controller','ui-controller',[$.elliptical.template, $.elliptical.pubsub],{

        options:{
            context:null, //$$.elliptical.context
            scope:null,  //prop of context to bind
            dataBind:true
        },

        /**
         * $.controller setup on $.element's init event
         * @private
         */
        _initElement:function(){
            var context=this.options.context;
            if(!context){
                context=window.$$.elliptical.context;
                if(context){
                    this.options.context=context;
                }
            }

            this._data.hasObserve= $.elliptical.hasObjectObserve;
            this.$viewBag=context;
            this.__setScope();
            this.__onPreInit();
            this._initController();//initController is $.controller's init event
            this.__subscriber();
            this.__publisher();

        },

        /**
         * if a scope property has been declared, auto set the instance $scope; if a scope
         * property has not been declared, it is up the dev to set the $scope in the _initController event
         * @private
         */
        __setScope: function(){
            var context=this.options.context,//context attached to $$.elliptical.context
                scopeProp=this.options.scope; //context property to bind to the instance $scope

            if(this.$scope && scopeProp && context){
                this.$scope[scopeProp]=context[scopeProp];
            }

        },

        /**
         * $.controller init event
         */
        _initController: $.noop,


        /**
         * sets up pre-defined subscribe events on a defined channel
         * @private
         */
        __subscriber:function(){
            var self=this;
            var channel=this.options.channel;
            var event=this.options.event;
            this._data._synced=false;
            if(channel){
                if(event==='sync'){
                    this._subscribe(channel +'.sync',function(data){
                        if(!self._data._synced){
                            self._data._synced=true;
                            self.__disposeTemplate();
                            self.__destroyObservable();
                            self.$scope=data.$scope;
                            self.__setObservable();
                            self.__rebindTemplate();
                            self.__onSyncSubscribe(data.proto);
                        }

                    });
                }

                this._subscribe(channel + '.add',function(data){
                    self.__onAddSubscribe(data);
                });

                this._subscribe(channel + '.remove',function(data){
                    self.__onRemoveSubscribe(data);
                });

                this._subscribe(channel + '.change',function(data){
                    self.__onChangeSubscribe(data);
                });

                this._subscribe(channel + '.select',function(data){
                    self.__onSelectSubscribe(data);
                });
            }
        },

        /**
         * if a channel has been declared, publish the $scope to channel.sync
         * this allows different $.controllers and custom elements to share the same $scope
         * @private
         */
        __publisher:function(){
            var channel=this.options.channel;
            var event =this.options.event;
            var self=this;
            if(channel && !event){
                if(this._data.scopeObserver){
                    this._publish(channel + '.sync',{proto:this,$scope:this.$scope});
                }else{
                    var timeoutId=setInterval(function(){
                        if(self._data.scopeObserver){
                            clearInterval(timeoutId);
                            self._publish(channel + '.sync',{proto:self,$scope:self.$scope});
                        }
                    },500);
                }
            }
        },

        /**
         * publishes events to the declared channel and then executes this_super()
         * to fire parent __onScopeChange handler
         * @param result
         * @private
         */
        __onScopeChange:function(result){
            if(this._data._discard){
                return false;
            }
            var self=this;
            var event =this.options.event;
            if(result.added && result.added.length){
                result.added.forEach(function(obj){
                    var channel=self.options.channel;
                    if(channel && channel !==undefined && event !=='sync'){
                        self._publish(channel + '.add',obj);
                    }
                });
            }

            if(result.removed && result.removed.length){
                result.removed.forEach(function(obj){
                    var channel=self.options.channel;
                    if(channel && channel !==undefined && event !=='sync'){
                        self._publish(channel + '.remove',obj);
                    }
                });
            }

            if(result.changed && result.changed.length){
                result.changed.forEach(function(obj){
                    var channel=self.options.channel;
                    if(channel && channel !==undefined && event !=='sync'){
                        self._publish(channel + '.change',obj);
                    }
                });
            }

            this.__$scopePropsChange(result);
            this._super(result);

            return true;
        },

        /**
         * shortcut for returning the changed $scope object props
         * useful for model objects, but not model lists
         * @param result {Array}
         * @private
         */
        __$scopePropsChange: function(result){
            var changed_=this._objectChange;
            var hasObserve=this._data.hasObserve;
            var propsChange=this._$scopePropsChange.bind(this);
            if(result.changed && result.changed.length){
                result.changed.forEach(function(obj){
                    var changed={};
                    if(hasObserve){
                        changed[obj.name]=obj.value;
                    }else{
                        changed=changed_(obj);
                    }
                    propsChange(changed);
                });
            }
        },

        _$scopePropsChange: $.noop,

        /**
         * returns the elliptical viewBag
         * @returns {*}
         * @private
         */
        _viewBag:function(){
            return $$.elliptical.context;
        },

        /**
         * trigger event
         * @param evt {String}
         * @param data {Object}
         * @private
         */
        _triggerEvent:function(evt,data){
            var Event= $.Event(evt);
            $(window).trigger(Event,data);
        },

        /**
         * component handler for channel.sync subscription
         * @param data {Object}
         * @component
         */
        __onSyncSubscribe: function(data){
            this._onSyncSubscribe(data);
        },

        /**
         * handler for channel.sync, subscription
         * @param data {Object}
         * @private
         */
        _onSyncSubscribe: $.noop,

        /**
         * component handler for channel.add subscription
         * @param data {Object}
         * @component
         */
        __onAddSubscribe: function(data){
            this._onAddSubscribe(data);
        },

        /**
         * handler for channel.add subscription
         * @param data {Object}
         * @private
         */
        _onAddSubscribe: $.noop,

        /**
         * component handler for channel.change subscription
         * @param data {Object}
         * @component
         */
        __onChangeSubscribe: function(data){
            this._onChangeSubscribe(data);
        },

        /**
         * handler for channel.change subscription
         * @param data {Object}
         * @private
         */
        _onChangeSubscribe: $.noop,

        /**
         * component handler for channel.remove subscription
         * @param data {Object}
         * @component
         */
        __onRemoveSubscribe: function(data){
            this._onRemoveSubscribe(data);
        },

        /**
         * component handler for channel.remove subscription
         * @param id {String}
         * @private
         */

        _onRemoveSubscribe: $.noop,


        /**
         * channel.select subscription
         * @param data {Object}
         * @component
         */
        __onSelectSubscribe: function(data){
            var result;
            if(data.id && this.__isModelList()){
                result= utils.selectObjectByIdFromArrayProp(this.$scope,this._data.scopeId,data.id);
            }else{
                result= undefined;
            }
            this._onSelectSubscribe(result);
        },

        /**
         * component handler for channel.select subscription
         * @param id {Object}
         * @component
         */
        _onSelectSubscribe: $.noop,

        /**
         * returns the scope property of the ViewBag context(options.context)
         * @returns {Object}
         * @private
         */
        _scopedContextModel:function(){
            var context=this.options.context,
                scopeProp=this.options.scope;

            return (scopeProp && context) ? context[scopeProp] : undefined;
        },


        _dispose: $.noop,

        scope:function(){
            return this.$scope;
        }



    });

    /**
     * define the factory
     * @param ElementProto {Object} <optional>, only should be supplied if the element not derived from HTMLElement
     * @param name {String}
     * @param tagName {String} <optional>
     * @param base {Object} <optional>
     * @param prototype {Object}
     */
    $.controller = function (ElementProto,name,tagName, base, prototype) {
        var baseObject;
        var tagName_=null;
        var ElementProto_=null;

        /* support 2-5 params */
        var length=arguments.length;
        if(length < 2){
            throw "Error: Controller requires a minimum of two parameter types: string name and a singleton for the prototype"
        }else if(length===2){

            prototype = name;
            if(typeof ElementProto==='object'){
                throw "Error: Controller requires a string name parameter";
            }
            if(typeof name!=='object'){
                throw "Error: Controller requires a singleton for the prototype";
            }
            name=ElementProto;
            baseObject = $.elliptical.controller;
            base=null;
        }else if(length===3){

            prototype=tagName;
            if(typeof ElementProto==='object'){
                if(typeof name!=='string'){
                    throw "Error: Controller requires a string name parameter";
                }
                if(typeof tagName!=='object'){
                    throw "Error: Controller requires a singleton for the prototype";
                }

                ElementProto_=ElementProto;
                baseObject = $.elliptical.controller;
                base=null;
            }else{
                if(typeof tagName==='object'){
                    if(typeof name==='string'){
                        tagName_=name;
                        baseObject = $.elliptical.controller;
                        base=null;
                    }else{
                        base=name;
                    }
                    name=ElementProto;
                }else{
                    throw "Error: Controller requires a singleton for the prototype";
                }
            }


        }else if(length===4){

            prototype=base;
            if(typeof ElementProto==='object'){
                ElementProto_=ElementProto;
                if(typeof name!=='string'){
                    throw "Error: Element requires a string name parameter";
                }
                if(typeof tagName==='string'){
                    tagName_=tagName;
                    baseObject = $.elliptical.controller;
                    base=null;
                }else{
                    base=tagName;
                }
            }else{
                base=tagName;
                tagName_=name;
                name=ElementProto;
            }
        }else{

            ElementProto_=ElementProto;
            tagName_=tagName;

        }

        if(base){
            var initFunc=[];
            /* controller inheritance creates a callstack for the parent  _init event,written to an array on the element prototype,
             so they get fired in sequence, avoiding being overwritten by the element's _initController event
             */
            if($.utils.array.isArray(base)){ /* support passing in array of base elements, not just one */
                /* array */

                /* setup baseObject constructor */
                baseObject = function () {};
                baseObject._childConstructors = [];

                /* iterate and extend */
                base.forEach(function(obj){
                    /* obj.__initFunc array of _initController gets concat'ed to the new stack */
                    if(obj.prototype.__initFunc && obj.prototype.__initFunc.length > 0){
                        initFunc=initFunc.concat(obj.prototype.__initFunc);
                    }
                    $.extend(baseObject.prototype, obj.prototype, $.elliptical.controller.prototype);
                    /* push obj _initController or initElement onto initFunc stack */
                    if(obj.prototype._initController){
                        initFunc.push(obj.prototype._initController);
                    }else if(obj.prototype._initElement){
                        initFunc.push(obj.prototype._initElement);
                    }

                });

                /* attach the stack to the prototype */
                if(initFunc.length > 0){
                    prototype.__initFunc=initFunc;
                }

            }else{
                /* object */
                if (base.prototype._initController) {
                    baseObject = base;
                    if(baseObject.prototype.__initFunc && baseObject.prototype.__initFunc.length > 0){
                        initFunc=initFunc.concat(baseObject.prototype.__initFunc);
                    }
                    initFunc.push(baseObject.prototype._initController);
                } else {
                    /* base is not derived from controller, so extend onto a baseObject constructor */
                    baseObject = function () {};
                    baseObject._childConstructors = [];
                    if(base.prototype._initElement){
                        initFunc.push(base.prototype._initElement);
                    }
                    $.extend(baseObject.prototype, base.prototype, $.elliptical.controller.prototype);

                }

                if(initFunc.length > 0){
                    prototype.__initFunc=initFunc;
                }
            }
        }



        /* implement using the extended jQuery UI factory */
        $.widget(name, baseObject, prototype);



        /* register the element as a custom element, if enabled */
        if($.element.custom){
            if(!tagName_){
                tagName_=name.replace('.','-');
            }
            var name_= name.split( "." )[ 1 ];
            if(!ElementProto_){
                var __proto__=HTMLElement.prototype;
                __proto__._name='HTMLElement';
                ElementProto_=__proto__;
            }
            $.element.register(name_,tagName_,ElementProto_);


        }
    };


    /* copy props of element to controller */
    for(var key in $.element){
        $.controller[key]= $.element[key];
    }


    /* setup observer for ui-controller,data-controller instantiations on added mutations */
    $(function(){
        $(document).on('ellipsis.onMutation',function(event,data){
            var mutations=data.mutations;
            mutations.forEach(function (mutation) {
                var added=mutation.addedNodes;
                if(added.length>0){
                    /* support data-controller and ui-controller */
                    var dataUi=$(added).selfFind(DataSelector_);
                    if(dataUi && dataUi.length >0){
                        //html5 mode, the only selector is data-controller
                        instantiateControllers(dataUi,'data-controller');
                    }

                    if($.element.custom){
                        var ui=$(added).selfFind(Selector_);
                        if(ui && ui.length >0){
                            //for base ui-controller tag, <ui-controller name=""></ui-controller>
                            instantiateControllers(ui,'name');
                        }
                        var ctrl=$(added).selfFind('[controller]');
                        if(ctrl && ctrl.length > 0){
                            //previously registered custom elements not tied to $.controller
                            //<ui-tabs><tabbed-content><tab-content controller=""></tab-content></tabbed-content></ui-tabs>
                            instantiateControllers(ctrl,'controller');
                        }
                    }
                }
            });
        });
    });

    //for page loads
    (function(){
        document.addEventListener('WebComponentsReady', function() {
            /* support data-controller and ui-controller */
            var dataUi = $(document).find(DataSelector_);
            var ui,ctrl;
            if($.element.custom){
                ui = $(document).find(Selector_);
                ctrl=$(document).find('[controller]');
            }
            if(dataUi && dataUi.length >0){
                instantiateControllers(dataUi,'data-controller');
            }
            if($.element.custom && ui && ui.length > 0){
                instantiateControllers(ui,'name');
            }
            if($.element.custom && ctrl && ctrl.length > 0){
                instantiateControllers(ctrl,'controller');
            }
        });

    })();



    /* instantiate controllers from jQuery Array */
    function instantiateControllers(ui,attrSelector){
        $.each(ui,function(){
            var context=window.$$.elliptical.context;
            var controller= $(this).attr(attrSelector);
            if(controller !==undefined){
                controller=controller.toCamelCase();
            }
            var camelCase =($.element.custom) ? $(this).attr('camel-case') : $(this).attr('data-camel-case');
            if(camelCase===undefined){
                camelCase=true;
            }
            var opts= $.element.getOpts(this,camelCase);
            if(context){
                opts.context=context;
            }
            $(this)[controller](opts);
        });
    }

    /* delete controller from custom element definitions,
       since we are already separately binding ui-controller instantiations to mutation observer changes

       this prevents each <ui-controller name=""></ui> from having two instances, a ".name" instance and a ".controller" instance

     */
    if($.element.custom){
        var definitions_=$.element.definitions;
        var len_=definitions_.length;
        for(var i=0;i<len_;i++){
            if(definitions_[i].name==='controller'){
                definitions_.splice(i,1);
            }
        }
    }



    return $;

}));
/*
 * =============================================================
 * elliptical-form
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-controller'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-controller'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function () {
    var utils= $.elliptical.utils;
    var _=utils._;

    /* customElements object */
    var Selector_='[data-form]';
    var customElements_=false;
    if($('html').hasClass('customelements')){
        Selector_='ui-form';
        customElements_=true;
    }


    $.controller('elliptical.form','ui-form',{

        _initController:function(){
            this._initForm();
        },

        _initForm:function(){

        },

        /**
         *
         * @private
         */
        __getTemplateNode:function(){
            return this.element.find('form');
        },

        /**
         * renders the template fragment directly using the $scope
         * @param $scope {Object}
         * @param callback {Function}
         * @private
         */
        __render: function($scope,callback){
            var opts={};
            opts.template=this._data.templateId;
            if(this.__isModelList()){
                var prop=Object.keys($scope)[0];
                opts.model=$scope[prop];
                opts.context=prop;
            }else{
                opts.model=$scope;
            }

            opts.parse=false;
            this.__renderTemplate(opts,callback);
        },

        /**
         *
         * @param opts {Object}
         * @param callback {Function}
         * @private
         */
        __renderTemplate:function(opts,callback){
            var self=this;
            this._renderTemplate(opts,function(err,out){
                var html=out.replace(/<form(.*?)>/g,'').replace(/<\/form>/g,'');
                self._data.templateNode.html(html);
                if(callback){
                    callback(err,out);
                }
            });
        },

        $render:function(model,context,callback){
            if(typeof context==='function'){
                callback=context;
                context=undefined;
            }
            var opts={};
            opts.parse=false;
            opts.template=this._data.templateId;
            opts.model=model;
            //opts.context=context;
            this.__renderTemplate(opts,callback);
        }

    });


    /**
     * define the factory

     * @param name {String}
     * @param tagName {String}
     * @param base {Object} <optional>
     * @param prototype {Object}
     */
    $.form = function (name,tagName,base, prototype) {
        var baseObject;
        var tagName_=null;
        /* support 2-4 params */
        var length=arguments.length;
        if(length < 2) {
            throw "Error: Form requires a minimum of two parameter types: string name and a singleton for the prototype";
        }else if(typeof name !=='string'){
            throw "Error: Form requires name of type string";
        }else if(length===2){
            if(typeof name==='string' && typeof tagName==='string'){
                throw "Error: Form requires a minimum of two parameter types: string name and a singleton for the prototype";
            }
            prototype = tagName;
            baseObject = $.elliptical.form;
            base=null;
        }else if(length===3){
            if(typeof name==='string' && typeof tagName==='string'){
                tagName_=tagName;
                prototype = base;
                baseObject = $.elliptical.form;
                base=null;
            }else{
                prototype=base;
                base=tagName;
            }
        }else if(length===4){
            tagName_=tagName;
        }

        if(base){
            var initFunc=[];
            /* controller inheritance creates a callstack for the parent form _initForm event,written to an array on the element prototype,
             so they get fired in sequence, avoiding being overwritten by the element's _initForm event
             */
            if($.utils.array.isArray(base)){ /* support passing in array of base elements, not just one */
                /* array */

                /* setup baseObject constructor */
                baseObject = function () {};
                baseObject._childConstructors = [];

                /* iterate and extend */
                base.forEach(function(obj){
                    /* obj.__initFunc array of _initForm gets concat'ed to the new stack */
                    if(obj.prototype.__initFunc && obj.prototype.__initFunc.length > 0){
                        initFunc=initFunc.concat(obj.prototype.__initFunc);
                    }
                    $.extend(baseObject.prototype, obj.prototype, $.elliptical.form.prototype);
                    /* push obj _initForm or _initController or _initElement onto initFunc stack */
                    if(obj.prototype._initForm){
                        initFunc.push(obj.prototype._initForm);
                    }else if(obj.prototype._initController){
                        initFunc.push(obj.prototype._initController);
                    }else if(obj.prototype._initElement){
                        initFunc.push(obj.prototype._initElement);
                    }
                });

                /* attach the stack to the prototype */
                if(initFunc.length > 0){
                    prototype.__initFunc=initFunc;
                }

            }else{
                /* object */
                if (base.prototype._initController) {
                    baseObject = base;
                    if(baseObject.prototype.__initFunc && baseObject.prototype.__initFunc.length > 0){
                        initFunc=initFunc.concat(baseObject.prototype.__initFunc);
                    }
                    initFunc.push(baseObject.prototype._initForm);
                } else {
                    /* base is not derived from element, so extend onto a baseObject constructor */
                    baseObject = function () {};
                    baseObject._childConstructors = [];
                    if(base.prototype._initController){
                        initFunc.push(base.prototype._initController);
                    }else if(base.prototype._initElement){
                        initFunc.push(base.prototype._initElement);
                    }
                    $.extend(baseObject.prototype, base.prototype, $.elliptical.form.prototype);
                }

                if(initFunc.length > 0){
                    prototype.__initFunc=initFunc;
                }
            }
        }

        /* implement using the extended jQuery UI factory */
        $.widget(name, baseObject, prototype);

        /* register the element as a custom element, if enabled */
        if(customElements_){
            if(!tagName_){
                tagName_=name.replace('.','-');
            }
            var name_= name.split( "." )[ 1 ];

            $.widget.register(name_,tagName_,HTMLElement.prototype,false);
        }
    };

    //register ui-form as custom element
    if(customElements_){
        try{
            //$.widget.registerElement('ui-form');
            /* make public props/methods available on $.form */
            for(var key in $.controller){
                $.form[key]= $.controller[key];
            }
        }catch(ex){

        }
    }

    /* register a document listener for ellipsis.onMutation */
    $(function(){
        $(document).on('ellipsis.onMutation',function(event,data){
            var mutations=data.mutations;
            mutations.forEach(function (mutation) {
                var added=mutation.addedNodes;
                if(added.length>0){
                    /* support data-form and ui-form */
                    var ui=$(added).selfFind(Selector_);
                    if(ui && ui.length > 0){
                        instantiateForms(ui);
                    }
                }
            });
        });
    });


    //for page loads
    (function(){
        document.addEventListener('WebComponentsReady', function() {
            var ui = $(document).find(Selector_);
            if(ui && ui.length > 0){
                instantiateForms(ui);
            }
        });
    })();

    /* instantiate forms from jQuery Array */
    function instantiateForms(ui){
        $.each(ui,function(){
            var form=(customElements_) ? $(this).attr('name') : $(this).attr('data-form');
            if(form !==undefined){
                form=form.toCamelCase();
            }
            var camelCase =($.element.custom) ? $(this).attr('camel-case') : $(this).attr('data-camel-case');
            if(camelCase===undefined){
                camelCase=true;
            }
            var opts= $.widget.getOpts(this,camelCase);
            $(this)[form](opts);

        });
    }

    /* delete form from custom element definitions,
     since we are already separately binding ui-form instantiations to mutation observer changes

     this prevents each <ui-form name=""></ui> from having two instances, a ".name" instance and a ".form" instance

     */
    if($.element.custom){
        var definitions_=$.element.definitions;
        var len_=definitions_.length;
        for(var i=0;i<len_;i++){
            if(definitions_[i].name==='form'){
                definitions_.splice(i,1);
            }
        }
    }

    return $;

}));

/*
 * =============================================================
 * $.controller prototype extension
 * =============================================================
 * Dependencies:
 * elliptical-controller
 *
 * extends $.controller for services injection and configuration
 */


//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-controller'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-controller'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

    /**
     * getter/setter for scope id prop
     * @type {Object}
     */
    $.controller.config={
        scope:Object.defineProperties({},{
            'id':{
                get:function(){
                    return $.Widget.prototype.options.idProp;
                },
                set:function(val){
                    $.Widget.prototype.options.idProp=val;
                }
            }
        })

    };

    /**
     * pass services to the controller prototype, $.controller.service(S1,S2,..SN);
     * invoke a service from the controller: var myService=this.service('serviceName');
     */
    $.controller.service=function(){
        var services=[];
        var args = [].slice.call(arguments);
        for(var i=0;i<args.length;i++){
            var name=(args[i]["@class"]);
            if(!name){
                if(args[i].constructor && args[i].constructor["@class"]){
                    name=args[i].constructor["@class"];
                }else{
                    name='Model';
                }
            }

            services.push({
                name:name,
                service:args[i]
            });

        }
        var options=$.Widget.prototype.options;
        (typeof options.services != 'undefined') ? options.services=options.services.concat(services) :  options.services=services;

    };

    var prototype_={
        /**
         * return a service by name(@class)
         * @param name {String}
         * @returns {Object}
         * @private
         */
        service:function(name){
            var obj_=null;
            var model=null;
            this.options.services.forEach(function(obj){
                if(obj.name===name){
                    obj_=obj.service;
                }else if(obj.name==='Model'){
                    model=obj.service.extend({},{}); //if model, extend it so that it each is a separate copy
                    model["@class"]=name;
                }
            });

            return (obj_) ? obj_ : model;
        },

        __onPreInit:function(){
            var context=this.options.context;
            if(context){
                this._data.authenticated=this.options.context.authenticated;
                this._data.membership=this.options.context.membership;
            }
        }

    };

    /* extend the controller UI Factory prototype */
    $.extend($.elliptical.controller.prototype,prototype_);

    return $;
}));



/*
 * =============================================================
 * elliptical.scroll
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../controller/controller'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../controller/controller'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

    $.controller("elliptical.scroll", {


        /*==========================================
         PRIVATE
         *===========================================*/

        _initController:function(){
            this._scrollEvent();
        },

        _onScroll: $.noop,

        /**
         * element events
         * @private
         */
        _scrollEvent: function(){
            var self = this;
            $(window).on('scroll', function (event) {
                var scrollY = window.pageYOffset;
                self._onScroll(scrollY);
            });
        },

        _onDestroy: function () {
            $(window).off('scroll');
        }



    });

    return $;


}));







/*
 * =============================================================
 * elliptical.slideNotification
 * =============================================================
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../controller/controller'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../controller/controller'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function () {

    $.controller('elliptical.slideNotification',{
        options:{
            template:'ui-slide-notification',
            cssModalClass:null,
            animationIn:'bounceInDown',
            animationOut:'bounceOutUp',
            modalCssClass:null,
            modalZIndex:999,
            modalOpacity:.3,
            model:{}
        },


        _initElement:function(){
            this.__selector();
            this._attachElement();
            this._show();

        },

        _subscriptions:function(){
            this._subscribe('slide.notification.hide',this._hide.bind(this));
        },

        __selector:function(){
            var __customElements=this.options.$customElements;
            this._data.selector=(__customElements) ? 'ui-slide-Notification' : '.ui-slide-notification';
        },


        _attachElement:function(){
            var self=this;
            var container=$('<div></div>');
            this._data.container=container;
            var body=this.element;
            body.append(container);

        },

        _show:function(){
            var self=this;
            this._showModal(function(){
                self._renderElement();
            });
        },

        _renderElement:function(){
            var self=this;
            var container=this._data.container;
            this._render(container,{
                template:this.options.template,
                model:this.options.model

            },function(){
                self._data.element=container.find(self._data.selector);
                self._animate();
                var button= container.find('button');
                self._data.button=button;
                self._close();

            });
        },


        _showModal:function(callback){
            var opts={};
            if(this.options.modalCssClass){
                opts.cssClass=this.options.modalCssClass;
            }
            opts.opacity=this.options.modalOpacity;
            opts.zIndex=this.options.modalZIndex;
            this._setModal(this.element,opts,function(){
                callback();
            });
        },

        _animate:function(){
            var self=this;
            this._onEventTrigger('showing',{});
            var element=this._data.element;
            this._transitions(element,{
                preset:'bounceInDown'
            },function(){
                self._onEventTrigger('show',{});
            });
        },

        _close:function(){
            var self=this;
            var button=this._data.button;
            if(button){
                button.on('click',function(event){
                    self._hide();
                });
            }
        },

        _hide:function(){

            this._removeModal();
            var element=this._data.element;
            this._onEventTrigger('hiding',{});
            (!$.browser.msie) ? this.__transitionOut(element) : this._destroy();

        },

        __transitionOut:function(element){
            var self=this;
            var animationOut=this.options.animationOut;
            this._transitions(element,{
                preset:animationOut

            },function(){
                self.destroy();
            });
        },

        _unbindButtonEvent:function(){
            var button=this._data.button;
            if(button){
                button.off('click');
            }
        },

        _onDestroy:function(){
            this._unbindButtonEvent();
            var container=this._data.container;
            container.remove();
        },

        hide:function(){
            this._hide();
        }

    });

    return $;

}));

/*
 * =============================================================
 * elliptical.modelList
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../controller/controller'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../controller/controller'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

 $(function(){

     $.controller('elliptical.modelList','ui-model-list', {
         __setScope: function () {
             var context=this.options.context, //context attached by the route
                 scopeProp=this.options.scope,//context property to use as the scope
                 key=this.options.idProp;

             if(key===undefined){
                 this.options.key=this._data.scopeId;
             }
             if(scopeProp && context){
                 this.$scope[scopeProp]=context[scopeProp];
             }else{
                 this.$scope = {items:[]};
             }

         },

         _initController:function(){


         },

         __onActiveSubscribe:function(id){
             var models=this.__templateModels();
             models.removeClass('active');
             var node=this.__templateNode(id);
             node.addClass('active');
         },

         __onSyncSubscribe: function(result){
             if(!result || result===undefined){
                 return false;
             }
             var data=result.$scope;
             var self=this;
             var arr=data[Object.keys(data)[0]];
             arr.forEach(function(obj){
                 var result={};
                 result.added=[];
                 result.added.push(obj);
                 self.__onScopeChange(result);
             });
             this._onSyncSubscribe(data);
             return true;
         },

         _publishCount:function(){
             var length=this.__scopeLength();
             if(this.options.channel){
                 this._publish(this.options.channel + '.count',length);
             }else if(this.options.scope){
                 this._publish(this.options.scope + '.count',length);
             }
         },

         _publishRemove:function(){
             if(this.options.channel){
                 this._publish(this.options.channel + '.remove',{});
             }
         },


         _onScopeChange:function(result){
             this._publishCount();
             var model=this.options.service;
             var id=this.options.idProp;
             var key=this.options.modelKey;
             if(key!==undefined){
                 id=key;
             }
             var eventBlock=this.options.eventBlock;
             if(typeof model !== 'undefined' && !eventBlock){
                 var Model=this.service(model);
                 if(result.removed && result.removed.length){
                     result.removed.forEach(function(obj){
                         var params={};
                         params[id]=obj[id];
                         Model.delete(params);

                     });
                 }
             }
         }

     });

     return $
 });

}));


/*
 * =============================================================
 * elliptical.modelDelete
 * =============================================================
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('ellipsis-element'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ellipsis-element'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function ($) {
    $.element('elliptical.modelDelete','ui-model-delete',{
        options:{
            confirm:false,
            confirmText:'Are you sure you want to delete this item?',
            disabled:false
        },

        _initElement:function(){
            var __customElements=this.options.$customElements;
            this._data.selector=(__customElements) ? 'ui-model' : '[data-node="model"]';
        },

        _events:function(){
            var click=this._data.click;
            var self=this;

            this.element.on(click,function(event){
                if(!self.options.disabled){
                    self._remove();
                }
            });
        },

        _remove:function(){
            var confirm_=this.options.confirm;
            var confirmText=this.options.confirmText;
            var selector=this._data.selector;
            var model=this.element.parents(selector);
            var model_=model[0];
            if(confirm_){
                if(confirm(confirmText)){
                    try{
                        model_.remove(); //remove DOM node
                    }catch(ex){
                        model.remove();
                    }

                }
            }else{
                try{
                    model_.remove(); //remove DOM node
                }catch(ex){
                    model.remove();
                }

            }
        },

        _destroy:function(){
            var click=this._data.click;
            this.element.off(click);
        },

        disable:function(){
            this.options.disabled=true;
            this.element.addClass('disabled');
        },

        enable:function(){
            this.options.disabled=false;
            this.element.removeClass('disabled');
        }
    });

}));

/*
 * =============================================================
 * elliptical.form prototype extension
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-form
 *
 * extends the elliptical form factory
 *
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-form'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-form'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

    var prototype_ = {

        __setScope: $.noop,

        /**
         * init
         * @private
         */
        _initController: function () {
            this._data.data = null;
            this._data.notificationElement = null;
            this._setFormElement();
            this.__setFormScope();
            this._initForm();

        },

        __setFormScope:function(){
            var scopeProp = this.options.scope;
            var cxt=this.options.context;
            if(!cxt){
                cxt=$$.elliptical.context;
            }
            if (scopeProp && typeof scopeProp !== 'undefined') {
                var formContext=this.__cloneObject(cxt[scopeProp]);
                this.$scope = formContext;
            }

        },

        _initForm: function(){

        },

        /**
         * events: bind _onValidate to the submitEvent delegate
         *         bind _onReset to DOM reset event
         * @private
         */
        _events: function () {
            //this._event($(document), this.options.submitEvent, this._onValidate.bind(this));
            //this._event($(document), this.options.resetEvent, this._onReset.bind(this));
            $(document).on(this.options.submitEvent,this._onValidate.bind(this));
            $(document).on(this.options.resetEvent,this._onReset.bind(this));
            this._onEvents();
        },

        /**
         *  bind _onReset published reset event(can be called, .e.g., from the slide notification panel)
         * @private
         */
        _subscriptions:function(){
            this._subscribe(this.options.resetSubscription,this._onReset.bind(this));
            this._onSubscriptions();
        },

        _onEvents: $.noop,

        _onSubscriptions: $.noop,


        /**
         * intermediate form validation:
         * if schema declared, pass to Validation service, otherwise, pass on to submit mediator
         * @param event {Object}
         * @param data {Object}
         * @private
         */
        _onValidate: function (event, data) {
            (this.options.schema) ? this._validate(data) : this.___onSubmit(data);

        },

        /**
         * calls internal method to reset form
         * @param event {Object}
         * @param data {Object}
         * @private
         */
        _onReset: function (event, data) {
            this._reset();
            this._killNotification();
        },

        /**
         * submit mediator method:
         * if service is declared, internally submit, otherwise pass off to dev _onSubmit
         * @param data {Object}
         * @private
         */
        ___onSubmit:function(data){
            (this.options.service) ? this.__onSubmit(data) : this._onSubmit(data);
        },

        /**
         * if Validation service has been injected, passes to validation, otherwise passes to internal __onSubmit
         * @param data {Object}
         * @private
         */
        _validate: function (data) {
            var Validation = this.service('Validation');
            var body = data.body;
            var schema = this.options.schema;
            var formElement = this._data.form;
            var method = formElement.attr('method');
            var action = formElement.attr('action');
            if (Validation !== undefined) {
                this._callValidation(Validation, data, body, method, action, schema);
            } else {
                this.___onSubmit(data);
            }

        },

        /**
         * uses the validate method of the Validation service to validate
         * @param Validation {Object/Function}
         * @param data {Object}
         * @param body {Object}
         * @param method {String}
         * @param action {String}
         * @param schema {String}
         * @private
         */
        _callValidation: function (Validation, data, body, method, action, schema) {
            var self = this;
            body=this._onBeforeValidate(body);
            Validation.post(body,schema, function (err, form) {
                if (err) {
                    form.action = action;
                    form.method = method;
                    self._onError(err, form);
                    self._renderError(form);
                } else {
                    self.___onSubmit(data);
                }
            });
        },

        _onSubmit: $.noop,

        _onSuccess: $.noop,

        _onError: $.noop,

        _onBeforeSubmit:function(data){
            return data;
        },

        _onBeforeValidate:function(body){
            return body;
        },


        /**
         * internal method to submit form to service
         * @param data {Object}
         * @private
         */
        __onSubmit: function (data) {
            //show notification message
            this._notify('info', this.options.processingMsg, false);
            var body = this._onBeforeSubmit(data.body);
            var self = this;
            var model = this.options.service;
            if (model) {
                var formElement = this._data.form;
                var method = formElement.attr('method').toLowerCase();
                var Model = this.service(model);
                Model[method](body, function (err, result) {
                    if (!err) {
                        //trigger success event
                        self._triggerEvent(self.options.successEvent,result);
                        //dev handled _onSuccess
                        self._onSuccess(result);
                        //render success form
                        self._renderSuccess(result);
                        //show notification status
                        self._sendNotification(err, result);
                    } else {
                        //trigger failure event
                        self._triggerEvent(self.options.failureEvent,err);
                        self._sendNotification(err, null);
                        //dev handled _onError
                        self._onError(err, data);
                        //render error form
                        self._renderError({});
                    }
                });
            } else {
                var err_ = {};
                err_.statusCode = 400;
                err_.message = 'Model undefined';
                this._onError(err_, data);
                this._renderError({});
            }
        },

        /**
         * render success form-->pass $scope to re-render form
         * @param data {Object}
         * @private
         */
        _renderSuccess: function (data) {
            var Validation = this.service('Validation');
            data = Validation.onSuccess(data);
            var mergedData = this._mergeFormData(data);
            this._renderForm(mergedData);

        },



        /**
         * render error form-->merge validation onError method with $scope to re-render form
         * @param data {Object}
         * @param msg {String}
         * @private
         */
        _renderError: function (data,msg) {
            var Validation = this.service('Validation');
            data = Validation.onError(data,msg);
            var mergedData = this._mergeFormData(data);
            this._renderForm(mergedData);
        },

        /**
         * merges a data object with the current $scope
         * @param data {Object}
         * @returns {Object}
         * @private
         */
        _mergeFormData: function (data) {
            return $.extend({}, this.$scope, data);
        },

        /**
         * renders form
         * @param form
         * @private
         */
        _renderForm: function (form) {
            var self=this;
            this.$render(form, function(){
                self.__rebindTemplate();
            });
        },


        /**
         * set the form element
         * @private
         */
        _setFormElement: function () {
            var form = this.element.find('form');
            this._data.form = form;

        },

        /**
         * display notification
         * @param err {Object}
         * @param data {Object}
         * @param delay {Number}
         * @private
         */
        _sendNotification: function (err, data,delay) {
            var self=this;
            if(delay===undefined){
                delay=1000;
            }
            var opts = {};
            opts.terminate = true;
            opts.data = data;
            if (!err) {
                opts.slideIn = true;
            } else {
                opts.cssClass = 'error';
                (typeof err.message === 'string') ? opts.message = err.message : opts.message = 'Submission Error...';
            }
            setTimeout(function(){
                self._notification($('body'), opts);
            },delay);

        },

        /**
         * instantiates a notification element
         * @param element {Object}
         * @param opts {Object}
         * @param callback {Function}
         * @private
         */
        _notification: function (element, opts, callback) {
            //save ref to the notification element
            this._data.notificationElement = element;
            var self = this;
            if (typeof opts === 'function') {
                callback === opts;
                opts = {};
            } else if (!opts) {
                opts = {};
            }

            opts.slideIn = opts.slideIn || false;


            if (opts.slideIn) {
                opts.terminateTimeout = opts.terminateTimeout || 100;
                opts.cssModalClass = opts.cssModalClass || 'forms';

                setTimeout(function () {
                    /* destroy notification widget */
                    if (element.data('ellipsisNotification')) {
                        element.notification('destroy');
                    }
                    opts.model = self._getNotificationModel();
                    opts.context = 'model';
                    /* show slide notification */
                    element.slideNotification(opts);

                }, opts.terminateTimeout);

                if (callback) {
                    callback();
                }

            } else {

                opts.terminateTimeout = opts.terminateTimeout || 1000;
                opts.inline = opts.inline || false;
                opts.terminateDelay = opts.terminateDelay || 1000;
                opts.cssClass = opts.cssClass || 'info';
                opts.message = opts.message || 'processing...';
                opts.terminate = opts.terminate || false;

                element.notification(opts);
                element.notification('show');

                if (callback) {
                    callback();
                }
            }
        },

        /**
         * constructs a notification model for notifications
         * @returns {Object}
         * @private
         */
        _getNotificationModel: function () {
            var model = {};
            var formElement = this._data.form;
            var method = formElement.attr('method');
            var action = formElement.attr('action');
            //reset
            if (method && method.toLowerCase() === 'post') {
                model.reset = true;
            }
            //previous location
            model.referrer = {
                url: document.referrer
            };

            //redirect
            if (this.options.redirect) {
                model.redirect = {
                    url: this.options.redirect
                };
                if (this.options.redirectLabel) {
                    model.redirect.label = this.options.redirectLabel;
                }
            }

            return model;

        },

        _killNotifier:function(){
            var element=$('body');
            if (element.data('ellipsisNotification')) {
                element.notification('destroy');
            }
        },

        /**
         * destroy slide notification element
         * @private
         */
        _killNotification:function(){
            var element=this._data.notificationElement;
            if(element[0]){
                element.slideNotification('hide');
            }
        },

        /**
         * internal scope change handler
         * @param result {Object}
         * @private
         */
        __$scopePropsChange:function(result){
            var self=this;
            var element=this.element;
            var label=element.find('.ui-semantic-label');
            if(label[0] && label.hasClass('error')){
                label.removeClass('error').removeClass('visible').addClass('hidden');
            }
            result.changed.forEach(function(obj){
                if(obj){
                    var changed=self._objectChange(obj);
                    if(changed){
                        for(var key in changed){
                            if (changed.hasOwnProperty(key)) {
                                var input=element.find('input[name="' + key + '"]');
                                if(input[0] && input.hasClass('error')){
                                    input.removeClass('error');
                                }
                            }
                        }
                    }
                }

            });


            var changed_=this._objectChange;
            if(result.changed && result.changed.length){
                result.changed.forEach(function(obj){
                    var changed=changed_(obj);
                    self._$scopePropsChange(changed);
                });
            }

        },


        /**
         * reset form
         * @private
         */
        _reset: function () {
            this.__disposeTemplate();
            //var model = this.options.context;
            //var context = this.options.scope;
            var model=this._scopedContextModel();
            var self=this;
            this.$render(model, function(){
                self.__setFormScope();
                self.__resetObservable();
                self.__rebindTemplate();

            });
        },

        _onDestroy: function(){
            $(document).off(this.options.submitEvent);
            $(document).off(this.options.resetEvent);
        },


        /**
         * display notification
         * @param element {Object}
         * @param opts {Object}
         * @param callback {Function}
         * @public
         */
        notification: function (element, opts, callback) {
            this._notification(element, opts, callback);
        },


        /**
         * reset form
         * @public
         */
        reset: function () {
            this._reset();
        },

        /**
         * render form
         * @param data {Object}
         * @public
         */
        renderForm: function (data) {
            this._renderForm(data);
        }
    };

    /**
     * options
     * @private
     */
    var options_ = {
        submitEvent: 'elliptical.onDocumentSubmit',
        successEvent:'elliptical.onSubmitSuccess',
        failureEvent:'elliptical.onSubmitFailure',
        resetEvent:'elliptical.onFormReset',
        resetSubscription:'elliptical.form.reset',
        schemas: null,
        schemaValidation: null,
        resetModel: {
            submitLabel: {
                cssDisplay: 'hidden',
                message: '&nbsp;'
            }
        },
        processingMsg: 'Processing...',
        redirectLabel: null,
        redirect: null
    };

    /* extend the form Factory prototype */
    $.extend($.elliptical.form.prototype, prototype_);



    /* extend options */
    $.extend($.elliptical.form.prototype.options, options_);

    return $;

}));
/*
 * =============================================================
 * elliptical.loginForm
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../form/form'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../form/form'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

 $(function(){

    $.form('elliptical.loginForm','ui-login-form',{

        _initForm:function(){
            this._getRedirectUrl();

        },

        _getRedirectUrl:function(){
            var Location=this.service('Location');
            var href=Location.href;
            var returnUrl=Location.url.queryString(href,'returnUrl');
            this._data.redirectUrl=(returnUrl && returnUrl !==undefined) ? returnUrl : this.options.redirect;
        },

        _onSubmit:function(data){
            var body=data.body;
            var formElement = this._data.form;
            var method = formElement.attr('method');
            var action = formElement.attr('action');
            var Validation=this.service('Validation');
            var schema=this.options.schema;
            (Validation && Validation.post) ? this._validate(Validation,body,schema,action,method) : this._login(body);

        },

        _validate:function(Validation,body,schema,action,method){
            var self=this;

            Validation.post(body,schema, function (err, form) {
                if (err) {
                    form.action = action;
                    form.method = method;
                    self._renderForm(form);
                } else {
                    self._login(body);
                }
            });
        },

        _login:function(form){
            var self=this;
            var Location=this.service('Location');
            var Membership=this.service('Membership');
            this._showLoader();
            Membership.login(form,function(err,data){
                setTimeout(function(){
                    self._hideLoader();
                    if(!err){
                        var redirectUrl=(data.redirectUrl && data.redirectUrl !==undefined) ? data.redirectUrl : self._data.redirectUrl;
                        Location.redirect(redirectUrl);
                    }else{
                        self._renderError({},'Invalid Login');
                    }

                },1000);

            });
        }
    });
 });

    return $;

}));









/*
 * =============================================================
 * elliptical.signupForm
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../form/form'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../form/form'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

 $(function(){

    $.form('elliptical.signupForm','ui-signup-form',{

        _initForm:function(){
            this._getRedirectUrl();
        },

        _getRedirectUrl:function(){
            this._data.redirectUrl=this.options.redirect;

        },

        _onSubmit:function(data){
            var body=data.body;
            var formElement = this._data.form;
            var method = formElement.attr('method');
            var action = formElement.attr('action');
            var Validation=this.service('Validation');
            var schema=this.options.schema;
            (Validation && Validation.post) ? this._validate(Validation,body,schema,action,method) : this._login(body);

        },

        _validate:function(Validation,body,schema,action,method){
            var self=this;
            Validation.post(body,schema, function (err, form) {
                if (err) {
                    form.action = action;
                    form.method = method;
                    form=self._mergeFormData(form);
                    self._renderForm(form);
                } else {
                    self._login(body);
                }
            });
        },

        _login:function(form){
            var self=this;
            var Location=this.service('Location');
            var Membership=this.service('Membership');
            this._showLoader();
            Membership.signUp(form,function(err,data){
                setTimeout(function(){
                    self._hideLoader();
                    if(!err){
                        var redirectUrl=(data.redirectUrl && data.redirectUrl !==undefined) ? data.redirectUrl : self._data.redirectUrl;
                        Location.redirect(redirectUrl);
                    }else{
                        self._renderError({},'Invalid Sign-Up');
                    }

                },1000);

            });
        }
    });
 });

    return $;

}));










/*
 * =============================================================
 * elliptical.autoCompleteBind
 * =============================================================

 * dependencies:
 * ellipsis-element
 * ellipsis-autocomplete
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../controller/controller'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../controller/controller'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

    $.controller('elliptical.autoCompleteBind',{

        options:{
            dataBind:false
        },

        _initController: $.noop,

        _onAutoCompleteBinding: $.noop,

        _onAutoCompleteSelected: $.noop,

        _events:function(){
            var self=this;
            this._event($(document),'autocomplete.binding',function(event,data){
                self._onAutoCompleteBinding(event,data);

            });

            this._event($(document),'autocomplete.selected',function(event,data){
                self._onAutoCompleteSelected(event,data);
            });

        }
    });

    return $;

}));

/*
 * =============================================================
 * elliptical.modelBadge  v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-controller
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../controller/controller'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../controller/controller'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

 $(function(){
     $.controller('elliptical.badge','ui-model-badge',  {

         _initController:function(){
             var count=this.element.text();
             if(typeof count !== 'undefined' || count!==''){
                 count=parseInt(count);
             }else{
                 count=0;
             }
             this._data.count=count;

         },

         _subscriptions:function(){
             var channel=this.options.channel + '.count';
             this._subscribe(channel,this._onCountInit.bind(this));
         },

         _onRemoveSubscribe:function(data){
             var count=this._data.count;
             count--;
             this._data.count=count;
             this.element.text(count);

         },

         _onAddSubscribe:function(data){
             var count=this._data.count;
             count++;
             this._data.count=count;
             this.element.text(count);
         },

         _onCountInit:function(count){
             this._data.count=parseInt(count);
         },

         _onChangeSubscribe: $.noop


     });

     return $;
 });


}));


/*
 * =============================================================
 * elliptical.paginationBadge
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-pubsub'),require('../controller/controller'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-pubsub','../controller/controller'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function () {

    $.element('elliptical.modelPaginatedCount','ui-pagination-badge', $.elliptical.pubsub, {

        _initController: function () {
            //this._subscriptions();
        },

        _subscriptions: function () {
            var channel=this.options.channel;
            this._subscribe(channel + '.count',this._setLabel.bind(this));

        },

        _setLabel:function(data){
            this._data.count=data;
            this.element.text(data);
        },

        _setCount:function(){
            var count=this.data.count;
            count--;
            this._setLabel(count);
        }

    });

    return $;

}));
/*
 * =============================================================
 * elliptical.pluralize
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../controller/controller'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../controller/controller'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

 $(function(){
     $.controller('elliptical.pluralize','ui-pluralize',  {

         _initController:function(){


         },

         _onRemoveSubscribe:function(data){
             var count=this.options.count;
             var singular=this.options.singular;
             var plural=this.options.plural;
             count--;
             this.options.count=count;
             (count===1) ? this.element.text(singular) : this.element.text(plural);


         },

         _onAddSubscribe:function(data){
             var count=this.options.count;
             var singular=this.options.singular;
             var plural=this.options.plural;
             count++;
             this.options.count=count;
             (count===1) ? this.element.text(singular) : this.element.text(plural);
         },

         _onChangeSubscribe:function(data){
             var singular=this.options.singular;
             var plural=this.options.plural;
             this.options.count=data;
             (data===1) ? this.element.text(singular) : this.element.text(plural);
         }


     });

     return $;
 });


}));



/*
 * =============================================================
 * elliptical.selectList
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../controller/controller'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../controller/controller'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

    $(function(){
        $.controller('elliptical.selectList',{

            options:{
                dataBind:false
            },

            _onChange: $.noop,

            _events:function(){
                var self=this;
                this._event(this.element,'change',function(event){
                    var element=$(event.target);
                    var value=element.val();
                    self._onChange(value);

                });
            }


        });

        return $;
    });


}));




/*
 * =============================================================
 * elliptical.autosearch
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../controller/controller'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../controller/controller'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

    $.controller('elliptical.autosearch', $.elliptical.autoCompleteBind,{

        options:{
            dataBind:false
        },

        _initController:function(){
            //autosearch only active for desktop media
            if(!this._support.mq.touch){
                this._data.element=null;
                var input=this.element.find('input');
                this._data.input=input;
                this._initAutoSearch(input);
                this._data.message=this.options.message || 'Your search filter returned no results...';
                this._data.cssClass=this.options.cssClass || 'warning';
                this._data.paginationContext=this.options.paginationContext || 'pagination';
                this._data.paginationTemplate=this.options.paginationTemplate || 'ui-pagination';
                if(this._instantiated(input[0],'autocomplete')){
                    try{
                        input.autocomplete('destroy');
                    }catch(ex){

                    }
                }else{
                    this._onAutocompleteLoaded();
                }
            }
        },

        _onAutocompleteLoaded:function(){
            var input=this._data.input;
            this._event($(document),'autocomplete.loaded',function(event){
                try{
                    input.autocomplete('destroy');
                }catch(ex){

                }
            });

        },

        _onSyncSubscribe:function(data){
            if(!this._data.element){
                data.$filterQueue=0;
                this._data.element=data;
            }
        },

        _onInput:function(){
            var input=this._data.input;
            var self=this;
            input.keyup(function (event) {
                self._onChange(event);
            });
        },

        _onChange:function(event){
            var key = event.which;
            var self=this;
            console.log('search keyboard key: ' + key);

            //alpha-numeric or backspace
            if ((key >= 48 && key <= 90)||(key===8)) {
                setTimeout(function(){
                    self._filter();
                },100);
            }
        },

        _applyData:function(data){
            var $element=this._data.element;
            $element.options.eventBlock=true;
            $element.$filterQueue=$element.$filterQueue + 1;
            var $scope=this.$scope;
            $element.$empty();

            if(data && data.length){
                $element._killNotificationLabel();
                this._onScopeBind($scope,$element,data);

            }else{
                $element._notificationLabel({
                    cssClass:this._data.cssClass,
                    message:this._data.message
                });
            }
        },

        _updatePagination:function(pagination){
            var element=this._data.pagination;
            var opts={
                context:this._data.paginationContext,
                model:pagination,
                template:this._data.paginationTemplate
            };
            var self=this;
            this._render(element,opts,function(){

            });
        },

        _animate:function(element){
            this._transitions(element, {
                preset: 'fadeIn',
                duration: 750
            }, function () {

            });
        },

        _updateCount:function(count){
            var channel;
            if(this.options.channel){
                channel=this.options.channel + '.change';
                this._publish(channel,count);
            }
        },

        _filter: $.noop,

        _initAutoSearch: $.noop,

        _onScopeBind: $.noop
    });

    return $;

}));


/*
 * =============================================================
 * elliptical.veneer
 * =============================================================
 * Dependencies:
 * ellipsis-element
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('ellipsis-element'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ellipsis-element'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

    if($.element.custom){
        $.element.registerElement('overlay-element');
    }

    $(function(){
        $.element('elliptical.veneer','ui-veneer',{

            options:{
                animationIn:'bounceInDown',
                modalCssClass:null,
                modalZIndex:10000,
                modalOpacity:.3,
                cssClass:null,
                scope:null
            },

            _initElement:function(){
                if(!this.options.template){
                    return; //template required
                }
                this._data.model={};
                this._getModel();
                this._attachElement();
                this._show();
            },

            _getModel:function(){
                var scope=this.options.scope;
                if(scope){
                    if($$ && $$.elliptical && $$.elliptical.context){
                        this._data.model=($$.elliptical.context[scope]) ? $$.elliptical.context[scope] : {};
                    }
                }
            },

            _attachElement:function(){
                var container=$('<overlay-element></overlay-element>');
                this._data.container=container;
                if(this.options.cssClass){
                    container.addClass(this.options.cssClass);
                }
                var body=$('body');
                body.append(container);

            },

            _show:function(){
                var self=this;
                this._showModal(function(){
                    self._renderElement();
                });
            },

            _renderElement:function(){
                var self=this;
                var container=this._data.container;

                this._render(container,{
                    template:this.options.template,
                    model:this._data.model

                },function(){
                    self._data.element=self._data.container.find('>*');
                    self._animate();
                });
            },

            _showModal:function(callback){
                var opts={};
                opts.opacity=this.options.modalOpacity;
                opts.zIndex=this.options.modalZIndex;
                this._setModal(this.element,opts,function(){
                    callback();
                });
            },

            _animate:function(){
                var element=this._data.element;
                this._transitions(element,{
                    preset:this.options.animationIn
                },function(){

                });
            },

            _onDestroy:function(){
                if(this._data.container){
                    this._data.container.remove();
                }
                this._removeModal();
            }

        });

        return $;
    });


}));



/*
 * =============================================================
 * elliptical.stickyReveal
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../controller/controller'),require('../scroll/scroll'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../controller/controller','../scroll/scroll'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function () {

    if($.element.custom){
        $.element.registerElement('reveal-container');
    }

    $.controller("elliptical.stickyReveal",'ui-sticky-reveal', $.elliptical.scroll, {


        /*==========================================
         PRIVATE
         *===========================================*/
        options:{
            animationIn:'slideIn',
            animationOut:'slideOut',
            durationIn:500,
            durationOut:500,
            yOffset:60
        },

        _initController:function(){
            if(!this._support.mq.touch){
                this._data.$element=null;
                this._data.visible=false;
                this._getContainer();
                if(this.options.template && this.options.event !=='sync'){
                    var model=this._getModel();
                    this._renderElement(model);
                }
            }else{
                this._destroy();
            }


        },


        _getContainer:function(){
            this._data.container=(this.options.$customElements) ? this.element.find('reveal-container') : this.element.find('.reveal-container');
        },

        _onScroll:function(y){
            if(this._data.disabled){
                return;
            }
            var yOffset=this.options.yOffset;
            var visible=this._data.visible;
            if(y>yOffset && !visible){
                this._data.visible=true;
                this._show();
            }else if(y<yOffset && visible){
                this._data.visible=false;
                this._hide();
            }
        },

        _getModel:function(){
            var scope=this.options.scope;
            var model;
            if(scope){
                if($$ && $$.elliptical && $$.elliptical.context){
                    model=($$.elliptical.context[scope]) ? $$.elliptical.context[scope] : {};
                }
            }
            return model;
        },

        _onRenderElement: function($scope){
            this._renderElement($scope);
        },


        _renderElement:function(model){
            var self=this;
            var container=this._data.container;

            this._render(container,{
                template:this.options.template,
                model:model

            },function(){

            });

        },

        _show:function(){
            var element=this.element;

            this._transitions(element,{
                preset:this.options.animationIn,
                duration:this.options.durationIn
            },function(){

            });
        },

        _hide:function(){
            var element=this.element;
            this._transitions(element,{
                preset:this.options.animationOut,
                duration:this.options.durationOut
            },function(){


            });
        },

        _onSyncSubscribe:function($element){
            if(!this._support.mq.touch){
                this._data.$element=$element;
                var $scope=this.$scope;
                this._onRenderElement($scope);
            }

        },



        _onDestroy:function(){
            if(this.options.template && this._data.container){
                this._data.container.empty();
            }
            if(this._support.mq.touch){
                this._super();
            }

        }

    });

    return $;


}));







/*
 * =============================================================
 * elliptical.download
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('../controller/controller'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['../controller/controller'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory($);
    }
}(this, function ($) {

    $.controller("elliptical.download", {


        /*==========================================
         PRIVATE
         *===========================================*/

        _download:function(url,opts){
            var self=this;
            var delay=opts.delay;
            if(!this._support.device.touch){
                if(typeof opts !=='undefined'){
                    var cssClass=(opts.cssClass===undefined) ? 'info' : opts.cssClass;
                    var msg=(opts.msg===undefined) ? 'Downloading File' : opts.msg;
                    var terminate=opts.terminate;
                    if(terminate===undefined){
                        terminate=true;
                    }

                    this._notify(cssClass,msg,terminate);

                    if(delay===undefined){
                        delay=100;
                    }
                }

                if(delay===undefined){
                    delay=100;
                }

                setTimeout(function(){
                    self.__download(url);
                },delay);

            }else{
                //touch
                window.open(url);
            }

        },

        __download:function(url){
            if($.browser.webkit){
                var link = document.createElement('a');
                link.href = url;

                if (link.download !== undefined) {
                    link.download = url;
                }

                if (document.createEvent) {
                    var event = document.createEvent('MouseEvents');
                    event.initEvent('click', true, true);
                    link.dispatchEvent(event);
                    return true;
                }
                if (url.indexOf('?') === -1) {
                    url += '?download';
                }

                window.open(url, '_self');
            }else{
                if (url.indexOf('?') === -1) {
                    url += '?download';
                }

                window.open(url);
            }


            return true;
        }

    });

    return $;


}));







/*
 * =============================================================
 * elliptical.delegate.request
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * none
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.delegate=root.elliptical.delegate || {};
        root.elliptical.delegate.request=factory();
        root.returnExports =root.elliptical.delegate.request;
    }
}(this, function () {

    return function request(customElements){
        var routeAttr =(customElements) ? 'route' : 'data-route';

        $(document).on('touchclick', 'a', function (event) {

            //element href defined, point to a local resource, and element not attributed for exclusion from routing
            var href = $(this).attr('href'),
                dataRoute = $(this).attr(routeAttr);

            if (!(typeof href === 'undefined' || href==='#') || (typeof dataRoute !=='undefined' && dataRoute==='false')) {
                event.stopPropagation();
                event.preventDefault();

                //create data object
                var data={
                    method:'get',
                    href:href
                };

                /* query attributes and attach to the data objects
                 *
                 */
                $.each(this.attributes, function(i, att){
                    if(!customElements){
                        if(att.name.indexOf('data-')===0){
                            att.name=att.name.replace('data-','');
                            data[att.name.toCamelCase()]=att.value;
                        }
                    }else{
                        data[att.name.toCamelCase()]=att.value;
                    }

                });
                data.route=href;
                //trigger event
                $(document).trigger('elliptical.onDocumentRequest',data);
            }



        });
    };

}));


/*
 * =============================================================
 * elliptical.delegate.submit
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-document
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-document'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-document'], factory);
    } else {
        // Browser globals (root is window)

        root.elliptical.delegate=root.elliptical.delegate || {};
        root.elliptical.delegate.submit=factory();
        root.returnExports =root.elliptical.delegate.submit;
    }
}(this, function () {

    return function submit(customElements,history){
        var formSelector,routeAttr;
        if(customElements){
            formSelector='ui-form';
            routeAttr='route';
        }else{
            formSelector='[data-role="form"]';
            routeAttr='data-route';
        }
        $(document).on('submit', 'form', function (event) {

            var parent=$(this).parent(formSelector);
            var element=(parent[0]) ? parent : $(this);
            var body= $(this).document();
            event.stopPropagation();
            event.preventDefault();



            var dataRoute=element.attr(routeAttr);

            //create data object
            var data={
                route:this.action,
                body:body,
                method:$(this).attr('method')
            };


            /* query attributes and attach to the data objects
             *
             */
            $.each(element[0].attributes, function(i, att){
                if(!customElements){
                    if(att.name.indexOf('data-option-')===0){
                        var opt=att.name.replace('data-','');
                        data[opt.toCamelCase()]=att.value;
                    }
                }else{
                    data[att.name.toCamelCase()]=att.value;
                }
            });

            //trigger event  -->individual form route attribute takes precedence on any global setting
            if(typeof dataRoute !=='undefined' && dataRoute.toLowerCase()==='true'){
                $(document).trigger('elliptical.onDocumentRequest',data);
            }else if(typeof dataRoute !=='undefined' && dataRoute.toLowerCase()==='false'){
                $(document).trigger('elliptical.onDocumentSubmit',data);
            }else if(history){
                $(document).trigger('elliptical.onDocumentRequest',data);
            }else{
                $(document).trigger('elliptical.onDocumentSubmit',data);
            }

        });
    };

}));



/*
 * =============================================================
 * elliptical.request v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-mvc'),require('elliptical-router'),require('elliptical-services'),
            require('elliptical-utils'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-mvc','elliptical-router','elliptical-services','elliptical-utils'], factory);
    } else {
        //browser

        root.elliptical.request=factory(root.elliptical,root.elliptical.Router,root.elliptical.services,root.elliptical.utils);
        root.returnExports = root.elliptical.request;
    }
}(this, function (elliptical,Router,services,utils) {
    var Class=elliptical.Class;
    var Location=Router.Location;
    var _=utils._;
    var url_=Location.url;
    var request = Class.extend({


    },{
        init: function($sessionProvider){

            this.params={};
            this.query={};
            this.body={};
            this.route={};
            this.files={};


            var Session=services.Session;
            var session=new Session($sessionProvider);

            var sess_=session.get() || {};
            var Cookie=services.Cookie;

            Object.defineProperties(this, {
                'path':{
                    get: function(){

                        return Location.path();
                    },
                    configurable:false
                },

                'url':{
                    get: function(){

                        return Location.path();
                    },
                    configurable:false
                },

                'protocol':{
                    get: function(){
                        var protocol=window.location.protocol;
                        protocol=protocol.replace(':','');
                        return protocol;
                    },
                    configurable:false
                },

                'get':{
                    get: function(field){
                        console.log('warning: "get" not implemented on the browser.');
                        return false;
                    },
                    configurable:false
                },

                'accepted':{
                    get: function(){
                        console.log('warning: "accepted" not implemented on the browser.');
                        return false;
                    },
                    configurable:false
                },

                'accepts':{
                    get: function(){
                        console.log('warning: "accepts" not implemented on the browser.');
                        return false;
                    },
                    configurable:false
                },

                'is':{
                    get: function(){
                        console.log('warning: "is" not implemented on the browser.');
                        return false;
                    },
                    configurable:false
                },

                'xhr':{
                    get: function(){
                        return true;
                    },
                    configurable:false
                },

                'acceptsLanguage':{
                    get: function(lang){
                        console.log('warning: "acceptsLanguage" not implemented on the browser.');
                        return false;
                    },
                    configurable:false
                },

                'acceptsCharset':{
                    get: function(charset){
                        console.log('warning: "acceptsLanguage" not implemented on the browser.');
                        return false;
                    },
                    configurable:false
                },

                'acceptsCharsets':{
                    get: function(){

                        return false;
                    },
                    configurable:false
                },

                'acceptedLanguages':{
                    get: function(){

                        return false;
                    },
                    configurable:false
                },

                'originalUrl':{
                    get: function(){

                        return false;
                    },
                    configurable:false
                },

                'subdomains':{
                    get: function(){

                        return false;
                    },
                    configurable:false
                },

                'secure':{
                    get: function(){

                        return false;
                    },
                    configurable:false
                },

                'stale':{
                    get: function(){
                        console.log('warning: "stale" not implemented on the browser.');
                        return false;
                    },
                    configurable:false
                },

                'fresh':{
                    get: function(){
                        console.log('warning: "fresh" not implemented on the browser.');
                        return false;
                    },
                    configurable:false
                },

                'host':{
                    get: function(){
                        return window.location.hostname;

                    },
                    configurable:false
                },

                'ip':{
                    get: function(){


                    },
                    configurable:false
                },

                'ips':{
                    get: function(){
                        console.log('warning: "ips" not implemented on the browser.');
                        return false;
                    },
                    configurable:false
                },

                'cookies':{
                    get: function(key){
                        if(typeof key==='undefined'){
                            return Cookie.get();
                        }else{
                            return Cookie.get(key);
                        }
                    },
                    configurable:false
                },

                'signedCookies':{
                    get: function(){

                        return {};
                    },
                    configurable:false
                },

                'session' :{
                    get:function(){
                        _.extend(sess_,session.get());
                        session.put({session:sess_});
                        return sess_;
                    }
                }
            });
            this._parsedUrl={};
            this._parsedUrl.pathname=Location.path();
            this._parsedUrl.virtualize=function(url){
                var hashTag=window.elliptical.$hashTag;
                var virtualRoot=window.elliptical.$virtualRoot;

                if(hashTag){
                    url=url_.hashTagFormat(url);
                }

                url=url_.pathComponent(url);
                return url;
            };
            this.header=function(key){
                switch(key){
                    case 'Referer':
                        return document.referrer;
                        break;
                }
            };



        }


    });

    return request;


}));


/*
 * =============================================================
 * elliptical.response v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'),require('elliptical-mvc'),require('elliptical-services'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils','elliptical-mvc','elliptical-services'], factory);
    } else {
        //browser
        root.elliptical.response=factory(root.elliptical.utils,root.elliptical,root.elliptical.services);
        root.returnExports = root.elliptical.response;
    }
}(this, function (utils,elliptical,services) {
    var Class=elliptical.Class;
    var Cookie=services.Cookie;
    var response = Class.extend({
        req:{}



    },{
        init: function(req){
            this.req=req;
            this.charset={};
            this.context={};
            this.transition={};
            this.locals={};
            this.status=function(value){

            };
            this.set=function(field,value){

            };
            this.get=function(field){

            };
            this.cookie=function(name,value,options){
                var params={};
                params.key=name;
                params.value=value;
                params.options=options;
                return Cookie.put(params);
            };
            this.clearCookie=function(name,options){
                return Cookie.delete(name);
            };

            this.redirect=function(status,url){
                if(typeof url==='undefined'){
                    url=status;
                }
                url=decodeURIComponent(url);
                window.location = url;

            };
            this.location=function(path){

            };
            this.send=function(status,body){

            };
            this.json=function(status,body){

            };
            this.jsonp=function(status,body){

            };
            this.type=function(type){

            };
            this.format=function(obj){

            };
            this.attachment=function(filename){

            };
            this.sendfile=function(path,options,fn){

            };
            this.download=function(path,options,fn){

            };
            this.links=function(links){

            };

        },

        render:function(template,context,transition,callback){
            // support callback function as second arg or third arg
            if ('function' == typeof context) {
                callback = context, context = {};
            }else if('function' === typeof transition){
                callback=transition, transition=undefined;
            }
            this.app.render(template,context,transition,this.req,callback);
        },

        /**
         * merge a context with req.session.context
         * @param context {Object}
         * @public
         */
        setContext: function(context){
            var _=utils._;
            var req = this.req;
            req.session = req.session || {};
            _.merge(req.session,context);
        },

        /**
         * bind new instance of app.contextHelpers() to response
         * @returns {Object}
         */
        contextHelpers:function(){
            var req=this.req;
            var app=req.app;
            return new app.contextHelpers();
        },

        /**
         * convenience method to execute function or next() based on error object
         * @param err {Object}
         * @param next {Function}
         * @param fn {Function}
         * @public
         */
        dispatch:function(err,next,fn){
            if(!err){
                fn.apply(this,arguments);
            }else{
                next(err);
            }
        }


    });

    return response;




}));


/*
 * =============================================================
 * elliptical.application v0.9
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical.utils,elliptical-mvc,elliptical-event,elliptical-providers,elliptical.request,elliptical.response,
 * elliptical.Router,elliptical.delegates,ellipsis-touch,ellipsis-animation,ellipsis-elements,elliptical.controller,elliptical.form
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'),require('elliptical-mvc'),require('elliptical-event'),require('elliptical-providers'),
            require('./request'),require('./response'),require('elliptical-router'),require('./delegates/index'),require('elliptical-delegate'),
            require('elliptical-platform'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils','elliptical-mvc','elliptical-event','elliptical-providers',
            './request','./response','elliptical-router','./delegates/index','elliptical-delegate',
            'elliptical-platform'], factory);
    } else {
        //browser

        root.elliptical.application=factory(root.elliptical.utils,root.elliptical,root.elliptical.Event,
            root.elliptical.providers,root.elliptical.request,root.elliptical.response,root.elliptical.Router,root.elliptical.delegate);
        root.returnExports = root.elliptical.browser;
    }
}(this, function (utils,elliptical,Event,providers,request,response,Router,delegate,Delegate) {
    var _=utils._,
        Transitions=providers.$transitions,
        url_=Router.Location.url;

    //console.log(Event.Event);
    var _customElements=false;

    return {
        /**
         * app init
         * @internal
         *
         */
        init:function(){
            window.elliptical.$hashTag=false;
            this.history=false;
            this.sessionSync=false;
            this.__observables=[];
            this.async=elliptical.async;
            this.factory=elliptical.factory;
            this.contextSettings();
            this.setEnvironment();
            this.$setDefaultProviders();
            /* define middleware stack */
            this.stack=[];
            /* init locations */
            this.locations=[];
            this.$sessionProvider=providers.session.$storage;
            this.Router=Router;
            this.utils=utils;
            this._defineProps();
            customElements();
            /* define a 'click' delegate */
            var delegate_=new Delegate([{event:'touchclick',delegate:'click'}]);
            delegate_.on();
            /* init the middleware stack */
            initStack(this);

            function initStack(app){
                /* monkey patch support for Function.name(IE) */
                utils.patchFunctionName();

                app.router = function appRouter() {
                    app.next();
                };
                /* use __name property to identify appRouter. Function.name is unreliable under minification */
                app.router.__name='appRouter';
                var route = '/';
                var fn = app.router;
                app.stack.push({route: route, handle: fn});

            }
            function customElements(){
                if($('html').hasClass('customelements')){
                    _customElements=true;
                }
            }
        },

        _defineProps:function(){
            /* getters/setters props */
            this._debug=false;
            this._virtualRoot='/';
            this._hashTag=false;
            this.settings.siteTitle='';
            var app_=this;

            Object.defineProperties(this, {
                'debug': {
                    get:function(){
                        return app_._debug;
                    },

                    set: function (val) {
                        Router.debug=val;
                        app_._debug=val;
                    }
                },

                'hashTag': {
                    get:function(){
                        return app_._hashTag;
                    },

                    set: function (val) {
                        Router.hashTag=val;
                        app_._hashTag=val;
                        window.elliptical.$hashTag=val;
                    }
                },

                'virtualRoot':{
                    get:function(){
                        return app_._virtualRoot;
                    },

                    set: function (val) {
                        Router.virtualRoot=val;
                        app_._virtualRoot=val;
                        app_.context.rootPath=val;
                        window.elliptical.$virtualRoot=val;
                    }
                },

                'siteRootTitle':{
                    get:function(){
                        return app_.settings.siteTitle;
                    },

                    set: function (val) {
                        app_.settings.siteTitle=val;
                    }
                }
            });
        },

        Location:function(params){
            if(params.history){
                this._setLocationHistoryService();
            }

            return Router.Location;
        },

        $setDefaultProviders:function(){
            //set the default Model provider
            var Model=elliptical.Model;
            //pagination provider
            Model.$paginationProvider=providers.$pagination;
            //set the view provider to the template provider
            elliptical.View.$provider=providers.$template;
        },


        /**
         * sets the environment (production or dev)
         * @param env {String}
         * @returns {String}
         * @public
         */
        setEnvironment:function(env){
            if(typeof env !== 'undefined'){
                this.context.ENV=env.toLowerCase();
            }else{
                if(!setFromDocumentQuery(this)){
                    setFromLocationQuery(this);
                }
            }

            function setFromDocumentQuery(c){
                var html=$('html');
                var dataEnv=html.attr('data-environment');
                if(typeof dataEnv !== 'undefined'){
                    c.context.ENV=dataEnv.toLowerCase();
                    return true;
                }else{
                    return false;
                }
            }

            function setFromLocationQuery(c){
                var hostname=document.location.hostname;
                c.context.ENV=(utils.isLocalHost(hostname)) ? 'development' : 'production';
            }
        },

        getPort:function(){
            return undefined;
        },

        /**
         * returns the environment(production or dev)
         * @returns {String}
         * @public
         */
        getEnvironment:function(){
            return this.context.ENV;
        },

        /**
         * configure
         * @param mode {String}
         * @param fn {Function}
         * @public
         */
        configure:function(mode,fn){
            if(typeof mode==='function'){
                fn=mode;
                fn.call(this);
            }else if(typeof mode==='string'){
                if(mode.toLowerCase()==='production' && this.context.ENV==='production'){
                    fn.call(this);
                }else if(mode.toLowerCase()==='development' && this.context.ENV==='development'){
                    fn.call(this);
                }
            }
        },


        /**
         * SERVER ONLY
         * returns a configuration object from config.json
         */
        config:function(){
            //ignore
        },




        /**
         *  **History Enabled Only**
         *
         * maps to Router.get
         * @param route {String}
         * @param callbacks {Function}
         * @public
         */
        get:function(route,callbacks){
            Router.get(route,callbacks);
        },


        /**
         *  **History Enabled Only**
         *
         * maps to Router.post
         * @param route {String}
         * @param callbacks {Function}
         * @public
         */
        post:function(route,callbacks){
            Router.post(route,callbacks);
        },


        /**
         *  **History Enabled Only**
         *
         * maps to Router.put
         * @param route {String}
         * @param callbacks {Function}
         * @public
         */
        put:function(route,callbacks){
            Router.put(route,callbacks);
        },


        /**
         *  **History Enabled Only**
         *
         * maps to Router.delete
         * @param route {String}
         * @param callbacks {Function}
         * @public
         */

        delete:function(route,callbacks){
            Router.delete(route,callbacks);
        },


        /**
         *  **History Enabled Only**
         *
         * @returns {Object}
         * @public
         */
        contextHelpers:function(){
            this.form=function(){
                return {
                    submitLabel:{
                        cssDisplay:'hidden',
                        message:'&nbsp;'
                    }
                }
            };
        },


        /**
         *
         *
         * context settings
         * @returns void
         * @public
         */
        contextSettings: function(){
            /* init app.context merged with template context for every route */
            this.context={};
            this.context.virtualRoot='/';

            /* this is a browser app */
            this.isServer=false;
            this.isBrowser=true;


            /* create an empty config object on app.settings */
            this.settings=this.settings || {};
            this.settings.config={
                cookie:{},
                session:{},
                providers:{}
            };
        },



        /**
         * BROWSER ONLY
         * appends template scripts tag to the document
         * @params rootPath {String}
         */
        templatesScriptLoader: function(rootPath){
            var root=this.virtualRoot;
            if(typeof rootPath !== 'undefined'){
                root=rootPath;
            }
            if(root==='/'){
                root='';
            }
            window.onload=function(){
                var script = document.createElement("script");
                script.src = root + "/scripts/templates.js";
                document.body.appendChild(script);
            };
        },

        /**
         *  **History Enabled Only**
         *
         * add an acl to a root path
         * @param path {String}
         * @param excludeArray {Array}
         * @returns void
         * @public
         */
        location: function(path,excludeArray){
            /* path must have leading slash */
            if (path.substring(0, 1) != '/') {
                path = '/' + path;
            }

            if(typeof excludeArray !== 'object'){
                excludeArray=[];
            }

            var access={
                path:path,
                exclude:excludeArray
            };

            this.locations.push(access);
        },

        /**
         *
         * @param url {String}
         * @returns {String}
         */
        parseRoute:function(url){
            return (this.hashTag) ? url_.hashTagFormat(url) : url;
        },


        /**
         *  **History Enabled Only**
         *
         *  subscriber to the Router dispatch emitted event
         */
        onDispatchRequest:function(){
            var self=this;
            Event.on('elliptical.onRouteDispatch',function(data){
                //dispatch, unless
                if(!(self.__cancelledRoute && self.__route===data.route)){
                    var route=data.route;
                    var handlers=data.handlers;
                    self.dispatch(route,handlers);
                }else{
                    self.__cancelledRoute=false;
                    self.__route=null;
                }

            });

        },

        /**
         *   **History Enabled Only**
         *   One Exception: setting the rootPath
         *
         * adds a function to the middleware stack
         *
         * @param route {String}
         * @param fn {Function}
         * @returns void
         * @public
         */
        use:function (route,fn){
            var stack = this.stack;
            if ('string' != typeof route) {
                fn = route;
                route = '/';
            }

            if (typeof fn != 'function') {
                //set the root path
                this.virtualRoot=route;
                return; //if not a function, exit
            }

            /* check if handler is appRouter */
            if (fn.__name && fn.__name === this.router.__name) {
                /* if so, delete the current app.router position in the stack */
                for (var i = 0; i < stack.length; i++) {
                    var handle = stack[i].handle;
                    if (handle.__name && handle.__name === this.router.__name || handle.length === 0) {
                        stack.splice(i, 1);
                        break;
                    }
                }
            }

            try {
                if (fn.length === 0 && fn.__name===undefined) {
                    return;
                }
            } catch (ex) {

            }
            //push the handler onto the middleware stack
            stack.push({route: route, handle: fn});
        },

        /**
         *  **History Enabled Only**
         *
         *  dispatches the callbacks for a route
         * @param route {String}
         * @param handlers {Array}
         * @returns void
         * @public
         */
        dispatch:function(route, handlers){
            route = _checkRoute(route);
            var stack = this.stack;

            /* build the middleware stack for this route */
            var thisCallStack = [];
            for (var i = 0; i < stack.length; i++) {
                var handle = stack[i].handle;
                if (handle.__name && handle.__name === this.router.__name) {
                    //push the route callbacks onto the stack at this position
                    for (var j = 0; j < handlers.length; j++) {
                        thisCallStack.push(handlers[j]);
                    }
                } else {
                    var rte = stack[i].route;
                    var index = route.toLowerCase().indexOf(rte);
                    if ((index > -1) && (route.length === rte.length || route.substring(index + 1, 0) === '/')) {
                        thisCallStack.push(stack[i].handle);
                    }
                }
            }

            /* instantiate request,response objects */
            _closeObservables(this);
            var req = new request(this.$sessionProvider);
            req.route=route;
            var res = new response(req);
            var app_=this;
            req.app=res.app=app_;
            req.res=res;
            res.req=req;

            /* if history, redefine res.redirect */
            if(this.history){
                res.redirect=function(route){
                    Router.location(route,'get',null);
                };
            }

            /* run the stack of callbacks */
            _callStack(thisCallStack, req, res);


            /**
             *
             * @param route
             * @returns {String}
             * @private
             */
            function _checkRoute(route) {
                if (route.substring(0, 1) != '/') {
                    route = '/' + route;
                }
                return route;
            }


            /**
             * executes the middleware stack
             * @param stack {Array}
             * @param req {Object}
             * @param res {Object}
             * @private
             */
            function _callStack(stack, req, res) {
                var i = 0;

                function next(err) {
                    var fn = stack[i++];

                    if (typeof fn === 'undefined') {
                        return;
                    }

                    if (typeof err != 'undefined') {
                        if (fn.length === 4) {
                            fn(err, req, res, next);
                        } else {
                            next(err);
                        }
                    } else {
                        if (fn.length < 4) {
                            fn(req, res, next);
                        } else {
                            next();
                        }
                    }
                }
                app_.next=next; /* next() is mangled under minification, so preserve the name by attaching it as a prop  */
                next();
            }

            function _closeObservables(app){
                var arr=app.__observables;
                arr.forEach(function(o){
                    o.close();
                })
            }
        },

        closeObservables:function(){
            var arr=this.__observables;
            arr.forEach(function(o){
                o.close();
            })
        },

        /**
         * SERVER ONLY
         * server-side execution of a function
         * @param fn {Function}
         */
        server:function(fn){
            //ignore
        },

        /**
         * BROWSER ONLY
         * client-side execution of a function
         * @param fn {Function}
         */
        browser:function(fn){
            fn.call(this);
        },

        /**
         * SERVER ONLY
         * convenience method to set standard middleware,cookies and session
         * @param params
         * @param $provider
         */
        defaultMiddleware: function (params,$provider) {
            //ignore
        },


        /**
         * SERVER ONLY
         * execute bootstrap functions on server start-up
         * @param stack {Array}(of Functions)
         * @param server {Object}
         * @param fn {Function} Callback
         */
        bootstrap: function (stack, server, fn) {
            //ignore
        },

        /**
         * executes document listeners, if applicable, then executes user provided function
         * @param params {Object}
         * @param fn {Function}
         */
        listen:function(params,fn){
            var self=this;
            var app_=this;
            var env=this.getEnvironment();
            if(typeof fn==='undefined'){
                fn=params;

                //delegate.submit(_customElements,false);
            }else{
                if(params.history===false){
                    /* $.controller will handle form submissions */
                    delegate.submit(_customElements,false);
                }else if(params.history && params.forms==='history'){
                    start(true,this);
                }else if(params.history){
                    start(false,this)
                }
            }
            $(function(){
               setTimeout(function(){
                   fn.call(this);
               },3000);

            });

            var TouchDrawer={};
            TouchDrawer.open=false;

            function start(history,c){
                /* $.controller will handle form submissions */
                delegate.submit(_customElements,history);
                /* router will listen for document requests */
                delegate.request(_customElements);
                /* set widget location provider */
                handleTouchLocation();
                location();
                /* subscribe to the router dispatch event */
                c.onDispatchRequest();
                /* replace Location redirect,reload functions */
                self._setLocationHistoryService();

                if(env==='production'){
                    Router.debug=false;
                }
                Router.start();
            }

            function location(){
                var f=function(url){
                    if(TouchDrawer.open){
                        TouchDrawer.close();
                        setTimeout(function(){
                            Router.location(url,'get',null);
                        },600);
                    }else{
                        Router.location(url,'get',null);
                    }

                };
                $.widget.$providers({location:f});

            }

            function handleTouchLocation(){
                $(window).on('drawer.open',function(event,data){
                    TouchDrawer.open=true;
                    TouchDrawer.close=data.closeEvent;
                });

                $(window).on('drawer.close',function(event,data){
                    TouchDrawer.open=false;
                });

                $(window).on('route.cancellation',function(event,data){
                    app_.__cancelledRoute=true;
                    app_.__route=data;
                });
            }


        },

        _setLocationHistoryService:function(){
            this.history=true;
            Router.Location.redirect=function(route){
                Router.location(route,'get',null);
            };

            Router.Location.reload=function(){
                var route=Location.path();
                Router.location(route,'get');
            };
        },


        /**
         *  **History Enabled Only**
         *
         * define a onBeforeRender hook
         * @param fn {Function}
         * @public
         */
        onBeforeRender:function(fn){
            if(typeof fn==='function'){
                this.viewCallback=fn;
            }
        },

        /**
         *  **History Enabled Only**
         *
         * render view or template
         * @param template {String}
         * @param context {Object}
         * @param transition {String}
         * @param req {Object}
         * @param callback {Function}
         * @public
         */
        render:function(template,context,transition,req,callback){
            var self = this
                , context = context || {}
                , app = this
                , transition = transition || 'none';

            //init transition param
            var transition_=transition;

            //instantiate the view object
            var View=elliptical.View;
            var view = new View();


            try{
                //merge context with app.context
                _.merge(context,app.context);

                //extend context with req.session

                if(req.session){
                    _.defaults(context,req.session);
                }
            }catch(ex){

            }

            context=setPageTitle(context,app);

            //reset root path, if default
            if(context.rootPath && context.rootPath==='/'){
                context.rootPath='';
            }

            //get the selector
            var selector=View.$getSelector();

            //test transition for selector and animation
            if(typeof transition ==='object'){
                if(typeof transition.selector != 'undefined'){
                    selector=transition.selector;
                }
                if(typeof transition.animation != 'undefined'){
                    transition_=transition.animation;
                }

            }
            //render...if onBeforeRender hook is defined, pass to it before rendering the view
            if(typeof app.viewCallback !='undefined'){
                app.viewCallback(req,this,context,function(cxt){

                    _render(cxt);
                });
            }else{
                _render(context);
            }

            //private dry function encapsulation of view render method
            function _render(context_){

                //set browser context
                var clientNamespace=View.clientContextRootNamespace;
                (View.pushContextToClient) ? setClientContext(clientNamespace,context) : setClientContext(clientNamespace,'');

                view.render(template,context_,function(err,out){

                    Transitions.render(selector,out,transition_,function(){
                        if(callback){
                            callback(err,out);
                        }
                    });

                });
            }

            // provide the context to the browser consistent with the server-side rendering method from elliptical.server
            function setClientContext(namespace,context){
                //TODO delete the script object, if exists

                if(window[namespace] && window[namespace].elliptical && window[namespace].elliptical.context) {
                    window[namespace].elliptical.context = context;
                }else if(window[namespace]){
                    window[namespace].elliptical={};
                    window[namespace].elliptical.context=context;
                }else{
                    window[namespace]={};
                    window[namespace].elliptical={};
                    window[namespace].elliptical.context=context;
                }
            }
            function setPageTitle(context,app){
                if(context.PageTitle){
                    if(app.settings.siteTitle){
                        context.PageTitle=app.settings.siteTitle + '-' + context.PageTitle;
                    }

                }else{
                    if(app.settings.siteTitle){
                        context.PageTitle=app.settings.siteTitle;
                    }
                }

                return context;
            }
        }
    }

}));























/*
 * =============================================================
 * elliptical.browser v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * jQuery
 *
 *
 *
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'),require('elliptical-mvc'),require('elliptical-event'),require('elliptical-middleware'),
            require('elliptical-providers'),require('elliptical-services'),require('elliptical-http'),require('elliptical-crypto'),
            require('./application'),require('./response'),require('./request'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils','elliptical-mvc','elliptical-event','elliptical-middleware','elliptical-providers','elliptical-services',
            'elliptical-http','elliptical-crypto','./application','./response','./request'], factory);
    } else {
        //browser
        root.elliptical.browser=factory(root.elliptical.utils,root.elliptical,root.elliptical.Event,root.elliptical.middleware,root.elliptical.providers,
            root.elliptical.services,root.elliptical.http,root.elliptical.crypto,root.elliptical.application,root.elliptical.response,root.elliptical.request);
        root.returnExports = root.elliptical.browser;
    }
}(this, function (utils,elliptical,Event,middleware,providers,services,http,crypto,application,response,request) {




    var _ = utils._;
    elliptical.Event=Event;
    elliptical.application=application;
    elliptical.response=response;
    elliptical.request=request;
    elliptical.http=http;
    elliptical.providers=providers;
    elliptical.services=services;
    elliptical.crypto=crypto;

    /* expose a try...catch  facade */
    elliptical.Try=function(next,fn){
        try{
            fn.apply(this,arguments);
        }catch(ex){
            next(ex);
        }
    };

    window.elliptical=elliptical;
    window.elliptical.$virtualRoot='/';

    /**
     * Expose createApplication().
     */
    var exports_ = createApplication;


    /**
     * @return {Function}
     * @public
     */
    function createApplication() {
        /* create the browser app */
        var app=function(){};

        /* expose application object */
        _.defaults(app, application);

        /* init */
        app.init();

        return app;
    }


    /* expose elliptical */
    _.defaults(exports_, elliptical);

    /* expose elliptical middleware */
    _.defaults(exports_, middleware);

    /* expose elliptical services */
    _.defaults(exports_, services);

    return exports_;

}));













