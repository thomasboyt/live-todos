RealtimeTodos.IndexRoute = Ember.Route.extend({
  renderTemplate: function(controller, model) {
    
    var authController = this.controllerFor("auth");
    authController.set("fb", RealtimeTodos.store.adapter.fb);
    
    authController.auth(function(error, userAuth) {
      if (error) {
        // an error occurred while attempting login
        console.log(error);
      } 
      else if (userAuth) {
        // user authenticated with Firebase
        console.log('User ID: ' + userAuth.id + ', Provider: ' + userAuth.provider);

        var user = RealtimeTodos.User.find(userAuth.id);
        user.on("didLoad", function() {
          if (!user.get("email")) {
            user.set("email", userAuth.email);
            RealtimeTodos.store.commit();
          };
          
          var connectedRef = RealtimeTodos.store.adapter.fb.child(".info").child("connected");
          connectedRef.on("value", function(snap) {
            if (snap.val() === true) {
              user.set("isOnline", true);
              user.getRef().child("isOnline").onDisconnect().set(false);
              RealtimeTodos.store.commit();
            }
          }.bind(this));
        });

        var listsController = this.controllerFor("lists");
        listsController.set("user", user);
        listsController.set("content", user.get("lists"));
        
        this.render('lists', {
          controller: listsController
        });
      } 
      else {
        // user is logged out
        console.log("user is logged out");

        this.render('login', {
          controller: authController
        });
      }
    }.bind(this));
  }
});
