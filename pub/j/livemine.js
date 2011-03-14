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
  pieceSize: 72,
  subscribedFields: []
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
    var x = 0;
    var y = 0;
    if(App.debug === false) {
     x=Math.floor(Math.random()*10000);
     y=Math.floor(Math.random()*10000);
    }
    this.displaySpecificLocation(x,y);
  },
  displaySpecificLocation: function(x,y) {
    this.saveLocation('!x/'+x+'/y/'+y);

    console.log('displaySpecificLocation, x: '+x+' y: '+y);

    if(App.mainView === null) {
      App.mainView = new App.Views.MainView({});
    }

    App.mainView.x = x;
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

App.Views.MineView = Backbone.View.extend({
  initialize: function() {
    var self = this;
    this.model.bind('change', function(mv) { self.render(); });
  },
  events: {
    'dblclick' : 'triggerMine',
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
    var foo = "<br/>";
    switch(this.model.get('state')) {
      case 0:
        foo += "ok";
      break;
      case 1:
        foo += "<span class='blue'>"+this.model.get('numTouching')+"</span>";
      break;
      case 2:
        foo += "<span class='red'>OH NOS!</span>";
      break;
      case 9:
        foo += "Unknown";
      break;
    }
    $(this.el).html(foo).attr('id', this.model.get('_id')).addClass('mine')
    .css('left', ((this.model.get('loc')[1])*App.pieceSize))
    .css('top', ((this.model.get('loc')[0])*App.pieceSize))
    .attr('data-x', this.model.get('loc')[1])
    .attr('data-y', this.model.get('loc')[0]);
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

    $(this.el).draggable({
      stop: function(ev,ui) {
          var x = parseInt((parseInt($(ui.helper).css('left'),10)/App.pieceSize),10)*-1;
          var y = parseInt((parseInt($(ui.helper).css('top'),10)/App.pieceSize),10)*-1;
          App.mainController.displaySpecificLocation(x,y);
      }
    });
  },
  refreshBoard: function() {

    //ie - cycle through minePool pieces and see if they should still be on screen
    //or not, if they are not supposed to be on the screen, remove them

    App.minePool.x = this.x;
    App.minePool.y = this.y;

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
  }, {reconnect: 2000});
});

