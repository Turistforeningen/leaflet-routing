/*
	Routing capability using the Leaflet framework
	Copyright (c) 2013, Turistforeningen, Hans Kristian Flaatten

	https://github.com/Turistforeningen/leaflet-routing
*/

(function() {
  "use strict";
  jQuery(function($) {        
    var service, topo, map, routing;
    
    service = window.location.hash.substr(1) || 'localhost';
    topo = L.tileLayer('http://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo2&zoom={z}&x={x}&y={y}', {
      maxZoom: 16,
      attribution: '<a href="http://www.statkart.no/">Statens kartverk</a>'
    });
    map = new L.Map('map', {layers: [topo], center: new L.LatLng(61.5, 9), zoom: 13 });
    routing = new Routing(map, service);
  
  });
}).call(this);
