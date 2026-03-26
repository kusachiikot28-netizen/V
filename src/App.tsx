import React, { useState, useEffect, useCallback } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import ElevationChart from './components/ElevationChart';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Navigation, Info, X, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { auth, googleProvider, db, FirebaseUser, OperationType, handleFirestoreError } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

const socket = io();

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [mode, setMode] = useState<'draw' | 'poi' | 'view'>('draw');
  const [showElevation, setShowElevation] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [targetSpeed] = useState(22);
  const [rides, setRides] = useState<any[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Socket Listener for collaborative editing
  useEffect(() => {
    socket.emit('join-route', 'default');

    socket.on('route-update', (newPoints: [number, number][]) => {
      setPoints(newPoints);
    });

    return () => {
      socket.off('route-update');
    };
  }, []);

  // Rides Listener
  useEffect(() => {
    if (!user) {
      setRides([]);
      return;
    }

    const path = 'rides';
    const q = query(
      collection(db, path),
      where('uid', '==', user.uid),
      orderBy('date', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ridesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRides(ridesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleRouteUpdate = (route: any) => {
    if (route.points) {
      setPoints(route.points);
      socket.emit('update-route', { routeId: 'default', routeData: route.points });
    }
    if (route.mode) {
      setMode(route.mode);
    }
  };

  const handleClear = () => {
    setPoints([]);
    socket.emit('update-route', { routeId: 'default', routeData: [] });
  };

  const toggleNavigation = async () => {
    if (isNavigating) {
      // Save ride on stop
      if (user && points.length > 0) {
        const path = 'rides';
        try {
          await addDoc(collection(db, path), {
            uid: user.uid,
            distance: points.length * 1.2,
            duration: 2535, // Mock duration
            date: serverTimestamp(),
            elevation: points.length * 15,
            averageSpeed: currentSpeed || 20,
          });
          alert('Поездка сохранена!');
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, path);
        }
      }
      setIsNavigating(false);
      setCurrentSpeed(0);
    } else {
      setIsNavigating(true);
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

  const handleImport = (newPoints: [number, number][]) => {
    setPoints(newPoints);
    socket.emit('update-route', { routeId: 'default', routeData: newPoints });
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="text-primary animate-pulse">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text-primary">
      {/* Sidebar */}
      {!isNavigating && (
        <Sidebar 
          user={user}
          points={points} 
          onClear={handleClear} 
          onSave={() => alert('Маршрут сохранен!')} 
          rides={rides}
          onLogin={handleLogin}
          onLogout={handleLogout}
          mode={mode}
          onModeChange={setMode}
          onImport={handleImport}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col">
        {/* Map Area */}
        <div className="flex-1 relative">
          <MapView onRouteUpdate={handleRouteUpdate} initialRoute={{ points }} mode={mode} />
          
          {/* Auth Button Overlay */}
          {!isNavigating && (
            <div className="absolute top-6 left-6 z-50">
              {user ? (
                <div className="flex items-center gap-3 card bg-surface/80 backdrop-blur-md p-2">
                  <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-primary/30" referrerPolicy="no-referrer" />
                  <span className="text-xs font-semibold hidden md:block">{user.displayName}</span>
                  <button onClick={handleLogout} className="p-2 hover:text-error transition-colors" title="Выйти">
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <button onClick={handleLogin} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                  <LogIn size={18} /> Войти
                </button>
              )}
            </div>
          )}

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
                        <p className="text-sm font-bold">{(points.length * 1.2).toFixed(1)} км</p>
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
