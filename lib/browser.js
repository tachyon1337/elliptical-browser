
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'),require('elliptical-soa'),require('elliptical-location'),require('elliptical-event'),require('elliptical-middleware'),
            require('elliptical-http'),require('elliptical-crypto'), require('./application'),require('./response'),require('./request'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils','elliptical-soa','elliptical-location','elliptical-event','elliptical-middleware', 'elliptical-http','elliptical-crypto','./application',
            './response','./request'], factory);
    } else {
        //browser
        root.elliptical.browser=factory(root.elliptical.utils,root.elliptical,root.elliptical.Location,root.elliptical.Event,root.elliptical.middleware,root.elliptical.http,
            root.elliptical.crypto,root.elliptical.application,root.elliptical.Response,root.elliptical.Request);
        root.returnExports = root.elliptical.browser;
    }
}(this, function (utils,soa,Location,Event,middleware,http,crypto,application,Response,Request) {



    /* expose a try...catch  facade */
    soa.Try=function(next,fn){
        try{
            fn.apply(this,arguments);
        }catch(ex){
            next(ex);
        }
    };


    /**
     * Expose createApplication().
     */
    var exports_ = createApplication;

    exports_.Event=Event;
    exports_.application=application;
    exports_.Response=Response;
    exports_.Request=Request;
    exports_.http=http;
    exports_.crypto = crypto;
    exports_.Location=location.Location;


    /**
     * @return {Function}
     * @public
     */
    function createApplication() {
        /* create the browser app */
        var app=function(){};

        /* expose application object */
        Object.assign(app, application);

        /* init */
        app.init();

        return app;
    }

    /* expose elliptical middleware */
    Object.assign(soa, middleware);

    /* expose elliptical */
    Object.assign(exports_, soa);

    window.elliptical=exports_;
    window.elliptical.$virtualRoot='/';

    return exports_;

}));
