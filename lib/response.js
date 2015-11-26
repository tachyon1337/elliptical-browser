
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'),require('elliptical-class'),require('elliptical-location'),require('elliptical-soa'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils','elliptical-class','elliptical-location','elliptical-soa'], factory);
    } else {
        //browser
        root.elliptical.Response=factory(root.elliptical.utils,root.elliptical.Class,root.elliptical,root.elliptical);
        root.returnExports = root.elliptical.Response;
    }
}(this, function (utils,Class,location,soa) {
    var Location=location.Location;
    var $Cookie=soa.$Cookie;
    var $Session=soa.$Session;

    var Response;
    Response = Class.extend({
        req: {}


    }, {
        /**
         * @constructs
         * @param req
         */
        init: function (req) {
            this.req = req;
            this.charset = {};
            this.context = {};
            this.transition = {};
            this.locals = {};
            this.status = function (value) {

            };
            this.set = function (field, value) {

            };
            this.get = function (field) {

            };
            this.cookie = function (name, value, options) {
                $Cookie.set(name,value,options);
            };
            this.clearCookie = function (name, options) {
                $Cookie.delete(name);
            };

            this.redirect = function (status, url) {
                if (typeof url === 'undefined') {
                    url = status;
                }
                url = decodeURIComponent(url);
                Location.redirect(url);

            };

            this.session=function(name,value){
                $Session.set(name,value);
            };

            this.location = function (path) {

            };
            this.send = function (status, body) {

            };
            this.json = function (status, body) {

            };
            this.jsonp = function (status, body) {

            };
            this.type = function (type) {

            };
            this.format = function (obj) {

            };
            this.attachment = function (filename) {

            };
            this.sendfile = function (path, options, fn) {

            };
            this.download = function (path, options, fn) {

            };
            this.links = function (links) {

            };

        },

        /**
         @param {object} context
         @param {string} template
         @param {object} params - props: append,selector,transition
         @param {function} callback
         */
        render: function (context,template,params, callback) {
            // support 0-4 args
            var req = this.req;
            var template_ = undefined, context_ = undefined, transition_ = undefined,params_=null, callback_ = null;
            var length = arguments.length;

            ///length==0
            if(length===0){
                template_ = {name: req.__name, view: req.__action};
                context_={};
            }

            ///length==1
            if (length === 1) if (typeof context === 'string') {
                template_=context;
                context_ = {};
            } else if (context instanceof Function) {
                callback_ = context;
                template_ = {name: req.__name, view: req.__action};
                context_ = {};
            } else {
                template_ = { name: req.__name, view: req.__action };
                context_ = context;
            }

            ///length==2
            if(length==2){
                if(typeof context==='object'){
                    context_=context;
                    if(typeof template==='string' || template===null) template_=template;
                    else if(template instanceof Function){
                        callback_=template;
                        template_ = { name: req.__name, view: req.__action };
                    }else{
                        params_=template;
                        template_ = { name: req.__name, view: req.__action };
                    }
                } else {
                    context_ = {};
                    template_=context;
                    if(template instanceof Function) callback_=template;
                    else params_=template;
                }
            }

            ///length==3
            if (length == 3) {
                if (typeof context === 'object') {
                    context_ = context;
                    if (typeof template === 'string' || template==null) {
                        template_ = template;
                        if (params instanceof Function) callback_ = params;
                        else params_ = params;
                    } else {
                        template_ = { name: req.__name, view: req.__action };
                        params_ = template;
                        callback_ = params;
                    }
                } else {
                    context_ = {};
                    template_ = context;
                    callback_ = params;
                    params_ = template;
                }
            }

            ///length==4
            if(length===4){
                template_=template;
                context_ = context;
                params_ = params;
                callback_ = callback;
            }

            if(length > 4)throw "View render does not support more than 4 parameters";

            ///if template has been set to null, reset it to the default controller name/action
            if (!template_) template_ = { name: req.__name, view: req.__action };
            else if(typeof template_==='string'){
                var namespaceView=template_.split('.');
                if(namespaceView.length ===2) template_ = { name: namespaceView[0], view: namespaceView[1] };
                else if(namespaceView.length===1) template_ = { name: req.__name, view: template_ };
            }
            if (!callback_ instanceof Function) callback_ = null;
            this.app.render(context_, template_,params_, req, callback_);
        },

        /**
         * merge a context with req.session.context
         * @param {object} context
         * @public
         */
        setContext: function (context) {
            var _ = utils._;
            var req = this.req;
            req.session = req.session || {};
            Object.assign(req.session, context);
        },

        /**
         * bind new instance of app.contextHelpers() to response
         * @returns {object}
         * @public
         */
        contextHelpers: function () {
            var req = this.req;
            var app = req.app;
            return new app.contextHelpers();
        },

        /**
         *
         * @returns {{submitLabel: {css: string, cssDisplay: string, message: string}}}
         * @public
         */
        formContext: function () {
            return {
                submitLabel: {
                    css: "",
                    cssDisplay: "",
                    message: "&nbsp;"
                }
            }
        },

        /**
         * convenience method to execute function or next() based on error object
         * @param {object} err
         * @param {function} next
         * @param {function} fn
         * @public
         */
        dispatch: function (err, next, fn) {
            if (!err) fn.apply(this, arguments);
            else next(err);
        }


    });

    return Response;

}));
