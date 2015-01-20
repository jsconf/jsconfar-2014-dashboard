window.odometerOptions = {
  animation: 'count'
};

var socket = io();
var tvID = $('body').data('tv');
socket.on('last_feature_tweet', function(tweet){
  var last_feature_tweet = $('last_feature_tweet');
  $('#last_feature_tweet_avatar').attr('src',tweet.user_img);
  $('#last_feature_tweet_name').html(tweet.name);
  $('#last_feature_tweet_user').html(tweet.user);
  $('#last_feature_tweet_text').html(tweet.text);
});

socket.on('tweets_count', function(count){
  $('#tweets_counter').html(count.tweets);
});

socket.on('checkin_count', function(count){
  $('#checkin_count').html(count.swarm);
});

socket.on('yt_views_count', function(count){
  $('#yt_views_count').html(count.views);
});

socket.on('activeSpeaker', function(data){
  if (tvID == 3) {
    activeSpeaker(data.speaker);
  } else if (tvID == 2) {
    upcomingSpeakers(data.speaker)
  }
});

socket.on('forceReload', function() {
  location.reload(true);
});

socket.on('goIdle', function() {
  
})

function activeSpeaker(index) {
	
	var topBarH = $('#speakerHeader').height();
	$('#speakers article').removeClass('active');

	$('#speakers article').eq(index).addClass('active');
	setTimeout(function() {
		var offsetTop = ($('#speakers article').eq(index).offset().top-topBarH);
		$('html,body').animate({ scrollTop: offsetTop }, 'slow');
	}, 1000);

}

function upcomingSpeakers(index) {
  
  var topBarH = $('#speakerHeader').height();
  index++;
  setTimeout(function() {
    var offsetTop = ($('#speakers article').eq(index).offset().top-topBarH);
    $('html,body').animate({ scrollTop: offsetTop }, 'slow');
  }, 1000);

}