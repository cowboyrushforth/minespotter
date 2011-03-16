App.Views.MineView = Backbone.View.extend({
  initialize: function() {
    var self = this;
    this.model.view = self;
    this.model.bind('change', function(mv) { self.render(); });
    this.model.bind('destroy', function(mv) { self.remove(); });
  },
  events: {
    'dblclick'   : 'triggerMine',
    'mousedown'  : 'pressMine',
    'mouseup'    : 'unpressMine',
    'mouseleave' : 'unpressMine'
  },
  triggerMine: function() {
    if(this.model.get('state') === 0) {
      if(this.model.get('canExplode') === true) {
        // set exploded state
        this.model.set({state: 2});
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
    $(this.el).addClass('pressed');
  },
  unpressMine: function() {
    $(this.el).removeClass('pressed');
  },
  render: function() {
    var txt = "";
    switch(this.model.get('state')) {
      case 0:
       //fresh mine
      break;
      case 1:
       //exploded, but safe
        txt += "<span class='blue'>"+this.model.get('numTouching')+"</span>";
      break;
      case 2:
        //exploded
        //handled via css
      break;
      case 9:
        txt += "?";
      break;
    }
    $(this.el).html(txt).attr('id', this.model.get('_id')).addClass('mine')
    .css('left', ((this.model.get('loc')[1])*App.pieceSize))
    .css('top', ((this.model.get('loc')[0])*App.pieceSize))
    .attr('data-x', this.model.get('loc')[1])
    .attr('data-y', this.model.get('loc')[0])
    .attr('class',
       function(i, c){
         return c.replace(/\mine-state-\S+/g, '');
     }).addClass('mine-state-'+this.model.get('state'));
    return this;
  }
});
