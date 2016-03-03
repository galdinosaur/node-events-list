var express = require('express'),
    bodyParser = require('body-parser'),
    unirest = require('unirest'),
    events = require('events'),
    cookieParser = require('cookie-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    SpotifyStrategy = require('./lib/passport-spotify/index').Strategy;


var appKey = '--------ENTER YOUR OWN SPOTIFY APP KEY-----------';
var appSecret = '--------ENTER YOUR OWN SPOTIFY APP SECRET-----------';
var token;


/**
 * Represents API call to Spotify which will return a object of the users following artists.
 * @constructor
 * @param {string} endpoint - Spotify user following artists endpoint.
 * @param {object} args - Spotify required arguments object.
 */
var getFromSpotify = function(endpoint, args) {
  var emitter = new events.EventEmitter();
  var accToken = "Bearer "+token;
  // console.log('name ' +accToken);
  unirest.get('https://api.spotify.com/v1/' + endpoint)
    .headers({'Authorization': accToken})
    .qs(args)
    .end(function(response) {
      if (response.ok) {
        emitter.emit('end', response.body);
      }
      else {
        emitter.emit('error', response.code);
      }
  });
  return emitter;
};


/**
 * Represents asynchronous API execution of getting specific artist calendar events.
 * @constructor
 * @param {string} artistName - The desired artist name.
 * @param {function} cb - The callback function which will fire off when the end event is executed.
 */ 
var getArtistEvents = function(artistName, cb){
    var search = getFromSongkickApi({
      artist_name: artistName,
      apikey: '--------ENTER YOUR OWN SONG KICK API KEY-----------'
    });
    
    search.on('end', function(results){
      results.artistName = artistName;
      cb(null, results);
    });
    search.on('error', function(err){
      cb(err);
    });
};

/**
 * Represents API call to Songkick to retrieve an object with the artist calendar events.
 * @constructor
 * @param {object} args - Required arguments object, in this case it will involve the artist name and API key to Songkick.
 */
var getFromSongkickApi = function(args) {
    var emitter = new events.EventEmitter();

    unirest.get('http://api.songkick.com/api/3.0/events.json')
     .qs(args)
     .end(function(response) {
        if (response.ok) {
          emitter.emit('end', response.body);
        }
        else {
          emitter.emit('error', response.code);
        }
      });
    return emitter;
};


/**
 * Represents the distance (in miles) between 2 geolocations (longitude and latitude).
 * @return function
 * param {number} lat1 - Latitude of location 1.
 * param {number} lon1 - Longitude of location 1.
 * param {number} lat2 - Latitude of location 2.
 * param {number} lon2 - Longitude of location 2.
 */ 
function distance(lat1, lon1, lat2, lon2, unit) {
	var radlat1 = Math.PI * lat1/180;
	var radlat2 = Math.PI * lat2/180;
	var theta = lon1-lon2;
	var radtheta = Math.PI * theta/180;
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist);
	dist = dist * 180/Math.PI;
	dist = dist * 60 * 1.1515;
	if (unit=="K") { dist = dist * 1.609344 }
	if (unit=="N") { dist = dist * 0.8684 }
	return dist;
}
/**
 * Represents an artist events filter per geolocation.
 * @param {number} lat - Latitude of desired location.
 * @param {number} lng - Longitude of desired location.
 */
var eventsPerLocation = function(lat,lng){
  locatedResults = [];
  for(var i = 0; i < allResults.length;i++){
    
    var piece = allResults[i];
    var eventDistance = distance(lat,lng,piece.latitude,piece.longitude);
    
    if(eventDistance < 75){
      locatedResults.push(piece);
    }
    
  }

  console.log('done posting events per location');

};


/**
 * Represents a date format change.
 * @param {string} date - Initial format was YYYY-MM-DD and returs MM/DD/YYYY.
 */ 
var dateReform = function(date){
  var dateArray = date.split('-');
  var newDate = dateArray[1]+"/"+dateArray[2]+"/"+dateArray[0];
  return newDate;
};

/**
 * This searches through every songkick artist calendar and adds the events into the allResults array.
 * @param {array} artistCalendarArray - This array will contain an artist calendar object in each index.
 */
var songkickDataGather = function(artistCalendarArray){
  allResults = [];
  // console.log('this is the artists array');
  // console.log(artistCalendarArray);
  
  for(var i = 0;i < artistCalendarArray.length;i++ ){

    var eventTemplate = artistCalendarArray[i];
    var name = eventTemplate.artistName;
    var longitude;
    var latitude;
    var eventName = "";
    var location = "";
    var eventDate = "";
    var url = "";
    
    /**
     * This if statement will check if the artist calendar has any entries or events. If there are no events,
     * all information variables are set to N/A. If there are any events per artist, then these events are pushed
     * into the global allResults array.
     */ 
    if(eventTemplate.resultsPage.totalEntries === 0){
      eventName = "N/A";
      location = "N/A";
      eventDate = "N/A";
      url = "N/A";
      
    }
    else {
      var events = eventTemplate.resultsPage.results.event;

      for(var j = 0; j < events.length;j++){
        eventName = events[j].displayName;
        location =  events[j].location.city;
        longitude = events[j].location.lng;
        latitude =  events[j].location.lat;
        eventDate = dateReform(events[j].start.date);
        url = events[j].uri;
        
        allResults.push({name: name, event: eventName, location: location, longitude : longitude,latitude:latitude, date: eventDate, url: url });
      }
    }
  }
};

