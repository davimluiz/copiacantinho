
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
  packaging?: string;
  flavor?: string;
  isZero?: boolean;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  addressNumber: string;
  reference: string;
  deliveryFee?: number;
  tableNumber: string;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  observation?: string;
  usePaidStamp?: boolean;
}

export interface Order {
  id: string;
  customer: CustomerInfo;
  items: CartItem[];
  total: number;
  createdAt: string;
  status: OrderStatus;
}
