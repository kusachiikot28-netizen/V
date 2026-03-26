import React, { useState, useCallback, useRef, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl, MapRef, Marker, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, Map as MapIcon, Satellite, Mountain, Coffee, ShoppingCart, Droplets, TrainFront, Plus, Trash2, Box, Wind, CloudRain, Sun } from 'lucide-react';

export type MapLayer = 'osm' | 'satellite' | 'topo' | 'cycle';

interface POI {
  id: string;
  lngLat: [number, number];
  type: 'cafe' | 'shop' | 'water' | 'station' | 'note';
  label: string;
  note?: string;
}

interface MapViewProps {
  onRouteUpdate?: (route: any) => void;
  initialRoute?: any;
  mode?: 'draw' | 'poi' | 'view';
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
  cycle: {
    id: 'cycle',
    name: 'OpenCycleMap',
    style: {
      version: 8,
      sources: {
        'opencycle': {
          type: 'raster',
          tiles: ['https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=YOUR_API_KEY'], // Placeholder
          tileSize: 256,
          attribution: '&copy; OpenCycleMap contributors',
        },
      },
      layers: [
        {
          id: 'cycle-layer',
          type: 'raster',
          source: 'opencycle',
          minzoom: 0,
          maxzoom: 18,
        },
      ],
    },
  },
};

const POI_ICONS = {
  cafe: <Coffee size={16} />,
  shop: <ShoppingCart size={16} />,
  water: <Droplets size={16} />,
  station: <TrainFront size={16} />,
  note: <Box size={16} />,
};

