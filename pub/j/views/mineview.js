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
      if(this.model.get('canExplode') === true) {
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
        //handled via css
      break;
      case 9:
        foo += "Unknown";
      break;
    }
    $(this.el).html(foo).attr('id', this.model.get('_id')).addClass('mine')
    .css('left', ((this.model.get('loc')[1])*App.pieceSize))
    .css('top', ((this.model.get('loc')[0])*App.pieceSize))
    .attr('data-x', this.model.get('loc')[1])
    .attr('data-y', this.model.get('loc')[0])
    .addClass('mine-state-'+this.model.get('state'));
    return this;
  }
});
