/* Live Sweeper 0.0.1 */

// Libs
var Connect  = require('connect');
var DNode    = require('dnode');
var Mongoose = require('mongoose');
var underscore = require('underscore');

// Static Setup
var Schema = Mongoose.Schema;
var ObjectId = Schema.ObjectId;
var fieldPlayers = {};
var playerFields = {};
var Settings = {
  pieceSize: 72 
};

// Connect to Mongo
Mongoose.connect('mongodb://localhost/livemine_dev');
//Fix $near with array.
Mongoose.SchemaTypes.Array.prototype.$conditionalHandlers.$near = function (val) {
  return this.cast(val);
};
//Fix $within
Mongoose.SchemaTypes.Array.prototype.$conditionalHandlers.$within = function (val) {
  return val;
};

// Create Server
var server = Connect.createServer(
    // js lint can suck it, have no choice here.
    Connect.static(__dirname + '/pub')
);

// setup Mine Model
var MineSchema = new Schema({
  id           : {type: ObjectId},
  state        : {type: Number },
  isMine       : {type: Boolean },
  numTouching  : {type: Number },
  loc          : {type: Array }
});
Mongoose.model('Mine', MineSchema);
var MineModel = Mongoose.model('Mine');

DNode(function (client, conn) {

  //this will read all mines that are relevant
  //considering current x position, y position and
  //how much screen real estate we have to work with

  this.readMines = function(x,y,screenWidth,screenHeight,collection,cb) {

    var needed_pieces_w = Math.floor(screenWidth/Settings.pieceSize);
    var needed_pieces_h = Math.floor(screenHeight/Settings.pieceSize);
    var needed_pieces = Math.ceil(needed_pieces_w*needed_pieces_h);
    needed_pieces = needed_pieces + (needed_pieces_w+needed_pieces_h);

    // figure out lower left and upper right corners. do a mongo-spatial-bounding-box
    var lower_left = [parseInt(y,10),parseInt(x,10)];
    var upper_right = [Math.ceil((y+needed_pieces_w)),Math.ceil((x+needed_pieces_h))];

    console.log('readMines called for x: '+x+' y: '+y+' sw: '+screenWidth+' sh: '+screenHeight+' coll: '+collection+' needed pieces: '+needed_pieces+' needed_pieces_w: '+needed_pieces_w);
    console.log('lower_left: '+lower_left+' upper_right: '+upper_right);

    //get documents for this collection
    //MineModel.find({loc: {$near: [parseInt(y,10),parseInt(x,10)]}},[],{limit: needed_pieces}, function(err, docs) {
    //> box = [[40.73083, -73.99756], [40.741404,  -73.988135]]
    //> db.places.find({"loc" : {"$within" : {"$box" : box}}})
    MineModel.find({loc: {$within: {$box: [lower_left,upper_right]}}},[],{limit: needed_pieces}, function(err, docs) {

      if(err !== null) {
        console.log(err);
        return;
      }
      console.log("Found "+docs.length+" docs..");
      //if docs doesnt contain the expected amount of
      //pieces, we need to generate pieces
      var cur_max_x = parseInt(x,10);
      var cur_max_y = parseInt(y,10);
      var last_x = 0;
      var last_y = 0;

      docs.forEach(function(doc) {
        if(doc.loc[1] > cur_max_x) {
          cur_max_x = doc.loc[1];
        }
        last_x = doc.loc[1];
        if(doc.loc[0] > cur_max_y) {
          cur_max_y = doc.loc[0];
        }
        last_y = doc.loc[0];
      });

      console.log('cur_max_x: '+cur_max_x+' cur_max_y: '+cur_max_y+' last_x: '+last_x+' last_y: '+last_y);


      if(docs.length < needed_pieces) {

        var diff = needed_pieces - docs.length;
        console.log('Generating '+diff+' pieces');
        var new_x = cur_max_x;
        var new_y = cur_max_y;

        for(var i = docs.length; i <= needed_pieces; i++) {

          //console.log("Generating Piece: "+i);

          var new_mine = new MineModel();

          new_mine.loc[1]  = new_x;
          new_mine.loc[0]  = new_y;
          new_mine.isMine = false;

          var chance=Math.floor(Math.random()*100);
          if(chance > 50) {
            new_mine.isMine = true; 
          }

          new_mine.numTouching = 1;
          new_mine.state  = 0;

          new_mine.save(function(err) {
          });

          docs.push(new_mine); 

          //decide what next piece would be. 
          //if our proposed x is beyond our width, we need to 
          //start a new row, one down and at x=0
          if(new_x >= needed_pieces_w) {
            new_x = 0;
            new_y = new_y + 1;
          } else {
            new_x = new_x + 1;
          }
        }
      }

      console.log("About to CB");

      cb(underscore.map(docs, function(d) {
        return d.toObject();
      }));
    });

  };

  this.subscribeField = function(field, trigger) {

    if(fieldPlayers[field] === undefined) { fieldPlayers[field] = {}; }
    if(playerFields[conn.id] === undefined) { playerFields[conn.id] = []; }

    fieldPlayers[field][conn.id] = trigger;
    playerFields[conn.id].push(field);

    //todo remove from other fields now
    //ie - only one field subscription at a time allowed

    conn.on('end', function() {
        underscore.each(playerFields[conn.id], function(p) {
          delete fieldPlayers[p][conn.id];
        });
        delete playerFields[conn.id];
    });
  };

  this.saveMine = function(mine) {
      //console.log("saveMine!");
      underscore.each(fieldPlayers[1], function(trigger,client) {
        if(conn.id != client) { 
          trigger(mine);
        }
      });
  };

}).listen(server);

// Attach to port 5050
server.listen(3000);


