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

        var User=Service.extend({},{});
        container.registerType('User',User);

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
    container.mapType('User', repo);

    return app;
})(elliptical.module);

///Controllers
//Home
elliptical.module=(function(app){
    var Controller=new elliptical.Controller(app,'home');

    Controller('/@action', {
        Index:function(req,res,next){
            res.render(res.context);
        }
    });

    return app;
})(elliptical.module);

//User
elliptical.module=(function(app){
    var container=app.container;
    var Controller=new elliptical.Controller(app,'user');
    var User=container.getType('User');

    Controller('/@action/:id', {
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
            res.render(res.context);
        }

    });

    return app;
})(elliptical.module);
