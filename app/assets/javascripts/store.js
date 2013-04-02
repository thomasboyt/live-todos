DS.Firebase.Adapter.map("RealtimeTodos.List", {
  items: {embedded: 'always'}
});

RealtimeTodos.store = DS.Store.create({
  revision: 12,
  adapter: DS.Firebase.Adapter.create({
    dbName: "ember-todos"
  })
});
