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

  rootForType: function(type) {
    var map = this.mappings.get(type)
    if (map && map.resourceName) return map.resourceName;

    var typeString = type.toString();

    Ember.assert("Your model must not be anonymous. It was " + type, typeString.charAt(0) !== '(');

    // use the last part of the name as the URL
    var parts = typeString.split(".");
    var name = parts[parts.length - 1];
    return name.replace(/([A-Z])/g, '_$1').toLowerCase().slice(1);
  },

  extractHasMany: function(parent, data, key) {
    var items = data[key];
    var ids = [];
    for (var key in items) {
      ids.push(key);
    }
    return ids;
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

    // find belongsTo assocations
    var key;
    Ember.get(this.constructor, 'relationshipsByName')
      .forEach(function(rkey, relation) {
        if (relation.kind == "belongsTo" && relation.parentType == this.constructor) {
          if (serializer.embeddedType(relation.type, name))
            key = rkey;
        }
      }.bind(this));

    var parentRef;
    if (key) {
      if (this.get(key)) {
        parentRef = this.get(key).getRef();
      }
      else {
        // *probably* means will be deleted
        // watch out for anything bad that could trigger this.
        return this.get("_ref");
      }
    }
    else {
      parentRef = adapter.fb;
    }

    var ref;
    if (!this.get("id")) {
      ref = parentRef.child(name).push(); // generates new id 
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
  },

  _initLiveBindings: function() {
    if (!this.get("_liveBindingsWereEnabled")) {    // sanity check
      this.set("_liveBindingsWereEnabled", true);
      var ref = this.getRef();

      // get all possible attributes that aren't relationships for check
      var attrs = Ember.get(this.constructor, "attributes");

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

      this.get("constructor.relationshipsByName").forEach(function(name, relationship) {
        if (relationship.kind == "hasMany" && relationship.options.live === true) {
          console.log("adding live relation for " + relationship.key);
          var embedded = this.store.adapter.serializer.mappingOption(this.constructor, relationship.key, "embedded");

          // embedded relationship
          if (embedded == "always") {
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

              var rec = this.get(relationship.key).find(function(item) {return item.get("id") == id});
              
              if (!rec) return;
              
              rec.deleteRecord();

              // fake sync
              rec.get('stateManager').send('willCommit');
              rec.get('stateManager').send('didCommit');
            }.bind(this));
          }

          else {
            ref.child(relationship.key).on("child_added", function(snapshot) {
              var id = snapshot.name();

              var ids = this._data.hasMany[relationship.key];
              var state = this.get("stateManager.currentState.name");

              // below: the magic of ember data
              if (state === "inFlight") {return;}   // if inFlight, id will not be pushed to hasMany yet.
              if (ids == undefined)     {return;}   // this one is pretty baffling.
              if (ids.contains(id))     {return;}   // this one is obvious, and in a perfect world would be the only one needed.

              var mdl = relationship.type.find(id);
              
              this.get(relationship.key).pushObject(mdl);
            }.bind(this));

            ref.child(relationship.key).on("child_removed", function(snapshot) {
              var id = snapshot.name();

              var rec = this.get(relationship.key).find(function(item) {return item.get("id") == id;});
              if (!rec) return;

              rec.deleteRecord();
              rec.get('stateManager').send('willCommit');
              rec.get('stateManager').send('didCommit');
            }.bind(this));
          }
        }
      }.bind(this))
    }
  },

});
