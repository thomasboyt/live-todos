RealtimeTodos.ItemsController = Ember.ArrayController.extend({
  addNewItem: function() {
    var item = RealtimeTodos.Item.createRecord({
      text: "Test item",
      list: this.get("content.owner")
    });

    RealtimeTodos.store.commit();
  },
});
