
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  serverTimestamp,
  deleteDoc,
  addDoc
} from 'firebase/firestore';

import { db } from './firebase';
import { Button } from './components/Button';
import { Input, Select } from './components/Input';
import { 
    CATEGORIES, PRODUCTS, PAYMENT_METHODS, 
    ACAI_COMPLEMENTS, ACAI_TOPPINGS, 
    ACAI_FRUITS, ACAI_PAID_EXTRAS, DELIVERY_FEES, FRANGUINHO_SIDES
} from './constants';
import { Product, CustomerInfo, CartItem, PaymentMethod, OrderType } from './types';

type AppView = 'HOME' | 'ORDER' | 'LOGIN' | 'ADMIN' | 'SUCCESS';
type OrderStep = 'MENU' | 'CART_REVIEW' | 'TYPE_SELECTION' | 'FORM' | 'SUMMARY';
type AdminTab = 'novo' | 'preparando' | 'concluido' | 'cancelado';

// --- COMPONENTE DE RECIBO PARA IMPRESSÃO ---
const Receipt = ({ order, stats }: { order: any | null, stats?: any | null }) => {
    if (stats) {
        return (
            <div className="w-full max-w-[80mm] mx-auto text-black font-mono text-[14px] font-bold p-4 bg-white border border-zinc-200 shadow-sm printable-content">
                <div className="text-center mb-4 border-b border-dashed border-black pb-2">
                    <h1 className="font-bold text-lg uppercase italic">RESUMO DE VENDAS</h1>
                    <p className="text-[10px]">CANTINHO DA SANDRA</p>
                    <p className="text-[10px]">{new Date().toLocaleString('pt-BR')}</p>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between border-b border-dashed border-black pb-1">
                        <span className="font-bold">TOTAL HOJE:</span>
                        <span>R$ {stats.daily.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-black pb-1">
                        <span className="font-bold">ESTA SEMANA:</span>
                        <span>R$ {stats.weekly.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-black pb-1">
                        <span className="font-bold">ESTE MES:</span>
                        <span>R$ {stats.monthly.toFixed(2)}</span>
                    </div>
                </div>
                <div className="text-center mt-6 text-[10px] italic uppercase">
                    Relatório gerado pelo sistema
                </div>
            </div>
        );
    }

    if (!order) return null;
    const date = order.criadoEm?.toDate ? order.criadoEm.toDate().toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
    
    return (
        <div className="w-full max-w-[80mm] mx-auto text-black font-mono text-[14px] font-bold p-4 bg-white border border-zinc-200 shadow-sm printable-content">
            <div className="text-center mb-4 border-b border-dashed border-black pb-2">
                <h1 className="font-bold text-lg uppercase italic">Cantinho da Sandra</h1>
                <p className="text-[10px]">ID: {(order.id || '').slice(-6).toUpperCase()}</p>
            </div>
            <div className="mb-2">
                <p><strong>CLIENTE:</strong> {String(order.nomeCliente || '').toUpperCase()}</p>
                <p><strong>DATA:</strong> {date}</p>
                <p><strong>TIPO:</strong> {order.tipo || 'RETIRADA NA LANCHONETE'}</p>
                <p><strong>FONE:</strong> {order.telefone || 'N/A'}</p>
                {order.endereco && (
                    <div className="mt-1 border border-black p-1">
                        <p className="leading-tight font-bold underline uppercase">ENDEREÇO / LOCAL:</p>
                        <p className="leading-tight uppercase break-words">{order.endereco}</p>
                    </div>
                )}
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            <div className="mb-2">
                <p className="font-bold mb-1 uppercase text-[12px] underline">DETALHES DO PEDIDO:</p>
                <p className="whitespace-pre-wrap leading-tight text-[12px]">{order.itens || 'Nenhum item'}</p>
            </div>
            {(order.frete || 0) > 0 && (
                <div className="mb-2 border-t border-dashed border-black pt-1">
                   <p><strong>FRETE ({order.bairro || ''}):</strong> R$ {Number(order.frete).toFixed(2)}</p>
                </div>
            )}
            <div className="border-t border-dashed border-black mt-2 pt-2 text-right">
                <p className="text-lg font-bold">TOTAL: R$ {Number(order.total || 0).toFixed(2)}</p>
                <p className="text-[11px] uppercase font-bold">{order.pagamento || 'N/A'}</p>
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
      if (isAcaiComplete) finalAdditions.unshift("AÇAÍ COMPLETO");
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

  const toggleAddition = (name: string) => {
    setAdditions(prev => {
      if (prev.includes(name)) return prev.filter(a => a !== name);
      if (isFranguinho && prev.length >= maxSides) return prev;
      return [...prev, name];
    });
  };

  const handleAddDropdownItem = (val: string) => {
    if (val && !additions.includes(val)) {
        setAdditions(prev => [...prev, val]);
    }
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity no-print ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-fade-in">
        <div className="p-6 border-b border-red-50 flex justify-between items-center bg-red-50/30">
          <div>
            <h3 className="text-xl font-black text-red-800 leading-none italic uppercase">{product.name}</h3>
            {product.unit && <p className="text-[10px] font-black text-red-600/60 uppercase tracking-widest mt-1 italic">{product.unit}</p>}
            <p className="text-red-600 font-black mt-1">R$ {product.price.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="text-zinc-300 hover:text-red-600 text-3xl leading-none transition-colors">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Quantidade</label>
            <div className="flex items-center gap-6">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-[0.8rem] bg-zinc-50 text-red-600 font-black text-xl hover:bg-zinc-100 transition-all">-</button>
              <span className="text-2xl font-black text-red-900 italic">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-[0.8rem] bg-zinc-50 text-red-600 font-black text-xl hover:bg-zinc-100 transition-all">+</button>
            </div>
          </section>

          {isLanche && (
            <div className="space-y-6">
               <section className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
                  <label className="block text-red-900/40 text-[10px] font-black uppercase mb-2 tracking-[0.2em]">Ingredientes Inclusos</label>
                  <p className="text-[11px] font-bold text-red-800 uppercase italic leading-relaxed">{product.ingredients?.join(', ')}</p>
               </section>
               <section>
                  <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Retirar algo?</label>
                  <textarea className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] p-4 text-zinc-800 focus:outline-none focus:border-red-500 min-h-[80px] text-sm font-medium" placeholder="Digite o que deseja tirar..." value={removedText} onChange={e => setRemovedText(e.target.value)} />
               </section>
               <section className="space-y-4">
                  <label className="block text-red-900/40 text-[10px] font-black uppercase mb-1 tracking-[0.2em]">Adicionais</label>
                  <button onClick={() => setHasPicanha(!hasPicanha)} className={`w-full p-4 rounded-2xl text-[11px] font-black uppercase border-2 flex justify-between items-center transition-all ${hasPicanha ? 'bg-red-700 border-red-700 text-white shadow-lg' : 'bg-white border-zinc-100 text-zinc-400'}`}>
                    <span>Bife de Picanha</span>
                    <span className={hasPicanha ? 'text-white' : 'text-red-600'}>+ R$ 4,50</span>
                  </button>
                  <div className="relative">
                    <select onChange={(e) => { handleAddDropdownItem(e.target.value); e.target.value = ''; }} className="w-full p-4 rounded-2xl text-[11px] font-black uppercase border-2 bg-zinc-50 border-zinc-100 text-red-900 outline-none appearance-none">
                        <option value="">Acrescentar Itens (R$ 3,00 cada)</option>
                        <option value="Ovo">Ovo</option>
                        <option value="Bacon">Bacon</option>
                        <option value="Carne Comum">Carne Comum</option>
                        <option value="Queijo">Queijo</option>
                        <option value="Presunto">Presunto</option>
                        <option value="Calabresa">Calabresa</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-red-600">▼</div>
                  </div>
                  {additions.filter(a => !a.includes("TURBO") && !a.includes("Picanha")).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {additions.filter(a => !a.includes("TURBO") && !a.includes("Picanha")).map((add, idx) => (
                            <span key={add + idx} className="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-2">
                                {add} (R$ 3,00)
                                <button onClick={() => setAdditions(prev => prev.filter(a => a !== add))} className="text-red-600 text-xs font-black">&times;</button>
                            </span>
                        ))}
                      </div>
                  )}
                  <button onClick={() => setHasTurbine(!hasTurbine)} className={`w-full py-5 px-6 rounded-[2rem] text-[10px] font-black uppercase transition-all shadow-xl border-4 border-white border-b-8 border-b-red-950 ${hasTurbine ? 'bg-green-600 text-white scale-105' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                    {hasTurbine ? 'LANCHE TURBINADO! ✅' : 'TURBINE SEU LANCHE POR + 10R$ (150G DE BATATA E UM JUNINHO)'}
                  </button>
               </section>
            </div>
          )}

          {isFranguinho && (
            <section>
              <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Acompanhamentos (Escolha {maxSides})</label>
              {maxSides === 0 ? (
                <p className="text-xs font-bold text-zinc-400 italic">Este item não possui acompanhamentos.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {FRANGUINHO_SIDES.map(item => (
                      <button key={item} onClick={() => toggleAddition(item)} disabled={!additions.includes(item) && additions.length >= maxSides} className={`p-4 rounded-2xl text-[10px] font-black uppercase border-2 text-left transition-all ${additions.includes(item) ? 'bg-red-700 border-red-700 text-white' : 'bg-white border-zinc-100 text-zinc-400 disabled:opacity-30'}`}>
                        <div className="flex justify-between items-center">
                          <span>{item}</span>
                          {additions.includes(item) && <span className="text-white">✓</span>}
                        </div>
                      </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {isPorcoes && (
            <div className="space-y-6">
                {product.description && (
                    <section className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
                        <label className="block text-red-900/40 text-[10px] font-black uppercase mb-2 tracking-[0.2em]">Informações</label>
                        <p className="text-[11px] font-bold text-red-800 uppercase italic leading-relaxed">{product.description}</p>
                    </section>
                )}
            </div>
          )}

          {isBebidas && (
            <section className="space-y-4">
              {product.needsFlavor && (
                <div>
                  <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Sabor</label>
                  <input type="text" className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 text-sm font-bold text-red-900 outline-none" placeholder="Qual o sabor?" value={flavor} onChange={e => setFlavor(e.target.value)} />
                </div>
              )}
              {product.needsZeroOption && (
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsZero(false)} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase border-2 transition-all ${!isZero ? 'bg-red-700 border-red-700 text-white' : 'bg-white border-zinc-100 text-zinc-400'}`}>Normal</button>
                    <button onClick={() => setIsZero(true)} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase border-2 transition-all ${isZero ? 'bg-zinc-800 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-400'}`}>Zero</button>
                </div>
              )}
            </section>
          )}

          {isAcai && (
            <section className="space-y-8">
              <button onClick={() => { setIsAcaiComplete(!isAcaiComplete); if(!isAcaiComplete) setAdditions([]); }} className={`w-full py-5 rounded-[2rem] text-xs font-black uppercase border-b-4 transition-all shadow-xl ${isAcaiComplete ? 'bg-green-600 border-green-800 text-white scale-105' : 'bg-red-700 border-red-900 text-white'}`}>
                {isAcaiComplete ? 'AÇAÍ COMPLETO ATIVADO! ✅' : 'QUER O AÇAÍ COMPLETO? (TUDO INCLUSO)'}
              </button>
              <div className={isAcaiComplete ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Complementos</label>
                <div className="grid grid-cols-2 gap-2">
                    {ACAI_COMPLEMENTS.map(item => (
                        <button key={item} onClick={() => toggleAddition(item)} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${additions.includes(item) ? 'bg-red-700 border-red-700 text-white' : 'bg-white border-zinc-100 text-zinc-400'}`}>{additions.includes(item) ? '✓ ' : '+ '} {item}</button>
                    ))}
                </div>
              </div>
              <div className={isAcaiComplete ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Coberturas</label>
                <div className="grid grid-cols-2 gap-2">
                    {ACAI_TOPPINGS.map(item => (
                        <button key={item} onClick={() => toggleAddition(item)} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${additions.includes(item) ? 'bg-red-700 border-red-700 text-white' : 'bg-white border-zinc-100 text-zinc-400'}`}>{additions.includes(item) ? '✓ ' : '+ '} {item}</button>
                    ))}
                </div>
              </div>
              <div className={isAcaiComplete ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Frutas</label>
                <div className="grid grid-cols-2 gap-2">
                    {ACAI_FRUITS.map(item => (
                        <button key={item} onClick={() => toggleAddition(item)} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${additions.includes(item) ? 'bg-red-700 border-red-700 text-white' : 'bg-white border-zinc-100 text-zinc-400'}`}>{additions.includes(item) ? '✓ ' : '+ '} {item}</button>
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

          <section>
            <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Observação do Item</label>
            <textarea className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] p-4 text-zinc-800 focus:outline-none min-h-[80px] text-sm font-medium" placeholder="Algum detalhe a mais?" value={observation} onChange={e => setObservation(e.target.value)} />
          </section>
        </div>
        <div className="p-6 bg-zinc-50/80 border-t border-zinc-100">
          <Button fullWidth onClick={handleConfirm} className="py-4 text-base rounded-[1.5rem]">ADICIONAR AO CARRINHO</Button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<AppView>('HOME');
  const [step, setStep] = useState<OrderStep>('MENU');
  const [adminTab, setAdminTab] = useState<AdminTab>('novo');
  const [quickSaleCat, setQuickSaleCat] = useState<'balcao' | 'bebidas'>('balcao');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '', phone: '', address: '', neighborhood: '', addressNumber: '', reference: '', deliveryFee: 0, tableNumber: '',
    orderType: OrderType.DELIVERY, paymentMethod: PaymentMethod.PIX, needsChange: false, changeAmount: ''
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [receiptStats, setReceiptStats] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOutroAlert, setShowOutroAlert] = useState(false);

  useEffect(() => {
    if (view === 'ADMIN' && isLoggedIn) {
      const q = query(collection(db, 'pedidos'), orderBy('criadoEm', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.error(err));
      return () => unsubscribe();
    }
  }, [view, isLoggedIn]);

  const itemsTotal = useMemo(() => cart.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0), [cart]);
  const currentFee = (customer.orderType === OrderType.DELIVERY) ? (customer.deliveryFee || 0) : 0;
  const total = itemsTotal + currentFee;

  const filteredOrders = useMemo(() => orders.filter(o => o.status === adminTab), [orders, adminTab]);

  const salesStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 7);
    const completed = orders.filter(o => o.status === 'concluido');
    const daily = completed.filter(o => {
        const d = o.criadoEm?.toDate ? o.criadoEm.toDate() : null;
        return d && d >= todayStart;
    }).reduce((acc, o) => acc + (o.total || 0), 0);
    const weekly = completed.filter(o => {
        const d = o.criadoEm?.toDate ? o.criadoEm.toDate() : null;
        return d && d >= weekStart;
    }).reduce((acc, o) => acc + (o.total || 0), 0);
    const monthly = completed.filter(o => {
        const d = o.criadoEm?.toDate ? o.criadoEm.toDate() : null;
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((acc, o) => acc + (o.total || 0), 0);
    return { daily, weekly, monthly };
  }, [orders]);

  const handleFinishOrder = async () => {
    if (isSending) return;
    const clientName = customer.name.trim();
    if (!clientName || cart.length === 0) { alert("Informe seu nome e escolha itens."); return; }
    setIsSending(true);
    try {
      const groupedItemsText = CATEGORIES.map(cat => {
        const itemsInCat = cart.filter(i => i.categoryId === cat.id);
        if (itemsInCat.length === 0) return null;
        let section = `--- ${cat.name.toUpperCase()} ---\n`;
        section += itemsInCat.map(i => {
          let line = `${i.quantity}x ${i.name}`;
          if (i.flavor) line += ` (${i.flavor})`;
          if (i.categoryId === 'acai') {
            const isComplete = i.additions?.includes("AÇAÍ COMPLETO");
            if (isComplete) line += `\n  - COMPLETO`;
            const rawAdds = i.additions?.filter(a => a !== "AÇAÍ COMPLETO") || [];
            if (rawAdds.length > 0) {
              const comps = rawAdds.filter(a => ACAI_COMPLEMENTS.includes(a));
              const cobs = rawAdds.filter(a => ACAI_TOPPINGS.includes(a));
              const fruts = rawAdds.filter(a => ACAI_FRUITS.includes(a));
              const paids = rawAdds.filter(a => ACAI_PAID_EXTRAS.some(p => p.name === a));
              if (comps.length) line += `\n  COMPLEMENTOS:\n    • ${comps.join('\n    • ')}`;
              if (cobs.length) line += `\n  COBERTURAS:\n    • ${cobs.join('\n    • ')}`;
              if (fruts.length) line += `\n  FRUTAS:\n    • ${fruts.join('\n    • ')}`;
              if (paids.length) line += `\n  ADICIONAIS PAGOS:\n    • ${paids.join('\n    • ')}`;
            }
          } else {
            if (i.removedIngredients?.length) line += `\n  - RETIRAR: ${i.removedIngredients.join(', ')}`;
            if (i.additions?.length) line += `\n  - ADICIONAIS: ${i.additions.join(', ')}`;
          }
          if (i.observation) line += `\n  *Obs: ${i.observation}*`;
          return line;
        }).join('\n\n');
        return section;
      }).filter(Boolean).join('\n\n');
      let fullAddress = "";
      if (customer.orderType === OrderType.DELIVERY) {
          fullAddress = `${customer.address}, ${customer.addressNumber} - ${customer.neighborhood}${customer.reference ? ` (${customer.reference})` : ''}`;
      } else if (customer.orderType === OrderType.COUNTER) {
          fullAddress = "RETIRADA NA LANCHONETE";
      } else {
          fullAddress = "CONSUMO NO LOCAL (MESA)";
      }
      const pagamentoInfo = customer.paymentMethod === PaymentMethod.CASH && customer.needsChange 
        ? `${customer.paymentMethod} (TROCO PARA: R$ ${customer.changeAmount})` 
        : customer.paymentMethod;
      await addDoc(collection(db, 'pedidos'), {
        nomeCliente: clientName.toUpperCase(), 
        itens: groupedItemsText,
        total: Number(total.toFixed(2)),
        frete: Number(currentFee.toFixed(2)),
        bairro: customer.neighborhood || "N/A",
        status: "novo", 
        criadoEm: serverTimestamp(), 
        telefone: customer.phone || "N/A",
        tipo: customer.orderType, 
        pagamento: pagamentoInfo,
        endereco: fullAddress.toUpperCase()
      });
      setCart([]); setView('SUCCESS'); 
    } catch (err) { alert('Erro ao enviar: ' + err); setIsSending(false); }
  };

  const handleQuickSale = async (product: Product) => {
    try {
      await addDoc(collection(db, 'pedidos'), {
        nomeCliente: "VENDA BALCÃO",
        itens: `1x ${product.name}`,
        total: Number(product.price.toFixed(2)),
        frete: 0,
        bairro: "BALCÃO",
        status: "concluido",
        criadoEm: serverTimestamp(),
        telefone: "N/A",
        tipo: OrderType.COUNTER,
        pagamento: PaymentMethod.CASH,
        endereco: "VENDA LOCAL (BALCÃO)"
      });
    } catch (err) { alert("Erro ao realizar venda rápida: " + err); }
  };

  const handleNeighborhoodChange = (val: string) => {
      const feeObj = DELIVERY_FEES.find(f => f.neighborhood === val);
      const fee = feeObj ? feeObj.fee : 0;
      setCustomer(prev => ({ ...prev, neighborhood: val, deliveryFee: fee }));
      setShowOutroAlert(val === 'Outro');
  };

  const updateOrderStatus = async (orderId: string, newStatus: AdminTab) => {
    try { await updateDoc(doc(db, 'pedidos', orderId), { status: newStatus }); } catch (e) { console.error(e); }
  };

  const deleteOrderPermanently = async (orderId: string) => {
    if (window.confirm("Deseja EXCLUIR DEFINITIVAMENTE este pedido do banco de dados?")) {
        try { await deleteDoc(doc(db, 'pedidos', orderId)); } catch (e) { console.error("Erro ao deletar:", e); alert("Não foi possível excluir o pedido."); }
    }
  };

  const removeFromCart = (cartId: string) => { setCart(prev => prev.filter(i => i.cartId !== cartId)); };
  const printOrder = (order: any) => { setReceiptOrder(order); setReceiptStats(null); setTimeout(() => { window.print(); setReceiptOrder(null); }, 500); };
  const printSalesSummary = () => { setReceiptStats(salesStats); setReceiptOrder(null); setTimeout(() => { window.print(); setReceiptStats(null); }, 500); };

  if (view === 'SUCCESS') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-50 fixed inset-0 z-[500] no-print animate-fade-in">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm shadow-2xl border-green-100 border-2 bg-white flex flex-col items-center">
        <div className="text-7xl mb-6 drop-shadow-lg">🎉</div>
        <h2 className="text-2xl font-black text-red-800 mb-4 italic uppercase leading-tight">Pedido realizado com sucesso!</h2>
        <p className="text-sm font-bold text-zinc-600 mb-2 leading-relaxed">Em instantes, um de nossos atendentes irá confirmar seu pedido pelo WhatsApp.</p>
        <p className="text-xs font-bold text-zinc-400 mb-8 uppercase tracking-wide">Se preferir agilizar, é só clicar no botão Confirmar pelo WhatsApp 👇</p>
        <div className="flex flex-col gap-3 w-full">
            <a href="https://wa.me/5527992269550?text=Ol%C3%A1%20Sandra%0AAcabei%20de%20realizar%20um%20pedido%20pelo%20site%20e%20gostaria%20de%20confirmar." target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 uppercase italic text-sm border-b-4 border-[#075E54]">
                <span className="text-xl">💬</span> Confirmar pelo WhatsApp
            </a>
            <button onClick={() => setView('HOME')} className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 font-black py-4 px-6 rounded-2xl transition-all active:scale-95 uppercase italic text-xs tracking-widest">Aguardar confirmação</button>
        </div>
      </div>
    </div>
  );

  if (view === 'LOGIN') return (
    <div className="min-h-screen flex flex-col p-6 bg-zinc-50 no-print animate-fade-in">
        <button onClick={() => setView('HOME')} className="mb-6 self-start bg-white text-red-800 font-black text-[10px] px-6 py-2 rounded-full border border-red-100 shadow-sm uppercase tracking-widest active:scale-95 transition-all">← Voltar</button>
        <div className="flex-1 flex items-center justify-center">
            <div className="glass-card p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl bg-white border border-red-50">
                <h2 className="text-2xl font-black text-red-800 mb-6 text-center italic uppercase">Cozinha</h2>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const user = (formData.get('user') as string)?.toLowerCase();
                    const pass = formData.get('pass') as string;
                    if ((user === 'sandra' && pass === 'sandra123') || (user === 'admin' && pass === 'admin@1234')) {
                        setIsLoggedIn(true); setView('ADMIN');
                    } else alert("Acesso não autorizado.");
                }} className="space-y-4">
                    <Input label="Usuário" name="user" required />
                    <Input label="Senha" name="pass" type="password" required />
                    <Button type="submit" fullWidth className="py-4 rounded-xl">ACESSAR</Button>
                </form>
            </div>
        </div>
    </div>
  );

  if (view === 'ADMIN') return (
    <div className="min-h-screen bg-zinc-50 pb-40">
      <div className="p-6 max-w-7xl mx-auto no-print">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-xl border border-red-50 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => { setIsLoggedIn(false); setView('HOME'); }} className="bg-red-50 text-red-800 p-2 rounded-full hover:bg-red-100 transition-all">←</button>
            <h2 className="text-2xl font-black text-red-800 italic uppercase">Cozinha</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {(['novo', 'preparando', 'concluido', 'cancelado'] as AdminTab[]).map(tab => (
              <button key={tab} onClick={() => setAdminTab(tab)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${adminTab === tab ? 'bg-red-700 text-white shadow-lg' : 'bg-white text-zinc-400 border border-zinc-100'}`}>{tab === 'novo' ? 'Novos' : tab === 'preparando' ? 'Preparando' : tab === 'concluido' ? 'Concluídos' : 'Lixeira'}</button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => { setIsLoggedIn(false); setView('HOME'); }} className="px-5 py-2 rounded-xl text-[9px] font-black uppercase">SAIR</Button>
        </header>

        {/* VENDA RÁPIDA (BALCÃO + BEBIDAS) */}
        <div className="mb-10 bg-white p-6 rounded-[2rem] shadow-xl border border-red-50 animate-fade-in no-print">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-[10px] font-black text-red-800 uppercase italic tracking-widest flex items-center gap-2">
                    <span className="text-lg">⚡</span> VENDA RÁPIDA (INTERNA)
                </h3>
                <div className="flex bg-zinc-100 p-1 rounded-xl w-full md:w-auto">
                    <button onClick={() => setQuickSaleCat('balcao')} className={`flex-1 md:px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${quickSaleCat === 'balcao' ? 'bg-red-700 text-white shadow-md' : 'text-zinc-400'}`}>COMIDAS</button>
                    <button onClick={() => setQuickSaleCat('bebidas')} className={`flex-1 md:px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${quickSaleCat === 'bebidas' ? 'bg-red-700 text-white shadow-md' : 'text-zinc-400'}`}>BEBIDAS</button>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {PRODUCTS.filter(p => p.categoryId === quickSaleCat).map(prod => (
                    <button key={prod.id} onClick={() => handleQuickSale(prod)} className="bg-zinc-50 hover:bg-green-50 hover:border-green-200 border border-zinc-100 p-4 rounded-2xl transition-all active:scale-95 group shadow-sm flex flex-col items-center justify-center text-center gap-1 min-h-[80px]">
                        <span className="text-[9px] font-black text-red-900 uppercase italic leading-tight group-hover:text-green-700">{prod.name}</span>
                        <span className="text-xs font-black text-green-600">R$ {prod.price.toFixed(2)}</span>
                    </button>
                ))}
            </div>
        </div>

        {adminTab === 'concluido' && (
            <div className="mb-10 animate-fade-in no-print">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-black text-red-800 uppercase italic">Relatório de Vendas</h3>
                    <button onClick={printSalesSummary} className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all"><span>🖨️ IMPRIMIR RESUMO</span></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-[2rem] shadow-md border-b-4 border-green-500">
                        <p className="text-[10px] font-black text-zinc-400 uppercase italic">Vendas Hoje</p>
                        <p className="text-3xl font-black text-green-600 mt-1 italic">R$ {salesStats.daily.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-md border-b-4 border-blue-500">
                        <p className="text-[10px] font-black text-zinc-400 uppercase italic">Últimos 7 Dias</p>
                        <p className="text-3xl font-black text-blue-600 mt-1 italic">R$ {salesStats.weekly.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-md border-b-4 border-purple-500">
                        <p className="text-[10px] font-black text-zinc-400 uppercase italic">Vendas do Mês</p>
                        <p className="text-3xl font-black text-purple-600 mt-1 italic">R$ {salesStats.monthly.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        )}

        <div className="space-y-3 animate-fade-in">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-24 opacity-10"><p className="text-xl font-black italic uppercase">Vazio</p></div>
          ) : (
            filteredOrders.map(o => (
              <div key={o.id} className="bg-white p-5 rounded-[1.5rem] border-l-[8px] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-zinc-200">
                <div className="min-w-[200px]">
                  <p className="text-sm font-black text-red-950 leading-none italic uppercase">{o.nomeCliente}</p>
                  <p className="text-sm font-black text-green-600 mt-1 uppercase italic leading-tight">{o.telefone}</p>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-2 italic">{o.tipo} • {o.pagamento}</p>
                  {o.frete > 0 && <p className="text-[10px] font-black text-red-600 uppercase mt-1">Frete: R$ {o.frete.toFixed(2)}</p>}
                </div>
                <div className="flex-1 bg-zinc-50 p-4 rounded-xl text-[10px] font-bold text-zinc-700 border border-zinc-100 whitespace-pre-wrap">{o.itens}</div>
                <div className="flex items-center gap-3 flex-wrap">
                   <p className="text-xl font-black text-red-700 italic min-w-[100px]">R$ {Number(o.total || 0).toFixed(2)}</p>
                   <div className="flex gap-2">
                     <button onClick={() => printOrder(o)} className="w-10 h-10 bg-zinc-900 text-white rounded-[0.8rem] flex items-center justify-center text-lg shadow-md hover:scale-105 active:scale-95 transition-all">🖨️</button>
                     {o.status !== 'cancelado' && <button onClick={() => updateOrderStatus(o.id, 'cancelado')} className="w-10 h-10 bg-red-100 text-red-700 rounded-[0.8rem] flex items-center justify-center text-lg shadow-md hover:scale-105 active:scale-95 transition-all" title="Mover para Lixeira">🗑️</button>}
                     {o.status === 'novo' && (
                       <>
                         <button onClick={() => updateOrderStatus(o.id, 'preparando')} className="bg-orange-500 text-white px-4 h-10 rounded-xl text-[9px] font-black uppercase shadow-md transition-all">Em Preparação</button>
                         <button onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 text-white px-4 h-10 rounded-xl text-[9px] font-black uppercase shadow-md transition-all">Concluído</button>
                       </>
                     )}
                     {o.status === 'preparando' && <button onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 text-white px-4 h-10 rounded-xl text-[9px] font-black uppercase shadow-md transition-all">Concluído</button>}
                     {o.status === 'cancelado' && <button onClick={() => deleteOrderPermanently(o.id)} className="bg-red-700 text-white px-4 h-10 rounded-xl text-[9px] font-black uppercase shadow-md transition-all">Apagar da Lixeira</button>}
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="printable-area hidden"><Receipt order={receiptOrder} stats={receiptStats} /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {view === 'HOME' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 no-print animate-fade-in">
          <div className="glass-card p-10 md:p-16 rounded-[3rem] text-center shadow-2xl max-w-sm w-full border-red-50 bg-white relative overflow-hidden border-b-[6px] border-red-100">
            <div className="text-[64px] mb-6 animate-float leading-none drop-shadow-xl">🍔</div>
            <h1 className="text-4xl font-black text-red-800 mb-3 tracking-tighter italic leading-none">Cantinho da Sandra</h1>
            <p className="text-red-900/20 font-black uppercase tracking-[0.4em] text-[9px] mb-12 italic">A Melhor Mordida da Cidade</p>
            <Button fullWidth onClick={() => setView('ORDER')} className="text-xl py-5 shadow-xl flex items-center justify-center gap-4 group rounded-[2rem] border-b-4 border-red-800">FAZER PEDIDO <span className="text-3xl group-hover:translate-x-3 transition-transform">➡</span></Button>
            <button onClick={() => setView('LOGIN')} className="mt-16 text-zinc-200 text-[9px] font-black uppercase tracking-[0.3em] hover:text-red-400 italic transition-all hidden md:block w-full">Administração</button>
          </div>
        </div>
      )}
      {view === 'ORDER' && (
        <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-white border-x border-zinc-100 shadow-2xl no-print">
            {step === 'MENU' && (
                <>
                    <header className="p-5 bg-white/95 sticky top-0 z-50 border-b border-zinc-100 backdrop-blur-md">
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={() => setView('HOME')} className="text-red-800 font-black text-[9px] uppercase tracking-widest px-3 py-1 bg-red-50 rounded-full active:scale-95 transition-all">← Voltar</button>
                            <h2 className="font-black text-red-900 uppercase tracking-[0.15em] text-[10px] italic uppercase leading-none">Cardápio</h2>
                            <div className="w-10"></div>
                        </div>
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Pesquisar..." className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-3 px-10 text-[11px] font-bold text-red-900 outline-none shadow-inner" />
                    </header>
                    <div className="p-4 flex gap-3 overflow-x-auto no-scrollbar py-5 border-b border-zinc-50 bg-white">
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-shrink-0 px-5 py-3 rounded-full font-black text-[9px] uppercase transition-all ${activeCategory === cat.id ? 'bg-red-700 text-white shadow-lg scale-105' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}`}>{cat.icon} {cat.name}</button>
                        ))}
                    </div>
                    <div className="flex-1 p-5 space-y-4 pb-44 overflow-y-auto bg-zinc-50/10">
                        {PRODUCTS.filter(p => (searchTerm === '' ? p.categoryId === activeCategory : p.name.toLowerCase().includes(searchTerm.toLowerCase()))).map(prod => (
                            <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="bg-white border border-zinc-50 p-5 rounded-[2rem] flex justify-between items-center shadow-md active:scale-95 transition-all cursor-pointer hover:border-red-200">
                                <div className="flex-1 pr-4">
                                    <h3 className="text-lg font-black text-red-950 mb-0.5 italic uppercase leading-tight">{prod.name}</h3>
                                    {prod.unit && <p className="text-[10px] text-zinc-400 font-bold uppercase italic">{prod.unit}</p>}
                                    <p className="text-red-600 font-black text-base italic">R$ {prod.price.toFixed(2)}</p>
                                </div>
                                <div className="w-10 h-10 bg-red-700 text-white rounded-[1rem] flex items-center justify-center text-2xl font-black shadow-lg">+</div>
                            </div>
                        ))}
                    </div>
                    {cart.length > 0 && <div className="fixed bottom-8 left-6 right-6 z-50 animate-slide-up max-w-lg mx-auto"><Button fullWidth onClick={() => setStep('CART_REVIEW')} className="py-5 text-lg flex justify-between items-center px-8 shadow-2xl rounded-[2rem] border-b-4 border-red-900"><span className="font-black italic uppercase">Sacola ({cart.length})</span><span className="bg-white/20 px-5 py-1.5 rounded-xl text-base font-black">R$ {itemsTotal.toFixed(2)}</span></Button></div>}
                </>
            )}
            {step === 'CART_REVIEW' && (
                <div className="p-8 pb-44 flex flex-col min-h-screen bg-white">
                    <button onClick={() => setStep('MENU')} className="self-start mb-6 text-red-800 font-black text-[10px] uppercase bg-red-50 px-6 py-2 rounded-full border border-red-100 shadow-sm active:scale-95 transition-all">← Voltar</button>
                    <h2 className="text-3xl font-black text-red-800 mb-8 tracking-tighter italic uppercase">Revisar Sacola</h2>
                    {cart.length === 0 ? <div className="flex-1 flex flex-col items-center justify-center text-zinc-300"><span className="text-6xl mb-4">🛒</span><p className="font-black uppercase italic">Sua sacola está vazia</p><Button onClick={() => setStep('MENU')} variant="secondary" className="mt-4">Voltar ao Cardápio</Button></div> : (
                        <div className="space-y-4">
                            {cart.map(item => (
                                <div key={item.cartId} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 flex justify-between items-center animate-fade-in shadow-sm">
                                    <div className="flex-1 pr-4">
                                        <p className="font-black text-red-950 text-sm italic uppercase leading-tight">{item.quantity}x {item.name}</p>
                                        <div className="text-[9px] text-zinc-400 font-bold mt-1 uppercase leading-tight">
                                            {item.flavor && <span className="block text-red-600 italic">✓ {item.flavor}</span>}
                                            {item.removedIngredients?.map(i => <span key={i} className="block text-red-400">× SEM {i}</span>)}
                                            {item.additions?.map(i => <span key={i} className="block text-green-600">✓ COM {i}</span>)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3"><p className="font-black text-red-800 text-sm italic">R$ {(item.price * item.quantity).toFixed(2)}</p><button onClick={() => removeFromCart(item.cartId)} className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center text-lg active:scale-90 transition-all">🗑️</button></div>
                                </div>
                            ))}
                            <div className="pt-6"><div className="flex justify-between items-center mb-6"><span className="text-xl font-black text-zinc-300 italic uppercase">Subtotal</span><span className="text-3xl font-black text-red-700 italic">R$ {itemsTotal.toFixed(2)}</span></div><Button fullWidth onClick={() => setStep('TYPE_SELECTION')} className="py-5 text-xl rounded-[2rem] shadow-xl border-b-4 border-red-950 flex items-center justify-center gap-2">REVISADO! ✅</Button></div>
                        </div>
                    )}
                </div>
            )}
            {step === 'TYPE_SELECTION' && (
                <div className="p-8 flex flex-col min-h-screen bg-white">
                    <button onClick={() => setStep('CART_REVIEW')} className="self-start mb-10 text-red-800 font-black text-[10px] uppercase bg-red-50 px-6 py-2 rounded-full border border-red-100 shadow-sm active:scale-95 transition-all">← Voltar</button>
                    <div className="flex-1 flex flex-col items-center justify-center space-y-10">
                        <h2 className="text-4xl font-black text-red-900 tracking-tighter italic text-center uppercase leading-none">Como deseja receber?</h2>
                        <div className="grid grid-cols-1 w-full gap-5 max-w-sm">
                            <button onClick={() => { setCustomer({...customer, orderType: OrderType.DELIVERY}); setStep('FORM'); }} className="bg-zinc-50 border p-8 rounded-[2.5rem] shadow-lg group active:scale-95 transition-all hover:border-red-600"><span className="text-6xl block mb-4">🛵</span><span className="font-black text-red-950 text-xl uppercase italic">Entrega</span></button>
                            <button onClick={() => { setCustomer({...customer, orderType: OrderType.COUNTER}); setStep('FORM'); }} className="bg-zinc-50 border p-8 rounded-[2.5rem] shadow-lg group active:scale-95 transition-all hover:border-red-600"><span className="text-6xl block mb-4">🥡</span><span className="font-black text-red-950 text-xl uppercase italic">Retirada na lanchonete</span></button>
                            <button onClick={() => { setCustomer({...customer, orderType: OrderType.TABLE}); setStep('FORM'); }} className="bg-zinc-50 border p-8 rounded-[2.5rem] shadow-lg group active:scale-95 transition-all hover:border-red-600"><span className="text-6xl block mb-4">🍽️</span><span className="font-black text-red-950 text-xl uppercase italic">Consumir na Mesa</span></button>
                        </div>
                    </div>
                </div>
            )}
            {step === 'FORM' && (
                <div className="p-8 pb-44 flex flex-col min-h-screen bg-white">
                    <button onClick={() => setStep('TYPE_SELECTION')} className="self-start mb-6 text-red-800 font-black text-[10px] uppercase bg-red-50 px-6 py-2 rounded-full border border-red-100 shadow-sm active:scale-95 transition-all">← Voltar</button>
                    <h2 className="text-3xl font-black text-red-800 mb-8 tracking-tighter italic uppercase">Seus Dados</h2>
                    <form onSubmit={(e) => { e.preventDefault(); setStep('SUMMARY'); }} className="space-y-4">
                        <Input label="Nome" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Seu nome..." required />
                        {customer.orderType !== OrderType.TABLE && <Input label="WhatsApp" type="tel" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="(00) 00000-0000" required />}
                        {customer.orderType === OrderType.DELIVERY && (
                            <>
                                <Select label="Bairro" value={customer.neighborhood} onChange={e => handleNeighborhoodChange(e.target.value)} options={[{ value: '', label: 'Selecione seu bairro' }, ...DELIVERY_FEES.map(f => ({ value: f.neighborhood, label: `${f.neighborhood} - R$ ${f.fee.toFixed(2)}` }))]} required />
                                {showOutroAlert && <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-[10px] font-bold text-red-800 italic uppercase animate-fade-in shadow-inner">⚠️ ATENÇÃO: Os preços da entrega poderão ser alterados dependendo do bairro e uma atendente irá informar via WhatsApp.</div>}
                                <Input label="Rua" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="Ex: Rua das Flores..." required />
                                <Input label="Número" value={customer.addressNumber} onChange={e => setCustomer({...customer, addressNumber: e.target.value})} placeholder="Ex: 123..." required />
                                <Input label="Referência" value={customer.reference} onChange={e => setCustomer({...customer, reference: e.target.value})} placeholder="Ex: Próximo ao mercado..." />
                            </>
                        )}
                        <Select label="Pagamento" options={PAYMENT_METHODS} value={customer.paymentMethod} onChange={e => setCustomer({...customer, paymentMethod: e.target.value as PaymentMethod})} />
                        {customer.paymentMethod === PaymentMethod.CASH && (
                            <div className="bg-zinc-50 border border-zinc-100 p-5 rounded-2xl animate-fade-in space-y-4 shadow-sm">
                                <label className="block text-red-700 text-sm font-black mb-2 uppercase italic tracking-wider">Precisa de troco?</label>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setCustomer({...customer, needsChange: true})} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase border-2 transition-all ${customer.needsChange ? 'bg-red-700 border-red-700 text-white shadow-md' : 'bg-white border-zinc-200 text-zinc-400'}`}>Sim</button>
                                    <button type="button" onClick={() => setCustomer({...customer, needsChange: false, changeAmount: ''})} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase border-2 transition-all ${!customer.needsChange ? 'bg-zinc-800 border-zinc-800 text-white shadow-md' : 'bg-white border-zinc-200 text-zinc-400'}`}>Não</button>
                                </div>
                                {customer.needsChange && <div className="pt-2 animate-fade-in"><Input label="Troco para quanto?" value={customer.changeAmount} onChange={e => setCustomer({...customer, changeAmount: e.target.value})} placeholder="Ex: R$ 50,00" required /></div>}
                            </div>
                        )}
                        <Button type="submit" fullWidth className="py-5 text-lg mt-10 rounded-[1.5rem] uppercase italic border-b-4 border-red-900 shadow-xl">Revisar Pedido</Button>
                    </form>
                </div>
            )}
            {step === 'SUMMARY' && (
                <div className="p-8 pb-44 flex flex-col min-h-screen bg-white">
                    <button onClick={() => setStep('FORM')} className="self-start mb-6 text-red-800 font-black text-[10px] uppercase bg-red-50 px-6 py-2 rounded-full border border-red-100 shadow-sm active:scale-95 transition-all">← Voltar</button>
                    <h2 className="text-3xl font-black text-red-800 mb-6 tracking-tighter italic uppercase">Confirmação</h2>
                    <div className="bg-zinc-50 p-6 rounded-[2rem] mb-8 space-y-6 shadow-xl border border-white relative overflow-hidden">
                        <div className="border-b border-zinc-200 pb-5">
                            <p className="text-2xl font-black text-red-950 italic uppercase">{customer.name}</p>
                            {customer.orderType !== OrderType.TABLE && <p className="text-sm font-black text-green-600 uppercase italic mt-1">{customer.phone}</p>}
                            <p className="text-[10px] text-zinc-400 font-bold uppercase mt-2">{customer.orderType}</p>
                            {customer.orderType === OrderType.DELIVERY && <p className="text-[10px] text-zinc-500 font-medium italic mt-1 uppercase leading-tight">{customer.address}, {customer.addressNumber} - {customer.neighborhood} {customer.reference && `(${customer.reference})`}</p>}
                        </div>
                        <div className="space-y-4">
                            {cart.map(item => (
                                <div key={item.cartId} className="flex justify-between items-start">
                                    <div className="flex-1 pr-6">
                                        <p className="font-black text-red-950 text-lg leading-none italic uppercase">{item.quantity}x {item.name}</p>
                                        <div className="text-[8px] text-zinc-400 font-bold mt-2 uppercase leading-relaxed">
                                            {item.flavor && <span className="block text-red-600 italic font-black">✓ {item.flavor}</span>}
                                            {item.removedIngredients?.map(i => <span key={i} className="block text-red-400">× SEM {i}</span>)}
                                            {item.additions?.map(i => <span key={i} className="block text-green-600">✓ COM {i}</span>)}
                                            {item.observation && <span className="block text-zinc-500 italic">OBS: {item.observation}</span>}
                                        </div>
                                    </div>
                                    <p className="font-black text-red-800 text-lg italic">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-zinc-200 pt-5 space-y-2">
                            <div className="flex justify-between items-center"><span className="text-xs font-black text-zinc-400 italic uppercase">Subtotal</span><span className="text-xs font-black text-zinc-500">R$ {itemsTotal.toFixed(2)}</span></div>
                            {customer.orderType === OrderType.DELIVERY && <div className="flex justify-between items-center"><span className="text-xs font-black text-red-400 italic uppercase">Entrega ({customer.neighborhood})</span><span className="text-xs font-black text-red-600">R$ {currentFee.toFixed(2)}</span></div>}
                            <div className="flex justify-between items-center pt-2"><span className="text-lg font-black text-zinc-300 italic uppercase">Total</span><span className="text-3xl font-black text-red-700 italic">R$ {total.toFixed(2)}</span></div>
                            <div className="mt-4 pt-4 border-t border-dashed border-zinc-200">
                                <p className="text-[10px] font-black text-zinc-400 uppercase italic">Forma de Pagamento</p>
                                <p className="text-sm font-black text-red-800 uppercase italic">{customer.paymentMethod}{customer.paymentMethod === PaymentMethod.CASH && customer.needsChange && <span className="block text-xs text-red-600 font-bold mt-1">✓ TROCO PARA: R$ {customer.changeAmount}</span>}</p>
                            </div>
                        </div>
                    </div>
                    <Button onClick={handleFinishOrder} disabled={isSending} fullWidth className={`py-5 text-2xl shadow-2xl rounded-[2.5rem] border-b-[8px] border-b-red-950 ${isSending ? 'opacity-60 scale-95' : 'animate-pulse-slow active:scale-90 transition-all'}`}>{isSending ? 'ENVIANDO...' : 'FINALIZAR! ✅'}</Button>
                </div>
            )}
        </div>
      )}
      <ProductModal isOpen={!!selectedProduct} product={selectedProduct} onClose={() => setSelectedProduct(null)} onConfirm={(item: CartItem) => { setCart([...cart, item]); setSelectedProduct(null); }} />
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 3s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @media print {
            body { background: white !important; padding: 0 !important; margin: 0 !important; }
            .no-print { display: none !important; }
            .printable-area { display: block !important; visibility: visible !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
            #root > div:not(.printable-area) { display: none !important; }
            .printable-content { font-weight: bold !important; font-size: 14px !important; }
        }
      `}</style>
    </div>
  );
}
