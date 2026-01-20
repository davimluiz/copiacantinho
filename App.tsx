import React, { useState, useEffect } from 'react';
import { Button } from './components/Button';
import { Input, Select } from './components/Input';
import { 
    CATEGORIES, PRODUCTS, PAYMENT_METHODS, ORDER_TYPES, 
    EXTRAS_OPTIONS, FRANGUINHO_SIDES,
    ACAI_PACKAGING, ACAI_COMPLEMENTS, ACAI_TOPPINGS, ACAI_FRUITS, ACAI_PAID_EXTRAS
} from './constants';
import { Category, Product, CustomerInfo, CartItem, PaymentMethod, Order, OrderStatus, OrderType } from './types';
import { printerService } from './services/printerService';

// --- TYPES FOR DRAFTS ---
type OrderStep = 'MENU' | 'FORM' | 'SUMMARY';

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
    const DashedLine = () => (
        <div className="w-full border-b border-black border-dashed my-2" style={{ borderBottomStyle: 'dashed' }}></div>
    );

    const subtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const deliveryFee = order.customer.deliveryFee || 0;

    return (
        <div className="w-full max-w-[80mm] mx-auto text-black font-mono text-sm p-2">
            <div className="text-center">
                <h1 className="font-bold text-xl uppercase mb-1">Cantinho da Sandra</h1>
                <p className="text-xs">Lanches & Bebidas</p>
                <DashedLine />
            </div>

            <div className="mb-2">
                <div className="flex justify-between items-center font-bold text-lg">
                    <span>#{order.id.slice(-4)}</span>
                    <span className="uppercase">{order.customer.orderType} {order.customer.tableNumber ? `#${order.customer.tableNumber}` : ''}</span>
                </div>
                <p className="text-xs mt-1">{date}</p>
                <DashedLine />
            </div>

            <div className="mb-2">
                <h2 className="font-bold uppercase mb-1">Cliente</h2>
                <p className="uppercase font-bold">{order.customer.name}</p>
                <p>{order.customer.phone}</p>
                
                {order.customer.orderType === OrderType.DELIVERY && (
                    <div className="mt-1 text-xs">
                        <p>{order.customer.address}, {order.customer.addressNumber}</p>
                        {order.customer.reference && <p>Ref: {order.customer.reference}</p>}
                    </div>
                )}
                
                <p className="mt-1 font-bold">Pagamento: {order.customer.paymentMethod}</p>
                <DashedLine />
            </div>

            <div className="mb-2">
                <h2 className="font-bold uppercase mb-1">Itens</h2>
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <th className="w-[10%]">Qtd</th>
                            <th className="w-[60%]">Item</th>
                            <th className="w-[30%] text-right">$$</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, idx) => {
                            const acaiComplements = item.additions?.filter(a => ACAI_COMPLEMENTS.includes(a)) || [];
                            const acaiToppings = item.additions?.filter(a => ACAI_TOPPINGS.includes(a)) || [];
                            const acaiFruits = item.additions?.filter(a => ACAI_FRUITS.includes(a)) || [];
                            const acaiPaid = item.additions?.filter(a => ACAI_PAID_EXTRAS.some(p => p.name === a)) || [];

                            return (
                                <React.Fragment key={idx}>
                                    <tr className="align-top font-bold">
                                        <td>{item.quantity}</td>
                                        <td>
                                            {item.name}
                                            {item.packaging && <div className="text-[10px] uppercase font-normal text-black/70">[{item.packaging}]</div>}
                                            {item.observation && <div className="text-[10px] uppercase font-normal text-black/70">* {item.observation}</div>}
                                        </td>
                                        <td className="text-right">{(item.price * item.quantity).toFixed(2)}</td>
                                    </tr>

                                    {item.categoryId !== 'acai' && (item.removedIngredients?.length > 0 || item.additions?.length > 0) && (
                                        <tr>
                                            <td></td>
                                            <td colSpan={2} className="text-xs pb-1">
                                                {item.removedIngredients?.map(ing => <div key={`rem-${ing}`}>- SEM {ing.toUpperCase()}</div>)}
                                                {item.additions?.map(add => <div key={`add-${add}`}>+ COM {add.toUpperCase()}</div>)}
                                            </td>
                                        </tr>
                                    )}

                                    {item.categoryId === 'acai' && (
                                        <tr>
                                            <td></td>
                                            <td colSpan={2} className="text-[10px] pb-1 uppercase leading-tight">
                                                {acaiComplements.length > 0 && (
                                                    <div className="mt-1">
                                                        <span className="font-bold underline">Complementos:</span> {acaiComplements.join(', ')}
                                                    </div>
                                                )}
                                                {acaiToppings.length > 0 && (
                                                    <div className="mt-1">
                                                        <span className="font-bold underline">Coberturas:</span> {acaiToppings.join(', ')}
                                                    </div>
                                                )}
                                                {acaiFruits.length > 0 && (
                                                    <div className="mt-1">
                                                        <span className="font-bold underline">Frutas:</span> {acaiFruits.join(', ')}
                                                    </div>
                                                )}
                                                {acaiPaid.length > 0 && (
                                                    <div className="mt-1">
                                                        <span className="font-bold underline">Adicionais (+$$):</span> {acaiPaid.join(', ')}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
                <DashedLine />
            </div>

            {order.customer.observation && (
                <div className="mb-2 text-xs">
                    <p className="font-bold uppercase">Obs. Pedido:</p>
                    <p>{order.customer.observation}</p>
                    <DashedLine />
                </div>
            )}

            <div className="flex flex-col items-end text-right mb-4">
                <div className="w-full flex justify-between text-xs mb-1">
                    <span>Subtotal:</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                {order.customer.orderType === OrderType.DELIVERY && (
                    <div className="w-full flex justify-between text-xs mb-1 font-bold">
                        <span>Taxa de Entrega:</span>
                        <span>R$ {deliveryFee.toFixed(2)}</span>
                    </div>
                )}
                <div className="w-full flex justify-between text-lg font-bold border-t border-black border-dashed pt-1 mt-1">
                    <span>TOTAL:</span>
                    <span>R$ {order.total.toFixed(2)}</span>
                </div>
            </div>

            <div className="text-center text-xs mt-4">
                <p>Obrigado pela preferência!</p>
                <p className="mt-1">***</p>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const HomeView = ({ onStartOrder, onViewHistory, drafts, onSelectDraft, onDeleteDraft }: any) => (
  <div className="flex flex-col items-center min-h-screen px-4 py-8">
    <div className="glass-card p-8 rounded-2xl w-full max-w-md mb-8 text-center border-red-100">
      <h1 className="text-4xl font-bold text-red-600 mb-1 drop-shadow-sm">Cantinho da Sandra</h1>
      <p className="text-red-900/40 text-sm tracking-wider uppercase font-bold">Painel Administrativo</p>
    </div>
    
    <div className="w-full max-w-md space-y-6">
      <Button onClick={onStartOrder} fullWidth className="text-xl py-6 shadow-red-200">
        NOVO PEDIDO ➕
      </Button>

      {drafts.length > 0 && (
          <div className="space-y-3">
              <h2 className="text-xs font-bold text-red-700/60 uppercase tracking-widest ml-2">Pedidos em Aberto ({drafts.length})</h2>
              {drafts.sort((a:any,b:any) => b.updatedAt - a.updatedAt).map((draft:any) => (
                  <div key={draft.id} className="glass-card p-4 rounded-xl flex justify-between items-center group animate-fade-in border-l-4 border-red-500">
                      <div className="flex-1 cursor-pointer" onClick={() => onSelectDraft(draft.id)}>
                          <p className="font-bold text-red-800 text-lg">{draft.customer.name || `Novo Pedido #${draft.id.slice(-4)}`}</p>
                          <p className="text-xs text-red-600/60">
                              {draft.cart.length} itens - {new Date(draft.updatedAt).toLocaleTimeString('pt-BR')}
                          </p>
                      </div>
                      <button onClick={() => onDeleteDraft(draft.id)} className="p-2 text-red-400 hover:text-red-600 transition-colors">🗑️</button>
                  </div>
              ))}
          </div>
      )}
      
      <div className="pt-4">
        <Button onClick={onViewHistory} variant="secondary" fullWidth>Histórico e Relatórios</Button>
      </div>
    </div>
  </div>
);

const FormView = ({ customer, setCustomer, onBack, onNext }: any) => (
    <div className="max-w-md mx-auto pt-8 px-4 pb-20">
       <div className="glass-card p-6 rounded-2xl">
           <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-red-700 font-bold hover:scale-105 transition-transform">&larr; Cardápio</button>
                <h2 className="text-xl text-red-600 font-bold">Identificação</h2>
                <div className="w-8"></div>
           </div>
           
           <div className="grid grid-cols-3 gap-2 mb-6">
                {ORDER_TYPES.map(type => (
                    <button
                        key={type.value}
                        type="button"
                        onClick={() => setCustomer({ ...customer, orderType: type.value })}
                        className={`py-3 px-1 rounded-xl font-bold text-xs transition-all border ${
                            customer.orderType === type.value
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                        }`}
                    >
                        {type.label}
                    </button>
                ))}
           </div>

           <form onSubmit={(e) => { e.preventDefault(); onNext(); }}>
              <div className="flex gap-2">
                <div className="flex-1">
                    <Input label="Nome do Cliente *" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Nome" />
                </div>
                {customer.orderType === OrderType.TABLE && (
                     <div className="w-24">
                        <Input label="Mesa *" value={customer.tableNumber} onChange={e => setCustomer({...customer, tableNumber: e.target.value})} placeholder="Nº" type="number" />
                    </div>
                )}
              </div>

              <Input label="Telefone/WhatsApp" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} type="tel" placeholder="(00) 00000-0000" />

              {customer.orderType === OrderType.DELIVERY && (
                  <>
                    <div className="flex gap-2">
                        <div className="flex-[3]">
                             <Input label="Endereço *" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="Rua..." />
                        </div>
                        <div className="flex-1">
                             <Input label="Nº *" value={customer.addressNumber} onChange={e => setCustomer({...customer, addressNumber: e.target.value})} placeholder="123" />
                        </div>
                    </div>
                    <Input label="Taxa Entrega" type="number" step="0.50" value={customer.deliveryFee || ''} onChange={e => setCustomer({...customer, deliveryFee: parseFloat(e.target.value)})} placeholder="0.00" />
                  </>
              )}

              <Select label="Forma de Pagamento" options={PAYMENT_METHODS} value={customer.paymentMethod} onChange={e => setCustomer({...customer, paymentMethod: e.target.value as PaymentMethod})} />

              <div className="mb-4">
                  <label className="block text-red-700 text-sm font-bold mb-2 ml-1">Observação do Pedido</label>
                  <textarea
                    className="appearance-none border border-red-900/10 rounded-xl w-full py-3 px-4 bg-zinc-900 text-white leading-tight focus:outline-none focus:border-red-600 transition-all backdrop-blur-sm"
                    rows={2}
                    value={customer.observation || ''}
                    onChange={e => setCustomer({...customer, observation: e.target.value})}
                  />
              </div>

              <Button type="submit" fullWidth>Ver Resumo &rarr;</Button>
           </form>
       </div>
    </div>
);

// --- MODAL COMPONENTS ---

// Fix for line 507: Define ProductModal component
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
      ...product,
      cartId: Date.now().toString(),
      quantity,
      removedIngredients,
      additions,
      observation,
      packaging: product.categoryId === 'acai' ? packaging : undefined,
      price: product.price + extraPrice
    };
    onConfirm(item);
  };

  const toggleIngredient = (ing: string) => {
    setRemovedIngredients(prev => prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]);
  };

  const toggleAddition = (add: string, isAcomp: boolean = false) => {
    if (isAcomp && product.maxSides !== undefined) {
        if (!additions.includes(add) && additions.length >= product.maxSides) {
            alert(`Máximo de ${product.maxSides} acompanhamentos`);
            return;
        }
    }
    setAdditions(prev => prev.includes(add) ? prev.filter(a => a !== add) : [...prev, add]);
  };

  return (
    <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="bg-zinc-900 border border-red-900/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-red-900/10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-white">{product.name}</h3>
              <p className="text-red-500 font-bold text-lg">R$ {product.price.toFixed(2)}</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-red-700 text-xs font-bold uppercase mb-3">Quantidade</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-full bg-zinc-800 text-white font-bold">-</button>
              <span className="text-xl font-bold text-white">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-full bg-zinc-800 text-white font-bold">+</button>
            </div>
          </div>

          {product.categoryId === 'lanches' && product.ingredients && (
            <div>
              <label className="block text-red-700 text-xs font-bold uppercase mb-3">Retirar Ingredientes</label>
              <div className="grid grid-cols-2 gap-2">
                {product.ingredients.map(ing => (
                  <button key={ing} onClick={() => toggleIngredient(ing)} className={`p-3 rounded-xl border text-sm font-bold transition-all ${removedIngredients.includes(ing) ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                    {ing}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.categoryId === 'lanches' && (
            <div>
              <label className="block text-red-700 text-xs font-bold uppercase mb-3">Adicionais</label>
              <div className="grid grid-cols-1 gap-2">
                {EXTRAS_OPTIONS.map(opt => (
                  <button key={opt.name} onClick={() => toggleAddition(opt.name)} className={`p-3 rounded-xl border text-sm font-bold flex justify-between transition-all ${additions.includes(opt.name) ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                    <span>{opt.name}</span>
                    <span>+ R$ {opt.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.categoryId === 'franguinho' && (
            <div>
              <label className="block text-red-700 text-xs font-bold uppercase mb-3">Escolha os acompanhamentos (Máx {product.maxSides})</label>
              <div className="grid grid-cols-1 gap-2">
                {FRANGUINHO_SIDES.map(side => (
                  <button key={side} onClick={() => toggleAddition(side, true)} className={`p-3 rounded-xl border text-sm font-bold transition-all ${additions.includes(side) ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                    {side}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.categoryId === 'acai' && (
            <div className="space-y-6">
               <div>
                  <label className="block text-red-700 text-xs font-bold uppercase mb-3">Embalagem</label>
                  <div className="grid grid-cols-3 gap-2">
                      {ACAI_PACKAGING.map(p => (
                          <button key={p} onClick={() => setPackaging(p)} className={`p-2 rounded-xl border text-xs font-bold transition-all ${packaging === p ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                              {p}
                          </button>
                      ))}
                  </div>
               </div>
               <div>
                  <label className="block text-red-700 text-xs font-bold uppercase mb-3">Complementos</label>
                  <div className="grid grid-cols-2 gap-2">
                      {ACAI_COMPLEMENTS.map(c => (
                          <button key={c} onClick={() => toggleAddition(c)} className={`p-2 rounded-xl border text-xs font-bold transition-all ${additions.includes(c) ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                              {c}
                          </button>
                      ))}
                  </div>
               </div>
               <div>
                  <label className="block text-red-700 text-xs font-bold uppercase mb-3">Coberturas</label>
                  <div className="grid grid-cols-2 gap-2">
                      {ACAI_TOPPINGS.map(t => (
                          <button key={t} onClick={() => toggleAddition(t)} className={`p-2 rounded-xl border text-xs font-bold transition-all ${additions.includes(t) ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                              {t}
                          </button>
                      ))}
                  </div>
               </div>
               <div>
                  <label className="block text-red-700 text-xs font-bold uppercase mb-3">Frutas</label>
                  <div className="grid grid-cols-3 gap-2">
                      {ACAI_FRUITS.map(f => (
                          <button key={f} onClick={() => toggleAddition(f)} className={`p-2 rounded-xl border text-xs font-bold transition-all ${additions.includes(f) ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                              {f}
                          </button>
                      ))}
                  </div>
               </div>
               <div>
                  <label className="block text-red-700 text-xs font-bold uppercase mb-3">Adicionais (+$$)</label>
                  <div className="grid grid-cols-1 gap-2">
                      {ACAI_PAID_EXTRAS.map(opt => (
                          <button key={opt.name} onClick={() => toggleAddition(opt.name)} className={`p-3 rounded-xl border text-sm font-bold flex justify-between transition-all ${additions.includes(opt.name) ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                              <span>{opt.name}</span>
                              <span>+ R$ {opt.price.toFixed(2)}</span>
                          </button>
                      ))}
                  </div>
               </div>
            </div>
          )}

          <div>
            <label className="block text-red-700 text-xs font-bold uppercase mb-3">Observação</label>
            <textarea value={observation} onChange={e => setObservation(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white focus:outline-none focus:border-red-600" rows={2} placeholder="Ex: sem cebola, ponto da carne..." />
          </div>
        </div>

        <div className="p-6 bg-zinc-950">
          <Button onClick={handleConfirm} fullWidth>ADICIONAR AO CARRINHO</Button>
        </div>
      </div>
    </div>
  );
};

// Fix for line 508: Define ManualItemModal component
const ManualItemModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: (item: CartItem) => void }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleConfirm = () => {
    if (!name || !price) return;
    const item: CartItem = {
      id: 'manual-' + Date.now(),
      cartId: Date.now().toString(),
      categoryId: 'manual',
      name,
      price: parseFloat(price),
      quantity,
    };
    onConfirm(item);
    setName('');
    setPrice('');
    setQuantity(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-red-900/20 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-white">Item Manual</h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
        </div>
        <Input label="Nome do Item" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Água Mineral" />
        <Input label="Preço Unitário" value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.50" placeholder="0.00" />
        <div>
            <label className="block text-red-700 text-xs font-bold uppercase mb-2">Quantidade</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-full bg-zinc-800 text-white font-bold">-</button>
              <span className="text-xl font-bold text-white">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-full bg-zinc-800 text-white font-bold">+</button>
            </div>
        </div>
        <div className="pt-4">
            <Button onClick={handleConfirm} fullWidth disabled={!name || !price}>ADICIONAR</Button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<'HOME' | 'HISTORY' | 'ORDER'>('HOME');
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

  useEffect(() => {
    if (receiptOrder) {
      const timer = setTimeout(() => { window.print(); setReceiptOrder(null); }, 100);
      return () => clearTimeout(timer);
    }
  }, [receiptOrder]);

  const activeDraft = drafts.find(d => d.id === activeDraftId);
  const updateDraft = (id: string, updates: Partial<OrderDraft>) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d));
  };

  const handleStartOrder = () => {
    const id = Date.now().toString();
    const newDraft: OrderDraft = {
        id, cart: [], step: 'MENU', updatedAt: Date.now(),
        customer: { name: '', phone: '', address: '', addressNumber: '', reference: '', deliveryFee: 0, tableNumber: '', orderType: OrderType.COUNTER, paymentMethod: PaymentMethod.PIX }
    };
    setDrafts(prev => [...prev, newDraft]);
    setActiveDraftId(id);
    setCurrentCategoryId(null);
    setSearchTerm('');
    setView('ORDER');
  };

  const finishOrder = () => {
    if (!activeDraft) return;
    const cartTotal = activeDraft.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const finalTotal = cartTotal + (activeDraft.customer.orderType === OrderType.DELIVERY ? (activeDraft.customer.deliveryFee || 0) : 0);
    const newOrder: Order = { id: activeDraft.id, customer: activeDraft.customer, items: activeDraft.cart, total: finalTotal, createdAt: new Date().toISOString(), status: OrderStatus.PENDING };
    setOrders(prev => [newOrder, ...prev]);
    setDrafts(prev => prev.filter(d => d.id !== activeDraft.id));
    setReceiptOrder(newOrder);
    setActiveDraftId(null);
    setView('HOME');
  };

  const showDailyReport = () => {
    const today = new Date().toLocaleDateString('pt-BR');
    const todayOrders = orders.filter(o => new Date(o.createdAt).toLocaleDateString('pt-BR') === today);
    const total = todayOrders.reduce((sum, o) => sum + o.total, 0);
    setReportData({ title: 'Relatório Diário', total, count: todayOrders.length });
  };

  const showGeneralReport = () => {
    const total = orders.reduce((sum, o) => sum + o.total, 0);
    setReportData({ title: 'Relatório Geral', total, count: orders.length });
  };

  const filteredProducts = PRODUCTS.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = currentCategoryId ? p.categoryId === currentCategoryId : true;
    return searchTerm ? matchesSearch : matchesCategory;
  });

  return (
    <div className="min-h-screen text-red-800 font-sans selection:bg-red-200">
      <div className="printable-area hidden"><Receipt order={receiptOrder} /></div>

      <div className="no-print h-full">
        {view !== 'HOME' && (
            <button 
                onClick={() => { setView('HOME'); setActiveDraftId(null); }}
                className="fixed bottom-6 right-6 z-[100] w-14 h-14 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all"
            >🏠</button>
        )}

        {view === 'HOME' && <HomeView onStartOrder={handleStartOrder} onViewHistory={() => setView('HISTORY')} drafts={drafts} onSelectDraft={(id:string) => { setActiveDraftId(id); setView('ORDER'); setCurrentCategoryId(null); }} onDeleteDraft={(id:string) => confirm('Excluir rascunho?') && setDrafts(prev => prev.filter(d => d.id !== id))} />}

        {view === 'HISTORY' && (
            <div className="h-screen flex flex-col">
                <div className="p-4 glass flex justify-between items-center border-b border-red-100 sticky top-0 z-10">
                    <button onClick={() => setView('HOME')} className="text-red-600 font-bold">&larr; Voltar</button>
                    <h2 className="text-xl font-bold text-red-800">Histórico</h2>
                    <div className="w-10"></div>
                </div>
                <div className="p-4 max-w-2xl mx-auto w-full grid grid-cols-2 gap-3">
                    <button onClick={showDailyReport} className="glass-card p-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors">📊 Diário</button>
                    <button onClick={showGeneralReport} className="glass-card p-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors">📈 Geral</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-4 pb-24">
                    {orders.map(order => (
                        <div key={order.id} className="glass-card rounded-xl p-4 border-l-4 border-red-600 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-red-900">{order.customer.name}</h3>
                                <p className="text-xs text-red-600/60">{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
                                <p className="font-bold text-red-600">R$ {order.total.toFixed(2)}</p>
                            </div>
                            <button onClick={() => setReceiptOrder(order)} className="bg-red-600 text-white p-2 rounded-lg font-bold">🖨️</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {view === 'ORDER' && activeDraft && (
            <div className="h-screen flex flex-col">
                {activeDraft.step === 'MENU' && (
                    <>
                        <div className="p-4 glass border-b border-red-100 sticky top-0 z-20 flex justify-between items-center">
                            <button onClick={() => { setView('HOME'); setActiveDraftId(null); }} className="text-red-600 font-bold">&larr; Sair</button>
                            <h2 className="text-xl font-bold text-red-800">Cardápio</h2>
                            <div className="w-10"></div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
                            <div className="max-w-md mx-auto">
                                <input 
                                    type="search" 
                                    placeholder="🔍 Buscar..." 
                                    className="w-full bg-zinc-900 border border-red-100 rounded-xl py-3 px-4 text-white focus:outline-none mb-4 shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Button variant="secondary" onClick={() => setIsManualModalOpen(true)} fullWidth className="border-dashed py-4 mb-6">➕ ITEM MANUAL</Button>
                                {(!currentCategoryId && !searchTerm) ? (
                                    <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                        {CATEGORIES.map(cat => (
                                            <button key={cat.id} onClick={() => setCurrentCategoryId(cat.id)} className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all active:scale-95 border-red-50 hover:border-red-200">
                                                <span className="text-4xl">{cat.icon}</span>
                                                <span className="font-bold text-lg text-red-800">{cat.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-fade-in">
                                        <button onClick={() => { setCurrentCategoryId(null); setSearchTerm(''); }} className="text-red-600 font-bold">&larr; Categorias</button>
                                        <div className="grid grid-cols-1 gap-2">
                                            {filteredProducts.map(p => (
                                                <div key={p.id} onClick={() => setSelectedProduct(p)} className="glass-card p-4 rounded-xl flex justify-between items-center hover:bg-red-50 cursor-pointer transition-colors shadow-sm">
                                                    <div>
                                                        <p className="font-bold text-red-900 text-lg">{p.name}</p>
                                                        <p className="text-red-600 font-bold">R$ {p.price.toFixed(2)}</p>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold">+</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {activeDraft.cart.length > 0 && (
                            <div className="fixed bottom-0 left-0 right-0 glass p-4 border-t border-red-100 backdrop-blur-xl z-30">
                                <div className="max-w-md mx-auto flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-red-500 uppercase font-bold">Total do Carrinho</p>
                                        <p className="text-2xl font-bold text-red-700">R$ {activeDraft.cart.reduce((s,i) => s + (i.price * i.quantity), 0).toFixed(2)}</p>
                                    </div>
                                    <Button onClick={() => updateDraft(activeDraft.id, { step: 'FORM' })}>Avançar &rarr;</Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
                {activeDraft.step === 'FORM' && <FormView customer={activeDraft.customer} setCustomer={(c:any) => updateDraft(activeDraft.id, { customer: c })} onBack={() => updateDraft(activeDraft.id, { step: 'MENU' })} onNext={() => updateDraft(activeDraft.id, { step: 'SUMMARY' })} />}
                {activeDraft.step === 'SUMMARY' && (
                    <div className="flex flex-col h-screen">
                        <div className="p-4 glass flex justify-between items-center border-b border-red-100 sticky top-0 z-20">
                            <button onClick={() => updateDraft(activeDraft.id, { step: 'FORM' })} className="text-red-600 font-bold">&larr; Voltar</button>
                            <h2 className="text-xl font-bold text-red-800">Finalizar</h2>
                            <div className="w-10"></div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="glass-card p-4 rounded-xl border-l-4 border-red-600">
                                <p className="font-bold text-red-500 uppercase text-xs">{activeDraft.customer.orderType}</p>
                                <p className="text-xl font-bold text-red-900">{activeDraft.customer.name}</p>
                                <p className="text-red-600/80">{activeDraft.customer.phone}</p>
                            </div>
                            <div className="glass-card p-4 rounded-xl space-y-4">
                                {activeDraft.cart.map(item => (
                                    <div key={item.cartId} className="flex justify-between border-b border-red-50 pb-2 last:border-0">
                                        <div><p className="font-bold text-red-900">{item.quantity}x {item.name}</p><p className="text-xs text-red-600/60">R$ {item.price.toFixed(2)}</p></div>
                                        <p className="font-bold text-red-700">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                ))}
                                <div className="pt-2 text-xl font-bold flex justify-between text-red-800 border-t border-red-100">
                                    <p>TOTAL</p>
                                    <p>R$ {activeDraft.cart.reduce((s,i) => s + (i.price * i.quantity), 0).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 glass border-t border-red-100 z-20"><Button onClick={finishOrder} fullWidth className="py-5 text-xl">CONCLUIR PEDIDO ✅</Button></div>
                    </div>
                )}
            </div>
        )}

        {reportData && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
                <div className="glass-card w-full max-w-sm rounded-2xl p-8 text-center border-2 border-red-200">
                    <h3 className="text-red-600 text-xl font-bold uppercase tracking-widest mb-6">{reportData.title}</h3>
                    <div className="space-y-4 mb-8">
                        <div><p className="text-red-900/40 text-sm uppercase font-bold">Total Faturado</p><p className="text-4xl font-bold text-red-700">R$ {reportData.total.toFixed(2)}</p></div>
                        <div><p className="text-red-900/40 text-sm uppercase font-bold">Pedidos</p><p className="text-2xl font-bold text-red-700">{reportData.count}</p></div>
                    </div>
                    <Button onClick={() => setReportData(null)} fullWidth>Fechar</Button>
                </div>
            </div>
        )}

        <ProductModal product={selectedProduct} isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} onConfirm={item => { if (activeDraftId) updateDraft(activeDraftId, { cart: [...(activeDraft?.cart || []), item] }); setSelectedProduct(null); }} />
        <ManualItemModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} onConfirm={item => { if (activeDraftId) updateDraft(activeDraftId, { cart: [...(activeDraft?.cart || []), item] }); setIsManualModalOpen(false); }} />
      </div>
    </div>
  );
}
