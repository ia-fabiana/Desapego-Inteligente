
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
}

export interface AIAnalysisResult {
  title: string;
  description: string;
  suggestedPrice: number;
  category: string;
}
