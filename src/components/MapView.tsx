import React, { useState, useCallback, useRef, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, Map as MapIcon, Satellite, Mountain } from 'lucide-react';

export type MapLayer = 'osm' | 'satellite' | 'topo';

interface MapViewProps {
  onRouteUpdate?: (route: any) => void;
  initialRoute?: any;
}

const MAP_LAYERS = {
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'osm-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite (ESRI)',
    style: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community',
        },
      },
      layers: [
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  topo: {
    id: 'topo',
    name: 'OpenTopoMap',
    style: {
      version: 8,
      sources: {
        'opentopo': {
          type: 'raster',
          tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
        },
      },
      layers: [
        {
          id: 'topo-layer',
          type: 'raster',
          source: 'opentopo',
          minzoom: 0,
          maxzoom: 17,
        },
      ],
    },
  },
};

export default function MapView({ onRouteUpdate, initialRoute }: MapViewProps) {
  const [activeLayer, setActiveLayer] = useState<MapLayer>('osm');
  const [viewState, setViewState] = useState({
    longitude: 37.6173,
    latitude: 55.7558,
    zoom: 10,
  });
  const [points, setPoints] = useState<[number, number][]>(initialRoute?.points || []);
  const mapRef = useRef<MapRef>(null);

  const onMapClick = useCallback((e: any) => {
    const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    const newPoints = [...points, newPoint];
    setPoints(newPoints);
    onRouteUpdate?.({ points: newPoints });
  }, [points, onRouteUpdate]);

  const routeGeoJSON = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points,
    },
  };

  return (
    <div className="relative w-full h-full">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={onMapClick}
        mapStyle={MAP_LAYERS[activeLayer].style as any}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
      >
        <NavigationControl position="top-right" />
        
        {points.length > 1 && (
          <Source id="route" type="geojson" data={routeGeoJSON as any}>
            <Layer
              id="route-line"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{ 'line-color': '#00C853', 'line-width': 4 }}
            />
          </Source>
        )}

        {points.map((point, index) => (
          <Source id={`point-${index}`} type="geojson" data={{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: point },
            properties: {}
          } as any}>
            <Layer
              id={`point-layer-${index}`}
              type="circle"
              paint={{
                'circle-radius': 6,
                'circle-color': index === 0 ? '#1E88E5' : index === points.length - 1 ? '#CF6679' : '#00C853',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF'
              }}
            />
          </Source>
        ))}
      </Map>

      {/* Layer Switcher */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <div className="card flex flex-col gap-2 p-2 bg-surface/80 backdrop-blur-md">
          <button
            onClick={() => setActiveLayer('osm')}
            className={`p-2 rounded-lg transition-all ${activeLayer === 'osm' ? 'bg-primary text-black' : 'hover:bg-white/10'}`}
            title="OpenStreetMap"
          >
            <MapIcon size={20} />
          </button>
          <button
            onClick={() => setActiveLayer('satellite')}
            className={`p-2 rounded-lg transition-all ${activeLayer === 'satellite' ? 'bg-primary text-black' : 'hover:bg-white/10'}`}
            title="Satellite"
          >
            <Satellite size={20} />
          </button>
          <button
            onClick={() => setActiveLayer('topo')}
            className={`p-2 rounded-lg transition-all ${activeLayer === 'topo' ? 'bg-primary text-black' : 'hover:bg-white/10'}`}
            title="Topographic"
          >
            <Mountain size={20} />
          </button>
        </div>
      </div>

      {/* Stats Overlay */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="card bg-surface/80 backdrop-blur-md pointer-events-auto">
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-text-secondary">Дистанция</p>
              <p className="text-lg font-bold">{(points.length * 1.2).toFixed(1)} км</p>
            </div>
            <div>
              <p className="text-text-secondary">Набор высоты</p>
              <p className="text-lg font-bold">{(points.length * 15).toFixed(0)} м</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
