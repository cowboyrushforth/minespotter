App.Views.SidebarView = Backbone.View.extend({
  initialize: function() {
    this.el = $('#sidebar');
    this.render();
  },
  events: {
  },
  render: function() {
    $(this.el).html("LiveMine");
    this.resize();
  },
  resize: function() {
     $(this.el).css('height', $(window).height());
  },
  updateCoordIndicator: function() {

  }
});
