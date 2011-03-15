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

// Fix $near with array.
Mongoose.SchemaTypes.Array.prototype.$conditionalHandlers.$near = function (val) {
  return this.cast(val);
};

// Fix $within
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
  canExplode   : {type: Boolean },
  numTouching  : {type: Number },
  loc          : {type: Array }
});
MineSchema.index({loc: "2d"}, { min: -5000000, max: 5000000, unique: true});
Mongoose.model('Mine', MineSchema);
var MineModel = Mongoose.model('Mine');

DNode(function (client, conn) {

  //this will read all mines that are relevant
  //considering current x position, y position and
  //how much screen real estate we have to work with
 
  //todo - make this more separated out with callbacks and things
  //make it much smaller and more efficient.

  this.readMines = function(x,y,screenWidth,screenHeight,collection,cb) {

    var needed_pieces_w = parseInt((screenWidth/Settings.pieceSize),10);
    var needed_pieces_h = parseInt((screenHeight/Settings.pieceSize),10);
    var needed_pieces = parseInt((needed_pieces_w*needed_pieces_h),10);
    needed_pieces = needed_pieces + (needed_pieces_w);
    x = parseInt(x,10);
    y = parseInt(y,10);

    // figure out lower left and upper right corners. do a mongo-spatial-bounding-box
    // we bump them up by 1 because mongo is < and not <=
    // semantics here is confusing. this really means upper_left and lower_right.
    var lower_left = [y,x];
    var upper_right = [Math.ceil(y+needed_pieces_h),Math.ceil(x+needed_pieces_w)];

    console.log('readMines called for x: '+x+' y: '+y+' sw: '+screenWidth+' sh: '+screenHeight+' needed pieces: '+needed_pieces+' needed_pieces_w: '+needed_pieces_w+' needed_pieces_h: '+needed_pieces_h);
    console.log('lower_left: '+lower_left+' upper_right: '+upper_right);

    // calculate list of what pieces will make up this players screen
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

    //get needed pieces from mongo
    MineModel.find({'loc': {'$within': {'$box': [lower_left,upper_right]}}},[],{}, function(err, docs) {

      if(err !== null) {
        console.log(err);
        return;
      }

      console.log("\tFound "+docs.length+" pieces");

      // remove pieces we have from needed_pieces_list
      docs.forEach(function(doc) {
        needed_pieces_list = underscore.without(needed_pieces_list, doc.loc[0]+':'+doc.loc[1] );
       // console.log("\tNeed to create "+needed_pieces_list.length+" pieces");
      });

      console.log("\tNeed to create "+needed_pieces_list.length+" pieces");

      // now insert all needed pieces into mongo that we didnt have
      needed_pieces_list.forEach(function(piece) {

        var new_y = piece.split(':');
        var new_x = new_y[1];
        new_y = new_y[0];

        //console.log("Generating Piece: x: "+new_x+" y: "+new_y);

        var new_mine = new MineModel();

        new_mine.loc[1]  = parseInt(new_x,10);
        new_mine.loc[0]  = parseInt(new_y,10);
        new_mine.canExplode = false;

        var chance=Math.floor(Math.random()*100);
        if(chance > 50) {
          new_mine.canExplode = true;
        }

        new_mine.numTouching = 1; // TODO: Actually calculate this
        new_mine.state  = 0;
        new_mine.save(function(err) {
          if(err !== null) {
            console.log("------ohnos db error!-------");
            console.log(err);
            console.log(new_mine.toObject());
          }
        });

        //this is a bit tricky here since database stuff is happening sometimes
        //after the request finishes. so this will always be
        //sent to browser, but not always inserted (if there was an error)
        //sort of sketchy and probably a better way to do this.
        docs.push(new_mine);

      });


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

    MineModel.findById(mine._id, function (err, dbmine) {
      if (!err) {
        dbmine.state = mine.state;
        dbmine.save(function (err) {
          //handle explosions.
          if(!err) {
            if(mine.canExplode) {
              console.log("Handling Explosion!!!");
              var lower_left = [mine.loc[0]-2,mine.loc[1]-2];
              var upper_right = [mine.loc[1]+2, mine.loc[1]+2];
              MineModel.find({'loc': {'$within': {'$box': [lower_left,upper_right]}}},[],{}, function(err, docs) {
                docs.forEach(function(d) {
                  if(d.canExplode) {
                    d.state = 2;
                    d.save(function(err) { });
                    underscore.each(fieldPlayers[1], function(trigger,client) {
                        trigger(d.toObject());
                    });
                  }
                });
              });
            }
          }
        });
      }
    });

    underscore.each(fieldPlayers[1], function(trigger,client) {
      if(conn.id != client) {
        trigger(mine);
      }
    });
  };

}).listen(server);

// Attach to port 3000
server.listen(3000);
