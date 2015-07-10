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

function createRouterMarker(coordinates) {
	return new google.maps.Marker({
		position: coordinates,
		map: map,
		icon: "http://icons.iconarchive.com/icons/fatcow/farm-fresh/32/router-icon.png",
		title: 'Router'
	});
}

function getRandomColor() {
    var letters = '0123456789ABCD'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function drawRequestsPath(coordinates, url) {
	var flightPath = new google.maps.Polyline({
		path: coordinates,
		geodesic: true,
		strokeColor: getRandomColor(),
		strokeOpacity: 0.5,
		strokeWeight: 2
	});

	flightPath.setMap(map);
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

					setGoogleMapPosition(info.latitude,info.longitude);

					var myLatlng = new google.maps.LatLng(info.latitude,info.longitude);

					var meta_os = "N/A";
					var meta_time = "N/A";

					// Metadata
					if (data[i].hasOwnProperty('metadata')) {
						meta_os = data[i].metadata.device;
						meta_time = data[i].metadata.timestamp;
					}

					var trace_output = "";

					var requestsPlanCoordinates = new Array();
					$.each(scan_trace, function(i, item) {
						var ip = scan_trace[i].ip;
						var ping = scan_trace[i].ping;
						var ttl = scan_trace[i].ttl;

						trace_output += "["+ttl+"] " + ip + " (" + ping + "ms)<br/>";

						$.ajax({
							url: "http://api.hostip.info/get_json.php?ip="+ip+"&position=true",
							dataType: 'json',
							async: false,
							success: function(data) {
								var latlng = new google.maps.LatLng(data.lat, data.lng);

								if (latlng.lat() != 0 && latlng.lng() != 0) {
									requestsPlanCoordinates.push(latlng);
									createRouterMarker(latlng, scan_url);
								}
							}
						});
					});
					drawRequestsPath(requestsPlanCoordinates);

					var contentString =
						"<h4>Metadata</h4><p>Device OS : " + meta_os + "<br/>At : " + meta_time + "</p>" +
						"<h4>Geolocalisation</h4><p>Latitude : " + latitude + "<br/>Longitude : " + longitude + "</p>" +
						"<h4>Scan</h4><p>Target : " + scan_url + "<br/>Latency : " + scan_ping + " ms<br/>TTL max : " + scan_ttl + "<br/>Traceroute :<br/>" + trace_output +"</p>";

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