
import React, { useState, useEffect } from 'react';
import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
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

// CONFIGURAÇÃO DO FIREBASE - Inicialização Segura
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

// Verifica se o Firebase está configurado antes de tentar usar
const isConfigured = !!firebaseConfig.apiKey;
let app: any;
let db: any;

try {
  if (isConfigured) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  }
} catch (e) {
  console.error("Erro ao inicializar Firebase:", e);
}

type AppView = 'HOME' | 'ORDER' | 'LOGIN' | 'ADMIN' | 'SUCCESS';
type OrderStep = 'MENU' | 'TYPE_SELECTION' | 'FORM' | 'SUMMARY';

// --- COMPONENTE DE RECIBO ---
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
                <p><strong>CLIENTE:</strong> {String(order.nomeCliente || 'CLIENTE').toUpperCase()}</p>
                <p><strong>DATA:</strong> {date}</p>
                <p><strong>FONE:</strong> {order.telefone || 'N/I'}</p>
                <p><strong>TIPO:</strong> {order.tipo || 'BALCÃO'}</p>
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            <div className="mb-2">
                <p className="font-bold mb-1">PRODUTOS:</p>
                <p className="whitespace-pre-wrap leading-tight text-[10px]">{order.itens}</p>
            </div>
            <div className="border-t border-dashed border-black mt-2 pt-2 text-right">
                <p className="text-sm font-bold">TOTAL: R$ {Number(order.total || 0).toFixed(2)}</p>
                <p className="text-[9px] uppercase font-bold">{order.pagamento}</p>
            </div>
        </div>
    );
};

