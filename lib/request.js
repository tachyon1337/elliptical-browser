
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'),require('elliptical-class'),require('elliptical-location'),require('elliptical-soa'),
            require('elliptical-utils'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils','elliptical-class','elliptical-location','elliptical-soa'], factory);
    } else {
        //browser

        root.elliptical.Request=factory(root.elliptical.utils,root.elliptical.Class,root.elliptical,root.elliptical);
        root.returnExports = root.elliptical.Request;
    }
}(this, function (utils,Class,location,soa) {
    var Location=location.Location;
    var url=location.url;
    var $Cookie=soa.$Cookie;
    var $Session=soa.$Session;

    var Request;
    Request = Class.extend({}, {
        /**
         * @constructs
         */
        init: function () {

            this.params = {};
            this.query = {};
            this.body = {};
            this.route = {};
            this.files = {};


            Object.defineProperties(this, {
                'path': {
                    get: function () {

                        return Location.path;
                    },
                    configurable: false
                },

                'url': {
                    get: function () {

                        return Location.href;
                    },
                    configurable: false
                },

                'protocol': {
                    get: function () {
                        var protocol = Location.protocol;
                        protocol = protocol.replace(':', '');
                        return protocol;
                    },
                    configurable: false
                },

                'get': {
                    get: function (field) {
                        console.log('warning: "get" not implemented on the browser.');
                        return false;
                    },
                    configurable: false
                },

                'accepted': {
                    get: function () {
                        console.log('warning: "accepted" not implemented on the browser.');
                        return false;
                    },
                    configurable: false
                },

                'accepts': {
                    get: function () {
                        console.log('warning: "accepts" not implemented on the browser.');
                        return false;
                    },
                    configurable: false
                },

                'is': {
                    get: function () {
                        console.log('warning: "is" not implemented on the browser.');
                        return false;
                    },
                    configurable: false
                },

                'xhr': {
                    get: function () {
                        return true;
                    },
                    configurable: false
                },

                'acceptsLanguage': {
                    get: function (lang) {
                        console.log('warning: "acceptsLanguage" not implemented on the browser.');
                        return false;
                    },
                    configurable: false
                },

                'acceptsCharset': {
                    get: function (charset) {
                        console.log('warning: "acceptsLanguage" not implemented on the browser.');
                        return false;
                    },
                    configurable: false
                },

                'acceptsCharsets': {
                    get: function () {

                        return false;
                    },
                    configurable: false
                },

                'acceptedLanguages': {
                    get: function () {

                        return false;
                    },
                    configurable: false
                },

                'originalUrl': {
                    get: function () {

                        return false;
                    },
                    configurable: false
                },

                'subdomains': {
                    get: function () {

                        return false;
                    },
                    configurable: false
                },

                'secure': {
                    get: function () {

                        return false;
                    },
                    configurable: false
                },

                'stale': {
                    get: function () {
                        console.log('warning: "stale" not implemented on the browser.');
                        return false;
                    },
                    configurable: false
                },

                'fresh': {
                    get: function () {
                        console.log('warning: "fresh" not implemented on the browser.');
                        return false;
                    },
                    configurable: false
                },

                'host': {
                    get: function () {
                        return window.location.hostname;

                    },
                    configurable: false
                },

                'ip': {
                    get: function () {


                    },
                    configurable: false
                },

                'ips': {
                    get: function () {
                        console.log('warning: "ips" not implemented on the browser.');
                        return false;
                    },
                    configurable: false
                },

                'signedCookies': {
                    get: function () {

                        return {};
                    },
                    configurable: false
                }
            });
            this.session = {};
            for (var i = 0; i < $Session.count; i++) {
                var k = $Session.key(i);
                this.session[k] = $Session.get(k);
            }
            this.cookies = {};
            for (var j = 0 ; i < $Cookie.count; j++) {
                var k1=$Cookie.key(j);
                this.cookies[k1] = $Cookie.get(k1);
            }
            this._parsedUrl = {};
            this._parsedUrl.pathname = Location.path;
            this._parsedUrl.virtualize = function (u) {
                var hashTag = window.elliptical.$hashTag;
                if (hashTag) u = url.hashTagFormat(url);
                u = url.pathComponent(u);
                return u;
            };
            this.header = function (key) {
                switch (key) {
                    case 'Referer':
                        return document.referrer;
                        break;
                }
            };
        }
    });

    return Request;

}));

