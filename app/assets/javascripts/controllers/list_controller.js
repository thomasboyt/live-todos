RealtimeTodos.ListController = Ember.ObjectController.extend({
  addUser: function() {
    var list = this.get("content");

    var usernameUnescaped = prompt("ID");
    var username = usernameUnescaped.replace(/\./g, ",")

    var user = RealtimeTodos.User.find(username);

    // goofy pattern below.
    
    var didLoad = function() {
      list.get("users").pushObject(user);
      RealtimeTodos.store.commit();
    };
    if (user.get("isLoaded")) didLoad();
    else user.on("didLoad", didLoad);
  }
});
