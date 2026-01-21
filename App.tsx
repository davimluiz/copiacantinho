
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

// CONFIGURAÇÃO DO FIREBASE (As chaves devem ser as do seu projeto real)
const firebaseConfig = {
  apiKey: "AIzaSy...", 
  authDomain: "projeto-sandra.firebaseapp.com",
  projectId: "projeto-sandra",
  storageBucket: "projeto-sandra.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type AppView = 'HOME' | 'ORDER' | 'LOGIN' | 'ADMIN' | 'SUCCESS';
type OrderStep = 'MENU' | 'TYPE_SELECTION' | 'FORM' | 'SUMMARY';

// --- COMPONENTE DE RECIBO TÉRMICO ---
const Receipt = ({ order }: { order: any | null }) => {
    if (!order) return null;
    const date = order.criadoEm?.toDate ? order.criadoEm.toDate().toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
    
    return (
        <div className="w-full max-w-[80mm] mx-auto text-black font-mono text-[10px] p-4 bg-white printable-content border border-zinc-200">
            <div className="text-center mb-4 border-b border-dashed border-black pb-2">
                <h1 className="font-bold text-lg uppercase">Cantinho da Sandra</h1>
                <p>ID: #{order.id?.slice(-4)}</p>
            </div>
            <div className="mb-2">
                <p><strong>CLIENTE:</strong> {order.nomeCliente}</p>
                <p><strong>DATA:</strong> {date}</p>
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            <div className="mb-2">
                <p className="font-bold mb-1">DETALHES:</p>
                <p className="whitespace-pre-wrap leading-tight">{order.itens}</p>
            </div>
            <div className="border-t border-dashed border-black mt-2 pt-2 text-right">
                <p className="text-sm font-bold">TOTAL: R$ {Number(order.total).toFixed(2)}</p>
            </div>
            <div className="text-center mt-6 text-[8px]">
                <p>Obrigado pela preferência!</p>
            </div>
        </div>
    );
};

// --- MODAL DE CUSTOMIZAÇÃO ---
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
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-fade-in">
        <div className="p-6 border-b border-red-50 flex justify-between items-center bg-red-50/30">
          <div><h3 className="text-2xl font-black text-red-700">{product.name}</h3><p className="text-red-500 font-bold">R$ {product.price.toFixed(2)}</p></div>
          <button onClick={onClose} className="text-zinc-300 hover:text-red-500 text-3xl transition-colors">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <label className="block text-red-800 text-xs font-black uppercase mb-3 tracking-widest">Quantidade</label>
            <div className="flex items-center gap-6">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 font-black text-xl">-</button>
              <span className="text-3xl font-black text-red-900">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 font-black text-xl">+</button>
            </div>
          </section>

          {product.ingredients && (
            <section>
              <label className="block text-red-800 text-xs font-black uppercase mb-3 tracking-widest">Retirar algo?</label>
              <div className="grid grid-cols-2 gap-2">
                {product.ingredients.map((ing: string) => (
                  <button key={ing} onClick={() => toggleIngredient(ing)} className={`p-3 rounded-xl text-xs font-bold border transition-all ${removedIngredients.includes(ing) ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white border-zinc-100 text-zinc-500'}`}>SEM {ing.toUpperCase()}</button>
                ))}
              </div>
            </section>
          )}

          {(product.categoryId === 'lanches' || product.categoryId === 'acai') && (
            <section>
              <label className="block text-red-800 text-xs font-black uppercase mb-3 tracking-widest">Adicionais</label>
              <div className="space-y-2">
                {(product.categoryId === 'lanches' ? EXTRAS_OPTIONS : ACAI_PAID_EXTRAS).map(opt => (
                  <button key={opt.name} onClick={() => toggleAddition(opt.name)} className={`w-full flex justify-between items-center p-4 rounded-xl border transition-all ${additions.includes(opt.name) ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-zinc-100 text-zinc-500'}`}>
                    <span className="font-bold">{opt.name}</span>
                    <span className="font-black text-red-600">+R$ {opt.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <label className="block text-red-800 text-xs font-black uppercase mb-3 tracking-widest">Observações</label>
            <textarea className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-zinc-800 focus:outline-none focus:border-red-500 min-h-[100px]" placeholder="Alguma observação geral para este item?" value={observation} onChange={e => setObservation(e.target.value)} />
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

  // LISTENER REAL-TIME PARA O ADMINISTRADOR
  useEffect(() => {
    if (view === 'ADMIN' && isLoggedIn) {
      const q = query(collection(db, 'pedidos'), orderBy('criadoEm', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(loadedOrders);
      });
      return () => unsubscribe();
    }
  }, [view, isLoggedIn]);

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // ENVIO DO PEDIDO - REQUISITOS OBRIGATÓRIOS
  const handleFinishOrder = async () => {
    if (isSending) return;
    
    // Validação básica: não enviar pedido vazio
    if (cart.length === 0 || !customer.name.trim()) {
      alert("Por favor, preencha seu nome e escolha seus produtos.");
      return;
    }

    setIsSending(true);

    // Formatação dos itens para o campo 'itens' (string)
    const itensString = cart.map(item => {
        let text = `${item.quantity}x ${item.name}`;
        let details = [];
        if (item.removedIngredients?.length) details.push(`Sem: ${item.removedIngredients.join(', ')}`);
        if (item.additions?.length) details.push(`Add: ${item.additions.join(', ')}`);
        if (item.observation) details.push(`Obs: ${item.observation}`);
        return details.length > 0 ? `${text} [${details.join(' | ')}]` : text;
    }).join('\n');

    try {
      // 1. Criar novo documento usando addDoc
      // 3. Campos obrigatórios conforme solicitado
      await addDoc(collection(db, 'pedidos'), {
        nomeCliente: customer.name,       // String
        itens: itensString,               // String
        total: Number(total),             // Number
        status: 'novo',                   // String
        criadoEm: serverTimestamp(),       // Timestamp
        // Campos extras para contato da Sandra
        telefone: customer.phone,
        tipo: customer.orderType,
        pagamento: customer.paymentMethod
      });
      
      // 4. Aguardar confirmação (o await garante isso)
      // 5. Somente após sucesso, redirecionar
      setCart([]);
      setStep('MENU');
      setView('SUCCESS');
    } catch (e) {
      // 6. Se falhar, exibir erro e destravar o botão
      console.error("Erro ao gravar pedido:", e);
      alert("Erro ao enviar pedido para o sistema. Tente novamente.");
    } finally {
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

  // --- RENDERIZADORES ---

  if (view === 'SUCCESS') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-white">
      <div className="glass-card p-12 rounded-[3.5rem] max-w-md shadow-2xl border-red-50 border">
        <div className="text-8xl mb-8">🍔✨</div>
        <h2 className="text-3xl font-black text-red-600 mb-4 tracking-tighter">Pedido Enviado!</h2>
        <p className="text-red-900/70 font-bold mb-10 leading-relaxed uppercase text-xs tracking-[0.2em]">
          A <span className="text-red-600 underline">Sandra</span> já recebeu seu pedido e irá confirmar os detalhes com você via <span className="text-green-600">WhatsApp</span> em instantes.
        </p>
        <Button fullWidth onClick={() => setView('HOME')} className="py-5 text-xl">VOLTAR AO INÍCIO</Button>
      </div>
    </div>
  );

  if (view === 'LOGIN') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="glass-card p-10 rounded-[3rem] w-full max-w-sm shadow-2xl border-2 border-red-100">
            <h2 className="text-2xl font-black text-red-600 mb-8 text-center tracking-tighter">Área da Sandra</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                if (formData.get('user') === 'sandra' && formData.get('pass') === '1234') {
                    setIsLoggedIn(true); setView('ADMIN');
                } else alert("Senha incorreta");
            }} className="space-y-5">
                <Input label="Usuário" name="user" required />
                <Input label="Senha" name="pass" type="password" required />
                <Button type="submit" fullWidth className="py-4">ENTRAR NO PAINEL</Button>
                <button type="button" onClick={() => setView('HOME')} className="w-full text-zinc-400 font-bold text-xs uppercase tracking-widest mt-2">Voltar</button>
            </form>
        </div>
    </div>
  );

  if (view === 'ADMIN') return (
    <div className="min-h-screen p-4 md:p-8 bg-zinc-50 pb-24 animate-fade-in">
      <header className="flex justify-between items-center mb-10 max-w-6xl mx-auto">
        <div>
          <h2 className="text-3xl font-black text-red-700 tracking-tighter italic leading-none">Painel de Pedidos</h2>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">Conectado em tempo real ao Firebase</p>
        </div>
        <Button variant="secondary" onClick={() => { setIsLoggedIn(false); setView('HOME'); }} className="px-4 py-2">SAIR</Button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {orders.map(o => (
          <div key={o.id} className={`glass-card p-6 rounded-[2.5rem] border-l-[12px] shadow-xl transition-all relative ${o.status === 'novo' ? 'border-red-600 bg-white ring-4 ring-red-500/10' : 'border-zinc-200 opacity-60'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="pr-4">
                <p className="text-xl font-black text-red-900 leading-tight">{o.nomeCliente}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                   PAGAMENTO: {o.pagamento}
                </p>
              </div>
              {o.status === 'novo' && <span className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-full animate-bounce">NOVO</span>}
            </div>
            
            <div className="bg-zinc-50 rounded-2xl p-4 mb-4 text-[11px] font-mono text-zinc-700 whitespace-pre-wrap border border-zinc-100 max-h-[150px] overflow-y-auto">
              {o.itens}
            </div>
            
            <div className="flex justify-between items-center mb-6">
               <p className="text-xl font-black text-red-600">R$ {Number(o.total).toFixed(2)}</p>
               <button onClick={() => printOrder(o)} className="p-3 bg-zinc-800 text-white rounded-2xl shadow-lg active:scale-90 transition-transform">🖨️</button>
            </div>

            {o.status === 'novo' && (
              <Button fullWidth onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 border-green-500 py-3 font-black text-xs">
                CONCLUIR PEDIDO
              </Button>
            )}
          </div>
        ))}

        {orders.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-40 text-zinc-300">
            <span className="text-6xl mb-4 animate-pulse">🥪</span>
            <p className="italic font-bold text-xl tracking-tight">Aguardando novos pedidos...</p>
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
          <div className="glass-card p-10 md:p-16 rounded-[4rem] text-center shadow-2xl max-w-md w-full border-red-50 bg-white">
            <div className="text-7xl mb-6">🍔</div>
            <h1 className="text-4xl font-black text-red-600 mb-2 tracking-tighter italic leading-none">Cantinho da Sandra</h1>
            <p className="text-red-900/30 font-black uppercase tracking-[0.3em] text-[10px] mb-12">O Melhor Lanche da Região</p>
            <Button fullWidth onClick={() => setView('ORDER')} className="text-xl py-6 shadow-2xl shadow-red-100 flex items-center justify-center gap-4 group">
              FAZER MEU PEDIDO <span className="text-2xl group-hover:translate-x-1 transition-transform">🚀</span>
            </Button>
            <button onClick={() => setView('LOGIN')} className="mt-14 text-zinc-300 text-[10px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors">Acesso Administrativo</button>
          </div>
        </div>
      )}

      {view === 'ORDER' && (
        <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-white">
            {step === 'MENU' && (
                <>
                    <header className="p-4 bg-white sticky top-0 z-50 flex justify-between items-center border-b border-zinc-50 shadow-sm">
                        <button onClick={() => setView('HOME')} className="text-red-600 font-black text-xs uppercase tracking-widest">← Início</button>
                        <h2 className="font-black text-red-700 uppercase tracking-widest text-sm">Cardápio</h2>
                        <div className="w-10"></div>
                    </header>
                    <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar py-6">
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-shrink-0 px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeCategory === cat.id ? 'bg-red-600 text-white shadow-lg scale-105' : 'bg-zinc-100 text-zinc-400'}`}>
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-4 space-y-3 pb-36 overflow-y-auto">
                        {PRODUCTS.filter(p => p.categoryId === activeCategory).map(prod => (
                            <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="bg-white border border-zinc-100 p-5 rounded-[2.5rem] flex justify-between items-center shadow-sm active:scale-95 transition-all">
                                <div>
                                    <h3 className="text-lg font-black text-red-900 mb-1 leading-tight">{prod.name}</h3>
                                    <p className="text-red-600 font-black text-base">R$ {prod.price.toFixed(2)}</p>
                                </div>
                                <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-red-100">+</div>
                            </div>
                        ))}
                    </div>
                    {cart.length > 0 && (
                        <div className="fixed bottom-8 left-4 right-4 z-50 animate-slide-up">
                            <Button fullWidth onClick={() => setStep('TYPE_SELECTION')} className="py-5 text-xl flex justify-between items-center px-10 shadow-2xl rounded-[3rem]">
                                <span className="font-bold">CONCLUIR PEDIDO</span>
                                <span className="bg-white/20 px-4 py-1 rounded-2xl text-lg font-black italic">R$ {total.toFixed(2)}</span>
                            </Button>
                        </div>
                    )}
                </>
            )}

            {step === 'TYPE_SELECTION' && (
                <div className="p-6 flex flex-col items-center justify-center min-h-[85vh] animate-fade-in space-y-12">
                    <h2 className="text-4xl font-black text-red-700 text-center tracking-tighter leading-none">Qual o modo de entrega?</h2>
                    <div className="grid grid-cols-1 w-full gap-5 max-w-xs">
                        <button onClick={() => { setCustomer({...customer, orderType: OrderType.DELIVERY}); setStep('FORM'); }} className="bg-white border-2 border-zinc-50 hover:border-red-500 p-10 rounded-[4rem] text-center shadow-2xl transition-all group active:scale-95">
                            <span className="text-7xl block mb-4 group-hover:scale-110 transition-transform">🛵</span>
                            <span className="font-black text-red-900 text-xl tracking-widest uppercase">ENTREGA</span>
                        </button>
                        <button onClick={() => { setCustomer({...customer, orderType: OrderType.COUNTER}); setStep('FORM'); }} className="bg-white border-2 border-zinc-50 hover:border-red-500 p-10 rounded-[4rem] text-center shadow-2xl transition-all group active:scale-95">
                            <span className="text-7xl block mb-4 group-hover:scale-110 transition-transform">🥡</span>
                            <span className="font-black text-red-900 text-xl tracking-widest uppercase">RETIRADA</span>
                        </button>
                    </div>
                    <button onClick={() => setStep('MENU')} className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest hover:text-red-600 transition-colors">← Voltar</button>
                </div>
            )}

            {step === 'FORM' && (
                <div className="p-6 animate-fade-in pb-40">
                    <h2 className="text-3xl font-black text-red-700 mb-8 tracking-tighter italic">Seus Dados</h2>
                    <form onSubmit={(e) => { e.preventDefault(); setStep('SUMMARY'); }} className="space-y-5">
                        <Input label="Seu Nome Completo" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Para sabermos quem é" required />
                        <Input label="Telefone com DDD" type="tel" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="(00) 00000-0000" required />
                        {customer.orderType === OrderType.DELIVERY && (
                            <div className="animate-fade-in space-y-5">
                                <Input label="Endereço e Bairro" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="Ex: Rua A, Bairro B" required />
                                <Input label="Número" value={customer.addressNumber} onChange={e => setCustomer({...customer, addressNumber: e.target.value})} placeholder="123" required />
                            </div>
                        )}
                        <Select label="Forma de Pagamento" options={PAYMENT_METHODS} value={customer.paymentMethod} onChange={e => setCustomer({...customer, paymentMethod: e.target.value as PaymentMethod})} />
                        <Button type="submit" fullWidth className="py-5 text-xl mt-10">CONTINUAR</Button>
                    </form>
                    <button onClick={() => setStep('TYPE_SELECTION')} className="w-full mt-6 text-zinc-400 font-bold uppercase text-[10px] tracking-widest text-center">← Voltar</button>
                </div>
            )}

            {step === 'SUMMARY' && (
                <div className="p-6 animate-fade-in pb-44">
                    <h2 className="text-3xl font-black text-red-700 mb-6 tracking-tighter">Resumo do Pedido</h2>
                    <div className="bg-zinc-50 p-8 rounded-[3rem] mb-8 space-y-6 shadow-inner border border-zinc-100">
                        <div className="border-b border-zinc-200 pb-5">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Informações de Contato</p>
                            <p className="text-2xl font-black text-red-900 leading-tight">{customer.name}</p>
                            <p className="text-sm font-bold text-zinc-500 mt-1">{customer.phone}</p>
                            <p className="text-[10px] font-black text-red-600 mt-2 uppercase">
                                {customer.orderType} • PAGAMENTO: {customer.paymentMethod}
                            </p>
                        </div>
                        <div className="space-y-4">
                            {cart.map(item => (
                                <div key={item.cartId} className="flex justify-between items-start">
                                    <div className="flex-1 pr-4">
                                        <p className="font-black text-red-900 leading-tight">{item.quantity}x {item.name}</p>
                                        <div className="text-[9px] text-zinc-400 font-bold mt-1 uppercase leading-relaxed">
                                            {item.removedIngredients?.map(i => <span key={i} className="block text-red-400">× {i}</span>)}
                                            {item.additions?.map(i => <span key={i} className="block text-green-600">✓ {i}</span>)}
                                            {item.observation && <span className="block italic mt-1 text-zinc-500 lowercase">"{item.observation}"</span>}
                                        </div>
                                    </div>
                                    <p className="font-black text-red-700 whitespace-nowrap">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-zinc-200 pt-5 flex justify-between items-center">
                            <span className="text-xl font-black text-zinc-300">TOTAL</span>
                            <span className="text-4xl font-black text-red-600 italic">R$ {total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="fixed bottom-10 left-6 right-6 z-50">
                        <Button 
                            onClick={handleFinishOrder} 
                            disabled={isSending}
                            fullWidth 
                            className={`py-6 text-2xl shadow-2xl shadow-red-200 rounded-[3rem] transition-all ${isSending ? 'opacity-70 scale-95 cursor-not-allowed' : 'animate-pulse-slow'}`}
                        >
                            {isSending ? 'PROCESSANDO...' : 'FECHAR PEDIDO! ✅'}
                        </Button>
                    </div>
                    <button onClick={() => setStep('FORM')} className="w-full mt-4 text-zinc-400 font-bold uppercase text-[10px] tracking-widest text-center">← Alterar Dados</button>
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
        @keyframes fade-in { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        .animate-fade-in { animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pulse-slow { animation: pulse-slow 2s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @media print {
            .no-print { display: none !important; }
            body { background: white !important; margin: 0; padding: 0; }
            .printable-area { display: block !important; }
        }
      `}</style>
    </div>
  );
}
