DS.Firebase.Adapter.map("RealtimeTodos.List", {
  items: {embedded: 'always'},
});
DS.Firebase.Adapter.map("RealtimeTodos.UserReference", {
  resourceName: "user"
});

RealtimeTodos.store = DS.Store.create({
  revision: 12,
  adapter: DS.Firebase.Adapter.create({
    dbName: "ember-todos"
  })
});
