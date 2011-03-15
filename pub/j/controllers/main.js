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
//    if(App.debug === false) {
     x=Math.floor(Math.random()*10000);
     y=Math.floor(Math.random()*10000);
  //  }
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
