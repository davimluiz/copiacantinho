
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
    EXTRAS_OPTIONS, FRANGUINHO_SIDES,
    ACAI_PACKAGING, ACAI_COMPLEMENTS, ACAI_PAID_EXTRAS
} from './constants';
import { Product, CustomerInfo, CartItem, PaymentMethod, OrderStatus, OrderType } from './types';

// CONFIGURAÇÃO DO FIREBASE
// Importante: Substitua pelos dados reais do seu Console Firebase
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

// --- TYPES INTERNOS ---
type AppView = 'HOME' | 'ORDER' | 'LOGIN' | 'ADMIN' | 'SUCCESS';
type OrderStep = 'MENU' | 'TYPE_SELECTION' | 'FORM' | 'SUMMARY';

// --- COMPONENTES DE APOIO ---

const Receipt = ({ order }: { order: any | null }) => {
    if (!order) return null;
    const date = order.criadoEm?.toDate ? order.criadoEm.toDate().toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
    
    return (
        <div className="w-full max-w-[80mm] mx-auto text-black font-mono text-xs p-4 bg-white printable-content border border-zinc-200">
            <div className="text-center mb-4">
                <h1 className="font-bold text-lg uppercase">Cantinho da Sandra</h1>
                <p>Pedido: #{order.id?.slice(-4)}</p>
                <div className="border-b border-dashed border-black my-2"></div>
            </div>
            <div className="mb-4">
                <p><strong>CLIENTE:</strong> {order.nomeCliente}</p>
                <p><strong>DATA:</strong> {date}</p>
                <div className="border-b border-dashed border-black my-2"></div>
            </div>
            <div className="mb-4">
                <p className="font-bold mb-1">ITENS:</p>
                <p className="whitespace-pre-wrap">{order.itens}</p>
                <div className="border-b border-dashed border-black my-2"></div>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold">TOTAL: R$ {Number(order.total).toFixed(2)}</p>
            </div>
            <div className="text-center mt-6">
                <p>Obrigado pela preferência!</p>
            </div>
        </div>
    );
};

