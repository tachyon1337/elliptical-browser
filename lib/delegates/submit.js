/*
 * =============================================================
 * elliptical.delegate.submit
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * Dependencies:
 * elliptical-document
 *
 */

//umd pattern

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
        root.elliptical.delegate.submit=factory();
        root.returnExports =root.elliptical.delegate.submit;
    }
}(this, function () {

    return function submit(customElements,history){
        var formSelector,routeAttr;
        if(customElements){
            formSelector='ui-form';
            routeAttr='route';
        }else{
            formSelector='[data-role="form"]';
            routeAttr='data-route';
        }
        $(document).on('submit', 'form', function (event) {

            var parent=$(this).parent(formSelector);
            var element=(parent[0]) ? parent : $(this);
            var body= $(this).document();
            event.stopPropagation();
            event.preventDefault();



            var dataRoute=element.attr(routeAttr);

            //create data object
            var data={
                route:this.action,
                body:body,
                method:$(this).attr('method')
            };


            /* query attributes and attach to the data objects
             *
             */
            $.each(element[0].attributes, function(i, att){
                if(!customElements){
                    if(att.name.indexOf('data-option-')===0){
                        var opt=att.name.replace('data-','');
                        data[opt.toCamelCase()]=att.value;
                    }
                }else{
                    data[att.name.toCamelCase()]=att.value;
                }
            });

            //trigger event  -->individual form route attribute takes precedence on any global setting
            if(typeof dataRoute !=='undefined' && dataRoute.toLowerCase()==='true'){
                $(document).trigger('elliptical.onDocumentRequest',data);
            }else if(typeof dataRoute !=='undefined' && dataRoute.toLowerCase()==='false'){
                $(document).trigger('elliptical.onDocumentSubmit',data);
            }else if(history){
                $(document).trigger('elliptical.onDocumentRequest',data);
            }else{
                $(document).trigger('elliptical.onDocumentSubmit',data);
            }

        });
    };

}));


