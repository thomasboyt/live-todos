RealtimeTodos.Item = DS.Firebase.LiveModel.extend({
  text: DS.attr('string'),
  done: DS.attr('boolean'),

  isEditing: false,

  list: DS.belongsTo("RealtimeTodos.List", {live: true})
});
