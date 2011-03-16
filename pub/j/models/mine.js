App.Models.Mine = Backbone.Model.extend({
  //Mine Possible States:
  //  0: Not Stepped On Yet
  //  1: Stepped On and Safe
  //  2: Stepped On and Exploded
  //  9: Greyed Out from nearby expansion or explosion
  idAttribute: '_id',
  sync:  function(method, model, cbs) {
      switch(method) {
        case 'read':
          break;
        case 'create':
          break;
        case 'update':
          console.log('Syncing Mine, meth: '+method);
          App.remote.saveMine(model.attributes);
          cbs.success(this);
          break;
        case 'delete':
          cbs.success(this);
          break;
      }
  }
});
