
import React, { useState, useEffect, useMemo } from 'react';
import { Item, UserSession } from './types';
import { ItemCard } from './components/ItemCard';
import { ItemForm } from './components/ItemForm';
import { AdminDashboard } from './components/AdminDashboard';

// --- FIREBASE CDN IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

// --- LISTA VIP DE ACESSO ---
const ALLOWED_EMAILS = [
  'apareaspontas@gmail.com', 
  'filipejjvsf@gmail.com'
];

const App: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (ALLOWED_EMAILS.includes(user.email || '')) {
          setCurrentUser({
            username: user.displayName || user.email || 'Usuário',
            email: user.email || '',
            photoURL: user.photoURL || undefined
          });
        } else {
          alert(`Acesso Negado: O e-mail ${user.email} não tem permissão de administrador.`);
          signOut(auth);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
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
    try {
      await signInWithPopup(auth, googleProvider);
      setShowLoginModal(false);
    } catch (error: any) {
      console.error("Erro detalhado no login:", error);
      
      // Tratamento amigável de erros comuns do Firebase
      if (error.code === 'auth/unauthorized-domain') {
        alert("ERRO DE CONFIGURAÇÃO:\n\nEste domínio (" + window.location.hostname + ") não está autorizado no Firebase.\n\nVá em Authentication > Settings > Authorized Domains e adicione este link.");
      } else if (error.code === 'auth/popup-blocked') {
        alert("O navegador bloqueou a janela de login. Por favor, autorize popups para este site.");
      } else {
        alert("Falha ao entrar: " + (error.message || "Erro desconhecido"));
      }
    } finally {
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
    if (window.confirm('Excluir do catálogo?')) {
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
              if(confirm('Zerar inventário?')) {
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
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Painel da Loja</h2>
            <p className="text-sm text-gray-400 font-medium mb-8">Acesso restrito a administradores autorizados.</p>
            
            <button 
              onClick={handleLoginGoogle}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 py-4 px-6 rounded-2xl font-black text-gray-700 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              {isLoggingIn ? "Conectando..." : "Entrar com Google"}
            </button>
            
            <button 
              onClick={() => setShowLoginModal(false)} 
              className="mt-6 text-xs font-black text-gray-300 uppercase tracking-widest hover:text-gray-500"
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
            <h1 className="text-xl font-black text-gray-900 tracking-tighter hidden sm:block">Re-Market</h1>
          </div>

          <div className="flex-1 max-w-xl">
            <input
              type="text"
              placeholder="O que você está procurando?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2.5 px-6 outline-none text-sm font-medium focus:bg-white focus:border-blue-400 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleToggleAdmin} 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${currentUser ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}
              title={currentUser ? "Admin Conectada" : "Login Admin"}
            >
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} className="w-5 h-5 rounded-full" alt="" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              )}
              {currentUser && <span className="text-xs font-black uppercase hidden md:block">{currentUser.username.split(' ')[0]}</span>}
            </button>
            {currentUser && (
                <button onClick={() => setShowAdmin(true)} className="p-2.5 bg-white border border-gray-100 text-gray-600 rounded-xl shadow-sm hover:bg-gray-50">
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
                    <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-5 py-2 rounded-2xl font-bold text-xs whitespace-nowrap border transition-all ${categoryFilter === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}>{cat}</button>
                ))}
            </div>

            {currentUser && (
              <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                  {(['all', 'available', 'sold'] as const).map(f => (
                      <button 
                        key={f} 
                        onClick={() => setStatusFilter(f)} 
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                      >
                        {f === 'all' ? 'Tudo' : f === 'available' ? 'Ativos' : 'Vendidos'}
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
            <div className="col-span-full py-24 text-center border-2 border-dashed border-gray-100 rounded-[3rem] flex flex-col items-center justify-center gap-6">
              <p className="text-gray-300 font-black text-xl uppercase tracking-widest max-w-sm">O catálogo está vazio</p>
              {currentUser && (
                <button 
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-blue-100"
                >
                  Cadastrar Primeiro Item
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
