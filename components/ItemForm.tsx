
import React, { useState, useRef, useEffect } from 'react';
import { analyzeItemImage } from '../services/geminiService';
import { Item } from '../types';

interface ItemFormProps {
  onAdd?: (item: Omit<Item, 'id' | 'createdAt' | 'isSold' | 'soldCount'>) => void;
  onUpdate?: (item: Item) => void;
  onCancel: () => void;
  existingCategories?: string[];
  itemToEdit?: Item | null;
}

export const ItemForm: React.FC<ItemFormProps> = ({ onAdd, onUpdate, onCancel, existingCategories = [], itemToEdit }) => {
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [brand, setBrand] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [additionalLink, setAdditionalLink] = useState('');
  const [isSold, setIsSold] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (itemToEdit) {
      setImage(itemToEdit.imageUrl);
      setTitle(itemToEdit.title);
      setDescription(itemToEdit.description);
      setPrice(itemToEdit.price.toString());
      setCategory(itemToEdit.category);
      setLocation(itemToEdit.location || '');
      setBrand(itemToEdit.brand || '');
      setQuantity(itemToEdit.quantity?.toString() || '1');
      setAdditionalLink(itemToEdit.additionalLink || '');
      setIsSold(itemToEdit.isSold);
    }
  }, [itemToEdit]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImage(base64);
        
        if (!itemToEdit) {
          setIsAnalyzing(true);
          try {
            const analysis = await analyzeItemImage(base64);
            setTitle(analysis.title);
            setDescription(analysis.description);
            setPrice(analysis.suggestedPrice.toString());
            setCategory(analysis.category);
          } catch (err) {
            console.error("Erro na análise IA", err);
          } finally {
            setIsAnalyzing(false);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !title || !price) return;
    
    const itemData = {
      title,
      description,
      price: parseFloat(price),
      imageUrl: image,
      category: category || 'Geral',
      location,
      brand,
      quantity: parseInt(quantity) || 1,
      additionalLink,
      isSold
    };

    if (itemToEdit) {
      onUpdate?.({
        ...itemToEdit,
        ...itemData
      });
    } else {
      const { isSold: _, ...dataForAdd } = itemData;
      onAdd?.(dataForAdd);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-10 duration-500">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {itemToEdit ? 'Editar Item' : 'Novo Registro'}
            </h2>
            <p className="text-gray-500 font-medium text-xs mt-1">Altere os dados abaixo e salve para atualizar o inventário</p>
          </div>
          <button onClick={onCancel} className="p-3 hover:bg-white rounded-full transition-all text-gray-400 hover:text-gray-900 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-8 space-y-6 scrollbar-hide">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-[280px] shrink-0">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-square rounded-[2rem] border-4 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${image ? 'border-transparent shadow-xl' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'}`}
              >
                {image ? (
                  <>
                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <span className="text-white text-xs font-black uppercase tracking-widest">Trocar Foto</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8">
                    <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl mb-4 mx-auto w-fit">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Subir Foto Principal</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status de Venda</label>
                <button 
                  type="button"
                  onClick={() => setIsSold(!isSold)}
                  className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${isSold ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}
                >
                  {isSold ? 'Vendido' : 'Disponível'}
                </button>
              </div>

              {isAnalyzing && (
                <div className="mt-6 flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-2xl border border-blue-100 animate-pulse">
                  <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">IA Analisando...</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título do Anúncio</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome do produto..."
                  className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:border-blue-400 outline-none transition-all font-bold text-gray-800 bg-gray-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preço (R$)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:border-blue-400 outline-none transition-all font-black text-green-600 bg-gray-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
                  <input
                    type="text"
                    list="category-suggestions"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:border-blue-400 outline-none transition-all font-bold text-gray-800 bg-gray-50/50"
                  />
                  <datalist id="category-suggestions">
                    {existingCategories.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:border-blue-400 outline-none transition-all font-bold text-gray-800 bg-gray-50/50"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Marca / Modelo</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Marca do item..."
                    className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:border-blue-400 outline-none transition-all font-bold text-gray-800 bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Localização</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Onde o item está?"
                  className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:border-blue-400 outline-none transition-all font-bold text-gray-800 bg-gray-50/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Link ou Informações Adicionais</label>
                <input
                  type="text"
                  value={additionalLink}
                  onChange={(e) => setAdditionalLink(e.target.value)}
                  placeholder="Cole um link ou escreva uma observação..."
                  className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:border-blue-400 outline-none transition-all font-bold text-gray-800 bg-gray-50/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:border-blue-400 outline-none transition-all font-medium text-gray-600 bg-gray-50/50 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-8 py-4 rounded-xl border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!image || !title || !price}
              className="flex-[2] bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-50 disabled:opacity-50 text-sm uppercase tracking-widest"
            >
              {itemToEdit ? 'Salvar Alterações' : 'Publicar Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
