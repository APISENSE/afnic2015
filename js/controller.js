// Configuration
var strokeWeight = 2;
var strokeOpacity = 0.3;

// Display
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

/* 
 * Set google map position to (latitude, longitude)
 */
function setGoogleMapPosition(latitude, longitude) {
	map.setCenter({lat: latitude, lng: longitude});
}

/* 
 * Create a Router marker on the map
 */
function createRouterMarker(coordinates) {
	return new google.maps.Marker({
		position: coordinates,
		map: map,
		icon: "https://cdn2.iconfinder.com/data/icons/gnomeicontheme/32x32/places/gnome-fs-server.png", // Router
		title: 'Router'
	});
}

/* 
 * Create a server marker on the map
 */
function createFinalRouterMarker(coordinates) {
	return new google.maps.Marker({
		position: coordinates,
		map: map,
		icon: "https://cdn3.iconfinder.com/data/icons/fatcow/32x32/server_lightning.png", // Star
		title: 'Final server'
	});
}


/* 
 * Draw a path between each LatLng object in coordinates array
 */
function drawRequestsPath(coordinates) {
	var flightPath = new google.maps.Polyline({
		path: coordinates,
		geodesic: true,
		strokeColor: "#000000",
		strokeOpacity: strokeOpacity,
		strokeWeight: strokeWeight
	});

	flightPath.setMap(map);
}

/* 
 * Draw link between start and end LatLng
 */
function drawPathBetween(start, end) {
	var flightPath = new google.maps.Polyline({
		path: [start, end],
		geodesic: true,
		strokeColor: "#000000",
		strokeOpacity: strokeOpacity,
		strokeWeight: strokeWeight
	});

	flightPath.setMap(map);
}


function displayStats(traces, routers, ping) {
	$('#nb-of-traces').text(traces);
	$('#nb-of-routers').text(routers);
	$('#avg-ping').text(ping);
}

/*
 *
 */
function parseJSON(data, callback) {

	// Stats
	var numberOfTraces = data.length - 1;
	var numberOfRouters = 0;
	var avgPing = 0;

	// Loading
	var callsMade = 0;
	var callsDone = 0;
	document.getElementsByClassName("progress")[0].style.display = "block";
	$('.progress-bar').css('width', '0%').attr('aria-valuenow', 0).text('0%'); 

	var IPLocationAssoc = {}; // Keep a trace of IP's location
	var markersToClusterize = [];

	if (data.length == 0) {
		document.getElementById("feedback").style.display = "block";
	} else {
		document.getElementById("feedback").style.display = "none";
	}

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
			var requestsPlanCoordinates = [];
			var numberOfEntries = scan_trace.length;

			var addCoordinate = function(coordinates, isLast) {
				if (coordinates.lat() != 0 && coordinates.lng() != 0) {
					requestsPlanCoordinates.push(coordinates);
					if (isLast) { createFinalRouterMarker(coordinates); } else { createRouterMarker(coordinates); }
					if (!first_router) { first_router = coordinates ; }
				}
			}

			var calls = [];
			$.each(scan_trace, function(i, item) { // Parse traceroute JSON
				var ip = scan_trace[i].ip;
				var ping = scan_trace[i].ping;
				var ttl = scan_trace[i].ttl;

				avgPing += ping;

				trace_output += "["+ttl+"] " + ip + " (" + ping + "ms)<br/>"; // Build output

				// Search inside IP's location we already got
				if (ip != "*") {
					if (ip in IPLocationAssoc) {
						addCoordinate(IPLocationAssoc[ip], (i == numberOfEntries));
					} else {
						callsMade += 1;
						calls.push($.getJSON("http://freegeoip.net/json/"+ip, function(data) {
							var latlng = new google.maps.LatLng(data.latitude, data.longitude);
							IPLocationAssoc[ip] = latlng;
							addCoordinate(latlng, (i == numberOfEntries - 1));
							
							// Stats
							if (latlng.lat() != 0 && latlng.lng() != 0) numberOfRouters += 1;

							// Loading feedback
							callsDone += 1;
							var currentPercentage = Math.round((callsDone / callsMade) * 100);
							$('.progress-bar').css('width', currentPercentage+'%').attr('aria-valuenow', currentPercentage).text(currentPercentage+'%'); 
							if (currentPercentage == 100) {
								setTimeout(function() {
								 $(document.getElementsByClassName("progress")[0]).fadeOut("slow");
								}, 1000 );
							}
						}));
					}
				}
			});

			// Draw first link between position and first router found
			$.when.apply($, calls).then(function() {
				if (first_router) drawPathBetween(myLatlng, first_router);
				drawRequestsPath(requestsPlanCoordinates);
				displayStats(numberOfTraces, numberOfRouters, Math.round(avgPing / numberOfRouters));
		    });

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

			markersToClusterize.push(marker);
		}
	});

	callback(markersToClusterize);	
}

/* 
 * Retrieve data from Honeycomb
 */
function initializeNetworkMap() {
	$.ajax({
		type: "GET",
		url: url,
		success: function(data){
			parseJSON(data, function(markersToClusterize) {
				var mcOptions = {gridSize: 50, maxZoom: 7};
				new MarkerClusterer(map, markersToClusterize, mcOptions); // Create cluster map
				// var oms = new OverlappingMarkerSpiderfier(map);			
			});
		}
	});
}