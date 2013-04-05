RealtimeTodos.User = DS.Firebase.LiveModel.extend({
  email: DS.attr('string'),
  isOnline: DS.attr('boolean'),

  lists: DS.hasMany("RealtimeTodos.List", {live: true})
});

RealtimeTodos.UserReference = DS.Firebase.LiveModel.extend({
  email: DS.attr('string'),
  isOnline: DS.attr('boolean'),
});
