RealtimeTodos.ListsController = Ember.ArrayController.extend({
  itemControler: 'items',
  addNew: function() {
    var title = "List title"; 

    var list = RealtimeTodos.List.createRecord({
      title: title,
      user: this.get("user")
    });

    // hasMany <-> hasMany requires manual additions
    this.get("user.lists").addObject(list);

    RealtimeTodos.store.commit();
  }
});
