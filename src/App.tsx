import React, { useState, useEffect } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import ElevationChart from './components/ElevationChart';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Navigation, Info, X } from 'lucide-react';

const socket = io();

export default function App() {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [showElevation, setShowElevation] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [targetSpeed] = useState(22);

  useEffect(() => {
    socket.on('route-update', (newPoints: [number, number][]) => {
      setPoints(newPoints);
    });

    return () => {
      socket.off('route-update');
    };
  }, []);

  const handleRouteUpdate = (route: any) => {
    setPoints(route.points);
    socket.emit('update-route', { routeId: 'default', routeData: route.points });
  };

  const handleClear = () => {
    setPoints([]);
    socket.emit('update-route', { routeId: 'default', routeData: [] });
  };

  const toggleNavigation = () => {
    setIsNavigating(!isNavigating);
    if (!isNavigating) {
      // Simulate speed
      const interval = setInterval(() => {
        setCurrentSpeed(prev => {
          const next = prev + (Math.random() - 0.5) * 2;
          return Math.max(0, Math.min(45, next));
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text-primary">
      {/* Sidebar */}
      {!isNavigating && (
        <Sidebar 
          points={points} 
          onClear={handleClear} 
          onSave={() => alert('Маршрут сохранен!')} 
        />
      )}

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col">
        {/* Map Area */}
        <div className="flex-1 relative">
          <MapView onRouteUpdate={handleRouteUpdate} initialRoute={{ points }} />
          
          {/* Navigation Overlay */}
          <AnimatePresence>
            {isNavigating && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-50"
              >
                <div className="card bg-surface/90 backdrop-blur-xl border-primary/30 p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-text-secondary uppercase tracking-widest">Текущая скорость</p>
                      <p className="text-4xl font-black text-primary">{currentSpeed.toFixed(1)} <span className="text-lg">км/ч</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-secondary uppercase tracking-widest">Цель</p>
                      <p className="text-2xl font-bold">{targetSpeed} км/ч</p>
                    </div>
                  </div>
                  
                  {/* Pace Indicator */}
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden relative">
                    <motion.div 
                      className={`h-full transition-colors duration-500 ${currentSpeed >= targetSpeed ? 'bg-primary' : 'bg-error'}`}
                      animate={{ width: `${(currentSpeed / 45) * 100}%` }}
                    />
                    <div 
                      className="absolute top-0 h-full w-1 bg-white" 
                      style={{ left: `${(targetSpeed / 45) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-[10px] text-text-secondary">Дистанция</p>
                        <p className="text-sm font-bold">12.4 км</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-text-secondary">Время</p>
                        <p className="text-sm font-bold">00:42:15</p>
                      </div>
                    </div>
                    <button 
                      onClick={toggleNavigation}
                      className="bg-error/20 text-error border border-error/30 px-4 py-2 rounded-lg text-sm font-bold hover:bg-error/30 transition-all"
                    >
                      СТОП
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Controls */}
          <div className="absolute top-6 right-20 flex flex-col gap-2">
            {!isNavigating && (
              <button 
                onClick={toggleNavigation}
                className="btn-primary flex items-center gap-2 px-4 py-2"
              >
                <Navigation size={18} /> Начать поездку
              </button>
            )}
            <button 
              onClick={() => setShowElevation(!showElevation)}
              className={`p-2 rounded-lg border border-stroke transition-all ${showElevation ? 'bg-primary text-black' : 'bg-surface text-text-secondary hover:bg-white/5'}`}
            >
              <Activity size={20} />
            </button>
          </div>
        </div>

        {/* Elevation Panel */}
        <AnimatePresence>
          {showElevation && !isNavigating && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 200 }}
              exit={{ height: 0 }}
              className="bg-surface border-t border-stroke relative overflow-hidden"
            >
              <div className="absolute top-2 right-4 z-10">
                <button onClick={() => setShowElevation(false)} className="text-text-secondary hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 h-full">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-text-secondary uppercase">
                  <Activity size={14} className="text-primary" /> Профиль высот
                </div>
                <ElevationChart points={points} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
