
import React, { useState, useEffect, useMemo } from 'react';
import { Item, UserSession } from './types';
import { ItemCard } from './components/ItemCard';
import { ItemForm } from './components/ItemForm';
import { AdminDashboard } from './components/AdminDashboard';

// FIREBASE SDK (ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCKu75-g5ZtNr72LYvpQ4awuGaEmYzXhAs",
  authDomain: "desapego-inteligente-30a11.firebaseapp.com",
  projectId: "desapego-inteligente-30a11",
  storageBucket: "desapego-inteligente-30a11.firebasestorage.app",
  messagingSenderId: "794243537264",
  appId: "1:794243537264:web:75ce575e9227118bc997b5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Configura o provedor para sempre perguntar qual conta usar (evita login automático na conta errada)
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

const ALLOWED_EMAILS = ['apareaspontas@gmail.com', 'filipejjvsf@gmail.com'].map(e => e.toLowerCase().trim());

const App: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const email = user.email?.toLowerCase() || '';
        if (ALLOWED_EMAILS.includes(email)) {
          setCurrentUser({ 
            username: user.displayName || 'Admin', 
            email, 
            photoURL: user.photoURL || undefined 
          });
          setAuthError(null);
        } else {
          // Se o e-mail não estiver na lista, desloga imediatamente
          signOut(auth);
          setAuthError(`Acesso negado para: ${email}. Este e-mail não está na lista de administradores.`);
          setCurrentUser(null);
          setShowLoginModal(true); // Garante que o modal de erro apareça
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const unsubscribeStore = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Item));
    });

    return () => { unsubscribeAuth(); unsubscribeStore(); };
  }, []);

  const handleAddItem = async (data: any) => {
    if (!currentUser) return;
    await addDoc(collection(db, "items"), {
      ...data,
      createdAt: Date.now(),
      isSold: false,
      soldCount: 0,
      createdBy: currentUser.username
    });
    setShowForm(false);
  };

  const handleUpdateItem = async (data: any) => {
    if (!currentUser) return;
    const { id, ...rest } = data;
    await updateDoc(doc(db, "items", id), rest);
    setEditingItem(null);
  };

  const filteredItems = useMemo(() => items.filter(i => {
    const matchesSearch = i.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'Todas' || i.category === categoryFilter;
    const matchesVisibility = currentUser ? true : !i.isSold;
    return matchesSearch && matchesCat && matchesVisibility;
  }), [items, searchTerm, categoryFilter, currentUser]);

  const categories = useMemo(() => ['Todas', ...Array.from(new Set(items.map(i => i.category))).sort()], [items]);

  const handleLogin = async () => {
    try {
      setAuthError(null);
      // O prompt 'select_account' garantirá que o Google mostre a lista de contas
      await signInWithPopup(auth, googleProvider);
      setShowLoginModal(false);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        setAuthError(error.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowAdmin(false);
      setCurrentUser(null);
      setAuthError(null);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  if (isAuthLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfdfe]">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Verificando Acesso...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-24">
      {currentUser && showAdmin && (
        <AdminDashboard 
          items={items} onClose={() => setShowAdmin(false)} onAddNew={() => setShowForm(true)}
          onToggleStatus={(id, status) => updateDoc(doc(db, "items", id), { isSold: status })}
          onEditItem={setEditingItem} onDelete={id => confirm('Deseja realmente excluir este item?') && deleteDoc(doc(db, "items", id))}
          onUpdatePrice={(id, p) => updateDoc(doc(db, "items", id), { price: p })}
        />
      )}

      <header className="bg-white/95 backdrop-blur-md border-b h-20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-100">DI</div>
            <div className="hidden sm:block">
              <h1 className="text-xs font-black uppercase tracking-tighter">Desapego</h1>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Inteligente</p>
            </div>
          </div>

          <div className="flex-1 max-w-xl relative group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="O que você está procurando hoje?" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-3.5 text-sm outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all font-medium" 
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowAdmin(true)} 
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-200"
                >
                  Painel
                </button>
                <div className="h-10 w-px bg-gray-100 mx-1"></div>
                <button 
                  onClick={handleLogout}
                  className="group flex items-center gap-2 hover:bg-red-50 p-1.5 rounded-xl transition-all"
                  title="Sair da conta"
                >
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-lg object-cover border-2 border-white shadow-sm" />
                  ) : (
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-black text-[10px] border border-blue-100">
                      {currentUser.username[0]}
                    </div>
                  )}
                  <span className="text-[9px] font-black uppercase text-gray-400 group-hover:text-red-600 hidden md:block">Sair</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)} 
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex gap-3 overflow-x-auto pb-10 scrollbar-hide">
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setCategoryFilter(cat)} 
              className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase border tracking-widest shrink-0 transition-all active:scale-95 ${
                categoryFilter === cat 
                ? 'bg-gray-900 text-white border-gray-900 shadow-xl shadow-gray-100' 
                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <ItemCard 
                key={item.id} 
                item={item} 
                isAdmin={!!currentUser} 
                onSell={() => updateDoc(doc(db, "items", item.id), { isSold: true })} 
                onUpdatePrice={(id, p) => updateDoc(doc(db, "items", id), { price: p })} 
                onDelete={id => confirm('Tem certeza que deseja excluir?') && deleteDoc(doc(db, "items", id))} 
                onEdit={setEditingItem} 
              />
            ))
          ) : (
            <div className="col-span-full py-32 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-gray-900 font-black uppercase text-sm tracking-tight mb-2">Nenhum item encontrado</h3>
              <p className="text-gray-400 text-xs font-medium">Tente ajustar seus filtros ou busca.</p>
            </div>
          )}
        </div>
      </main>

      {showForm && <ItemForm onAdd={handleAddItem} onCancel={() => setShowForm(false)} />}
      {editingItem && <ItemForm itemToEdit={editingItem} onUpdate={handleUpdateItem} onCancel={() => setEditingItem(null)} />}

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-6 backdrop-blur-md animate-fade-in">
          <div className="bg-white p-12 rounded-[3.5rem] text-center max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
            
            <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
               </svg>
            </div>

            <h2 className="text-lg font-black mb-2 uppercase tracking-tighter text-gray-900">Acesso Administrativo</h2>
            <p className="text-gray-400 text-[11px] font-medium leading-relaxed mb-10">
              Faça login com sua conta autorizada para gerenciar anúncios, preços e status de vendas.
            </p>

            {authError && (
              <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-[10px] font-bold text-red-600 leading-tight uppercase tracking-wider">{authError}</p>
              </div>
            )}

            <button 
              onClick={handleLogin} 
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.56-1.56 2.73-3.21 2.73a4.09 4.09 0 0 1-4.09-4.09a4.09 4.09 0 0 1 4.09-4.09c.88 0 1.66.33 2.27.88l2.13-2.13a7.15 7.15 0 0 0-4.4-1.48a7.15 7.15 0 0 0-7.18 7.18a7.18 7.18 0 0 0 7.18 7.18c4.1 0 7.18-2.88 7.18-7.18c0-.52-.05-1.01-.12-1.48z"/>
              </svg>
              Conectar com Google
            </button>

            <button 
              onClick={() => { setShowLoginModal(false); setAuthError(null); }} 
              className="mt-8 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
