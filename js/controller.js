$(document).ready(function() {
	var browerHeight = $(window).height(),
		navHeight = $('.navbar-aps').height(),
		formHeight = $('#wrapper-form').height(),
		footerHeight = $('.footer').height()+60;

	// Set map height
	if(browerHeight>640) {
		$('#map-canvas').height(browerHeight - navHeight - formHeight - footerHeight);
		$('.container-fluid').addClass('nomargin stickytonav');
	}

	$(".close-alert").click(function() {
  		$(".alert").hide();
	});
});

// Deciders
$("#mapFilterForm").submit( function() {
	// "input:radio[name=mapType]:checked" ).val()
	initialize();
	initializeNetworkMap();
	
	return false;
 });

$("#cleanMap").click( function() {
	initialize();
 });

function setGoogleMapPosition(latitude, longitude) {
	map.setCenter({lat: latitude, lng: longitude});
}

function initializeNetworkMap() {
	$.ajax({
		type: "GET",
		url: url,
		success: function(data){
			$.each(data, function(i, item) {
				if (data[i].hasOwnProperty('body')) {
					var info = data[i].body[0];
					var latitude = info.latitude;
                	var longitude = info.longitude;
            
                	var scan_url = info.scan_url;
	                var scan_ping = info.scan_ping;
	                var scan_ttl = info.scan_ttl;
	                var scan_trace = info.scan_trace;
	                
	                var download_url = info.download_url;
	                var download_speed_mbps = info.download_speed_mbps;
	                var download_time_seconds = info.download_time_seconds;
	                var download_size_bytes = info.download_size_bytes;

					setGoogleMapPosition(info.latitude,info.longitude);

					var myLatlng = new google.maps.LatLng(info.latitude,info.longitude);

					var meta_os = "unknwon";
					var meta_time = "unknwon";

					// Metadata
					if (data[i].hasOwnProperty('metadata')) {
						meta_os = data[i].metadata.device;
						meta_time = data[i].metadata.timestamp;
					}

					var contentString =
						"<h4>Metadata</h4><p>Device OS : " + meta_os + "<br/>At : " + meta_time + "</p>" +
						"<h4>Geolocalisation</h4><p>Latitude : " + latitude + "<br/>Longitude : " + longitude + "</p>" +
						"<h4>Scan</h4><p>Target : " + scan_url + "<br/>Latency : " + scan_ping + " ms<br/>TTL max : " + scan_ttl + "</p>" +
						"<h4>Download Stats</h4><p>Target : " + download_url + "<br/>Speed : " + download_speed_mbps + " mbps<br/>File size : " + download_size_bytes + " bytes<br/>Time : " + download_time_seconds + " seconds</p>";

					var infowindow = new google.maps.InfoWindow({
					  content: contentString
					});

					var marker = new google.maps.Marker({
					  position: myLatlng,
					  map: map,
					  title: 'Performances monitoring'
					});

					google.maps.event.addListener(marker, 'click', function() {
						if (lastInfoWindow) lastInfoWindow.close(); // Close last infoWindow
						infowindow.open(map,marker);
						lastInfoWindow = infowindow; // Keep track of the last infoWindow
					});

					google.maps.event.addDomListener(window, 'load', initialize);
				}
			});
		}
	});
}