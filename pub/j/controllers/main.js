App.Controllers.Main = Backbone.Controller.extend({
  initialize: function() {
    setInterval(function() {
      App.mainController.serverCheck();
    },10000);
    this.serverCheck();
  },
  routes: {
    '' :  'displayRandomLocation',
    '!x/:x/y/:y': 'displaySpecificLocation'
  },
  displayRandomLocation: function() {
    var x=Math.floor(Math.random()*10000);
    var y=Math.floor(Math.random()*10000);
    this.displaySpecificLocation(x,y);
  },
  displaySpecificLocation: function(x,y) {
    this.saveLocation('!x/'+x+'/y/'+y);

    dlog('displaySpecificLocation, x: '+x+' y: '+y);

    if(App.sidebarView === null) {
      App.sidebarView = new App.Views.SidebarView({});
    }

    if(App.mainView === null) {
      App.mainView = new App.Views.MainView({});
    }

    App.mainView.x = x;
    App.mainView.y = y;
    App.mainView.refreshBoard();
  },
  serverCheck: function() {
    try {
      App.remote.noop(function(res) {
        if(res == 'OK') {
          App.sidebarView.connectionOk();
        } else {
          App.sidebarView.connectionNotOK();
        }
      });
    } catch(e) {
      App.sidebarView.connectionNotOk();
    }
  }
});
