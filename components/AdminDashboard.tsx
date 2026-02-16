
import React, { useMemo } from 'react';
import { Item } from '../types';

interface AdminDashboardProps {
  items: Item[];
  onClose: () => void;
  onAddNew: () => void;
  onToggleStatus: (id: string, isSold: boolean) => void;
  onEditItem?: (item: Item) => void;
  onDelete?: (id: string) => void;
  onUpdatePrice: (id: string, price: number) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  items, onClose, onAddNew, onToggleStatus, onEditItem, onDelete, onUpdatePrice 
}) => {
  const stats = useMemo(() => {
    let revenue = 0;
    let availableCount = 0;
    let soldCountTotal = 0;

    items.forEach(item => {
      if (item.isSold) {
        revenue += item.price;
        soldCountTotal++;
      } else {
        availableCount++;
      }
    });

    return {
      revenue,
      availableCount,
      soldCountTotal,
      totalItems: items.length
    };
  }, [items]);

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
            <button onClick={onAddNew} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
              Cadastrar Item
            </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full space-y-8">
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

        {/* Lista de Itens */}
        <div className="bg-white border rounded-[2.5rem] shadow-sm overflow-hidden mb-12">
            <div className="px-8 py-6 border-b bg-gray-50/30 flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Lista de Produtos</h4>
                <div className="flex gap-2">
                   <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                   <span className="text-[9px] font-black text-gray-400 uppercase">Ativo</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                        <tr className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                            <th className="px-8 py-4">Produto</th>
                            <th className="px-8 py-4 text-center">Preço</th>
                            <th className="px-8 py-4 text-center">Status</th>
                            <th className="px-8 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-8 py-20 text-center">
                                    <p className="text-gray-300 font-bold italic">Nenhum item cadastrado no sistema.</p>
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => (
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
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <span className="font-black text-green-600 text-sm">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
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
      </div>
    </div>
  );
};
