
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
