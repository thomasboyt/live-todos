A clone of [Trello](https://trello.com) to illustrate the power of my [Ember Data Firebase Adapter](https://github.com/thomasboyt/ember-firebase-adapter).

### Plan

This is a standard to-do list example, but ups the ante with multi-user editing on various todo lists. Each individual list (not a board like Trello) can be shared between various users.

### Back-End Info

There are three "resources" in play here:

* Users are stored at `/users/<user email>`. The lists property contains the IDs of the list resources a user has access to. This is an example of a *relational* hasMany association.
* Lists are stored at `/lists/<id>`. Each list property contains a title for the list, the users who have access to it in an array (another *relational* hasMany association), and...
* List items, which are stored at `/lists/<id>/items/<id>`. These items are *embedded* in the `/lists/<id>/` resource when retrieved.

### Live Updating

Here's the eventual goal of live updating everything:

* Users collaborating on a list will see the *items* in the list be updated automatically. Right now, they can already see updates to existing items.
* A user can add another user to their list, and the added user will see the list show up in their lists view.

These will rely on new additions to the Ember Firebase adapter (in the Model layer) that will allow relationships to be listened to for updates.

### Authentication/Security

Lists are restricted to editing only by their creators and the users who they have shared their list with. This is enforced by *authentication* using Mozilla Persona (through Firebase's Simple Login API) and Firebase *security rules* (viewable in `db/firebase_rules.json`).
