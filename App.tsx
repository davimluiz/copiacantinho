
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
    EXTRAS_OPTIONS, ACAI_PAID_EXTRAS, ACAI_PACKAGING
} from './constants';
import { Product, CustomerInfo, CartItem, PaymentMethod, OrderStatus, OrderType } from './types';

// CONFIGURAÇÃO DO FIREBASE
// Nota: O usuário deve garantir que as chaves abaixo estejam configuradas no Firebase Console.
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

// --- COMPONENTE DE RECIBO (TÉRMICO) ---
const Receipt = ({ order }: { order: any | null }) => {
    if (!order) return null;
    const date = order.criadoEm?.toDate ? order.criadoEm.toDate().toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
    
    return (
        <div className="w-full max-w-[80mm] mx-auto text-black font-mono text-[10px] p-4 bg-white printable-content">
            <div className="text-center mb-4 border-b border-dashed border-black pb-2">
                <h1 className="font-bold text-lg uppercase">Cantinho da Sandra</h1>
                <p>Pedido: #{order.id?.slice(-4)}</p>
            </div>
            <div className="mb-2">
                <p><strong>CLIENTE:</strong> {order.nomeCliente}</p>
                <p><strong>DATA:</strong> {date}</p>
                <p><strong>PAGAMENTO:</strong> {order.pagamento || 'N/I'}</p>
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            <div className="mb-2">
                <p className="font-bold mb-1">ITENS DO PEDIDO:</p>
                <p className="whitespace-pre-wrap leading-tight">{order.itens}</p>
            </div>
            <div className="border-t border-dashed border-black mt-2 pt-2 text-right">
                <p className="text-sm font-bold">TOTAL: R$ {Number(order.total).toFixed(2)}</p>
            </div>
            <div className="text-center mt-6 text-[8px]">
                <p>Impresso em {new Date().toLocaleString()}</p>
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
  const [packaging, setPackaging] = useState(ACAI_PACKAGING[0]);

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
      packaging: product.categoryId === 'acai' ? packaging : undefined,
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
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 font-black text-xl hover:bg-red-100 transition-colors">-</button>
              <span className="text-3xl font-black text-red-900">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 font-black text-xl hover:bg-red-100 transition-colors">+</button>
            </div>
          </section>

          {product.ingredients && (
            <section>
              <label className="block text-red-800 text-xs font-black uppercase mb-3 tracking-widest">Retirar algo?</label>
              <div className="grid grid-cols-2 gap-2">
                {product.ingredients.map((ing: string) => (
                  <button key={ing} onClick={() => toggleIngredient(ing)} className={`p-3 rounded-xl text-xs font-bold border transition-all ${removedIngredients.includes(ing) ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white border-zinc-100 text-zinc-500 hover:border-red-200'}`}>SEM {ing.toUpperCase()}</button>
                ))}
              </div>
            </section>
          )}

          {(product.categoryId === 'lanches' || product.categoryId === 'acai') && (
            <section>
              <label className="block text-red-800 text-xs font-black uppercase mb-3 tracking-widest">Adicionais</label>
              <div className="space-y-2">
                {(product.categoryId === 'lanches' ? EXTRAS_OPTIONS : ACAI_PAID_EXTRAS).map(opt => (
                  <button key={opt.name} onClick={() => toggleAddition(opt.name)} className={`w-full flex justify-between items-center p-4 rounded-xl border transition-all ${additions.includes(opt.name) ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' : 'bg-white border-zinc-100 text-zinc-500 hover:border-red-200'}`}>
                    <span className="font-bold">{opt.name}</span>
                    <span className="font-black text-red-600">+R$ {opt.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <label className="block text-red-800 text-xs font-black uppercase mb-3 tracking-widest">Observações</label>
            <textarea className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-zinc-800 focus:outline-none focus:border-red-500 min-h-[100px] transition-all" placeholder="Algum detalhe especial para este item?" value={observation} onChange={e => setObservation(e.target.value)} />
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

  // LISTENER EM TEMPO REAL PARA O ADMINISTRADOR
  useEffect(() => {
    if (view === 'ADMIN' && isLoggedIn) {
      // Monitora a coleção 'pedidos' ordenando pelos mais recentes
      const q = query(collection(db, 'pedidos'), orderBy('criadoEm', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedOrders = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setOrders(loadedOrders);
      });
      return () => unsubscribe();
    }
  }, [view, isLoggedIn]);

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // FINALIZAÇÃO DO PEDIDO - ENVIO AO FIREBASE
  const handleFinishOrder = async () => {
    if (isSending) return;
    setIsSending(true);

    // FORMATANDO ITENS COMO STRING PARA O CAMPO 'itens' DO BANCO
    const itensString = cart.map(item => {
        let line = `${item.quantity}x ${item.name}`;
        let details = [];
        if (item.removedIngredients?.length) details.push(`Sem ${item.removedIngredients.join(', ')}`);
        if (item.additions?.length) details.push(`Extras: ${item.additions.join(', ')}`);
        if (item.observation) details.push(`Obs: ${item.observation}`);
        return details.length > 0 ? `${line} (${details.join(' | ')})` : line;
    }).join('\n');

    try {
      // DOCUMENTO OBRIGATÓRIO CONFORME SOLICITADO
      await addDoc(collection(db, 'pedidos'), {
        nomeCliente: customer.name,       // TEXTO
        itens: itensString,               // TEXTO
        total: total,                     // NÚMERO
        status: 'novo',                   // TEXTO FIXO
        criadoEm: serverTimestamp(),       // TIMESTAMP
        // Dados de suporte
        telefone: customer.phone,
        endereco: customer.orderType === OrderType.DELIVERY ? `${customer.address}, ${customer.addressNumber}` : 'Balcão',
        pagamento: customer.paymentMethod,
        tipo: customer.orderType
      });
      
      setCart([]);
      setStep('MENU');
      setView('SUCCESS');
    } catch (e) {
      console.error("Erro ao salvar pedido:", e);
      alert("Erro ao enviar pedido para o banco de dados. Verifique sua conexão.");
    } finally {
      setIsSending(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'pedidos', orderId), { status: newStatus });
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
    }
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-white">
      <div className="glass-card p-12 rounded-[3.5rem] max-w-md shadow-2xl border-red-50">
        <div className="text-8xl mb-6 animate-bounce">✅</div>
        <h2 className="text-3xl font-black text-red-600 mb-4 tracking-tighter">Pedido Confirmado!</h2>
        <p className="text-red-900/60 font-medium mb-10 leading-relaxed">
          Sua solicitação foi enviada para o sistema da Sandra. Fique atento ao seu celular!
        </p>
        <Button fullWidth onClick={() => setView('HOME')} className="py-5 text-xl">VOLTAR AO INÍCIO</Button>
      </div>
    </div>
  );

  if (view === 'LOGIN') return (
    <div className="min-h-screen flex items-center justify-center p-6 animate-fade-in bg-zinc-50">
        <div className="glass-card p-10 rounded-[3rem] w-full max-w-sm shadow-2xl border-2 border-red-100">
            <h2 className="text-2xl font-black text-red-600 mb-6 text-center tracking-tighter">Acesso Administrativo</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                if (formData.get('user') === 'sandra' && formData.get('pass') === '1234') {
                    setIsLoggedIn(true); setView('ADMIN');
                } else alert("Usuário ou senha incorretos");
            }} className="space-y-4">
                <Input label="Usuário" name="user" placeholder="sandra" required />
                <Input label="Senha" name="pass" type="password" placeholder="****" required />
                <Button type="submit" fullWidth className="py-4">ACESSAR PAINEL</Button>
                <button type="button" onClick={() => setView('HOME')} className="w-full text-zinc-400 font-bold text-sm hover:text-red-500 transition-colors">Voltar para a Loja</button>
            </form>
        </div>
    </div>
  );

  if (view === 'ADMIN') return (
    <div className="min-h-screen p-4 md:p-8 animate-fade-in pb-24 bg-zinc-50">
      <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
        <div>
          <h2 className="text-3xl font-black text-red-700 tracking-tighter">Pedidos Recentes</h2>
          <p className="text-zinc-500 text-sm font-medium">Sincronizado com Firebase em tempo real</p>
        </div>
        <Button variant="secondary" onClick={() => setView('HOME')} className="px-4 py-2">SAIR</Button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {orders.map(o => (
          <div key={o.id} className={`glass-card p-6 rounded-[2.5rem] border-l-[12px] shadow-xl transition-all relative overflow-hidden ${o.status === 'novo' ? 'border-red-600 bg-white ring-4 ring-red-500/10 animate-pulse-soft' : 'border-green-400 bg-white shadow-sm opacity-80'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xl font-black text-red-900 leading-tight">{o.nomeCliente}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                  {o.tipo || 'ENTREGA'} • {o.pagamento || 'PIX'}
                </p>
              </div>
              {o.status === 'novo' ? (
                <span className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-full animate-bounce">NOVO</span>
              ) : (
                <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-1 rounded-full uppercase">PRONTO</span>
              )}
            </div>
            
            <div className="bg-zinc-50 rounded-2xl p-4 mb-4 text-[11px] font-mono text-zinc-700 whitespace-pre-wrap max-h-[120px] overflow-y-auto border border-zinc-100">
              {o.itens}
            </div>
            
            <div className="flex justify-between items-center mb-6">
               <p className="text-xl font-black text-red-600">R$ {Number(o.total).toFixed(2)}</p>
               <button onClick={() => printOrder(o)} className="p-3 bg-zinc-800 text-white rounded-2xl hover:bg-zinc-900 transition-colors shadow-lg active:scale-90">🖨️ Recibo</button>
            </div>

            {o.status === 'novo' && (
              <Button fullWidth onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 hover:bg-green-700 border-green-500 py-3 text-sm font-black">
                MARCAR COMO PRONTO
              </Button>
            )}
          </div>
        ))}
        {orders.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-32 text-zinc-300">
            <span className="text-6xl mb-4">🏜️</span>
            <p className="italic font-medium">Aguardando novos pedidos do Firebase...</p>
          </div>
        )}
      </div>

      <div className="printable-area hidden">
         <Receipt order={receiptOrder} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white md:bg-zinc-50">
      {view === 'HOME' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="glass-card p-10 md:p-16 rounded-[4rem] text-center shadow-2xl max-w-md w-full border-red-50 bg-white">
            <div className="text-7xl mb-6 animate-float">🍔</div>
            <h1 className="text-4xl font-black text-red-600 mb-2 tracking-tighter italic">Cantinho da Sandra</h1>
            <p className="text-red-900/40 font-black uppercase tracking-[0.3em] text-[10px] mb-12">Qualidade e Sabor no Seu Dia</p>
            <Button fullWidth onClick={() => setView('ORDER')} className="text-xl py-6 shadow-2xl shadow-red-200 hover:scale-105 transition-transform flex items-center justify-center gap-2">
              REALIZAR PEDIDO <span className="text-2xl">🚀</span>
            </Button>
            <button onClick={() => setView('LOGIN')} className="mt-12 text-zinc-300 text-[10px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors">Painel Administrativo</button>
          </div>
        </div>
      )}

      {view === 'ORDER' && (
        <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-white">
            {step === 'MENU' && (
                <>
                    <header className="p-4 glass sticky top-0 z-50 flex justify-between items-center shadow-sm">
                        <button onClick={() => setView('HOME')} className="text-red-600 font-black text-xs px-2 py-1 rounded-lg hover:bg-red-50">← CANCELAR</button>
                        <h2 className="font-black text-red-700 uppercase tracking-widest text-sm">Cardápio</h2>
                        <div className="w-16"></div>
                    </header>
                    <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar py-6 border-b border-zinc-50">
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-shrink-0 px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all shadow-sm ${activeCategory === cat.id ? 'bg-red-600 text-white shadow-red-200 scale-105' : 'bg-zinc-100 text-zinc-400'}`}>
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-4 space-y-3 pb-36 overflow-y-auto">
                        {PRODUCTS.filter(p => p.categoryId === activeCategory).map(prod => (
                            <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="bg-white border border-zinc-100 p-5 rounded-[2rem] flex justify-between items-center shadow-sm hover:shadow-md cursor-pointer active:scale-95 transition-all">
                                <div className="flex-1">
                                    <h3 className="text-lg font-black text-red-900 mb-1">{prod.name}</h3>
                                    <p className="text-red-600 font-black text-base">R$ {prod.price.toFixed(2)}</p>
                                </div>
                                <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-red-100">+</div>
                            </div>
                        ))}
                    </div>
                    {cart.length > 0 && (
                        <div className="fixed bottom-8 left-4 right-4 z-50 animate-slide-up">
                            <Button fullWidth onClick={() => setStep('TYPE_SELECTION')} className="py-5 text-xl flex justify-between items-center px-10 shadow-2xl rounded-[2.5rem]">
                                <span className="font-bold">CONFERIR ITENS</span>
                                <span className="bg-white/20 px-3 py-1 rounded-xl text-lg">R$ {total.toFixed(2)}</span>
                            </Button>
                        </div>
                    )}
                </>
            )}

            {step === 'TYPE_SELECTION' && (
                <div className="p-6 flex flex-col items-center justify-center min-h-[85vh] animate-fade-in space-y-8">
                    <h2 className="text-4xl font-black text-red-700 text-center tracking-tighter leading-none">Como deseja receber?</h2>
                    <div className="grid grid-cols-1 w-full gap-5 max-w-xs">
                        <button onClick={() => { setCustomer({...customer, orderType: OrderType.DELIVERY}); setStep('FORM'); }} className="bg-white border-2 border-zinc-50 hover:border-red-500 p-10 rounded-[3rem] text-center shadow-xl transition-all group active:scale-95">
                            <span className="text-7xl block mb-4 group-hover:scale-110 transition-transform">🛵</span>
                            <span className="font-black text-red-900 text-xl tracking-widest">ENTREGA</span>
                        </button>
                        <button onClick={() => { setCustomer({...customer, orderType: OrderType.COUNTER}); setStep('FORM'); }} className="bg-white border-2 border-zinc-50 hover:border-red-500 p-10 rounded-[3rem] text-center shadow-xl transition-all group active:scale-95">
                            <span className="text-7xl block mb-4 group-hover:scale-110 transition-transform">🥡</span>
                            <span className="font-black text-red-900 text-xl tracking-widest">RETIRAR</span>
                        </button>
                    </div>
                    <button onClick={() => setStep('MENU')} className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest hover:text-red-600">← Voltar ao Cardápio</button>
                </div>
            )}

            {step === 'FORM' && (
                <div className="p-6 animate-fade-in pb-40">
                    <h2 className="text-3xl font-black text-red-700 mb-8 tracking-tighter">Seus Dados</h2>
                    <form onSubmit={(e) => { e.preventDefault(); setStep('SUMMARY'); }} className="space-y-5">
                        <Input label="Seu Nome Completo" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Ex: Maria Souza" required />
                        <Input label="Telefone com DDD" type="tel" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="(00) 00000-0000" required />
                        {customer.orderType === OrderType.DELIVERY && (
                            <div className="animate-fade-in space-y-5">
                                <Input label="Rua e Bairro" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="Rua das Flores, Centro" required />
                                <Input label="Número da Casa/Apt" value={customer.addressNumber} onChange={e => setCustomer({...customer, addressNumber: e.target.value})} placeholder="123" required />
                            </div>
                        )}
                        <Select label="Forma de Pagamento" options={PAYMENT_METHODS} value={customer.paymentMethod} onChange={e => setCustomer({...customer, paymentMethod: e.target.value as PaymentMethod})} />
                        <Button type="submit" fullWidth className="py-5 text-xl mt-12">CONTINUAR PARA O RESUMO</Button>
                    </form>
                    <button onClick={() => setStep('TYPE_SELECTION')} className="w-full mt-6 text-zinc-400 font-bold uppercase text-[10px] tracking-widest">← Voltar</button>
                </div>
            )}

            {step === 'SUMMARY' && (
                <div className="p-6 animate-fade-in pb-44">
                    <h2 className="text-3xl font-black text-red-700 mb-6 tracking-tighter">Revisar Pedido</h2>
                    <div className="bg-zinc-50 p-8 rounded-[3rem] mb-8 space-y-6 shadow-inner border border-zinc-100">
                        <div className="border-b border-zinc-200 pb-5">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Cliente e Local</p>
                            <p className="text-2xl font-black text-red-900 leading-tight">{customer.name}</p>
                            <p className="text-sm font-bold text-zinc-500 mt-1">{customer.phone}</p>
                            <p className="text-xs font-bold text-red-600/60 mt-2 uppercase">{customer.orderType} • {customer.paymentMethod}</p>
                        </div>
                        <div className="space-y-4">
                            {cart.map(item => (
                                <div key={item.cartId} className="flex justify-between items-start">
                                    <div className="flex-1 pr-4">
                                        <p className="font-black text-red-900 leading-tight">{item.quantity}x {item.name}</p>
                                        <div className="text-[9px] text-zinc-400 font-bold mt-1 uppercase leading-relaxed">
                                            {item.removedIngredients?.map(i => <span key={i} className="block text-red-400">× SEM {i}</span>)}
                                            {item.additions?.map(i => <span key={i} className="block text-green-600">✓ COM {i}</span>)}
                                            {item.observation && <span className="block italic mt-1 text-zinc-500">"Obs: {item.observation}"</span>}
                                        </div>
                                    </div>
                                    <p className="font-black text-red-700 whitespace-nowrap">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-zinc-200 pt-5 flex justify-between items-center">
                            <span className="text-xl font-black text-zinc-400">TOTAL</span>
                            <span className="text-3xl font-black text-red-600">R$ {total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="fixed bottom-10 left-6 right-6 z-50">
                        <Button 
                            onClick={handleFinishOrder} 
                            disabled={isSending}
                            fullWidth 
                            className={`py-6 text-2xl shadow-2xl shadow-red-200 rounded-[3rem] ${isSending ? 'opacity-70 grayscale' : 'animate-pulse-slow'}`}
                        >
                            {isSending ? 'ENVIANDO...' : 'CONFIRMAR E PEDIR! ✅'}
                        </Button>
                    </div>
                    <button onClick={() => setStep('FORM')} className="w-full mt-4 text-zinc-400 font-bold uppercase text-[10px] tracking-widest">← Corrigir Informações</button>
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
        @keyframes pulse-soft { 0%, 100% { background: #fff; transform: scale(1); } 50% { background: #fffafa; transform: scale(1.01); } }
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        
        .animate-fade-in { animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pulse-soft { animation: pulse-soft 2s infinite ease-in-out; }
        .animate-pulse-slow { animation: pulse-slow 3s infinite ease-in-out; }
        .animate-float { animation: float 4s infinite ease-in-out; }
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
