// LiveMine v0.0.1

// Main Application Object
var App = {
  screenWidth: null,
  screenHeight: null,
  mainController: null,
  mainView: null,
  minePool: null,
  Views: {},
  Models: {},
  Controllers: {},
  Collections: {},
  remote: null,
  debug: true,
  pieceSize: 72
};

// Setup Backbone Controller.  Only one for whole app
// since we use this just for friendly-urls and thats it
App.Controllers.Main = Backbone.Controller.extend({
  routes: {
    '' :  'displayRandomLocation',
    '!x/:x/y/:y': 'displaySpecificLocation'
  },
  displayRandomLocation: function() {
    // in debug mode always just go to 0,0
    if(App.debug === true) {
      var x = 0;
      var y = 0;
    } else {
      var x=Math.floor(Math.random()*10000);
      var y=Math.floor(Math.random()*10000);
    }
    this.displaySpecificLocation(x,y);
    this.saveLocation('!x/'+x+'/y/'+y);
  },
  displaySpecificLocation: function(x,y) {

    console.log('displaySpecificLocation, x: '+x+' y: '+y);

    if(App.mainView === null) {
      App.mainView = new App.Views.MainView({});
    }

    App.mainView.x = y;
    App.mainView.y = y;
    App.mainView.refreshBoard();
  }
});

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

App.Collections.MinePool = Backbone.Collection.extend({
  model: App.Models.Mine,
  collectionName: 'mines',
  sync:  function(method, model, success, error) {
    console.log('Syncing MinePool, meth: '+method);
      switch(method) {
        case 'read':
          App.remote.readMines(model.x, model.y, App.screenWidth, App.screenHeight, model.collectionName, function(res) {
            console.log(res);
            model.add(res);
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

App.Views.MineView = Backbone.View.extend({
  initialize: function() {
    var self = this;
    this.model.bind('change', function(mv) { self.render(); });
  },
  events: {
    'click' : 'triggerMine',
    'mousedown' : 'pressMine'
  },
  triggerMine: function() {
    if(this.model.get('state') === 0) {
      if(this.model.get('isMine') === true) {
        // set exploded state
        this.model.set({state: 2});
        //todo - explode radius of mines
        // actually, maybe that is server side. hrm.
      } else {
        // set safe state
        this.model.set({state: 1});
      }
      // this saves to server and notifies 
      // other relevant players
      this.model.save();
    }
  },
  pressMine: function() {
    //just the beginning of clicking it
    //only a visual indicator (todo)
  },
  render: function() {
    var foo = "";
    switch(this.model.get('state')) {
      case 0:
        foo = "ok";
      break;
      case 1:
        foo = "safe numTouching:"+this.model.get('numTouching');
      break;
      case 2:
        foo = "OH NOS!";
      break;
      case 9:
        foo = "Unknown";
      break;
    }
    $(this.el).html(foo).attr('id', this.model.get('_id')).addClass('mine')
    .css('left', ((this.model.get('loc')[0])*App.pieceSize))
    .css('top', ((this.model.get('loc')[1])*App.pieceSize));
    return this;
  }
});

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

  },
  refreshBoard: function() {

    //todo - move board to appropriate place
    //ie - cycle through minePool pieces and see if they should still be on screen
    //or not, if they are not supposed to be on the screen, remove them

    App.minePool.x = this.x;
    App.minePool.y = this.y;
    App.minePool.fetch();
    App.remote.subscribeField(1, App.mineHandler);
  }
});

//this receives new mines for the current field
//we need to replace the, then re-render
App.mineHandler = function(new_mine) {
      if(App.debug === true) {
        console.log("Received New Mine!")
      }
      var old = App.minePool.get(new_mine._id);
      old.set(new_mine);
}


$(function() {
  // fire DNode Up
  DNode().connect(function(remote) {
    App.remote = remote;
    App.screenWidth  = parseInt($(window).width(),10);
    App.screenHeight = parseInt($(window).height(),10);
    App.mainController = new App.Controllers.Main();
    // fire backbone up
    Backbone.history.start();
  });
});

