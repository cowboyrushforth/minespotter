App.Collections.MinePool = Backbone.Collection.extend({
  model: App.Models.Mine,
  collectionName: 'mines',
  sync:  function(method, model, success, error) {
    console.log('Syncing MinePool, meth: '+method);
      switch(method) {
        case 'read':
          App.remote.readMines(model.x, model.y, App.screenWidth, App.screenHeight, model.collectionName, function(res) {
            //console.log(res);
            //var old = App.minePool.get(new_mine._id);
            //old.set(new_mine);
            //model.add(res);
            //model.add(res);
            _.each(res, function(m) {
                var old = App.minePool.get(m._id);
                if(old) {
                  old.set(m);
                } else {
                  model.add([m]);
                }
            });
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
