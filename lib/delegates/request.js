/*
 * =============================================================
 * elliptical.delegate.request
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * none
 *
 */

//umd pattern

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
        root.elliptical.delegate.request=factory();
        root.returnExports =root.elliptical.delegate.request;
    }
}(this, function () {

    return function request(customElements){
        var routeAttr =(customElements) ? 'route' : 'data-route';

        $(document).on('touchclick', 'a', function (event) {

            //element href defined, point to a local resource, and element not attributed for exclusion from routing
            var href = $(this).attr('href'),
                dataRoute = $(this).attr(routeAttr);

            if (!(typeof href === 'undefined' || href==='#') || (typeof dataRoute !=='undefined' && dataRoute==='false')) {
                event.stopPropagation();
                event.preventDefault();

                //create data object
                var data={
                    method:'get',
                    href:href
                };

                /* query attributes and attach to the data objects
                 *
                 */
                $.each(this.attributes, function(i, att){
                    if(!customElements){
                        if(att.name.indexOf('data-')===0){
                            att.name=att.name.replace('data-','');
                            data[att.name.toCamelCase()]=att.value;
                        }
                    }else{
                        data[att.name.toCamelCase()]=att.value;
                    }

                });
                data.route=href;
                //trigger event
                $(document).trigger('elliptical.onDocumentRequest',data);
            }



        });
    };

}));

