RealtimeTodos.ItemsController = Ember.ArrayController.extend({
  addNewItem: function() {
    console.log(this);
    var item = RealtimeTodos.Item.createRecord({
      text: "Test item",
      list: this.get("content.owner")
    });

    RealtimeTodos.store.commit();
  },
});
