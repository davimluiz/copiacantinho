
export enum PaymentMethod {
  PIX = 'PIX',
  CASH = 'DINHEIRO',
  CARD = 'CARTÃO',
  NOT_INFORMED = 'NÃO INFORMOU',
  BOLSA_ALUNO = 'BOLSA ALUNO',
  PAID = 'PAGO'
}

export enum OrderType {
  TABLE = 'MESA',
  DELIVERY = 'ENTREGA',
  COUNTER = 'RETIRADA NA LANCHONETE'
}

export enum OrderStatus {
  NEW = 'novo',
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
  ingredients?: string[];
  maxSides?: number;
  unit?: string;
  needsFlavor?: boolean;
  needsZeroOption?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface CartItem extends Product {
  cartId: string;
  quantity: number;
  removedIngredients?: string[];
  additions?: string[];
  observation?: string;
  flavor?: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  neighborhood?: string;
  addressNumber: string;
  reference: string;
  deliveryFee?: number;
  tableNumber: string;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  needsChange?: boolean;
  changeAmount?: string;
}

export interface Order {
  id: string;
  nomeCliente: string;
  itens: string;
  itemsList?: CartItem[];
  total: number;
  frete: number;
  bairro: string;
  status: string;
  telefone: string;
  tipo: string;
  pagamento: string;
  endereco: string;
  criadoEm: any;
}