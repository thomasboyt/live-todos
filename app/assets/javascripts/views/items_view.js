RealtimeTodos.ItemsView = Ember.View.extend({
});

RealtimeTodos.TitleView = Ember.TextField.extend({
  focusOut: function() {
    RealtimeTodos.store.commit();
  },
  keyDown: function(e) {
    // focus out on enter
    if (e.keyCode == 13) {
      this.$().blur();
    }
  }
});
