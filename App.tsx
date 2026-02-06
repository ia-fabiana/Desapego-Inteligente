
import React, { useState, useEffect, useMemo } from 'react';
import { Item, UserSession } from './types';
import { ItemCard } from './components/ItemCard';
import { ItemForm } from './components/ItemForm';
import { AdminDashboard } from './components/AdminDashboard';

// --- FIREBASE CDN IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// --- LISTA VIP DE ACESSO ---
const ALLOWED_EMAILS = [
  'apareaspontas@gmail.com', 
  'filipejjvsf@gmail.com'
].map(e => e.toLowerCase().trim());

const App: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<{message: string, code?: string, domain?: string} | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const checkRedirect = async () => {
      try {
        await getRedirectResult(auth);
      } catch (error: any) {
        if (error.code === 'auth/unauthorized-domain') {
            setAuthError({
                message: "Endereço não autorizado no Google. Siga os passos abaixo para liberar o acesso.",
                code: error.code,
                domain: window.location.hostname
            });
        }
      }
    };
    checkRedirect();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userEmail = (user.email || '').toLowerCase().trim();
        if (ALLOWED_EMAILS.includes(userEmail)) {
          setCurrentUser({
            username: user.displayName || user.email || 'Usuário',
            email: userEmail,
            photoURL: user.photoURL || undefined
          });
          setAuthError(null);
          setShowLoginModal(false);
        } else {
          setAuthError({ message: `O e-mail ${userEmail} não tem permissão de administrador.` });
          signOut(auth);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const unsubscribeStore = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Item[];
      setItems(itemsData);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeStore();
    };
  }, []);

  const handleLoginGoogle = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/unauthorized-domain') {
          setAuthError({
              message: "Este domínio precisa ser adicionado na lista branca do Firebase.",
              code: error.code,
              domain: window.location.hostname
          });
      } else if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
          try {
              await signInWithRedirect(auth, googleProvider);
          } catch (redirErr: any) {
              setAuthError({ message: "Erro ao abrir login. Tente novamente.", code: redirErr.code });
          }
      } else {
          setAuthError({ message: "Erro de conexão com o Google.", code: error.code });
      }
      setIsLoggingIn(false);
    }
  };

  const handleToggleAdmin = () => {
    if (currentUser) {
      if (window.confirm(`Sair da conta de ${currentUser.username}?`)) {
        signOut(auth);
        setShowAdmin(false);
      }
    } else {
      setShowLoginModal(true);
    }
  };

  const handleAddItem = async (newItemData: Omit<Item, 'id' | 'createdAt' | 'isSold' | 'soldCount'>) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "items"), {
        ...newItemData,
        createdAt: Date.now(),
        isSold: false,
        soldCount: 0,
        createdBy: currentUser.username
      });
      setShowForm(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const handleUpdateItem = async (updatedItem: Item) => {
    if (!currentUser) return;
    try {
        const { id, ...data } = updatedItem;
        const itemRef = doc(db, "items", id);
        await updateDoc(itemRef, {
          ...data,
          lastEditedBy: currentUser.username
        });
        setEditingItem(null);
    } catch (error) {
        console.error("Erro ao atualizar:", error);
    }
  };

  const handleRecordSale = async (id: string, amount: number) => {
    if (!currentUser) return;
    const item = items.find(i => i.id === id);
    if (!item) return;

    const buyer = window.prompt("Nome do comprador?");
    if (buyer === null) return; 

    const newQuantity = Math.max(0, (item.quantity || 0) - amount);
    const newSoldCount = (item.soldCount || 0) + amount;
    const isSold = newQuantity === 0;

    try {
        const itemRef = doc(db, "items", id);
        await updateDoc(itemRef, {
            quantity: newQuantity,
            soldCount: newSoldCount,
            isSold: isSold,
            buyerName: buyer || "Não informado",
            soldAt: Date.now(),
            soldBy: currentUser.username
        });
    } catch (error) {
        console.error("Erro na venda:", error);
    }
  };

  const handleUpdateSoldCount = async (id: string, count: number) => {
    if (!currentUser) return;
    try {
        const itemRef = doc(db, "items", id);
        await updateDoc(itemRef, { 
          soldCount: count,
          lastEditedBy: currentUser.username 
        });
    } catch (error) {
        console.error("Erro ao atualizar vendidos:", error);
    }
  };

  const handleToggleStatus = async (id: string, isSold: boolean) => {
    if (!currentUser) return;
    const item = items.find(i => i.id === id);
    if (!item) return;

    let updateData: any = { isSold: isSold, lastEditedBy: currentUser.username };

    if (isSold) {
      const buyer = window.prompt("Quem comprou?");
      if (buyer === null) return;
      updateData.buyerName = buyer || "Não informado";
      updateData.soldAt = Date.now();
      updateData.soldBy = currentUser.username;
      updateData.quantity = 0;
    } else {
      const res = window.prompt("Quantidade disponível?", "1");
      updateData.quantity = parseInt(res || "1") || 1;
      updateData.buyerName = null;
      updateData.soldAt = null;
      updateData.soldBy = null;
    }

    try {
        const itemRef = doc(db, "items", id);
        await updateDoc(itemRef, updateData);
    } catch (error) {
        console.error("Erro ao mudar status:", error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Excluir este item permanentemente do catálogo?')) {
        try {
            await deleteDoc(doc(db, "items", id));
        } catch (error) {
            console.error("Erro ao deletar:", error);
        }
    }
  };

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    if (!currentUser) return;
    try {
        const itemRef = doc(db, "items", id);
        await updateDoc(itemRef, { 
          price: newPrice,
          lastEditedBy: currentUser.username 
        });
    } catch (error) {
        console.error("Erro ao mudar preço:", error);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchStr = `${item.title} ${item.description} ${item.category}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      
      const matchesStatus = currentUser 
        ? (statusFilter === 'all' || 
          (statusFilter === 'available' && !item.isSold) || 
          (statusFilter === 'sold' && item.isSold))
        : !item.isSold;

      const matchesCategory = categoryFilter === 'Todas' || item.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, searchTerm, statusFilter, categoryFilter, currentUser]);

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return ['Todas', ...Array.from(cats).sort()];
  }, [items]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#fcfdfe] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">Sincronizando Dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-20">
      {currentUser && showAdmin && (
        <AdminDashboard 
          items={items} 
          onClose={() => setShowAdmin(false)} 
          onAddNew={() => setShowForm(true)}
          onImportItems={(newItems) => {
             newItems.forEach(ni => handleAddItem(ni));
          }}
          onClearAll={() => { 
              if(confirm('Tem certeza que deseja apagar TODOS os itens?')) {
                  items.forEach(item => handleDeleteItem(item.id));
              }
          }}
          onRecordSale={handleRecordSale}
          onToggleStatus={handleToggleStatus} 
          onEditItem={setEditingItem}
          onDelete={handleDeleteItem}
          onUpdatePrice={handleUpdatePrice}
          onUpdateSoldCount={handleUpdateSoldCount}
        />
      )}

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl text-center border border-white/20">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter leading-none">Acesso Administrativo</h2>
            <p className="text-blue-600 font-bold text-[10px] uppercase tracking-widest mb-8">Gestão de Catálogo</p>
            
            {authError && (
                <div className="mb-6 p-6 bg-red-50 rounded-[2rem] border border-red-100 text-left">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Erro de Segurança</p>
                    <p className="text-xs text-red-700 font-bold leading-relaxed mb-4">{authError.message}</p>
                    
                    {authError.domain && (
                        <div className="bg-white/80 p-4 rounded-2xl border border-red-200">
                            <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Copie e adicione no Firebase:</p>
                            <code className="block text-[10px] text-blue-600 font-mono font-bold break-all bg-blue-50 p-2 rounded-lg mb-3">{authError.domain}</code>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(authError.domain || '');
                                    alert('Endereço copiado!');
                                }}
                                className="w-full py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md"
                            >
                                Copiar Endereço
                            </button>
                        </div>
                    )}

                    <button 
                      onClick={() => {
                        setAuthError(null);
                        setIsLoggingIn(false);
                      }}
                      className="mt-4 w-full py-3 text-red-600 text-[10px] font-black uppercase tracking-widest hover:underline"
                    >
                      Tentar Novamente
                    </button>
                </div>
            )}

            {!authError && (
              <button 
                onClick={handleLoginGoogle}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 py-4 px-6 rounded-2xl font-black text-gray-700 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                {isLoggingIn ? "Conectando..." : "Entrar com Google"}
              </button>
            )}
            
            <button 
              onClick={() => {
                  setShowLoginModal(false);
                  setAuthError(null);
                  setIsLoggingIn(false);
              }} 
              className="mt-8 text-xs font-black text-gray-300 uppercase tracking-widest hover:text-gray-500 transition-colors"
            >
              Voltar ao Catálogo
            </button>
          </div>
        </div>
      )}

      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 h-20">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <div>
                <h1 className="text-sm font-black text-gray-900 tracking-tighter hidden sm:block leading-none uppercase">Desapego Inteligente</h1>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter hidden sm:block">Salão de Beleza</p>
            </div>
          </div>

          <div className="flex-1 max-w-xl">
            <input
              type="text"
              placeholder="Pesquisar no catálogo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2.5 px-6 outline-none text-sm font-medium focus:bg-white focus:border-blue-400 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleToggleAdmin} 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${currentUser ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}
            >
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} className="w-5 h-5 rounded-full border border-white/20" alt="" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              )}
              {currentUser && <span className="text-xs font-black uppercase hidden md:block">{currentUser.username.split(' ')[0]}</span>}
            </button>
            {currentUser && (
                <button onClick={() => setShowAdmin(true)} className="p-2.5 bg-white border border-gray-100 text-gray-600 rounded-xl shadow-sm hover:bg-gray-50 transition-all active:scale-95">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full sm:w-auto">
                {categories.map(cat => (
                    <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-5 py-2 rounded-2xl font-bold text-xs whitespace-nowrap border transition-all ${categoryFilter === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}>{cat}</button>
                ))}
            </div>

            {currentUser && (
              <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto shadow-inner">
                  {(['all', 'available', 'sold'] as const).map(f => (
                      <button 
                        key={f} 
                        onClick={() => setStatusFilter(f)} 
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {f === 'all' ? 'Ver Tudo' : f === 'available' ? 'Em Estoque' : 'Vendidos'}
                      </button>
                  ))}
              </div>
            )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems.map(item => (
            <ItemCard 
              key={item.id} 
              item={item} 
              isAdmin={!!currentUser} 
              onSell={(amount) => handleRecordSale(item.id, amount)} 
              onUpdatePrice={handleUpdatePrice} 
              onDelete={handleDeleteItem} 
              onEdit={setEditingItem} 
            />
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full py-32 text-center border-2 border-dashed border-gray-100 rounded-[3rem] flex flex-col items-center justify-center gap-6">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <p className="text-gray-300 font-black text-xl uppercase tracking-widest max-w-sm">Nenhum item encontrado</p>
              {currentUser && (
                <button 
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-blue-100"
                >
                  Cadastrar Novo Item
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {currentUser && showForm && <ItemForm onAdd={handleAddItem} onCancel={() => setShowForm(false)} existingCategories={categories.filter(c => c !== 'Todas')} />}
      {currentUser && editingItem && <ItemForm itemToEdit={editingItem} onUpdate={handleUpdateItem} onCancel={() => setEditingItem(null)} existingCategories={categories.filter(c => c !== 'Todas')} />}
    </div>
  );
};

export default App;
