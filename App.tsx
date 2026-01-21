
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './components/Button';
import { Input, Select } from './components/Input';
import { 
    CATEGORIES, PRODUCTS, PAYMENT_METHODS, 
    EXTRAS_OPTIONS, FRANGUINHO_SIDES,
    ACAI_PACKAGING, ACAI_COMPLEMENTS, ACAI_TOPPINGS, ACAI_FRUITS, ACAI_PAID_EXTRAS
} from './constants';
import { Product, CustomerInfo, CartItem, PaymentMethod, Order, OrderStatus, OrderType } from './types';

// --- TYPES PARA O FLUXO ---
type OrderStep = 'MENU' | 'TYPE_SELECTION' | 'FORM' | 'SUMMARY';
type AppView = 'HOME' | 'ORDER' | 'ADMIN' | 'ORDER_SUCCESS' | 'LOGIN';

// Canal de comunicação para simular tempo real entre abas/janelas
const orderChannel = new BroadcastChannel('sandra_orders');

// --- RECEIPT COMPONENT ---
const Receipt = ({ order }: { order: Order | null }) => {
    if (!order) return null;
    const date = new Date(order.createdAt).toLocaleString('pt-BR');
    const DashedLine = () => <div className="w-full border-b border-black border-dashed my-2"></div>;

    return (
        <div className="w-full max-w-[80mm] mx-auto text-black font-mono text-sm p-2 bg-white printable-content">
            <div className="text-center">
                <h1 className="font-bold text-xl uppercase mb-1 text-black">Cantinho da Sandra</h1>
                <p className="text-xs">Pedido #{order.id.slice(-4)}</p>
                <DashedLine />
            </div>
            <div className="mb-2">
                <p className="font-bold uppercase">{order.customer.orderType}</p>
                <p className="font-bold text-lg">{order.customer.name}</p>
                <p>{order.customer.phone}</p>
                {order.customer.orderType === OrderType.DELIVERY && (
                    <p>{order.customer.address}, {order.customer.addressNumber}</p>
                )}
                <p className="text-xs mt-1">{date}</p>
                <DashedLine />
            </div>
            <div className="mb-2">
                <table className="w-full text-left">
                    <thead><tr className="border-b border-black"><th>Qtd</th><th>Item</th><th className="text-right">$$</th></tr></thead>
                    <tbody>
                        {order.items.map((item, idx) => (
                            <React.Fragment key={idx}>
                                <tr className="align-top font-bold">
                                    <td>{item.quantity}</td>
                                    <td>{item.name}</td>
                                    <td className="text-right">{(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                                {(item.removedIngredients?.length || item.additions?.length || item.observation) && (
                                    <tr>
                                        <td></td>
                                        <td colSpan={2} className="text-[10px] pb-1 uppercase leading-tight italic">
                                            {item.removedIngredients?.map(i => <div key={i}>- SEM {i}</div>)}
                                            {item.additions?.map(i => <div key={i}>+ COM {i}</div>)}
                                            {item.observation && <div>OBS: {item.observation}</div>}
                                            {item.packaging && <div>EMB: {item.packaging}</div>}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
                <DashedLine />
            </div>
            <div className="text-right">
                <p className="text-lg font-bold">TOTAL: R$ {order.total.toFixed(2)}</p>
                <p className="text-xs mt-1">Pagamento: {order.customer.paymentMethod}</p>
            </div>
            <div className="text-center text-xs mt-4"><p>Obrigado!</p></div>
        </div>
    );
};

// --- LOGIN VIEW ---
const LoginView = ({ onLogin, onCancel }: { onLogin: () => void, onCancel: () => void }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.toLowerCase() === 'sandra' && pass === '1234') {
      onLogin();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-white/80 backdrop-blur-xl animate-fade-in">
      <div className="glass-card w-full max-w-sm rounded-[3rem] p-10 shadow-2xl border-2 border-red-100">
        <h2 className="text-3xl font-black text-red-600 mb-6 text-center">Acesso Restrito</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Usuário" value={user} onChange={e => setUser(e.target.value)} placeholder="Digite o usuário" />
          <Input label="Senha" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="****" />
          {error && <p className="text-red-600 text-xs font-bold text-center">Usuário ou senha incorretos!</p>}
          <Button type="submit" fullWidth>ENTRAR</Button>
          <button type="button" onClick={onCancel} className="w-full text-zinc-400 font-bold text-sm">Cancelar</button>
        </form>
      </div>
    </div>
  );
};

// --- SUCCESS VIEW ---
const OrderSuccessView = ({ onBack }: { onBack: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center animate-fade-in">
    <div className="glass-card p-8 rounded-[3rem] max-w-md shadow-2xl border-red-50 flex flex-col items-center">
      <div className="text-7xl mb-6 animate-bounce">🎉</div>
      <h2 className="text-3xl font-black text-red-600 mb-3 tracking-tighter">Pedido Realizado!</h2>
      <p className="text-red-900/60 text-base font-medium mb-8 leading-relaxed">
        Sucesso! Agora a <strong>Sandra</strong> vai conferir os detalhes e entrará em contato com você via <strong>WhatsApp</strong> para confirmar tudo.
      </p>
      <div className="w-full space-y-4">
        <Button onClick={onBack} fullWidth className="py-4 text-lg">VOLTAR AO INÍCIO</Button>
      </div>
      <p className="mt-6 text-[10px] font-black text-red-300 uppercase tracking-widest">Obrigado pela preferência!</p>
    </div>
  </div>
);

// --- MODAL COMPONENTS ---

const ProductModal = ({ product, isOpen, onClose, onConfirm }: { product: Product | null, isOpen: boolean, onClose: () => void, onConfirm: (item: CartItem) => void }) => {
  const [quantity, setQuantity] = useState(1);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [additions, setAdditions] = useState<string[]>([]);
  const [observation, setObservation] = useState('');
  const [packaging, setPackaging] = useState(ACAI_PACKAGING[0]);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1); setRemovedIngredients([]); setAdditions([]); setObservation(''); setPackaging(ACAI_PACKAGING[0]);
    }
  }, [isOpen, product]);

  if (!product) return null;

  const handleConfirm = () => {
    let extraPrice = 0;
    if (product.categoryId === 'lanches') {
        additions.forEach(add => {
            const extra = EXTRAS_OPTIONS.find(e => e.name === add);
            if (extra) extraPrice += extra.price;
        });
    } else if (product.categoryId === 'acai') {
        additions.forEach(add => {
            const extra = ACAI_PAID_EXTRAS.find(e => e.name === add);
            if (extra) extraPrice += extra.price;
        });
    }
    const item: CartItem = {
      ...product, cartId: Date.now().toString(), quantity,
      removedIngredients, additions, observation,
      packaging: product.categoryId === 'acai' ? packaging : undefined,
      price: product.price + extraPrice
    };
    onConfirm(item);
  };

  const toggleIngredient = (ing: string) => setRemovedIngredients(prev => prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]);

  const toggleAddition = (add: string, isAcomp: boolean = false) => {
    if (isAcomp && product.maxSides !== undefined) {
        if (!additions.includes(add) && additions.length >= product.maxSides) {
            alert(`Máximo de ${product.maxSides} acompanhamentos.`);
            return;
        }
    }
    setAdditions(prev => prev.includes(add) ? prev.filter(a => a !== add) : [...prev, add]);
  };

  return (
    <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="bg-zinc-900 border border-red-900/20 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-red-900/10 flex justify-between items-start">
          <div><h3 className="text-xl font-black text-white">{product.name}</h3><p className="text-red-500 font-bold text-base">R$ {product.price.toFixed(2)}</p></div>
          <button onClick={onClose} className="text-zinc-500 text-2xl font-bold">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <label className="block text-red-500 text-xs font-black uppercase mb-3 tracking-widest">Quantidade</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-full bg-zinc-800 text-white font-black text-lg">-</button>
              <span className="text-2xl font-black text-white">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-full bg-zinc-800 text-white font-black text-lg">+</button>
            </div>
          </section>
          {product.categoryId === 'lanches' && product.ingredients && (
            <section><label className="block text-red-500 text-xs font-black uppercase mb-3 tracking-widest">Retirar algo?</label>
              <div className="grid grid-cols-2 gap-2">{product.ingredients.map(ing => (
                <button key={ing} onClick={() => toggleIngredient(ing)} className={`p-2 rounded-xl border text-xs font-bold transition-all ${removedIngredients.includes(ing) ? 'bg-red-900/30 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>SEM {ing}</button>))}
              </div>
            </section>
          )}
          {product.categoryId === 'lanches' && (
            <section><label className="block text-red-500 text-xs font-black uppercase mb-3 tracking-widest">Extras</label>
              <div className="space-y-2">{EXTRAS_OPTIONS.map(opt => (
                <button key={opt.name} onClick={() => toggleAddition(opt.name)} className={`w-full p-3 rounded-xl border text-xs font-bold flex justify-between items-center transition-all ${additions.includes(opt.name) ? 'bg-red-900/30 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                  <span>{opt.name}</span><span className="bg-zinc-900 px-2 py-1 rounded-lg">+ R$ {opt.price.toFixed(2)}</span></button>))}
              </div>
            </section>
          )}
          {product.categoryId === 'franguinho' && (
            <section><label className="block text-red-500 text-xs font-black uppercase mb-3 tracking-widest">Acompanhamentos (Máx {product.maxSides})</label>
              <div className="grid grid-cols-1 gap-2">{FRANGUINHO_SIDES.map(side => (
                <button key={side} onClick={() => toggleAddition(side, true)} className={`p-3 rounded-xl border text-xs font-bold transition-all ${additions.includes(side) ? 'bg-red-900/30 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{side}</button>))}
              </div>
            </section>
          )}
          {product.categoryId === 'acai' && (
            <div className="space-y-6">
               <section><label className="block text-red-500 text-xs font-black uppercase mb-3 tracking-widest">Embalagem</label>
                  <div className="grid grid-cols-3 gap-2">{ACAI_PACKAGING.map(p => (<button key={p} onClick={() => setPackaging(p)} className={`p-2 rounded-xl border text-xs font-bold transition-all ${packaging === p ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{p}</button>))}</div>
               </section>
               <section><label className="block text-red-500 text-xs font-black uppercase mb-3 tracking-widest">Complementos</label>
                  <div className="grid grid-cols-2 gap-2">{ACAI_COMPLEMENTS.map(c => (<button key={c} onClick={() => toggleAddition(c)} className={`p-2 rounded-xl border text-xs font-bold transition-all ${additions.includes(c) ? 'bg-red-900/30 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{c}</button>))}</div>
               </section>
               <section><label className="block text-red-500 text-xs font-black uppercase mb-3 tracking-widest">Adicionais (+$$)</label>
                  <div className="space-y-2">{ACAI_PAID_EXTRAS.map(opt => (<button key={opt.name} onClick={() => toggleAddition(opt.name)} className={`w-full p-3 rounded-xl border text-xs font-bold flex justify-between items-center transition-all ${additions.includes(opt.name) ? 'bg-red-900/30 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}><span>{opt.name}</span><span className="bg-zinc-900 px-2 py-1 rounded-lg">+ R$ {opt.price.toFixed(2)}</span></button>))}</div>
               </section>
            </div>
          )}
          <section><label className="block text-red-500 text-xs font-black uppercase mb-3 tracking-widest">Observação</label>
            <textarea value={observation} onChange={e => setObservation(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-red-600 transition-all text-sm" rows={2} placeholder="Ex: Carne bem passada..." />
          </section>
        </div>
        <div className="p-4 bg-zinc-950 border-t border-red-900/10"><Button onClick={handleConfirm} fullWidth className="py-4 text-lg">ADICIONAR</Button></div>
      </div>
    </div>
  );
};

const ManualItemModal = ({ isOpen, onClose, onConfirm }: any) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-red-900/20 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center"><h3 className="text-lg font-black text-white">Item Especial</h3><button onClick={onClose} className="text-zinc-500 text-xl">&times;</button></div>
        <Input label="Qual o nome?" value={name} onChange={e => setName(e.target.value)} />
        <Input label="Qual o preço?" type="number" value={price} onChange={e => setPrice(e.target.value)} />
        <Button onClick={() => { onConfirm({id:'m'+Date.now(), cartId:Date.now().toString(), name, price:parseFloat(price), quantity:1, categoryId: 'manual'}); setName(''); setPrice(''); }} fullWidth disabled={!name || !price}>ADICIONAR</Button>
      </div>
    </div>
  );
};

// --- MAIN VIEWS ---

const CustomerHomeView = ({ onStartOrder }: any) => (
  <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 animate-fade-in">
    <div className="glass-card p-8 rounded-[3rem] w-full max-w-md text-center shadow-2xl border-red-50 flex flex-col items-center">
      <div className="text-6xl mb-6 animate-bounce">🍔</div>
      <h1 className="text-4xl font-black text-red-600 mb-3 tracking-tighter leading-none">Cantinho da Sandra</h1>
      <p className="text-red-900/40 text-base uppercase font-black mb-10 tracking-widest">Lanches • Açaí • Porções</p>
      <Button onClick={onStartOrder} fullWidth className="text-xl py-6 shadow-2xl shadow-red-200 hover:scale-105 transition-transform">FAZER MEU PEDIDO! 🚀</Button>
    </div>
  </div>
);

const AdminView = ({ orders, onShowDaily, onPrint, onStatusChange }: { 
    orders: Order[], onShowDaily: () => void, onPrint: (o: Order) => void, onStatusChange: (id: string, s: OrderStatus) => void 
}) => (
  <div className="p-4 max-w-5xl mx-auto space-y-8 pb-48 animate-fade-in">
    <header className="flex justify-between items-center">
      <h2 className="text-3xl font-black text-red-700 tracking-tighter">Painel de Gestão</h2>
      <Button onClick={onShowDaily}>📊 Relatório</Button>
    </header>
    
    <section className="space-y-4">
      <h3 className="text-lg font-black text-red-800/40 uppercase tracking-[0.2em]">📦 Histórico de Pedidos</h3>
      <div className="space-y-3">
        {orders.length === 0 ? <p className="text-zinc-400 italic">Vazio...</p> : orders.map((o: Order) => (
          <div key={o.id} className={`glass-card p-4 rounded-2xl border-l-[8px] flex justify-between items-center shadow-xl transition-all ${o.status === OrderStatus.NEW ? 'border-red-600 bg-red-50/50 animate-pulse-soft ring-4 ring-red-500/20' : 'border-zinc-300'}`}>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-black text-red-900 text-xl">{o.customer.name}</p>
                {o.status === OrderStatus.NEW && <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">NOVO</span>}
              </div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">{new Date(o.createdAt).toLocaleString()} • {o.customer.orderType}</p>
              <p className="font-black text-red-600 text-lg mt-1">R$ {o.total.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              {o.status === OrderStatus.NEW && (
                <button onClick={() => onStatusChange(o.id, OrderStatus.COMPLETED)} className="bg-green-600 text-white p-3 rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all">✅ Aceitar</button>
              )}
              <button onClick={() => onPrint(o)} className="bg-zinc-800 text-white p-3 rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all">🖨️</button>
            </div>
          </div>))}
      </div>
    </section>
  </div>
);

export default function App() {
  const [view, setView] = useState<AppView>('HOME');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportData, setReportData] = useState<any>(null);

  // Estado local para o pedido em construção (sem rascunhos no Admin)
  const [currentOrder, setCurrentOrder] = useState<{
      cart: CartItem[];
      customer: CustomerInfo;
      step: OrderStep;
  }>({
      cart: [],
      step: 'MENU',
      customer: { name: '', phone: '', address: '', addressNumber: '', reference: '', deliveryFee: 0, tableNumber: '', orderType: OrderType.DELIVERY, paymentMethod: PaymentMethod.PIX }
  });

  // Carregar pedidos iniciais
  useEffect(() => {
    const h = localStorage.getItem('sandra_orders_db');
    if (h) {
        const parsedOrders = JSON.parse(h);
        setOrders(parsedOrders.sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  }, []);

  // Sincronização simulada em tempo real via BroadcastChannel
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'NEW_ORDER') {
            setOrders(prev => [event.data.order, ...prev]);
            // Alerta sonoro ou visual discreto para o admin se desejar
        } else if (event.data.type === 'STATUS_CHANGE') {
            setOrders(prev => prev.map(o => o.id === event.data.id ? { ...o, status: event.data.status } : o));
        }
    };
    orderChannel.addEventListener('message', handleMessage);
    return () => orderChannel.removeEventListener('message', handleMessage);
  }, []);

  // Persistência persistente no localStorage
  useEffect(() => {
      localStorage.setItem('sandra_orders_db', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    if (receiptOrder) {
      const timer = setTimeout(() => {
        window.print();
        setTimeout(() => setReceiptOrder(null), 1000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [receiptOrder]);

  const handleStartOrder = () => {
    setCurrentOrder({
        cart: [], step: 'MENU',
        customer: { name: '', phone: '', address: '', addressNumber: '', reference: '', deliveryFee: 0, tableNumber: '', orderType: OrderType.DELIVERY, paymentMethod: PaymentMethod.PIX }
    });
    setView('ORDER');
  };

  const handleFinish = () => {
    const total = currentOrder.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const newOrder: Order = { 
        id: Date.now().toString(), 
        customer: currentOrder.customer, 
        items: currentOrder.cart, 
        total, 
        createdAt: new Date().toISOString(), 
        status: OrderStatus.NEW // Status solicitado: "novo"
    };

    // Aqui seria o salvamento no Firestore:
    // await db.collection('pedidos').add(newOrder);
    
    // Simulação para demo local
    setOrders(prev => [newOrder, ...prev]);
    orderChannel.postMessage({ type: 'NEW_ORDER', order: newOrder });
    
    setView('ORDER_SUCCESS');
  };

  const updateStatus = (id: string, status: OrderStatus) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      orderChannel.postMessage({ type: 'STATUS_CHANGE', id, status });
  };

  const handleAdminAccess = () => {
    if (isLoggedIn) {
      setView(view === 'ADMIN' ? 'HOME' : 'ADMIN');
    } else {
      setView('LOGIN');
    }
  };

  const filteredProducts = PRODUCTS.filter(p => (currentCategoryId ? p.categoryId === currentCategoryId : true) && p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen text-red-800 font-sans overflow-x-hidden">
      <div className="printable-area hidden bg-white">
        {receiptOrder && <Receipt order={receiptOrder} />}
      </div>

      <div className="no-print h-full pb-20">
        {view === 'LOGIN' && <LoginView onLogin={() => { setIsLoggedIn(true); setView('ADMIN'); }} onCancel={() => setView('HOME')} />}
        {view === 'ORDER_SUCCESS' && <OrderSuccessView onBack={() => setView('HOME')} />}
        {view === 'HOME' && <CustomerHomeView onStartOrder={handleStartOrder} />}
        {view === 'ADMIN' && <AdminView orders={orders} onShowDaily={()=>setReportData({title:'Hoje', total:orders.reduce((s,o)=>s+o.total,0), count:orders.length})} onPrint={setReceiptOrder} onStatusChange={updateStatus} />}

        {view === 'ORDER' && (
            <div className="h-screen flex flex-col animate-fade-in">
                {currentOrder.step === 'MENU' && (
                  <>
                    <header className="p-3 glass sticky top-0 z-20 flex justify-between items-center"><button onClick={()=>setView('HOME')} className="text-sm font-bold text-red-600 px-2">X CANCELAR</button><h2 className="text-base font-black uppercase">Cardápio</h2><div className="w-10"></div></header>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
                      <div className="max-w-md mx-auto">
                        <input type="search" placeholder="🔍 Procurar..." className="w-full bg-zinc-900 text-white rounded-xl p-4 mb-6 shadow-xl text-sm" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                        <Button variant="secondary" onClick={()=>setIsManualModalOpen(true)} fullWidth className="border-dashed mb-8 text-base py-3">🍔 PERSONALIZADO</Button>
                        {!currentCategoryId && !searchTerm ? (
                            <div className="grid grid-cols-2 gap-4">{CATEGORIES.map(c=>(<button key={c.id} onClick={()=>setCurrentCategoryId(c.id)} className="glass-card p-6 rounded-[2rem] flex flex-col items-center gap-2 hover:border-red-500 shadow-xl transition-all">
                                <span className="text-4xl">{c.icon}</span><span className="font-black text-xs uppercase tracking-tighter">{c.name}</span></button>))}</div>
                        ) : (
                            <div className="space-y-3">
                                <button onClick={()=>setCurrentCategoryId(null)} className="font-black text-red-600 text-sm flex items-center gap-2 mb-2">← VOLTAR</button>
                                {filteredProducts.map(p=>(<div key={p.id} onClick={() => setSelectedProduct(p)} className="glass-card p-4 rounded-2xl flex justify-between items-center shadow-lg cursor-pointer active:scale-95">
                                    <div className="flex-1"><p className="font-black text-red-900 text-lg">{p.name}</p><p className="font-bold text-red-600 text-sm">R$ {p.price.toFixed(2)}</p></div>
                                    <div className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center font-black text-xl shadow-xl">+</div>
                                </div>))}
                            </div>
                        )}
                      </div>
                    </div>
                    {currentOrder.cart.length > 0 && <div className="fixed bottom-16 left-0 right-0 glass p-4 border-t-4 border-red-600 z-30 animate-slide-up"><div className="max-w-md mx-auto flex justify-between items-center"><div><p className="text-2xl font-black text-red-900 leading-none">R$ {currentOrder.cart.reduce((s,i)=>s+(i.price*i.quantity),0).toFixed(2)}</p></div><Button onClick={()=>setCurrentOrder({...currentOrder, step:'TYPE_SELECTION'})} className="px-8 py-3 text-lg">PEDIR &rarr;</Button></div></div>}
                  </>
                )}
                {currentOrder.step === 'TYPE_SELECTION' && (
                  <div className="flex flex-col items-center justify-center h-full p-4 space-y-8 animate-fade-in">
                    <h2 className="text-3xl font-black text-center text-red-700 tracking-tighter">Onde quer comer?</h2>
                    <div className="grid grid-cols-1 w-full max-w-sm gap-4">
                        <button onClick={()=>setCurrentOrder({...currentOrder, step:'FORM', customer:{...currentOrder.customer, orderType:OrderType.DELIVERY}})} className="glass-card p-6 rounded-[2rem] text-center border-2 border-red-600 shadow-2xl hover:scale-105 active:scale-95 transition-all">
                            <span className="text-6xl block mb-2">🛵</span><span className="text-xl font-black tracking-widest">ENTREGA</span>
                        </button>
                        <button onClick={()=>setCurrentOrder({...currentOrder, step:'FORM', customer:{...currentOrder.customer, orderType:OrderType.COUNTER}})} className="glass-card p-6 rounded-[2rem] text-center border-2 border-zinc-200 shadow-2xl hover:scale-105 active:scale-95 transition-all">
                            <span className="text-6xl block mb-2">🥡</span><span className="text-xl font-black tracking-widest">RETIRAR</span>
                        </button>
                    </div>
                    <button onClick={()=>setCurrentOrder({...currentOrder, step:'MENU'})} className="font-black text-zinc-400 uppercase text-xs tracking-widest">Cardápio</button>
                  </div>
                )}
                {currentOrder.step === 'FORM' && (
                  <div className="max-w-md mx-auto p-6 pt-8 space-y-6 h-full overflow-y-auto pb-40 animate-fade-in">
                    <header className="flex justify-between items-center"><button onClick={()=>setCurrentOrder({...currentOrder, step:'TYPE_SELECTION'})} className="text-sm font-black text-red-600">← VOLTAR</button><h2 className="text-2xl font-black text-red-600 tracking-tighter">Dados</h2><div className="w-8"></div></header>
                    <form className="space-y-4" onSubmit={e=>{e.preventDefault(); setCurrentOrder({...currentOrder, step:'SUMMARY'});}}>
                      <Input label="Como se chama? *" value={currentOrder.customer.name} onChange={e=>setCurrentOrder({...currentOrder, customer:{...currentOrder.customer, name:e.target.value}})} required />
                      <Input label="WhatsApp *" type="tel" value={currentOrder.customer.phone} onChange={e=>setCurrentOrder({...currentOrder, customer:{...currentOrder.customer, phone:e.target.value}})} required />
                      {currentOrder.customer.orderType === OrderType.DELIVERY && (
                        <div className="space-y-4 animate-fade-in">
                          <Input label="Endereço Completo *" value={currentOrder.customer.address} onChange={e=>setCurrentOrder({...currentOrder, customer:{...currentOrder.customer, address:e.target.value}})} required />
                          <div className="flex gap-3">
                            <div className="flex-1"><Input label="Número *" value={currentOrder.customer.addressNumber} onChange={e=>setCurrentOrder({...currentOrder, customer:{...currentOrder.customer, addressNumber:e.target.value}})} required /></div>
                            <div className="flex-[2]"><Input label="Referência" value={currentOrder.customer.reference} onChange={e=>setCurrentOrder({...currentOrder, customer:{...currentOrder.customer, reference:e.target.value}})} /></div>
                          </div>
                        </div>
                      )}
                      <Select label="Pagamento" options={PAYMENT_METHODS} value={currentOrder.customer.paymentMethod} onChange={e=>setCurrentOrder({...currentOrder, customer:{...currentOrder.customer, paymentMethod:e.target.value as PaymentMethod}})} />
                      <div className="space-y-2"><label className="block text-red-700 text-xs font-bold ml-1">Observação Geral</label>
                        <textarea className="w-full bg-zinc-900 text-white p-4 rounded-2xl h-24 shadow-xl text-sm" value={currentOrder.customer.observation} onChange={e=>setCurrentOrder({...currentOrder, customer:{...currentOrder.customer, observation:e.target.value}})} />
                      </div>
                      <Button type="submit" fullWidth className="py-4 text-xl">REVISAR &rarr;</Button>
                    </form>
                  </div>
                )}
                {currentOrder.step === 'SUMMARY' && (
                  <div className="max-w-md mx-auto p-6 h-full flex flex-col pb-40 animate-fade-in">
                    <header className="flex justify-between items-center mb-6"><button onClick={()=>setCurrentOrder({...currentOrder, step:'FORM'})} className="text-sm font-black text-red-600 underline">← CORRIGIR</button><h2 className="text-2xl font-black tracking-tighter">Resumo</h2><div className="w-10"></div></header>
                    <div className="flex-1 space-y-4">
                      <div className="glass-card p-6 rounded-[2rem] border-l-[8px] border-red-600 shadow-xl">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{currentOrder.customer.orderType}</p>
                        <p className="text-2xl font-black text-red-900">{currentOrder.customer.name}</p>
                        <p className="text-base font-bold text-red-800/70 mt-1">Pagamento: {currentOrder.customer.paymentMethod}</p>
                      </div>
                      <div className="glass-card p-6 rounded-[2rem] space-y-4 shadow-2xl overflow-y-auto max-h-[30vh]">
                        {currentOrder.cart.map(item=>(
                          <div key={item.cartId} className="flex justify-between items-start font-bold border-b-2 border-red-50 pb-2 last:border-0 last:pb-0">
                            <div className="flex-1 pr-4"><p className="text-lg font-black text-red-900 leading-tight">{item.quantity}x {item.name}</p></div>
                            <span className="text-lg font-black text-red-700 whitespace-nowrap">R$ {(item.price*item.quantity).toFixed(2)}</span>
                          </div>))}
                      </div>
                      <div className="p-2 flex flex-col items-center"><p className="text-5xl font-black text-red-700 tracking-tighter">R$ {currentOrder.cart.reduce((s,i)=>s+(i.price*i.quantity),0).toFixed(2)}</p></div>
                    </div>
                    <div className="fixed bottom-16 left-0 right-0 glass p-6 z-30 animate-slide-up"><Button onClick={handleFinish} fullWidth className="py-6 text-2xl shadow-red-200 animate-pulse">CONFIRMAR! ✅</Button></div>
                  </div>
                )}
            </div>
        )}

        {reportData && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-fade-in">
            <div className="glass-card w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl border-4 border-red-100">
                <h3 className="text-2xl font-black text-red-600 mb-6">{reportData.title}</h3>
                <div className="space-y-6 mb-8">
                    <div className="flex flex-col"><span className="text-5xl font-black text-red-700 tracking-tighter">R$ {reportData.total.toFixed(2)}</span></div>
                    <div className="flex flex-col"><span className="text-3xl font-black text-red-900">{reportData.count} pedidos</span></div>
                </div>
                <Button onClick={()=>setReportData(null)} fullWidth>FECHAR</Button>
            </div>
          </div>
        )}

        {/* BOTAO ADMIN NO RODAPÉ */}
        <div className="fixed bottom-2 left-0 right-0 flex justify-center z-[100] no-print">
          <button 
            onClick={handleAdminAccess} 
            className="bg-red-600/90 text-white px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-700 active:scale-95 transition-all flex items-center gap-1.5 border border-white/50"
          >
            <span>⚙️</span> Painel Sandra
          </button>
        </div>

        <ProductModal product={selectedProduct} isOpen={!!selectedProduct} onClose={()=>setSelectedProduct(null)} onConfirm={item=>{setCurrentOrder({...currentOrder, cart:[...(currentOrder.cart), item]}); setSelectedProduct(null);}} />
        <ManualItemModal isOpen={isManualModalOpen} onClose={()=>setIsManualModalOpen(false)} onConfirm={item=>{setCurrentOrder({...currentOrder, cart:[...(currentOrder.cart), item]}); setIsManualModalOpen(false);}} />
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse-soft { 0%, 100% { background-color: rgba(254, 226, 226, 0.5); } 50% { background-color: rgba(254, 202, 202, 0.7); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-pulse-soft { animation: pulse-soft 2s infinite ease-in-out; }
        
        @media print {
          .no-print { display: none !important; }
          .printable-area { display: block !important; width: 100% !important; background: white !important; }
          .printable-content { color: black !important; background: white !important; font-family: 'Courier Prime', monospace; }
        }
      `}</style>
    </div>
  );
}
