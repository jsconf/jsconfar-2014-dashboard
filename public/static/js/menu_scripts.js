var socket = io();

$(document).ready(function(){

	$('#selectSpeakers a').on('click', function(e) {
		e.preventDefault();
		socket.emit('setActiveSpeaker', { speaker: $(this).index() });
	});
  $('#nextSpeaker').on('click', function(e) {
    e.preventDefault();
    socket.emit('nextSpeaker');
  });
  $('#doForceReload').on('click', function(e) {
    e.preventDefault();
    socket.emit('doForceReload');
  });
});