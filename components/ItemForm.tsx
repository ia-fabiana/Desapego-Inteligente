
import React, { useState, useRef, useEffect } from 'react';
import { analyzeItemImage } from '../services/geminiService';
import { Item } from '../types';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

interface ItemFormProps {
  onAdd?: (data: any) => void;
  onUpdate?: (data: any) => void;
  onCancel: () => void;
  itemToEdit?: Item | null;
}

export const ItemForm: React.FC<ItemFormProps> = ({ onAdd, onUpdate, onCancel, itemToEdit }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [totalProgress, setTotalProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storage = getStorage();

  useEffect(() => {
    if (itemToEdit) {
      setExistingUrls(itemToEdit.imageUrls || []);
      setTitle(itemToEdit.title);
      setDescription(itemToEdit.description);
      setPrice(itemToEdit.price.toString());
      setCategory(itemToEdit.category);
    }
  }, [itemToEdit]);

  // Função para comprimir a imagem no cliente antes de subir
  const compressImage = (file: File): Promise<{blob: Blob, base64: string}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(img.src);
          resolve({ blob: blob!, base64 });
        }, 'image/jpeg', 0.8);
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // FIX: Explicitly cast Array.from to File[] to avoid 'unknown' type inference issues
    const selectedFiles = e.target.files ? (Array.from(e.target.files) as File[]) : [];
    if (selectedFiles.length === 0) return;

    // Limite total de 3 fotos (existentes + novas)
    const availableSlots = 3 - existingUrls.length - files.length;
    const filesToAdd = selectedFiles.slice(0, availableSlots);
    
    if (filesToAdd.length === 0 && selectedFiles.length > 0) {
        alert("Máximo de 3 fotos atingido.");
        return;
    }

    const updatedFiles = [...files, ...filesToAdd];
    setFiles(updatedFiles);
    
    const newPreviews = updatedFiles.map(f => URL.createObjectURL(f));
    setPreviews(newPreviews);

    // IA: Analisa a primeira foto nova se os campos estiverem vazios
    if (!itemToEdit && title === '' && filesToAdd.length > 0) {
      setIsAnalyzing(true);
      try {
        // FIX: Extract file reference and ensure it exists before passing to compressImage to avoid TS errors
        const firstFile = filesToAdd[0];
        if (firstFile) {
          const { base64 } = await compressImage(firstFile);
          const result = await analyzeItemImage(base64);
          setTitle(result.title);
          setDescription(result.description);
          setPrice(result.suggestedPrice.toString());
          setCategory(result.category);
        }
      } catch (err) {
        console.error("Erro na análise IA:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const uploadToStorage = (file: File, index: number, total: number): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      const { blob } = await compressImage(file);
      const storageRef = ref(storage, `items/${Date.now()}_${index}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          // Cálculo simplificado de progresso global
          setTotalProgress((prev) => (progress / total) + (index * (100 / total)));
        }, 
        (error) => reject(error), 
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            resolve(downloadURL);
          });
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 && existingUrls.length === 0) {
        alert("Adicione pelo menos uma foto.");
        return;
    }

    setIsSaving(true);
    setTotalProgress(0);

    try {
      // Sobe as fotos novas para o Storage
      const newUrls = await Promise.all(files.map((file, i) => uploadToStorage(file, i, files.length)));
      const finalUrls = [...existingUrls, ...newUrls];

      const payload = {
        title,
        description,
        price: parseFloat(price) || 0,
        category,
        imageUrls: finalUrls,
        quantity: 1
      };

      if (itemToEdit) {
        await onUpdate?.({ ...itemToEdit, ...payload });
      } else {
        await onAdd?.(payload);
      }
      onCancel();
    } catch (err) {
      console.error("Erro no processo de salvamento:", err);
      alert("Houve um erro ao subir as fotos. Verifique o Storage.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeNewFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingUrl = (idx: number) => {
    setExistingUrls(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-fade-in">
        <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="font-black uppercase text-sm tracking-tighter text-gray-900">
              {itemToEdit ? 'Editar Produto' : 'Novo Anúncio'}
            </h2>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">
              {isAnalyzing ? 'IA Analisando sua foto...' : 'Venda Rápida'}
            </p>
          </div>
          <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-gray-100 transition-all text-gray-400">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6 scrollbar-hide">
          {/* Upload de Fotos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Fotos (Máx 3)</label>
              {isAnalyzing && <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />}
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {/* Fotos já existentes (na edição) */}
              {existingUrls.map((url, idx) => (
                <div key={`exist-${idx}`} className="relative w-28 h-28 shrink-0 rounded-2xl overflow-hidden border border-gray-100">
                  <img src={url} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExistingUrl(idx)} className="absolute top-1 right-1 bg-red-600 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              
              {/* Previews de novas fotos */}
              {previews.map((url, idx) => (
                <div key={`new-${idx}`} className="relative w-28 h-28 shrink-0 rounded-2xl overflow-hidden border border-blue-200">
                  <img src={url} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase">Novo</div>
                  <button type="button" onClick={() => removeNewFile(idx)} className="absolute top-1 right-1 bg-gray-900 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}

              {/* Botão de Adicionar */}
              {(existingUrls.length + files.length) < 3 && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-28 h-28 shrink-0 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-300 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all">
                  <span className="text-2xl font-light">+</span>
                  <span className="text-[9px] font-black uppercase tracking-tighter">Adicionar</span>
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
          </div>

          {/* Dados do Item */}
          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-400">Título</label>
                <input type="text" placeholder="Nome do produto..." value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm focus:bg-white focus:border-blue-400 transition-all" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-gray-400">Preço (R$)</label>
                    <input type="number" step="0.01" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-green-600 text-sm focus:bg-white focus:border-green-400 transition-all" />
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-gray-400">Categoria</label>
                    <input type="text" placeholder="Ex: Móveis" value={category} onChange={e => setCategory(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm focus:bg-white focus:border-blue-400 transition-all" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-400">Descrição</label>
                <textarea placeholder="Detalhes do item..." value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium text-xs resize-none focus:bg-white focus:border-blue-400 transition-all" />
            </div>
          </div>

          {/* Barra de Progresso Real */}
          {isSaving && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-blue-600">
                <span>Enviando arquivos...</span>
                <span>{Math.round(totalProgress)}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300" 
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSaving} 
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Subindo Fotos...' : itemToEdit ? 'Salvar Alterações' : 'Publicar Anúncio'}
          </button>
        </form>
      </div>
    </div>
  );
};
