///app
elliptical.module=(function(app){

    app=elliptical();
    var container=app.container;
    var View = elliptical.View;
    View.$transitionProvider = elliptical.$Transitions;
    var $Template = elliptical.$Template;
    $Template.setRoot('/demo');
    var Service=elliptical.Service;
    app.hashTag=true;

    app.configure(function () {
        //app.router
        app.use(app.router);

        //error
        app.use(elliptical.httpError());

        //http 404
        app.use(elliptical.http404());

        //register service types
        var User=Service.extend({},{});
        container.registerType('User',User);
        container.registerType('Try', elliptical.Try);
        container.registerType('Location',elliptical.Location);

    });

    //history
    app.listen(true);

    return app;
})(elliptical.module);

///injected provider for User Service
elliptical.module=(function(app){
    var container=app.container;
    var GenericRepository=elliptical.GenericRepository;

    function mockModel(MAX){
        var _model=[];
        for(var i=0;i<MAX;i++){

            var user={
                id:faker.random.uuid(),
                avatar:faker.image.avatar(),
                firstName:faker.name.firstName(),
                lastName:faker.name.lastName(),
                email:faker.internet.email(),
                street:faker.address.streetAddress(),
                city:faker.address.city(),
                state:faker.address.stateAbbr(),
                zipCode:faker.address.zipCode()

            };
            _model.push(user);
        }

        return _model;
    }

    var model=mockModel(20);
    var repo=new GenericRepository(model);

    repo.query=function(filter,asEnumerable){
        filter=filter.toLowerCase();
        var result=this.Enumerable().Where(function(x){
            return ((x.firstName.toLowerCase().indexOf(filter)==0) || (x.lastName.toLowerCase().indexOf(filter)==0));
        });
        return (asEnumerable) ? result : result.ToArray();
    };

    container.mapType('User', repo);

    return app;
})(elliptical.module);

///Controllers
//Home
elliptical.module=(function(app){
    var controller=new elliptical.Controller(app,'home');

    controller('/@action', {
        Index:function(req,res,next){
            res.render(res.context);
        }
    });

    return app;
})(elliptical.module);

//User
elliptical.module=(function(app){
    var container=app.container;
    var controller=new elliptical.Controller(app,'user');
    var User=container.getType('User');
    var Try=container.getType('Try');

    controller('/@action/:id', {
        List:function(req,res,next){
            User.get({},function(err,data){
                res.context.users=data;
                res.render(res.context);
            });
        },

        Detail:function(req,res,next){
            var id=req.params.id;
            User.get({id:id},function(err,data){
                res.context.user=data;
                res.render(res.context);
            });
            res.render(res.context,{transition:'fadeInUp'});
        },

        Post:{
            List:function(req,res,next){
                var query=req.body.name;
                if(query==='') {
                    res.redirect('/user/list/1');
                    return;
                }
                var user=new User();
                Try(next,function(){
                    user
                        .filter(query)
                        .get(function(err,data){
                            res.dispatch(err,next,function(){
                                res.context.users=data;
                                res.context.search={};
                                res.context.search.pattern=query;
                                res.render(res.context);
                            });
                        });
                });
            }
        }
    });

    return app;
})(elliptical.module);

//bindings
elliptical.module=(function(app){
    var container=app.container;

    elliptical.binding('home',function(node){
        var $node=$(node);
        var Location=container.getType('Location');
        this.event($node,this.click,onClick);

        function onClick(){
            Location.href='/';
        }
    });

    return app;
})(elliptical.module);

elliptical.module=(function(app){

    elliptical.binding('list',function(node){
       $('#search').val('');
    });

    return app;
})(elliptical.module);
