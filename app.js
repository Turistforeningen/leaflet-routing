/*
	Routing capability using the Leaflet framework
	Copyright (c) 2013, Turistforeningen, Hans Kristian Flaatten

	https://github.com/Turistforeningen/leaflet-routing
*/

var routes;

(function() {
  "use strict";
  jQuery(function($) {        
    var waypoints = [];
    
    var service = window.location.hash.substr(1) || 'localhost';
    var bboxUrl = 'http://' + service + '/bbox/?bbox=';
    var topo = L.tileLayer('http://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo2&zoom={z}&x={x}&y={y}', {
      maxZoom: 16,
      attribution: '<a href="http://www.statkart.no/">Statens kartverk</a>'
    });
    var map = new L.Map('map', {layers: [topo], center: new L.LatLng(61.5, 9), zoom: 13 });
    
    // LAYERS
    var markers = new L.FeatureGroup().addTo(map);
    routes = new L.FeatureGroup().addTo(map);
    var snapping = L.geoJson(null, {style:{opacity:0}}).addTo(map);

    // MAP MOVE
    map.on('moveend', function() {
      if (map.getZoom() > 12) {
        var url = bboxUrl + map.getBounds().toBBoxString() + '&callback=?';
        $.getJSON(url).always(function(data, status) {
          if (status === 'success') {
            data = JSON.parse(data);
            if (typeof data.geometries !== 'undefined' && data.geometries.length > 0) {
              snapping.clearLayers();
              snapping.addData(data);
            }
          } else {
            console.error('Could not load snapping data');
          }          
        });
      } else {
        snapping.clearLayers();
      }
    });
    map.fire('moveend');
    
    // SNAPPING OPTIONS
    var snappingOpts = {
			enabled       : true
			,layers       : [snapping]
			,sensitivity  : 20
			,vertexonly   : false
		};
     
    // DRAW CONTROL
    var drawControl = new L.Control.Draw({
      draw: {
        position  : 'topleft'
        ,polyline  : null
        ,circle    : null
        ,rectangle : null
        ,marker    : { snapping: snappingOpts }
        ,polygon   : null
      },
      edit: {
        featureGroup: markers
      }
    })
    map.addControl(drawControl);
    
    function routeDistance(l1, l2, cb) {
        var latlngs = l1.lng + ',' + l1.lat + ',' + l2.lng + ',' + l2.lat;
        var url = 'http://' + service + '/route/?coords=' + latlngs + '&callback=?';
        var req = $.getJSON(url);
        
        req.always(function(data, status) {
          if (status === 'success') {
            try {
              L.GeoJSON.geometryToLayer(JSON.parse(data)).eachLayer(function (layer) {
                return cb(null, layer);
              });
            } catch(e) {
              return cb(true, L.GeoJSON.geometryToLayer({
                "type": "LineString",
                "coordinates": [[l1.lng, l1.lat], [l2.lng, l2.lat]]
              }));
            }
          } else {
            alert('Routing service failed!');
            return cb(true, L.GeoJSON.geometryToLayer({
              "type": "LineString",
              "coordinates": [[l1.lng, l1.lat], [l2.lng, l2.lat]]
            }));
          }          
        });        
    }
    
    function route( curr ) {
      var prev = curr.routing.prevMarker;
      var next = curr.routing.nextMarker;
      
      // PREV LINE SEGMENT
      if (prev !== null) {
        routeDistance(prev.getLatLng(), curr.getLatLng(), function(error, layer) {
          if (curr.routing.prevLine !== null) {
            routes.removeLayer(curr.routing.prevLine);
          }
          routes.addLayer(layer);
          curr.routing.prevLine = layer;
          prev.routing.nextLine = layer;
        });
      }
      
      // NEXT LINE SEGMENT
      if (next !== null) {
        var timeout = (prev !== null ? 1500 : 0);
        setTimeout(function() {
          routeDistance(curr.getLatLng(), next.getLatLng(), function(error, layer) {
            if (curr.routing.nextLine !== null) {
              routes.removeLayer(curr.routing.nextLine);
            }
            routes.addLayer(layer);
            curr.routing.nextLine = layer;
            next.routing.prevLine = layer;
          });
        }, timeout);
      }
    }

    var prevMarker = null;
    
    // MARKER CREATED
    map.on('draw:created', function (e) {
      e.layer.routing = {
        prevMarker: prevMarker
        ,nextMarker: null
        ,prevLine: null
        ,nextLine: null
      };
      prevMarker = e.layer;
      markers.addLayer(e.layer);
      e.layer.dragging.enable();
      if (e.layer.routing.prevMarker !== null) {
        e.layer.routing.prevMarker.routing.nextMarker = e.layer;
        route(e.layer);
      }
      var timerID = null;
      e.layer.on('drag', function(e) {
        this.setLatLng(L.LineUtil.snapToLayers(this.getLatLng(), this._leaflet_id, snappingOpts));	
        clearTimeout(timerID);
        timerID = setTimeout(function(marker) {
          route(marker);
        }, 1000, this);
      });
      e.layer.on('dragstop', function(e) {
        route(this);
      });
      e.layer.on('dragend', function(e) {
        route(this);
      });
    });
    
    // MARKER DELETED
    map.on('draw:deleted', function (e) {});
    
    // MARKER EDITED
    map.on('draw:edited', function (e) {
      var i = 0;
      var fn = function(l) { return route(l); }
      e.layers.eachLayer(function (layer) {
        setTimeout(fn, (i*3000), layer);
        i++;
      });
    });
  });
}).call(this);
