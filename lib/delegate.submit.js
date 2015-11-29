
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
    var RUNNING=false;

    return function submit(){
        if(RUNNING) return;
        else RUNNING=true;

        //form must have role attribute to be captured
        DOCUMENT.on(EVENT, SELECTOR, onSubmit);

        function onSubmit(event) {
            event.stopPropagation();
            event.preventDefault();
            var target=$(event.currentTarget);
            var body = target.document(); //parse form to a javascript POJO

            //create data object
            var data = {
                route: this.action,
                body: body,
                method: $(this).attr('method'),
                element: this
            };

            DOCUMENT.trigger(REQUEST_EVENT, data);
            DOCUMENT.trigger(SUBMIT_EVENT, data);
        }

    };

}));
