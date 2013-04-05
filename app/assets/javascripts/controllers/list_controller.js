RealtimeTodos.ListController = Ember.ObjectController.extend({
  addUser: function() {
    var list = this.get("content");

    var usernameUnescaped = prompt("ID");
    var username = usernameUnescaped.replace(/\./g, ",")

    var user = RealtimeTodos.UserReference.find(username);

    var didLoad = function() {
      list.get("users").pushObject(user);

      // see: https://github.com/thomasboyt/live-todos/wiki/Postmortem-on-Associations-Problem
      RealtimeTodos.store.adapter.fb.child("users").child(user.get("id"))
        .child("lists").child(list.get("id")).set(true);
      RealtimeTodos.store.commit();
    };

    if (user.get("isLoaded")) didLoad();
    else user.on("didLoad", didLoad);
  }
});
