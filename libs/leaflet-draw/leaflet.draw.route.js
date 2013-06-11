/*
	Routing capability using the Leaflet framework
	Copyright (c) 2013, Turistforeningen, Hans Kristian Flaatten

	https://github.com/Turistforeningen/leaflet-routing
*/

function Routing(map, api) {
  this.map = map;
  this.api = api;
  
  this.apiBbox = 'http://' + this.api + '/bbox/?bbox=';
  this.apiRout = 'http://' + this.api + '/route/?coords=';
  
  this.layer = {
    waypoints : new L.FeatureGroup().addTo(this.map)
    ,segments : new L.FeatureGroup().addTo(this.map)
    ,snapping : new L.geoJson(null, {style:{opacity:0}}).addTo(this.map)
  }
  
  this.prevWaypoint = null;
    
  /**
   * Init routing
   *
   * @access private
   *
   * @return void
  */
  this._init = function() {
    this.map.on('moveend', this._bboxReload, this);
    this.map.fire('moveend');
    
    this._initDrawing();
    
    this._mouseMarker = L.marker([0, 0], {
      icon: L.divIcon({
        className: 'leaflet-routing-mouse-marker'
        ,iconAnchor: [7, 7]
        ,iconSize: [14, 14]
      })
      ,opacity: 1
    });
    this._mouseMarker.addTo(this.map);
    this._mouseMarker.dragging.enable();
    
    this._mouseMarker.on('drag', function(e) {
      var marker, id, latlng;
      
      marker = e.target;
      id     = marker._leaflet_id;
      latlng = L.LineUtil.snapToLayers(marker._latlng, id, this._snappingOpts);
    
      marker.setLatLng(latlng);	
    }, this);
    
    this._mouseMarker.on('dragend', function(e) {
      var marker, prev, next;
      
      marker = L.marker(e.target._latlng);
      prev = this._mouseMarker._feature.routing.prevMarker;
      next = this._mouseMarker._feature.routing.nextMarker;
      
      this.addWaypoint(marker, prev, next);
    }, this);

    
    // @todo stop this madness while drawing!!!!
    this.map.on('mousemove', function(e) {
      var latlng = L.LineUtil.snapToLayers(e.latlng, null, {
        enabled       : true
        ,layers       : [this.layer.segments]
        ,sensitivity  : 40
      });
            
      if (latlng._feature === null) {
        this._mouseMarker.setLatLng([0,0]);
      } else {
        this._mouseMarker.setLatLng(latlng);
        this._mouseMarker._feature = latlng._feature;
      }
    }, this);
  };
  
  /**
   * Init Leaflet draw
   *
   * @access private
   *
   * @return void
  */
  this._initDrawing = function() {
    this._snappingOpts = {
			enabled       : true
			,layers       : [this.layer.snapping]
			,sensitivity  : 20
			,vertexonly   : false
		};
     
    this._drawControl = new L.Control.Draw({
      draw: {
        position  : 'topleft'
        ,polyline  : null
        ,circle    : null
        ,rectangle : null
        ,marker    : { snapping: this._snappingOpts }
        ,polygon   : null
      },
      edit: {
        featureGroup: this.layer.waypoints
      }
    });
    this.map.addControl(this._drawControl);
    
    this.map.on('draw:created', this._markerOnCreated, this);
    this.map.on('draw:deleted', this._markerOnDeleted, this);
    this.map.on('draw:edited', this._makererOnEdited, this);
  }
  
  /**
   * Realod snapping data using bbox api
   *
   * @access private
   *
   * return void
  */
  this._bboxReload = function() {
    if (this.map.getZoom() > 12) {
      var url, $this;
      
      url = this.apiBbox + this.map.getBounds().toBBoxString() + '&callback=?';
      $this = this;
      
      $.getJSON(url).always(function(data, status) {
        if (status === 'success') {
          data = JSON.parse(data);
          if (typeof data.geometries !== 'undefined' && data.geometries.length > 0) {
            $this.layer.snapping.clearLayers();
            $this.layer.snapping.addData(data);
          }
        } else {
          console.error('Could not load snapping data');
        }          
      });
    } else {
      this.layer.snapping.clearLayers();
    }
  }
  
  this._markerOnCreated = function( e ) {
    if (e.layerType == 'marker') {
      this.addWaypoint(e.layer, this.prevWaypoint, null);
      this.prevWaypoint = e.layer;
    } else {
      console.error('routing._markerOnCreated unsupported type', e.layerType);
    }
  };
  
  this._markerOnDeleted = function() {
    console.log('_markerOnDeleted');
  };
  
  /**
   * Marker 
  */
  this._makererOnEdited = function() {
    /* var i = 0;
    var fn = function(l) { return route(l); }
    e.layers.eachLayer(function (layer) {
      setTimeout(fn, (i*3000), layer);
      i++;
    }); */
  };
  
  /**
   * Called when marker is being dragged
   *
   * @access private
   *
   * @param <L.Event> e - marker drag event
   *
   * @return void
  */
  this._markerOnDrag = function(e) {
    var $this, marker, latlng, id;
    
    $this  = this;
    marker = e.target;
    latlng = marker.getLatLng();
    id     = marker._leaflet_id;
    
    marker.setLatLng(L.LineUtil.snapToLayers(latlng, id, this._snappingOpts));	
    
    clearTimeout(marker.routing.timeoutID);
    marker.routing.timeoutID = setTimeout(function(m) {
      $this._routeWaypoint(m);
    }, 1000, marker);
  };
  
  /**
   * Marker on click
   *
   * @access private
   *
   * @param <L.Marker> marker - new waypoint marker
   * @param <Function> cb - callback method
   *
   * @return void
  */
  this._markerOnClick = function(e) {
    var marker;
    
    marker = e.layer;
    
    if (this.prevWaypoint._leaflet_id === marker._leaflet_id) {
      this.prevWaypoint = marker.routing.prevMarker;
    }

    if (marker.routing.prevMarker !== null) {
      marker.routing.prevMarker.routing.nextMarker = marker.routing.nextMarker;
      marker.routing.prevMarker.routing.nextLine = null;
    }
    
    if (marker.routing.nextMarker !== null) {
      marker.routing.nextMarker.routing.prevMarker = marker.routing.prevMarker;
      marker.routing.nextMarker.routing.prevLine = null;
    }
    
    if (marker.routing.nextLine !== null) {
      this.layer.segments.removeLayer(marker.routing.nextLine);
    }

    if (marker.routing.prevLine !== null) {
      this.layer.segments.removeLayer(marker.routing.prevLine);
    }
    
    if (marker.routing.prevMarker !== null) {
      this._routeWaypoint(marker.routing.prevMarker);
    } else if (marker.routing.nextMarker !== null) {
      this._routeWaypoint(marker.routing.nextMarker);
    }
    
    this.layer.waypoints.removeLayer(marker); 
  };

  /**
   * Add new waypoint to path
   *
   * @access public
   *
   * @param <L.Marker> marker - new waypoint marker
   * @param <L.Marker> prev - previous waypoint marker
   * @param <L.Marker> next - next waypoint marker
   * @param <Function> cb - callback method
   *
   * @return void
  */
  this.addWaypoint = function( marker, prev, next, cb ) {
    var $this = this;
        
    marker.routing = {
      prevMarker  : prev
      ,nextMarker : next
      ,prevLine   : null
      ,nextLine   : null
      ,timeoutID  : null
    };
    
    if (marker.routing.prevMarker !== null) {
      marker.routing.prevMarker.routing.nextMarker = marker;
      marker.routing.prevLine = marker.routing.prevMarker.routing.nextLine;
      if (marker.routing.prevLine !== null) {
        marker.routing.prevLine.routing.nextMarker = marker;
      }
    }
    
    if (marker.routing.nextMarker !== null) {
      marker.routing.nextMarker.routing.prevMarker = marker;
      marker.nextLine = marker.routing.nextMarker.routing.prevLine;
      if (marker.routing.nextLine !== null) {
        marker.routing.nextLine.routing.prevMarker = marker;
      }
    }

    this.layer.waypoints.addLayer(marker);
    marker.dragging.enable();
    marker.on('drag', this._markerOnDrag, this);
    marker.on('click', this._markerOnClick, this);
    
    $this._routeWaypoint(marker, function(err, data) {
      if (typeof cb === 'function') {
        cb(err, data);
      }
    });
  }
    
  /**
   * Route with respect to waypoint
   *
   * @access private
   *
   * @param <L.Marker> marker - marker to route on
   * @param <Function> cb - callback function
   *
   * @return void
  */
  this._routeWaypoint = function(marker, cb) {
    
    if (marker === null) {
      return cb(null, true);
    }
    
    var $this = this;
    
    $this._routeSegment(marker.routing.prevMarker, marker, function(err, data) {
      setTimeout(function() {
        $this._routeSegment(marker, marker.routing.nextMarker, function(err, data) {
          if (typeof cb === 'function') {
            return cb(null, true);
          }
        });      
      }, 1500);
    });
  }
  
  /**
   * Route segment between two markers
   *
   * @access private
   *
   * @param <L.Marker> m1 - first waypoint marker
   * @param <L.Marker> m2 - second waypoint marker
   * @param <Function> cb - callback function (<Error> err, <String> data)
   *
   * @return void
  */
  this._routeSegment = function(m1, m2, cb) {
    
    if (m1 === null || m2 === null) {
      return cb(null, true);
    }
    
    var $this = this;
    
    this.getRoute(m1.getLatLng(), m2.getLatLng(), function(error, layer) {
      layer.routing = {
        prevMarker: m1
        ,nextMarker: m2
      };
      
      if (m1.routing.nextLine !== null) {
        $this.layer.segments.removeLayer(m1.routing.nextLine);
      }
      $this.layer.segments.addLayer(layer);      
      
      m1.routing.nextLine = layer;
      m2.routing.prevLine = layer;
      
      cb(null, true);
    });
  }
  
  /**
   * Get route between two coordinates
   *
   * @access public
   * 
   * @param <L.Latlng> l1 - first coordinate
   * @param <L.Latlng> l2 - second coordinate
   * @parama <Function> cb - callback function (<Error> err, <ILayer> l)
   *
   * @return void
  */
  this.getRoute = function(l1, l2, cb) {
    var latlngs, req;
    
    latlngs = l1.lng + ',' + l1.lat + ',' + l2.lng + ',' + l2.lat;
    req = $.getJSON(this.apiRout + latlngs + '&callback=?');
    
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
  
  this._init();
  
}