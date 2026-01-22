
import { Category, Product, PaymentMethod, OrderType } from './types';

export const COLORS = {
  bgDark: 'rgb(41, 41, 39)',
  bgSecondary: 'rgb(60, 58, 50)',
  accent: 'rgb(214, 187, 86)',
  textLight: 'rgb(239, 240, 243)',
};

export const CATEGORIES: Category[] = [
  { id: 'lanches', name: 'Lanches', icon: '🍔' },
  { id: 'acai', name: 'Açaí', icon: '🍧' },
  { id: 'franguinho', name: 'Franguinho', icon: '🍗' },
  { id: 'porcoes', name: 'Porções', icon: '🍟' },
  { id: 'bebidas', name: 'Bebidas', icon: '🥤' },
];

export const DELIVERY_FEES = [
  { neighborhood: 'Zumbi', fee: 2.00 },
  { neighborhood: 'Santa Rita', fee: 3.00 },
  { neighborhood: 'Alecrim', fee: 4.00 },
  { neighborhood: 'Garrido', fee: 5.00 },
  { neighborhood: 'Primeiro de maio', fee: 3.00 },
  { neighborhood: 'Ataíde', fee: 5.00 },
  { neighborhood: 'Ilha da Conceição', fee: 5.00 },
  { neighborhood: 'Outro', fee: 5.00 },
];

const SALADA_COMPLETA = ['Alface', 'Tomate', 'Milho', 'Batata Palha'];
const DESC_TABUA_CARNE = "Acompanha 400g de batata ou aipim, vinagrete, farofa e molho caseiro.";

