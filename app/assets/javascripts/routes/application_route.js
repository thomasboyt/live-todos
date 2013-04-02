RealtimeTodos.IndexRoute = Ember.Route.extend({
  renderTemplate: function(controller, model) {
    
    var authController = this.controllerFor("auth");
    authController.set("fb", RealtimeTodos.store.adapter.fb);
    
    authController.auth(function(error, user) {
      if (error) {
        // an error occurred while attempting login
        console.log(error);
      } 
      else if (user) {
        // user authenticated with Firebase
        console.log('User ID: ' + user.id + ', Provider: ' + user.provider);

        var user = RealtimeTodos.User.find(user.id);

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
