// deps: global Ember, global DS, global Firebase
//

DS.Firebase = {};

DS.Firebase.Serializer = DS.JSONSerializer.extend({

  // thanks @rpflorence's localStorage adapter
  extract: function(loader, json, type, record) {
    this._super(loader, this.rootJSON(json, type), type, record);
  },
  
  extractMany: function(loader, json, type, records) {
    this._super(loader, this.rootJSON(json, type, 'pluralize'), type, records);    
  },

  rootJSON: function(json, type, pluralize) {
    var root = this.rootForType(type);
    if (pluralize == 'pluralize') { root = this.pluralize(root); }
    var rootedJSON = {};
    rootedJSON[root] = json;
    return rootedJSON;
  },

  extractHasMany: function(parent, data, key) {
    var items = data[key];
    if (items) {
      console.log(Object.keys(items));
      return Object.keys(items);
    }
    else
      return [];
  },

  extractEmbeddedHasMany: function(loader, relationship, array, parent, prematerialized) { 
    var objs = [];

    // find belongsTo key that matches the relationship
    var match;
    Ember.get(relationship.type, "relationshipsByName").forEach(function(name, relation) {
      if (relation.kind == "belongsTo" && relation.type == relationship.parentType)
        match = name;
    });

    // turn {id: resource} -> [resource] with id property
    for (var key in array) {
     var obj = Ember.copy(array[key]);
     obj.id = key;
     obj[match] = parent.id;
     objs.push(obj);
    };
    this._super(loader, relationship, objs, parent, prematerialized);
  },

  // slightly modified from json serializer
  addHasMany: function(hash, record, key, relationship) {
    var type = record.constructor;
    var name = relationship.key;
    var manyArray, embeddedType;

    // Get the DS.ManyArray for the relationship off the record
    manyArray = record.get(name);

    embeddedType = this.embeddedType(type, name);

    // if not embedded, just add array of ids
    if (embeddedType !== 'always') { 
      record.getRef().child(key).once("value", function(snapshot) {
        var ids = [];
        snapshot.forEach(function (childSnap) {
          ids.push(childSnap.name());
        });

        manyArray.forEach(function (childRecord) {
          childRecord.getRef(record.get("id"));     // hacky - forces id creation
          if (!ids.contains(childRecord.get("id")))
            record.getRef().child(key).child(childRecord.get("id")).set(true);
        });
      });

      return; 
    }

    // Build up the array of serialized records
    var serializedHasMany = {};
    manyArray.forEach(function (childRecord) {
      childRecord.getRef(record.get("id"));     // hacky - forces id creation
      serializedHasMany[childRecord.get("id")] = childRecord.serialize();
    }, this);

    // Set the appropriate property of the serialized JSON to the
    // array of serialized embedded records
    hash[key] = serializedHasMany;
  },
});

DS.Firebase.Adapter = DS.Adapter.extend({
  serializer: DS.Firebase.Serializer.create(),

  localLock: false,

  fb: undefined,

  init: function() {
    if (!this.dbName && !this.url) {
      throw new Error("You must specify a dbName representing the subdomain of your Firebase.");
    }

    if (!this.url) this.url = "https://" + this.dbName + ".firebaseio.com";
    this.fb = new Firebase(this.url);

    this._super();
  },

  createRecords: function(store, type, records) {
    records.forEach(function(record) {
      var ref = record.getRef();
      var data = record.serialize();

      // goofy. causes child_added callback to ignore local additions, 
      // preventing duplicate items
      this.localLock = true;
      ref.update(data);
      this.localLock = false;
    }.bind(this));
    store.didSaveRecords(records);
  },

  updateRecords: function(store, type, records) {
    records.forEach(function(record) {
      var ref = record.getRef();
      var data = record.serialize();
      
      ref.update(data);
    }.bind(this));
    store.didSaveRecords(records);
  },

  deleteRecords: function(store, type, records) {
    console.log("deletin'");
    records.forEach(function(record) {
      var ref = record.getRef();
      ref.remove();
    });
    store.didSaveRecords(records);
  },

  find: function(store, type, id) {
    var ref = this._getRefForType(type).child(id);
    ref.once("value", function(snapshot) {
      // TODO: ew, silent failure.
      var data = Ember.copy(snapshot.val()) || {};
      data.id = id;
      
      this.didFindRecord(store, type, data, id);
    }.bind(this));
  },

  findAll: function(store, type) {
    var ref = this._getRefForType(type);
    
    ref.once("value", function(snapshot) {
      var results = [];
      snapshot.forEach(function(child) {
        var data = child.val();
        data.id = child.name();
        results.push(Ember.copy(data));
      }.bind(this));
      
      this.didFindAll(store, type, results);

      ref.on("child_added", function(child) {
        if (!this.localLock) {
          var data = child.val()
          data.id = child.name();
          this.didFindMany(store, type, [data]);
        }
      }.bind(this));

    }.bind(this));
  },

  // some day this might do some sort of deeper find
  _getRefForType: function(type) {
    var name = this.serializer.pluralize(this.serializer.rootForType(type));

    return this.fb.child(name);
  }

});

