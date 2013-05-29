/*
	Routing capability using the Leaflet framework
	Copyright (c) 2013, Turistforeningen, Hans Kristian Flaatten

	https://github.com/Turistforeningen/leaflet-routing
*/
(function() {
  "use strict";
  jQuery(function($) {        
    var waypoints = [];
    
    var router = window.location.hash.substr(1) || 'localhost';
    var topo = L.tileLayer('http://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo2&zoom={z}&x={x}&y={y}', {
      maxZoom: 16,
      attribution: '<a href="http://www.statkart.no/">Statens kartverk</a>'
    });
    var map = new L.Map('map', {layers: [topo], center: new L.LatLng(61.5, 9), zoom: 12 });
    
    var markers = L.geoJson(null, {
      style: function (feature) {
    		return {color: 'blue'};
    	}
      /* ,onEachFeature: function(feature, layer) {
        feature.properties.name = $("<div/>").html(feature.properties.name).text();
        layer.bindPopup(feature.properties.name);
        return true;
      } */
    }).addTo(map);
    
    var routes = L.geoJson(null, {
      style: function (feature) {
    		return {color: 'green'};
    	}
    	/* ,onEachFeature: function(feature, layer) {
        feature.properties.name = $("<div/>").html(feature.properties.name).text();
        layer.bindPopup('Navn: <input name="'+feature.properties.id+'" type="text" value="'+feature.properties.name+'" onchange="featureSaveName(this.name, this.value)"><button>Lagre</button>');
        return true;
      } */
    }).addTo(map);
            
    var drawControl = new L.Control.Draw({
      draw: {
        position  : 'topleft'
        ,polyline  : null
        ,circle    : null
        ,rectangle : null
        /* ,marker    : null */
        ,polygon   : null
      },
      edit: {
        featureGroup: markers,
        edit: {
          selectedPathOptions: {
            color: 'red',
            opacity: 0.8
          }
        }
      }
    });
    map.addControl(drawControl);
    
    function routeDistance(l1, l2, cb) {
        var latlngs = l1.lng + ',' + l1.lat + ',' + l2.lng + ',' + l2.lat;
        var url = 'http://' + router + '/route/?coords=' + latlngs + '&callback=?';
        $.get(url, function(data) {
          try {
            L.GeoJSON.geometryToLayer(JSON.parse(data)).eachLayer(function (layer) {
              // console.log('route');
              return cb(null, layer);
            });
          } catch(e) {
            // console.log('no route');
            return cb(true, L.GeoJSON.geometryToLayer({
              "type": "LineString",
              "coordinates": [[l1.lng, l1.lat], [l2.lng, l2.lat]]
            }));
          }
        }, 'jsonp').fail(function() {
          alert('Routing service failed!');
          return cb(true, L.GeoJSON.geometryToLayer({
            "type": "LineString",
            "coordinates": [[l1.lng, l1.lat], [l2.lng, l2.lat]]
          }));
        });
    }
    
    function route( curr ) {
      var prev = curr.routing.prevMarker;
      var next = curr.routing.nextMarker;
      
      // Previous line segment
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
      
      // Next line segment
      if (next !== null) {
        var timeout = (prev !== null ? 1500 : 0);
        // console.log('timeout', timeout);
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
    map.on('draw:created', function (e) {
      e.layer.routing = {
        prevMarker: prevMarker
        ,nextMarker: null
        ,prevLine: null
        ,nextLine: null
      };
      prevMarker = e.layer;
      markers.addLayer(e.layer);
      if (e.layer.routing.prevMarker !== null) {
        e.layer.routing.prevMarker.routing.nextMarker = e.layer;
        route(e.layer);
      }
    });
    
    map.on('draw:deleted', function (e) {
      // console.log('draw:deleted', e);
      
      /* e.layers.eachLayer(function (layer) {
        var id;
        
        id = layer.feature.properties.id;
        
        $.get(areaUrl + '?key=' + key + '&method=delete&id='+id+'&callback=?', function(data) {
          // console.log(data);
        },'jsonp');
      }); */
    });
    
    map.on('draw:edited', function (e) {
      // console.log('draw:edited', e);
      var i, fn;
      
      i = 0;
      fn = function(l) { return route(l); }
      e.layers.eachLayer(function (layer) {
        setTimeout(fn, (i*3000), layer);
        i++;
      });
      
      //
      
      /* e.layers.eachLayer(function (layer) {
        var id, name, geom;
        
        id = layer.feature.properties.id;
        name = layer.feature.properties.name;
        geom = latlngsToString(layer._latlngs);
        
        $.post(areaUrl + '?key=' + key + '&method=post&id='+id+'&callback=?', {'name': name, 'geom': geom}, function(data) {
          // return myPolygons.addData(data);
        },'jsonp');
      }); */
    });
  });
}).call(this);
