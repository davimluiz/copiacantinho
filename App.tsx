
import React, { useState, useEffect } from 'react';
import { Button } from './components/Button';
import { Input, Select } from './components/Input';
import { 
    CATEGORIES, PRODUCTS, PAYMENT_METHODS, ORDER_TYPES, 
    EXTRAS_OPTIONS, FRANGUINHO_SIDES,
    ACAI_PACKAGING, ACAI_COMPLEMENTS, ACAI_TOPPINGS, ACAI_FRUITS, ACAI_PAID_EXTRAS
} from './constants';
import { Product, CustomerInfo, CartItem, PaymentMethod, Order, OrderStatus, OrderType } from './types';

// --- TYPES PARA O FLUXO ---
type OrderStep = 'MENU' | 'TYPE_SELECTION' | 'FORM' | 'SUMMARY';
type AppView = 'HOME' | 'ORDER' | 'ADMIN' | 'ORDER_SUCCESS' | 'LOGIN';

interface OrderDraft {
    id: string;
    customer: CustomerInfo;
    cart: CartItem[];
    step: OrderStep;
    updatedAt: number;
}

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
    <div className="glass-card p-12 rounded-[4rem] max-w-md shadow-2xl border-red-50 flex flex-col items-center">
      <div className="text-9xl mb-8 animate-bounce">🎉</div>
      <h2 className="text-4xl font-black text-red-600 mb-4 tracking-tighter">Pedido Realizado!</h2>
      <p className="text-red-900/60 text-lg font-medium mb-10 leading-relaxed">
        Sucesso! Agora a <strong>Sandra</strong> vai conferir os detalhes e entrará em contato com você via <strong>WhatsApp</strong> para confirmar tudo.
      </p>
      <div className="w-full space-y-4">
        <Button onClick={onBack} fullWidth className="py-6 text-xl">VOLTAR AO INÍCIO</Button>
      </div>
      <p className="mt-8 text-xs font-black text-red-300 uppercase tracking-widest">Obrigado pela preferência!</p>
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
      setQuantity(1);
      setRemovedIngredients([]);
      setAdditions([]);
      setObservation('');
      setPackaging(ACAI_PACKAGING[0]);
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
            alert(`Máximo de ${product.maxSides} acompanhamentos permitido.`);
            return;
        }
    }
    setAdditions(prev => prev.includes(add) ? prev.filter(a => a !== add) : [...prev, add]);
  };

  return (
    <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="bg-zinc-900 border border-red-900/20 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-red-900/10 flex justify-between items-start">
          <div><h3 className="text-2xl font-black text-white">{product.name}</h3><p className="text-red-500 font-bold text-lg">A partir de R$ {product.price.toFixed(2)}</p></div>
          <button onClick={onClose} className="text-zinc-500 text-3xl font-bold">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <label className="block text-red-500 text-xs font-black uppercase mb-4 tracking-widest">Quantidade</label>
            <div className="flex items-center gap-6">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 rounded-full bg-zinc-800 text-white font-black text-xl hover:bg-zinc-700 active:scale-90 transition-all">-</button>
              <span className="text-3xl font-black text-white">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 rounded-full bg-zinc-800 text-white font-black text-xl hover:bg-zinc-700 active:scale-90 transition-all">+</button>
            </div>
          </section>
          {product.categoryId === 'lanches' && product.ingredients && (
            <section><label className="block text-red-500 text-xs font-black uppercase mb-4 tracking-widest">Retirar algo?</label>
              <div className="grid grid-cols-2 gap-2">{product.ingredients.map(ing => (
                <button key={ing} onClick={() => toggleIngredient(ing)} className={`p-3 rounded-xl border text-sm font-bold transition-all ${removedIngredients.includes(ing) ? 'bg-red-900/30 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>SEM {ing}</button>))}
              </div>
            </section>
          )}
          {product.categoryId === 'lanches' && (
            <section><label className="block text-red-500 text-xs font-black uppercase mb-4 tracking-widest">Extras</label>
              <div className="space-y-2">{EXTRAS_OPTIONS.map(opt => (
                <button key={opt.name} onClick={() => toggleAddition(opt.name)} className={`w-full p-4 rounded-xl border text-sm font-bold flex justify-between items-center transition-all ${additions.includes(opt.name) ? 'bg-red-900/30 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                  <span>{opt.name}</span><span className="bg-zinc-900 px-3 py-1 rounded-lg">+ R$ {opt.price.toFixed(2)}</span></button>))}
              </div>
            </section>
          )}
          {product.categoryId === 'franguinho' && (
            <section><label className="block text-red-500 text-xs font-black uppercase mb-4 tracking-widest">Acompanhamentos (Máx {product.maxSides})</label>
              <div className="grid grid-cols-1 gap-2">{FRANGUINHO_SIDES.map(side => (
                <button key={side} onClick={() => toggleAddition(side, true)} className={`p-4 rounded-xl border text-sm font-bold transition-all ${additions.includes(side) ? 'bg-red-900/30 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{side}</button>))}
              </div>
            </section>
          )}
          {product.categoryId === 'acai' && (
            <div className="space-y-8">
               <section><label className="block text-red-500 text-xs font-black uppercase mb-4 tracking-widest">Embalagem</label>
                  <div className="grid grid-cols-3 gap-2">{ACAI_PACKAGING.map(p => (<button key={p} onClick={() => setPackaging(p)} className={`p-3 rounded-xl border text-xs font-bold transition-all ${packaging === p ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{p}</button>))}</div>
               </section>
               <section><label className="block text-red-500 text-xs font-black uppercase mb-4 tracking-widest">Complementos</label>
                  <div className="grid grid-cols-2 gap-2">{ACAI_COMPLEMENTS.map(c => (<button key={c} onClick={() => toggleAddition(c)} className={`p-3 rounded-xl border text-xs font-bold transition-all ${additions.includes(c) ? 'bg-red-900/30 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{c}</button>))}</div>
               </section>
               <section><label className="block text-red-500 text-xs font-black uppercase mb-4 tracking-widest">Adicionais (+$$)</label>
                  <div className="space-y-2">{ACAI_PAID_EXTRAS.map(opt => (<button key={opt.name} onClick={() => toggleAddition(opt.name)} className={`w-full p-4 rounded-xl border text-sm font-bold flex justify-between items-center transition-all ${additions.includes(opt.name) ? 'bg-red-900/30 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}><span>{opt.name}</span><span className="bg-zinc-900 px-3 py-1 rounded-lg">+ R$ {opt.price.toFixed(2)}</span></button>))}</div>
               </section>
            </div>
          )}
          <section><label className="block text-red-500 text-xs font-black uppercase mb-4 tracking-widest">Observação</label>
            <textarea value={observation} onChange={e => setObservation(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-white focus:outline-none focus:border-red-600 transition-all" rows={2} placeholder="Ex: Carne bem passada..." />
          </section>
        </div>
        <div className="p-6 bg-zinc-950 border-t border-red-900/10"><Button onClick={handleConfirm} fullWidth className="py-5 text-xl">ADICIONAR</Button></div>
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
      <div className="bg-zinc-900 border border-red-900/20 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6">
        <div className="flex justify-between items-center"><h3 className="text-xl font-black text-white">Item Especial</h3><button onClick={onClose} className="text-zinc-500 text-2xl">&times;</button></div>
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
    <div className="glass-card p-12 rounded-[4rem] w-full max-w-md text-center shadow-2xl border-red-50 flex flex-col items-center">
      <div className="text-8xl mb-8 animate-bounce">🍔</div>
      <h1 className="text-5xl font-black text-red-600 mb-4 tracking-tighter leading-none">Cantinho da Sandra</h1>
      <p className="text-red-900/40 text-lg uppercase font-black mb-12 tracking-widest">Lanches • Açaí • Porções</p>
      <Button onClick={onStartOrder} fullWidth className="text-2xl py-8 shadow-2xl shadow-red-200 hover:scale-105 transition-transform">FAZER MEU PEDIDO! 🚀</Button>
    </div>
  </div>
);

const AdminView = ({ orders, drafts, onSelectDraft, onDeleteDraft, onShowDaily, onPrint }: any) => (
  <div className="p-6 max-w-5xl mx-auto space-y-12 pb-48 animate-fade-in">
    <header className="flex justify-between items-center"><h2 className="text-4xl font-black text-red-700 tracking-tighter">Painel de Gestão</h2><Button onClick={onShowDaily}>📊 Relatório Hoje</Button></header>
    <section className="space-y-6"><h3 className="text-xl font-black text-red-800/40 uppercase tracking-[0.2em]">🕒 Pedidos em Aberto</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{drafts.length === 0 ? <p className="text-zinc-400 italic">Nenhum rascunho...</p> : drafts.map((d: any) => (
          <div key={d.id} className="glass-card p-6 rounded-3xl flex justify-between items-center border-l-[10px] border-yellow-500 shadow-xl transition-all hover:translate-x-1">
            <div className="cursor-pointer flex-1" onClick={() => onSelectDraft(d.id)}><p className="font-black text-red-900 text-xl">{d.customer.name || 'Sem Nome'}</p>
              <p className="text-xs text-zinc-500 font-bold uppercase mt-1">{d.cart.length} itens • {new Date(d.updatedAt).toLocaleTimeString()}</p></div>
            <button onClick={() => onDeleteDraft(d.id)} className="p-3 bg-red-50 text-red-300 hover:text-red-600 rounded-2xl">🗑️</button>
          </div>))}</div>
    </section>
    <section className="space-y-6"><h3 className="text-xl font-black text-red-800/40 uppercase tracking-[0.2em]">✅ Histórico Recente</h3>
      <div className="space-y-4">{orders.length === 0 ? <p className="text-zinc-400 italic">Vazio...</p> : orders.map((o: any) => (
          <div key={o.id} className="glass-card p-6 rounded-3xl border-l-[10px] border-red-600 flex justify-between items-center shadow-xl">
            <div><p className="font-black text-red-900 text-2xl">{o.customer.name}</p><p className="text-xs text-zinc-500 font-bold uppercase">{new Date(o.createdAt).toLocaleString()}</p><p className="font-black text-red-600 text-xl mt-2">R$ {o.total.toFixed(2)}</p></div>
            <button onClick={() => onPrint(o)} className="bg-red-600 text-white p-5 rounded-3xl shadow-xl hover:brightness-110 active:scale-95 transition-all">🖨️ Imprimir</button>
          </div>))}</div>
    </section>
  </div>
);

export default function App() {
  const [view, setView] = useState<AppView>('HOME');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<OrderDraft[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    const d = localStorage.getItem('drafts');
    const h = localStorage.getItem('orders');
    if (d) setDrafts(JSON.parse(d));
    if (h) setOrders(JSON.parse(h));
  }, []);

  useEffect(() => localStorage.setItem('drafts', JSON.stringify(drafts)), [drafts]);
  useEffect(() => localStorage.setItem('orders', JSON.stringify(orders)), [orders]);

  // CORREÇÃO DA IMPRESSÃO: Garante que o conteúdo renderize antes do print
  useEffect(() => {
    if (receiptOrder) {
      const timer = setTimeout(() => {
        window.print();
        // Não resetamos o receiptOrder imediatamente para que o navegador tenha tempo de renderizar o que está sendo impresso
        // Mas podemos resetar após um delay maior ou se o usuário cancelar
        setTimeout(() => setReceiptOrder(null), 1000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [receiptOrder]);

  const activeDraft = drafts.find(d => d.id === activeDraftId);
  const updateDraft = (updates: Partial<OrderDraft>) => {
    if (!activeDraftId) return;
    setDrafts(prev => prev.map(d => d.id === activeDraftId ? { ...d, ...updates, updatedAt: Date.now() } : d));
  };

  const handleStartOrder = () => {
    const id = Date.now().toString();
    const newDraft: OrderDraft = {
        id, cart: [], step: 'MENU', updatedAt: Date.now(),
        customer: { name: '', phone: '', address: '', addressNumber: '', reference: '', deliveryFee: 0, tableNumber: '', orderType: OrderType.DELIVERY, paymentMethod: PaymentMethod.PIX }
    };
    setDrafts(prev => [...prev, newDraft]);
    setActiveDraftId(id);
    setView('ORDER');
  };

  const handleFinish = () => {
    if (!activeDraft) return;
    const total = activeDraft.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const newOrder: Order = { id: activeDraft.id, customer: activeDraft.customer, items: activeDraft.cart, total, createdAt: new Date().toISOString(), status: OrderStatus.PENDING };
    setOrders(prev => [newOrder, ...prev]);
    setDrafts(prev => prev.filter(d => d.id !== activeDraftId));
    setActiveDraftId(null);
    setView('ORDER_SUCCESS'); // Nova tela de sucesso
  };

  const handleAdminAccess = () => {
    if (isLoggedIn) {
      setView(view === 'ADMIN' ? 'HOME' : 'ADMIN');
      setActiveDraftId(null);
    } else {
      setView('LOGIN');
    }
  };

  const filteredProducts = PRODUCTS.filter(p => (currentCategoryId ? p.categoryId === currentCategoryId : true) && p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen text-red-800 font-sans overflow-x-hidden">
      {/* AREA DE IMPRESSAO FIXA */}
      <div className="printable-area hidden bg-white">
        {receiptOrder && <Receipt order={receiptOrder} />}
      </div>

      <div className="no-print h-full pb-20">
        {view === 'LOGIN' && <LoginView onLogin={() => { setIsLoggedIn(true); setView('ADMIN'); }} onCancel={() => setView('HOME')} />}
        {view === 'ORDER_SUCCESS' && <OrderSuccessView onBack={() => setView('HOME')} />}
        {view === 'HOME' && <CustomerHomeView onStartOrder={handleStartOrder} />}
        {view === 'ADMIN' && <AdminView orders={orders} drafts={drafts} onSelectDraft={(id:string)=>{setActiveDraftId(id); setView('ORDER');}} onDeleteDraft={(id:string)=>confirm('Excluir?') && setDrafts(p=>p.filter(d=>d.id!==id))} onShowDaily={()=>setReportData({title:'Hoje', total:orders.reduce((s,o)=>s+o.total,0), count:orders.length})} onPrint={setReceiptOrder} />}

        {view === 'ORDER' && activeDraft && (
            <div className="h-screen flex flex-col animate-fade-in">
                {activeDraft.step === 'MENU' && (
                  <>
                    <header className="p-4 glass sticky top-0 z-20 flex justify-between items-center"><button onClick={()=>setView('HOME')} className="font-bold text-red-600 px-2">X CANCELAR</button><h2 className="text-xl font-black">NOSSO CARDÁPIO</h2><div className="w-10"></div></header>
                    <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-48">
                      <div className="max-w-md mx-auto">
                        <input type="search" placeholder="🔍 Procurar..." className="w-full bg-zinc-900 text-white rounded-2xl p-5 mb-8 shadow-2xl" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                        <Button variant="secondary" onClick={()=>setIsManualModalOpen(true)} fullWidth className="border-dashed mb-10 text-lg">🍔 LANCHE PERSONALIZADO</Button>
                        {!currentCategoryId && !searchTerm ? (
                            <div className="grid grid-cols-2 gap-6">{CATEGORIES.map(c=>(<button key={c.id} onClick={()=>setCurrentCategoryId(c.id)} className="glass-card p-10 rounded-[3rem] flex flex-col items-center gap-4 hover:border-red-500 shadow-xl transition-all">
                                <span className="text-6xl">{c.icon}</span><span className="font-black text-sm uppercase">{c.name}</span></button>))}</div>
                        ) : (
                            <div className="space-y-4">
                                <button onClick={()=>setCurrentCategoryId(null)} className="font-black text-red-600 flex items-center gap-2 mb-4">← VOLTAR</button>
                                {filteredProducts.map(p=>(<div key={p.id} onClick={() => setSelectedProduct(p)} className="glass-card p-6 rounded-3xl flex justify-between items-center shadow-lg cursor-pointer active:scale-95">
                                    <div className="flex-1"><p className="font-black text-red-900 text-2xl">{p.name}</p><p className="font-bold text-red-600 text-lg">R$ {p.price.toFixed(2)}</p></div>
                                    <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center font-black text-3xl shadow-xl">+</div>
                                </div>))}
                            </div>
                        )}
                      </div>
                    </div>
                    {activeDraft.cart.length > 0 && <div className="fixed bottom-20 left-0 right-0 glass p-8 border-t-8 border-red-600 z-30 animate-slide-up"><div className="max-w-md mx-auto flex justify-between items-center"><div><p className="text-4xl font-black text-red-900">R$ {activeDraft.cart.reduce((s,i)=>s+(i.price*i.quantity),0).toFixed(2)}</p></div><Button onClick={()=>updateDraft({step:'TYPE_SELECTION'})} className="px-12 py-5 text-xl">PEDIR &rarr;</Button></div></div>}
                  </>
                )}
                {activeDraft.step === 'TYPE_SELECTION' && (
                  <div className="flex flex-col items-center justify-center h-full p-8 space-y-12 animate-fade-in">
                    <h2 className="text-5xl font-black text-center text-red-700 tracking-tighter">Onde quer comer?</h2>
                    <div className="grid grid-cols-1 w-full max-w-sm gap-8">
                        <button onClick={()=>updateDraft({step:'FORM', customer:{...activeDraft.customer, orderType:OrderType.DELIVERY}})} className="glass-card p-12 rounded-[4rem] text-center border-4 border-red-600 shadow-2xl hover:scale-105 active:scale-95 transition-all">
                            <span className="text-8xl block mb-6">🛵</span><span className="text-3xl font-black tracking-widest">ENTREGA</span>
                        </button>
                        <button onClick={()=>updateDraft({step:'FORM', customer:{...activeDraft.customer, orderType:OrderType.COUNTER}})} className="glass-card p-12 rounded-[4rem] text-center border-4 border-zinc-200 shadow-2xl hover:scale-105 active:scale-95 transition-all">
                            <span className="text-8xl block mb-6">🥡</span><span className="text-3xl font-black tracking-widest">RETIRAR</span>
                        </button>
                    </div>
                    <button onClick={()=>updateDraft({step:'MENU'})} className="font-black text-zinc-400 uppercase tracking-[0.3em]">Cardápio</button>
                  </div>
                )}
                {activeDraft.step === 'FORM' && (
                  <div className="max-w-md mx-auto p-8 pt-12 space-y-10 h-full overflow-y-auto pb-48 animate-fade-in">
                    <header className="flex justify-between items-center"><button onClick={()=>updateDraft({step:'TYPE_SELECTION'})} className="font-black text-red-600">← VOLTAR</button><h2 className="text-3xl font-black text-red-600 tracking-tighter">Dados do Pedido</h2><div className="w-8"></div></header>
                    <form className="space-y-6" onSubmit={e=>{e.preventDefault(); updateDraft({step:'SUMMARY'});}}>
                      <Input label="Como se chama? *" value={activeDraft.customer.name} onChange={e=>updateDraft({customer:{...activeDraft.customer, name:e.target.value}})} required />
                      <Input label="WhatsApp *" type="tel" value={activeDraft.customer.phone} onChange={e=>updateDraft({customer:{...activeDraft.customer, phone:e.target.value}})} required />
                      {activeDraft.customer.orderType === OrderType.DELIVERY && (
                        <div className="space-y-6 animate-fade-in">
                          <Input label="Endereço Completo *" value={activeDraft.customer.address} onChange={e=>updateDraft({customer:{...activeDraft.customer, address:e.target.value}})} required />
                          <div className="flex gap-4">
                            <div className="flex-1"><Input label="Número *" value={activeDraft.customer.addressNumber} onChange={e=>updateDraft({customer:{...activeDraft.customer, addressNumber:e.target.value}})} required /></div>
                            <div className="flex-[2]"><Input label="Referência" value={activeDraft.customer.reference} onChange={e=>updateDraft({customer:{...activeDraft.customer, reference:e.target.value}})} /></div>
                          </div>
                        </div>
                      )}
                      <Select label="Pagamento" options={PAYMENT_METHODS} value={activeDraft.customer.paymentMethod} onChange={e=>updateDraft({customer:{...activeDraft.customer, paymentMethod:e.target.value as PaymentMethod}})} />
                      <div className="space-y-2"><label className="block text-red-700 text-sm font-bold ml-1">Observação Geral</label>
                        <textarea className="w-full bg-zinc-900 text-white p-5 rounded-[2rem] h-32 shadow-xl" value={activeDraft.customer.observation} onChange={e=>updateDraft({customer:{...activeDraft.customer, observation:e.target.value}})} />
                      </div>
                      <Button type="submit" fullWidth className="py-7 text-2xl">REVISAR &rarr;</Button>
                    </form>
                  </div>
                )}
                {activeDraft.step === 'SUMMARY' && (
                  <div className="max-w-md mx-auto p-8 h-full flex flex-col pb-48 animate-fade-in">
                    <header className="flex justify-between items-center mb-10"><button onClick={()=>updateDraft({step:'FORM'})} className="font-black text-red-600 underline">← CORRIGIR</button><h2 className="text-3xl font-black tracking-tighter">Resumo Final</h2><div className="w-10"></div></header>
                    <div className="flex-1 space-y-6">
                      <div className="glass-card p-8 rounded-[3rem] border-l-[12px] border-red-600 shadow-2xl">
                        <p className="text-xs font-black text-red-500 uppercase tracking-widest">{activeDraft.customer.orderType}</p>
                        <p className="text-3xl font-black text-red-900">{activeDraft.customer.name}</p>
                        <p className="text-lg font-bold text-red-800/70 mt-2">Pagamento: {activeDraft.customer.paymentMethod}</p>
                      </div>
                      <div className="glass-card p-8 rounded-[3rem] space-y-6 shadow-2xl overflow-y-auto">
                        {activeDraft.cart.map(item=>(
                          <div key={item.cartId} className="flex justify-between items-start font-bold border-b-2 border-red-50 pb-4 last:border-0 last:pb-0">
                            <div className="flex-1 pr-4"><p className="text-xl font-black text-red-900 leading-tight">{item.quantity}x {item.name}</p></div>
                            <span className="text-xl font-black text-red-700 whitespace-nowrap">R$ {(item.price*item.quantity).toFixed(2)}</span>
                          </div>))}
                      </div>
                      <div className="p-4 flex flex-col items-center"><p className="text-6xl font-black text-red-700 tracking-tighter">R$ {activeDraft.cart.reduce((s,i)=>s+(i.price*i.quantity),0).toFixed(2)}</p></div>
                    </div>
                    <div className="fixed bottom-20 left-0 right-0 glass p-10 z-30 animate-slide-up"><Button onClick={handleFinish} fullWidth className="py-8 text-3xl shadow-red-200 animate-pulse">CONFIRMAR PEDIDO! ✅</Button></div>
                  </div>
                )}
            </div>
        )}

        {reportData && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-fade-in">
            <div className="glass-card w-full max-w-sm rounded-[4rem] p-12 text-center shadow-2xl border-4 border-red-100">
                <h3 className="text-3xl font-black text-red-600 mb-10">{reportData.title}</h3>
                <div className="space-y-8 mb-12">
                    <div className="flex flex-col"><span className="text-6xl font-black text-red-700 tracking-tighter">R$ {reportData.total.toFixed(2)}</span></div>
                    <div className="flex flex-col"><span className="text-4xl font-black text-red-900">{reportData.count} pedidos</span></div>
                </div>
                <Button onClick={()=>setReportData(null)} fullWidth>FECHAR</Button>
            </div>
          </div>
        )}

        {/* BOTAO ADMIN NO RODAPÉ - VERMELHO */}
        <div className="fixed bottom-4 left-0 right-0 flex justify-center z-[100] no-print">
          <button 
            onClick={handleAdminAccess} 
            className="bg-red-600 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-xl hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2 border-2 border-white"
          >
            <span>⚙️</span> Painel Sandra
          </button>
        </div>

        <ProductModal product={selectedProduct} isOpen={!!selectedProduct} onClose={()=>setSelectedProduct(null)} onConfirm={item=>{updateDraft({cart:[...(activeDraft?.cart||[]), item]}); setSelectedProduct(null);}} />
        <ManualItemModal isOpen={isManualModalOpen} onClose={()=>setIsManualModalOpen(false)} onConfirm={item=>{updateDraft({cart:[...(activeDraft?.cart||[]), item]}); setIsManualModalOpen(false);}} />
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        
        @media print {
          .no-print { display: none !important; }
          .printable-area { display: block !important; width: 100% !important; background: white !important; }
          .printable-content { color: black !important; background: white !important; font-family: 'Courier Prime', monospace; }
        }
      `}</style>
    </div>
  );
}
