
import React, { useMemo, useState } from 'react';
import { Item, Quote, QuoteItem } from '../types';

interface AdminDashboardProps {
  items: Item[];
    quotes: Quote[];
  onClose: () => void;
  onAddNew: () => void;
  onToggleStatus: (id: string, isSold: boolean) => void;
    onToggleVisibility: (id: string, isEnabled: boolean) => void;
    onToggleAllVisibility?: (enabled: boolean) => void;
    onCreateQuote: (data: { clientName: string; clientPhone: string; items: QuoteItem[]; total: number; }) => void;
    onUpdateQuote: (quote: Quote, data: { clientName: string; clientPhone: string; items: QuoteItem[]; total: number; status: 'orcamento' | 'aprovado'; }) => void;
    onDeleteQuote: (quoteId: string) => void;
    onUpdateQuoteStatus: (quote: Quote, status: 'orcamento' | 'aprovado') => void;
  onEditItem?: (item: Item) => void;
  onDelete?: (id: string) => void;
  onUpdatePrice: (id: string, price: number) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    items, quotes, onClose, onAddNew, onToggleStatus, onToggleVisibility, onToggleAllVisibility, onCreateQuote, onUpdateQuote, onDeleteQuote, onUpdateQuoteStatus, onEditItem, onDelete, onUpdatePrice 
}) => {
    const [activeTab, setActiveTab] = useState<'items' | 'quotes'>('items');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [quoteLines, setQuoteLines] = useState<Array<{ itemId: string; quantity: number }>>([{ itemId: '', quantity: 1 }]);
    const [quoteItemSearch, setQuoteItemSearch] = useState('');
    const [quoteSearch, setQuoteSearch] = useState('');
    const [quoteStatus, setQuoteStatus] = useState<'todos' | 'orcamento' | 'aprovado'>('todos');
    const [itemVisibilityFilter, setItemVisibilityFilter] = useState<'todos' | 'habilitado' | 'desabilitado'>('todos');
        const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
        const [editClientName, setEditClientName] = useState('');
        const [editClientPhone, setEditClientPhone] = useState('');
        const [editStatus, setEditStatus] = useState<'orcamento' | 'aprovado'>('orcamento');
        const [editLines, setEditLines] = useState<Array<{ itemId: string; quantity: number }>>([]);

    const stats = useMemo(() => {
    let revenue = 0;
    let availableCount = 0;
    let soldCountTotal = 0;

    items.forEach(item => {
      const q = item.quantity || 1;
      if (item.isSold) {
        revenue += item.price;
        soldCountTotal++;
      } else {
        availableCount += q;
      }
    });

    return {
      revenue,
      availableCount,
      soldCountTotal,
      totalItems: items.reduce((acc, item) => acc + (item.quantity || 1), 0)
    };
  }, [items]);

    const getCategoryLabel = (value: Item['category']) => {
        return Array.isArray(value) ? value.join(' / ') : value;
    };

    const filteredAdminItems = useMemo(() => {
        if (itemVisibilityFilter === 'todos') return items;
        const target = itemVisibilityFilter === 'habilitado';
        return items.filter((item) => (item.isEnabled === true) === target);
    }, [items, itemVisibilityFilter]);

    const quoteItems = useMemo(() => {
        return quoteLines
            .map((line) => {
                const item = items.find((i) => i.id === line.itemId);
                if (!item) return null;
                return {
                    itemId: item.id,
                    title: item.title,
                    price: item.price,
                    quantity: Math.max(1, Number(line.quantity) || 1)
                } as QuoteItem;
            })
            .filter((line): line is QuoteItem => !!line);
    }, [quoteLines, items]);

    const itemThumbs = useMemo(() => {
        return items.reduce<Record<string, string>>((acc, item) => {
            acc[item.id] = item.imageUrls?.[0] || 'https://via.placeholder.com/80';
            return acc;
        }, {});
    }, [items]);

    const quoteTotal = useMemo(() => {
        return quoteItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [quoteItems]);

    const editItems = useMemo(() => {
        return editLines
            .map((line) => {
                const item = items.find((i) => i.id === line.itemId);
                if (!item) return null;
                return {
                    itemId: item.id,
                    title: item.title,
                    price: item.price,
                    quantity: Math.max(1, Number(line.quantity) || 1)
                } as QuoteItem;
            })
            .filter((line): line is QuoteItem => !!line);
    }, [editLines, items]);

    const editTotal = useMemo(() => {
        return editItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [editItems]);

    const filteredQuotes = useMemo(() => {
        return quotes.filter((quote) => {
            const matchesStatus = quoteStatus === 'todos' ? true : quote.status === quoteStatus;
            const search = quoteSearch.trim().toLowerCase();
            const matchesSearch = search.length === 0
                ? true
                : quote.clientName.toLowerCase().includes(search) || quote.clientPhone.toLowerCase().includes(search);
            return matchesStatus && matchesSearch;
        });
    }, [quotes, quoteStatus, quoteSearch]);

    const filteredItems = useMemo(() => {
        const search = quoteItemSearch.trim().toLowerCase();
        if (!search) return items;
        return items.filter((item) => item.title.toLowerCase().includes(search));
    }, [items, quoteItemSearch]);

    const updateQuoteLine = (index: number, next: Partial<{ itemId: string; quantity: number }>) => {
        setQuoteLines((prev) => prev.map((line, idx) => idx === index ? { ...line, ...next } : line));
    };

    const addQuoteLine = () => {
        setQuoteLines((prev) => [...prev, { itemId: '', quantity: 1 }]);
    };

    const removeQuoteLine = (index: number) => {
        setQuoteLines((prev) => prev.filter((_, idx) => idx !== index));
    };

    const updateEditLine = (index: number, next: Partial<{ itemId: string; quantity: number }>) => {
        setEditLines((prev) => prev.map((line, idx) => idx === index ? { ...line, ...next } : line));
    };

    const addEditLine = () => {
        setEditLines((prev) => [...prev, { itemId: '', quantity: 1 }]);
    };

    const removeEditLine = (index: number) => {
        setEditLines((prev) => prev.filter((_, idx) => idx !== index));
    };

    const startEditQuote = (quote: Quote) => {
        setEditingQuoteId(quote.id);
        setEditClientName(quote.clientName);
        setEditClientPhone(quote.clientPhone);
        setEditStatus(quote.status);
        setEditLines(quote.items.map((item) => ({ itemId: item.itemId, quantity: item.quantity })));
    };

    const cancelEditQuote = () => {
        setEditingQuoteId(null);
        setEditClientName('');
        setEditClientPhone('');
        setEditStatus('orcamento');
        setEditLines([]);
    };

    const handleSaveEditQuote = (quote: Quote) => {
        if (!editClientName.trim() || !editClientPhone.trim()) {
            alert('Informe nome e telefone do cliente.');
            return;
        }
        if (editItems.length === 0) {
            alert('Adicione pelo menos um item no orcamento.');
            return;
        }
        onUpdateQuote(quote, {
            clientName: editClientName.trim(),
            clientPhone: editClientPhone.trim(),
            items: editItems,
            total: editTotal,
            status: editStatus
        });
        cancelEditQuote();
    };

    const handleCreateQuote = () => {
        if (!clientName.trim() || !clientPhone.trim()) {
            alert('Informe nome e telefone do cliente.');
            return;
        }
        if (quoteItems.length === 0) {
            alert('Adicione pelo menos um item no orcamento.');
            return;
        }
        onCreateQuote({
            clientName: clientName.trim(),
            clientPhone: clientPhone.trim(),
            items: quoteItems,
            total: quoteTotal
        });
        setClientName('');
        setClientPhone('');
        setQuoteLines([{ itemId: '', quantity: 1 }]);
    };

  return (
    <div className="fixed inset-0 bg-[#fcfdfe] z-[70] flex flex-col animate-fade-in no-print-bg">
      {/* Header Fixo */}
      <header className="bg-white border-b px-8 h-24 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
            <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-gray-50 border rounded-2xl hover:bg-gray-100 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter text-gray-900 leading-none">Painel de Gestão</h1>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Controle de Inventário e Vendas</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
                        <button
                            onClick={() => window.open('/', '_blank')}
                            className="bg-white text-gray-600 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-gray-100 hover:border-gray-300 transition-all"
                        >
                            Visualizar Loja
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="bg-white text-gray-600 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-gray-100 hover:border-gray-300 transition-all"
                        >
                            Imprimir Loja
                        </button>
            <button onClick={onAddNew} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
              Cadastrar Item
            </button>
        </div>
      </header>

    <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full space-y-10">
        {/* Cartões de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col justify-between">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Faturamento Total</span>
                <h3 className="text-2xl font-black text-green-600">R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col justify-between">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Disponíveis</span>
                <h3 className="text-2xl font-black text-gray-900">{stats.availableCount} <span className="text-sm font-bold text-gray-400 ml-1">itens</span></h3>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col justify-between">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Vendidos</span>
                <h3 className="text-2xl font-black text-blue-600">{stats.soldCountTotal} <span className="text-sm font-bold text-gray-400 ml-1">vendas</span></h3>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col justify-between">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Cadastrado</span>
                <h3 className="text-2xl font-black text-gray-400">{stats.totalItems}</h3>
            </div>
        </div>

        <div className="flex flex-wrap gap-3">
            <button
                onClick={() => setActiveTab('items')}
                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                    activeTab === 'items'
                    ? 'bg-gray-900 text-white border-gray-900 shadow-xl shadow-gray-100'
                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                }`}
            >
                Itens
            </button>
            <button
                onClick={() => setActiveTab('quotes')}
                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                    activeTab === 'quotes'
                    ? 'bg-gray-900 text-white border-gray-900 shadow-xl shadow-gray-100'
                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                }`}
            >
                Orcamentos
            </button>
        </div>

        {activeTab === 'items' && (
        <div className="bg-white border rounded-[2.5rem] shadow-sm overflow-hidden mb-12">
            <div className="px-8 py-6 border-b bg-gray-50/30 flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Lista de Produtos</h4>
                <div className="flex items-center gap-3">
                       {onToggleAllVisibility && (
                           <div className="flex items-center gap-2">
                               <button
                                   type="button"
                                   onClick={() => onToggleAllVisibility(true)}
                                   className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 text-green-600 hover:bg-green-50 transition-all"
                                   title="Habilitar todos"
                               >
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                               </button>
                               <button
                                   type="button"
                                   onClick={() => onToggleAllVisibility(false)}
                                   className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 text-red-600 hover:bg-red-50 transition-all"
                                   title="Desabilitar todos"
                               >
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                               </button>
                           </div>
                       )}
                   <select
                       value={itemVisibilityFilter}
                       onChange={(e) => setItemVisibilityFilter(e.target.value as 'todos' | 'habilitado' | 'desabilitado')}
                       className="px-3 py-2 rounded-xl border border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-500 bg-white"
                   >
                       <option value="todos">Todos</option>
                       <option value="habilitado">Habilitado</option>
                       <option value="desabilitado">Desabilitado</option>
                   </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                        <tr className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                            <th className="px-8 py-4">Produto</th>
                            <th className="px-8 py-4 text-center">Preço</th>
                            <th className="px-8 py-4 text-center">Qtd</th>
                            <th className="px-8 py-4 text-center">Status</th>
                            <th className="px-8 py-4 text-center">Visível</th>
                            <th className="px-8 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredAdminItems.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-8 py-20 text-center">
                                    <p className="text-gray-300 font-bold italic">Nenhum item cadastrado no sistema.</p>
                                </td>
                            </tr>
                        ) : (
                            filteredAdminItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl overflow-hidden border bg-gray-100 shrink-0">
                                                <img 
                                                    src={item.imageUrls?.[0] || 'https://via.placeholder.com/100'} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 text-sm uppercase tracking-tight">{item.title}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{getCategoryLabel(item.category)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <span className="font-black text-green-600 text-sm">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="font-bold text-gray-900 text-sm">{item.quantity || 1}</span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <button 
                                            onClick={() => onToggleStatus(item.id, !item.isSold)}
                                            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                                item.isSold 
                                                ? 'bg-red-50 text-red-600 border border-red-100' 
                                                : 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'
                                            }`}
                                        >
                                            {item.isSold ? 'Vendido' : 'Disponível'}
                                        </button>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <button 
                                            onClick={() => onToggleVisibility(item.id, !(item.isEnabled === true))}
                                            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                                item.isEnabled === true
                                                ? 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100'
                                                : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'
                                            }`}
                                        >
                                            {item.isEnabled === true ? 'Habilitado' : 'Desabilitado'}
                                        </button>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => onEditItem?.(item)}
                                                className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                                                title="Editar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button 
                                                onClick={() => onDelete?.(item.id)}
                                                className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                                                title="Excluir"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        )}

        {activeTab === 'quotes' && (
        <div className="bg-white border rounded-[2.5rem] shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b bg-gray-50/30 flex justify-between items-center">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Orcamentos</h4>
                        <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">{filteredQuotes.length} ativos</div>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-gray-400">Nome do Cliente</label>
                                <input
                                    type="text"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Ex: Maria Silva"
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm focus:bg-white focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-gray-400">Telefone</label>
                                <input
                                    type="text"
                                    value={clientPhone}
                                    onChange={(e) => setClientPhone(e.target.value)}
                                    placeholder="(11) 99999-9999"
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm focus:bg-white focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-gray-400">Total</label>
                                <div className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-green-600 text-sm">
                                    R$ {quoteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-gray-400">Buscar Cliente</label>
                                <input
                                    type="text"
                                    value={quoteSearch}
                                    onChange={(e) => setQuoteSearch(e.target.value)}
                                    placeholder="Nome ou telefone"
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm focus:bg-white focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-gray-400">Status</label>
                                <select
                                    value={quoteStatus}
                                    onChange={(e) => setQuoteStatus(e.target.value as 'todos' | 'orcamento' | 'aprovado')}
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm focus:bg-white focus:border-blue-400 transition-all"
                                >
                                    <option value="todos">Todos</option>
                                    <option value="orcamento">Orcamento</option>
                                    <option value="aprovado">Aprovado</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-gray-400">Buscar Item</label>
                                <input
                                    type="text"
                                    value={quoteItemSearch}
                                    onChange={(e) => setQuoteItemSearch(e.target.value)}
                                    placeholder="Nome do item"
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm focus:bg-white focus:border-blue-400 transition-all"
                                />
                            </div>
                            {quoteLines.map((line, index) => (
                                <div key={`quote-line-${index}`} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-4 items-center">
                                    <select
                                        value={line.itemId}
                                        onChange={(e) => updateQuoteLine(index, { itemId: e.target.value })}
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm focus:bg-white focus:border-blue-400 transition-all"
                                    >
                                        <option value="">Selecione um item</option>
                                        {filteredItems.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.title} (disp: {item.quantity ?? 1})
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={line.quantity}
                                        onChange={(e) => updateQuoteLine(index, { quantity: parseInt(e.target.value, 10) || 1 })}
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm focus:bg-white focus:border-blue-400 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeQuoteLine(index)}
                                        className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl border border-red-100 hover:bg-red-100 transition-all"
                                        title="Remover item"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={addQuoteLine}
                                    className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                                >
                                    Adicionar Item
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateQuote}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                                >
                                    Criar Orcamento
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {filteredQuotes.length === 0 ? (
                                <div className="text-center py-10 text-gray-300 font-bold italic">Nenhum orcamento encontrado.</div>
                            ) : (
                                filteredQuotes.map((quote) => (
                                    <div key={quote.id} className="border border-gray-100 rounded-2xl p-6 flex flex-col gap-4">
                                        <div className="flex flex-wrap justify-between gap-4">
                                                <div>
                                                <p className="font-black text-gray-900 text-sm uppercase tracking-tight">
                                                    Orcamento #{quote.number ?? '---'}
                                                </p>
                                                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">{quote.clientName}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{quote.clientPhone}</p>
                                                {quote.createdBy && (
                                                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Criado por: {quote.createdBy}</p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total</p>
                                                <p className="text-lg font-black text-green-600">R$ {quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${quote.status === 'aprovado' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                                                    {quote.status === 'aprovado' ? 'Aprovado' : 'Orcamento'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {quote.items.map((item) => (
                                                <div key={`${quote.id}-${item.itemId}`} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-3 text-[11px] font-bold text-gray-500">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={itemThumbs[item.itemId] || 'https://via.placeholder.com/80'}
                                                            className="w-10 h-10 rounded-xl object-cover border"
                                                        />
                                                        <span>{item.title}</span>
                                                    </div>
                                                    <span>{item.quantity}x</span>
                                                </div>
                                            ))}
                                        </div>

                                                {editingQuoteId === quote.id ? (
                                                    <div className="space-y-4 border-t border-gray-100 pt-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <input
                                                                type="text"
                                                                value={editClientName}
                                                                onChange={(e) => setEditClientName(e.target.value)}
                                                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={editClientPhone}
                                                                onChange={(e) => setEditClientPhone(e.target.value)}
                                                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
                                                            />
                                                            <select
                                                                value={editStatus}
                                                                onChange={(e) => setEditStatus(e.target.value as 'orcamento' | 'aprovado')}
                                                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
                                                            >
                                                                <option value="orcamento">Orcamento</option>
                                                                <option value="aprovado">Aprovado</option>
                                                            </select>
                                                        </div>

                                                        <div className="space-y-3">
                                                            {editLines.map((line, index) => (
                                                                <div key={`edit-line-${quote.id}-${index}`} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-4 items-center">
                                                                    <select
                                                                        value={line.itemId}
                                                                        onChange={(e) => updateEditLine(index, { itemId: e.target.value })}
                                                                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
                                                                    >
                                                                        <option value="">Selecione um item</option>
                                                                        {filteredItems.map((item) => (
                                                                            <option key={item.id} value={item.id}>
                                                                                {item.title} (disp: {item.quantity ?? 1})
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        step={1}
                                                                        value={line.quantity}
                                                                        onChange={(e) => updateEditLine(index, { quantity: parseInt(e.target.value, 10) || 1 })}
                                                                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeEditLine(index)}
                                                                        className="w-10 h-10 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100 transition-all"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                type="button"
                                                                onClick={addEditLine}
                                                                className="px-4 py-2 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                                                            >
                                                                Adicionar Item
                                                            </button>
                                                        </div>

                                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                                            <span className="text-sm font-black text-green-600">
                                                                Total: R$ {editTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveEditQuote(quote)}
                                                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                                                                >
                                                                    Salvar
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={cancelEditQuote}
                                                                    className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (confirm('Deseja excluir este orcamento?')) {
                                                                            onDeleteQuote(quote.id);
                                                                            cancelEditQuote();
                                                                        }
                                                                    }}
                                                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest"
                                                                >
                                                                    Excluir
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        {quote.status === 'orcamento' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onUpdateQuoteStatus(quote, 'aprovado')}
                                                                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                                                            >
                                                                Aprovar Compra
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditQuote(quote)}
                                                            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => confirm('Deseja excluir este orcamento?') && onDeleteQuote(quote.id)}
                                                            className="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all"
                                                        >
                                                            Excluir
                                                        </button>
                                                    </div>
                                                )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
        )}
      </div>
    </div>
  );
};
