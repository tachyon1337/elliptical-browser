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













