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
