// MineSpotter v0.0.1

// Main Application Object
var App = {
  screenWidth: null,
  screenHeight: null,
  mainController: null,
  mainView: null,
  sidebarView: null,
  minePool: null,
  Views: {},
  Models: {},
  Controllers: {},
  Collections: {},
  remote: null,
  debug: true,
  pieceSize: 72,
  subscribedFields: {}
};


//this receives new mines for the current field
//we need to replace the, then re-render
App.mineHandler = function(new_mines) {
      if(App.debug === true) {
        dlog("Received "+_.size(new_mines)+" New Mine(s)!");
      }
      _.each(new_mines, function(m) {
        var old = App.minePool.get(m._id);
        old.set(m);
      });
};

App.resize = function() {
        App.screenWidth  = parseInt($(window).width(),10);
        App.screenHeight = parseInt($(window).height(),10);
        App.mainView.resize();
        App.mainView.refreshBoard();
};


$(function() {
  // fire DNode Up
  DNode().connect({port: 9980, reconnect: 2000}, function(remote) {
    App.remote = remote;
    App.screenWidth  = parseInt($(window).width(),10);
    App.screenHeight = parseInt($(window).height(),10);
    App.mainController = new App.Controllers.Main();
    // fire backbone up
    Backbone.history.start();
  });
  // setup resize handler
  $(window).resize(App.resize);
});

