export enum PaymentMethod {
  PIX = 'PIX',
  CASH = 'DINHEIRO',
  CARD = 'CARTÃO',
  NOT_INFORMED = 'NÃO INFORMOU',
  BOLSA_ALUNO = 'BOLSA ALUNO'
}

export enum OrderType {
  TABLE = 'MESA',
  DELIVERY = 'ENTREGA',
  COUNTER = 'BALCÃO'
}

export enum OrderStatus {
  PENDING = 'PENDENTE',
  COMPLETED = 'CONCLUÍDO',
  CANCELLED = 'CANCELADO'
}

export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  description?: string;
  ingredients?: string[]; // Lista de ingredientes padrão (ex: Pão, Bife, Salada)
  maxSides?: number; // Quantidade máxima de acompanhamentos gratuitos (para Franguinho)
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface CartItem extends Product {
  cartId: string; // Identificador único no carrinho (para diferenciar x-burguer com salada de x-burguer sem)
  quantity: number;
  removedIngredients?: string[]; // Itens que o cliente desmarcou
  additions?: string[]; // Extras selecionados
  observation?: string; // Usado para sabores ou observações do item
  packaging?: string; // Para Açaí: Mesa, Com Tampa, Sem Tampa
}

export interface CustomerInfo {
  name: string;
  phone: string;
  
  // Endereço (Apenas para Entrega)
  address: string;
  addressNumber: string; // Novo campo para o número
  reference: string;
  deliveryFee?: number; // Taxa de entrega manual
  
  // Mesa (Apenas para Mesa)
  tableNumber: string;

  orderType: OrderType;
  paymentMethod: PaymentMethod;
  observation?: string; // Observação geral do pedido
  usePaidStamp?: boolean; // Se deve incluir campo de carimbo de pago
}

export interface Order {
  id: string;
  customer: CustomerInfo;
  items: CartItem[];
  total: number;
  createdAt: string;
  status: OrderStatus;
}