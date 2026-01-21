
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
    EXTRAS_OPTIONS, ACAI_PAID_EXTRAS
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
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [additions, setAdditions] = useState<string[]>([]);
  const [observation, setObservation] = useState('');

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1); setRemovedIngredients([]); setAdditions([]); setObservation('');
    }
  }, [isOpen, product]);

  if (!product) return null;

  const handleConfirm = () => {
    let extraPrice = 0;
    additions.forEach(add => {
        const extra = [...EXTRAS_OPTIONS, ...ACAI_PAID_EXTRAS].find(e => e.name === add);
        if (extra) extraPrice += extra.price;
    });
    
    onConfirm({
      ...product, cartId: Date.now().toString(), quantity,
      removedIngredients, additions, observation,
      price: Number(product.price) + Number(extraPrice)
    });
  };

  const toggleIngredient = (ing: string) => setRemovedIngredients(prev => prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]);
  const toggleAddition = (add: string) => setAdditions(prev => prev.includes(add) ? prev.filter(a => a !== add) : [...prev, add]);

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-fade-in">
        <div className="p-6 border-b border-red-50 flex justify-between items-center bg-red-50/30">
          <div>
            <h3 className="text-xl font-black text-red-800 leading-none italic">{product.name}</h3>
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

          {product.ingredients && product.ingredients.length > 0 && (
            <section>
              <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Retirar algo?</label>
              <div className="grid grid-cols-2 gap-2">
                {product.ingredients.map((ing: string) => (
                  <button key={ing} onClick={() => toggleIngredient(ing)} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${removedIngredients.includes(ing) ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white border-zinc-100 text-zinc-300'}`}>SEM {ing}</button>
                ))}
              </div>
            </section>
          )}

          <section>
            <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Adicionais?</label>
            <div className="grid grid-cols-2 gap-2">
              {[...EXTRAS_OPTIONS].map((opt) => (
                <button key={opt.name} onClick={() => toggleAddition(opt.name)} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${additions.includes(opt.name) ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white border-zinc-100 text-zinc-300'}`}>+ {opt.name}</button>
              ))}
            </div>
          </section>

          <section>
            <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Observação do Item</label>
            <textarea className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] p-4 text-zinc-800 focus:outline-none focus:border-red-500 min-h-[100px] text-sm font-medium" placeholder="Ex: Carne bem passada, sem gergelim..." value={observation} onChange={e => setObservation(e.target.value)} />
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
        const extras = [];
        if (item.removedIngredients?.length) extras.push(`SEM: ${item.removedIngredients.join(', ')}`);
        if (item.additions?.length) extras.push(`COM: ${item.additions.join(', ')}`);
        if (item.observation?.trim()) extras.push(`OBS: ${item.observation.trim()}`);
        return extras.length > 0 ? `${desc} (${extras.join(' | ')})` : desc;
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-50 fixed inset-0 z-[500] animate-fade-in">
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="glass-card p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl bg-white border border-red-50">
            <h2 className="text-2xl font-black text-red-800 mb-6 text-center italic leading-none uppercase">Cozinha</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                if (formData.get('user') === 'sandra' && formData.get('pass') === '1234') {
                    setIsLoggedIn(true); setView('ADMIN');
                } else alert("Acesso não autorizado.");
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
    <div className="min-h-screen p-6 bg-zinc-50 pb-40 animate-fade-in">
      <header className="flex justify-between items-center mb-8 max-w-7xl mx-auto bg-white p-6 rounded-[2rem] shadow-xl border border-red-50">
        <div>
            <h2 className="text-2xl font-black text-red-800 italic leading-none">Cozinha</h2>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Monitoramento de Pedidos</p>
        </div>
        <Button variant="secondary" onClick={() => { setIsLoggedIn(false); setView('HOME'); }} className="px-5 py-2 rounded-xl text-[9px] font-black uppercase">SAIR</Button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {orders.length === 0 ? (
          <div className="col-span-full text-center py-24 opacity-10">
            <span className="text-[80px] block">🍔</span>
            <p className="text-xl font-black italic mt-6">Sem pedidos novos...</p>
          </div>
        ) : (
          orders.map(o => (
            <div key={o.id} className={`glass-card p-8 rounded-[2.5rem] border-l-[10px] shadow-2xl transition-all relative overflow-hidden bg-white ${o.status === 'novo' ? 'border-red-600 scale-[1.01]' : 'border-zinc-100 opacity-60'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xl font-black text-red-950 leading-none italic">{o.nomeCliente}</p>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-3 italic">{o.tipo} • {o.pagamento}</p>
                </div>
                {o.status === 'novo' && <span className="bg-red-600 text-white text-[8px] font-black px-4 py-1.5 rounded-full uppercase italic shadow-md animate-pulse">Novo</span>}
              </div>
              <div className="bg-zinc-50 rounded-[1.2rem] p-5 mb-6 text-[10px] font-bold whitespace-pre-wrap max-h-[160px] overflow-y-auto leading-relaxed text-zinc-700 border border-zinc-100">
                {o.itens}
              </div>
              <div className="flex justify-between items-center mb-6">
                 <p className="text-2xl font-black text-red-700 italic">R$ {Number(o.total || 0).toFixed(2)}</p>
                 <button onClick={() => printOrder(o)} className="w-10 h-10 bg-zinc-900 text-white rounded-[0.8rem] flex items-center justify-center text-xl hover:scale-110 active:scale-90 transition-transform shadow-xl">🖨️</button>
              </div>
              {o.status === 'novo' ? (
                <Button fullWidth onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 border-green-500 py-3 rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-green-700">Concluir Pedido</Button>
              ) : (
                <Button fullWidth variant="secondary" onClick={() => updateOrderStatus(o.id, 'novo')} className="py-3 rounded-xl text-[8px] font-black uppercase">Reabrir Pedido</Button>
              )}
            </div>
          ))
        )}
      </div>
      <div className="printable-area hidden"><Receipt order={receiptOrder} /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {view === 'HOME' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in bg-zinc-50">
          <div className="glass-card p-10 md:p-16 rounded-[3rem] text-center shadow-2xl max-w-sm w-full border-red-50 bg-white relative overflow-hidden border-b-[6px] border-red-100">
            <div className="text-[64px] mb-6 animate-float leading-none drop-shadow-xl">🍔</div>
            <h1 className="text-4xl font-black text-red-800 mb-3 tracking-tighter italic leading-none">Cantinho da Sandra</h1>
            <p className="text-red-900/20 font-black uppercase tracking-[0.4em] text-[9px] mb-12 italic">A Melhor Mordida da Cidade</p>
            <Button fullWidth onClick={() => setView('ORDER')} className="text-xl py-5 shadow-xl shadow-red-100 flex items-center justify-center gap-4 group rounded-[2rem] border-b-4 border-red-800 hover:translate-y-[-2px]">
              FAZER PEDIDO <span className="text-3xl group-hover:translate-x-3 transition-transform">➡</span>
            </Button>
            <button onClick={() => setView('LOGIN')} className="mt-16 text-zinc-200 text-[9px] font-black uppercase tracking-[0.3em] hover:text-red-400 italic transition-all">Administração</button>
          </div>
        </div>
      )}

      {view === 'ORDER' && (
        <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-white border-x border-zinc-100 shadow-2xl">
            {step === 'MENU' && (
                <>
                    <header className="p-5 bg-white/95 sticky top-0 z-50 flex justify-between items-center border-b border-zinc-100 backdrop-blur-md">
                        <button onClick={() => setView('HOME')} className="text-red-800 font-black text-[9px] uppercase tracking-widest px-3 py-1 bg-red-50 rounded-full hover:bg-red-100 transition-all">← Sair</button>
                        <h2 className="font-black text-red-900 uppercase tracking-[0.15em] text-[10px] italic">Cardápio</h2>
                        <div className="w-10"></div>
                    </header>
                    <div className="p-4 flex gap-3 overflow-x-auto no-scrollbar py-5 border-b border-zinc-50 bg-white">
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-shrink-0 px-5 py-3 rounded-full font-black text-[9px] uppercase transition-all shadow-sm ${activeCategory === cat.id ? 'bg-red-700 text-white shadow-xl scale-105' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}`}>
                                <span className="mr-1">{cat.icon}</span> {cat.name}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-5 space-y-4 pb-44 overflow-y-auto bg-zinc-50/10">
                        {PRODUCTS.filter(p => p.categoryId === activeCategory).map(prod => (
                            <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="bg-white border border-zinc-50 p-5 rounded-[2rem] flex justify-between items-center shadow-md shadow-zinc-200/30 active:scale-95 transition-all hover:border-red-200 cursor-pointer group">
                                <div className="flex-1 pr-4">
                                    <h3 className="text-lg font-black text-red-950 mb-0.5 leading-none italic group-hover:text-red-700 transition-all">{prod.name}</h3>
                                    <p className="text-red-600 font-black text-base italic">R$ {prod.price.toFixed(2)}</p>
                                </div>
                                <div className="w-10 h-10 bg-red-700 text-white rounded-[1rem] flex items-center justify-center text-2xl font-black shadow-lg group-hover:rotate-6 transition-all">+</div>
                            </div>
                        ))}
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
      `}</style>
    </div>
  );
}
