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
    
    /* $.getJSON(areaUrl + '?key=' + key + '&callback=?', function(data) {
      for (var i = 0; i < data.features.length; i++) {
        if (data.features[i].properties.edit) {
          myPolygons.addData(data.features[i]);
        } else {
          otherPolygons.addData(data.features[i]);
        }
      }
    }); */
        
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
    
    function tryToRoute() {      
      var keys = Object.keys(markers._layers);
      if (keys.length > 1) {

        var latlngs = '';
        for (var i = 0; i < keys.length; i++) {
           if (i > 0) { latlngs += ','; }
          var m = markers._layers[keys[i]];
          latlngs += m.getLatLng().lng + ',' + m.getLatLng().lat;
        }

        var url = 'http://' + router + '/route/?coords=' + latlngs + '&callback=?';
        $.get(url, function(data) {
          routes.clearLayers()
          try {
            JSON.parse(data)
            routes.addData(JSON.parse(data));
          } catch(e) {
            console.log('Could not parse JSON');
          }
        }, 'jsonp');
      }    
    };
    
    map.on('draw:created', function (e) {
      // console.log('draw:created', e);
      // waypoints.push([e.layer.getLatLng().lng, e.layer.getLatLng().lat])
      markers.addLayer(e.layer);
      tryToRoute();
            
      /* var geom, name;
      
      name = 'Uten navn';
      geom = latlngsToString(e.layer._latlngs);
      
      $.post(areaUrl + '?key=' + key + '&method=post&callback=?', {'name': name, 'geom': geom}, function(data) {
        return myPolygons.addData(data);
      },'jsonp'); */
    });
    
    map.on('draw:deleted', function (e) {
      console.log('draw:deleted', e);
      
      /* e.layers.eachLayer(function (layer) {
        var id;
        
        id = layer.feature.properties.id;
        
        $.get(areaUrl + '?key=' + key + '&method=delete&id='+id+'&callback=?', function(data) {
          // console.log(data);
        },'jsonp');
      }); */
    });
    
    map.on('draw:edited', function (e) {
      console.log('draw:edited', e);
      tryToRoute();
      
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
