App.Controllers.Main = Backbone.Controller.extend({
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

    console.log('displaySpecificLocation, x: '+x+' y: '+y);

    if(App.sidebarView === null) {
       App.sidebarView = new App.Views.SidebarView({});
    }

    if(App.mainView === null) {
      App.mainView = new App.Views.MainView({});
    }

    App.mainView.x = x;
    App.mainView.y = y;
    App.mainView.refreshBoard();
  }
});
