
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, DailyStats, LoggedFood, FoodItem, ActivityLevel, CustomExercise } from './types';
import { FOOD_DATABASE } from './constants';

type Tab = 'dashboard' | 'exercises';

const App: React.FC = () => {
  // --- ESTADOS ---
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    waterDrank: 0,
    foods: [],
    completedExercises: [],
  });
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Modais
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);

  // --- CONTROLE DE TEMA ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('fitfocus_theme_v5');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fitfocus_theme_v5', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fitfocus_theme_v5', 'light');
    }
  };

  // --- PERSISTÊNCIA ---
  useEffect(() => {
    const u = localStorage.getItem('ff_user_v5');
    const s = localStorage.getItem('ff_stats_v5');
    const cf = localStorage.getItem('ff_custom_foods_v5');
    const ce = localStorage.getItem('ff_custom_ex_v5');
    const f = localStorage.getItem('ff_favs_v5');

    if (u) setUser(JSON.parse(u));
    if (s) setDailyStats(JSON.parse(s));
    if (cf) setCustomFoods(JSON.parse(cf));
    if (ce) setCustomExercises(JSON.parse(ce));
    if (f) setFavorites(JSON.parse(f));
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('ff_user_v5', JSON.stringify(user));
    localStorage.setItem('ff_stats_v5', JSON.stringify(dailyStats));
    localStorage.setItem('ff_custom_foods_v5', JSON.stringify(customFoods));
    localStorage.setItem('ff_custom_ex_v5', JSON.stringify(customExercises));
    localStorage.setItem('ff_favs_v5', JSON.stringify(favorites));
  }, [user, dailyStats, customFoods, customExercises, favorites]);

  // --- CÁLCULOS METABÓLICOS ---
  const calorieTarget = useMemo(() => {
    if (!user) return 2000;
    
    // Fórmula Mifflin-St Jeor
    let bmr = user.gender === 'male' 
      ? (10 * user.weight) + (6.25 * user.height) - (5 * user.age) + 5
      : (10 * user.weight) + (6.25 * user.height) - (5 * user.age) - 161;
    
    const activityMultipliers = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9
    };
    
    const tdee = bmr * (activityMultipliers[user.activityLevel] || 1.2);
    
    if (user.goal === 'maintain' || !user.targetChangeKg || !user.durationWeeks) {
      return Math.round(tdee);
    }
    
    // Cálculo do Déficit
    const totalCaloriesToChange = user.targetChangeKg * 7700; // ~7700kcal por kg de gordura
    const days = user.durationWeeks * 7;
    const dailyAdjustment = totalCaloriesToChange / days;
    
    let target = user.goal === 'lose' ? tdee - dailyAdjustment : tdee + dailyAdjustment;

    // TRAVA DE SEGURANÇA: Mínimo de 1200kcal para mulheres e 1400kcal para homens
    const safeMin = user.gender === 'female' ? 1200 : 1400;
    
    return Math.max(Math.round(target), safeMin);
  }, [user]);

  const totalConsumed = useMemo(() => dailyStats.foods.reduce((s, f) => s + f.calories, 0), [dailyStats.foods]);
  const waterTarget = useMemo(() => (user ? Math.round(user.weight * 35) : 2000), [user]);

  // --- HANDLERS ---
  const handleOnboarding = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newUser: UserProfile = {
      name: String(fd.get('name')),
      weight: Number(fd.get('weight')),
      height: Number(fd.get('height')),
      age: Number(fd.get('age')),
      gender: fd.get('gender') as 'male' | 'female',
      goal: fd.get('goal') as 'lose' | 'maintain' | 'gain',
      activityLevel: fd.get('activityLevel') as ActivityLevel,
      targetChangeKg: Number(fd.get('targetChangeKg')) || 0,
      durationWeeks: Number(fd.get('durationWeeks')) || 4,
    };
    setUser(newUser);
  };

  const handleLogout = () => {
    if (window.confirm("Tem certeza que deseja apagar os dados e sair?")) {
      // Limpa chaves específicas para evitar limpar preferências de outros apps no localhost
      localStorage.removeItem('ff_user_v5');
      localStorage.removeItem('ff_stats_v5');
      localStorage.removeItem('ff_custom_foods_v5');
      localStorage.removeItem('ff_custom_ex_v5');
      localStorage.removeItem('ff_favs_v5');
      
      // Reseta estado local
      setUser(null);
      setDailyStats({ waterDrank: 0, foods: [], completedExercises: [] });
      setFavorites([]);
      setCustomFoods([]);
      setCustomExercises([]);
      setActiveTab('dashboard');
    }
  };

  const addFoodLog = (item: FoodItem) => {
    const log: LoggedFood = {
      id: Math.random().toString(36).substring(2, 9),
      foodId: item.id,
      name: item.name,
      calories: item.calories,
      timestamp: Date.now()
    };
    setDailyStats(p => ({ ...p, foods: [log, ...p.foods] }));
    setSearchTerm('');
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
  };

  const addCustomFood = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newItem: FoodItem = {
      id: 'custom_' + Date.now(),
      name: String(fd.get('name')),
      calories: Number(fd.get('calories')),
      unit: String(fd.get('unit')),
    };
    setCustomFoods(prev => [newItem, ...prev]);
    setShowAddFoodModal(false);
  };

  const addCustomExercise = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newItem: CustomExercise = {
      id: 'ex_' + Date.now(),
      name: String(fd.get('name')),
      sets: String(fd.get('sets')),
      reps: String(fd.get('reps')),
    };
    setCustomExercises(prev => [newItem, ...prev]);
    setShowAddExerciseModal(false);
  };

  const filteredFoods = useMemo(() => {
    const s = searchTerm.toLowerCase();
    const all = [...customFoods, ...FOOD_DATABASE];
    if (!searchTerm) return all.filter(f => favorites.includes(f.id));
    return all.filter(f => f.name.toLowerCase().includes(s)).slice(0, 15);
  }, [searchTerm, customFoods, favorites]);

  // --- TELA DE CADASTRO (ONBOARDING) ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden">
          <div className="bg-emerald-600 p-8 text-white">
            <h1 className="text-3xl font-bold tracking-tight">FitFocus</h1>
            <p className="opacity-90 mt-1">Crie seu plano de emagrecimento.</p>
          </div>
          <form onSubmit={handleOnboarding} className="p-8 space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Nome</label>
                <input name="name" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white outline-none focus:border-emerald-500" placeholder="Seu nome" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Peso (kg)</label>
                  <input name="weight" type="number" step="0.1" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white outline-none" placeholder="70" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Altura (cm)</label>
                  <input name="height" type="number" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white outline-none" placeholder="170" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Idade</label>
                  <input name="age" type="number" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Gênero</label>
                  <select name="gender" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white outline-none">
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Objetivo</label>
                <select name="goal" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white outline-none">
                  <option value="lose">Perder Peso</option>
                  <option value="maintain">Manter Peso</option>
                  <option value="gain">Ganhar Massa</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Meta (kg)</label>
                  <input name="targetChangeKg" type="number" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white outline-none" placeholder="Ex: 5" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Prazo (Semanas)</label>
                  <input name="durationWeeks" type="number" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white outline-none" placeholder="Ex: 8" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Nível de Atividade</label>
                <select name="activityLevel" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white outline-none">
                  <option value="sedentary">Sedentário</option>
                  <option value="light">Atividade Leve</option>
                  <option value="moderate">Moderado (3-5x)</option>
                  <option value="active">Muito Ativo</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md transition-all shadow-lg active:scale-95">GERAR MEU PLANO</button>
          </form>
        </div>
      </div>
    );
  }

  // --- TELA PRINCIPAL DO APP ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-32 transition-colors">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 text-white rounded flex items-center justify-center font-bold shadow-lg shadow-emerald-600/20">FF</div>
          <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">FitFocus</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            {isDarkMode ? '🌞' : '🌙'}
          </button>
          <button onClick={handleLogout} className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-md text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 pt-6">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Meta Diária */}
            <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resumo Hoje</h2>
                  <p className="text-4xl font-black text-slate-900 dark:text-white mt-1">
                    {totalConsumed} <span className="text-base font-medium text-slate-400">/ {calorieTarget} kcal</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">Restante</p>
                  <p className={`text-2xl font-black ${totalConsumed > calorieTarget ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {Math.max(0, calorieTarget - totalConsumed)}
                  </p>
                </div>
              </div>
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${totalConsumed > calorieTarget ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((totalConsumed / calorieTarget) * 100, 100)}%` }}></div>
              </div>
              <div className="mt-4 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Meta Saudável</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Excesso</div>
              </div>
            </div>

            {/* Hidratação (Card Simples no Dashboard, Detalhado no Modal) */}
            <div className="bg-blue-600 p-6 text-white rounded-2xl shadow-lg shadow-blue-600/20 flex justify-between items-center cursor-pointer hover:bg-blue-700 transition-colors" onClick={() => setIsWaterModalOpen(true)}>
              <div>
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 14.66V20a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h2.34" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" /></svg>
                    Hidratação
                </h3>
                <p className="text-2xl font-black">{dailyStats.waterDrank} <span className="text-sm font-normal opacity-80">ml / {waterTarget}</span></p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </div>
            </div>

            {/* Diário de Comida */}
            <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Refeições</h3>
                <button onClick={() => setShowAddFoodModal(true)} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors">+ CRIAR</button>
              </div>

              <div className="relative mb-6 group">
                <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="O que você comeu hoje?"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                
                {(searchTerm || favorites.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    {!searchTerm && favorites.length > 0 && <div className="p-3 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase border-b dark:border-slate-700 tracking-wider">Favoritos</div>}
                    {filteredFoods.map(item => (
                      <div key={item.id} onClick={() => addFoodLog(item)} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b dark:border-slate-700 last:border-none group/item">
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => toggleFavorite(item.id, e)} className={`text-lg transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 ${favorites.includes(item.id) ? 'text-amber-400' : 'text-slate-300'}`}>★</button>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">{item.unit}</p>
                          </div>
                        </div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded text-xs">{item.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {dailyStats.foods.map(f => (
                  <div key={f.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between items-center rounded-xl animate-in slide-in-from-left-2 duration-200">
                    <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{f.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date(f.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{f.calories} kcal</span>
                      <button onClick={() => setDailyStats(p => ({...p, foods: p.foods.filter(x => x.id !== f.id)}))} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
                {dailyStats.foods.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-slate-300 dark:text-slate-600 text-sm italic">Sua lista está vazia.</p>
                    </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Meus Treinos</h2>
              <button onClick={() => setShowAddExerciseModal(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-600/30 transition-all">+ Novo</button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {customExercises.map(ex => (
                <div key={ex.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-between items-center group shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold rounded-xl text-xl">⚡</div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">{ex.name}</p>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">{ex.sets} séries x {ex.reps} reps</p>
                    </div>
                  </div>
                  <button onClick={() => setCustomExercises(p => p.filter(x => x.id !== ex.id))} className="text-slate-300 hover:text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
              {customExercises.length === 0 && (
                <div className="text-center py-20 bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400 font-medium">Você ainda não criou nenhum treino.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* NAVIGATION BAR - FIXED & DOCKED */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 h-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-4xl mx-auto h-full flex items-center justify-between px-6 relative">
            {/* Left Button */}
            <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center justify-center w-20 transition-all ${activeTab === 'dashboard' ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-500 hover:text-slate-500'}`}>
                <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                <span className="text-[10px] font-black uppercase tracking-wider">Início</span>
            </button>

            {/* Floating Center Button (Water) */}
            <div className="absolute left-1/2 -top-6 -translate-x-1/2">
                <button onClick={() => setIsWaterModalOpen(true)} className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-600/40 border-[6px] border-slate-50 dark:border-slate-950 active:scale-95 transition-transform">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" /></svg>
                </button>
            </div>

            {/* Right Button */}
            <button onClick={() => setActiveTab('exercises')} className={`flex flex-col items-center justify-center w-20 transition-all ${activeTab === 'exercises' ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-500 hover:text-slate-500'}`}>
                <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className="text-[10px] font-black uppercase tracking-wider">Treinos</span>
            </button>
        </div>
      </nav>

      {/* MODAL ÁGUA (Estilo Melhorado) */}
      {isWaterModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setIsWaterModalOpen(false)}>
          <div className="bg-blue-600 w-full max-w-sm p-8 text-white rounded-3xl shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" /></svg>
            </div>
            
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">Hidratação</h2>
                <button onClick={() => setIsWaterModalOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full">✕</button>
            </div>

            <div className="text-center mb-8">
              <p className="text-7xl font-black tracking-tighter">{dailyStats.waterDrank}<span className="text-2xl opacity-60 font-medium">ml</span></p>
              <p className="text-sm font-bold uppercase opacity-60 mt-2 tracking-widest">Meta: {waterTarget} ml</p>
            </div>

            <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden mb-8">
                <div className="h-full bg-white transition-all duration-500" style={{ width: `${Math.min((dailyStats.waterDrank / waterTarget) * 100, 100)}%` }}></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setDailyStats(p => ({...p, waterDrank: p.waterDrank + 250}))} className="py-5 bg-white text-blue-600 rounded-xl font-black text-lg shadow-lg hover:scale-105 transition-transform active:scale-95">+250ml</button>
              <button onClick={() => setDailyStats(p => ({...p, waterDrank: p.waterDrank + 500}))} className="py-5 bg-blue-800 text-white border-2 border-white/10 rounded-xl font-black text-lg shadow-lg hover:bg-blue-900 transition-colors active:scale-95">+500ml</button>
              <button onClick={() => setDailyStats(p => ({...p, waterDrank: Math.max(0, p.waterDrank - 250)}))} className="col-span-2 py-3 text-white/50 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">Remover 250ml</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR COMIDA */}
      {showAddFoodModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-8 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-black mb-6 dark:text-white">Criar Alimento Personalizado</h2>
            <form onSubmit={addCustomFood} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Nome do Alimento</label>
                <input name="name" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold outline-none focus:border-emerald-500" placeholder="Ex: Crepioca de Frango" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Calorias (kcal)</label>
                  <input name="calories" type="number" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Porção</label>
                  <input name="unit" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold outline-none focus:border-emerald-500" placeholder="100g" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddFoodModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR TREINO */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-8 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-black mb-6 text-indigo-600">Novo Exercício</h2>
            <form onSubmit={addCustomExercise} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Nome do Exercício</label>
                <input name="name" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500" placeholder="Ex: Supino Reto" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Séries</label>
                  <input name="sets" type="number" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Reps</label>
                  <input name="reps" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddExerciseModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-colors">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