export const PRODUCTS: Product[] = [
  // LANCHES
  { id: 'l1', categoryId: 'lanches', name: 'Hambúrguer', price: 10.00, ingredients: ['Pão', 'Bife', ...SALADA_COMPLETA] },
  { id: 'l2', categoryId: 'lanches', name: 'X-Vegetariano', price: 10.00, ingredients: ['Pão', '2 Queijos', 'Catupiry', ...SALADA_COMPLETA] },
  { id: 'l3', categoryId: 'lanches', name: 'Misto Quente', price: 12.00, ingredients: ['3 Fatias Pão', '2 Queijos', '2 Presuntos'] },
  { id: 'l4', categoryId: 'lanches', name: 'X-Burguer', price: 14.00, ingredients: ['Pão', 'Bife', 'Presunto', 'Queijo', ...SALADA_COMPLETA] },
  { id: 'l5', categoryId: 'lanches', name: 'X-Egg', price: 17.00, ingredients: ['Pão', 'Bife', 'Ovo', 'Queijo', ...SALADA_COMPLETA] },
  { id: 'l6', categoryId: 'lanches', name: 'X-Bacon', price: 18.00, ingredients: ['Pão', 'Bife', 'Bacon', 'Queijo', ...SALADA_COMPLETA] },
  { id: 'l7', categoryId: 'lanches', name: 'X-Calabresa', price: 18.00, ingredients: ['Pão', 'Bife', 'Calabresa', 'Queijo', ...SALADA_COMPLETA] },
  { id: 'l8', categoryId: 'lanches', name: 'X-Egg Bacon', price: 20.00, ingredients: ['Pão', 'Bife', 'Ovo', 'Bacon', 'Queijo', ...SALADA_COMPLETA] },
  { id: 'l9', categoryId: 'lanches', name: 'X-Egg Calabresa', price: 20.00, ingredients: ['Pão', 'Bife', 'Ovo', 'Calabresa', 'Queijo', ...SALADA_COMPLETA] },
  { id: 'l10', categoryId: 'lanches', name: 'X-Tudo', price: 22.00, ingredients: ['Pão', 'Bife', 'Queijo', 'Presunto', 'Bacon', 'Ovo', ...SALADA_COMPLETA] },
  { id: 'l11', categoryId: 'lanches', name: 'X-Frango', price: 23.00, ingredients: ['Pão', 'Peito de Frango', 'Ovo', 'Bacon', 'Queijo', 'Presunto', ...SALADA_COMPLETA] },
  { id: 'l12', categoryId: 'lanches', name: 'X-Burguer Duplo', price: 25.00, ingredients: ['Pão', '2 Bifes', '2 Presuntos', '2 Queijos', ...SALADA_COMPLETA] },
  { id: 'l13', categoryId: 'lanches', name: 'X-Egg Duplo', price: 27.00, ingredients: ['Pão', '2 Bifes', '2 Ovos', '2 Queijos', ...SALADA_COMPLETA] },
  { id: 'l14', categoryId: 'lanches', name: 'X-Egg Bacon Duplo', price: 32.00, ingredients: ['Pão', '2 Bifes', '2 Ovos', '2 Bacon', 'Queijo', ...SALADA_COMPLETA] },
  { id: 'l15', categoryId: 'lanches', name: 'X-Da Casa', price: 32.00, ingredients: ['Pão', 'Bife', 'Frango', 'Ovo', 'Bacon', 'Queijo', 'Presunto', 'Calabresa', 'Banana', ...SALADA_COMPLETA] },
  { id: 'l16', categoryId: 'lanches', name: 'X-Turbo', price: 45.00, ingredients: ['Pão', '3 Bifes', 'Frango', '3 Ovos', 'Bacon', '3 Queijos', '3 Presuntos', 'Calabresa', ...SALADA_COMPLETA] },

  // AÇAI
  { id: 'a1', categoryId: 'acai', name: 'Açaí 300 ML', price: 15.00 },
  { id: 'a2', categoryId: 'acai', name: 'Açaí 400 ML', price: 17.00 },
  { id: 'a3', categoryId: 'acai', name: 'Açaí 500 ML', price: 19.00 },
  { id: 'a4', categoryId: 'acai', name: 'Açaí 700 ML', price: 23.00 },
  { id: 'a5', categoryId: 'acai', name: 'Açaí 1000 ML', price: 30.00 },

  // FRANGUINHO
  { id: 'f1', categoryId: 'franguinho', name: 'Franguinho 250g (1 Acomp.)', price: 35.00, maxSides: 1 },
  { id: 'f2', categoryId: 'franguinho', name: 'Franguinho 500g (1 Acomp.)', price: 55.00, maxSides: 1 },
  { id: 'f3', categoryId: 'franguinho', name: 'Franguinho 500g (2 Acomp.)', price: 65.00, maxSides: 2 },
  { id: 'f4', categoryId: 'franguinho', name: 'Franguinho 500g (3 Acomp.)', price: 75.00, maxSides: 3 },
  { id: 'f5', categoryId: 'franguinho', name: 'Franguinho 1Kg (1 Acomp.)', price: 70.00, maxSides: 1 },
  { id: 'f6', categoryId: 'franguinho', name: 'Franguinho 1Kg (2 Acomp.)', price: 80.00, maxSides: 2 },
  { id: 'f7', categoryId: 'franguinho', name: 'Franguinho 1Kg (3 Acomp.)', price: 90.00, maxSides: 3 },

  // PORÇÕES
  { id: 'p1', categoryId: 'porcoes', name: 'Tábua de Carne 400g', price: 58.00, description: DESC_TABUA_CARNE },
  { id: 'p2', categoryId: 'porcoes', name: 'Tábua de Carne 800g', price: 88.00, description: DESC_TABUA_CARNE },
  { id: 'p3', categoryId: 'porcoes', name: 'Batata 200g', price: 12.00 },
  { id: 'p4', categoryId: 'porcoes', name: 'Batata 400g', price: 20.00 },
  { id: 'p5', categoryId: 'porcoes', name: 'Batata cheddar e bacon 300g', price: 28.00 },
  { id: 'p6', categoryId: 'porcoes', name: 'Aipim raiz 400g', price: 20.00 },
  { id: 'p7', categoryId: 'porcoes', name: 'Aipim temperado', price: 25.00, unit: '20un' },
  { id: 'p8', categoryId: 'porcoes', name: 'Aipim c/ Queijo', price: 25.00, unit: '20un' },
  { id: 'p9', categoryId: 'porcoes', name: 'Bol. de Queijo', price: 25.00, unit: '20un' },
  { id: 'p10', categoryId: 'porcoes', name: 'Bol. Queijo c/ Presunto', price: 25.00, unit: '20un' },
  { id: 'p11', categoryId: 'porcoes', name: 'Coxinha c/ Requeijão', price: 25.00, unit: '20un' },

  // BEBIDAS
  { id: 'b1', categoryId: 'bebidas', name: 'Suco 500ml', price: 9.00, needsFlavor: true },
  { id: 'b2', categoryId: 'bebidas', name: 'Vitamina 500ml', price: 12.00, needsFlavor: true },
  { id: 'b3', categoryId: 'bebidas', name: 'Suco 1L', price: 17.00, needsFlavor: true },
  { id: 'b4', categoryId: 'bebidas', name: 'Vitamina 1L', price: 20.00, needsFlavor: true },
  { id: 'b5', categoryId: 'bebidas', name: 'Refr. Lata', price: 6.00, needsFlavor: true },
  { id: 'b6', categoryId: 'bebidas', name: 'Refr. Uai 600 ml', price: 5.00, needsFlavor: true },
  { id: 'b7', categoryId: 'bebidas', name: 'Refr. Uai 2L', price: 7.00, needsFlavor: true },
  { id: 'b8', categoryId: 'bebidas', name: 'Refr. Coca Cola 600 ml', price: 8.00, needsZeroOption: true },
  { id: 'b9', categoryId: 'bebidas', name: 'Refr. Coca Cola 1,5L', price: 12.00, needsZeroOption: true },
  { id: 'b10', categoryId: 'bebidas', name: 'Refr. Coca Cola 2L', price: 15.00, needsZeroOption: true },
];

