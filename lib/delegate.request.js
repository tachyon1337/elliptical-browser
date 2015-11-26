
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
        root.elliptical.delegate.request =factory();
        root.returnExports =root.elliptical.delegate.request;
    }
}(this, function () {

    //on touch devices, listen for both touchstart and click events for reliable capture
    var EVENT = ('ontouchend' in document) ? 'touchstart tap click' : 'click';
    var REQUEST_EVENT='OnDocumentRequest';
    //data-route attr excluded from delegated capture
    var SELECTOR='a:not([data-route])';
    var DOCUMENT=$(document);

    return function request(){

        DOCUMENT.on(EVENT, SELECTOR, onRequest);

        function onRequest(event) {
            var target = $(event.currentTarget);
            var href = target.attr('href');
            if (href !== undefined && href !== '#') {
                var propagation = target.attr('data-propagation');
                if (propagation) event.stopPropagation();
                event.preventDefault();

                //create data object
                var data = {
                    method: 'get',
                    href: href
                };

                /* query attributes and attach to the data objects
                 *
                 */
                $.each(this.attributes, function (i, att) {
                    data[att.name.toCamelCase()] = att.value;
                });
                data.route = href;
                //trigger event
                DOCUMENT.trigger(REQUEST_EVENT, data);
            }
        }

    };

}));