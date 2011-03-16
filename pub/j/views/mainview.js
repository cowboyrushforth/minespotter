App.Views.MainView = Backbone.View.extend({
  x: null,
  y: null,
  el: null,
  initialize: function() {
    _.bindAll(this, 'render', 'refreshBoard');

    //setting this here because
    //up above is too soon. (race)
    this.el = $('#board');

    //hrm. not sure how to fix this when
    //inside of initialize.
    var self = this;

    // fire up minePool
    App.minePool = new App.Collections.MinePool();

    // for each mine when added to minePool, render it
    App.minePool.bind('add', function(mine) {
      $('#loading').hide();
      var mineView = new App.Views.MineView({model: mine});
      $(self.el).append(mineView.render().el);
    });

    $(this.el).draggable({
      scroll: false,
      zIndex: 18,
      stop: function(ev,ui) {
          var x = parseInt((parseInt($(ui.helper).css('left'),10)/App.pieceSize),10)*-1;
          var y = parseInt((parseInt($(ui.helper).css('top'),10)/App.pieceSize),10)*-1;
          App.mainController.displaySpecificLocation(x,y);
      }
    });

    //every 4 seconds clean stale pieces.
    //seems to work better than after refreshBoard, 
    //but should probably put it in there once we optimize
    //(ie - not overcall during a resize)
    setInterval(function() {
     var min_x = App.minePool.x-2;
     var max_x = parseInt(App.screenWidth/App.pieceSize,10) + (App.minePool.x+2);
     var min_y = App.minePool.y-2;
     var max_y = parseInt(App.screenHeight/App.pieceSize,10) + (App.minePool.y + 2);
     App.minePool.each(function(m) {
      if((m.get('loc')[1] < min_x) || (m.get('loc')[1] > max_x) || (m.get('loc')[0] > max_y) || (m.get('loc')[0] < min_y)) {
        m.view.remove();
        m.destroy();
      }
    });
    },4000);
  },
  refreshBoard: function() {

    App.minePool.x = parseInt(this.x,10);
    App.minePool.y = parseInt(this.y,10);

    if(App.sidebarView !== null) {
        App.sidebarView.updateCoordIndicator(this.x, this.y);
    }

    //move board to appropriate place
    $('#board').css('left', ((this.x*App.pieceSize)*-1));
    $('#board').css('top', ((this.y*App.pieceSize)*-1));

    App.minePool.fetch();

    //todo - dynamically calculate which fields we are subscribed too.
    //unsubscribe from ones we dont want
    if(_.indexOf(App.subscribedFields, 1) == -1) {
      App.remote.subscribeField(1, App.mineHandler);
      App.subscribedFields.push(1);
    }

  },
  resize: function() {
    if(App.sidebarView !== null) {
      App.sidebarView.resize();   
    } 
  } 
});
