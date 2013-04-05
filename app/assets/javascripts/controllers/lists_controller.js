RealtimeTodos.ListsController = Ember.ArrayController.extend({
  itemControler: 'items',
  addNew: function() {
    var title = "List title"; 
    
    var userReference = RealtimeTodos.UserReference.find(this.get("user.id"));
    userReference.set("id", this.get("user.id"));
    
    var list = RealtimeTodos.List.createRecord({
      title: title,
    });
    list.get("users").pushObject(userReference);

    // hasMany <-> hasMany requires manual additions
    this.get("user.lists").addObject(list);

    RealtimeTodos.store.commit();
  }
});
