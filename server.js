/*
 * JSConfDashboard
 * Real-time data for TVs during the JSConfar.com event
 * version: 1.0.0
 * html://aerolab.co/
 */


var config = require("./config.json"); // Load config
var speakers = require("./speakers.json"); // Load agenda 

// Server modules
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var hbs = require('hbs'); // Handlebars Templating Engine


var unirest = require('unirest'); // For Generic API Request
// Store some data
var storage = require('node-persist'); // Easily store some data. Just in case of a restart
storage.initSync();


var port = process.env.PORT || 5000
var ip = "0.0.0.0"

app.set('view engine', 'html');
app.engine('html', require('hbs').__express);

app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(__dirname + '/views/partials');

app.use(express.static(path.join(__dirname, 'public')));

hbs.registerHelper('ifCond', function(v1, v2, options) {
  if(v1 === v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

var activeSpeaker = storage.getItem('activeSpeaker');


// http://localhost:port/tv/1
// First TV located on lobby that shows stats
app.get("/tv/1", function(req, res){
    res.render('stats');
});

// http://localhost:port/tv/2
// Second TV located on lobby that displays venue map and the next two upcoming speakers
app.get("/tv/2", function(req, res){
    res.render('upcoming', {
      talks: speakers.talks,
      activeSpeaker: activeSpeaker
    });
});

// http://localhost:port/tv/3
// Third TV located on second floor thats features current speaker
app.get("/tv/3", function(req, res){
    res.render('speakers', {
      talks: speakers.talks,
      activeSpeaker: activeSpeaker
    });
});

// http://localhost:port/control/randomhash
// Simple mobile control for controlling active spekers
app.get("/control/randomhash", function(req, res){
    res.render('mobile_menu', {
      talks: speakers.talks,
      activeSpeaker: activeSpeaker
    });
});

function sendStoredData() {
  io.sockets.emit('activeSpeaker',{ speaker: storage.getItem('activeSpeaker')});
  io.sockets.emit('tweets_count',{ tweets: storage.getItem('tweets_count')});
  io.sockets.emit('last_feature_tweet', storage.getItem('last_feature_tweet'));
  io.sockets.emit('checkin_count',{ swarm: storage.getItem('checkin_count')});
  io.sockets.emit('yt_views_count',{ views: storage.getItem('yt_views_count') });
}


io.on('connection', function(socket){
  console.log('TV connected');
  sendStoredData(); // Send latest saved data
  socket.on('disconnect', function(){
    console.log('TV disconnected');
  });

  // Change active speaker to chosen one
  socket.on('setActiveSpeaker', function (data) {  
    activeSpeaker = data.speaker;
    io.sockets.emit('activeSpeaker', {speaker: activeSpeaker});
    storage.setItem('activeSpeaker', activeSpeaker);

    // This request was used to send active speaker to main JSConfar website
    // Besides the main stream it showed actual speaker
    /*    
    unirest.post('https://domain/push/speaker')
      .headers({ 'Accept': 'application/json' })
      .send({ "token": 'randomhash', "speaker": activeSpeaker })
      .end(function (response) {});
    */
  });

  // Change active speaker to next in line
  socket.on('nextSpeaker', function () {
    activeSpeaker++;
    io.sockets.emit('activeSpeaker', {speaker: activeSpeaker});
    storage.setItem('activeSpeaker', activeSpeaker);

    // This request was used to send active speaker to main JSConfar website
    // Besides the main stream it showed actual speaker
    /*    
    unirest.post('https://domain/push/speaker')
      .headers({ 'Accept': 'application/json' })
      .send({ "token": 'randomhash', "speaker": activeSpeaker })
      .end(function (response) {});
    */
  });

  // Just in case... reload (F5) TV browser
  socket.on('doForceReload', function () {
    io.sockets.emit('forceReload');
  });
});

// Load Twitter module
// Only initialize if we have credentials
if (config.twitter.consumer_key) {

  var Twit = require('twit');
  var T = new Twit({
      consumer_key: config.twitter.consumer_key,
      consumer_secret: config.twitter.consumer_secret,
      access_token: config.twitter.access_token_key,
      access_token_secret: config.twitter.access_token_secret
  });

  // Via Twitter Streaming API get favs from desired user
  var featuredTweets = T.stream('user')
  featuredTweets.on('favorite', function (data) {
    if (typeof data  != "undefined") {
      if (typeof data.target_object.user.name != "undefined") {
        var tweet = data.target_object;
        var last_tweet = {name: tweet.user.name, user: '@'+tweet.user.screen_name, user_img: tweet.user.profile_image_url.replace('_normal', '_bigger'), text: tweet.text }
        io.sockets.emit('last_feature_tweet', last_tweet); // Send tweet to TV
        storage.setItem('last_feature_tweet', last_tweet); // Store tweet
      }
    }
  });

  // Count all tweets with JSConfar with Streaming API.
  var countTweets = T.stream('statuses/filter', { track: config.twitter.hash })
  var tweetsCount = storage.getItem('tweets_count');
  countTweets.on('tweet', function (tweet) {
    tweetsCount++; // Sum every tweet
  });

  setInterval(function() {
    // Every 1500ms send amount of tweets to tv
    // It could be done with io.sockets.emit for every ++ but it breaks the animation of the counter
    io.sockets.emit('tweets_count',{ tweets: tweetsCount});
    storage.setItem('tweets_count',tweetsCount);
    return;
  }, 1500);

}

// Foursquare
if (config.foursquare.client_id) {
  // Get amount of users hereNow
  var getCheckins = function() {
    var foursquare = require('node-foursquare-venues')(config.foursquare.client_id, config.foursquare.client_secret);
    foursquare.venues.venue(config.foursquare.venue, function(err, data) {
      if (err == null) {
        io.sockets.emit('checkin_count',{ swarm: data.response.venue.hereNow.count});
        storage.setItem('checkin_count',data.response.venue.hereNow.count);
      }
    });
  }
  // Do request every 2 secs
  setInterval(getCheckins, 2000);
}


// Youtube
if (config.youtube.live) {
  // Get amount of live viewers on stream
  // There was no API to get "live" viewers of a live feed. Only found this status request
  var getYTViews = function() {
    unirest.get('https://www.youtube.com/live_stats?v='+config.youtube.live)
    .end(function (response) {
      var video = response.body;
      io.sockets.emit('yt_views_count',{ views: video });
      storage.setItem('yt_views_count',video);
    });
  }
  // Do request every 2 secs
  setInterval(getYTViews, 2000);
}




// Initialize Server
var server = http.listen(port, ip, function() {
    console.log('Listening on port %d', server.address().port);
});