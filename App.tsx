
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { Button } from './components/Button';
import { Input, Select } from './components/Input';
import { 
    CATEGORIES, PRODUCTS, PAYMENT_METHODS, 
    EXTRAS_OPTIONS, ACAI_PAID_EXTRAS
} from './constants';
import { Product, CustomerInfo, CartItem, PaymentMethod, OrderStatus, OrderType } from './types';

// CONFIGURAÇÃO DO FIREBASE USANDO VARIÁVEIS DE AMBIENTE
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSy...", 
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "projeto-sandra.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "projeto-sandra",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "projeto-sandra.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type AppView = 'HOME' | 'ORDER' | 'LOGIN' | 'ADMIN' | 'SUCCESS';
type OrderStep = 'MENU' | 'TYPE_SELECTION' | 'FORM' | 'SUMMARY';

// --- COMPONENTE DE RECIBO ---
const Receipt = ({ order }: { order: any | null }) => {
    if (!order) return null;
    const date = order.criadoEm?.toDate ? order.criadoEm.toDate().toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
    
    return (
        <div className="w-full max-w-[80mm] mx-auto text-black font-mono text-[11px] p-4 bg-white border border-zinc-200 shadow-sm printable-content">
            <div className="text-center mb-4 border-b border-dashed border-black pb-2">
                <h1 className="font-bold text-lg uppercase">Cantinho da Sandra</h1>
                <p className="text-[9px]">PEDIDO: #{order.id?.slice(-4).toUpperCase()}</p>
            </div>
            <div className="mb-2">
                <p><strong>CLIENTE:</strong> {order.nomeCliente}</p>
                <p><strong>DATA:</strong> {date}</p>
                <p><strong>TIPO:</strong> {order.tipo || 'ENTREGA'}</p>
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            <div className="mb-2">
                <p className="font-bold mb-1">DETALHES:</p>
                <p className="whitespace-pre-wrap leading-tight">{order.itens}</p>
            </div>
            <div className="border-t border-dashed border-black mt-2 pt-2 text-right">
                <p className="text-sm font-bold">TOTAL: R$ {Number(order.total).toFixed(2)}</p>
                <p className="text-[9px] uppercase">{order.pagamento}</p>
            </div>
        </div>
    );
};

