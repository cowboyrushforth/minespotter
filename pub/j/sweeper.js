// Sweeper v0.0.1

// Main Application Object
var Sweeper = {
  screenWidth: null,
  screenHeight: null,
  mainController: null,
  mainView: null,
  minePool: null,
  Views: {},
  Models: {},
  Controllers: {},
  Collections: {},
  remote: null
};

// Setup Backbone Controller.  Only one for whole app
// since we use this just for friendly-urls and thats it
Sweeper.Controllers.Main = Backbone.Controller.extend({
  routes: {
    '' :  'displayRandomLocation',
    '!x/:x/y/:y': 'displaySpecificLocation'
  },
  displayRandomLocation: function() {
    var x=Math.floor(Math.random()*10000);
    var y=Math.floor(Math.random()*10000);
    this.displaySpecificLocation(x,y);
    this.saveLocation('!x/'+x+'/y/'+y);
  },
  displaySpecificLocation: function(x,y) {

    console.log('displaySpecificLocation, x: '+x+' y: '+y);

    if(Sweeper.mainView === null) {
      Sweeper.mainView = new Sweeper.Views.MainView({});
    }

    Sweeper.mainView.x = y;
    Sweeper.mainView.y = y;
    Sweeper.mainView.refreshBoard();
  }
});

Sweeper.Models.Mine = Backbone.Model.extend({
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
          Sweeper.remote.saveMine(model.attributes);
          break;
        case 'delete':
          break;
      }
  }
});

Sweeper.Collections.MinePool = Backbone.Collection.extend({
  model: Sweeper.Models.Mine,
  collectionName: 'mines',
  sync:  function(method, model, success, error) {
    console.log('Syncing MinePool, meth: '+method);
      switch(method) {
        case 'read':
          Sweeper.remote.readMines(model.x, model.y, Sweeper.screenWidth, Sweeper.screenHeight, model.collectionName, function(res) {
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

Sweeper.Views.MineView = Backbone.View.extend({
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
    .css('left', ((this.model.get('loc')[1])*48))
    .css('top', ((this.model.get('loc')[0])*48));
    return this;
  }
});

Sweeper.Views.MainView = Backbone.View.extend({
  x: null,
  y: null,
  el: null,
  initialize: function() {
    _.bindAll(this, 'render', 'refreshBoard');

    //setting this here because
    //up above is too soon. (race)
    this.el = $('#board');

    //hrm..
    var self = this;

    // fire up minePool
    Sweeper.minePool = new Sweeper.Collections.MinePool();

    // for each mine when added to minePool, render it
    Sweeper.minePool.bind('add', function(mine) {
      var mineView = new Sweeper.Views.MineView({model: mine});
      $(self.el).append(mineView.render().el);
    });

  },
  refreshBoard: function() {

    //todo - move board to appropriate place
    //ie - cycle through minePool pieces and see if they should still be on screen
    //or not, if they are not supposed to be on the screen, remove them

    Sweeper.minePool.x = this.x;
    Sweeper.minePool.y = this.y;
    Sweeper.minePool.fetch();
    Sweeper.remote.subscribeField(1, Sweeper.mineHandler);
  }
});

//this receives new mines for the current field
//we need to replace the, then re-render
Sweeper.mineHandler = function(new_mine) {
      console.log("Received New Mine!")
      var old = Sweeper.minePool.get(new_mine._id);
      old.set(new_mine);
}


$(function() {
  // fire DNode Up
  DNode().connect(function(remote) {
    Sweeper.remote = remote;
    Sweeper.screenWidth  = parseInt($(window).width(),10);
    Sweeper.screenHeight = parseInt($(window).height(),10);
    Sweeper.mainController = new Sweeper.Controllers.Main();
    // fire backbone up
    Backbone.history.start();
  });
});

