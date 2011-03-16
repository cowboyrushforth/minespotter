var Settings = {
  pieceSize: 72
};
var underscore = require('underscore');

this.setup = function(x,y,screenWidth,screenHeight) {
  field = {};
  field.needed_pieces_w = parseInt((screenWidth/Settings.pieceSize),10);
  field.needed_pieces_h = parseInt((screenHeight/Settings.pieceSize),10);
  field.needed_pieces = parseInt((field.needed_pieces_w*field.needed_pieces_h),10);
  field.needed_pieces = field.needed_pieces + (field.needed_pieces_w);
  field.x = parseInt(x,10);
  field.y = parseInt(y,10);

  // figure out lower left and upper right corners. do a mongo-spatial-bounding-box
  // we bump them up by 1 because mongo is < and not <=
  // semantics here is confusing. this really means upper_left and lower_right.
  field.lower_left = [field.y-2,field.x-1];
  field.upper_right = [Math.ceil(field.y+field.needed_pieces_h)+1,Math.ceil(field.x+field.needed_pieces_w)+2];

  console.log('minefield setup called for x: '+field.x+' y: '+field.y+' sw: '+field.screenWidth+
              ' sh: '+field.screenHeight+' needed pieces: '+field.needed_pieces+
                  ' needed_pieces_w: '+field.needed_pieces_w+' needed_pieces_h: '+field.needed_pieces_h);
    console.log('lower_left: '+field.lower_left+' upper_right: '+field.upper_right);

  return field;

};

this.calculateNeededPieces = function(lower_left,upper_right,cb) {

  var needed_pieces_list = [];
  var point = lower_left;
  while((point[0] != upper_right[0]) || (upper_right[1] != point[1])) {
    //console.log("needed: "+point[0]+':'+point[1]);
    needed_pieces_list.push(point[0]+':'+point[1]);
    point = [point[0],point[1]+1];
    if(point[1] > upper_right[1]) {
      point[1] = lower_left[1];
      point[0] = point[0]+1;
    }
  }
  console.log("\tNeeded pieces: "+needed_pieces_list.length);
  cb(needed_pieces_list);
};

this.trimPiecesWeHave = function(docs,needed_pieces_list,cb) {
  // remove pieces we have from needed_pieces_list
  var iteration = 1;
  docs.forEach(function(doc) {
    needed_pieces_list = underscore.without(needed_pieces_list, doc.loc[0]+':'+doc.loc[1] );
    if(iteration == docs.length) {
      cb(needed_pieces_list);
    }
    iteration += 1;
  });
};

this.insertNewPieces = function(MineModel,needed_pieces, docs, cb) {

  var iteration = 1;
  needed_pieces.forEach(function(piece) {
    var new_y = piece.split(':');
    var new_x = new_y[1];
    new_y = new_y[0];

    var new_mine = new MineModel();
    new_mine.loc[1]  = parseInt(new_x,10);
    new_mine.loc[0]  = parseInt(new_y,10);
    new_mine.canExplode = false;

    // 29% chance we are explodable.
    var chance=Math.floor(Math.random()*100);
    if(chance < 29) {
      new_mine.canExplode = true;

    }

    new_mine.numTouching = 0;
    new_mine.state  = 0;
    new_mine.save(function(err) {
      if(err !== null) {
        iteration += 1;
        console.log("------ohnos db error!-------");
        console.log(err);
        console.log(new_mine.toObject());
      } else {
        docs.push(new_mine);
        if(iteration == needed_pieces.length) {
          cb(docs);
        }
        iteration += 1;
      }
    });
  });
};


