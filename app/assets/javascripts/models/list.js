RealtimeTodos.List = DS.Firebase.LiveModel.extend({
  title: DS.attr('string'),
  items: DS.hasMany("RealtimeTodos.Item", {embedded: 'always'}),

  users: DS.hasMany("RealtimeTodos.User")
});
