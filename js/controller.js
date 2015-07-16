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

function drawRequestsPath(coordinates) {
	var flightPath = new google.maps.Polyline({
		path: coordinates,
		geodesic: true,
		strokeColor: "#000000",
		strokeOpacity: 0.6,
		strokeWeight: 2
	});

	flightPath.setMap(map);
}

function drawPathBetween(start, end) {
	var flightPath = new google.maps.Polyline({
		path: [start, end],
		geodesic: true,
		strokeColor: "#000000",
		strokeOpacity: 0.6,
		strokeWeight: 2
	});

	flightPath.setMap(map);
}

function initializeNetworkMap() {
	$.ajax({
		type: "GET",
		url: url,
		success: function(data){

			var IPLocationAssoc = {}; // Keep a trace of IP's location

			$.each(data, function(i, item) {
				if (data[i].hasOwnProperty('body')) { // Parse JSON
					var info = data[i].body[0];
					var latitude = info.latitude; var longitude = info.longitude; 
                	var scan_url = info.scan_url; var scan_ping = info.scan_ping;
	                var scan_ttl = info.scan_ttl; var scan_trace = info.scan_trace;

					setGoogleMapPosition(info.latitude,info.longitude); // Set Google map center position

					var myLatlng = new google.maps.LatLng(info.latitude,info.longitude); // First location

					var meta_os = "N/A"; var meta_time = "N/A"; // Parse metadata
					if (data[i].hasOwnProperty('metadata')) {
						meta_os = data[i].metadata.device;
						meta_time = data[i].metadata.timestamp;
					}

					var trace_output = "";
					var first_router;
					var requestsPlanCoordinates = new Array();

					$.each(scan_trace, function(i, item) { // Parse traceroute JSON
						var ip = scan_trace[i].ip;
						var ping = scan_trace[i].ping;
						var ttl = scan_trace[i].ttl;

						trace_output += "["+ttl+"] " + ip + " (" + ping + "ms)<br/>"; // Build output

						// Search inside IP's location we already got
						if (ip in IPLocationAssoc) {
							if (IPLocationAssoc[ip] != 0 && IPLocationAssoc[ip] != 0) {
								requestsPlanCoordinates.push(IPLocationAssoc[ip]);
								createRouterMarker(IPLocationAssoc[ip]);
							}
						} else {
							$.ajax({
								url: "http://api.hostip.info/get_json.php?ip="+ip+"&position=true",
								dataType: 'json',
								async: false, // <- This might be a problem
								success: function(data) {
									var latlng = new google.maps.LatLng(data.lat, data.lng);
									IPLocationAssoc[ip] = latlng;
									if (latlng.lat() != 0 && latlng.lng() != 0) {
										requestsPlanCoordinates.push(latlng);
										createRouterMarker(latlng);
										
										if (!first_router) { first_router = latlng ; }
									}
								}
							});
						}
					});

					// Draw first link between position and first router found
					if (first_router) drawPathBetween(myLatlng, first_router);
					drawRequestsPath(requestsPlanCoordinates);

					// Build current location marker and infoWindow associated
					var marker = new google.maps.Marker({
						position: myLatlng,
						map: map,
						title: 'Performances monitoring'
					});

					var contentString =
						"<h4>Metadata</h4><p>Device OS : " + meta_os + "<br/>At : " + meta_time + "</p>" +
						"<h4>Geolocalisation</h4><p>Latitude : " + latitude + "<br/>Longitude : " + longitude + "</p>" +
						"<h4>Scan</h4><p>Target : " + scan_url + "<br/>Latency : " + scan_ping + " ms<br/>TTL max : " + scan_ttl + "<br/>Traceroute :<br/>" + trace_output +"</p>";

					var infowindow = new google.maps.InfoWindow({
					  content: contentString
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