RealtimeTodos.ItemsController = Ember.ArrayController.extend({
  addNewItem: function() {
    var item = RealtimeTodos.Item.createRecord({
      text: "Test item",
      list: this.get("content.owner")
    });

    RealtimeTodos.store.commit();
  },

  clearDoneItems: function() {
    var doneItems = this.get("content").filter(function (item) { return item.get("done") === true; });
    for (var i=doneItems.get("length")-1; i>=0; i--) {
      doneItems.objectAt(i).deleteRecord();
    };

    RealtimeTodos.store.commit();
  }
});
