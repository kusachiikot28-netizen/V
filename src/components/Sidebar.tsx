import React, { useState, useRef } from 'react';
import { Save, Share2, Trash2, Plus, Settings, Activity, History, Map as MapIcon, User, Sparkles, LogIn, LogOut, Coffee, ShoppingCart, Droplets, TrainFront, Mic, Play, Pause, Download, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getRouteDescription, calculateComplexity } from '../services/geminiService';
import { exportToGPX, importFromGPX } from '../services/fileService';
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
  mode: 'draw' | 'poi' | 'view';
  onModeChange: (mode: 'draw' | 'poi' | 'view') => void;
  onImport: (points: [number, number][]) => void;
}

export default function Sidebar({ user, points, onClear, onSave, rides, onLogin, onLogout, mode, onModeChange, onImport }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'poi' | 'community' | 'stats' | 'history'>('editor');
  const [description, setDescription] = useState<string | null>(null);
  const [complexity, setComplexity] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateDescription = async () => {
    if (points.length < 2) return;
    setIsLoading(true);
    const [desc, score] = await Promise.all([
      getRouteDescription({ points }),
      calculateComplexity({ points })
    ]);
    setDescription(desc);
    setComplexity(score);
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
        complexity: complexity || 0,
        voiceNote: audioBase64 || null,
        isPublic: true,
        createdAt: serverTimestamp(),
      });
      alert('Маршрут успешно сохранен!');
      onSave();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert to base64 for persistence
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto-stop after 15 seconds to keep base64 size reasonable
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 15000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const handleExport = () => {
    if (points.length < 2) return;
    exportToGPX(points, routeName || 'my-route');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const importedPoints = await importFromGPX(file);
        onImport(importedPoints);
        setRouteName(file.name.replace('.gpx', ''));
      } catch (err) {
        alert('Ошибка при импорте GPX файла');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="w-80 h-full bg-surface border-r border-stroke flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-stroke flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <MapIcon size={24} /> BikeRoute
        </h1>
        <button className="p-2 hover:bg-white/5 rounded-full text-text-secondary">
          <Settings size={20} />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex px-4 gap-1 mb-4 overflow-x-auto custom-scrollbar pb-2">
        {[
          { id: 'editor', label: 'Редактор' },
          { id: 'poi', label: 'POI' },
          { id: 'community', label: 'Обзор' },
          { id: 'stats', label: 'Статы' },
          { id: 'history', label: 'История' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`whitespace-nowrap px-3 py-2 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-all ${activeTab === tab.id ? 'bg-primary text-black' : 'text-text-secondary hover:bg-white/5'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-2">
        {activeTab === 'editor' && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="space-y-6">
              <section>
                <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Маршрут</h3>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Название маршрута" 
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    className="input-field w-full"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveRoute} 
                      disabled={points.length < 2}
                      className="btn-primary flex-1 disabled:opacity-50"
                    >
                      <Save size={18} /> Сохранить
                    </button>
                    <button onClick={handleExport} disabled={points.length < 2} className="btn-secondary p-2 disabled:opacity-50" title="Экспорт GPX">
                      <Download size={18} />
                    </button>
                    <button onClick={handleImportClick} className="btn-secondary p-2" title="Импорт GPX">
                      <Upload size={18} />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept=".gpx" 
                      className="hidden" 
                    />
                  </div>
                </div>
              </section>

              <section>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Точки ({points.length})</h3>
                  <button onClick={() => onModeChange('draw')} className={`p-1 rounded ${mode === 'draw' ? 'text-primary' : 'text-text-secondary'}`}>
                    <Plus size={14} />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {points.length === 0 ? (
                    <p className="text-xs text-text-secondary italic">Нажмите на карту для рисования</p>
                  ) : (
                    points.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded border border-stroke/50">
                        <span className="text-[10px] font-bold text-text-secondary">
                          {i === 0 ? 'СТАРТ' : i === points.length - 1 ? 'ФИНИШ' : `Т${i}`}
                        </span>
                        <span className="text-[10px] text-text-secondary font-mono">
                          {p[0].toFixed(3)}, {p[1].toFixed(3)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {points.length > 0 && (
                  <button 
                    onClick={onClear}
                    className="mt-4 text-[10px] font-bold text-error hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={12} /> ОЧИСТИТЬ
                  </button>
                )}
              </section>

              <section>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">AI Анализ</h3>
                  {complexity !== null && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-text-secondary">СЛОЖНОСТЬ:</span>
                      <span className={`text-xs font-black ${complexity > 7 ? 'text-error' : complexity > 4 ? 'text-yellow-500' : 'text-primary'}`}>
                        {complexity}/10
                      </span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleGenerateDescription}
                  disabled={points.length < 2 || isLoading}
                  className="btn-secondary w-full text-xs disabled:opacity-50"
                >
                  <Sparkles size={16} /> {isLoading ? 'Анализ...' : 'Анализировать маршрут'}
                </button>
                {description && (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg border border-stroke text-xs text-text-secondary leading-relaxed">
                    {description}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Голосовая заметка</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-3 rounded-full transition-all ${isRecording ? 'bg-error animate-pulse' : 'bg-surface border border-stroke text-primary hover:bg-primary hover:text-black'}`}
                  >
                    <Mic size={20} />
                  </button>
                  {audioUrl && (
                    <audio src={audioUrl} controls className="h-8 w-full" />
                  )}
                </div>
              </section>
            </div>
          </motion.div>
        )}

        {activeTab === 'poi' && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Точки интереса</h3>
              <button 
                onClick={() => onModeChange('poi')} 
                className={`btn-secondary p-2 ${mode === 'poi' ? 'border-primary text-primary' : ''}`}
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="text-xs text-text-secondary italic">Выберите режим POI и кликните на карту, чтобы добавить маркер.</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="card p-2 flex items-center gap-2 text-[10px] font-bold">
                <Coffee size={14} className="text-primary" /> КАФЕ
              </div>
              <div className="card p-2 flex items-center gap-2 text-[10px] font-bold">
                <ShoppingCart size={14} className="text-primary" /> МАГАЗИН
              </div>
              <div className="card p-2 flex items-center gap-2 text-[10px] font-bold">
                <Droplets size={14} className="text-primary" /> ВОДА
              </div>
              <div className="card p-2 flex items-center gap-2 text-[10px] font-bold">
                <TrainFront size={14} className="text-primary" /> ВОКЗАЛ
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'community' && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Популярные маршруты</h3>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-3 hover:border-primary transition-all cursor-pointer group">
                  <div className="h-24 bg-background rounded mb-2 overflow-hidden">
                    <img src={`https://picsum.photos/seed/route${i}/300/150`} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                  </div>
                  <p className="text-xs font-bold mb-1">Горный перевал #{i}</p>
                  <div className="flex justify-between text-[10px] text-text-secondary">
                    <span>42 км</span>
                    <span>1200 м набор</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            {!user ? (
              <div className="text-center py-10">
                <p className="text-sm text-text-secondary mb-4">Войдите для просмотра статистики</p>
                <button onClick={onLogin} className="btn-primary w-full">Войти</button>
              </div>
            ) : (
              <>
                <div className="card p-4 bg-primary/5 border-primary/20">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Общая дистанция</p>
                  <p className="text-3xl font-black text-primary">
                    {rides.reduce((acc, r) => acc + (r.distance || 0), 0).toFixed(1)} <span className="text-sm">км</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="card p-3">
                    <p className="text-[10px] font-bold text-text-secondary uppercase">Выезды</p>
                    <p className="text-xl font-bold">{rides.length}</p>
                  </div>
                  <div className="card p-3">
                    <p className="text-[10px] font-bold text-text-secondary uppercase">Набор</p>
                    <p className="text-xl font-bold">
                      {(rides.reduce((acc, r) => acc + (r.elevation || 0), 0) / 1000).toFixed(1)} <span className="text-xs">км</span>
                    </p>
                  </div>
                </div>
                <div className="card p-4">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">Активность</p>
                  <div className="h-32 flex items-end gap-1">
                    {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                      <div key={i} className="flex-1 bg-primary/20 rounded-t hover:bg-primary transition-all" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-[8px] text-text-secondary">
                    <span>ПН</span><span>ВТ</span><span>СР</span><span>ЧТ</span><span>ПТ</span><span>СБ</span><span>ВС</span>
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
                <p className="text-sm text-text-secondary mb-4">Войдите для просмотра истории</p>
                <button onClick={onLogin} className="btn-primary w-full">Войти</button>
              </div>
            ) : rides.length === 0 ? (
              <p className="text-xs text-text-secondary italic text-center py-10">История пуста</p>
            ) : (
              rides.map((ride, i) => (
                <div key={ride.id || i} className="card p-3 hover:border-primary/50 cursor-pointer transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold group-hover:text-primary transition-colors">Поездка #{rides.length - i}</p>
                    <span className="text-[10px] text-text-secondary">
                      {ride.date?.toDate ? format(ride.date.toDate(), 'dd.MM.yyyy') : '...'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-text-secondary">
                    <span className="flex items-center gap-1"><Activity size={10} /> {ride.distance?.toFixed(1)} км</span>
                    <span className="flex items-center gap-1"><History size={10} /> {(ride.duration / 60).toFixed(0)} мин</span>
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
                <p className="text-xs font-bold truncate max-w-[120px]">{user.displayName}</p>
                <p className="text-[10px] text-text-secondary uppercase tracking-tighter">Pro Cyclist</p>
              </div>
            </div>
            <button onClick={onLogout} className="text-text-secondary hover:text-error transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button onClick={onLogin} className="btn-primary w-full">
            <LogIn size={18} /> Войти
          </button>
        )}
      </div>
    </div>
  );
}
