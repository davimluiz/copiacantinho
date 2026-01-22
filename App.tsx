
"use client";

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';

import { db } from './firebase';
import { Button } from './components/Button';
import { Input, Select } from './components/Input';
import { 
    CATEGORIES, PRODUCTS, PAYMENT_METHODS, 
    EXTRAS_OPTIONS, ACAI_COMPLEMENTS, ACAI_TOPPINGS, 
    ACAI_FRUITS, ACAI_PAID_EXTRAS
} from './constants';
import { Product, CustomerInfo, CartItem, PaymentMethod, OrderType } from './types';

type AppView = 'HOME' | 'ORDER' | 'LOGIN' | 'ADMIN' | 'SUCCESS';
type OrderStep = 'MENU' | 'TYPE_SELECTION' | 'FORM' | 'SUMMARY';

// --- COMPONENTE DE RECIBO PARA IMPRESSÃO ---
const Receipt = ({ order }: { order: any | null }) => {
    if (!order) return null;
    const date = order.criadoEm?.toDate ? order.criadoEm.toDate().toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
    
    return (
        <div className="w-full max-w-[80mm] mx-auto text-black font-mono text-[11px] p-4 bg-white border border-zinc-200 shadow-sm printable-content">
            <div className="text-center mb-4 border-b border-dashed border-black pb-2">
                <h1 className="font-bold text-lg uppercase italic">Cantinho da Sandra</h1>
                <p className="text-[9px]">ID: {order.id?.slice(-6).toUpperCase()}</p>
            </div>
            <div className="mb-2">
                <p><strong>CLIENTE:</strong> {String(order.nomeCliente || '').toUpperCase()}</p>
                <p><strong>DATA:</strong> {date}</p>
                <p><strong>TIPO:</strong> {order.tipo || 'BALCÃO'}</p>
                <p><strong>FONE:</strong> {order.telefone || 'N/A'}</p>
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            <div className="mb-2">
                <p className="font-bold mb-1 uppercase text-[10px]">Itens do Pedido:</p>
                <p className="whitespace-pre-wrap leading-tight text-[10px]">{order.itens}</p>
            </div>
            <div className="border-t border-dashed border-black mt-2 pt-2 text-right">
                <p className="text-sm font-bold">TOTAL: R$ {Number(order.total || 0).toFixed(2)}</p>
                <p className="text-[9px] uppercase font-bold">{order.pagamento}</p>
            </div>
        </div>
    );
};

