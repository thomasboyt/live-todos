RealtimeTodos.ItemView = Ember.View.extend({
  click: function() {
    var title = prompt("New text");
    this.get("content").set("text", title);
    RealtimeTodos.store.commit();
  }
});