// --- MODAL DE PRODUTO ---
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
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-red-50 flex justify-between items-center">
          <div><h3 className="text-2xl font-black text-red-700">{product.name}</h3><p className="text-red-500 font-bold">R$ {product.price.toFixed(2)}</p></div>
          <button onClick={onClose} className="text-zinc-300 hover:text-red-500 text-3xl">&times;</button>
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
                  <button key={ing} onClick={() => toggleIngredient(ing)} className={`p-3 rounded-xl text-xs font-bold border transition-all ${removedIngredients.includes(ing) ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-zinc-100 text-zinc-500'}`}>SEM {ing.toUpperCase()}</button>
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
            <textarea className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-zinc-800 focus:outline-none focus:border-red-500 min-h-[100px]" placeholder="Algum detalhe especial?" value={observation} onChange={e => setObservation(e.target.value)} />
          </section>
        </div>
        <div className="p-6 bg-zinc-50/50">
          <Button fullWidth onClick={handleConfirm} className="py-4 text-lg">ADICIONAR AO CARRINHO</Button>
        </div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---

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

  // Listener Firestore em tempo real para o Admin
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

  const handleFinishOrder = async () => {
    // Formata o texto descritivo dos itens conforme solicitado
    const itensString = cart.map(item => {
        let desc = `${item.quantity}x ${item.name}`;
        const extras = [];
        if (item.removedIngredients?.length) extras.push(`SEM: ${item.removedIngredients.join(', ')}`);
        if (item.additions?.length) extras.push(`ADD: ${item.additions.join(', ')}`);
        if (item.observation) extras.push(`OBS: ${item.observation}`);
        if (extras.length) desc += `\n   (${extras.join(' | ')})`;
        return desc;
    }).join('\n');

    try {
      await addDoc(collection(db, 'pedidos'), {
        nomeCliente: customer.name,
        itens: itensString,
        total: total,
        status: 'novo',
        criadoEm: serverTimestamp(),
        // Dados adicionais para controle interno
        telefone: customer.phone,
        endereco: customer.orderType === OrderType.DELIVERY ? `${customer.address}, ${customer.addressNumber}` : 'Retirada',
        tipo: customer.orderType,
        pagamento: customer.paymentMethod
      });
      
      setCart([]);
      setStep('MENU');
      setView('SUCCESS');
    } catch (e) {
      console.error(e);
      alert("Houve um erro ao enviar seu pedido. Tente novamente.");
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    await updateDoc(doc(db, 'pedidos', orderId), { status: newStatus });
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="glass-card p-12 rounded-[3.5rem] max-w-md shadow-2xl border-red-50">
        <div className="text-8xl mb-6">🎉</div>
        <h2 className="text-3xl font-black text-red-600 mb-4">Pedido Enviado!</h2>
        <p className="text-red-900/60 font-medium mb-8">Sandra já recebeu seu pedido e está preparando com todo carinho. Aguarde!</p>
        <Button fullWidth onClick={() => setView('HOME')}>VOLTAR AO INÍCIO</Button>
      </div>
    </div>
  );

  if (view === 'LOGIN') return (
    <div className="min-h-screen flex items-center justify-center p-6 animate-fade-in">
        <div className="glass-card p-10 rounded-[3rem] w-full max-w-sm shadow-2xl">
            <h2 className="text-2xl font-black text-red-600 mb-6 text-center">Acesso Restrito</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                if (formData.get('user') === 'sandra' && formData.get('pass') === '1234') {
                    setIsLoggedIn(true); setView('ADMIN');
                } else alert("Senha incorreta");
            }} className="space-y-4">
                <Input label="Usuário" name="user" required />
                <Input label="Senha" name="pass" type="password" required />
                <Button type="submit" fullWidth>ENTRAR NO PAINEL</Button>
                <button type="button" onClick={() => setView('HOME')} className="w-full text-zinc-400 font-bold text-sm">Cancelar</button>
            </form>
        </div>
    </div>
  );

  if (view === 'ADMIN') return (
    <div className="min-h-screen p-4 md:p-8 animate-fade-in pb-20">
      <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
        <h2 className="text-3xl font-black text-red-700 tracking-tighter">Painel de Pedidos</h2>
        <Button variant="secondary" onClick={() => setView('HOME')}>SAIR</Button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {orders.map(o => (
          <div key={o.id} className={`glass-card p-6 rounded-[2rem] border-l-[12px] shadow-xl transition-all ${o.status === 'novo' ? 'border-red-600 bg-red-50/50 animate-pulse-soft' : 'border-zinc-300'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xl font-black text-red-900">{o.nomeCliente}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{o.tipo} • {o.pagamento}</p>
              </div>
              {o.status === 'novo' && <span className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-full animate-bounce">NOVO</span>}
            </div>
            
            <div className="bg-white/50 rounded-2xl p-4 mb-4 text-xs font-mono text-zinc-700 whitespace-pre-wrap max-h-[150px] overflow-y-auto">
              {o.itens}
            </div>
            
            <div className="flex justify-between items-center mb-6">
               <p className="text-lg font-black text-red-600">R$ {Number(o.total).toFixed(2)}</p>
               <button onClick={() => printOrder(o)} className="p-3 bg-zinc-800 text-white rounded-xl hover:scale-105 transition-transform">🖨️ Imprimir</button>
            </div>

            {o.status === 'novo' && (
              <Button fullWidth onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 border-green-500">CONCLUIR PEDIDO</Button>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="col-span-full text-center py-20 text-zinc-400 italic">Nenhum pedido no momento...</p>}
      </div>
      <div className="printable-area hidden">
         <Receipt order={receiptOrder} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {view === 'HOME' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="glass-card p-10 md:p-16 rounded-[4rem] text-center shadow-2xl max-w-md w-full border-red-50">
            <div className="text-7xl mb-6">🍔</div>
            <h1 className="text-4xl font-black text-red-600 mb-2 tracking-tighter italic">Cantinho da Sandra</h1>
            <p className="text-red-900/40 font-black uppercase tracking-[0.3em] text-xs mb-12">Lanches • Açaí • Porções</p>
            <Button fullWidth onClick={() => setView('ORDER')} className="text-xl py-6 shadow-xl shadow-red-200 hover:scale-105 transition-transform">REALIZAR PEDIDO 🚀</Button>
            <button onClick={() => setView('LOGIN')} className="mt-8 text-zinc-300 text-[10px] font-bold uppercase tracking-widest hover:text-red-400">Acesso Restrito</button>
          </div>
        </div>
      )}

      {view === 'ORDER' && (
        <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-white md:bg-transparent">
            {step === 'MENU' && (
                <>
                    <header className="p-4 glass sticky top-0 z-50 flex justify-between items-center md:rounded-b-[2rem]">
                        <button onClick={() => setView('HOME')} className="text-red-600 font-black text-sm">← VOLTAR</button>
                        <h2 className="font-black text-red-700 uppercase tracking-widest">Cardápio</h2>
                        <div className="w-10"></div>
                    </header>
                    <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar py-6">
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-shrink-0 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all ${activeCategory === cat.id ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50 text-red-400'}`}>
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-4 space-y-4 pb-32">
                        {PRODUCTS.filter(p => p.categoryId === activeCategory).map(prod => (
                            <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="glass-card p-5 rounded-[2rem] flex justify-between items-center shadow-lg cursor-pointer active:scale-95 transition-all">
                                <div>
                                    <h3 className="text-lg font-black text-red-900">{prod.name}</h3>
                                    <p className="text-red-600 font-bold">R$ {prod.price.toFixed(2)}</p>
                                </div>
                                <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-red-200">+</div>
                            </div>
                        ))}
                    </div>
                    {cart.length > 0 && (
                        <div className="fixed bottom-6 left-4 right-4 z-50 animate-slide-up">
                            <Button fullWidth onClick={() => setStep('TYPE_SELECTION')} className="py-5 text-xl flex justify-between items-center px-8 shadow-2xl">
                                <span>VER CARRINHO ({cart.length})</span>
                                <span>R$ {total.toFixed(2)}</span>
                            </Button>
                        </div>
                    )}
                </>
            )}

            {step === 'TYPE_SELECTION' && (
                <div className="p-6 flex flex-col items-center justify-center min-h-[80vh] animate-fade-in space-y-6">
                    <h2 className="text-3xl font-black text-red-700 text-center tracking-tighter">Como deseja receber seu pedido?</h2>
                    <div className="grid grid-cols-1 w-full gap-4 max-w-xs">
                        <button onClick={() => { setCustomer({...customer, orderType: OrderType.DELIVERY}); setStep('FORM'); }} className="glass-card p-8 rounded-[2.5rem] text-center border-2 border-red-50 hover:border-red-500 transition-all">
                            <span className="text-5xl block mb-2">🛵</span><span className="font-black text-red-900">ENTREGA</span>
                        </button>
                        <button onClick={() => { setCustomer({...customer, orderType: OrderType.COUNTER}); setStep('FORM'); }} className="glass-card p-8 rounded-[2.5rem] text-center border-2 border-red-50 hover:border-red-500 transition-all">
                            <span className="text-5xl block mb-2">🥡</span><span className="font-black text-red-900">RETIRAR</span>
                        </button>
                    </div>
                    <button onClick={() => setStep('MENU')} className="text-zinc-400 font-bold uppercase text-xs">Voltar ao menu</button>
                </div>
            )}

            {step === 'FORM' && (
                <div className="p-6 animate-fade-in pb-32">
                    <h2 className="text-2xl font-black text-red-700 mb-8">Dados do Pedido</h2>
                    <form onSubmit={(e) => { e.preventDefault(); setStep('SUMMARY'); }} className="space-y-4">
                        <Input label="Seu Nome" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} required />
                        <Input label="Telefone / WhatsApp" type="tel" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} required />
                        {customer.orderType === OrderType.DELIVERY && (
                            <>
                                <Input label="Endereço (Rua e Bairro)" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} required />
                                <Input label="Número" value={customer.addressNumber} onChange={e => setCustomer({...customer, addressNumber: e.target.value})} required />
                            </>
                        )}
                        <Select label="Pagamento" options={PAYMENT_METHODS} value={customer.paymentMethod} onChange={e => setCustomer({...customer, paymentMethod: e.target.value as PaymentMethod})} />
                        <Button type="submit" fullWidth className="py-5 text-xl mt-8">CONTINUAR</Button>
                    </form>
                    <button onClick={() => setStep('TYPE_SELECTION')} className="w-full mt-4 text-zinc-400 font-bold uppercase text-xs">Voltar</button>
                </div>
            )}

            {step === 'SUMMARY' && (
                <div className="p-6 animate-fade-in pb-32">
                    <h2 className="text-2xl font-black text-red-700 mb-6">Confirmar Pedido</h2>
                    <div className="glass-card p-6 rounded-[2.5rem] mb-6 space-y-4 shadow-xl">
                        <div className="border-b border-red-50 pb-4">
                            <p className="text-xs font-black text-red-400 uppercase tracking-widest">Cliente</p>
                            <p className="text-xl font-black text-red-900">{customer.name}</p>
                            <p className="text-sm font-bold text-zinc-500">{customer.phone}</p>
                        </div>
                        <div className="space-y-3">
                            {cart.map(item => (
                                <div key={item.cartId} className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <p className="font-black text-red-900 leading-tight">{item.quantity}x {item.name}</p>
                                        <p className="text-[10px] text-zinc-400 font-bold">{item.additions?.join(', ')}</p>
                                    </div>
                                    <p className="font-black text-red-600">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-red-50 pt-4 flex justify-between items-center">
                            <span className="text-xl font-black text-red-900">TOTAL</span>
                            <span className="text-2xl font-black text-red-600">R$ {total.toFixed(2)}</span>
                        </div>
                    </div>
                    <Button onClick={handleFinishOrder} fullWidth className="py-6 text-2xl shadow-2xl shadow-red-200 animate-pulse">CONFIRMAR E ENVIAR ✅</Button>
                    <button onClick={() => setStep('FORM')} className="w-full mt-6 text-zinc-400 font-bold uppercase text-xs">Corrigir dados</button>
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
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pulse-soft { 0%, 100% { background: rgba(254, 242, 242, 0.8); } 50% { background: rgba(254, 226, 226, 0.9); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pulse-soft { animation: pulse-soft 2s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        
        @media print {
            .no-print { display: none !important; }
            body { background: white !important; }
            .printable-area { display: block !important; }
        }
      `}</style>
    </div>
  );
}
