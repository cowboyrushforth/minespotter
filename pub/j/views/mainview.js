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
  },
  refreshBoard: function() {

    //todo - cycle through minePool pieces and see if they should still be on screen
    //or not, if they are not supposed to be on the screen, remove them

    App.minePool.x = this.x;
    App.minePool.y = this.y;

    if(App.sidebarView !== null) {
        App.sidebarView.updateCoordIndicator(this.x, this.y);
    }

    //move board to appropriate place
    $('#board').css('left', ((this.x*72)*-1));
    $('#board').css('top', ((this.y*72)*-1));

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
