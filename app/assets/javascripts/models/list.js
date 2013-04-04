RealtimeTodos.List = DS.Firebase.LiveModel.extend({
  title: DS.attr('string'),
  items: DS.hasMany("RealtimeTodos.Item", {live: true}),

  users: DS.hasMany("RealtimeTodos.User", {live: true})
});
