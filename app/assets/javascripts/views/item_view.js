RealtimeTodos.ItemView = Ember.View.extend({
  templateName: "item",
  click: function() {
    if (this.get("content.isEditing") == false) {
      this.set("content.isEditing", true);
    }
  },
});

RealtimeTodos.ItemStaticView = Ember.View.extend({
  templateName: "item_static",
  tagName: "span",
  click: function() {
  }
});

RealtimeTodos.ItemEditingView = Ember.TextField.extend({
  focusOut: function() {
    this.set("content.isEditing", false);
    RealtimeTodos.store.commit();
  }
});

RealtimeTodos.ItemCheckboxView = Ember.Checkbox.extend({
  change: function() {
    Ember.run.sync();   // change fires before the model has updated
    RealtimeTodos.store.commit();
  },
  click: function(e) {
    e.stopPropagation();
  }
});
