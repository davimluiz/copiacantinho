
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  serverTimestamp,
  deleteDoc,
  addDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';

import { db } from './firebase';
import { Button } from './components/Button';
import { Input, Select } from './components/Input';
import { 
    CATEGORIES, PRODUCTS, PAYMENT_METHODS, 
    ACAI_COMPLEMENTS, ACAI_TOPPINGS, 
    ACAI_FRUITS, ACAI_PAID_EXTRAS, DELIVERY_FEES, FRANGUINHO_SIDES
} from './constants';
import { Product, CustomerInfo, CartItem, PaymentMethod, OrderType, Promotion } from './types';

type AppView = 'HOME' | 'ORDER' | 'LOGIN' | 'ADMIN' | 'SUCCESS' | 'PROMOTIONS';
type OrderStep = 'MENU' | 'CART_REVIEW' | 'TYPE_SELECTION' | 'FORM' | 'SUMMARY';
type AdminTab = 'novo' | 'preparando' | 'concluido' | 'cancelado' | 'promos' | 'config';

const Receipt = ({ order, stats }: { order: any | null, stats?: any | null }) => {
    if (stats) {
        return (
            <div className="w-full max-w-[80mm] mx-auto text-black font-mono text-[14px] font-bold p-4 bg-white border border-zinc-200 shadow-sm printable-content">
                <div className="text-center mb-4 border-b border-dashed border-black pb-2">
                    <h1 className="font-bold text-lg uppercase italic">RESUMO DE VENDAS</h1>
                    <p className="text-[10px]">CANTINHO DA SANDRA</p>
                    <p className="text-[10px]">{new Date().toLocaleString('pt-BR')}</p>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between border-b border-dashed border-black pb-1">
                        <span className="font-bold">TOTAL VENDAS HOJE:</span>
                        <span>R$ {stats.daily.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-black pb-1">
                        <span className="font-bold">TOTAL ENTREGAS HOJE:</span>
                        <span>R$ {stats.deliveryDaily.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-black pb-1 border-t mt-2 pt-2">
                        <span className="font-bold">ESTA SEMANA (VENDAS):</span>
                        <span>R$ {stats.weekly.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-black pb-1">
                        <span className="font-bold">ESTE MES (VENDAS):</span>
                        <span>R$ {stats.monthly.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        );
    }
    if (!order) return null;
    const date = order.criadoEm?.toDate ? order.criadoEm.toDate().toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
    return (
        <div className="w-full max-w-[80mm] mx-auto text-black font-mono text-[14px] font-bold p-4 bg-white border border-zinc-200 shadow-sm printable-content">
            <div className="text-center mb-4 border-b border-dashed border-black pb-2">
                <h1 className="font-bold text-lg uppercase italic">Cantinho da Sandra</h1>
                <p className="text-[10px]">ID: {(order.id || '').slice(-6).toUpperCase()}</p>
            </div>
            <div className="mb-2">
                <p><strong>CLIENTE:</strong> {String(order.nomeCliente || '').toUpperCase()}</p>
                <p><strong>DATA:</strong> {date}</p>
                <p><strong>TIPO:</strong> {order.tipo || 'RETIRADA NA LANCHONETE'}</p>
                <p><strong>FONE:</strong> {order.telefone || 'N/A'}</p>
                {order.endereco && (
                    <div className="mt-1 border border-black p-1">
                        <p className="leading-tight font-bold underline uppercase">ENDEREÇO / LOCAL:</p>
                        <p className="leading-tight uppercase break-words">{order.endereco}</p>
                    </div>
                )}
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            <div className="mb-2">
                <p className="font-bold mb-1 uppercase text-[12px] underline">DETALHES DO PEDIDO:</p>
                <p className="whitespace-pre-wrap leading-tight text-[12px]">{order.itens || 'Nenhum item'}</p>
            </div>
            {(order.frete || 0) > 0 && (
                <div className="mb-2 border-t border-dashed border-black pt-1">
                   <p><strong>FRETE ({order.bairro || ''}):</strong> R$ {Number(order.frete).toFixed(2)}</p>
                </div>
            )}
            <div className="border-t border-dashed border-black mt-2 pt-2 text-right">
                <p className="text-lg font-bold">TOTAL: R$ {Number(order.total || 0).toFixed(2)}</p>
                <p className="text-[11px] uppercase font-bold">{order.pagamento || 'N/A'}</p>
            </div>
        </div>
    );
};

const EditOrderModal = ({ order, isOpen, onClose, onSave }: any) => {
    const [editedItens, setEditedItens] = useState('');
    const [editedPayment, setEditedPayment] = useState('');
    useEffect(() => {
        if (isOpen && order) {
            setEditedItens(order.itens || '');
            setEditedPayment(order.pagamento || '');
        }
    }, [isOpen, order]);
    if (!order) return null;
    const hasChanged = editedItens !== (order.itens || '') || editedPayment !== (order.pagamento || '');
    return (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity no-print ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-fade-in">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                    <div>
                        <h3 className="text-xl font-black text-red-800 leading-none italic uppercase">Editar Pedido</h3>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">Cliente: {order.nomeCliente}</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-300 hover:text-red-600 text-3xl leading-none transition-colors">&times;</button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <section>
                        <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Itens do Pedido</label>
                        <textarea className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 text-sm font-bold text-red-900 outline-none min-h-[200px]" value={editedItens} onChange={e => setEditedItens(e.target.value)} />
                    </section>
                    <section>
                        <Select label="Forma de Pagamento" options={PAYMENT_METHODS} value={editedPayment} onChange={e => setEditedPayment(e.target.value)} />
                    </section>
                </div>
                <div className="p-6 bg-zinc-50/80 border-t border-zinc-100 flex gap-3">
                    <Button variant="secondary" onClick={onClose} className="flex-1 rounded-xl">CANCELAR</Button>
                    <Button disabled={!hasChanged} onClick={() => onSave({ ...order, itens: editedItens, pagamento: editedPayment })} className="flex-1 rounded-xl">SALVAR ALTERAÇÕES</Button>
                </div>
            </div>
        </div>
    );
};

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
      if (hasPicanha) { extraPrice += 4.50; finalAdditions.push("Bife Picanha (R$ 4,50)"); }
      if (hasTurbine) { extraPrice += 10.00; finalAdditions.push("TURBO: Batata 150g + Juninho (R$ 10,00)"); }
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
    if (isBebidas && product.needsZeroOption) { finalFlavor = isZero ? "Zero" : "Normal"; }
    onConfirm({ ...product, cartId: Date.now().toString(), quantity, removedIngredients: removedText.trim() ? [removedText.trim()] : [], additions: finalAdditions, observation, flavor: finalFlavor, price: Number(product.price) + Number(extraPrice) });
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
            <h3 className="text-xl font-black text-red-800 leading-none italic uppercase">{product.name}</h3>
            {product.unit && <p className="text-[10px] font-black text-red-600/60 uppercase tracking-widest mt-1 italic">{product.unit}</p>}
            <p className="text-red-600 font-black mt-1">R$ {product.price.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="text-zinc-300 hover:text-red-600 text-3xl leading-none transition-colors">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section><label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Quantidade</label>
            <div className="flex items-center gap-6">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-[0.8rem] bg-zinc-50 text-red-600 font-black text-xl hover:bg-zinc-100 transition-all">-</button>
              <span className="text-2xl font-black text-red-900 italic">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-[0.8rem] bg-zinc-50 text-red-600 font-black text-xl hover:bg-zinc-100 transition-all">+</button>
            </div>
          </section>
          {isLanche && (
            <div className="space-y-6">
               <section className="bg-red-50/50 p-4 rounded-2xl border border-red-100"><label className="block text-red-900/40 text-[10px] font-black uppercase mb-2 tracking-[0.2em]">Ingredientes Inclusos</label><p className="text-[11px] font-bold text-red-800 uppercase italic leading-relaxed">{product.ingredients?.join(', ')}</p></section>
               <section><label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Retirar algo?</label><textarea className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] p-4 text-zinc-800 focus:outline-none focus:border-red-500 min-h-[80px] text-sm font-medium" placeholder="Digite o que deseja tirar..." value={removedText} onChange={e => setRemovedText(e.target.value)} /></section>
               <section className="space-y-4"><label className="block text-red-900/40 text-[10px] font-black uppercase mb-1 tracking-[0.2em]">Adicionais</label>
                  <button onClick={() => setHasPicanha(!hasPicanha)} className={`w-full p-4 rounded-2xl text-[11px] font-black uppercase border-2 flex justify-between items-center transition-all ${hasPicanha ? 'bg-red-700 border-red-700 text-white shadow-lg' : 'bg-white border-zinc-100 text-zinc-400'}`}><span>Bife de Picanha</span><span className={hasPicanha ? 'text-white' : 'text-red-600'}>+ R$ 4,50</span></button>
                  <button onClick={() => setHasTurbine(!hasTurbine)} className={`w-full py-5 px-6 rounded-[2rem] text-[10px] font-black uppercase transition-all shadow-xl border-4 border-white border-b-8 border-b-red-950 ${hasTurbine ? 'bg-green-600 text-white scale-105' : 'bg-red-600 text-white hover:bg-red-700'}`}>{hasTurbine ? 'LANCHE TURBINADO! ✅' : 'TURBINE SEU LANCHE POR + 10R$ (150G DE BATATA E UM JUNINHO)'}</button>
               </section>
            </div>
          )}
          <section><label className="block text-red-900/40 text-[10px] font-black uppercase mb-3 tracking-[0.2em]">Observação do Item</label><textarea className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] p-4 text-zinc-800 focus:outline-none min-h-[80px] text-sm font-medium" placeholder="Algum detalhe a mais?" value={observation} onChange={e => setObservation(e.target.value)} /></section>
        </div>
        <div className="p-6 bg-zinc-50/80 border-t border-zinc-100"><Button fullWidth onClick={handleConfirm} className="py-4 text-base rounded-[1.5rem]">ADICIONAR AO CARRINHO</Button></div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<AppView>('HOME');
  const [step, setStep] = useState<OrderStep>('MENU');
  const [adminTab, setAdminTab] = useState<AdminTab>('novo');
  const [quickSaleCat, setQuickSaleCat] = useState<'balcao' | 'bebidas'>('balcao');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '', phone: '', address: '', neighborhood: '', addressNumber: '', reference: '', deliveryFee: 0, tableNumber: '',
    orderType: OrderType.DELIVERY, paymentMethod: PaymentMethod.PIX, needsChange: false, changeAmount: ''
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [config, setConfig] = useState({ mode: 'auto' }); // auto, open, closed
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [receiptStats, setReceiptStats] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOutroAlert, setShowOutroAlert] = useState(false);
  const [promoAlert, setPromoAlert] = useState<string | null>(null);

  useEffect(() => {
    const unsubPromos = onSnapshot(collection(db, 'promocoes'), (snapshot) => {
        setPromos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promotion)));
    });
    const unsubConfig = onSnapshot(doc(db, 'config', 'loja'), (snapshot) => {
        if (snapshot.exists()) setConfig(snapshot.data() as any);
        else setDoc(doc(db, 'config', 'loja'), { mode: 'auto' });
    });
    return () => { unsubPromos(); unsubConfig(); };
  }, []);

  useEffect(() => {
    if (view === 'ADMIN' && isLoggedIn) {
      const q = query(collection(db, 'pedidos'), orderBy('criadoEm', 'desc'));
      return onSnapshot(q, (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }
  }, [view, isLoggedIn]);

  const isOpenNow = useMemo(() => {
    if (config.mode === 'open') return true;
    if (config.mode === 'closed') return false;
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon, ..., 3=Wed, 4=Thu, 5=Fri, 6=Sat
    const hour = now.getHours();
    const isWorkingDay = day === 0 || day === 3 || day === 4 || day === 5 || day === 6;
    return isWorkingDay && hour >= 18 && hour < 23;
  }, [config]);

  const itemsTotal = useMemo(() => cart.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0), [cart]);
  const currentFee = (customer.orderType === OrderType.DELIVERY) ? (customer.deliveryFee || 0) : 0;
  const total = itemsTotal + currentFee;
  const filteredOrders = useMemo(() => orders.filter(o => o.status === adminTab), [orders, adminTab]);

  const salesStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 7);
    const completed = orders.filter(o => o.status === 'concluido');
    const daily = completed.filter(o => (o.criadoEm?.toDate ? o.criadoEm.toDate() : null) >= todayStart).reduce((acc, o) => acc + (o.total || 0), 0);
    const deliveryDaily = completed.filter(o => (o.criadoEm?.toDate ? o.criadoEm.toDate() : null) >= todayStart).reduce((acc, o) => acc + (o.frete || 0), 0);
    const weekly = completed.filter(o => (o.criadoEm?.toDate ? o.criadoEm.toDate() : null) >= weekStart).reduce((acc, o) => acc + (o.total || 0), 0);
    const monthly = completed.filter(o => (o.criadoEm?.toDate ? o.criadoEm.toDate().getMonth() === now.getMonth() : false)).reduce((acc, o) => acc + (o.total || 0), 0);
    return { daily, deliveryDaily, weekly, monthly };
  }, [orders]);

  const handleFinishOrder = async () => {
    if (isSending) return;
    const clientName = customer.name.trim();
    if (!clientName || cart.length === 0) { alert("Informe seu nome e escolha itens."); return; }
    setIsSending(true);
    try {
      const groupedItemsText = cart.map(i => `${i.quantity}x ${i.name} - R$ ${i.price.toFixed(2)}`).join('\n');
      let fullAddress = customer.orderType === OrderType.DELIVERY ? `${customer.address}, ${customer.addressNumber} - ${customer.neighborhood}${customer.reference ? ` (${customer.reference})` : ''}` : customer.orderType;
      await addDoc(collection(db, 'pedidos'), { nomeCliente: clientName.toUpperCase(), itens: groupedItemsText, total: Number(total.toFixed(2)), frete: Number(currentFee.toFixed(2)), bairro: customer.neighborhood || "N/A", status: "novo", criadoEm: serverTimestamp(), telefone: customer.phone || "N/A", tipo: customer.orderType, pagamento: customer.paymentMethod, endereco: fullAddress.toUpperCase() });
      setCart([]); setView('SUCCESS'); 
    } catch (err) { alert('Erro ao enviar: ' + err); setIsSending(false); }
  };

  const addPromoToCart = (promo: Promotion) => {
    const item: CartItem = { id: promo.id, name: `PROMO: ${promo.titulo}`, price: promo.valor, categoryId: 'promos', cartId: Date.now().toString(), quantity: 1, isPromotion: true };
    setCart([...cart, item]);
    setPromoAlert(promo.titulo);
  };

  const handleQuickSale = async (product: Product) => {
    try { await addDoc(collection(db, 'pedidos'), { nomeCliente: "VENDA BALCÃO", itens: `1x ${product.name}`, total: Number(product.price.toFixed(2)), frete: 0, bairro: "BALCÃO", status: "concluido", criadoEm: serverTimestamp(), telefone: "N/A", tipo: OrderType.COUNTER, pagamento: PaymentMethod.CASH, endereco: "VENDA LOCAL (BALCÃO)" }); } catch (err) { alert("Erro ao realizar venda rápida."); }
  };

  const handleNeighborhoodChange = (val: string) => {
      const feeObj = DELIVERY_FEES.find(f => f.neighborhood === val);
      setCustomer(prev => ({ ...prev, neighborhood: val, deliveryFee: feeObj?.fee || 0 }));
      setShowOutroAlert(val === 'Outro');
  };

  const updateOrderStatus = async (orderId: string, newStatus: AdminTab) => { try { await updateDoc(doc(db, 'pedidos', orderId), { status: newStatus }); } catch (e) { console.error(e); } };
  const saveEditedOrder = async (updatedOrder: any) => { try { await updateDoc(doc(db, 'pedidos', updatedOrder.id), { itens: updatedOrder.itens, pagamento: updatedOrder.pagamento }); setEditingOrder(null); } catch (e) { alert("Erro ao salvar edição."); } };
  const deleteOrderPermanently = async (orderId: string) => { if (window.confirm("Excluir definitivamente?")) { try { await deleteDoc(doc(db, 'pedidos', orderId)); } catch (e) { alert("Não foi possível excluir."); } } };
  const printOrder = (order: any) => { setReceiptOrder(order); setReceiptStats(null); setTimeout(() => { window.print(); setReceiptOrder(null); }, 500); };
  const printSalesSummary = () => { setReceiptStats(salesStats); setReceiptOrder(null); setTimeout(() => { window.print(); setReceiptStats(null); }, 500); };

  // --- SUB-TELA DE ADMINISTRAÇÃO DE PROMOÇÕES ---
  const PromoManager = () => {
    const [title, setTitle] = useState('');
    const [itens, setItens] = useState('');
    const [price, setPrice] = useState('');
    const handleAddPromo = async () => {
        if (!title || !itens || !price) return;
        await addDoc(collection(db, 'promocoes'), { titulo: title, itens, valor: parseFloat(price) });
        setTitle(''); setItens(''); setPrice('');
    };
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-red-50 shadow-sm">
                <h3 className="text-sm font-black text-red-800 uppercase italic mb-4">Cadastrar Nova Promoção</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Título da Promoção" value={title} onChange={e => setTitle(e.target.value)} />
                    <Input label="Valor (R$)" type="number" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div className="mt-4">
                    <label className="block text-red-700 text-sm font-bold mb-2 ml-1">Itens Inclusos</label>
                    <textarea className="w-full bg-zinc-900 text-white p-4 rounded-2xl outline-none" value={itens} onChange={e => setItens(e.target.value)} placeholder="Ex: X-Tudo + Refri Mini" />
                </div>
                <Button onClick={handleAddPromo} className="mt-4 w-full">SALVAR PROMOÇÃO</Button>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {promos.map(p => (
                    <div key={p.id} className="bg-white p-6 rounded-3xl border border-red-50 shadow-md flex justify-between items-center">
                        <div>
                            <h4 className="font-black text-red-800 uppercase italic">{p.titulo}</h4>
                            <p className="text-xs text-zinc-500">{p.itens}</p>
                            <p className="text-green-600 font-bold">R$ {p.valor.toFixed(2)}</p>
                        </div>
                        <button onClick={() => deleteDoc(doc(db, 'promocoes', p.id))} className="bg-red-50 text-red-600 p-3 rounded-full hover:bg-red-100 transition-all">🗑️</button>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  if (!isOpenNow && view !== 'ADMIN' && view !== 'LOGIN') {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="text-8xl mb-8">🌙</div>
            <h1 className="text-4xl font-black text-red-800 italic uppercase mb-4 tracking-tighter leading-none">Estamos Fechados!</h1>
            <p className="text-zinc-500 font-bold text-lg mb-8 max-w-xs">No momento estamos descansando para preparar o melhor para você amanhã!</p>
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                <h2 className="text-red-800 font-black uppercase text-xs italic tracking-widest mb-4">Horário de Funcionamento</h2>
                <p className="text-red-900 font-bold uppercase italic text-sm">Quarta a Domingo<br/>Das 18:00 às 23:00</p>
            </div>
            <button onClick={() => setView('LOGIN')} className="mt-12 text-zinc-200 text-[10px] font-black uppercase tracking-widest">Acesso Restrito</button>
        </div>
    );
  }

  if (view === 'SUCCESS') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-50 fixed inset-0 z-[500] no-print animate-fade-in">
      <div className="glass-card p-10 rounded-[3rem] max-w-sm shadow-2xl border-green-100 border-2 bg-white flex flex-col items-center">
        <div className="text-7xl mb-6 drop-shadow-lg">🎉</div>
        <h2 className="text-2xl font-black text-red-800 mb-4 italic uppercase leading-tight">Pedido realizado com sucesso!</h2>
        <div className="flex flex-col gap-3 w-full">
            <a href="https://wa.me/5527992269550?text=Ol%C3%A1%20Sandra%0AAcabei%20de%20realizar%20um%20pedido%20pelo%20site%20e%20gostaria%20de%20confirmar." target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 uppercase italic text-sm border-b-4 border-[#075E54]"><span className="text-xl">💬</span> Confirmar pelo WhatsApp</a>
            <button onClick={() => setView('HOME')} className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 font-black py-4 px-6 rounded-2xl transition-all active:scale-95 uppercase italic text-xs tracking-widest">Voltar ao Início</button>
        </div>
      </div>
    </div>
  );

  if (view === 'LOGIN') return (
    <div className="min-h-screen flex flex-col p-6 bg-zinc-50 no-print animate-fade-in">
        <button onClick={() => setView('HOME')} className="mb-6 self-start bg-white text-red-800 font-black text-[10px] px-6 py-2 rounded-full border border-red-100 shadow-sm uppercase tracking-widest transition-all">← Voltar</button>
        <div className="flex-1 flex items-center justify-center">
            <div className="glass-card p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl bg-white border border-red-50">
                <h2 className="text-2xl font-black text-red-800 mb-6 text-center italic uppercase">Cozinha</h2>
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); if ((fd.get('u') === 'sandra' && fd.get('p') === 'sandra123') || (fd.get('u') === 'admin' && fd.get('p') === 'admin@1234')) { setIsLoggedIn(true); setView('ADMIN'); } else alert("Acesso não autorizado."); }} className="space-y-4">
                    <Input label="Usuário" name="u" required /><Input label="Senha" name="p" type="password" required /><Button type="submit" fullWidth className="py-4">ACESSAR</Button>
                </form>
            </div>
        </div>
    </div>
  );

  if (view === 'ADMIN') return (
    <div className="min-h-screen bg-zinc-50 pb-40">
      <div className="p-6 max-w-7xl mx-auto no-print">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-xl border border-red-50 gap-4">
          <div className="flex items-center gap-4"><button onClick={() => { setIsLoggedIn(false); setView('HOME'); }} className="bg-red-50 text-red-800 p-2 rounded-full hover:bg-red-100">←</button><h2 className="text-2xl font-black text-red-800 italic uppercase">Cozinha</h2></div>
          <div className="flex flex-wrap justify-center gap-2">
            {(['novo', 'preparando', 'concluido', 'cancelado', 'promos', 'config'] as AdminTab[]).map(tab => (
              <button key={tab} onClick={() => setAdminTab(tab)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${adminTab === tab ? 'bg-red-700 text-white shadow-lg' : 'bg-white text-zinc-400 border border-zinc-100'}`}>{tab}</button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => { setIsLoggedIn(false); setView('HOME'); }} className="px-5 py-2 text-[9px]">SAIR</Button>
        </header>

        {adminTab === 'config' && (
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-red-50 animate-fade-in">
                <h3 className="text-lg font-black text-red-800 italic uppercase mb-6">Funcionamento da Lanchonete</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button onClick={() => updateDoc(doc(db, 'config', 'loja'), { mode: 'auto' })} className={`p-8 rounded-3xl border-4 transition-all text-center ${config.mode === 'auto' ? 'bg-red-700 border-red-950 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                        <span className="text-4xl block mb-2">⏰</span>
                        <span className="font-black uppercase italic">Automático</span>
                        <p className="text-[9px] mt-2 opacity-60">Segue o horário cadastrado</p>
                    </button>
                    <button onClick={() => updateDoc(doc(db, 'config', 'loja'), { mode: 'open' })} className={`p-8 rounded-3xl border-4 transition-all text-center ${config.mode === 'open' ? 'bg-green-600 border-green-800 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                        <span className="text-4xl block mb-2">🔓</span>
                        <span className="font-black uppercase italic">Forçar Aberto</span>
                        <p className="text-[9px] mt-2 opacity-60">Lanchonete aberta agora</p>
                    </button>
                    <button onClick={() => updateDoc(doc(db, 'config', 'loja'), { mode: 'closed' })} className={`p-8 rounded-3xl border-4 transition-all text-center ${config.mode === 'closed' ? 'bg-zinc-800 border-black text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                        <span className="text-4xl block mb-2">🔒</span>
                        <span className="font-black uppercase italic">Forçar Fechado</span>
                        <p className="text-[9px] mt-2 opacity-60">Ninguém consegue pedir</p>
                    </button>
                </div>
            </div>
        )}

        {adminTab === 'promos' && <PromoManager />}

        {['novo', 'preparando', 'concluido', 'cancelado'].includes(adminTab) && (
            <div className="space-y-4">
                {adminTab === 'concluido' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-white p-6 rounded-[2rem] shadow-md border-b-4 border-green-500"><p className="text-[10px] font-black text-zinc-400 uppercase italic">Vendas Hoje</p><p className="text-3xl font-black text-green-600 mt-1 italic">R$ {salesStats.daily.toFixed(2)}</p></div>
                        <div className="bg-white p-6 rounded-[2rem] shadow-md border-b-4 border-blue-500"><p className="text-[10px] font-black text-zinc-400 uppercase italic">Últimos 7 Dias</p><p className="text-3xl font-black text-blue-600 mt-1 italic">R$ {salesStats.weekly.toFixed(2)}</p></div>
                        <div className="bg-white p-6 rounded-[2rem] shadow-md border-b-4 border-rose-500"><p className="text-[10px] font-black text-zinc-400 uppercase italic">Fretes Hoje</p><p className="text-3xl font-black text-rose-600 mt-1 italic">R$ {salesStats.deliveryDaily.toFixed(2)}</p></div>
                    </div>
                )}
                {filteredOrders.map(o => (
                  <div key={o.id} className="bg-white p-5 rounded-[1.5rem] border-l-[8px] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-zinc-200">
                    <div className="min-w-[200px]"><p className="text-sm font-black text-red-950 italic uppercase">{o.nomeCliente}</p><p className="text-sm font-black text-green-600 italic mt-1">{o.telefone}</p><p className="text-[9px] font-black text-zinc-400 uppercase mt-2">{o.tipo} • {o.pagamento}</p></div>
                    <div className="flex-1 bg-zinc-50 p-4 rounded-xl text-[10px] font-bold text-zinc-700 whitespace-pre-wrap">{o.itens}</div>
                    <div className="flex items-center gap-3"><p className="text-xl font-black text-red-700 italic min-w-[100px]">R$ {Number(o.total || 0).toFixed(2)}</p>
                       <div className="flex gap-2">
                         <button onClick={() => setEditingOrder(o)} className="w-10 h-10 bg-blue-50 text-blue-600 rounded-[0.8rem] flex items-center justify-center text-lg shadow-md transition-all">📝</button>
                         <button onClick={() => printOrder(o)} className="w-10 h-10 bg-zinc-900 text-white rounded-[0.8rem] flex items-center justify-center text-lg shadow-md transition-all">🖨️</button>
                         {o.status === 'novo' && <><button onClick={() => updateOrderStatus(o.id, 'preparando')} className="bg-orange-500 text-white px-4 h-10 rounded-xl text-[9px] font-black uppercase">Em Preparação</button><button onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 text-white px-4 h-10 rounded-xl text-[9px] font-black uppercase">Concluído</button></>}
                         {o.status === 'preparando' && <button onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 text-white px-4 h-10 rounded-xl text-[9px] font-black uppercase">Concluído</button>}
                         {o.status !== 'cancelado' && <button onClick={() => updateOrderStatus(o.id, 'cancelado')} className="w-10 h-10 bg-red-100 text-red-700 rounded-xl flex items-center justify-center">🗑️</button>}
                         {o.status === 'cancelado' && <button onClick={() => deleteOrderPermanently(o.id)} className="bg-red-700 text-white px-4 h-10 rounded-xl text-[9px] font-black uppercase">Apagar</button>}
                       </div>
                    </div>
                  </div>
                ))}
            </div>
        )}
      </div>
      <EditOrderModal isOpen={!!editingOrder} order={editingOrder} onClose={() => setEditingOrder(null)} onSave={saveEditedOrder} />
      <div className="printable-area hidden"><Receipt order={receiptOrder} stats={receiptStats} /></div>
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
            <div className="space-y-4">
                <Button fullWidth onClick={() => setView('ORDER')} className="text-xl py-5 shadow-xl flex items-center justify-center gap-4 group rounded-[2rem] border-b-4 border-red-800">FAZER PEDIDO <span className="text-3xl group-hover:translate-x-3 transition-transform">➡</span></Button>
                <button onClick={() => setView('PROMOTIONS')} className="w-full bg-yellow-400 border-4 border-yellow-200 text-red-800 font-black py-5 rounded-[2rem] shadow-xl animate-pulse-slow uppercase italic text-lg hover:bg-yellow-500 transition-all flex items-center justify-center gap-3">🔥 VER PROMOÇÕES 🏷️</button>
            </div>
            <button onClick={() => setView('LOGIN')} className="mt-16 text-zinc-200 text-[9px] font-black uppercase tracking-[0.3em] hover:text-red-400 transition-all hidden md:block w-full">Administração</button>
          </div>
        </div>
      )}

      {view === 'PROMOTIONS' && (
        <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-zinc-50 p-6 animate-fade-in no-print">
            <div className="flex justify-between items-center mb-10">
                <button onClick={() => setView('HOME')} className="bg-white text-red-800 p-3 rounded-full shadow-md">←</button>
                <h2 className="text-2xl font-black text-red-800 italic uppercase">Promoções 🔥</h2>
                <div className="w-10"></div>
            </div>
            <div className="space-y-6">
                {promos.length === 0 ? (
                    <div className="text-center py-20 opacity-30 italic font-black uppercase">Nenhuma promoção ativa no momento</div>
                ) : (
                    promos.map(p => (
                        <div key={p.id} className="bg-white rounded-[2.5rem] p-8 border-4 border-yellow-300 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-yellow-400 text-red-800 px-6 py-2 rounded-bl-3xl font-black italic uppercase text-xs">OFERTA</div>
                            <h3 className="text-3xl font-black text-red-800 leading-none italic uppercase mb-2">{p.titulo}</h3>
                            <p className="text-zinc-500 font-bold text-sm mb-6 leading-relaxed">{p.itens}</p>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-zinc-400 text-xs font-black uppercase line-through italic">R$ {(p.valor * 1.3).toFixed(2)}</p>
                                    <p className="text-3xl font-black text-green-600 italic">R$ {p.valor.toFixed(2)}</p>
                                </div>
                                <button onClick={() => addPromoToCart(p)} className="bg-red-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl active:scale-95 transition-all uppercase italic text-xs border-b-4 border-red-950">Adicionar</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <Button onClick={() => setView('ORDER')} variant="secondary" className="mt-12 py-5 rounded-[2rem] border-dashed border-2">VER TODO O CARDÁPIO</Button>
            {promoAlert && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white p-8 rounded-[3rem] text-center max-w-sm w-full shadow-2xl border-4 border-yellow-400">
                        <div className="text-5xl mb-4">🛒</div>
                        <h3 className="text-xl font-black text-red-800 uppercase italic mb-2">Adicionado à Sacola!</h3>
                        <p className="text-zinc-500 font-bold mb-8 uppercase text-xs italic">A promoção "{promoAlert}" já está no seu pedido.</p>
                        <div className="space-y-3">
                            <Button fullWidth onClick={() => { setPromoAlert(null); setView('ORDER'); setStep('MENU'); }} className="py-4">CONTINUAR COMPRANDO</Button>
                            <Button fullWidth variant="secondary" onClick={() => { setPromoAlert(null); setView('ORDER'); setStep('CART_REVIEW'); }} className="py-4">FINALIZAR PEDIDO</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}

      {view === 'ORDER' && (
        <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-white border-x border-zinc-100 shadow-2xl no-print">
            <header className="p-5 bg-white/95 sticky top-0 z-50 border-b border-zinc-100 flex justify-between items-center backdrop-blur-md">
                <button onClick={() => { if(step === 'MENU') setView('HOME'); else setStep('MENU'); }} className="text-red-800 font-black text-[9px] uppercase tracking-widest px-3 py-1 bg-red-50 rounded-full">← Voltar</button>
                <div className="flex gap-2">
                    <button onClick={() => setView('PROMOTIONS')} className="bg-yellow-400 text-red-800 px-4 py-1.5 rounded-full text-[9px] font-black uppercase italic shadow-sm">Promos 🔥</button>
                    {step !== 'MENU' && <button onClick={() => setStep('MENU')} className="bg-zinc-100 text-zinc-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase italic">Cardápio 📖</button>}
                </div>
            </header>
            {step === 'MENU' && (
                <>
                    <div className="p-5">
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="O que vamos comer hoje?..." className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 px-10 text-[11px] font-bold text-red-900 outline-none shadow-inner" />
                    </div>
                    <div className="p-4 flex gap-3 overflow-x-auto no-scrollbar pb-5 bg-white">
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-shrink-0 px-5 py-3 rounded-full font-black text-[9px] uppercase transition-all ${activeCategory === cat.id ? 'bg-red-700 text-white shadow-lg' : 'bg-zinc-50 text-zinc-400'}`}>{cat.icon} {cat.name}</button>
                        ))}
                    </div>
                    <div className="flex-1 p-5 space-y-4 pb-44 overflow-y-auto">
                        {PRODUCTS.filter(p => (searchTerm === '' ? p.categoryId === activeCategory : p.name.toLowerCase().includes(searchTerm.toLowerCase()))).map(prod => (
                            <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="bg-white border border-zinc-50 p-5 rounded-[2rem] flex justify-between items-center shadow-md active:scale-95 transition-all cursor-pointer">
                                <div className="flex-1 pr-4">
                                    <h3 className="text-lg font-black text-red-950 italic uppercase">{prod.name}</h3>
                                    <p className="text-red-600 font-black text-base italic">R$ {prod.price.toFixed(2)}</p>
                                </div>
                                <div className="w-10 h-10 bg-red-700 text-white rounded-[1rem] flex items-center justify-center text-2xl font-black">+</div>
                            </div>
                        ))}
                    </div>
                    {cart.length > 0 && <div className="fixed bottom-8 left-6 right-6 z-50 animate-slide-up max-w-lg mx-auto"><Button fullWidth onClick={() => setStep('CART_REVIEW')} className="py-5 text-lg flex justify-between items-center px-8 shadow-2xl rounded-[2rem] border-b-4 border-red-900"><span className="font-black italic uppercase">Sacola ({cart.length})</span><span className="bg-white/20 px-5 py-1.5 rounded-xl text-base font-black">R$ {itemsTotal.toFixed(2)}</span></Button></div>}
                </>
            )}
            {step === 'CART_REVIEW' && (
                <div className="p-8 pb-44 space-y-6 animate-fade-in">
                    <h2 className="text-3xl font-black text-red-800 tracking-tighter italic uppercase">Minha Sacola</h2>
                    <div className="space-y-4">
                        {cart.map(item => (
                            <div key={item.cartId} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 flex justify-between items-center">
                                <div className="flex-1 pr-4">
                                    <p className="font-black text-red-950 text-sm italic uppercase leading-tight">{item.quantity}x {item.name}</p>
                                    {item.isPromotion && <span className="text-[8px] bg-yellow-400 text-red-800 px-2 py-0.5 rounded-full font-black uppercase">Promoção 🔥</span>}
                                </div>
                                <div className="flex items-center gap-3"><p className="font-black text-red-800 text-sm italic">R$ {(item.price * item.quantity).toFixed(2)}</p><button onClick={() => setCart(cart.filter(c => c.cartId !== item.cartId))} className="text-red-600">🗑️</button></div>
                            </div>
                        ))}
                        <div className="pt-6 border-t border-zinc-100 flex justify-between items-center"><span className="text-xl font-black text-zinc-300 italic uppercase">Subtotal</span><span className="text-3xl font-black text-red-700 italic">R$ {itemsTotal.toFixed(2)}</span></div>
                        <Button fullWidth onClick={() => setStep('TYPE_SELECTION')} className="py-5 rounded-[2rem]">CONTINUAR PARA ENTREGA</Button>
                    </div>
                </div>
            )}
            {['TYPE_SELECTION', 'FORM', 'SUMMARY'].includes(step) && (
                <div className="p-8 pb-44 animate-fade-in">
                    {step === 'TYPE_SELECTION' && (
                        <div className="space-y-10 py-10">
                            <h2 className="text-4xl font-black text-red-900 italic text-center uppercase leading-none">Como deseja receber?</h2>
                            <div className="grid grid-cols-1 gap-4">
                                <button onClick={() => { setCustomer({...customer, orderType: OrderType.DELIVERY}); setStep('FORM'); }} className="bg-zinc-50 border p-8 rounded-[2.5rem] flex items-center gap-6 group hover:border-red-600 transition-all"><span className="text-5xl">🛵</span><span className="font-black text-red-950 text-xl uppercase italic">Entrega</span></button>
                                <button onClick={() => { setCustomer({...customer, orderType: OrderType.COUNTER}); setStep('FORM'); }} className="bg-zinc-50 border p-8 rounded-[2.5rem] flex items-center gap-6 group hover:border-red-600 transition-all"><span className="text-5xl">🥡</span><span className="font-black text-red-950 text-xl uppercase italic">Retirada</span></button>
                            </div>
                        </div>
                    )}
                    {step === 'FORM' && (
                        <div className="space-y-6">
                            <h2 className="text-3xl font-black text-red-800 italic uppercase">Seus Dados</h2>
                            <form onSubmit={(e) => { e.preventDefault(); setStep('SUMMARY'); }} className="space-y-4">
                                <Input label="Nome Completo" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} required />
                                <Input label="WhatsApp" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="(00) 00000-0000" required />
                                {customer.orderType === OrderType.DELIVERY && (
                                    <>
                                        <Select label="Bairro" value={customer.neighborhood} onChange={e => handleNeighborhoodChange(e.target.value)} options={[{ value: '', label: 'Selecione seu bairro' }, ...DELIVERY_FEES.map(f => ({ value: f.neighborhood, label: `${f.neighborhood} - R$ ${f.fee.toFixed(2)}` }))]} required />
                                        <Input label="Rua e Número" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} required />
                                    </>
                                )}
                                <Select label="Forma de Pagamento" options={PAYMENT_METHODS} value={customer.paymentMethod} onChange={e => setCustomer({...customer, paymentMethod: e.target.value as PaymentMethod})} />
                                <Button type="submit" fullWidth className="py-5 text-lg rounded-[1.5rem] mt-10">VERIFICAR PEDIDO</Button>
                            </form>
                        </div>
                    )}
                    {step === 'SUMMARY' && (
                        <div className="space-y-8">
                            <h2 className="text-3xl font-black text-red-800 italic uppercase">Confirmar Pedido</h2>
                            <div className="bg-zinc-50 p-6 rounded-[2rem] space-y-6 border border-white">
                                <div className="border-b border-zinc-200 pb-4">
                                    <p className="text-2xl font-black text-red-950 italic uppercase">{customer.name}</p>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">{customer.orderType}</p>
                                </div>
                                <div className="space-y-3">
                                    {cart.map(item => (
                                        <div key={item.cartId} className="flex justify-between items-start">
                                            <p className="font-black text-red-950 text-sm leading-tight italic uppercase">{item.quantity}x {item.name}</p>
                                            <p className="font-black text-red-800 text-sm italic">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-zinc-200 pt-4 space-y-2">
                                    <div className="flex justify-between items-center text-xs font-black text-zinc-400 italic uppercase"><span>Subtotal</span><span>R$ {itemsTotal.toFixed(2)}</span></div>
                                    {customer.orderType === OrderType.DELIVERY && <div className="flex justify-between items-center text-xs font-black text-red-600 italic uppercase"><span>Entrega</span><span>R$ {currentFee.toFixed(2)}</span></div>}
                                    <div className="flex justify-between items-center pt-2 text-3xl font-black text-red-700 italic"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
                                </div>
                            </div>
                            <Button onClick={handleFinishOrder} disabled={isSending} fullWidth className={`py-6 text-2xl rounded-[2.5rem] border-b-8 border-red-950 ${isSending ? 'opacity-50' : 'animate-pulse-slow'}`}>{isSending ? 'ENVIANDO...' : 'FINALIZAR AGORA! ✅'}</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
      )}
      <ProductModal isOpen={!!selectedProduct} product={selectedProduct} onClose={() => setSelectedProduct(null)} onConfirm={(item: CartItem) => { setCart([...cart, item]); setSelectedProduct(null); }} />
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 2.5s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @media print { .no-print { display: none !important; } .printable-area { display: block !important; } }
      `}</style>
    </div>
  );
}
