RealtimeTodos.Item = DS.Firebase.LiveModel.extend({
  text: DS.attr('string'),
  done: DS.attr('boolean'),

  list: DS.belongsTo("RealtimeTodos.List")
});
