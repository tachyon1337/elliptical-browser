/*
 * =============================================================
 * elliptical.delegate  v0.9.1
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
        module.exports = factory(require('./request'),require('./submit'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['./request','./submit'], factory);
    } else {
        // Browser globals (root is window)
        root.elliptical.delegate=root.elliptical.delegate || {};
        root.elliptical.delegate=factory(root.elliptical.delegate.request,root.elliptical.delegate.submit);
        root.returnExports = root.elliptical.delegate;
    }
}(this, function (request,submit) {

    return {
        request:request,
        submit:submit
    };
}));
