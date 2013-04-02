RealtimeTodos.AuthController = Ember.Controller.extend({
  auth: function(cb) {
    this.set("authClient", new FirebaseAuthClient(this.get("fb"), cb));
  },

  login: function() {
    this.get("authClient").login("persona");
  }
});