export default function MapView({ onRouteUpdate, initialRoute, mode = 'draw' }: MapViewProps) {
  const [activeLayer, setActiveLayer] = useState<MapLayer>('osm');
  const [is3D, setIs3D] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [weatherData, setWeatherData] = useState<{ temp: number; rain: number; wind: number } | null>(null);
  const [viewState, setViewState] = useState({
    longitude: 37.6173,
    latitude: 55.7558,
    zoom: 10,
    pitch: 0,
    bearing: 0,
  });

  useEffect(() => {
    if (showWeather) {
      const fetchWeather = async () => {
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${viewState.latitude}&longitude=${viewState.longitude}&current_weather=true`);
          const data = await res.json();
          if (data.current_weather) {
            setWeatherData({
              temp: data.current_weather.temperature,
              wind: data.current_weather.windspeed,
              rain: 0, // Open-Meteo current_weather doesn't have rain directly in this call
            });
          }
        } catch (err) {
          console.error('Weather fetch error:', err);
        }
      };
      fetchWeather();
    }
  }, [showWeather, viewState.latitude, viewState.longitude]);
  const [points, setPoints] = useState<[number, number][]>(initialRoute?.points || []);
  const [pois, setPois] = useState<POI[]>([]);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    if (initialRoute?.points) {
      setPoints(initialRoute.points);
    }
  }, [initialRoute?.points]);

  const onMapClick = useCallback((e: any) => {
    if (mode === 'draw') {
      const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const newPoints = [...points, newPoint];
      setPoints(newPoints);
      onRouteUpdate?.({ points: newPoints });
    } else if (mode === 'poi') {
      const newPOI: POI = {
        id: Math.random().toString(36).substr(2, 9),
        lngLat: [e.lngLat.lng, e.lngLat.lat],
        type: 'cafe',
        label: 'Новая точка',
      };
      setPois([...pois, newPOI]);
      setSelectedPOI(newPOI);
    }
  }, [points, pois, mode, onRouteUpdate]);

  const removePoint = (index: number) => {
    const newPoints = points.filter((_, i) => i !== index);
    setPoints(newPoints);
    onRouteUpdate?.({ points: newPoints });
  };

  const toggle3D = () => {
    setIs3D(!is3D);
    setViewState(prev => ({
      ...prev,
      pitch: !is3D ? 45 : 0,
    }));
  };

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
        terrain={is3D ? { source: 'mapbox-dem', exaggeration: 1.5 } : undefined}
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
          <Marker key={`point-${index}`} longitude={point[0]} latitude={point[1]} anchor="center">
            <div 
              className={`w-3 h-3 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-150 ${
                index === 0 ? 'bg-blue-500' : index === points.length - 1 ? 'bg-red-500' : 'bg-primary'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (mode === 'draw') removePoint(index);
              }}
            />
          </Marker>
        ))}

        {pois.map(poi => (
          <Marker key={poi.id} longitude={poi.lngLat[0]} latitude={poi.lngLat[1]} anchor="bottom">
            <div 
              className="p-2 bg-surface border border-stroke rounded-full shadow-xl text-primary cursor-pointer hover:bg-primary hover:text-black transition-all"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPOI(poi);
              }}
            >
              {POI_ICONS[poi.type]}
            </div>
          </Marker>
        ))}

        {selectedPOI && (
          <Popup
            longitude={selectedPOI.lngLat[0]}
            latitude={selectedPOI.lngLat[1]}
            anchor="top"
            onClose={() => setSelectedPOI(null)}
            closeButton={false}
            className="poi-popup"
          >
            <div className="p-3 bg-surface border border-stroke rounded-lg min-w-[200px]">
              <div className="flex justify-between items-center mb-2">
                <input 
                  className="bg-transparent font-bold outline-none text-text-primary"
                  value={selectedPOI.label}
                  onChange={(e) => {
                    const newPois = pois.map(p => p.id === selectedPOI.id ? { ...p, label: e.target.value } : p);
                    setPois(newPois);
                    setSelectedPOI({ ...selectedPOI, label: e.target.value });
                  }}
                />
                <button 
                  onClick={() => {
                    setPois(pois.filter(p => p.id !== selectedPOI.id));
                    setSelectedPOI(null);
                  }}
                  className="text-error hover:opacity-80"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <select 
                className="w-full bg-background border border-stroke rounded p-1 text-xs mb-2"
                value={selectedPOI.type}
                onChange={(e) => {
                  const newPois = pois.map(p => p.id === selectedPOI.id ? { ...p, type: e.target.value as any } : p);
                  setPois(newPois);
                  setSelectedPOI({ ...selectedPOI, type: e.target.value as any });
                }}
              >
                <option value="cafe">Кафе</option>
                <option value="shop">Магазин</option>
                <option value="water">Источник воды</option>
                <option value="station">Ж/Д Станция</option>
                <option value="note">Заметка</option>
              </select>
              <textarea 
                className="w-full bg-background border border-stroke rounded p-2 text-xs outline-none"
                placeholder="Заметки..."
                value={selectedPOI.note || ''}
                onChange={(e) => {
                  const newPois = pois.map(p => p.id === selectedPOI.id ? { ...p, note: e.target.value } : p);
                  setPois(newPois);
                  setSelectedPOI({ ...selectedPOI, note: e.target.value });
                }}
              />
            </div>
          </Popup>
        )}
      </Map>

      {/* Map Controls */}
      <div className="absolute top-6 right-6 flex flex-col gap-2">
        <button onClick={toggle3D} className={`map-control ${is3D ? 'bg-primary text-black' : ''}`} title="3D Режим">
          <Box size={20} />
        </button>
        <button onClick={() => setShowWeather(!showWeather)} className={`map-control ${showWeather ? 'bg-primary text-black' : ''}`} title="Погода">
          <CloudRain size={20} />
        </button>
      </div>

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

      {/* Weather Info */}
      {showWeather && weatherData && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2">
          <div className="card bg-surface/80 backdrop-blur-md p-3 flex items-center gap-4">
            <div className="flex items-center gap-2 text-primary">
              <Sun size={18} /> {weatherData.temp}°C
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Wind size={18} /> {weatherData.wind} м/с
            </div>
          </div>
        </div>
      )}

      {/* Drawing Mode Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="card bg-surface/80 backdrop-blur-md p-1 flex gap-1">
          <button 
            onClick={() => onRouteUpdate?.({ mode: 'draw' })}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'draw' ? 'bg-primary text-black' : 'hover:bg-white/5'}`}
          >
            Рисование
          </button>
          <button 
            onClick={() => onRouteUpdate?.({ mode: 'poi' })}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'poi' ? 'bg-primary text-black' : 'hover:bg-white/5'}`}
          >
            Точки POI
          </button>
        </div>
      </div>
    </div>
  );
}