// --- MODAL DE PERSONALIZAÇÃO DE PRODUTO ---
const ProductModal = ({ product, isOpen, onClose, onConfirm }: any) => {
  const [quantity, setQuantity] = useState(1);
  const [removedText, setRemovedText] = useState('');
  const [additions, setAdditions] = useState<string[]>([]);
  const [hasPicanha, setHasPicanha] = useState(false);
  const [hasTurbine, setHasTurbine] = useState(false);
  const [observation, setObservation] = useState('');
  const [flavor, setFlavor] = useState('');
  const [isZero, setIsZero] = useState(false);
  const [isAcaiComplete, setIsAcaiComplete] = useState(false);

  const isLanche = product?.categoryId === 'lanches';
  const isFranguinho = product?.categoryId === 'franguinho';
  const isPorcoes = product?.categoryId === 'porcoes';
  const isBebidas = product?.categoryId === 'bebidas';
  const isAcai = product?.categoryId === 'acai';
  const maxSides = product?.maxSides ?? 0;

  const franguinhoAdditions = [
    "Batata", "Aipim raiz", "Bolinho de aipim temperado", 
    "Bolinho de aipim com queijo", "Bolinha de queijo", 
    "Bolinha de queijo com presunto", "Coxinha"
  ];

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1); setRemovedText(''); setAdditions([]); setObservation('');
      setHasPicanha(false); setHasTurbine(false); setFlavor(''); setIsZero(false);
      setIsAcaiComplete(false);
    }
  }, [isOpen, product]);

  if (!product) return null;

  const handleConfirm = () => {
    let extraPrice = 0;
    let finalAdditions = [...additions];

    if (isLanche) {
      if (hasPicanha) {
        extraPrice += 4.50;
        finalAdditions.push("Bife Picanha (R$ 4,50)");
      }
      if (hasTurbine) {
        extraPrice += 10.00;
        finalAdditions.push("TURBO: Batata 150g + Juninho (R$ 10,00)");
      }
      const dropdownItemsCount = additions.filter(a => !a.includes("TURBO") && !a.includes("Picanha")).length;
      extraPrice += dropdownItemsCount * 3.00;
    } else if (isAcai) {
      additions.forEach(addName => {
        const extra = ACAI_PAID_EXTRAS.find(e => e.name === addName);
        if (extra) extraPrice += extra.price;
      });
      if (isAcaiComplete) {
          finalAdditions.unshift("AÇAÍ COMPLETO");
      }
    } else if (isFranguinho || isPorcoes || isBebidas) {
      // Sem preços extras de adicionais nestas categorias
    } else {
      additions.forEach(add => {
          const extra = EXTRAS_OPTIONS.find(e => e.name === add);
          if (extra) extraPrice += extra.price;
      });
    }

    let finalFlavor = flavor;
    if (isBebidas && product.needsZeroOption) {
        finalFlavor = isZero ? "Zero" : "Normal";
    }
    
    onConfirm({
      ...product, 
      cartId: Date.now().toString(), 
      quantity,
      removedIngredients: removedText.trim() ? [removedText.trim()] : [], 
      additions: finalAdditions, 
      observation,
      flavor: finalFlavor,
      price: Number(product.price) + Number(extraPrice)
    });
  };

  const addDropdownAddition = (val: string) => {
    if (val && !additions.includes(val)) {
      setAdditions(prev => [...prev, val]);
    }
  };

  const removeDropdownAddition = (index: number) => {
    setAdditions(prev => prev.filter((_, i) => i !== index));
  };

  const toggleAddition = (name: string) => {
    setAdditions(prev => {
      if (prev.includes(name)) {
        return prev.filter(a => a !== name);
      }
      if (isFranguinho && prev.length >= maxSides) {
        return prev;
      }
      return [...prev, name];
    });
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity no-print ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-fade-in">
        <div className="p-6 border-b border-red-50 flex justify-between items-center bg-red-50/30">
          <div>
            <h3 className="text-xl font-black text-red-800 leading-none italic">{product.name}</h3>
            {product.unit && <p className="text-[10px] font-black text-red-600/60 uppercase tracking-widest mt-1 italic">{product.unit}</p>}
            <p className="text-red-600 font-black mt-1">R$ {product.price.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="text-zinc-300 hover:text-red-600 text-3xl leading-none transition-colors">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {product.description && (
            <section className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
              <label className="block text-red-900/40 text-[10px] font-black uppercase mb-2 tracking-[0.2em]">Observação do Item</label>
              <p className="text-[11px] font-bold text-red-800 leading-relaxed italic uppercase">
                {product.description}
              </p>
            </section>
          )}

          {product.ingredients && product.ingredients.length > 0 && (
            <section className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
              <label className="block text-red-900/40 text-[10px] font-black uppercase mb-2 tracking-[0.2em]">Ingredientes inclusos</label>
              <p className="text-[11px] font-bold text-red-800 leading-relaxed italic uppercase">
                {product.ingredients.join(', ')}
              </p>
            </section>
          )}

          <section>
            <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Quantidade</label>
            <div className="flex items-center gap-6">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-[0.8rem] bg-zinc-50 text-red-600 font-black text-xl hover:bg-zinc-100 transition-all">-</button>
              <span className="text-2xl font-black text-red-900 italic">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-[0.8rem] bg-zinc-50 text-red-600 font-black text-xl hover:bg-zinc-100 transition-all">+</button>
            </div>
          </section>

          {isBebidas && (
            <section className="space-y-4">
              {product.needsFlavor && (
                <div>
                  <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Sabor</label>
                  <input 
                    type="text" 
                    className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 text-sm font-bold text-red-900 focus:outline-none focus:border-red-500 shadow-inner" 
                    placeholder="Qual o sabor desejado?" 
                    value={flavor} 
                    onChange={e => setFlavor(e.target.value)} 
                  />
                </div>
              )}
              {product.needsZeroOption && (
                <div>
                  <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Escolha uma opção</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setIsZero(false)} 
                      className={`p-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${!isZero ? 'bg-red-700 border-red-700 text-white shadow-md' : 'bg-white border-zinc-100 text-zinc-300'}`}
                    >
                      Normal
                    </button>
                    <button 
                      onClick={() => setIsZero(true)} 
                      className={`p-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${isZero ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' : 'bg-white border-zinc-100 text-zinc-300'}`}
                    >
                      Zero
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {isAcai && (
            <section className="space-y-8">
              <button 
                onClick={() => setIsAcaiComplete(!isAcaiComplete)}
                className={`w-full py-5 rounded-[2rem] text-xs font-black uppercase border-b-4 transition-all shadow-xl ${isAcaiComplete ? 'bg-green-600 border-green-800 text-white scale-105' : 'bg-red-700 border-red-900 text-white hover:bg-red-800'}`}
              >
                {isAcaiComplete ? 'AÇAÍ COMPLETO ATIVADO! ✅' : 'QUER O AÇAÍ COMPLETO? (TUDO INCLUSO)'}
              </button>

              <div className={isAcaiComplete ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Complementos</label>
                <div className="grid grid-cols-2 gap-2">
                    {ACAI_COMPLEMENTS.map(item => (
                        <button key={item} onClick={() => toggleAddition(item)} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${additions.includes(item) ? 'bg-red-700 border-red-700 text-white' : 'bg-white border-zinc-100 text-zinc-400'}`}>
                            {additions.includes(item) ? '✓ ' : '+ '} {item}
                        </button>
                    ))}
                </div>
              </div>

              <div className={isAcaiComplete ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Coberturas</label>
                <div className="grid grid-cols-2 gap-2">
                    {ACAI_TOPPINGS.map(item => (
                        <button key={item} onClick={() => toggleAddition(item)} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${additions.includes(item) ? 'bg-red-700 border-red-700 text-white' : 'bg-white border-zinc-100 text-zinc-400'}`}>
                            {additions.includes(item) ? '✓ ' : '+ '} {item}
                        </button>
                    ))}
                </div>
              </div>

              <div className={isAcaiComplete ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Frutas</label>
                <div className="grid grid-cols-2 gap-2">
                    {ACAI_FRUITS.map(item => (
                        <button key={item} onClick={() => toggleAddition(item)} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${additions.includes(item) ? 'bg-red-700 border-red-700 text-white' : 'bg-white border-zinc-100 text-zinc-400'}`}>
                            {additions.includes(item) ? '✓ ' : '+ '} {item}
                        </button>
                    ))}
                </div>
              </div>

              <section>
                <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Adicionais Pagos</label>
                <div className="grid grid-cols-2 gap-2">
                    {ACAI_PAID_EXTRAS.map(extra => (
                        <button key={extra.name} onClick={() => toggleAddition(extra.name)} className={`p-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${additions.includes(extra.name) ? 'bg-green-600 border-green-700 text-white shadow-lg' : 'bg-white border-zinc-100 text-zinc-400'}`}>
                            <div className="flex flex-col items-center">
                                <span>{extra.name}</span>
                                <span className={additions.includes(extra.name) ? 'text-white/80' : 'text-green-600'}>+ R$ {extra.price.toFixed(2)}</span>
                            </div>
                        </button>
                    ))}
                </div>
              </section>
            </section>
          )}

          {!isFranguinho && !isPorcoes && !isBebidas && !isAcai && (
            <section>
              <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Retirar algo?</label>
              <textarea 
                className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] p-4 text-zinc-800 focus:outline-none focus:border-red-500 min-h-[80px] text-sm font-medium" 
                placeholder="Digite o que deseja tirar (ex: sem milho, sem cebola...)" 
                value={removedText} 
                onChange={e => setRemovedText(e.target.value)} 
              />
            </section>
          )}

          {isLanche && (
            <section className="space-y-4">
              <label className="block text-red-900/40 text-[10px] font-black uppercase mb-1 tracking-[0.2em]">Adicionais</label>
              <div className="space-y-3">
                <button 
                  onClick={() => setHasPicanha(!hasPicanha)} 
                  className={`w-full p-4 rounded-2xl text-[11px] font-black uppercase border-2 flex justify-between items-center transition-all ${hasPicanha ? 'bg-red-700 border-red-700 text-white shadow-lg' : 'bg-white border-zinc-100 text-zinc-400'}`}
                >
                  <span>Bife de Picanha</span>
                  <span className={hasPicanha ? 'text-white' : 'text-red-600'}>+ R$ 4,50</span>
                </button>

                <div className="relative">
                   <select 
                    onChange={(e) => { addDropdownAddition(e.target.value); e.target.value = ''; }}
                    className="w-full p-4 rounded-2xl text-[11px] font-black uppercase border-2 bg-zinc-50 border-zinc-100 text-red-900 outline-none focus:border-red-500 appearance-none"
                   >
                    <option value="">Acrescentar Itens (R$ 3,00 cada)</option>
                    <option value="Ovo">Ovo</option>
                    <option value="Bacon">Bacon</option>
                    <option value="Carne Comum">Carne Comum</option>
                    <option value="Queijo">Queijo</option>
                    <option value="Presunto">Presunto</option>
                    <option value="Calabresa">Calabresa</option>
                   </select>
                   <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-red-600">▼</span>
                </div>

                {additions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {additions.map((item, idx) => (
                      <span key={idx} className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full text-[9px] font-black uppercase flex items-center gap-2">
                        {item} (+ R$ 3,00)
                        <button onClick={() => removeDropdownAddition(idx)} className="text-green-900 font-bold hover:text-red-600">×</button>
                      </span>
                    ))}
                  </div>
                )}

                <button 
                  onClick={() => setHasTurbine(!hasTurbine)}
                  className={`w-full py-5 px-6 rounded-[2rem] text-[10px] font-black uppercase transition-all shadow-xl border-4 border-white border-b-8 border-b-red-950 ${hasTurbine ? 'bg-green-600 text-white scale-105' : 'bg-red-600 text-white hover:bg-red-700'}`}
                >
                  {hasTurbine ? 'TURBINADO ATIVADO! ✅' : 'TURBINE SEU LANCHE POR + 10R$ (150G DE BATATA E UM JUNINHO)'}
                </button>
              </div>
            </section>
          )}

          {isFranguinho && maxSides > 0 && (
            <section>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-red-900/40 text-[10px] font-black uppercase tracking-[0.2em]">Selecione os Acompanhamentos</label>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase italic ${additions.length === maxSides ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {additions.length} / {maxSides}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {franguinhoAdditions.map((opt) => (
                  <button 
                    key={opt} 
                    onClick={() => toggleAddition(opt)} 
                    disabled={!additions.includes(opt) && additions.length >= maxSides}
                    className={`p-4 rounded-xl text-[10px] font-black uppercase border-2 text-left transition-all ${additions.includes(opt) ? 'bg-red-700 border-red-700 text-white shadow-md' : 'bg-white border-zinc-100 text-zinc-400'} ${(!additions.includes(opt) && additions.length >= maxSides) ? 'opacity-40 grayscale' : ''}`}
                  >
                    {additions.includes(opt) ? '✓ ' : '+ '} {opt}
                  </button>
                ))}
              </div>
              {additions.length < maxSides && (
                 <p className="text-[8px] font-bold text-red-400 mt-3 uppercase italic tracking-widest text-center animate-pulse">
                   Por favor, selecione mais {maxSides - additions.length} acompanhamento(s)
                 </p>
              )}
            </section>
          )}

          <section>
            <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Observação do Item</label>
            <textarea className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] p-4 text-zinc-800 focus:outline-none focus:border-red-500 min-h-[80px] text-sm font-medium" placeholder="Algum detalhe a mais?" value={observation} onChange={e => setObservation(e.target.value)} />
          </section>
        </div>
        <div className="p-6 bg-zinc-50/80 border-t border-zinc-100">
          <Button 
            fullWidth 
            onClick={handleConfirm} 
            disabled={isFranguinho && maxSides > 0 && additions.length < maxSides}
            className="py-4 text-base rounded-[1.5rem]"
          >
            ADICIONAR AO CARRINHO
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<AppView>('HOME');
  const [step, setStep] = useState<OrderStep>('MENU');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '', phone: '', address: '', addressNumber: '', reference: '', tableNumber: '',
    orderType: OrderType.DELIVERY, paymentMethod: PaymentMethod.PIX
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- LISTENER EM TEMPO REAL PARA A TELA ADMIN ---
  useEffect(() => {
    if (view === 'ADMIN' && isLoggedIn) {
      const q = query(collection(db, 'pedidos'), orderBy('criadoEm', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedOrders = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setOrders(loadedOrders);
      }, (error) => {
        console.error("[Firebase] Erro no listener:", error);
      });
      return () => unsubscribe();
    }
  }, [view, isLoggedIn]);

  const total = cart.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

  // --- LOGICA DE BUSCA ---
  const filteredProducts = searchTerm.trim() === ''
    ? PRODUCTS.filter(p => p.categoryId === activeCategory)
    : PRODUCTS.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ingredients?.some(ing => ing.toLowerCase().includes(searchTerm.toLowerCase()))
      );

  // --- FUNÇÃO FINALIZAR PEDIDO ---
  const handleFinishOrder = async () => {
    if (isSending) return;
    
    const clientName = customer.name.trim();
    if (!clientName || cart.length === 0) {
      alert("Por favor, informe seu nome e escolha seus itens.");
      return;
    }

    setIsSending(true);

    const itensString = cart.map(item => {
        let desc = `${item.quantity}x ${item.name}`;
        if (item.flavor) desc += ` (${item.flavor})`;
        
        const extras = [];
        if (item.removedIngredients?.length) extras.push(`SEM: ${item.removedIngredients.join(', ')}`);
        if (item.additions?.length) extras.push(`COM: ${item.additions.join(', ')}`);
        if (item.observation?.trim()) extras.push(`OBS: ${item.observation.trim()}`);
        return extras.length > 0 ? `${desc} [${extras.join(' | ')}]` : desc;
    }).join('\n');

    const payload = {
      nomeCliente: clientName,
      itens: itensString,
      total: Number(total.toFixed(2)),
      status: "novo",
      criadoEm: serverTimestamp(),
      telefone: customer.phone || "N/A",
      tipo: customer.orderType,
      pagamento: customer.paymentMethod,
      endereco: customer.orderType === OrderType.DELIVERY 
          ? `${customer.address}, ${customer.addressNumber}` 
          : "Retirada no Balcão"
    };

    try {
      await addDoc(collection(db, 'pedidos'), payload);
      setCart([]);
      setView('SUCCESS');
      setTimeout(() => setView('HOME'), 4500);
    } catch (err: any) {
      console.error("ERRO COMPLETO DO FIREBASE:", err);
      alert('ERRO DO FIREBASE: ' + err.message);
      setIsSending(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'pedidos', orderId), { status: newStatus });
    } catch (e) { 
      console.error("[Firebase] Erro ao atualizar status:", e); 
    }
  };

  const printOrder = (order: any) => {
    setReceiptOrder(order);
    setTimeout(() => {
        window.print();
        setReceiptOrder(null);
    }, 500);
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  // --- RENDERS ---
  if (view === 'SUCCESS') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-50 fixed inset-0 z-[500] animate-fade-in no-print">
      <div className="glass-card p-10 md:p-14 rounded-[3.5rem] max-w-md shadow-2xl border-green-200 border-2 bg-white">
        <div className="text-[64px] mb-6 animate-bounce leading-none">✅</div>
        <h2 className="text-2xl font-black text-green-600 mb-4 tracking-tighter italic uppercase">Recebido!</h2>
        <div className="bg-green-50 border border-green-100 p-6 rounded-[1.5rem]">
            <p className="text-green-900 font-black text-[10px] uppercase tracking-widest leading-loose">
                A Sandra já recebeu seu pedido!<br/>
                Prepare o estômago.
            </p>
        </div>
        <Button onClick={() => setView('HOME')} variant="secondary" className="mt-8 rounded-full px-10 py-3 text-xs">Voltar ao Início</Button>
      </div>
    </div>
  );

  if (view === 'LOGIN') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 no-print">
        <div className="glass-card p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl bg-white border border-red-50">
            <h2 className="text-2xl font-black text-red-800 mb-6 text-center italic leading-none uppercase">Cozinha</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const user = (formData.get('user') as string)?.toLowerCase();
                const pass = formData.get('pass') as string;
                // Credenciais atualizadas
                if ((user === 'sandra' && pass === 'Cantinho@2026') || (user === 'admin' && pass === 'admin@1234')) {
                    setIsLoggedIn(true); setView('ADMIN');
                } else {
                    alert("Acesso não autorizado.");
                }
            }} className="space-y-4">
                <Input label="Usuário" name="user" required />
                <Input label="Senha" name="pass" type="password" required />
                <Button type="submit" fullWidth className="py-4 rounded-xl">ACESSAR PAINEL</Button>
                <button type="button" onClick={() => setView('HOME')} className="w-full text-zinc-300 font-black text-[9px] mt-4 uppercase tracking-widest hover:text-red-700 transition-colors">← Voltar</button>
            </form>
        </div>
    </div>
  );

  if (view === 'ADMIN') return (
    <div className="min-h-screen bg-zinc-50 pb-40">
      <div className="p-6 max-w-7xl mx-auto no-print">
        <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-xl border border-red-50">
          <div>
              <h2 className="text-2xl font-black text-red-800 italic leading-none">Cozinha</h2>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Monitoramento de Pedidos</p>
          </div>
          <Button variant="secondary" onClick={() => { setIsLoggedIn(false); setView('HOME'); }} className="px-5 py-2 rounded-xl text-[9px] font-black uppercase">SAIR</Button>
        </header>
        
        <div className="space-y-3 animate-fade-in">
          {orders.length === 0 ? (
            <div className="col-span-full text-center py-24 opacity-10">
              <span className="text-[80px] block">🍔</span>
              <p className="text-xl font-black italic mt-6">Sem pedidos novos...</p>
            </div>
          ) : (
            orders.map(o => (
              <div key={o.id} className={`bg-white p-5 rounded-[1.5rem] border-l-[6px] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all hover:shadow-md ${o.status === 'novo' ? 'border-red-600' : 'border-zinc-200 opacity-60'}`}>
                <div className="min-w-[200px]">
                  <p className="text-sm font-black text-red-950 leading-none italic uppercase">
                    {o.nomeCliente} <span className="text-zinc-400 not-italic ml-2">{o.telefone}</span>
                  </p>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1 italic">{o.tipo} • {o.pagamento}</p>
                </div>
                
                <div className="flex-1 bg-zinc-50 p-4 rounded-xl text-[10px] font-bold text-zinc-700 whitespace-pre-wrap border border-zinc-100 max-h-[100px] overflow-y-auto leading-relaxed">
                  {o.itens}
                </div>

                <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                   <p className="text-xl font-black text-red-700 italic min-w-[100px]">R$ {Number(o.total || 0).toFixed(2)}</p>
                   
                   <div className="flex gap-2 w-full sm:w-auto">
                     <button onClick={() => printOrder(o)} className="w-10 h-10 bg-zinc-900 text-white rounded-[0.8rem] flex items-center justify-center text-lg hover:scale-105 active:scale-95 transition-all shadow-md">🖨️</button>
                     
                     {o.status === 'novo' ? (
                       <Button onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 border-green-500 py-2 px-4 rounded-xl text-[9px] font-black uppercase shadow-md flex-1 sm:flex-none">Concluir</Button>
                     ) : (
                       <Button variant="secondary" onClick={() => updateOrderStatus(o.id, 'novo')} className="py-2 px-4 rounded-xl text-[8px] font-black uppercase flex-1 sm:flex-none">Reabrir</Button>
                     )}
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="printable-area hidden"><Receipt order={receiptOrder} /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {view === 'HOME' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in bg-zinc-50 no-print">
          <div className="glass-card p-10 md:p-16 rounded-[3rem] text-center shadow-2xl max-w-sm w-full border-red-50 bg-white relative overflow-hidden border-b-[6px] border-red-100">
            <div className="text-[64px] mb-6 animate-float leading-none drop-shadow-xl">🍔</div>
            <h1 className="text-4xl font-black text-red-800 mb-3 tracking-tighter italic leading-none">Cantinho da Sandra</h1>
            <p className="text-red-900/20 font-black uppercase tracking-[0.4em] text-[9px] mb-12 italic">A Melhor Mordida da Cidade</p>
            <Button fullWidth onClick={() => setView('ORDER')} className="text-xl py-5 shadow-xl shadow-red-100 flex items-center justify-center gap-4 group rounded-[2rem] border-b-4 border-red-800 hover:translate-y-[-2px]">
              FAZER PEDIDO <span className="text-3xl group-hover:translate-x-3 transition-transform">➡</span>
            </Button>
            <button 
              onClick={() => setView('LOGIN')} 
              className="mt-16 text-zinc-200 text-[9px] font-black uppercase tracking-[0.3em] hover:text-red-400 italic transition-all hidden md:block w-full"
            >
              Administração
            </button>
          </div>
        </div>
      )}

      {view === 'ORDER' && (
        <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-white border-x border-zinc-100 shadow-2xl no-print">
            {step === 'MENU' && (
                <>
                    <header className="p-5 bg-white/95 sticky top-0 z-50 border-b border-zinc-100 backdrop-blur-md">
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={() => { setView('HOME'); setSearchTerm(''); }} className="text-red-800 font-black text-[9px] uppercase tracking-widest px-3 py-1 bg-red-50 rounded-full hover:bg-red-100 transition-all">← Sair</button>
                            <h2 className="font-black text-red-900 uppercase tracking-[0.15em] text-[10px] italic">Cardápio</h2>
                            <div className="w-10"></div>
                        </div>
                        <div className="relative group">
                          <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Pesquisar itens ou ingredientes..."
                            className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-3 px-10 text-[11px] font-bold text-red-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/10 transition-all placeholder:text-zinc-300 shadow-inner"
                          />
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-30 group-focus-within:opacity-100 transition-opacity">🔍</span>
                          {searchTerm && (
                            <button 
                              onClick={() => setSearchTerm('')}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-red-300 font-black hover:text-red-600"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                    </header>
                    
                    {!searchTerm && (
                      <div className="p-4 flex gap-3 overflow-x-auto no-scrollbar py-5 border-b border-zinc-50 bg-white">
                          {CATEGORIES.map(cat => (
                              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-shrink-0 px-5 py-3 rounded-full font-black text-[9px] uppercase transition-all shadow-sm ${activeCategory === cat.id ? 'bg-red-700 text-white shadow-xl scale-105' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}`}>
                                  <span className="mr-1">{cat.icon}</span> {cat.name}
                              </button>
                          ))}
                      </div>
                    )}

                    <div className="flex-1 p-5 space-y-4 pb-44 overflow-y-auto bg-zinc-50/10">
                        {searchTerm && (
                          <p className="text-[9px] font-black uppercase text-red-900/30 tracking-widest mb-2 italic">
                            Resultados para: "{searchTerm}"
                          </p>
                        )}
                        
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map(prod => (
                              <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="bg-white border border-zinc-50 p-5 rounded-[2rem] flex justify-between items-center shadow-md shadow-zinc-200/30 active:scale-95 transition-all hover:border-red-200 cursor-pointer group">
                                  <div className="flex-1 pr-4">
                                      <h3 className="text-lg font-black text-red-950 mb-0.5 leading-none italic group-hover:text-red-700 transition-all">{prod.name}</h3>
                                      {prod.unit && <p className="text-[9px] font-black text-red-600/40 uppercase tracking-widest italic mt-1">{prod.unit}</p>}
                                      <p className="text-red-600 font-black text-base italic">R$ {prod.price.toFixed(2)}</p>
                                  </div>
                                  <div className="w-10 h-10 bg-red-700 text-white rounded-[1rem] flex items-center justify-center text-2xl font-black shadow-lg group-hover:rotate-6 transition-all">+</div>
                              </div>
                          ))
                        ) : (
                          <div className="text-center py-20 opacity-20">
                            <span className="text-6xl block mb-4">🤷‍♂️</span>
                            <p className="text-xs font-black italic">Nenhum item encontrado.</p>
                          </div>
                        )}
                    </div>
                    {cart.length > 0 && (
                        <div className="fixed bottom-8 left-6 right-6 z-50 animate-slide-up max-w-lg mx-auto">
                            <Button fullWidth onClick={() => setStep('TYPE_SELECTION')} className="py-5 text-lg flex justify-between items-center px-8 shadow-2xl rounded-[2rem] border-b-4 border-red-900">
                                <span className="font-black italic uppercase tracking-tighter">Sacola ({cart.length})</span>
                                <span className="bg-white/20 px-5 py-1.5 rounded-xl text-base font-black italic">R$ {total.toFixed(2)}</span>
                            </Button>
                        </div>
                    )}
                </>
            )}

            {(step === 'TYPE_SELECTION' || step === 'FORM' || step === 'SUMMARY') && (
                <div className="flex-1 overflow-y-auto bg-white">
                    {step === 'TYPE_SELECTION' && (
                        <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] animate-fade-in space-y-10">
                            <h2 className="text-4xl font-black text-red-900 tracking-tighter italic leading-none text-center">Tipo de<br/>Pedido</h2>
                            <div className="grid grid-cols-1 w-full gap-5 max-w-sm">
                                <button onClick={() => { setCustomer({...customer, orderType: OrderType.DELIVERY}); setStep('FORM'); }} className="bg-zinc-50 border border-zinc-100 hover:border-red-600 p-8 rounded-[2.5rem] text-center shadow-lg transition-all group active:scale-95 border-b-[6px] border-zinc-200">
                                    <span className="text-[56px] block mb-4 group-hover:scale-110 transition-all leading-none">🛵</span>
                                    <span className="font-black text-red-950 text-xl uppercase italic">Delivery</span>
                                </button>
                                <button onClick={() => { setCustomer({...customer, orderType: OrderType.COUNTER}); setStep('FORM'); }} className="bg-zinc-50 border border-zinc-100 hover:border-red-600 p-8 rounded-[2.5rem] text-center shadow-lg transition-all group active:scale-95 border-b-[6px] border-zinc-200">
                                    <span className="text-[56px] block mb-4 group-hover:scale-110 transition-all leading-none">🥡</span>
                                    <span className="font-black text-red-950 text-xl uppercase italic">Balcão</span>
                                </button>
                            </div>
                            <button onClick={() => setStep('MENU')} className="text-zinc-300 font-black uppercase text-[9px] tracking-[0.2em] hover:text-red-700 transition-all">← Voltar ao Menu</button>
                        </div>
                    )}

                    {step === 'FORM' && (
                        <div className="p-8 animate-fade-in pb-44">
                            <h2 className="text-3xl font-black text-red-800 mb-8 tracking-tighter italic leading-none">Seus Dados</h2>
                            <form onSubmit={(e) => { e.preventDefault(); setStep('SUMMARY'); }} className="space-y-4">
                                <Input label="Seu Nome" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Para o pedido" required />
                                <Input label="WhatsApp" type="tel" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="(00) 00000-0000" required />
                                {customer.orderType === OrderType.DELIVERY && (
                                    <div className="animate-fade-in space-y-4">
                                        <Input label="Rua e Bairro" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="Endereço completo" required />
                                        <Input label="Número" value={customer.addressNumber} onChange={e => setCustomer({...customer, addressNumber: e.target.value})} placeholder="Ex: 45" required />
                                    </div>
                                )}
                                <Select label="Pagamento" options={PAYMENT_METHODS} value={customer.paymentMethod} onChange={e => setCustomer({...customer, paymentMethod: e.target.value as PaymentMethod})} />
                                <Button type="submit" fullWidth className="py-5 text-lg mt-10 rounded-[1.5rem] uppercase italic border-b-4 border-red-900 shadow-xl">Revisar Pedido</Button>
                            </form>
                            <button onClick={() => setStep('TYPE_SELECTION')} className="w-full mt-8 text-zinc-300 font-black text-[9px] text-center uppercase tracking-widest hover:text-red-700">← Alterar Tipo</button>
                        </div>
                    )}

                    {step === 'SUMMARY' && (
                        <div className="p-8 animate-fade-in pb-44">
                            <h2 className="text-3xl font-black text-red-800 mb-6 tracking-tighter italic leading-none">Confirmação</h2>
                            <div className="bg-zinc-50 p-6 rounded-[2rem] mb-8 space-y-6 shadow-xl border border-white relative overflow-hidden">
                                <div className="border-b border-zinc-200 pb-5 relative z-10">
                                    <p className="text-2xl font-black text-red-950 italic">{customer.name.toUpperCase()}</p>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <span className="text-[8px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full border border-red-100">{customer.orderType}</span>
                                        <span className="text-[8px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full border border-red-100">{customer.paymentMethod}</span>
                                    </div>
                                </div>
                                <div className="space-y-4 relative z-10">
                                    {cart.map(item => (
                                        <div key={item.cartId} className="flex justify-between items-start group">
                                            <div className="flex-1 pr-6">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-red-950 text-lg leading-none italic">{item.quantity}x {item.name}</p>
                                                    <button onClick={() => removeFromCart(item.cartId)} className="text-red-300 hover:text-red-600 text-[8px] font-black uppercase opacity-0 group-hover:opacity-100 transition-all">X</button>
                                                </div>
                                                <div className="text-[8px] text-zinc-400 font-bold mt-2 uppercase leading-relaxed">
                                                    {item.flavor && <span className="block text-red-600 font-black italic">✓ {item.flavor}</span>}
                                                    {item.removedIngredients?.map(i => <span key={i} className="block text-red-400">× SEM {i}</span>)}
                                                    {item.additions?.map(i => <span key={i} className="block text-green-600">✓ COM {i}</span>)}
                                                    {item.observation?.trim() && <span className="block italic mt-1 text-zinc-500">"{item.observation.trim()}"</span>}
                                                </div>
                                            </div>
                                            <p className="font-black text-red-800 text-lg italic">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-zinc-200 pt-5 flex justify-between items-center relative z-10">
                                    <span className="text-lg font-black text-zinc-300 italic">Total</span>
                                    <span className="text-3xl font-black text-red-700 italic">R$ {total.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div className="fixed bottom-8 left-6 right-6 z-50 max-w-lg mx-auto">
                                <Button 
                                    onClick={handleFinishOrder} 
                                    disabled={isSending}
                                    fullWidth 
                                    className={`py-5 text-2xl shadow-2xl rounded-[2.5rem] border-2 border-white border-b-[8px] border-b-red-950 ${isSending ? 'opacity-60 scale-95 grayscale' : 'animate-pulse-slow active:scale-90 transition-all'}`}
                                >
                                    {isSending ? 'ENVIANDO...' : 'FINALIZAR! ✅'}
                                </Button>
                            </div>
                            <button onClick={() => setStep('FORM')} className="w-full mt-6 text-zinc-300 font-black text-[9px] text-center uppercase tracking-widest hover:text-red-700">← Corrigir Dados</button>
                        </div>
                    )}
                </div>
            )}
        </div>
      )}

      <ProductModal 
        isOpen={!!selectedProduct} 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        onConfirm={(item: CartItem) => { setCart([...cart, item]); setSelectedProduct(null); }} 
      />

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { transform: translateY(110%); } to { transform: translateY(0); } }
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        .animate-fade-in { animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pulse-slow { animation: pulse-slow 3s infinite ease-in-out; }
        .animate-float { animation: float 6s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        
        @media print {
            body { background: white !important; padding: 0 !important; margin: 0 !important; }
            .no-print { display: none !important; }
            .printable-area { display: block !important; visibility: visible !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
            #root > div:not(.printable-area) { display: none !important; }
        }
      `}</style>
    </div>
  );
}
