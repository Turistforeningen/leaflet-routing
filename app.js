/*
	Routing capability using the Leaflet framework
	Copyright (c) 2013, Turistforeningen, Hans Kristian Flaatten

	https://github.com/Turistforeningen/leaflet-routing
*/

var routing;

(function() {
  "use strict";
  jQuery(function($) {        
    var api, apiKey, rUrl, sUrl, topo, map, snapping, inport, myRouter;
    
    api = window.location.hash.substr(1).split('@');
    if (api.length === 2) {
      rUrl = 'http://' + api[1] + '/route/?coords='
      sUrl = 'http://' + api[1] + '/bbox/?bbox=';
      apiKey = api[0];
    } else {
      throw new Error('API auth failed');
    }
    
    topo = L.tileLayer('http://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo2&zoom={z}&x={x}&y={y}', {
      maxZoom: 16,
      attribution: '<a href="http://www.statkart.no/">Statens kartverk</a>'
    });
    
    map = new L.Map('map', {
      layers: [topo]
      ,center: new L.LatLng(61.5, 9)
      ,zoom: 13
    });
    
    // Import Layer
    inport = new L.layerGroup(null, {
      style: {
        opacity:0.5
        ,clickable:false
      }
    }).addTo(map);
    
    // Snapping Layer
    snapping = new L.geoJson(null, {
      style: {
        opacity:0
        ,clickable:false
      }
    }).addTo(map);
    map.on('moveend', function() {
      if (map.getZoom() > 12) {
        var url;        
        url = sUrl + map.getBounds().toBBoxString() + '&callback=?';
        $.getJSON(url).always(function(data, status) {
          if (status === 'success') {
            data = JSON.parse(data);
            if (data.geometries && data.geometries.length > 0) {
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
    snapping.on('click', function() {
      console.log('click click');
    });
    
    // Routing Function
    // @todo speed up geometryToLayer()
    myRouter = function(l1, l2, cb) {
      var req = $.getJSON(rUrl + [l1.lng, l1.lat, l2.lng, l2.lat].join(',') + '&callback=?');
      req.always(function(data, status) {
        if (status === 'success') {
          try {
            L.GeoJSON.geometryToLayer(JSON.parse(data)).eachLayer(function (layer) {
              return cb(null, layer);
            });
          } catch(e) {
            return cb(new Error('Invalid JSON'));
          }
        } else {
          return cb(new Error('Routing failed'));
        }        
      });
    }
    
    // Leaflet Routing Module
    routing = new L.Routing({
      position: 'topleft'
      ,routing: {
        router: myRouter
      }
      ,snapping: {
        layers: [snapping]
        ,sensitivity: 15
        ,vertexonly: false
      }
    });
    map.addControl(routing);
    routing.draw(true); // enable drawing mode
    
    $('#eta-export').hide();
    $('#eta-export').on('click', function() {
      var id = $('#eta-id').val();
      if (!id) { alert('Ingen tp_id definert!'); return; } 
      if (confirm('Eksport til ETA vil overskrive eksisterende geometri!')) {
        routing.toGeoJSON(function(res) {
          var data = [];
          for (var i = 0; i < res.length; i++) {
            data.push(res[i][1] + ' ' + res[i][0]);
          }
          data = 'LINESTRING(' + data.join(',') + ')';
          $.post('http://mintur.ut.no/lib/ajax/post_geom.php?api_key=' + apiKey + '&tp_id=' + id, {coords: data}, function(data) {
            if (data.error) {
              alert('Eksport feilet med feilkode ' + data.error);
            } else if (data.success) {
              alert('Eksport suksess!');
            }
          });
        });
      }
    });
    
    $('#eta-import').on('click', function() {      
      var id = $('#eta-id').val();
      if (!id) { alert('Ingen tp_id definert!'); return; } 
      $.get('http://mintur.ut.no/lib/ajax/post_geom.php?api_key=' + apiKey + '&tp_id=' + id, function(data) {
        if (data.error) {
          alert('Import feilet med feilkode ' + data.error);
        } else if (typeof data.coords !== 'undefined') {
          $('#eta-import').hide();
          $('#eta-export').show();
          $('#eta-id').attr('readonly', 'readonly');
          
          if (data.coords) {
            data.coords = data.coords.replace('LINESTRING(', '').replace(')', '').split(',');
            for (var i = 0; i < data.coords.length; i++) {
              data.coords[i] = new L.LatLng(data.coords[i].split(' ')[1], data.coords[i].split(' ')[0]);
            }
            inport.clearLayers();
            var p = new L.Polyline(data.coords, {clickable:false, color: '#000000', opacity: 0.4});
            inport.addLayer(p);
            map.fitBounds(p.getBounds());
          }
        }
      });
    });
    
  });
}).call(this);