DS.Firebase.LiveModel = DS.Model.extend({
  getRef: function(collection) {
    var adapter = this.store.adapter;
    var serializer = adapter.serializer;

    var name = serializer.pluralize(serializer.rootForType(this.constructor));

    var parentRef;

    // find belongsTo assocations
    var key;
    Ember.get(this.constructor, 'relationshipsByName')
      .forEach(function(rkey, relation) {
        if (relation.kind == "belongsTo" && relation.parentType == this.constructor) {
          if (serializer.embeddedType(relation.type, name))
            key = rkey;
        }
      }.bind(this));

    if (key) {
      if (this.get(key)) {
        parentRef = this.get(key).getRef();
      }
      else {
        // probably will be deleted
        return this.get("_ref");
      }
    }
    else {
      parentRef = adapter.fb;
    }

    var ref;
    if (!this.get("id")) {
      ref = parentRef.child(name).push();
      this.set("id", ref.name());
    }
    else {
      ref = parentRef.child(name).child(this.get("id"));
    }

    this.set("_ref", ref);
    return ref;
  },

  init: function() {
    this._super();

    this.on("didLoad", this._initLiveBindings.bind(this));
    this.on("didCreate", this._initLiveBindings.bind(this));
    //this.on("didDelete", this._killLiveBindings.bind(this));
  },

  _initLiveBindings: function() {
    if (!this.get("_liveBindingsEnabled")) {
      this.set("_liveBindingsEnabled", true);
      var ref = this.getRef();

      var attrs = Ember.get(this.constructor, "attributes");

      // hasOwnProperty on attributes checks that the property is an attribute and not a
      // child object (or array of ids of child objects)
      ref.on("child_added", function(prop) {
        if (attrs.get(prop.name()) && (this.get(prop.name()) === null)) {
          console.log("child added " + prop.name());
          this.set(prop.name(), prop.val());
        }
      }.bind(this));

      ref.on("child_changed", function(prop) {
        if (attrs.get(prop.name()) && prop.val() !== this.get(prop.name())) {
          console.log("child changed " + prop.name());
          this.set(prop.name(), prop.val());
        }

      }.bind(this));

      var resourceName = this.store.adapter.serializer.rootForType(this.constructor);

      this.get("constructor.relationshipsByName").forEach(function(name, relationship) {
        if (relationship.kind == "hasMany") {

          // embedded relationship
          if (relationship.options.embedded == "always") {
            ref.child(relationship.key).on("child_added", function(snapshot) {
              var id = snapshot.name();

              // todo: likely very inefficient. may be a better way to get
              // list of ids - see how it's done when loading records
              var ids = this.get(relationship.key).map(function(item) {return item.get("id")});
              if (ids.contains(id)) { return; }

              var data = snapshot.val();
              var id = snapshot.name();
              data.id = id
              
              // find belongsTo key that matches the relationship
              var match;
              Ember.get(relationship.type, "relationshipsByName").forEach(function(name, relation) {
                if (relation.kind == "belongsTo" && relation.type == relationship.parentType)
                  match = name;
              });

              if(match) data[match] = this;

              // TODO: this kind of sucks. it's a workaround for didFindRecord
              // not playing nice with associations, for whatever reason.
              var rec = relationship.type.createRecord(data);

              // keeps the record from being attempted to be saved back to
              // the server
              rec.get('stateManager').send('willCommit');
              rec.get('stateManager').send('didCommit');

              rec._initLiveBindings();
            }.bind(this));

            ref.child(relationship.key).on("child_removed", function(snapshot) {
              var id = snapshot.name();

              var ids = this.get(relationship.key).map(function(item) {return item.get("id")});
              if (!(ids.contains(id))) { return; }

              var rec = this.get(relationship.key).find(function(item) {return item.get("id") == id});
              
              rec.deleteRecord();

              // fake sync
              rec.get('stateManager').send('willCommit');
              rec.get('stateManager').send('didCommit');
            }.bind(this));
          }

          else {
            ref.child(relationship.key).on("child_added", function(snapshot) {
              var id = snapshot.name();

              var ids = this.get(relationship.key).map(function(item) {return item.get("id")});
              if (ids.contains(id)) { return; }

              var mdl = relationship.type.find(id);
              
              this.get(relationship.key).pushObject(mdl);
            }.bind(this));
          }
        }
      }.bind(this))
    }
  },

});
