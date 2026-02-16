
export interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrls: string[]; // Agora é um array para o carrossel
  isSold: boolean;
  createdAt: number;
  category: string;
  location?: string;
  quantity: number;
  soldCount: number;
  color?: string;
  brand?: string;
  additionalLink?: string;
  // Auditoria e Vendas
  createdBy?: string;
  lastEditedBy?: string;
  buyerName?: string;
  soldAt?: number;
  soldBy?: string;
}

export interface UserSession {
  username: string;
  email: string;
  photoURL?: string;
}

export interface AIAnalysisResult {
  title: string;
  description: string;
  suggestedPrice: number;
  category: string;
}
