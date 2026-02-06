
import React, { useState } from 'react';
import { Item } from '../types';

interface ItemCardProps {
  item: Item;
  isAdmin: boolean;
  onSell: (amount: number) => void;
  onUpdatePrice: (id: string, newPrice: number) => void;
  onDelete: (id: string) => void;
  onEdit: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, isAdmin, onSell, onUpdatePrice, onDelete, onEdit }) => {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState(item.price.toString());

  const handlePriceSave = () => {
    const numericPrice = parseFloat(tempPrice);
    if (!isNaN(numericPrice)) {
      onUpdatePrice(item.id, numericPrice);
      setIsEditingPrice(false);
    }
  };

  const handleInterest = () => {
    const text = `Olá! Vi o item "${item.title}" no Re-Market por R$ ${item.price.toLocaleString('pt-BR')} e gostaria de saber mais detalhes.`;
    window.open(`https://wa.me/5500000000000?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleQuickSell = () => {
    const qty = window.prompt(`Registrar venda de quantas unidades? (Disponível: ${item.quantity})`, "1");
    if (qty) {
      const n = parseInt(qty);
      if (!isNaN(n) && n > 0 && n <= item.quantity) onSell(n);
    }
  };

  return (
    <div className={`bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-xl group ${item.isSold ? 'opacity-80' : ''}`}>
      <div className="relative aspect-square overflow-hidden shrink-0">
        <img 
          src={item.imageUrl} 
          alt={item.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-4 left-4">
           <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black text-gray-900 border border-white/50 uppercase tracking-widest">
             {item.category}
           </span>
        </div>
        
        {item.isSold && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-red-600 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transform -rotate-12">Esgotado</span>
          </div>
        )}

        {/* Ações Rápidas (Só Admin vê flutuando) */}
        {isAdmin && (
          <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(item)} className="p-3 bg-white text-blue-600 rounded-xl shadow-lg border border-white hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button onClick={() => onDelete(item.id)} className="p-3 bg-white text-red-500 rounded-xl shadow-lg border border-white hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex-1 mb-6">
          <h3 className="font-black text-gray-900 text-lg leading-tight mb-2 group-hover:text-blue-600 transition-colors">{item.title}</h3>
          <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed mb-3">{item.description}</p>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md uppercase">{item.brand || 'Original'}</span>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md uppercase">{item.location || 'Brasil'}</span>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Preço Sugerido</p>
              {isEditingPrice && isAdmin ? (
                 <input 
                  type="number"
                  autoFocus
                  value={tempPrice}
                  onChange={e => setTempPrice(e.target.value)}
                  onBlur={handlePriceSave}
                  onKeyDown={e => e.key === 'Enter' && handlePriceSave()}
                  className="w-24 text-xl font-black text-blue-600 outline-none border-b-2 border-blue-200"
                 />
              ) : (
                <div 
                  className={`text-2xl font-black text-green-600 tracking-tighter ${isAdmin ? 'cursor-pointer hover:underline' : ''}`}
                  onClick={() => isAdmin && setIsEditingPrice(true)}
                >
                  R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
            {!item.isSold && (
               <div className="text-right">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Em Estoque</p>
                 <span className="text-xs font-bold text-gray-900">{item.quantity} unidades</span>
               </div>
            )}
          </div>

          <div className="flex gap-2">
            {!item.isSold ? (
              <>
                <button 
                  onClick={handleInterest}
                  className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.1em] hover:bg-black transition-all shadow-xl shadow-gray-100 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Tenho Interesse
                </button>
                {isAdmin && (
                  <button 
                    onClick={handleQuickSell}
                    className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    title="Vender Agora"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
              </>
            ) : (
              <div className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest text-center border border-gray-100">
                Item Vendido
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
