import React, { useState } from 'react';
import { Save, Share2, Trash2, Plus, Settings, Activity, History, Map as MapIcon, User, Sparkles, LogIn, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { getRouteDescription } from '../services/geminiService';
import { FirebaseUser, db, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';

interface SidebarProps {
  user: FirebaseUser | null;
  points: [number, number][];
  onClear: () => void;
  onSave: () => void;
  rides: any[];
  onLogin: () => void;
  onLogout: () => void;
}

export default function Sidebar({ user, points, onClear, onSave, rides, onLogin, onLogout }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'stats' | 'history'>('editor');
  const [description, setDescription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routeName, setRouteName] = useState('');

  const handleGenerateDescription = async () => {
    if (points.length < 2) return;
    setIsLoading(true);
    const desc = await getRouteDescription({ points });
    setDescription(desc);
    setIsLoading(false);
  };

  const handleSaveRoute = async () => {
    if (!user) {
      alert('Пожалуйста, войдите, чтобы сохранить маршрут');
      return;
    }
    if (points.length < 2) return;

    const path = 'routes';
    try {
      await addDoc(collection(db, path), {
        authorUid: user.uid,
        name: routeName || `Маршрут от ${format(new Date(), 'dd.MM.yyyy')}`,
        points: points,
        distance: points.length * 1.2,
        elevation: points.length * 15,
        description: description || '',
        isPublic: true,
        createdAt: serverTimestamp(),
      });
      alert('Маршрут успешно сохранен!');
      onSave();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  return (
    <div className="w-80 h-full bg-surface border-r border-stroke flex flex-col">
      {/* Header */}
      <div className="p-6 border-bottom border-stroke flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <MapIcon size={24} /> VeloNav
        </h1>
        <button className="p-2 hover:bg-white/5 rounded-full text-text-secondary">
          <Settings size={20} />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex px-4 gap-2 mb-4">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === 'editor' ? 'bg-primary text-black' : 'text-text-secondary hover:bg-white/5'}`}
        >
          Редактор
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === 'stats' ? 'bg-primary text-black' : 'text-text-secondary hover:bg-white/5'}`}
        >
          Статистика
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === 'history' ? 'bg-primary text-black' : 'text-text-secondary hover:bg-white/5'}`}
        >
          История
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-2">
        {activeTab === 'editor' && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Маршрут</h3>
                <div className="space-y-3">
                  <div className="input-field flex items-center gap-3">
                    <input 
                      type="text" 
                      placeholder="Название маршрута" 
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      className="bg-transparent w-full outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveRoute} 
                      disabled={points.length < 2}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 disabled:opacity-50"
                    >
                      <Save size={18} /> Сохранить
                    </button>
                    <button className="btn-outline p-2">
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Точки ({points.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {points.length === 0 ? (
                    <p className="text-sm text-text-secondary italic">Нажмите на карту, чтобы добавить точки</p>
                  ) : (
                    points.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-stroke/50">
                        <span className="text-xs font-mono text-text-secondary">
                          {i === 0 ? 'Старт' : i === points.length - 1 ? 'Финиш' : `Точка ${i}`}
                        </span>
                        <span className="text-[10px] text-text-secondary truncate max-w-[120px]">
                          {p[0].toFixed(4)}, {p[1].toFixed(4)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {points.length > 0 && (
                  <button 
                    onClick={onClear}
                    className="mt-4 text-xs text-error hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Очистить маршрут
                  </button>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">AI Описание</h3>
                <button 
                  onClick={handleGenerateDescription}
                  disabled={points.length < 2 || isLoading}
                  className="btn-outline w-full flex items-center justify-center gap-2 py-2 text-xs disabled:opacity-50"
                >
                  <Sparkles size={16} /> {isLoading ? 'Генерация...' : 'Описать маршрут'}
                </button>
                {description && (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg border border-stroke text-xs text-text-secondary leading-relaxed">
                    {description}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Настройки сегмента</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Темп (км/ч)</span>
                    <input type="number" defaultValue={20} className="bg-white/5 border border-stroke rounded px-2 py-1 w-16 text-sm text-right" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Остановка (мин)</span>
                    <input type="number" defaultValue={5} className="bg-white/5 border border-stroke rounded px-2 py-1 w-16 text-sm text-right" />
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            {!user ? (
              <div className="text-center py-10">
                <p className="text-sm text-text-secondary mb-4">Войдите, чтобы увидеть статистику</p>
                <button onClick={onLogin} className="btn-primary py-2 px-4">Войти</button>
              </div>
            ) : (
              <>
                <div className="card">
                  <p className="text-xs text-text-secondary mb-1">Всего дистанция</p>
                  <p className="text-2xl font-bold text-primary">
                    {rides.reduce((acc, r) => acc + (r.distance || 0), 0).toFixed(1)} км
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="card p-3">
                    <p className="text-[10px] text-text-secondary">Выезды</p>
                    <p className="text-lg font-bold">{rides.length}</p>
                  </div>
                  <div className="card p-3">
                    <p className="text-[10px] text-text-secondary">Высота</p>
                    <p className="text-lg font-bold">
                      {(rides.reduce((acc, r) => acc + (r.elevation || 0), 0) / 1000).toFixed(1)} км
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            {!user ? (
              <div className="text-center py-10">
                <p className="text-sm text-text-secondary mb-4">Войдите, чтобы увидеть историю</p>
                <button onClick={onLogin} className="btn-primary py-2 px-4">Войти</button>
              </div>
            ) : rides.length === 0 ? (
              <p className="text-sm text-text-secondary italic text-center py-10">История поездок пуста</p>
            ) : (
              rides.map((ride, i) => (
                <div key={ride.id || i} className="card p-3 hover:border-primary/50 cursor-pointer transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-semibold">Поездка #{rides.length - i}</p>
                    <span className="text-[10px] text-text-secondary">
                      {ride.date?.toDate ? format(ride.date.toDate(), 'dd.MM.yyyy') : '...'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-text-secondary">
                    <span>{ride.distance?.toFixed(1)} км</span>
                    <span>{(ride.duration / 60).toFixed(0)} мин</span>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </div>

      {/* User Profile Footer */}
      <div className="p-6 border-t border-stroke bg-black/20">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border border-primary/30" referrerPolicy="no-referrer" />
              <div>
                <p className="text-sm font-semibold truncate max-w-[120px]">{user.displayName}</p>
                <p className="text-xs text-text-secondary">Велосипедист</p>
              </div>
            </div>
            <button onClick={onLogout} className="text-text-secondary hover:text-error transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button onClick={onLogin} className="btn-primary w-full flex items-center justify-center gap-2">
            <LogIn size={18} /> Войти
          </button>
        )}
      </div>
    </div>
  );
}