// --- MODAL DE PERSONALIZAÇÃO ---
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
          <div><h3 className="text-2xl font-black text-red-800 leading-none italic">{product.name}</h3><p className="text-red-600 font-black mt-2">R$ {product.price.toFixed(2)}</p></div>
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
              <label className="block text-red-900/40 text-[10px] font-black uppercase mb-4 tracking-[0.3em]">Retirar?</label>
              <div className="grid grid-cols-2 gap-3">
                {product.ingredients.map((ing: string) => (
                  <button key={ing} onClick={() => toggleIngredient(ing)} className={`p-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${removedIngredients.includes(ing) ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-white border-zinc-100 text-zinc-300'}`}>SEM {ing}</button>
                ))}
              </div>
            </section>
          )}

          <section>
            <label className="block text-red-900/40 text-[10px] font-black uppercase mb-4 tracking-[0.3em]">Observação</label>
            <textarea className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] p-6 text-zinc-800 focus:outline-none focus:border-red-500 min-h-[120px] text-sm font-medium" placeholder="Ex: Carne bem passada..." value={observation} onChange={e => setObservation(e.target.value)} />
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

  // LISTENER REAL-TIME ADMIN
  useEffect(() => {
    if (view === 'ADMIN' && isLoggedIn) {
      if (!isConfigured || !db) {
        // Fallback: carregar pedidos do localStorage para testes se o Firebase estiver offline
        const localOrders = JSON.parse(localStorage.getItem('pedidos_contingencia') || '[]');
        setOrders(localOrders);
        return;
      }

      const q = query(collection(db, 'pedidos'), orderBy('criadoEm', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(loadedOrders);
      }, (error) => {
        console.error("Erro Firestore Listener:", error);
      });
      return () => unsubscribe();
    }
  }, [view, isLoggedIn]);

  const total = cart.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

  // --- FINALIZAÇÃO DO PEDIDO (COM FAIL-SAFE) ---
  const handleFinishOrder = async () => {
    if (isSending) return;
    
    const clientName = String(customer.name || "").trim();
    if (!clientName || cart.length === 0) {
      alert("Por favor, preencha o seu nome e escolha seus lanches.");
      return;
    }

    setIsSending(true);

    // 1. Sanitização do Total e Itens
    const finalTotal = isNaN(total) ? 0 : Number(Number(total).toFixed(2));
    const itensFormatados = cart.map(item => {
        let desc = `${item.quantity}x ${item.name}`;
        const extras = [];
        if (item.removedIngredients?.length) extras.push(`SEM: ${item.removedIngredients.join(', ')}`);
        if (item.additions?.length) extras.push(`COM: ${item.additions.join(', ')}`);
        if (item.observation?.trim()) extras.push(`OBS: ${item.observation.trim()}`);
        return extras.length > 0 ? `${desc} (${extras.join(' | ')})` : desc;
    }).join('\n');

    // 2. Payload Limpo
    const payload = {
      nomeCliente: clientName,
      itens: String(itensFormatados || "Pedido de Lanche"),
      total: finalTotal,
      status: "novo",
      criadoEm: isConfigured ? serverTimestamp() : new Date(),
      telefone: String(customer.phone || "Não informado"),
      tipo: String(customer.orderType || "BALCÃO"),
      pagamento: String(customer.paymentMethod || "PIX"),
      endereco: customer.orderType === OrderType.DELIVERY 
          ? `${String(customer.address || "S/E")}, ${String(customer.addressNumber || "S/N")}` 
          : "Balcão"
    };

    try {
      if (isConfigured && db) {
        // Criamos uma Promise com Timeout de 15 segundos
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("O servidor demorou muito para responder. Verifique sua internet.")), 15000)
        );

        const dbPromise = addDoc(collection(db, 'pedidos'), payload);
        await Promise.race([dbPromise, timeoutPromise]);
      } else {
        // Modo Demo: Salva no LocalStorage se não houver Firebase configurado
        console.warn("Firebase não configurado. Salvando localmente para demonstração.");
        const currentLocal = JSON.parse(localStorage.getItem('pedidos_contingencia') || '[]');
        const newOrder = { id: 'LOCAL_' + Date.now(), ...payload, criadoEm: { toDate: () => new Date() } };
        localStorage.setItem('pedidos_contingencia', JSON.stringify([newOrder, ...currentLocal]));
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simula delay
      }
      
      setView('SUCCESS');
      setTimeout(() => window.location.reload(), 3500);

    } catch (error: any) {
      console.error("FALHA AO ENVIAR:", error);
      alert(`Ops! ${error.message || "Houve um erro técnico"}.`);
      setIsSending(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!isConfigured || !db) return;
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

  // --- RENDERS ---

  if (view === 'SUCCESS') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-50 animate-fade-in fixed inset-0 z-[500]">
      <div className="glass-card p-12 md:p-20 rounded-[5rem] max-w-md shadow-2xl border-green-200 border-2 bg-white">
        <div className="text-[120px] mb-12 animate-bounce leading-none">✅</div>
        <h2 className="text-4xl font-black text-green-600 mb-6 tracking-tighter italic uppercase">Pedido Enviado!</h2>
        <div className="bg-green-50 border border-green-100 p-8 rounded-[2.5rem]">
            <p className="text-green-800 font-black text-[11px] uppercase tracking-widest leading-loose">
                A Sandra já recebeu sua solicitação!<br/>
                Reiniciando sistema...
            </p>
        </div>
      </div>
    </div>
  );

  if (view === 'LOGIN') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="glass-card p-12 rounded-[4rem] w-full max-w-sm shadow-2xl bg-white border border-red-50">
            <h2 className="text-3xl font-black text-red-800 mb-10 text-center italic leading-none">Sandra Admin</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                if (formData.get('user') === 'sandra' && formData.get('pass') === '1234') {
                    setIsLoggedIn(true); setView('ADMIN');
                } else alert("Senha incorreta!");
            }} className="space-y-6">
                <Input label="Usuário" name="user" required />
                <Input label="Senha" name="pass" type="password" required />
                <Button type="submit" fullWidth className="py-5 rounded-[1.5rem]">ENTRAR</Button>
                <button type="button" onClick={() => setView('HOME')} className="w-full text-zinc-300 font-black text-[10px] mt-4 uppercase tracking-widest">← Voltar</button>
            </form>
        </div>
    </div>
  );

  if (view === 'ADMIN') return (
    <div className="min-h-screen p-6 md:p-12 bg-zinc-50 pb-32 animate-fade-in">
      <header className="flex justify-between items-center mb-12 max-w-7xl mx-auto bg-white p-8 rounded-[3rem] shadow-sm border border-red-50">
        <div>
            <h2 className="text-4xl font-black text-red-800 italic leading-none">Cozinha</h2>
            {!isConfigured && <p className="text-orange-500 font-bold text-[10px] uppercase">⚠️ Modo Demonstração (Sem Banco)</p>}
        </div>
        <Button variant="secondary" onClick={() => { setIsLoggedIn(false); setView('HOME'); }} className="px-8 py-3 rounded-2xl text-[10px] font-black uppercase">SAIR</Button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-7xl mx-auto">
        {orders.length === 0 ? (
          <div className="col-span-full text-center py-20 opacity-20 text-4xl font-black italic text-zinc-300">Nenhum pedido no momento... 🍔</div>
        ) : (
          orders.map(o => (
            <div key={o.id} className={`glass-card p-8 rounded-[3.5rem] border-l-[14px] shadow-2xl transition-all relative overflow-hidden bg-white ${o.status === 'novo' ? 'border-red-600' : 'border-zinc-100 opacity-60'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-3xl font-black text-red-950 leading-none italic">{o.nomeCliente}</p>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-3">{o.tipo} • {o.pagamento}</p>
                </div>
                {o.status === 'novo' && <span className="bg-red-600 text-white text-[9px] font-black px-4 py-2 rounded-full uppercase italic">Novo</span>}
              </div>
              <div className="bg-zinc-50/50 rounded-[2rem] p-6 mb-6 text-[11px] font-bold whitespace-pre-wrap max-h-[180px] overflow-y-auto leading-relaxed text-zinc-700">
                {o.itens}
              </div>
              <div className="flex justify-between items-center mb-8">
                 <p className="text-4xl font-black text-red-700 italic">R$ {Number(o.total || 0).toFixed(2)}</p>
                 <button onClick={() => printOrder(o)} className="w-14 h-14 bg-zinc-900 text-white rounded-[1.2rem] flex items-center justify-center text-3xl hover:scale-105 transition-transform shadow-xl">🖨️</button>
              </div>
              {o.status === 'novo' && (
                <Button fullWidth onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 border-green-500 py-5 rounded-[1.8rem] text-xs font-black uppercase">Finalizar</Button>
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
          <div className="glass-card p-14 md:p-24 rounded-[5rem] text-center shadow-2xl max-w-md w-full border-red-50 bg-white relative overflow-hidden">
            <div className="text-[120px] mb-10 animate-float leading-none">🍔</div>
            <h1 className="text-6xl font-black text-red-800 mb-4 tracking-tighter italic leading-none">Sandra Lanches</h1>
            <p className="text-red-900/20 font-black uppercase tracking-[0.5em] text-[11px] mb-16 italic">Tradicional & Delicioso</p>
            <Button fullWidth onClick={() => setView('ORDER')} className="text-2xl py-8 shadow-2xl shadow-red-100 flex items-center justify-center gap-5 group rounded-[3rem] border-b-4 border-red-800">
              FAZER PEDIDO <span className="text-4xl group-hover:translate-x-3 transition-transform">➡</span>
            </Button>
            <button onClick={() => setView('LOGIN')} className="mt-20 text-zinc-200 text-[10px] font-black uppercase tracking-[0.3em] hover:text-red-300 italic">Admin</button>
          </div>
        </div>
      )}

      {view === 'ORDER' && (
        <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-white border-x border-zinc-50 shadow-2xl">
            {step === 'MENU' && (
                <>
                    <header className="p-6 bg-white sticky top-0 z-50 flex justify-between items-center border-b border-zinc-100 shadow-sm">
                        <button onClick={() => setView('HOME')} className="text-red-700 font-black text-[10px] uppercase tracking-widest px-3 py-1 bg-red-50 rounded-full">← Início</button>
                        <h2 className="font-black text-red-900 uppercase tracking-[0.2em] text-[10px] italic">Cardápio</h2>
                        <div className="w-12"></div>
                    </header>
                    <div className="p-5 flex gap-3 overflow-x-auto no-scrollbar py-7">
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-shrink-0 px-8 py-4 rounded-[1.8rem] font-black text-[10px] uppercase transition-all ${activeCategory === cat.id ? 'bg-red-700 text-white shadow-xl scale-105' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}`}>
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-6 space-y-5 pb-48 overflow-y-auto bg-zinc-50/20">
                        {PRODUCTS.filter(p => p.categoryId === activeCategory).map(prod => (
                            <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="bg-white border-2 border-zinc-50 p-7 rounded-[3rem] flex justify-between items-center shadow-lg active:scale-95 transition-all hover:border-red-100 cursor-pointer">
                                <div className="flex-1 pr-4">
                                    <h3 className="text-2xl font-black text-red-950 mb-2 leading-none italic">{prod.name}</h3>
                                    <p className="text-red-600 font-black text-xl italic">R$ {prod.price.toFixed(2)}</p>
                                </div>
                                <div className="w-16 h-16 bg-red-700 text-white rounded-[1.5rem] flex items-center justify-center text-4xl font-black shadow-2xl">+</div>
                            </div>
                        ))}
                    </div>
                    {cart.length > 0 && (
                        <div className="fixed bottom-12 left-6 right-6 z-50 animate-slide-up max-w-lg mx-auto">
                            <Button fullWidth onClick={() => setStep('TYPE_SELECTION')} className="py-7 text-2xl flex justify-between items-center px-12 shadow-2xl rounded-[3rem] border-b-4 border-red-800">
                                <span className="font-black italic uppercase tracking-tighter">Ver Pedido</span>
                                <span className="bg-white/20 px-6 py-2 rounded-2xl text-xl font-black italic">R$ {total.toFixed(2)}</span>
                            </Button>
                        </div>
                    )}
                </>
            )}

            {(step === 'TYPE_SELECTION' || step === 'FORM' || step === 'SUMMARY') && (
                <div className="flex-1 overflow-y-auto bg-white">
                    {step === 'TYPE_SELECTION' && (
                        <div className="p-8 flex flex-col items-center justify-center min-h-[90vh] animate-fade-in space-y-16">
                            <h2 className="text-6xl font-black text-red-900 tracking-tighter italic leading-none text-center">Como vai<br/>receber?</h2>
                            <div className="grid grid-cols-1 w-full gap-8 max-w-sm">
                                <button onClick={() => { setCustomer({...customer, orderType: OrderType.DELIVERY}); setStep('FORM'); }} className="bg-zinc-50 border-2 border-zinc-100 hover:border-red-600 p-14 rounded-[4.5rem] text-center shadow-2xl transition-all group active:scale-95 border-b-8 border-zinc-200">
                                    <span className="text-[100px] block mb-8 group-hover:scale-110 transition-transform leading-none">🛵</span>
                                    <span className="font-black text-red-950 text-3xl uppercase italic">Entrega</span>
                                </button>
                                <button onClick={() => { setCustomer({...customer, orderType: OrderType.COUNTER}); setStep('FORM'); }} className="bg-zinc-50 border-2 border-zinc-100 hover:border-red-600 p-14 rounded-[4.5rem] text-center shadow-2xl transition-all group active:scale-95 border-b-8 border-zinc-200">
                                    <span className="text-[100px] block mb-8 group-hover:scale-110 transition-transform leading-none">🥡</span>
                                    <span className="font-black text-red-950 text-3xl uppercase italic">Balcão</span>
                                </button>
                            </div>
                            <button onClick={() => setStep('MENU')} className="text-zinc-300 font-black uppercase text-[10px] tracking-widest hover:text-red-600">← Voltar</button>
                        </div>
                    )}

                    {step === 'FORM' && (
                        <div className="p-10 animate-fade-in pb-48">
                            <h2 className="text-5xl font-black text-red-800 mb-12 tracking-tighter italic leading-none">Identificação</h2>
                            <form onSubmit={(e) => { e.preventDefault(); setStep('SUMMARY'); }} className="space-y-8">
                                <Input label="Seu Nome" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Para o pedido" required />
                                <Input label="WhatsApp" type="tel" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="(00) 00000-0000" required />
                                {customer.orderType === OrderType.DELIVERY && (
                                    <div className="animate-fade-in space-y-8">
                                        <Input label="Rua / Bairro" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} required />
                                        <Input label="Número" value={customer.addressNumber} onChange={e => setCustomer({...customer, addressNumber: e.target.value})} required />
                                    </div>
                                )}
                                <Select label="Pagamento" options={PAYMENT_METHODS} value={customer.paymentMethod} onChange={e => setCustomer({...customer, paymentMethod: e.target.value as PaymentMethod})} />
                                <Button type="submit" fullWidth className="py-8 text-2xl mt-16 rounded-[3rem] uppercase italic border-b-4 border-red-800">Próximo Passo</Button>
                            </form>
                            <button onClick={() => setStep('TYPE_SELECTION')} className="w-full mt-10 text-zinc-300 font-black text-[10px] text-center uppercase tracking-widest">← Alterar Tipo</button>
                        </div>
                    )}

                    {step === 'SUMMARY' && (
                        <div className="p-10 animate-fade-in pb-52">
                            <h2 className="text-5xl font-black text-red-800 mb-10 tracking-tighter italic leading-none">Revisão</h2>
                            <div className="bg-zinc-50 p-10 rounded-[4rem] mb-12 space-y-9 shadow-2xl border-2 border-white relative overflow-hidden">
                                <div className="border-b-2 border-zinc-200 pb-8 relative z-10">
                                    <p className="text-4xl font-black text-red-950 italic leading-none">{customer.name.toUpperCase()}</p>
                                    <p className="text-[10px] font-black text-red-600 mt-4 uppercase tracking-[0.2em] italic bg-red-50 inline-block px-4 py-1.5 rounded-full">
                                        {customer.orderType} • {customer.paymentMethod}
                                    </p>
                                </div>
                                <div className="space-y-7 relative z-10">
                                    {cart.map(item => (
                                        <div key={item.cartId} className="flex justify-between items-start">
                                            <div className="flex-1 pr-6">
                                                <p className="font-black text-red-950 text-xl leading-none italic">{item.quantity}x {item.name}</p>
                                                <div className="text-[10px] text-zinc-400 font-bold mt-3 uppercase tracking-tighter">
                                                    {item.removedIngredients?.map(i => <span key={i} className="block text-red-400">× SEM {i}</span>)}
                                                    {item.additions?.map(i => <span key={i} className="block text-green-600">✓ COM {i}</span>)}
                                                    {item.observation?.trim() && <span className="block italic mt-2 text-zinc-500 bg-white/50 p-3 rounded-2xl border border-zinc-100">"{item.observation.trim()}"</span>}
                                                </div>
                                            </div>
                                            <p className="font-black text-red-800 text-xl italic">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t-2 border-zinc-200 pt-9 flex justify-between items-center relative z-10">
                                    <span className="text-2xl font-black text-zinc-300 italic uppercase">Total</span>
                                    <span className="text-5xl font-black text-red-700 italic leading-none">R$ {total.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            {/* BOTÃO FINAL COM FEEDBACK DE STATUS */}
                            <div className="fixed bottom-12 left-6 right-6 z-50 max-w-lg mx-auto">
                                <Button 
                                    onClick={handleFinishOrder} 
                                    disabled={isSending}
                                    fullWidth 
                                    className={`py-8 text-3xl shadow-2xl rounded-[3.5rem] border-4 border-white/30 border-b-8 border-b-red-900 ${isSending ? 'opacity-70 scale-95 grayscale cursor-wait' : 'animate-pulse-slow active:translate-y-2 active:border-b-4'}`}
                                >
                                    {isSending ? 'ENVIANDO...' : 'FECHAR PEDIDO! ✅'}
                                </Button>
                            </div>
                            <button onClick={() => setStep('FORM')} className="w-full mt-8 text-zinc-300 font-black text-[10px] text-center uppercase tracking-widest">← Corrigir Dados</button>
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
        @keyframes fade-in { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { transform: translateY(120%); } to { transform: translateY(0); } }
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-30px); } }
        .animate-fade-in { animation: fade-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pulse-slow { animation: pulse-slow 2.5s infinite ease-in-out; }
        .animate-float { animation: float 6s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