var allResults = [];
var locatedResults = [];


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session. Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing. However, since this example does not
//   have a database of user records, the complete spotify profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the SpotifyStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and spotify
//   profile), and invoke a callback with a user object.
passport.use(new SpotifyStrategy({
  clientID: appKey,
  clientSecret: appSecret,
  callbackURL: 'http://node-practice-galdinorosas.c9users.io/callback'

  },
  function(accessToken, refreshToken, profile, done) {
    // console.log('accessToken', accessToken);
    token = accessToken;
    // asynchronous verification, for effect...
    process.nextTick(function () {
      // To keep the example simple, the user's spotify profile is returned to
      // represent the logged-in user. In a typical application, you would want
      // to associate the spotify account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }));

var app = express();


app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(session({ secret: 'keyboard cat' }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/public'));



/**
 * This endpoint receives user Spotify followed artists. The names of the following artists are placed into an
 * artistNamesArray. This names array is now used to query through Songkick API and place the results (artist calendar object)
 * in the artistResults array. The final result is the global allResults array to container event specific information
 * in every index.
 */ 
app.get('/userFollowedArtists',function(req, res){
  
  var artistNamesArray = [];
  var artistResults = [];
  var count = 0;
  
  // TODO: add check if followObj is not in the session
  // console.log(req.session.followObj);

  var SpotifyArtistsList = req.session.followObj.artists.items;
  
  for(var i = 0; i < SpotifyArtistsList.length; i++){
    
    var string = SpotifyArtistsList[i].name;

    artistNamesArray.push(string);
  }
  
  for(var j = 0; j < artistNamesArray.length; j++){
    
    
    /**
     * This function is fired off only after all the index's in the artistNamesArray have been checked.
     * The songkickDataGather function pushes all important event information into the allResults array.
     * The user's inital response from the server to the site will be the first 10 events in the allResults
     * array.
     */ 
    var artistCount = function(){
      if(artistNamesArray.length === count){
        
        songkickDataGather(artistResults);
        
        var firstTenArtistsArray = [];
        
        for(var i = 0; i < 10; i++){
          
          var piece = allResults[i];
          var name = piece.name;
          var event = piece.event;
          var location = piece.location;
          var date = piece.date;
          var url = piece.url;
          var long = piece.longitude;
          var lat = piece.latitude;
          
          firstTenArtistsArray.push({name:name,event:event,location:location,date:date,url:url, longitude:long, latitude: lat});
        }

        return res.status(200).json({events: firstTenArtistsArray});
        
      }
    };
    
    getArtistEvents(artistNamesArray[j], function(err, results){
      
      if(err){
        console.log(err);
      }
      else{
        artistResults.push(results);
      }
      
      count++;
      artistCount();
    
    });
    
    
  }

    
});

// GET /auth/spotify
//   Use passport.authenticate() as route middleware to authenticate the
//   request. The first step in spotify authentication will involve redirecting
//   the user to spotify.com. After authorization, spotify will redirect the user
//   back to this application at /auth/spotify/callback
app.get('/auth/spotify',
  passport.authenticate('spotify', {scope: ['user-read-email', 'user-read-private','user-follow-read'] /*,  showDialog: true */}),
  function(req, res){
// The request will be redirected to spotify for authentication, so this
// function will not be called.
});


// GET /auth/spotify/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request. If authentication fails, the user will be redirected back to the
//   login page. Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/callback',
  passport.authenticate('spotify', { failureRedirect: '/' }),
  function(req, res) {
    
    /**
     * userFollowSearch calls Spotify API to receive all of the users followed artists. On the end event,
     * the users Spotify followed artists object/list is now added into the users sessino object.
     */ 
    var userFollowSearch = getFromSpotify('me/following',{
      type: 'artist'
    });
    
    userFollowSearch.on('end', function(data){
      req.session.followObj = data;

      
      res.redirect('/dashboard.html');

    });
    
    userFollowSearch.on('error', function(data){
      
      console.log(data);
    });
    
  });


/**
 * The logout endpoint will log the user out of the session and redirect to the landing page.
 */
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


/**
 * This endpoint is fired from the front end every time a user searches for a location.
 * The front-end sends long/lat coordinates as a query parameters. The eventsPerLocation function is
 * carried out which updates the locatedResults array to only contain the events near the desired location.
 * The locatedResults array is sent back to the front-end as an object.
 */
app.get('/artistLocationSearch' , function(req, res){
  
  var requestedLat = parseFloat(req.query.lat);
  var requestedLong = parseFloat(req.query.long);
  console.log(typeof requestedLong, typeof requestedLat);

  eventsPerLocation(requestedLat,requestedLong);
  res.status(200).json({located:locatedResults});

  
});

app.listen(8080);


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed. Otherwise, the user will be redirected to the
//   login page.
// function ensureAuthenticated(req, res, next) {
//   if (req.isAuthenticated()) { return next(); }
//   res.redirect('/login');
// }
