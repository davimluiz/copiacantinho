
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';

import { db } from './firebase';
import { Button } from './components/Button';
import { Input, Select } from './components/Input';
import { 
    CATEGORIES, PRODUCTS, PAYMENT_METHODS, 
    EXTRAS_OPTIONS, ACAI_COMPLEMENTS, ACAI_TOPPINGS, 
    ACAI_FRUITS, ACAI_PAID_EXTRAS
} from './constants';
import { Product, CustomerInfo, CartItem, PaymentMethod, OrderType } from './types';

type AppView = 'HOME' | 'ORDER' | 'LOGIN' | 'ADMIN' | 'SUCCESS';
type OrderStep = 'MENU' | 'TYPE_SELECTION' | 'FORM' | 'SUMMARY';
type AdminTab = 'novo' | 'preparando' | 'concluido' | 'cancelado';

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

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity no-print ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-fade-in">
        <div className="p-6 border-b border-red-50 flex justify-between items-center bg-red-50/30">
          <div>
            <h3 className="text-xl font-black text-red-800 leading-none italic">{product.name}</h3>
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

          {isAcai && (
            <section className="space-y-8">
              <button onClick={() => setIsAcaiComplete(!isAcaiComplete)} className={`w-full py-5 rounded-[2rem] text-xs font-black uppercase border-b-4 transition-all shadow-xl ${isAcaiComplete ? 'bg-green-600 border-green-800 text-white scale-105' : 'bg-red-700 border-red-900 text-white'}`}>
                {isAcaiComplete ? 'AÇAÍ COMPLETO ATIVADO! ✅' : 'QUER O AÇAÍ COMPLETO? (TUDO INCLUSO)'}
              </button>
              <div className={isAcaiComplete ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Complementos</label>
                <div className="grid grid-cols-2 gap-2">
                    {ACAI_COMPLEMENTS.map(item => (
                        <button key={item} onClick={() => toggleAddition(item)} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${additions.includes(item) ? 'bg-red-700 border-red-700 text-white' : 'bg-white border-zinc-100 text-zinc-400'}`}>
                            {additions.includes(item) ? '✓ ' : '+ '} {item}
                        </button>
                    ))}
                </div>
              </div>
              <div className={isAcaiComplete ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Coberturas</label>
                <div className="grid grid-cols-2 gap-2">
                    {ACAI_TOPPINGS.map(item => (
                        <button key={item} onClick={() => toggleAddition(item)} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${additions.includes(item) ? 'bg-red-700 border-red-700 text-white' : 'bg-white border-zinc-100 text-zinc-400'}`}>
                            {additions.includes(item) ? '✓ ' : '+ '} {item}
                        </button>
                    ))}
                </div>
              </div>
              <div className={isAcaiComplete ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Frutas</label>
                <div className="grid grid-cols-2 gap-2">
                    {ACAI_FRUITS.map(item => (
                        <button key={item} onClick={() => toggleAddition(item)} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${additions.includes(item) ? 'bg-red-700 border-red-700 text-white' : 'bg-white border-zinc-100 text-zinc-400'}`}>
                            {additions.includes(item) ? '✓ ' : '+ '} {item}
                        </button>
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

          {!isAcai && !isBebidas && (
            <section>
              <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Retirar algo?</label>
              <textarea className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] p-4 text-zinc-800 focus:outline-none focus:border-red-500 min-h-[80px] text-sm font-medium" placeholder="Digite o que deseja tirar..." value={removedText} onChange={e => setRemovedText(e.target.value)} />
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
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (view === 'ADMIN' && isLoggedIn) {
      const q = query(collection(db, 'pedidos'), orderBy('criadoEm', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.error(err));
      return () => unsubscribe();
    }
  }, [view, isLoggedIn]);

  const total = cart.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

  const reports = useMemo(() => {
    const now = Date.now();
    const completed = orders.filter(o => o.status === 'concluido');
    let weeklyTotal = 0; let monthlyTotal = 0;
    completed.forEach(o => {
      const orderDate = o.criadoEm?.toDate ? o.criadoEm.toDate().getTime() : 0;
      if (now - orderDate < 7 * 24 * 60 * 60 * 1000) weeklyTotal += Number(o.total || 0);
      if (now - orderDate < 30 * 24 * 60 * 60 * 1000) monthlyTotal += Number(o.total || 0);
    });
    return { weeklyTotal, monthlyTotal };
  }, [orders]);

  const filteredOrders = useMemo(() => orders.filter(o => o.status === adminTab), [orders, adminTab]);

  const handleFinishOrder = async () => {
    if (isSending) return;
    const clientName = customer.name.trim();
    if (!clientName || cart.length === 0) { alert("Informe seu nome e escolha itens."); return; }
    setIsSending(true);
    try {
      await addDoc(collection(db, 'pedidos'), {
        nomeCliente: clientName, 
        itens: cart.map(i => `${i.quantity}x ${i.name} ${i.flavor ? '('+i.flavor+')' : ''}`).join('\n'), 
        total: Number(total.toFixed(2)),
        status: "novo", criadoEm: serverTimestamp(), telefone: customer.phone || "N/A",
        tipo: customer.orderType, pagamento: customer.paymentMethod,
        endereco: customer.orderType === OrderType.DELIVERY ? `${customer.address}, ${customer.addressNumber}` : "Balcão"
      });
      setCart([]); setView('SUCCESS'); setTimeout(() => setView('HOME'), 4500);
    } catch (err) { alert('Erro ao enviar: ' + err); setIsSending(false); }
  };

  const updateOrderStatus = async (orderId: string, newStatus: AdminTab) => {
    try { await updateDoc(doc(db, 'pedidos', orderId), { status: newStatus }); } catch (e) { console.error(e); }
  };

  const deleteOrder = async (orderId: string) => {
    if(window.confirm("Deseja cancelar/excluir este pedido? Ele irá para a lixeira.")) {
      await updateOrderStatus(orderId, 'cancelado');
    }
  };

  const printOrder = (order: any) => {
    setReceiptOrder(order);
    setTimeout(() => { window.print(); setReceiptOrder(null); }, 500);
  };

  if (view === 'SUCCESS') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-50 fixed inset-0 z-[500] no-print animate-fade-in">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm shadow-2xl border-green-200 border-2 bg-white">
        <div className="text-6xl mb-6">✅</div>
        <h2 className="text-2xl font-black text-green-600 mb-4 italic uppercase">Recebido!</h2>
        <Button onClick={() => setView('HOME')} variant="secondary" className="mt-8 rounded-full">Início</Button>
      </div>
    </div>
  );

  if (view === 'LOGIN') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 no-print">
        <div className="glass-card p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl bg-white border border-red-50">
            <h2 className="text-2xl font-black text-red-800 mb-6 text-center italic uppercase">Cozinha</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const user = (formData.get('user') as string)?.toLowerCase();
                const pass = formData.get('pass') as string;
                if ((user === 'sandra' && pass === 'Cantinho@2026') || (user === 'admin' && pass === 'admin@1234')) {
                    setIsLoggedIn(true); setView('ADMIN');
                } else alert("Acesso não autorizado.");
            }} className="space-y-4">
                <Input label="Usuário" name="user" required />
                <Input label="Senha" name="pass" type="password" required />
                <Button type="submit" fullWidth className="py-4 rounded-xl">ACESSAR</Button>
                <button type="button" onClick={() => setView('HOME')} className="w-full text-zinc-300 font-black text-[9px] mt-4 uppercase tracking-widest">← Voltar</button>
            </form>
        </div>
    </div>
  );

  if (view === 'ADMIN') return (
    <div className="min-h-screen bg-zinc-50 pb-40">
      <div className="p-6 max-w-7xl mx-auto no-print">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-xl border border-red-50 gap-4">
          <div><h2 className="text-2xl font-black text-red-800 italic uppercase">Cozinha</h2></div>
          <div className="flex flex-wrap justify-center gap-2">
            {(['novo', 'preparando', 'concluido', 'cancelado'] as AdminTab[]).map(tab => (
              <button key={tab} onClick={() => setAdminTab(tab)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${adminTab === tab ? 'bg-red-700 text-white shadow-lg' : 'bg-white text-zinc-400 border border-zinc-100'}`}>
                {tab === 'novo' ? 'Novos' : tab === 'preparando' ? 'Preparando' : tab === 'concluido' ? 'Concluídos' : 'Lixeira'}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => { setIsLoggedIn(false); setView('HOME'); }} className="px-5 py-2 rounded-xl text-[9px] font-black uppercase">SAIR</Button>
        </header>

        {adminTab === 'concluido' && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-green-100 shadow-sm text-center">
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Total Semanal</p>
              <p className="text-2xl font-black text-green-600 italic">R$ {reports.weeklyTotal.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm text-center">
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Total Mensal</p>
              <p className="text-2xl font-black text-blue-600 italic">R$ {reports.monthlyTotal.toFixed(2)}</p>
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
                </div>
                <div className="flex-1 bg-zinc-50 p-4 rounded-xl text-[10px] font-bold text-zinc-700 border border-zinc-100 whitespace-pre-wrap">{o.itens}</div>
                <div className="flex items-center gap-3 flex-wrap">
                   <p className="text-xl font-black text-red-700 italic min-w-[100px]">R$ {Number(o.total || 0).toFixed(2)}</p>
                   <div className="flex gap-2">
                     <button onClick={() => printOrder(o)} className="w-10 h-10 bg-zinc-900 text-white rounded-[0.8rem] flex items-center justify-center text-lg shadow-md hover:scale-105 active:scale-95 transition-all">🖨️</button>
                     {o.status === 'novo' && (
                       <>
                         <button onClick={() => updateOrderStatus(o.id, 'preparando')} className="bg-orange-500 text-white px-4 h-10 rounded-xl text-[9px] font-black uppercase shadow-md hover:brightness-110 active:scale-95 transition-all">Em Preparação</button>
                         <button onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 text-white px-4 h-10 rounded-xl text-[9px] font-black uppercase shadow-md hover:brightness-110 active:scale-95 transition-all">Concluído</button>
                       </>
                     )}
                     {o.status === 'preparando' && (
                        <button onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 text-white px-4 h-10 rounded-xl text-[9px] font-black uppercase shadow-md hover:brightness-110 active:scale-95 transition-all">Concluído</button>
                     )}
                     {o.status !== 'cancelado' && (
                        <button onClick={() => deleteOrder(o.id)} className="w-10 h-10 bg-red-100 text-red-600 rounded-[0.8rem] flex items-center justify-center text-lg hover:bg-red-600 hover:text-white transition-all">🗑️</button>
                     )}
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="printable-area hidden"><Receipt order={receiptOrder} /></div>
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
            <Button fullWidth onClick={() => setView('ORDER')} className="text-xl py-5 shadow-xl flex items-center justify-center gap-4 group rounded-[2rem] border-b-4 border-red-800">
              FAZER PEDIDO <span className="text-3xl group-hover:translate-x-3 transition-transform">➡</span>
            </Button>
            {/* Oculto no celular */}
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
                            <button onClick={() => setView('HOME')} className="text-red-800 font-black text-[9px] uppercase tracking-widest px-3 py-1 bg-red-50 rounded-full">← Sair</button>
                            <h2 className="font-black text-red-900 uppercase tracking-[0.15em] text-[10px] italic uppercase">Cardápio</h2>
                            <div className="w-10"></div>
                        </div>
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Pesquisar..." className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-3 px-10 text-[11px] font-bold text-red-900 outline-none" />
                    </header>
                    <div className="p-4 flex gap-3 overflow-x-auto no-scrollbar py-5 border-b border-zinc-50 bg-white">
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-shrink-0 px-5 py-3 rounded-full font-black text-[9px] uppercase transition-all ${activeCategory === cat.id ? 'bg-red-700 text-white shadow-lg' : 'bg-zinc-50 text-zinc-400'}`}>
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-5 space-y-4 pb-44 overflow-y-auto bg-zinc-50/10">
                        {PRODUCTS.filter(p => (searchTerm === '' ? p.categoryId === activeCategory : p.name.toLowerCase().includes(searchTerm.toLowerCase()))).map(prod => (
                            <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="bg-white border border-zinc-50 p-5 rounded-[2rem] flex justify-between items-center shadow-md active:scale-95 transition-all cursor-pointer">
                                <div className="flex-1 pr-4">
                                    <h3 className="text-lg font-black text-red-950 mb-0.5 italic uppercase">{prod.name}</h3>
                                    <p className="text-red-600 font-black text-base italic">R$ {prod.price.toFixed(2)}</p>
                                </div>
                                <div className="w-10 h-10 bg-red-700 text-white rounded-[1rem] flex items-center justify-center text-2xl font-black shadow-lg">+</div>
                            </div>
                        ))}
                    </div>
                    {cart.length > 0 && (
                        <div className="fixed bottom-8 left-6 right-6 z-50 animate-slide-up max-w-lg mx-auto">
                            <Button fullWidth onClick={() => setStep('TYPE_SELECTION')} className="py-5 text-lg flex justify-between items-center px-8 shadow-2xl rounded-[2rem] border-b-4 border-red-900">
                                <span className="font-black italic uppercase">Sacola ({cart.length})</span>
                                <span className="bg-white/20 px-5 py-1.5 rounded-xl text-base font-black">R$ {total.toFixed(2)}</span>
                            </Button>
                        </div>
                    )}
                </>
            )}

            {step === 'TYPE_SELECTION' && (
                <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] animate-fade-in space-y-10">
                    <h2 className="text-4xl font-black text-red-900 tracking-tighter italic text-center uppercase">Tipo de Pedido</h2>
                    <div className="grid grid-cols-1 w-full gap-5 max-w-sm">
                        <button onClick={() => { setCustomer({...customer, orderType: OrderType.DELIVERY}); setStep('FORM'); }} className="bg-zinc-50 border p-8 rounded-[2.5rem] shadow-lg group active:scale-95 transition-all">
                            <span className="text-6xl block mb-4">🛵</span>
                            <span className="font-black text-red-950 text-xl uppercase italic">Delivery</span>
                        </button>
                        <button onClick={() => { setCustomer({...customer, orderType: OrderType.COUNTER}); setStep('FORM'); }} className="bg-zinc-50 border p-8 rounded-[2.5rem] shadow-lg group active:scale-95 transition-all">
                            <span className="text-6xl block mb-4">🥡</span>
                            <span className="font-black text-red-950 text-xl uppercase italic">Balcão</span>
                        </button>
                    </div>
                    <button onClick={() => setStep('MENU')} className="text-zinc-300 font-black uppercase text-[9px] tracking-[0.2em] hover:text-red-700 transition-all">← Voltar</button>
                </div>
            )}

            {step === 'FORM' && (
                <div className="p-8 animate-fade-in pb-44">
                    <h2 className="text-3xl font-black text-red-800 mb-8 tracking-tighter italic uppercase">Seus Dados</h2>
                    <form onSubmit={(e) => { e.preventDefault(); setStep('SUMMARY'); }} className="space-y-4">
                        <Input label="Nome" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Seu nome..." required />
                        <Input label="WhatsApp" type="tel" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="(00) 00000-0000" required />
                        {customer.orderType === OrderType.DELIVERY && (
                            <>
                                <Input label="Endereço" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="Rua e Bairro..." required />
                                <Input label="Número" value={customer.addressNumber} onChange={e => setCustomer({...customer, addressNumber: e.target.value})} placeholder="Número da casa..." required />
                            </>
                        )}
                        <Select label="Pagamento" options={PAYMENT_METHODS} value={customer.paymentMethod} onChange={e => setCustomer({...customer, paymentMethod: e.target.value as PaymentMethod})} />
                        <Button type="submit" fullWidth className="py-5 text-lg mt-10 rounded-[1.5rem] uppercase italic border-b-4 border-red-900 shadow-xl">Revisar Pedido</Button>
                    </form>
                </div>
            )}

            {step === 'SUMMARY' && (
                <div className="p-8 animate-fade-in pb-44">
                    <h2 className="text-3xl font-black text-red-800 mb-6 tracking-tighter italic uppercase">Confirmação</h2>
                    <div className="bg-zinc-50 p-6 rounded-[2rem] mb-8 space-y-6 shadow-xl border border-white relative overflow-hidden">
                        <div className="border-b border-zinc-200 pb-5">
                            <p className="text-2xl font-black text-red-950 italic uppercase">{customer.name}</p>
                            <p className="text-sm font-black text-green-600 uppercase italic mt-1">{customer.phone}</p>
                        </div>
                        <div className="space-y-4">
                            {cart.map(item => (
                                <div key={item.cartId} className="flex justify-between items-start">
                                    <div className="flex-1 pr-6">
                                        <p className="font-black text-red-950 text-lg leading-none italic uppercase">{item.quantity}x {item.name}</p>
                                        <div className="text-[8px] text-zinc-400 font-bold mt-2 uppercase">
                                            {item.flavor && <span className="block text-red-600 italic font-black">✓ {item.flavor}</span>}
                                            {item.removedIngredients?.map(i => <span key={i} className="block text-red-400">× SEM {i}</span>)}
                                            {item.additions?.map(i => <span key={i} className="block text-green-600">✓ COM {i}</span>)}
                                        </div>
                                    </div>
                                    <p className="font-black text-red-800 text-lg italic">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-zinc-200 pt-5 flex justify-between items-center">
                            <span className="text-lg font-black text-zinc-300 italic uppercase">Total</span>
                            <span className="text-3xl font-black text-red-700 italic">R$ {total.toFixed(2)}</span>
                        </div>
                    </div>
                    <Button onClick={handleFinishOrder} disabled={isSending} fullWidth className={`py-5 text-2xl shadow-2xl rounded-[2.5rem] border-b-[8px] border-b-red-950 ${isSending ? 'opacity-60 scale-95' : 'animate-pulse-slow active:scale-90 transition-all'}`}>
                        {isSending ? 'ENVIANDO...' : 'FINALIZAR! ✅'}
                    </Button>
                    <button onClick={() => setStep('FORM')} className="w-full mt-6 text-zinc-300 font-black text-[9px] text-center uppercase tracking-widest hover:text-red-700">← Corrigir Dados</button>
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
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        
        @media print {
            body { background: white !important; padding: 0 !important; margin: 0 !important; }
            .no-print { display: none !important; }
            .printable-area { display: block !important; visibility: visible !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
            #root > div:not(.printable-area) { display: none !important; }
        }
      `}</style>
    </div>
  );
}
