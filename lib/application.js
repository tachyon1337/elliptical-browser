(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('async'), require('elliptical-utils'), require('elliptical-soa'), require('elliptical-event'), require('elliptical-location'),
            require('elliptical-view'), require('elliptical-container'), require('./request'), require('./response'), require('./delegate.request'), require('./delegate.submit'), require('./function.patch'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['async', 'elliptical-utils', 'elliptical-soa', 'elliptical-event', 'elliptical-location',
            'elliptical-view', 'elliptical-container', './request', './response', 'elliptical-router', './delegate.request', './delegate.submit', './function.patch'], factory);
    } else {
        //browser

        root.elliptical.application = factory(root.async, root.elliptical.utils, root.elliptical, root.elliptical.Event, root.elliptical,
            root.elliptical.View, root.elliptical.Container, root.elliptical.Request, root.elliptical.Response, root.elliptical.delegate.request, root.elliptical.delegate.submit);
        root.returnExports = root.elliptical.browser;
    }
}(this, function (async, utils, soa, Event, location, View, Container, Request, Response, request, submit) {

    var Router = location.Router;
    var Location=location.Location;
    var url_ = location.url;
    var network=utils.network;
    var ROUTE_DISPATCH='OnRouteDispatch';
    var DOCUMENT_HISTORY='OnDocumentHistory';
    var APP_ROUTER='appRouter';
    var PRODUCTION='production';
    var DEVELOPMENT='development';
    var DATA_ENVIRONMENT='data-environment';
    var ROOT='/';
    var GET='get';
    var EMPTY='';
    var HTML='html';

    console.log(Event);

    return {
        /**
         * app init
         * @internal
         *
         */
        init: function () {
            window.elliptical.$hashTag = false;
            this.history = false;
            this.async = async;
            this.factory = soa.factory;
            this.contextSettings();
            this.setEnvironment();
            this.$setDefaultProviders();
            this.cache = {};
            /* define middleware stack */
            this.stack = [];
            /* init locations */
            this.locations = [];
            this.Router = Router;
            this.utils = utils;
            this._defineProps();
            this.isHistory = false;
            this.container=Container;

            var initStack = function (app) {

                app.router = function appRouter() {
                    app.next();
                };
                /* use __name property to identify appRouter. Function.name is unreliable under minification */
                app.router.__name = APP_ROUTER;
                var route = ROOT;
                var fn = app.router;
                app.stack.push({route: route, handle: fn});
            };

            /* init the middleware stack */
            initStack(this);

        },

        /**
         *
         * @private
         */
        _defineProps: function () {
            /* getters/setters props */
            this._debug = false;
            this._virtualRoot = ROOT;
            this._hashTag = false;
            this.settings.siteTitle = EMPTY;
            var app_ = this;

            Object.defineProperties(this, {
                'debug': {
                    get: function () {
                        return app_._debug;
                    },

                    set: function (val) {
                        Router.debug = val;
                        app_._debug = val;
                    }
                },

                'hashTag': {
                    get: function () {
                        return app_._hashTag;
                    },

                    set: function (val) {
                        Router.hashTag = val;
                        app_._hashTag = val;
                        window.elliptical.$hashTag = val;
                    }
                },

                'virtualRoot': {
                    get: function () {
                        return app_._virtualRoot;
                    },

                    set: function (val) {
                        Router.virtualRoot = val;
                        app_._virtualRoot = val;
                        app_.context.rootPath = val;
                        window.elliptical.$virtualRoot = val;
                    }
                },

                'siteRootTitle': {
                    get: function () {
                        return app_.settings.siteTitle;
                    },

                    set: function (val) {
                        app_.settings.siteTitle = val;
                    }
                }
            });
        },

        /**
         * @public
         */
        $setDefaultProviders: function () {
            //set the default Model provider
            var Service = soa.Service;
            //pagination provider
            Service.$paginationProvider = soa.$Pagination;
            //set the view provider to the template provider
            View.$provider = soa.$Template;
        },


        /**
         * sets the environment (production or dev)
         * @param {string} env
         * @returns {string}
         * @public
         */
        setEnvironment: function (env) {
            if (typeof env !== 'undefined') {
                this.context.ENV = env.toLowerCase();
            } else {
                if (!setFromDocumentQuery(this)) {
                    setFromLocationQuery(this);
                }
            }

            function setFromDocumentQuery(c) {
                var html = $(HTML);
                var dataEnv = html.attr(DATA_ENVIRONMENT);
                if (typeof dataEnv !== 'undefined') {
                    c.context.ENV = dataEnv.toLowerCase();
                    return true;
                } else {
                    return false;
                }
            }

            function setFromLocationQuery(c) {
                var hostname = document.location.hostname;
                c.context.ENV = (network.isLocalHost(hostname)) ? DEVELOPMENT : PRODUCTION;
            }
        },

        /**
         *
         * @returns {undefined}
         */
        getPort: function () {
            return undefined;
        },


        /**
         * returns the environment(production or dev)
         * @returns {string}
         * @public
         */
        getEnvironment: function () {
            return this.context.ENV;
        },

        /**
         * configure
         * @param {string} mode
         * @param {function} fn
         * @public
         */
        configure: function (mode, fn) {
            if (typeof mode === 'function') {
                fn = mode;
                fn.call(this);
            } else if (typeof mode === 'string') {
                if (mode.toLowerCase() === PRODUCTION && this.context.ENV === PRODUCTION) fn.call(this);
                else if (mode.toLowerCase() === DEVELOPMENT && this.context.ENV === DEVELOPMENT) fn.call(this);
            }
        },


        /**
         * SERVER ONLY
         * returns a configuration object from config.json
         */
        config: function () {
            //ignore
        },


        /**
         *  **History Enabled Only**
         *
         * maps to Router.get
         * @param {string} route
         * @param {function} callbacks
         * @public
         */
        get: function (route, callbacks) {
            Router.get(route, callbacks);
        },


        /**
         *  **History Enabled Only**
         *
         * maps to Router.post
         * @param {string} route
         * @param {function} callbacks
         * @public
         */
        post: function (route, callbacks) {
            Router.post(route, callbacks);
        },


        /**
         *  **History Enabled Only**
         *
         * maps to Router.put
         * @param {string} route
         * @param {function} callbacks
         * @public
         */
        put: function (route, callbacks) {
            Router.put(route, callbacks);
        },


        /**
         *  **History Enabled Only**
         *
         * maps to Router.delete
         * @param {string} route
         * @param {function} callbacks
         * @public
         */

        delete: function (route, callbacks) {
            Router.delete(route, callbacks);
        },


        /**
         *  **History Enabled Only**
         *
         * @returns {object}
         * @public
         */
        contextHelpers: function () {
            this.form = function () {
                return {
                    submitLabel: {
                        cssDisplay: 'hidden',
                        message: '&nbsp;'
                    }
                }
            };
        },


        /**
         *
         * context settings
         * @public
         */
        contextSettings: function () {
            /* init app.context merged with template context for every route */
            this.context = {};
            this.context.virtualRoot = ROOT;

            /* this is a browser app */
            this.isServer = false;
            this.isBrowser = true;


            /* create an empty config object on app.settings */
            this.settings = this.settings || {};
            this.settings.config = {
                cookie: {},
                session: {},
                providers: {}
            };
        },


        /**
         *  **History Enabled Only**
         *
         * add an acl to a root path
         * @param {string} path
         * @param {array} excludeArray
         * @public
         */
        location: function (path, excludeArray) {
            /* path must have leading slash */
            if (path.substring(0, 1) != ROOT) {
                path = ROOT + path;
            }

            if (typeof excludeArray !== 'object') {
                excludeArray = [];
            }

            var access = {
                path: path,
                exclude: excludeArray
            };

            this.locations.push(access);
        },

        /**
         *
         * @param {string} url
         * @returns {string}
         * @public
         */
        parseRoute: function (url) {
            return (this.hashTag) ? url_.hashTagFormat(url) : url;
        },


        /**
         *  **History Enabled Only**
         *  subscriber to the Router dispatch emitted event
         *  @public
         */
        onDispatchRequest: function () {
            var self = this;
            Event.on(ROUTE_DISPATCH, function (data) {
                //dispatch
                if (!(self.__cancelledRoute && self.__route === data.route)) {
                    var route = data.route;
                    var handlers = data.handlers;
                    self.dispatch(route, handlers);
                } else {
                    self.__cancelledRoute = false;
                    self.__route = null;
                }
            });

        },

        /**
         *   **History Enabled Only**
         *   One Exception: setting the rootPath
         *
         *   adds a function to the middleware stack
         *
         * @param {string} route
         * @param {function} fn
         * @public
         */
        use: function (route, fn) {
            var stack = this.stack;
            if ('string' != typeof route) {
                fn = route;
                route = '/';
            }

            if (typeof fn != 'function') {
                //set the root path
                this.virtualRoot = route;
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
                if (fn.length === 0 && fn.__name === undefined) {
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
         * @param {string} route
         * @param {array} handlers
         * @public
         */
        dispatch: function (route, handlers) {
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
                    if ((index > -1) && (route.length === rte.length || route.substring(index + 1, 0) === ROOT)) {
                        thisCallStack.push(stack[i].handle);
                    }
                }
            }

            /* instantiate request,response objects */
            var req = new Request();
            req.route = route;
            var res = new Response(req);
            var app_ = this;
            req.app = res.app = app_;
            req.res = res;
            res.req = req;

            /* if history, redefine res.redirect */
            if (this.history) {
                res.redirect = function (route) {
                    Router.location(route, GET, null);
                };
            }

            /* run the stack of callbacks */
            _callStack(thisCallStack, req, res);


            /**
             *
             * @param {string} route
             * @returns {string}
             * @private
             */
            function _checkRoute(route) {
                if (route.substring(0, 1) != ROOT) {
                    route = ROOT + route;
                }
                return route;
            }


            /**
             * executes the middleware stack
             * @param {array} stack
             * @param {object} req
             * @param {object} res
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
                            req = _applyFnProps(req, fn);
                            res = _applyFnProps(res, fn);
                            fn(err, req, res, next);
                        } else {
                            next(err);
                        }
                    } else {
                        if (fn.length < 4) {
                            req = _applyFnProps(req, fn);
                            res = _applyFnProps(res, fn);
                            fn(req, res, next);
                        } else {
                            next();
                        }
                    }
                }

                app_.next = next;
                /* next() is mangled under minification, so preserve the name by attaching it as a prop  */
                next();
            }


            function _applyFnProps(obj, f) {
                obj.__name = f.__name;
                obj.__action = f.__action;
                return obj;
            }
        },

        /**
         * SERVER ONLY
         * server-side execution of a function
         * @param {function} fn
         * @public
         */
        server: function (fn) {
            //ignore
        },

        /**
         * BROWSER ONLY
         * client-side execution of a function
         * @param {function} fn
         * @public
         */
        browser: function (fn) {
            fn.call(this);
        },

        /**
         * SERVER ONLY
         * convenience method to set standard middleware,cookies and session
         * @param {object} params
         * @param {object} $provider
         * @public
         */
        defaultMiddleware: function (params, $provider) {
            //ignore
        },


        /**
         * SERVER ONLY
         * execute bootstrap functions on server start-up
         * @param {array} stack
         * @param {object} server
         * @param {function} fn
         * @public
         */
        bootstrap: function (stack, server, fn) {
            //ignore
        },

        /**
         * executes document listeners, if applicable, then executes user provided function
         * @param {boolean} history
         * @param {function} fn
         * @public
         */
        listen: function (history, fn) {
            var app_ = this;
            var func = null;
            var length = arguments.length;

            //suport 0-2 params
            if (length === 0) /* form actions */ submit();
            if(length===1){
                if(typeof history==='function') {
                    func=history;
                    submit();
                }else this._start(history);
            }
            if(length===2){
                func = fn;
                this._start(history);
            }

            if (func) {
                $(function () {
                    setTimeout(function () {
                        func.call(app_);
                    }, CALLBACK_EXECUTION_DELAY);
                });
            }

        },

        /**
         * @public
         */
        start:function(){
            this._start(true);
        },

        /**
         *
         * @param {boolean} history
         * @private
         */
        _start:function(history){
            //if false is passed as the param, oblige the request, start submit only, then exit
            if(!history){
                submit();
                return;
            }

            ////----start history----------------------------
            var app_ = this;
            var env = this.getEnvironment();

            //set the private flag
            this.isHistory = true;

            //form actions
            submit();

            //http get requests
            request();

            /* subscribe to the router dispatch event */
            this.onDispatchRequest();

            /* overrride Location.redirect,Location.reload */
            this._setLocationHistoryService();

            ///start Router
            if (env === PRODUCTION) Router.debug = false;
            Router.start();

            //setup convenient callback for history that allows for DI
            app_.history = function (fn) {
                document.addEventListener(DOCUMENT_HISTORY, function (event) {
                    var data = event.detail;
                    fn.call(app_, data, app_.container);
                });
            }
        },


        /**
         *
         * @private
         */
        _setLocationHistoryService: function () {
            this.history = true;
            Location.redirect = function (route) {
                Router.location(route, GET, null);
            };

            Location.reload = function () {
                var route = Location.href;
                Router.location(route, GET);
            };
        },


        /**
         *  **History Enabled Only**
         *
         * define a onBeforeRender hook
         * @param fn {Function}
         * @public
         */
        onBeforeRender: function (fn) {
            if (typeof fn === 'function') this.viewCallback = fn;
        },

        /**
         *  **History Enabled Only**
         *
         * render view
         * @param {object} context
         * @param {string|object} template
         * @param {object} params
         * @param {object} req
         * @param {function} callback
         * @public
         */
        render: function (context, template, params, req, callback) {
            context = context || {};
            var app = this;
            var transition = null, selector = null, append = false, delay = null;
            if (params && params !== undefined) {
                transition = params.transition;
                selector = params.selector;
                append = params.append;
                delay = params.delay;
            }

            //instantiate the view object
            var view = new View();

            try {
                //merge context with app.context
                Object.assign(context, app.context);

                //extend context with req.session
                if (req.session) Object.assign(context, req.session);

            } catch (ex) {

            }

            context = setPageTitle(context, app);

            //reset root path, if default
            if (context.rootPath && context.rootPath === ROOT) context.rootPath = '';

            //if no selector passes, get if from the View constructor
            if (!selector || selector === undefined) selector = View.selector;

            var intDelay = (delay && delay !== undefined) ? parseInt(delay) : 0;

            //render...if onBeforeRender hook is defined, pass to it before rendering the view
            if (typeof app.viewCallback != 'undefined') {
                app.viewCallback(req, this, context, function (data) {
                    setTimeout(function () {
                        _render(data);
                    }, intDelay)
                });
            } else {
                setTimeout(function () {
                    _render(context);
                }, intDelay)
            }

            //private dry function encapsulation of view render method
            function _render(cxt) {
                //set browser context
                var clientNamespace = View.clientContextRootNamespace;
                (View.pushContextToClient) ? setClientContext(clientNamespace, cxt) : setClientContext(clientNamespace, '');
                var element_ = $(selector);
                view.render(template, cxt, function (err, out) {
                    if (append) {
                        var doc = $.parseHTML(out, document, true);
                        element_.append(doc);
                        if (callback && callback instanceof Function) callback(null, out);
                    } else if (transition && transition !== undefined) view.transition(selector, out, params, callback);
                    else {
                        element_.html(out);
                        if (callback && callback instanceof Function) callback.call(this);
                    }
                });
            }

            // provide the context to the browser consistent with the server-side rendering method from elliptical.server
            function setClientContext(namespace, context) {
                //TODO delete the script object, if exists

                if (window[namespace] && window[namespace].elliptical && window[namespace].elliptical.context) {
                    window[namespace].elliptical.context = context;
                } else if (window[namespace]) {
                    window[namespace].elliptical = {};
                    window[namespace].elliptical.context = context;
                } else {
                    window[namespace] = {};
                    window[namespace].elliptical = {};
                    window[namespace].elliptical.context = context;
                }
            }

            function setPageTitle(context, app) {
                if (context.PageTitle) {
                    if (app.settings.siteTitle) context.PageTitle = app.settings.siteTitle + '-' + context.PageTitle;
                } else {
                    if (app.settings.siteTitle) context.PageTitle = app.settings.siteTitle;
                }
                return context;
            }
        }
    }

}));
