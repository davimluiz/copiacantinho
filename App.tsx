
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
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Importa a instância centralizada do banco de dados
import { db } from './firebase';

import { Button } from './components/Button';
import { Input, Select } from './components/Input';
import { 
    CATEGORIES, PRODUCTS, PAYMENT_METHODS, 
    EXTRAS_OPTIONS, ACAI_PAID_EXTRAS
} from './constants';
import { Product, CustomerInfo, CartItem, PaymentMethod, OrderStatus, OrderType } from './types';

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
      <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-fade-in">
        <div className="p-7 border-b border-red-50 flex justify-between items-center bg-red-50/30">
          <div>
            <h3 className="text-2xl font-black text-red-800 leading-none italic">{product.name}</h3>
            <p className="text-red-600 font-black mt-2">R$ {product.price.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="text-zinc-300 hover:text-red-600 text-5xl leading-none transition-colors">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-7 space-y-8">
          <section>
            <label className="block text-red-900/40 text-[10px] font-black uppercase mb-4 tracking-[0.3em]">Quantidade</label>
            <div className="flex items-center gap-8">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-16 h-16 rounded-[1.5rem] bg-zinc-50 text-red-600 font-black text-3xl hover:bg-zinc-100 transition-all">-</button>
              <span className="text-5xl font-black text-red-900 italic">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-16 h-16 rounded-[1.5rem] bg-zinc-50 text-red-600 font-black text-3xl hover:bg-zinc-100 transition-all">+</button>
            </div>
          </section>

          {product.ingredients && (
            <section>
              <label className="block text-red-900/40 text-[10px] font-black uppercase mb-4 tracking-[0.3em]">Retirar algo?</label>
              <div className="grid grid-cols-2 gap-3">
                {product.ingredients.map((ing: string) => (
                  <button key={ing} onClick={() => toggleIngredient(ing)} className={`p-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${removedIngredients.includes(ing) ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-white border-zinc-100 text-zinc-300'}`}>SEM {ing}</button>
                ))}
              </div>
            </section>
          )}

          <section>
            <label className="block text-red-900/40 text-[10px] font-black uppercase mb-4 tracking-[0.3em]">Observação do Item</label>
            <textarea className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] p-6 text-zinc-800 focus:outline-none focus:border-red-500 min-h-[120px] text-sm font-medium" placeholder="Ex: Carne bem passada, pão sem gergelim..." value={observation} onChange={e => setObservation(e.target.value)} />
          </section>
        </div>
        <div className="p-7 bg-zinc-50/80 border-t border-zinc-100">
          <Button fullWidth onClick={handleConfirm} className="py-5 text-lg rounded-[2rem]">ADICIONAR AO CARRINHO</Button>
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
    if (view === 'ADMIN' && isLoggedIn && db) {
      console.log("[Admin] Iniciando escuta em tempo real da coleção 'pedidos'");
      const q = query(collection(db, 'pedidos'), orderBy('criadoEm', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedOrders = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setOrders(loadedOrders);
      }, (error) => {
        console.error("Erro no Listener Firestore:", error);
      });
      return () => unsubscribe();
    }
  }, [view, isLoggedIn]);

  const total = cart.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

  // --- FUNÇÃO FINALIZAR PEDIDO ---
  const handleFinishOrder = async () => {
    if (isSending) return;
    
    if (!db) {
      alert("Erro Crítico: O banco de dados (Firestore) não foi inicializado. Verifique se as variáveis de ambiente NEXT_PUBLIC_* estão configuradas no painel da Vercel.");
      return;
    }

    const clientName = String(customer.name || "").trim();
    if (!clientName || cart.length === 0) {
      alert("Informe seu nome e adicione itens ao carrinho.");
      return;
    }

    setIsSending(true);

    const finalTotal = isNaN(total) ? 0 : Number(Number(total).toFixed(2));
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
      itens: String(itensString || "Lanche"),
      total: finalTotal,
      status: "novo",
      criadoEm: serverTimestamp(),
      telefone: String(customer.phone || "N/A"),
      tipo: String(customer.orderType || "BALCÃO"),
      pagamento: String(customer.paymentMethod || "PIX"),
      endereco: customer.orderType === OrderType.DELIVERY 
          ? `${String(customer.address || "")}, ${String(customer.addressNumber || "")}` 
          : "Retirada no Balcão"
    };

    try {
      console.log('Tentando gravar pedido na coleção "pedidos"...');
      await addDoc(collection(db, 'pedidos'), payload);
      console.log('Sucesso! Pedido gravado.');
      setCart([]);
      setView('SUCCESS');
      setTimeout(() => window.location.reload(), 4500);
    } catch (err: any) {
      console.error("ERRO FIREBASE COMPLETO:", err);
      alert('ERRO DO FIREBASE: ' + err.message);
      setIsSending(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'pedidos', orderId), { status: newStatus });
    } catch (e) { console.error("Erro status:", e); }
  };

  const printOrder = (order: any) => {
    setReceiptOrder(order);
    setTimeout(() => {
        window.print();
        setReceiptOrder(null);
    }, 500);
  };

  // --- RENDERS ---
  if (view === 'SUCCESS') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-50 fixed inset-0 z-[500] animate-fade-in">
      <div className="glass-card p-14 md:p-24 rounded-[6rem] max-w-md shadow-2xl border-green-200 border-4 bg-white">
        <div className="text-[140px] mb-12 animate-bounce leading-none">✅</div>
        <h2 className="text-5xl font-black text-green-600 mb-8 tracking-tighter italic uppercase">Enviado!</h2>
        <div className="bg-green-50 border-2 border-green-100 p-10 rounded-[3rem]">
            <p className="text-green-900 font-black text-[12px] uppercase tracking-widest leading-loose">
                O seu pedido já está na tela da Sandra!<br/>
                Obrigado pela preferência.
            </p>
        </div>
      </div>
    </div>
  );

  if (view === 'LOGIN') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="glass-card p-12 rounded-[4rem] w-full max-w-sm shadow-2xl bg-white border border-red-50">
            <h2 className="text-4xl font-black text-red-800 mb-12 text-center italic leading-none">Admin</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                if (formData.get('user') === 'sandra' && formData.get('pass') === '1234') {
                    setIsLoggedIn(true); setView('ADMIN');
                } else alert("Acesso Negado.");
            }} className="space-y-6">
                <Input label="Usuário" name="user" required />
                <Input label="Senha" name="pass" type="password" required />
                <Button type="submit" fullWidth className="py-6 rounded-[2rem]">ENTRAR NO PAINEL</Button>
                <button type="button" onClick={() => setView('HOME')} className="w-full text-zinc-300 font-black text-[10px] mt-6 uppercase tracking-widest hover:text-red-700 transition-colors">← Voltar</button>
            </form>
        </div>
    </div>
  );

  if (view === 'ADMIN') return (
    <div className="min-h-screen p-6 md:p-12 bg-zinc-50 pb-40 animate-fade-in">
      <header className="flex justify-between items-center mb-16 max-w-7xl mx-auto bg-white p-10 rounded-[4rem] shadow-xl border border-red-50">
        <div>
            <h2 className="text-5xl font-black text-red-800 italic leading-none">Cozinha</h2>
        </div>
        <Button variant="secondary" onClick={() => { setIsLoggedIn(false); setView('HOME'); }} className="px-10 py-4 rounded-3xl text-xs font-black uppercase shadow-md">SAIR</Button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
        {orders.length === 0 ? (
          <div className="col-span-full text-center py-32 opacity-10">
            <span className="text-[200px] block">🍔</span>
            <p className="text-3xl font-black italic mt-10">Aguardando novos pedidos...</p>
          </div>
        ) : (
          orders.map(o => (
            <div key={o.id} className={`glass-card p-10 rounded-[4.5rem] border-l-[18px] shadow-2xl transition-all relative overflow-hidden bg-white ${o.status === 'novo' ? 'border-red-600' : 'border-zinc-100 opacity-60'}`}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-4xl font-black text-red-950 leading-none italic">{o.nomeCliente}</p>
                  <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-4 italic">{o.tipo} • {o.pagamento}</p>
                </div>
                {o.status === 'novo' && <span className="bg-red-600 text-white text-[10px] font-black px-6 py-2.5 rounded-full uppercase italic shadow-lg">Novo</span>}
              </div>
              <div className="bg-zinc-50 rounded-[2.5rem] p-8 mb-8 text-[12px] font-bold whitespace-pre-wrap max-h-[220px] overflow-y-auto leading-relaxed text-zinc-700 border border-zinc-100">
                {o.itens}
              </div>
              <div className="flex justify-between items-center mb-10">
                 <p className="text-5xl font-black text-red-700 italic">R$ {Number(o.total || 0).toFixed(2)}</p>
                 <button onClick={() => printOrder(o)} className="w-16 h-16 bg-zinc-900 text-white rounded-[1.5rem] flex items-center justify-center text-4xl hover:scale-110 active:scale-90 transition-transform shadow-2xl">🖨️</button>
              </div>
              {o.status === 'novo' && (
                <Button fullWidth onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 border-green-500 py-6 rounded-[2.2rem] text-sm font-black uppercase shadow-xl hover:bg-green-700">Concluir Pedido</Button>
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
          <div className="glass-card p-16 md:p-28 rounded-[6rem] text-center shadow-2xl max-w-md w-full border-red-50 bg-white relative overflow-hidden border-b-[12px] border-red-100">
            <div className="text-[140px] mb-12 animate-float leading-none drop-shadow-2xl">🍔</div>
            <h1 className="text-7xl font-black text-red-800 mb-6 tracking-tighter italic leading-none">Sandra Lanches</h1>
            <p className="text-red-900/20 font-black uppercase tracking-[0.6em] text-[12px] mb-20 italic">Sabor real em cada detalhe</p>
            <Button fullWidth onClick={() => setView('ORDER')} className="text-3xl py-9 shadow-2xl shadow-red-100 flex items-center justify-center gap-6 group rounded-[3.5rem] border-b-8 border-red-800 hover:translate-y-[-4px]">
              FAZER MEU PEDIDO <span className="text-5xl group-hover:translate-x-4 transition-transform">➡</span>
            </Button>
            <button onClick={() => setView('LOGIN')} className="mt-24 text-zinc-200 text-[11px] font-black uppercase tracking-[0.4em] hover:text-red-400 italic transition-all">Portal Administrativo</button>
          </div>
        </div>
      )}

      {view === 'ORDER' && (
        <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-white border-x border-zinc-100 shadow-2xl">
            {step === 'MENU' && (
                <>
                    <header className="p-8 bg-white/95 sticky top-0 z-50 flex justify-between items-center border-b border-zinc-100 backdrop-blur-md">
                        <button onClick={() => setView('HOME')} className="text-red-800 font-black text-[11px] uppercase tracking-widest px-4 py-1.5 bg-red-50 rounded-full hover:bg-red-100 transition-all">← Início</button>
                        <h2 className="font-black text-red-900 uppercase tracking-[0.2em] text-[11px] italic">Cardápio</h2>
                        <div className="w-12"></div>
                    </header>
                    <div className="p-6 flex gap-4 overflow-x-auto no-scrollbar py-8 border-b border-zinc-50">
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-shrink-0 px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase transition-all shadow-sm ${activeCategory === cat.id ? 'bg-red-700 text-white shadow-2xl scale-105' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}`}>
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-8 space-y-6 pb-52 overflow-y-auto bg-zinc-50/10">
                        {PRODUCTS.filter(p => p.categoryId === activeCategory).map(prod => (
                            <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="bg-white border-2 border-zinc-50 p-8 rounded-[3.5rem] flex justify-between items-center shadow-xl shadow-zinc-200/50 active:scale-95 transition-all hover:border-red-200 cursor-pointer group">
                                <div className="flex-1 pr-6">
                                    <h3 className="text-3xl font-black text-red-950 mb-3 leading-none italic group-hover:text-red-700 transition-all">{prod.name}</h3>
                                    <p className="text-red-600 font-black text-2xl italic drop-shadow-sm">R$ {prod.price.toFixed(2)}</p>
                                </div>
                                <div className="w-18 h-18 bg-red-700 text-white rounded-[1.8rem] flex items-center justify-center text-5xl font-black shadow-2xl group-hover:rotate-6 transition-all">+</div>
                            </div>
                        ))}
                    </div>
                    {cart.length > 0 && (
                        <div className="fixed bottom-14 left-8 right-8 z-50 animate-slide-up max-w-lg mx-auto">
                            <Button fullWidth onClick={() => setStep('TYPE_SELECTION')} className="py-8 text-3xl flex justify-between items-center px-14 shadow-2xl rounded-[3.5rem] border-b-8 border-red-900">
                                <span className="font-black italic uppercase tracking-tighter">Ver Sacola</span>
                                <span className="bg-white/20 px-8 py-2.5 rounded-3xl text-2xl font-black italic">R$ {total.toFixed(2)}</span>
                            </Button>
                        </div>
                    )}
                </>
            )}

            {(step === 'TYPE_SELECTION' || step === 'FORM' || step === 'SUMMARY') && (
                <div className="flex-1 overflow-y-auto bg-white">
                    {step === 'TYPE_SELECTION' && (
                        <div className="p-10 flex flex-col items-center justify-center min-h-[90vh] animate-fade-in space-y-20">
                            <h2 className="text-7xl font-black text-red-900 tracking-tighter italic leading-none text-center">Onde você<br/>está?</h2>
                            <div className="grid grid-cols-1 w-full gap-10 max-w-sm">
                                <button onClick={() => { setCustomer({...customer, orderType: OrderType.DELIVERY}); setStep('FORM'); }} className="bg-zinc-50 border-2 border-zinc-100 hover:border-red-600 p-16 rounded-[5rem] text-center shadow-2xl transition-all group active:scale-95 border-b-[12px] border-zinc-200">
                                    <span className="text-[120px] block mb-10 group-hover:scale-110 transition-all leading-none">🛵</span>
                                    <span className="font-black text-red-950 text-4xl uppercase italic">Entrega</span>
                                </button>
                                <button onClick={() => { setCustomer({...customer, orderType: OrderType.COUNTER}); setStep('FORM'); }} className="bg-zinc-50 border-2 border-zinc-100 hover:border-red-600 p-16 rounded-[5rem] text-center shadow-2xl transition-all group active:scale-95 border-b-[12px] border-zinc-200">
                                    <span className="text-[120px] block mb-10 group-hover:scale-110 transition-all leading-none">🥡</span>
                                    <span className="font-black text-red-950 text-4xl uppercase italic">Balcão</span>
                                </button>
                            </div>
                            <button onClick={() => setStep('MENU')} className="text-zinc-300 font-black uppercase text-[12px] tracking-[0.3em] hover:text-red-700 transition-all">← Voltar ao Menu</button>
                        </div>
                    )}

                    {step === 'FORM' && (
                        <div className="p-12 animate-fade-in pb-52">
                            <h2 className="text-6xl font-black text-red-800 mb-14 tracking-tighter italic leading-none">Identificação</h2>
                            <form onSubmit={(e) => { e.preventDefault(); setStep('SUMMARY'); }} className="space-y-10">
                                <Input label="Seu Nome Completo" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Nome para o lanche" required />
                                <Input label="WhatsApp" type="tel" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="(00) 00000-0000" required />
                                {customer.orderType === OrderType.DELIVERY && (
                                    <div className="animate-fade-in space-y-10">
                                        <Input label="Endereço e Bairro" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="Onde a Sandra entrega?" required />
                                        <Input label="Número da Casa" value={customer.addressNumber} onChange={e => setCustomer({...customer, addressNumber: e.target.value})} placeholder="S/N" required />
                                    </div>
                                )}
                                <Select label="Forma de Pagamento" options={PAYMENT_METHODS} value={customer.paymentMethod} onChange={e => setCustomer({...customer, paymentMethod: e.target.value as PaymentMethod})} />
                                <Button type="submit" fullWidth className="py-9 text-3xl mt-20 rounded-[3.5rem] uppercase italic border-b-8 border-red-900 shadow-2xl">Confirmar Dados</Button>
                            </form>
                            <button onClick={() => setStep('TYPE_SELECTION')} className="w-full mt-12 text-zinc-300 font-black text-[11px] text-center uppercase tracking-widest hover:text-red-700">← Alterar Opção</button>
                        </div>
                    )}

                    {step === 'SUMMARY' && (
                        <div className="p-12 animate-fade-in pb-56">
                            <h2 className="text-6xl font-black text-red-800 mb-12 tracking-tighter italic leading-none">Revisão</h2>
                            <div className="bg-zinc-50 p-12 rounded-[5rem] mb-14 space-y-10 shadow-2xl border-4 border-white relative overflow-hidden">
                                <div className="border-b-2 border-zinc-200 pb-10 relative z-10">
                                    <p className="text-5xl font-black text-red-950 italic leading-none">{customer.name.toUpperCase()}</p>
                                    <div className="flex flex-wrap gap-4 mt-6">
                                        <span className="text-[11px] font-black text-red-600 uppercase tracking-widest italic bg-red-50 px-5 py-2 rounded-full border border-red-100">{customer.orderType}</span>
                                        <span className="text-[11px] font-black text-red-600 uppercase tracking-widest italic bg-red-50 px-5 py-2 rounded-full border border-red-100">{customer.paymentMethod}</span>
                                    </div>
                                </div>
                                <div className="space-y-8 relative z-10">
                                    {cart.map(item => (
                                        <div key={item.cartId} className="flex justify-between items-start">
                                            <div className="flex-1 pr-8">
                                                <p className="font-black text-red-950 text-2xl leading-none italic">{item.quantity}x {item.name}</p>
                                                <div className="text-[11px] text-zinc-400 font-bold mt-4 uppercase tracking-tighter leading-relaxed">
                                                    {item.removedIngredients?.map(i => <span key={i} className="block text-red-400">× SEM {i}</span>)}
                                                    {item.additions?.map(i => <span key={i} className="block text-green-600">✓ COM {i}</span>)}
                                                    {item.observation?.trim() && <span className="block italic mt-3 text-zinc-500 bg-white/60 p-4 rounded-3xl border border-zinc-100">"{item.observation.trim()}"</span>}
                                                </div>
                                            </div>
                                            <p className="font-black text-red-800 text-2xl italic">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t-2 border-zinc-200 pt-10 flex justify-between items-center relative z-10">
                                    <span className="text-3xl font-black text-zinc-300 italic uppercase">Total</span>
                                    <span className="text-6xl font-black text-red-700 italic leading-none drop-shadow-md">R$ {total.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div className="fixed bottom-14 left-8 right-8 z-50 max-w-lg mx-auto">
                                <Button 
                                    onClick={handleFinishOrder} 
                                    disabled={isSending}
                                    fullWidth 
                                    className={`py-9 text-4xl shadow-2xl rounded-[4rem] border-4 border-white/40 border-b-[12px] border-b-red-950 ${isSending ? 'opacity-60 scale-95 grayscale cursor-wait' : 'animate-pulse-slow hover:translate-y-[-4px] active:translate-y-4 active:border-b-4 transition-all'}`}
                                >
                                    {isSending ? 'FINALIZANDO...' : 'ENVIAR PEDIDO! ✅'}
                                </Button>
                            </div>
                            <button onClick={() => setStep('FORM')} className="w-full mt-10 text-zinc-300 font-black text-[12px] text-center uppercase tracking-widest hover:text-red-700">← Corrigir Dados</button>
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
        @keyframes fade-in { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { transform: translateY(150%); } to { transform: translateY(0); } }
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-40px); } }
        .animate-fade-in { animation: fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up { animation: slide-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pulse-slow { animation: pulse-slow 3s infinite ease-in-out; }
        .animate-float { animation: float 7s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
