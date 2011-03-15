App.Views.SidebarView = Backbone.View.extend({
  initialize: function() {
    this.el = $('#sidebar');
    this.render();
  },
  events: {
  },
  render: function() {
    $('#title').html("LiveWire v0.0.1");
    $('#name').html("Welcome, player!");
    this.resize();
  },
  resize: function() {
     $(this.el).css('height', $(window).height());
  },
  updateCoordIndicator: function(x,y) {
    $('#x_coord').html('x: '+x);
    $('#y_coord').html('y: '+y);
  }
});
