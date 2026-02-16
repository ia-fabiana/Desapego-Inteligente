
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

export const ItemCard: React.FC<ItemCardProps> = ({ item, isAdmin, onSell, onDelete, onEdit }) => {
  const [currentImg, setCurrentImg] = useState(0);
  const urls = item.imageUrls && item.imageUrls.length > 0 
    ? item.imageUrls 
    : ['https://via.placeholder.com/600x600?text=Sem+Foto'];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImg((prev) => (prev + 1) % urls.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImg((prev) => (prev - 1 + urls.length) % urls.length);
  };

  const handleWhatsApp = () => {
    const msg = `Olá! Vi o item "${item.title}" no seu site e gostaria de saber se ainda está disponível.`;
    // Número padrão ou configurado
    window.open(`https://wa.me/5511934588562?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden flex flex-col shadow-sm hover:shadow-2xl transition-all group animate-fade-in">
      {/* Container da Imagem / Carrossel */}
      <div className="relative aspect-[4/5] bg-gray-50 overflow-hidden">
        {/* Camada de Imagem com Transição Suave */}
        <div className="w-full h-full relative">
            {urls.map((url, idx) => (
                <img 
                    key={idx}
                    src={url} 
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${idx === currentImg ? 'opacity-100 z-10' : 'opacity-0 z-0'}`} 
                    alt={`${item.title} - foto ${idx + 1}`} 
                />
            ))}
        </div>
        
        {/* Navegação do Carrossel (Visível no Hover) */}
        {urls.length > 1 && (
          <>
            <button 
                onClick={handlePrev} 
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all z-30 active:scale-90"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button 
                onClick={handleNext} 
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all z-30 active:scale-90"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
            
            {/* Indicadores do Carrossel */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-30 pointer-events-none">
               {urls.map((_, idx) => (
                 <div 
                    key={idx} 
                    className={`h-1 rounded-full transition-all duration-300 ${idx === currentImg ? 'w-6 bg-white shadow-sm' : 'w-2 bg-white/40'}`} 
                 />
               ))}
            </div>
          </>
        )}

        {/* Categoria Badge */}
        <div className="absolute top-6 left-6 z-20">
            <span className="bg-gray-900/80 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg border border-white/10">
                {item.category}
            </span>
        </div>

        {/* Overlay de Vendido */}
        {item.isSold && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-40">
            <div className="bg-red-600 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl animate-pulse">
                Indisponível
            </div>
          </div>
        )}

        {/* Ações Administrativas Rápidas */}
        {isAdmin && !item.isSold && (
           <div className="absolute bottom-6 right-6 flex gap-2 z-40 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
              <button 
                onClick={() => onEdit(item)} 
                className="w-12 h-12 bg-white text-blue-600 rounded-2xl shadow-2xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
                title="Editar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button 
                onClick={() => onDelete(item.id)} 
                className="w-12 h-12 bg-white text-red-600 rounded-2xl shadow-2xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"
                title="Excluir"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
           </div>
        )}
      </div>

      {/* Conteúdo Informativo */}
      <div className="p-8 flex flex-col flex-1 bg-white">
        <h3 className="text-gray-900 font-black text-sm uppercase tracking-tighter mb-2 line-clamp-1">{item.title}</h3>
        <p className="text-gray-400 text-[11px] font-medium leading-relaxed mb-8 line-clamp-2 flex-1">{item.description}</p>
        
        <div className="flex items-center justify-between mb-8">
           <div className="text-2xl font-black text-green-600 tracking-tighter">
             <span className="text-xs font-bold mr-1">R$</span>
             {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
           </div>
           {/* {!item.isSold && <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Pronta Entrega</span>} */}
        </div>

        {!item.isSold ? (
          <div className="flex gap-3">
            <button 
                onClick={handleWhatsApp} 
                className="flex-1 bg-gray-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-200"
            >
                Comprar
            </button>
            {isAdmin && (
              <button 
                onClick={() => onSell(1)} 
                className="w-16 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 font-black text-[10px] hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                title="Marcar como Vendido"
              >
                OK
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-5 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50">
            <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] italic">Oportunidade encerrada</span>
          </div>
        )}
      </div>
    </div>
  );
};
