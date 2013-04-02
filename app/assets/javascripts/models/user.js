RealtimeTodos.User = DS.Firebase.LiveModel.extend({
  lists: DS.hasMany("RealtimeTodos.List")
});
