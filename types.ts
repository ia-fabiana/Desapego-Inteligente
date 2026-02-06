
export interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  isSold: boolean;
  createdAt: number;
  category: string;
  location?: string;
  quantity: number;
  soldCount: number;
  color?: string;
  brand?: string;
  // Campos de Auditoria
  createdBy?: string;
  lastEditedBy?: string;
  // Campos de Venda
  buyerName?: string;
  soldAt?: number;
  soldBy?: string;
}

export interface UserSession {
  username: string; // displayName do Google
  email: string;
  photoURL?: string;
}

export interface AIAnalysisResult {
  title: string;
  description: string;
  suggestedPrice: number;
  category: string;
}
