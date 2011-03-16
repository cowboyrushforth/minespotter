App.Collections.MinePool = Backbone.Collection.extend({
  model: App.Models.Mine,
  collectionName: 'mines',
  sync:  function(method, model, cbs) {
    console.log('Syncing MinePool, meth: '+method);
    switch(method) {
      case 'read':
        // get remote mines
        App.remote.readMines(model.x, model.y, App.screenWidth, App.screenHeight, function(res) {
        // for each mine, see if its something the minePool already
        // has or not. update/add appropriately
        if(res.length === undefined || res.length === 0) {
          cbs.error();
        } else {
          _.each(res, function(m) {
            var old = App.minePool.get(m._id);
            if(old) {
              old.set(m);
            } else {
              model.add([m]);
            }
          });
        }
      });
      break;
      case 'create':
        break;
      case 'update':
        break;
      case 'delete':
        break;
    }
  }
});
