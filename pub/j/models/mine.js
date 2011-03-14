App.Models.Mine = Backbone.Model.extend({
  //Mine Possible States:
  //  0: Not Stepped On Yet
  //  1: Stepped On and Safe
  //  2: Stepped On and Exploded
  //  9: Greyed Out from nearby expansion or explosion
  idAttribute: '_id',
  sync:  function(method, model, success, error) {
    console.log('Syncing Mine, meth: '+method);
      switch(method) {
        case 'read':
          break;
        case 'create':
          break;
        case 'update':
          App.remote.saveMine(model.attributes);
          break;
        case 'delete':
          break;
      }
  }
});
