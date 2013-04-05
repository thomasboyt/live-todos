RealtimeTodos.ListController = Ember.ObjectController.extend({
  addUser: function() {
    var list = this.get("content");

    var usernameUnescaped = prompt("ID");
    var username = usernameUnescaped.replace(/\./g, ",")

    var user = RealtimeTodos.UserReference.find(username);

    var didLoad = function() {
      list.get("users").pushObject(user);

      // this gets around a pretty gross issue: using the ember data adapter,
      // there's no way to reference and interact with relationships without getting
      // them, whether they are relational or embedded. thus, i use a version
      // of the model that doesn't have a lists prop, which works fine until
      // i need to actually need to add to the lists, in which case, well, this.
      RealtimeTodos.store.adapter.fb.child("users").child(user.get("id"))
        .child("lists").child(list.get("id")).set(true);
      RealtimeTodos.store.commit();
    };

    if (user.get("isLoaded")) didLoad();
    else user.on("didLoad", didLoad);
  }
});
