
import React, { useState, useEffect, useMemo } from 'react';
import { Item } from './types';
import { ItemCard } from './components/ItemCard';
import { ItemForm } from './components/ItemForm';
import { AdminDashboard } from './components/AdminDashboard';

// --- FIREBASE CDN IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const ADMIN_SESSION_KEY = 'remarket_is_admin';
const ADMIN_PASSWORD = 'adm'; 

const App: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');

  useEffect(() => {
    const isLogged = localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    setIsAdmin(isLogged);

    const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Item[];
      setItems(itemsData);
    });

    return () => unsubscribe();
  }, []);

  const handleToggleAdmin = () => {
    if (isAdmin) {
      if (window.confirm("Deseja sair do modo administrador?")) {
        setIsAdmin(false);
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setShowLoginModal(false);
      setLoginPassword('');
    } else {
      alert("Senha incorreta!");
    }
  };

  const handleAddItem = async (newItemData: Omit<Item, 'id' | 'createdAt' | 'isSold' | 'soldCount'>) => {
    try {
      await addDoc(collection(db, "items"), {
        ...newItemData,
        createdAt: Date.now(),
        isSold: false,
        soldCount: 0
      });
      setShowForm(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const handleUpdateItem = async (updatedItem: Item) => {
    try {
        const { id, ...data } = updatedItem;
        const itemRef = doc(db, "items", id);
        await updateDoc(itemRef, data);
        setEditingItem(null);
    } catch (error) {
        console.error("Erro ao atualizar:", error);
    }
  };

  const handleRecordSale = async (id: string, amount: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newQuantity = Math.max(0, (item.quantity || 0) - amount);
    const newSoldCount = (item.soldCount || 0) + amount;
    const isSold = newQuantity === 0;

    try {
        const itemRef = doc(db, "items", id);
        await updateDoc(itemRef, {
            quantity: newQuantity,
            soldCount: newSoldCount,
            isSold: isSold
        });
    } catch (error) {
        console.error("Erro na venda:", error);
    }
  };

  const handleUpdateSoldCount = async (id: string, count: number) => {
    try {
        const itemRef = doc(db, "items", id);
        await updateDoc(itemRef, { soldCount: count });
    } catch (error) {
        console.error("Erro ao atualizar vendidos:", error);
    }
  };

  const handleToggleStatus = async (id: string, isSold: boolean) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    let newQty = item.quantity;
    if (!isSold && item.quantity === 0) {
      const res = window.prompt("Qual a nova quantidade disponível para este item?", "1");
      newQty = parseInt(res || "1") || 1;
    }

    try {
        const itemRef = doc(db, "items", id);
        await updateDoc(itemRef, { isSold: isSold, quantity: newQty });
    } catch (error) {
        console.error("Erro ao mudar status:", error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Excluir permanentemente do catálogo?')) {
        try {
            await deleteDoc(doc(db, "items", id));
        } catch (error) {
            console.error("Erro ao deletar:", error);
        }
    }
  };

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    try {
        const itemRef = doc(db, "items", id);
        await updateDoc(itemRef, { price: newPrice });
    } catch (error) {
        console.error("Erro ao mudar preço:", error);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchStr = `${item.title} ${item.description} ${item.category}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'available' && !item.isSold) || 
                           (statusFilter === 'sold' && item.isSold);
      const matchesCategory = categoryFilter === 'Todas' || item.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, searchTerm, statusFilter, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return ['Todas', ...Array.from(cats).sort()];
  }, [items]);

  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-20">
      {isAdmin && showAdmin && (
        <AdminDashboard 
          items={items} 
          onClose={() => setShowAdmin(false)} 
          onAddNew={() => setShowForm(true)}
          onImportItems={(newItems) => {
             newItems.forEach(ni => handleAddItem(ni));
          }}
          onClearAll={() => { 
              if(confirm('Zerar inventário no Firebase?')) {
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
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl">
            <h2 className="text-xl font-black text-gray-900 text-center mb-6">Modo Admin</h2>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <input 
                type="password" 
                placeholder="Senha adm" 
                autoFocus
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-center"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-bold text-gray-400 hover:bg-gray-50 rounded-2xl">Cancelar</button>
                <button type="submit" className="flex-2 bg-blue-600 text-white font-black py-4 px-8 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100">Entrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 h-20">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tighter hidden sm:block">Re-Market</h1>
          </div>

          <div className="flex-1 max-w-xl">
            <input
              type="text"
              placeholder="Pesquisar itens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2.5 px-6 outline-none text-sm font-medium focus:bg-white focus:border-blue-400 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleToggleAdmin} className={`p-2.5 rounded-xl transition-all border flex items-center justify-center ${isAdmin ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </button>
            {isAdmin && (
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
            <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                {(['all', 'available', 'sold'] as const).map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>{f === 'all' ? 'Tudo' : f === 'available' ? 'Ativos' : 'Vendidos'}</button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems.map(item => (
            <ItemCard key={item.id} item={item} isAdmin={isAdmin} onSell={(amount) => handleRecordSale(item.id, amount)} onUpdatePrice={handleUpdatePrice} onDelete={handleDeleteItem} onEdit={setEditingItem} />
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-gray-100 rounded-[3rem]">
              <p className="text-gray-300 font-black text-xl uppercase tracking-widest">Nenhum item encontrado</p>
            </div>
          )}
        </div>
      </main>

      {isAdmin && showForm && <ItemForm onAdd={handleAddItem} onCancel={() => setShowForm(false)} existingCategories={categories.filter(c => c !== 'Todas')} />}
      {isAdmin && editingItem && <ItemForm itemToEdit={editingItem} onUpdate={handleUpdateItem} onCancel={() => setEditingItem(null)} existingCategories={categories.filter(c => c !== 'Todas')} />}
    </div>
  );
};

export default App;