export const PAYMENT_METHODS = [
  { value: PaymentMethod.PIX, label: 'PIX' },
  { value: PaymentMethod.CASH, label: 'Dinheiro' },
  { value: PaymentMethod.CARD, label: 'Cartão' },
  { value: PaymentMethod.BOLSA_ALUNO, label: 'Bolsa Aluno' },
];

export const ORDER_TYPES = [
    { value: OrderType.DELIVERY, label: 'ENTREGA' },
    { value: OrderType.COUNTER, label: 'RETIRADA NA LANCHONETE' },
];

export const EXTRAS_OPTIONS = [
    { name: 'Adicional Comum', price: 3.00 },
    { name: 'Adicional Calabresa', price: 3.00 },
    { name: 'Bife Picanha', price: 4.50 },
];

export const FRANGUINHO_SIDES = [
  "Batata", "Aipim raiz", "Bolinho de aipim temperado", 
  "Bolinho de aipim com queijo", "Bolinha de queijo", 
  "Bolinha de queijo com presunto", "Coxinha"
];

export const ACAI_COMPLEMENTS = [
  "Amendoim", "Bolinhas de chocolate", "Choco Boll", "Chocolate cremoso", 
  "Disket", "Flocos de arroz", "Uva Passas", "Gotas de chocolate", 
  "Granola", "Granulado", "Leite em pó", "Ovomaltine", "Paçoca", "Sucrilhos"
];

export const ACAI_TOPPINGS = [
  "Amora", "Chocolate", "Chocolate quente", "Leite condensado", 
  "Limão", "Mel", "Morango", "Uva"
];

export const ACAI_FRUITS = [
  "Uva", "Kiwi", "Maçã", "Manga", "Morango", "Banana"
];

export const ACAI_PAID_EXTRAS = [
  { name: 'Nutella', price: 5.00 },
  { name: 'M. Morango', price: 4.00 },
  { name: 'M. Maracujá', price: 4.00 },
  { name: 'M. Cupuaçu', price: 4.00 }
];
