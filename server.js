/* MineSpotter 0.0.1 */

// Libs
var Connect    = require('connect');
var DNode      = require('dnode');
var Mongoose   = require('mongoose');
var underscore = require('underscore');
var Path       = require('path');
var MineField  = require(Path.join(process.cwd(), 'minefield.js'));
//var dbdsn      = process.env.DUOSTACK_DB_MONGODB || 'mongodb://localhost/minespotter_dev';
var dbdsn      = "mongodb://spotman:minespotter22@flame.mongohq.com:27047/minespotter";
var sys        = require('sys');


// Static Setup
var Schema = Mongoose.Schema;
var ObjectId = Schema.ObjectId;
var fieldPlayers = {};
var playerFields = {};

// Connect to Mongo
Mongoose.connect(dbdsn);
console.log(dbdsn);

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
Mongoose.model('Mine', MineSchema);
var MineModel = Mongoose.model('Mine');

//this is broken in nodejs for now.
//MineSchema.index({loc: "2d"}, { min: -5000000, max: 5000000, unique: true});


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
            });
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
    console.log("client: "+conn.id+" subscribing to: "+field);

    if(fieldPlayers[field] === undefined) { fieldPlayers[field] = {}; }

    if(playerFields[conn.id] === undefined) {
      playerFields[conn.id] = [];
      conn.on('end', function() {
        underscore.each(playerFields[conn.id], function(p) {
          delete fieldPlayers[p][conn.id];
        });
        delete playerFields[conn.id];
      });
    }

    if(!underscore.include(playerFields[conn.id], field)) {
      playerFields[conn.id].push(field);
      fieldPlayers[field][conn.id] = trigger;
    }
  };

  this.unsubscribeField = function(field) {
    console.log("client: "+conn.id+" unsubscribing to: "+field);
    if(fieldPlayers[field]) {
      delete fieldPlayers[field][conn.id];
    }
    if(playerFields[conn.id]) {
      delete playerFields[conn.id][field];
    }
  };

  // Major Todo - dry / clean this up!!!
  this.saveMine = function(mine) {

    // find mine we need to update
    MineModel.findById(mine._id, function (err, dbmine) {

      //we found mine.
      if (!err && dbmine) {

        //what minefield are we in.
        var field_x = parseInt((dbmine.loc[1]+50)/50,10);
        var field_y = parseInt((dbmine.loc[0]+30)/30,10);
        var field_key = field_y+':'+field_x;

        // set new state
        dbmine.state = mine.state;

        // save mine
        dbmine.save(function (err) {
          if(!err) {
            if(mine.canExplode) {

              // handle explosions.
              console.log("Handling Explosion!!!");

              // scan a 2d box around area for other mines.
              var lower_left = [mine.loc[0]-1,mine.loc[1]-1];
              var upper_right = [mine.loc[0]+1, mine.loc[1]+1];
              MineModel.find({'_id' : {'$ne' : mine._id },
                             'canExplode' : 1,
                             'state' : 0,
                             'loc': {'$within': {'$box': [lower_left,upper_right]}}
              },[],{}, function(err, docs) {

                if(!err) {
                  console.log("found: "+underscore.size(docs)+" mines to explode!");

                  var updated_mines = [];
                  var e_iteration = 1;

                  if(underscore.size(docs)) {

                  docs.forEach(function(d) {
                    // we found a mine nearby that needs exploding.
                    d.state = 2;
                    d.save(function(err) {
                      if(!err) {
                        updated_mines.push(d);
                      }
                      if(e_iteration == underscore.size(docs)) {
                        // notify other people in this field
                        underscore.each(fieldPlayers[field_key], function(trigger,client) {
                          //map it appropriate backbone form.
                          var updates = underscore.map(updated_mines, function(um) {
                            return um.toObject();
                          });
                          //requesting client already has mine fresh, 
                          //but for others add it.
                          if(conn.id != client) {
                            updates.push(dbmine.toObject());
                          }
                          trigger(updates);
                        });
                      }
                      e_iteration += 1;
                    });
                  });
                  //no surrounding mines to explode, just pass
                  //the single to other clients.
                  } else {
                    underscore.each(fieldPlayers[field_key], function(trigger,client) {
                      if(conn.id != client) {
                        trigger([dbmine.toObject()]);
                      }
                    });
                  }
                }
              });

            } else {
              // notify players in the field about mine update.
              // except ourselves, because we sent the update.
              underscore.each(fieldPlayers[field_key], function(trigger,client) {
                if(conn.id != client) {
                  trigger([mine]);
                }
              });
            }
          }
        });
      }
    });
  };

  this.noop = function(poon) {
    poon("OK");
  };

}).listen(server);

// Attach to port 3000
// //8946?
server.listen(9980);
