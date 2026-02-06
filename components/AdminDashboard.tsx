
import React, { useState, useRef, useMemo } from 'react';
import { Item } from '../types';
import { analyzeSpreadsheetFile, mapSpreadsheetJsonToItems } from '../services/geminiService';

declare const XLSX: any;

interface AdminDashboardProps {
  items: Item[];
  onClose: () => void;
  onAddNew: () => void;
  onImportItems: (newItems: any[]) => void;
  onClearAll: () => void;
  onRecordSale: (id: string, amount: number) => void;
  onToggleStatus: (id: string, isSold: boolean) => void;
  onEditItem?: (item: Item) => void;
  onDelete?: (id: string) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onUpdateSoldCount: (id: string, count: number) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  items, onClose, onAddNew, onImportItems, onClearAll, onRecordSale, onToggleStatus, onEditItem, onDelete, onUpdatePrice, onUpdateSoldCount 
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [draftItems, setDraftItems] = useState<any[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const stats = useMemo(() => {
    let revenue = 0;
    let totalUnitsSold = 0;
    let availableUnits = 0;

    items.forEach(item => {
      revenue += (item.price * (item.soldCount || 0));
      totalUnitsSold += (item.soldCount || 0);
      availableUnits += (item.quantity || 0);
    });

    return {
      revenue,
      totalUnitsSold,
      availableUnits
    };
  }, [items]);

  const handlePrint = () => {
    window.print();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    if (file.type.startsWith('image/')) {
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const results = await analyzeSpreadsheetFile(base64, file.type);
          setDraftItems(results);
          setStep('review');
        } catch (error) {
          alert('Erro ao analisar imagem via IA.');
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          
          const mappedItems = await mapSpreadsheetJsonToItems(jsonData);
          setDraftItems(mappedItems);
          setStep('review');
        } catch (error) {
          alert('Erro ao ler planilha.');
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const confirmImport = () => {
    onImportItems(draftItems);
    setShowImportModal(false);
    setDraftItems([]);
    setStep('input');
  };

  const handlePriceEdit = (item: Item) => {
    const newPriceStr = window.prompt(`Alterar preço de "${item.title}":`, item.price.toString());
    if (newPriceStr !== null) {
      const newPrice = parseFloat(newPriceStr.replace(',', '.'));
      if (!isNaN(newPrice)) onUpdatePrice(item.id, newPrice);
    }
  };

  const handleSoldCountEdit = (item: Item) => {
    const newCountStr = window.prompt(`Alterar total de unidades VENDIDAS de "${item.title}":`, (item.soldCount || 0).toString());
    if (newCountStr !== null) {
      const newCount = parseInt(newCountStr);
      if (!isNaN(newCount) && newCount >= 0) onUpdateSoldCount(item.id, newCount);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#fcfdfe] z-50 overflow-y-auto animate-fade-in no-print-bg">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        <div className="print-header">
          <h1>RE-MARKET: Relatório de Inventário</h1>
          <p>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12 no-print">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-100 shadow-sm transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard Admin</h1>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={handlePrint} className="px-6 py-3 rounded-xl font-bold text-blue-600 hover:bg-blue-50 text-sm border border-blue-100 flex items-center gap-2">Imprimir PDF</button>
             <button onClick={onAddNew} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg text-sm">Novo Item</button>
             <button onClick={() => setShowImportModal(true)} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black shadow-lg text-sm">Importar Dados</button>
             <button onClick={onClearAll} className="px-6 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50 text-sm border border-red-100">Zerar</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Receita Estimada (Vendidos)</p>
            <h3 className="text-3xl font-black text-green-600">R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Itens em Estoque</p>
            <h3 className="text-3xl font-black text-gray-900">{stats.availableUnits} unidades</h3>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total de Modelos</p>
            <h3 className="text-3xl font-black text-blue-600">{items.length} itens</h3>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b border-gray-100">
                  <th className="px-8 py-5">Produto</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-center">Estoque</th>
                  <th className="px-8 py-5 text-center">Vendidos</th>
                  <th className="px-8 py-5 text-right">Preço</th>
                  <th className="px-8 py-5 no-print text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${item.isSold ? 'bg-red-50/30' : ''}`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <img src={item.imageUrl} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                        <div>
                            <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-black">{item.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                        <button 
                            onClick={() => onToggleStatus(item.id, !item.isSold)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${item.isSold ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}
                        >
                            {item.isSold ? 'Vendido' : 'Ativo'}
                        </button>
                    </td>
                    <td className="px-8 py-5 text-center font-bold text-gray-600 text-xs">{item.quantity}</td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => handleSoldCountEdit(item)}
                        className="px-3 py-1.5 bg-gray-50 text-gray-900 font-black text-xs rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-gray-200"
                        title="Clique para editar manualmente"
                      >
                        {item.soldCount || 0}
                      </button>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => handlePriceEdit(item)}
                        className="font-black text-sm text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </button>
                    </td>
                    <td className="px-8 py-5 no-print text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => onEditItem?.(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => onDelete?.(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-[100] animate-fade-in no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl p-8">
            <div className="mb-8">
                <h2 className="text-xl font-black text-gray-900 uppercase">Importar Inventário</h2>
                <p className="text-xs text-gray-400 font-bold mt-1 uppercase">Suba uma planilha (Excel) ou foto de tabela para extração automática via IA</p>
            </div>

            {step === 'input' ? (
                <div 
                    className="border-4 border-dashed border-gray-100 rounded-[2rem] py-20 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls, .csv, image/*" />
                    {isImporting ? (
                        <div className="text-center">
                            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-xs font-black text-blue-600 uppercase tracking-widest">IA Analisando...</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            </div>
                            <p className="font-bold text-gray-900">Clique para selecionar arquivo</p>
                            <p className="text-xs text-gray-400 mt-1 uppercase font-black">Excel ou Fotos de Tabelas</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <p className="text-sm font-black text-gray-900 uppercase">Confirmar Itens Detectados ({draftItems.length}):</p>
                    <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                        {draftItems.map((item, idx) => (
                            <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm text-gray-900">{item.title}</p>
                                    <p className="text-[10px] text-gray-400 uppercase font-black">{item.category} • R$ {item.price}</p>
                                </div>
                                <span className="text-[10px] font-black bg-white px-2 py-1 rounded-md border border-gray-200">Qtd: {item.quantity}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-4 mt-8">
                <button onClick={() => setShowImportModal(false)} className="flex-1 py-4 font-bold text-gray-400 hover:bg-gray-50 rounded-2xl transition-all">Cancelar</button>
                {step === 'review' && (
                    <button onClick={confirmImport} className="flex-2 bg-blue-600 text-white font-black py-4 px-8 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100">Finalizar Importação</button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
