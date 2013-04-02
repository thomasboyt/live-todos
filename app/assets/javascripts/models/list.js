RealtimeTodos.List = DS.Firebase.LiveModel.extend({
  title: DS.attr('string'),
  items: DS.hasMany("RealtimeTodos.Item"),

  users: DS.hasMany("RealtimeTodos.User")
});
