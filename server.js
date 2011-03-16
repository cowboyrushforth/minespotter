/* Live Mine 0.0.1 */

// Libs
var Connect    = require('connect');
var DNode      = require('dnode');
var Mongoose   = require('mongoose');
var underscore = require('underscore');
var Path       = require('path');
var MineField  = require(Path.join(process.cwd(), 'minefield.js'));


// Static Setup
var Schema = Mongoose.Schema;
var ObjectId = Schema.ObjectId;
var fieldPlayers = {};
var playerFields = {};

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

//this seems to not be working properly, so for now run in mongo console!!!!
//MineSchema.index({loc: "2d"}, { min: -5000000, max: 5000000, unique: true});

Mongoose.model('Mine', MineSchema);
var MineModel = Mongoose.model('Mine');

DNode(function (client, conn) {

  // this will read all mines that are relevant
  // considering current x position, y position and
  // how much screen real estate we have to work with

  // todo - make this more separated out with callbacks and things
  // make it much smaller and more efficient.

  this.readMines = function(x,y,screenWidth,screenHeight,cb) {

    var field = MineField.setup(x,y,screenWidth,screenHeight);

    // calculate list of what pieces will make up this players screen
    MineField.calculateNeededPieces(field.lower_left, field.upper_right,function(needed_pieces_list) {

      // get needed pieces from mongo
      MineModel.find({'loc': {'$within': {'$box': [field.lower_left,field.upper_right]}}},[],{}, function(err, docs) {

        if(err !== null) {
          console.log("error!");
          console.log(err);
          return;
        }

        console.log("\tFound "+docs.length+" pieces");

        MineField.trimPiecesWeHave(docs, needed_pieces_list, function(needed_pieces) {

          if(needed_pieces.length) {
            // now insert all needed pieces into mongo that we didnt have
            console.log("\tNeed to create "+needed_pieces.length+" pieces");
            MineField.insertNewPieces(MineModel, needed_pieces, docs, function(preparedDocs) {
              console.log("About to CB (2)");
              cb(underscore.map(preparedDocs, function(d) {
                return d.toObject();
              }));
            })
          } else {
            console.log("About to CB (1)");
            cb(underscore.map(docs, function(d) {
              return d.toObject();
            }));
          }
        });
      });
    });
  };

  this.subscribeField = function(field, trigger) {

    if(fieldPlayers[field] === undefined) { fieldPlayers[field] = {}; }
    if(playerFields[conn.id] === undefined) { playerFields[conn.id] = []; }

    fieldPlayers[field][conn.id] = trigger;
    playerFields[conn.id].push(field);

    //todo remove from other fields now
    //ie - only one field subscription at a time allowed
    //unless your half in one field and half in another.
    //so i guess we have to allow up to 4 subscriptions
    //or possibly (probably the better thing to do) is
    //calculate which fields we should be subscribing to
    //on the server side..

    conn.on('end', function() {
      underscore.each(playerFields[conn.id], function(p) {
        delete fieldPlayers[p][conn.id];
      });
      delete playerFields[conn.id];
    });
  };

  this.saveMine = function(mine) {

    // find mine we need to update
    MineModel.findById(mine._id, function (err, dbmine) {
      if (!err && dbmine) {
        // set new state
        dbmine.state = mine.state;
        // save mine
        dbmine.save(function (err) {
          if(!err && mine.canExplode) {
            // handle explosions.
            console.log("Handling Explosion!!!");
            // scan a 2d box around area for other mines.
            // we could limit this search to only finding mines
            // i just wonder if we need to do anything to the near pieces
            // we probably need to change them to another state too.
            var lower_left = [mine.loc[0]-1,mine.loc[1]-1];
            var upper_right = [mine.loc[0]+1, mine.loc[1]+1];
            MineModel.find({'_id' : {'$ne' : mine._id },
                           'canExplode' : 1,
                           'state' : 0,
                           'loc': {'$within': {'$box': [lower_left,upper_right]}}
            },[],{}, function(err, docs) {
              if(!err) {
                docs.forEach(function(d) {
                  // we found a mine nearby that needs exploding.
                  d.state = 2;
                  d.save(function(err) { });
                  // notify other people in this field
                  underscore.each(fieldPlayers[1], function(trigger,client) {
                    trigger(d.toObject());
                  });
                });
              }
            });
          }
        });
        underscore.each(fieldPlayers[1], function(trigger,client) {
          if(conn.id != client) {
            trigger(mine);
          }
        });
      }
    });

  };

  this.noop = function(poon) {
    poon("OK");
  }

}).listen(server);

// Attach to port 3000
server.listen(3000);