// --- MODAL DE SELEÇÃO DE PRODUTO ---
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
      price: product.price + extraPrice
    });
  };

  const toggleIngredient = (ing: string) => setRemovedIngredients(prev => prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]);
  const toggleAddition = (add: string) => setAdditions(prev => prev.includes(add) ? prev.filter(a => a !== add) : [...prev, add]);

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-fade-in">
        <div className="p-6 border-b border-red-50 flex justify-between items-center bg-red-50/40">
          <div><h3 className="text-2xl font-black text-red-700 leading-none">{product.name}</h3><p className="text-red-500 font-bold mt-1">R$ {product.price.toFixed(2)}</p></div>
          <button onClick={onClose} className="text-zinc-300 hover:text-red-600 text-4xl transition-colors">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-7">
          <section>
            <label className="block text-red-800 text-xs font-black uppercase mb-3 tracking-[0.2em]">Quantidade</label>
            <div className="flex items-center gap-6">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 font-black text-2xl hover:bg-red-100">-</button>
              <span className="text-4xl font-black text-red-900">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 font-black text-2xl hover:bg-red-100">+</button>
            </div>
          </section>

          {product.ingredients && (
            <section>
              <label className="block text-red-800 text-xs font-black uppercase mb-3 tracking-[0.2em]">Retirar algo?</label>
              <div className="grid grid-cols-2 gap-2">
                {product.ingredients.map((ing: string) => (
                  <button key={ing} onClick={() => toggleIngredient(ing)} className={`p-3 rounded-xl text-[10px] font-black uppercase border transition-all ${removedIngredients.includes(ing) ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white border-zinc-100 text-zinc-400'}`}>SEM {ing}</button>
                ))}
              </div>
            </section>
          )}

          {(product.categoryId === 'lanches' || product.categoryId === 'acai') && (
            <section>
              <label className="block text-red-800 text-xs font-black uppercase mb-3 tracking-[0.2em]">Adicionais</label>
              <div className="space-y-2">
                {(product.categoryId === 'lanches' ? EXTRAS_OPTIONS : ACAI_PAID_EXTRAS).map(opt => (
                  <button key={opt.name} onClick={() => toggleAddition(opt.name)} className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all ${additions.includes(opt.name) ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-zinc-100 text-zinc-500'}`}>
                    <span className="font-bold text-sm uppercase">{opt.name}</span>
                    <span className="font-black text-red-600">+R$ {opt.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <label className="block text-red-800 text-xs font-black uppercase mb-3 tracking-[0.2em]">Observação</label>
            <textarea className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-zinc-800 focus:outline-none focus:border-red-500 min-h-[100px] text-sm" placeholder="Ex: Carne bem passada..." value={observation} onChange={e => setObservation(e.target.value)} />
          </section>
        </div>
        <div className="p-6 bg-zinc-50/50 border-t border-red-50">
          <Button fullWidth onClick={handleConfirm} className="py-4 text-lg">ADICIONAR AO CARRINHO</Button>
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

  // LISTENER REAL-TIME PARA ADMIN (SEMPRE ATIVO QUANDO NA VIEW ADMIN)
  useEffect(() => {
    if (view === 'ADMIN' && isLoggedIn) {
      const q = query(collection(db, 'pedidos'), orderBy('criadoEm', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(loadedOrders);
      }, (error) => {
        console.error("Erro no listener em tempo real:", error);
      });
      return () => unsubscribe();
    }
  }, [view, isLoggedIn]);

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // --- FINALIZAÇÃO DO PEDIDO COM TRATAMENTO DE ERROS GARANTIDO ---
  const handleFinishOrder = async () => {
    // 1. Prevenção de múltiplos cliques e validação
    if (isSending) return;
    
    if (!customer.name.trim() || cart.length === 0) {
      alert("Por favor, preencha os dados corretamente.");
      return;
    }

    // 2. Inicia estado de carregamento
    setIsSending(true);

    try {
      const itensString = cart.map(item => {
          let text = `${item.quantity}x ${item.name}`;
          let details = [];
          if (item.removedIngredients?.length) details.push(`Sem: ${item.removedIngredients.join(', ')}`);
          if (item.additions?.length) details.push(`Add: ${item.additions.join(', ')}`);
          if (item.observation) details.push(`Obs: ${item.observation}`);
          return details.length > 0 ? `${text} (${details.join(' | ')})` : text;
      }).join('\n');

      // 3. Gravação no Firebase
      await addDoc(collection(db, 'pedidos'), {
        nomeCliente: customer.name,
        itens: itensString,
        total: Number(total),
        status: 'novo',
        criadoEm: serverTimestamp(),
        telefone: customer.phone,
        tipo: customer.orderType,
        endereco: customer.orderType === OrderType.DELIVERY ? `${customer.address}, ${customer.addressNumber}` : 'Balcão',
        pagamento: customer.paymentMethod
      });
      
      // 4. Sucesso: limpa carrinho e vai para tela final
      setCart([]);
      setStep('MENU');
      setView('SUCCESS');
    } catch (e) {
      // 5. Erro: Alerta o usuário
      console.error("Erro fatal ao gravar pedido:", e);
      alert("Erro ao enviar o pedido. Verifique sua internet e tente novamente.");
    } finally {
      // 6. GARANTIA: SEMPRE reabilita o botão, independentemente do resultado
      setIsSending(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'pedidos', orderId), { status: newStatus });
    } catch (e) { console.error(e); }
  };

  const printOrder = (order: any) => {
    setReceiptOrder(order);
    setTimeout(() => {
        window.print();
        setReceiptOrder(null);
    }, 500);
  };

  // --- TELAS ---

  if (view === 'SUCCESS') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-white overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
      <div className="glass-card p-10 md:p-14 rounded-[3.5rem] max-w-md shadow-2xl border-red-50 border">
        <div className="text-8xl mb-8 animate-bounce">🍔✨</div>
        <h2 className="text-3xl font-black text-red-600 mb-5 tracking-tighter italic">Pedido Realizado!</h2>
        <p className="text-red-900/70 font-bold mb-10 leading-relaxed uppercase text-xs tracking-[0.2em]">
          Obrigado, <span className="text-red-600">{customer.name.split(' ')[0]}</span>!<br/>
          A <span className="text-red-600 underline">Sandra</span> recebeu seu pedido e confirmará com você pelo <span className="text-green-600 font-black">WhatsApp</span>.
        </p>
        <Button fullWidth onClick={() => setView('HOME')} className="py-5 text-xl rounded-[2.5rem]">VOLTAR AO INÍCIO</Button>
      </div>
    </div>
  );

  if (view === 'LOGIN') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="glass-card p-10 rounded-[3.5rem] w-full max-w-sm shadow-2xl border-2 border-red-100">
            <h2 className="text-2xl font-black text-red-600 mb-8 text-center tracking-tighter">Login Admin</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                if (formData.get('user') === 'sandra' && formData.get('pass') === '1234') {
                    setIsLoggedIn(true); setView('ADMIN');
                } else alert("Acesso negado.");
            }} className="space-y-5">
                <Input label="Usuário" name="user" required />
                <Input label="Senha" name="pass" type="password" required />
                <Button type="submit" fullWidth className="py-4 rounded-2xl">ENTRAR NO PAINEL</Button>
                <button type="button" onClick={() => setView('HOME')} className="w-full text-zinc-300 font-bold text-[10px] uppercase tracking-widest mt-2">Cancelar</button>
            </form>
        </div>
    </div>
  );

  if (view === 'ADMIN') return (
    <div className="min-h-screen p-4 md:p-8 bg-zinc-50 pb-24 animate-fade-in">
      <header className="flex justify-between items-center mb-10 max-w-6xl mx-auto bg-white p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-red-700 tracking-tighter italic leading-none">Painel Sandra</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <p className="text-zinc-400 text-[9px] font-black uppercase tracking-widest">Tempo Real Ativado</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => { setIsLoggedIn(false); setView('HOME'); }} className="px-5 py-2 text-xs">SAIR</Button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {orders.map(o => (
          <div key={o.id} className={`glass-card p-7 rounded-[3rem] border-l-[12px] shadow-2xl transition-all relative overflow-hidden ${o.status === 'novo' ? 'border-red-600 bg-white' : 'border-zinc-200 opacity-70 scale-[0.98]'}`}>
            <div className="flex justify-between items-start mb-5">
              <div className="pr-4">
                <p className="text-2xl font-black text-red-900 leading-tight mb-1">{o.nomeCliente}</p>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{o.pagamento} • {o.tipo}</p>
              </div>
              {o.status === 'novo' && (
                <span className="bg-red-600 text-white text-[9px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-red-200 animate-pulse">NOVO</span>
              )}
            </div>
            
            <div className="bg-zinc-50/50 rounded-2xl p-5 mb-5 text-[11px] font-mono text-zinc-700 whitespace-pre-wrap border border-zinc-100 max-h-[160px] overflow-y-auto leading-relaxed">
              {o.itens}
            </div>
            
            <div className="flex justify-between items-center mb-7">
               <div>
                 <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">Total</p>
                 <p className="text-3xl font-black text-red-600 italic">R$ {Number(o.total).toFixed(2)}</p>
               </div>
               <button onClick={() => printOrder(o)} className="w-14 h-14 bg-zinc-900 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-black active:scale-90 transition-all text-2xl">🖨️</button>
            </div>

            {o.status === 'novo' ? (
              <Button fullWidth onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 hover:bg-green-700 border-green-500 py-4 font-black text-xs rounded-2xl shadow-green-100">
                MARCAR COMO PRONTO
              </Button>
            ) : (
              <div className="w-full text-center p-3 bg-zinc-100 rounded-2xl text-zinc-400 font-black text-[10px] uppercase tracking-widest">
                Concluído
              </div>
            )}
          </div>
        ))}

        {orders.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-48 text-zinc-300">
            <p className="italic font-black text-xl tracking-tighter opacity-40 animate-pulse">Aguardando novos pedidos...</p>
          </div>
        )}
      </div>

      <div className="printable-area hidden">
         <Receipt order={receiptOrder} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {view === 'HOME' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="glass-card p-12 md:p-20 rounded-[4.5rem] text-center shadow-2xl max-w-md w-full border-red-50 bg-white relative overflow-hidden">
            <div className="text-8xl mb-8 animate-float">🍔</div>
            <h1 className="text-5xl font-black text-red-600 mb-3 tracking-tighter italic leading-none">Cantinho da Sandra</h1>
            <p className="text-red-900/30 font-black uppercase tracking-[0.4em] text-[10px] mb-14">Peça Agora!</p>
            <Button fullWidth onClick={() => setView('ORDER')} className="text-2xl py-7 shadow-2xl shadow-red-100 flex items-center justify-center gap-4 group rounded-[3rem]">
              COMEÇAR PEDIDO <span className="text-3xl group-hover:translate-x-2 transition-transform">➡</span>
            </Button>
            <button onClick={() => setView('LOGIN')} className="mt-16 text-zinc-300 text-[10px] font-black uppercase tracking-[0.2em] hover:text-red-500 transition-colors">Painel Admin</button>
          </div>
        </div>
      )}

      {view === 'ORDER' && (
        <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-white">
            {step === 'MENU' && (
                <>
                    <header className="p-5 bg-white sticky top-0 z-50 flex justify-between items-center border-b border-zinc-50">
                        <button onClick={() => setView('HOME')} className="text-red-600 font-black text-xs uppercase tracking-widest px-3 py-1">← Início</button>
                        <h2 className="font-black text-red-700 uppercase tracking-[0.2em] text-[11px]">Cardápio</h2>
                        <div className="w-12"></div>
                    </header>
                    <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar py-6 bg-white border-b border-zinc-50">
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-shrink-0 px-7 py-3.5 rounded-[1.5rem] font-black text-[10px] uppercase transition-all shadow-sm ${activeCategory === cat.id ? 'bg-red-600 text-white shadow-lg scale-105' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}`}>
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-5 space-y-4 pb-40 overflow-y-auto">
                        {PRODUCTS.filter(p => p.categoryId === activeCategory).map(prod => (
                            <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="bg-white border border-zinc-100 p-6 rounded-[2.8rem] flex justify-between items-center shadow-sm active:scale-95 transition-all hover:border-red-100 group">
                                <div className="flex-1 pr-4">
                                    <h3 className="text-xl font-black text-red-900 mb-1 leading-none">{prod.name}</h3>
                                    <p className="text-red-600 font-black text-lg italic">R$ {prod.price.toFixed(2)}</p>
                                </div>
                                <div className="w-14 h-14 bg-red-600 text-white rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-lg shadow-red-100">+</div>
                            </div>
                        ))}
                    </div>
                    {cart.length > 0 && (
                        <div className="fixed bottom-10 left-6 right-6 z-50 animate-slide-up max-w-lg mx-auto">
                            <Button fullWidth onClick={() => setStep('TYPE_SELECTION')} className="py-6 text-xl flex justify-between items-center px-10 shadow-2xl rounded-[3rem]">
                                <span className="font-black">REVISAR</span>
                                <span className="bg-white/20 px-5 py-1.5 rounded-2xl text-xl font-black italic">R$ {total.toFixed(2)}</span>
                            </Button>
                        </div>
                    )}
                </>
            )}

            {step === 'TYPE_SELECTION' && (
                <div className="p-6 flex flex-col items-center justify-center min-h-[90vh] animate-fade-in space-y-12">
                    <h2 className="text-5xl font-black text-red-800 tracking-tighter leading-none italic text-center">Entrega ou<br/>Retirada?</h2>
                    <div className="grid grid-cols-1 w-full gap-6 max-w-xs">
                        <button onClick={() => { setCustomer({...customer, orderType: OrderType.DELIVERY}); setStep('FORM'); }} className="bg-white border-2 border-zinc-50 hover:border-red-500 p-12 rounded-[4rem] text-center shadow-2xl transition-all group active:scale-95">
                            <span className="text-8xl block mb-6 group-hover:scale-110 transition-transform">🛵</span>
                            <span className="font-black text-red-900 text-2xl italic">ENTREGA</span>
                        </button>
                        <button onClick={() => { setCustomer({...customer, orderType: OrderType.COUNTER}); setStep('FORM'); }} className="bg-white border-2 border-zinc-50 hover:border-red-500 p-12 rounded-[4rem] text-center shadow-2xl transition-all group active:scale-95">
                            <span className="text-8xl block mb-6 group-hover:scale-110 transition-transform">🥡</span>
                            <span className="font-black text-red-900 text-2xl italic">RETIRADA</span>
                        </button>
                    </div>
                    <button onClick={() => setStep('MENU')} className="text-zinc-300 font-bold uppercase text-[10px] tracking-widest hover:text-red-600">← Voltar</button>
                </div>
            )}

            {step === 'FORM' && (
                <div className="p-8 animate-fade-in pb-40">
                    <h2 className="text-4xl font-black text-red-700 mb-10 tracking-tighter italic">Seus Dados</h2>
                    <form onSubmit={(e) => { e.preventDefault(); setStep('SUMMARY'); }} className="space-y-6">
                        <Input label="Seu Nome" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Para Sandra saber quem é" required />
                        <Input label="WhatsApp" type="tel" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="(00) 00000-0000" required />
                        {customer.orderType === OrderType.DELIVERY && (
                            <div className="animate-fade-in space-y-6">
                                <Input label="Endereço" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} required />
                                <Input label="Número" value={customer.addressNumber} onChange={e => setCustomer({...customer, addressNumber: e.target.value})} required />
                            </div>
                        )}
                        <Select label="Pagamento" options={PAYMENT_METHODS} value={customer.paymentMethod} onChange={e => setCustomer({...customer, paymentMethod: e.target.value as PaymentMethod})} />
                        <Button type="submit" fullWidth className="py-6 text-2xl mt-12 rounded-[2.5rem]">CONFERIR</Button>
                    </form>
                    <button onClick={() => setStep('TYPE_SELECTION')} className="w-full mt-8 text-zinc-300 font-bold uppercase text-[10px] tracking-widest text-center hover:text-red-500">← Voltar</button>
                </div>
            )}

            {step === 'SUMMARY' && (
                <div className="p-8 animate-fade-in pb-44">
                    <h2 className="text-4xl font-black text-red-700 mb-8 tracking-tighter italic">Revisão</h2>
                    <div className="bg-zinc-50 p-9 rounded-[3.5rem] mb-10 space-y-7 shadow-inner border border-zinc-100">
                        <div className="border-b border-zinc-200 pb-6">
                            <p className="text-3xl font-black text-red-900 italic">{customer.name}</p>
                            <p className="text-[10px] font-black text-red-600 mt-3 uppercase tracking-tighter">
                                {customer.orderType} • {customer.paymentMethod}
                            </p>
                        </div>
                        <div className="space-y-5">
                            {cart.map(item => (
                                <div key={item.cartId} className="flex justify-between items-start">
                                    <div className="flex-1 pr-4">
                                        <p className="font-black text-red-900 text-lg">{item.quantity}x {item.name}</p>
                                        <div className="text-[10px] text-zinc-400 font-bold mt-2 uppercase">
                                            {item.removedIngredients?.map(i => <span key={i} className="block text-red-400">× {i}</span>)}
                                            {item.additions?.map(i => <span key={i} className="block text-green-600">✓ {i}</span>)}
                                            {item.observation && <span className="block italic mt-1 text-zinc-500 pl-2">"{item.observation}"</span>}
                                        </div>
                                    </div>
                                    <p className="font-black text-red-700 text-lg italic">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-zinc-200 pt-7 flex justify-between items-center">
                            <span className="text-xl font-black text-zinc-300 italic">TOTAL</span>
                            <span className="text-4xl font-black text-red-600 italic">R$ {total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="fixed bottom-10 left-6 right-6 z-50 max-w-lg mx-auto">
                        <Button 
                            onClick={handleFinishOrder} 
                            disabled={isSending}
                            fullWidth 
                            className={`py-7 text-3xl shadow-2xl rounded-[3rem] transition-all ${isSending ? 'opacity-70 scale-95 cursor-not-allowed' : 'animate-pulse-slow'}`}
                        >
                            {isSending ? 'GRAVANDO...' : 'FAZER PEDIDO! ✅'}
                        </Button>
                    </div>
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
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up { animation: slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pulse-slow { animation: pulse-slow 2s infinite ease-in-out; }
        .animate-float { animation: float 5s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
