
import { Category, Product, PaymentMethod } from './types';

export const CATEGORIES: Category[] = [
  { id: 'lanches', name: 'Lanches', icon: '🍔' },
  { id: 'acai', name: 'Açaí', icon: '🍧' },
  { id: 'franguinho', name: 'Franguinho', icon: '🍗' },
  { id: 'porcoes', name: 'Porções', icon: '🍟' },
  { id: 'bebidas', name: 'Bebidas', icon: '🥤' },
  { id: 'balcao', name: 'Balcão', icon: '🍰' },
];

export const DELIVERY_FEES = [
  { neighborhood: 'Zumbi', fee: 2.00 },
  { neighborhood: 'Santa Rita', fee: 3.00 },
  { neighborhood: 'Alecrim', fee: 4.00 },
  { neighborhood: 'Garrido', fee: 5.00 },
  { neighborhood: 'Primeiro de maio', fee: 3.00 },
  { neighborhood: 'Ataíde', fee: 5.00 },
  { neighborhood: 'Ilha da Conceição', fee: 5.00 },
  { neighborhood: 'Outro', fee: 0.00 },
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
  { id: 'f1', categoryId: 'franguinho', name: 'Franguinho 250g', price: 35.00, maxSides: 1, unit: 'Até 1 Acompanhamento' },
  { id: 'f2', categoryId: 'franguinho', name: 'Franguinho 500g', price: 55.00, maxSides: 1, unit: 'Até 1 Acompanhamento' },
  { id: 'f3', categoryId: 'franguinho', name: 'Franguinho 500g', price: 65.00, maxSides: 2, unit: 'Até 2 Acompanhamentos' },
  { id: 'f4', categoryId: 'franguinho', name: 'Franguinho 500g', price: 75.00, maxSides: 3, unit: 'Até 3 Acompanhamentos' },
  { id: 'f5', categoryId: 'franguinho', name: 'Franguinho 1Kg', price: 70.00, maxSides: 1, unit: 'Até 1 Acompanhamento' },
  { id: 'f6', categoryId: 'franguinho', name: 'Franguinho 1Kg', price: 80.00, maxSides: 2, unit: 'Até 2 Acompanhamentos' },
  { id: 'f7', categoryId: 'franguinho', name: 'Franguinho 1Kg', price: 90.00, maxSides: 3, unit: 'Até 3 Acompanhamentos' },

  // PORÇÕES
  { id: 'p1', categoryId: 'porcoes', name: 'Tábua de Carne', price: 58.00, unit: '400g', description: DESC_TABUA_CARNE },
  { id: 'p2', categoryId: 'porcoes', name: 'Tábua de Carne', price: 88.00, unit: '800g', description: DESC_TABUA_CARNE },
  { id: 'p3', categoryId: 'porcoes', name: 'Batata', price: 12.00, unit: '200g' },
  { id: 'p4', categoryId: 'porcoes', name: 'Batata', price: 20.00, unit: '400g' },
  { id: 'p5', categoryId: 'porcoes', name: 'Batata cheddar e bacon', price: 28.00, unit: '300g' },
  { id: 'p6', categoryId: 'porcoes', name: 'Aipim raiz', price: 20.00, unit: '400g' },
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
  { id: 'b11', categoryId: 'bebidas', name: 'Refri Mini', price: 3.00 },
  { id: 'b12', categoryId: 'bebidas', name: 'Guaravita/Suco Mini', price: 2.50 },
  { id: 'b13', categoryId: 'bebidas', name: 'Amstel', price: 7.00 },
  { id: 'b14', categoryId: 'bebidas', name: 'Brahma', price: 7.00 },
  { id: 'b15', categoryId: 'bebidas', name: 'Petra', price: 7.00 },
  { id: 'b16', categoryId: 'bebidas', name: 'Itaipava', price: 5.00 },
  { id: 'b17', categoryId: 'bebidas', name: 'Itaipava Mega', price: 7.00 },
  { id: 'b18', categoryId: 'bebidas', name: 'Spaten', price: 6.00 },
  { id: 'b19', categoryId: 'bebidas', name: 'Heineken 330 ML', price: 9.90 },
  { id: 'b20', categoryId: 'bebidas', name: 'Heineken 600ML', price: 13.90 },
  { id: 'b21', categoryId: 'bebidas', name: 'H2O 500 ML', price: 8.00 },
  { id: 'b22', categoryId: 'bebidas', name: 'H2O 1,5L', price: 12.00 },

  // BALCÃO
  { id: 'bc1', categoryId: 'balcao', name: 'Feijão Tropeiro (P)', price: 20.00 },
  { id: 'bc2', categoryId: 'balcao', name: 'Feijão Tropeiro (M)', price: 25.00 },
  { id: 'bc3', categoryId: 'balcao', name: 'Feijão Tropeiro (G)', price: 30.00 },
  { id: 'bc4', categoryId: 'balcao', name: 'Feijão Tropeiro (GG)', price: 35.00 },
  { id: 'bc5', categoryId: 'balcao', name: 'Torta', price: 10.00 },
  { id: 'bc6', categoryId: 'balcao', name: 'Bolo', price: 8.00 },
  { id: 'bc7', categoryId: 'balcao', name: 'Empadão', price: 12.00 },
  { id: 'bc8', categoryId: 'balcao', name: 'Refr. Uai 2L', price: 7.00 },
];

export const PAYMENT_METHODS = [
  { value: PaymentMethod.PIX, label: 'PIX' },
  { value: PaymentMethod.CASH, label: 'Dinheiro' },
  { value: PaymentMethod.CARD, label: 'Cartão' },
  { value: PaymentMethod.BOLSA_ALUNO, label: 'Bolsa Aluno' },
  { value: PaymentMethod.PAID, label: 'PAGO' },
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
  { name: 'Mousse de Morango', price: 4.00 },
  { name: 'Mousse de Maracujá', price: 4.00 },
  { name: 'Mousse de Cupuaçu', price: 4.00 }
];
