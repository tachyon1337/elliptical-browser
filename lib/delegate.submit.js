
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
        root.elliptical.delegate.submit=factory($);
        root.returnExports =root.elliptical.delegate.submit;
    }
}(this, function ($) {

    var EVENT='submit';
    var SELECTOR='form[role="form"]';
    var REQUEST_EVENT='OnDocumentRequest';
    var SUBMIT_EVENT='OnDocumentSubmit';
    var DOCUMENT=$(document);

    return function submit(history){
        if(history===undefined) history=false;

        //form must have role attribute to be captured
        DOCUMENT.on(EVENT, SELECTOR, onSubmit);

        function onSubmit(event) {
            event.stopPropagation();
            event.preventDefault();
            var body = $(event.currentTarget).document();

            //create data object
            var data = {
                route: this.action,
                body: body,
                method: $(this).attr('method'),
                element: this
            };

            if (history) DOCUMENT.trigger(REQUEST_EVENT, data);
            else DOCUMENT.trigger(SUBMIT_EVENT, data);
        }

    };

}));
