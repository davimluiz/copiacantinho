
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
  setDoc
} from 'firebase/firestore';

import { db } from './firebase';
import { Button } from './components/Button';
import { Input, Select } from './components/Input';
import { 
    CATEGORIES, PRODUCTS, PAYMENT_METHODS, DELIVERY_FEES,
    ACAI_COMPLEMENTS, ACAI_TOPPINGS, ACAI_FRUITS, ACAI_PAID_EXTRAS, FRANGUINHO_SIDES
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
                    <h1 className="font-bold text-lg uppercase italic">RELATÓRIO DE VENDAS</h1>
                    <p className="text-[10px]">CANTINHO DA SANDRA</p>
                    <p className="text-[10px]">{new Date().toLocaleString('pt-BR')}</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <p className="border-b border-black text-[11px] mb-1">VENDAS (TOTAL)</p>
                        <div className="flex justify-between"><span>DIÁRIO:</span><span>R$ {stats.daily.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>SEMANAL:</span><span>R$ {stats.weekly.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>MENSAL:</span><span>R$ {stats.monthly.toFixed(2)}</span></div>
                    </div>
                    <div>
                        <p className="border-b border-black text-[11px] mb-1">ENTREGAS (FRETE)</p>
                        <div className="flex justify-between"><span>DIÁRIO:</span><span>R$ {stats.deliveryDaily.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>SEMANAL:</span><span>R$ {stats.deliveryWeekly.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>MENSAL:</span><span>R$ {stats.deliveryMonthly.toFixed(2)}</span></div>
                    </div>
                </div>
                <div className="text-center mt-6 border-t border-dashed border-black pt-2">
                    <p className="text-[10px]">--- FIM DO RELATÓRIO ---</p>
                </div>
            </div>
        );
    }
    if (!order) return null;
    return (
        <div className="w-full max-w-[80mm] mx-auto text-black font-mono text-[14px] font-bold p-4 bg-white border border-zinc-200 shadow-sm printable-content">
            <div className="text-center mb-4 border-b border-dashed border-black pb-2">
                <h1 className="font-bold text-lg uppercase italic">Cantinho da Sandra</h1>
            </div>
            <div className="mb-2 uppercase">
                <p><strong>CLIENTE:</strong> {order.nomeCliente}</p>
                <p><strong>TIPO:</strong> {order.tipo}</p>
                <p><strong>FONE:</strong> {order.telefone}</p>
                <p><strong>PAGAMENTO:</strong> {order.pagamento}</p>
                {order.endereco && <p><strong>END:</strong> {order.endereco}</p>}
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            <div className="mb-2 whitespace-pre-wrap leading-tight text-[12px] font-bold">{order.itens}</div>
            <div className="border-t border-dashed border-black mt-2 pt-2 text-right">
                <p className="text-lg font-bold">TOTAL: R$ {Number(order.total || 0).toFixed(2)}</p>
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
                    <h3 className="text-xl font-black text-red-800 italic uppercase">Editar Pedido</h3>
                    <button onClick={onClose} className="text-zinc-300 hover:text-red-600 text-3xl leading-none transition-colors">&times;</button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                    <section>
                        <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3">Itens do Pedido</label>
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
  const [observation, setObservation] = useState('');
  
  // States Açaí
  const [acaiComplete, setAcaiComplete] = useState(false);
  const [selectedComplements, setSelectedComplements] = useState<string[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [selectedFruits, setSelectedFruits] = useState<string[]>([]);
  const [selectedPaidExtras, setSelectedPaidExtras] = useState<any[]>([]);
  const [acaiOwnerName, setAcaiOwnerName] = useState('');

  // States Franguinho
  const [selectedSides, setSelectedSides] = useState<string[]>([]);

  // States Bebidas
  const [drinkFlavor, setDrinkFlavor] = useState('');
  const [isZero, setIsZero] = useState(false);

  // States Lanches
  const [removalText, setRemovalText] = useState('');
  const [picanhaAddition, setPicanhaAddition] = useState(false);
  const [selectedLancheExtras, setSelectedLancheExtras] = useState<string[]>([]);
  const [isTurbined, setIsTurbined] = useState(false);

  // States Balcão
  const [wantsSalpicao, setWantsSalpicao] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setObservation('');
      setAcaiComplete(false);
      setSelectedComplements([]);
      setSelectedToppings([]);
      setSelectedFruits([]);
      setSelectedPaidExtras([]);
      setSelectedSides([]);
      setDrinkFlavor('');
      setIsZero(false);
      setRemovalText('');
      setPicanhaAddition(false);
      setSelectedLancheExtras([]);
      setIsTurbined(false);
      setAcaiOwnerName('');
      setWantsSalpicao(null);
    }
  }, [isOpen, product]);

  if (!product) return null;

  const category = product.categoryId;
  const isTropeiro = product.name.toLowerCase().includes('tropeiro');
  
  const toggleItem = (item: string, current: string[], setter: (val: string[]) => void) => {
    if (current.includes(item)) setter(current.filter(i => i !== item));
    else setter([...current, item]);
  };

  const calculateTotalPrice = () => {
    let extra = 0;
    if (category === 'acai') {
      extra = selectedPaidExtras.reduce((acc, e) => acc + e.price, 0);
    } else if (category === 'lanches') {
      if (picanhaAddition) extra += 4.50;
      extra += selectedLancheExtras.length * 3.00;
      if (isTurbined) extra += 10.00;
    }
    return (Number(product.price) + extra) * (category === 'acai' ? 1 : quantity);
  };

  const handleConfirm = () => {
    if (category === 'acai' && !acaiOwnerName.trim()) {
      alert("Por favor, informe o nome para este açaí.");
      return;
    }

    if (isTropeiro && wantsSalpicao === null) {
      alert("Por favor, selecione se deseja salpicão.");
      return;
    }

    let finalDetails = "";

    if (category === 'acai') {
      finalDetails += `Proprietário: ${acaiOwnerName.toUpperCase()}`;
      if (acaiComplete) {
        finalDetails += "\nOpção: COMPLETO";
      } else {
        if (selectedComplements.length) finalDetails += `\nComplementos:\n  - ${selectedComplements.join('\n  - ')}`;
        if (selectedFruits.length) finalDetails += `\nFrutas:\n  - ${selectedFruits.join('\n  - ')}`;
        if (selectedToppings.length) finalDetails += `\nCoberturas:\n  - ${selectedToppings.join('\n  - ')}`;
      }
      if (selectedPaidExtras.length) finalDetails += `\nAdicionais:\n  - ${selectedPaidExtras.map(e => e.name).join('\n  - ')}`;
    } else if (category === 'lanches') {
      if (removalText) finalDetails += `\nRetirar: ${removalText}`;
      if (picanhaAddition) finalDetails += `\nAdicional: Bife de Picanha (+R$4,50)`;
      if (selectedLancheExtras.length) finalDetails += `\nAdicionais (+R$3,00 cada):\n  - ${selectedLancheExtras.join('\n  - ')}`;
      if (isTurbined) finalDetails += `\nTURBINADO (+R$10,00): Batata + Juninho`;
      if (observation) finalDetails += `\nObs: ${observation}`;
    } else if (category === 'franguinho') {
      if (selectedSides.length) finalDetails += `\nAcompanhamentos:\n  - ${selectedSides.join('\n  - ')}`;
      if (observation) finalDetails += `\nObs: ${observation}`;
    } else if (category === 'bebidas') {
      if (product.needsFlavor && drinkFlavor) finalDetails += `\nSabor: ${drinkFlavor}`;
      if (product.needsZeroOption) finalDetails += `\nOpção: ${isZero ? 'ZERO' : 'NORMAL'}`;
      if (observation) finalDetails += `\nObs: ${observation}`;
    } else if (category === 'porcoes') {
      if (observation) finalDetails += `\nObs: ${observation}`;
    } else if (category === 'balcao') {
        if (isTropeiro) {
            finalDetails += `Opção: ${wantsSalpicao ? 'COM SALPICÃO' : 'SEM SALPICÃO'}`;
        }
        if (observation) finalDetails += `\nObs: ${observation}`;
    }

    onConfirm({
      ...product,
      cartId: Date.now().toString(),
      quantity: category === 'acai' ? 1 : quantity,
      observation: finalDetails.trim(),
      price: calculateTotalPrice() / (category === 'acai' ? 1 : quantity)
    });
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity no-print ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-fade-in border-4 border-red-50">
        <div className="p-6 border-b border-red-50 flex justify-between items-center bg-red-50/30">
          <div>
            <h3 className="text-xl font-black text-red-800 italic uppercase">{product.name}</h3>
            {product.unit && <p className="text-[10px] text-zinc-400 font-black uppercase italic leading-none">{product.unit}</p>}
            <p className="text-red-600 font-black mt-1 italic text-lg">R$ {calculateTotalPrice().toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="text-zinc-300 hover:text-red-600 text-3xl transition-colors">&times;</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 text-left custom-scrollbar">
          {category !== 'acai' && (
            <section>
              <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3">Quantidade</label>
              <div className="flex items-center gap-6">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-xl bg-zinc-50 text-red-600 font-black text-xl hover:bg-zinc-100">-</button>
                <span className="text-2xl font-black text-red-900 italic">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-xl bg-zinc-50 text-red-600 font-black text-xl hover:bg-zinc-100">+</button>
              </div>
            </section>
          )}

          {category === 'acai' && (
              <section>
                  <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3">Nome para este Açaí (Obrigatório)</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 text-red-900 font-bold focus:outline-none focus:border-red-600"
                    placeholder="Ex: Açaí do João"
                    value={acaiOwnerName}
                    onChange={e => setAcaiOwnerName(e.target.value)}
                  />
                  <p className="text-[9px] text-zinc-400 mt-2 font-bold uppercase italic">* Um açaí por pessoa. Adicione um de cada vez.</p>
              </section>
          )}

          {isTropeiro && (
              <section className="bg-red-50/50 p-6 rounded-3xl border border-red-100">
                  <label className="block text-red-800 text-sm font-black uppercase italic mb-4 text-center">Deseja Salpicão?</label>
                  <div className="flex gap-4">
                      <button 
                        onClick={() => setWantsSalpicao(true)}
                        className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase italic border-b-4 transition-all ${wantsSalpicao === true ? 'bg-red-700 text-white border-red-950 shadow-md scale-[1.02]' : 'bg-white text-zinc-400 border-zinc-200'}`}
                      >
                          SIM
                      </button>
                      <button 
                        onClick={() => setWantsSalpicao(false)}
                        className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase italic border-b-4 transition-all ${wantsSalpicao === false ? 'bg-zinc-800 text-white border-black shadow-md scale-[1.02]' : 'bg-white text-zinc-400 border-zinc-200'}`}
                      >
                          NÃO
                      </button>
                  </div>
              </section>
          )}

          {/* LANCHES */}
          {category === 'lanches' && (
            <>
              <section>
                <label className="text-red-900 text-[11px] font-black uppercase italic block mb-2">Ingredientes:</label>
                <p className="text-xs text-zinc-500 font-medium italic">{product.ingredients?.join(', ')}</p>
              </section>
              <section>
                <label className="text-red-900 text-[11px] font-black uppercase italic block mb-2">Deseja Retirar algo?</label>
                <Input label="" placeholder="Ex: Sem cebola, sem tomate..." value={removalText} onChange={e => setRemovalText(e.target.value)} />
              </section>
              <section>
                <label className="text-red-900 text-[11px] font-black uppercase italic block mb-3">Adicionais</label>
                <div className="space-y-2">
                    <button 
                      onClick={() => setPicanhaAddition(!picanhaAddition)}
                      className={`w-full p-3 rounded-xl border text-left flex justify-between items-center font-bold uppercase text-[10px] transition-all ${picanhaAddition ? 'bg-red-700 text-white border-red-900' : 'bg-zinc-50 border-zinc-100 text-zinc-500'}`}
                    >
                        <span>Bife de Picanha</span>
                        <span>+ R$ 4,50</span>
                    </button>
                    <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                        <label className="text-[9px] font-black text-zinc-400 uppercase mb-2 block">Acrescentar itens (+ R$ 3,00 cada):</label>
                        <select 
                          className="w-full bg-white border border-zinc-200 p-2 rounded-lg text-xs font-bold text-red-900 focus:outline-none"
                          onChange={(e) => {
                            if (e.target.value && !selectedLancheExtras.includes(e.target.value)) {
                                setSelectedLancheExtras([...selectedLancheExtras, e.target.value]);
                            }
                            e.target.value = "";
                          }}
                        >
                          <option value="">Selecione para adicionar...</option>
                          {['Ovo', 'Bacon', 'Carne comum', 'Queijo', 'Presunto', 'Calabresa'].map(item => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {selectedLancheExtras.map(item => (
                                <span key={item} className="bg-red-100 text-red-800 text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1 uppercase italic">
                                    {item}
                                    <button onClick={() => setSelectedLancheExtras(selectedLancheExtras.filter(i => i !== item))}>&times;</button>
                                </span>
                            ))}
                        </div>
                    </div>
                    <button 
                      onClick={() => setIsTurbined(!isTurbined)}
                      className={`w-full py-4 rounded-xl border-b-4 font-black text-xs transition-all italic shadow-lg animate-pulse-slow ${isTurbined ? 'bg-red-800 text-white border-red-950 scale-[1.02]' : 'bg-red-600 text-white border-red-800 hover:bg-red-700'}`}
                    >
                        TURBINE SEU LANCHE POR + 10R$ (150G DE BATATA E UM JUNINHO)
                    </button>
                </div>
              </section>
            </>
          )}

          {/* AÇAÍ */}
          {category === 'acai' && (
            <>
              <section>
                <button 
                  onClick={() => {
                    setAcaiComplete(!acaiComplete);
                    if (!acaiComplete) {
                      setSelectedComplements([]);
                      setSelectedFruits([]);
                      setSelectedToppings([]);
                    }
                  }}
                  className={`w-full py-4 rounded-[1.5rem] border-b-4 font-black transition-all italic shadow-lg text-lg ${acaiComplete ? 'bg-green-600 text-white border-green-800' : 'bg-zinc-100 text-zinc-400 border-zinc-300'}`}
                >
                  {acaiComplete ? '✓ AÇAÍ COMPLETO SELECIONADO' : 'AÇAÍ COMPLETO?'}
                </button>
              </section>

              <div className={acaiComplete ? 'opacity-30 pointer-events-none' : ''}>
                  <section className="mt-4">
                    <label className="text-red-900 text-[11px] font-black uppercase italic block mb-3">Complementos (Grátis)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ACAI_COMPLEMENTS.map(item => (
                        <button key={item} onClick={() => toggleItem(item, selectedComplements, setSelectedComplements)} className={`text-[10px] font-bold p-2.5 rounded-xl border text-left uppercase italic ${selectedComplements.includes(item) ? 'bg-red-700 text-white' : 'bg-zinc-50'}`}>{item}</button>
                      ))}
                    </div>
                  </section>
                  <section className="mt-4">
                    <label className="text-red-900 text-[11px] font-black uppercase italic block mb-3">Frutas (Grátis)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ACAI_FRUITS.map(item => (
                        <button key={item} onClick={() => toggleItem(item, selectedFruits, setSelectedFruits)} className={`text-[10px] font-bold p-2.5 rounded-xl border text-left uppercase italic ${selectedFruits.includes(item) ? 'bg-red-700 text-white' : 'bg-zinc-50'}`}>{item}</button>
                      ))}
                    </div>
                  </section>
                  <section className="mt-4">
                    <label className="text-red-900 text-[11px] font-black uppercase italic block mb-3">Coberturas (Grátis)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ACAI_TOPPINGS.map(item => (
                        <button key={item} onClick={() => toggleItem(item, selectedToppings, setSelectedToppings)} className={`text-[10px] font-bold p-2.5 rounded-xl border text-left uppercase italic ${selectedToppings.includes(item) ? 'bg-red-700 text-white' : 'bg-zinc-50'}`}>{item}</button>
                      ))}
                    </div>
                  </section>
              </div>

              <section className="mt-4">
                <label className="text-red-900 text-[11px] font-black uppercase italic block mb-3">Adicionais (Pago)</label>
                <div className="grid grid-cols-1 gap-2">
                  {ACAI_PAID_EXTRAS.map(extra => (
                    <button key={extra.name} onClick={() => {
                        const exists = selectedPaidExtras.find(e => e.name === extra.name);
                        if (exists) setSelectedPaidExtras(selectedPaidExtras.filter(e => e.name !== extra.name));
                        else setSelectedPaidExtras([...selectedPaidExtras, extra]);
                    }} className={`text-[11px] font-bold p-3 rounded-xl border flex justify-between uppercase italic ${selectedPaidExtras.find(e => e.name === extra.name) ? 'bg-green-600 text-white' : 'bg-zinc-50 text-zinc-500'}`}>
                      <span>{extra.name}</span>
                      <span>+ R$ {extra.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* FRANGUINHO */}
          {category === 'franguinho' && (
            <section>
              <label className="text-red-900 text-[11px] font-black uppercase italic block mb-2">Escolha seus Acompanhamentos ({selectedSides.length}/{product.maxSides}):</label>
              <div className="grid grid-cols-1 gap-2">
                {FRANGUINHO_SIDES.map(side => (
                  <button 
                    key={side} 
                    onClick={() => {
                        if (selectedSides.includes(side)) setSelectedSides(selectedSides.filter(s => s !== side));
                        else if (selectedSides.length < (product.maxSides || 0)) setSelectedSides([...selectedSides, side]);
                    }} 
                    className={`text-[11px] font-bold p-3 rounded-xl border text-left uppercase italic ${selectedSides.includes(side) ? 'bg-red-700 text-white' : 'bg-zinc-50 text-zinc-500'}`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* BEBIDAS */}
          {category === 'bebidas' && (
            <>
              {product.needsFlavor && (
                <section>
                    <label className="text-red-900 text-[11px] font-black uppercase italic block mb-2">Qual o sabor?</label>
                    <Input label="" placeholder="Digite o sabor desejado..." value={drinkFlavor} onChange={e => setDrinkFlavor(e.target.value)} />
                </section>
              )}
              {product.needsZeroOption && (
                <section>
                    <label className="text-red-900 text-[11px] font-black uppercase italic block mb-4">Selecione:</label>
                    <div className="flex gap-4">
                        <button onClick={() => setIsZero(false)} className={`flex-1 p-4 rounded-xl font-black text-xs uppercase italic border-b-4 ${!isZero ? 'bg-red-700 text-white border-red-900 shadow-md' : 'bg-zinc-50 text-zinc-400 border-zinc-200'}`}>NORMAL</button>
                        <button onClick={() => setIsZero(true)} className={`flex-1 p-4 rounded-xl font-black text-xs uppercase italic border-b-4 ${isZero ? 'bg-zinc-900 text-white border-black shadow-md' : 'bg-zinc-50 text-zinc-400 border-zinc-200'}`}>ZERO</button>
                    </div>
                </section>
              )}
            </>
          )}

          {/* PORÇÕES */}
          {category === 'porcoes' && product.description && (
            <section>
                <label className="text-red-900 text-[11px] font-black uppercase italic block mb-2">Observação:</label>
                <p className="bg-yellow-50 p-4 border border-yellow-200 rounded-xl text-xs text-red-900 font-bold italic leading-relaxed">{product.description}</p>
            </section>
          )}

          {/* CAMPO DE OBSERVAÇÃO GERAL */}
          {category !== 'acai' && (
            <section>
              <label className="block text-red-900/40 text-[10px] font-black uppercase mb-3">Observação Adicional</label>
              <textarea 
                className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] p-4 text-zinc-800 focus:outline-none min-h-[80px] text-sm font-medium" 
                placeholder="Algum pedido especial?" 
                value={observation} 
                onChange={e => setObservation(e.target.value)} 
              />
            </section>
          )}
        </div>

        <div className="p-6 bg-zinc-50/80 border-t border-zinc-100">
          <Button fullWidth onClick={handleConfirm} className="py-4 rounded-[1.5rem] shadow-xl">ADICIONAR À SACOLA</Button>
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
    name: '', phone: '', address: '', neighborhood: '', addressNumber: '', reference: '', deliveryFee: 0, tableNumber: '',
    orderType: OrderType.DELIVERY, paymentMethod: PaymentMethod.PIX, needsChange: false, changeAmount: ''
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [config, setConfig] = useState({ mode: 'auto' });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [receiptStats, setReceiptStats] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [promoAlert, setPromoAlert] = useState<string | null>(null);
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [showAcaiConfirmation, setShowAcaiConfirmation] = useState(false);

  useEffect(() => {
    onSnapshot(collection(db, 'promocoes'), (snapshot) => setPromos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promotion))));
    onSnapshot(doc(db, 'config', 'loja'), (snapshot) => {
        if (snapshot.exists()) setConfig(snapshot.data() as any);
        else setDoc(doc(db, 'config', 'loja'), { mode: 'auto' });
    });
  }, []);

  useEffect(() => {
    if (view === 'ADMIN' && isLoggedIn) {
      const q = query(collection(db, 'pedidos'), orderBy('criadoEm', 'desc'));
      return onSnapshot(q, (snapshot) => setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    }
  }, [view, isLoggedIn]);

  const isOpenNow = useMemo(() => {
    if (config.mode === 'open') return true;
    if (config.mode === 'closed') return false;
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const isWorkingDay = [0, 3, 4, 5, 6].includes(day);
    return isWorkingDay && hour >= 18 && hour < 23;
  }, [config]);

  const itemsTotal = useMemo(() => cart.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0), [cart]);
  const currentFee = (customer.orderType === OrderType.DELIVERY) ? (customer.deliveryFee || 0) : 0;
  const total = itemsTotal + currentFee;
  const filteredOrders = useMemo(() => orders.filter(o => o.status === adminTab), [orders, adminTab]);

  const salesStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completed = orders.filter(o => o.status === 'concluido');
    const getOrdersInRange = (start: Date) => completed.filter(o => (o.criadoEm?.toDate ? o.criadoEm.toDate() : new Date(0)) >= start);
    const dailyOrders = getOrdersInRange(todayStart);
    const weeklyOrders = getOrdersInRange(weekStart);
    const monthlyOrders = getOrdersInRange(monthStart);
    return {
      daily: dailyOrders.reduce((acc, o) => acc + (o.total || 0), 0),
      weekly: weeklyOrders.reduce((acc, o) => acc + (o.total || 0), 0),
      monthly: monthlyOrders.reduce((acc, o) => acc + (o.total || 0), 0),
      deliveryDaily: dailyOrders.reduce((acc, o) => acc + (o.frete || 0), 0),
      deliveryWeekly: weeklyOrders.reduce((acc, o) => acc + (o.frete || 0), 0),
      deliveryMonthly: monthlyOrders.reduce((acc, o) => acc + (o.total || 0), 0),
    };
  }, [orders]);

  const handleFinishOrder = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      let itemsText = cart.map(i => {
        let txt = `${i.quantity}x ${i.name} - R$ ${i.price.toFixed(2)}`;
        if (i.observation) txt += `\n   ↳ ${i.observation.replace(/\n/g, '\n     ')}`;
        return txt;
      }).join('\n');

      if (customer.paymentMethod === PaymentMethod.CASH && customer.needsChange && customer.changeAmount) {
          itemsText += `\n\n⚠️ TROCO PARA R$ ${customer.changeAmount}`;
      }

      let fullAddress = customer.orderType === OrderType.DELIVERY ? `${customer.address}, ${customer.addressNumber} - ${customer.neighborhood}` : customer.orderType;
      await addDoc(collection(db, 'pedidos'), { 
          nomeCliente: customer.name.toUpperCase(), 
          itens: itemsText, 
          total: Number(total.toFixed(2)), 
          frete: Number(currentFee.toFixed(2)), 
          bairro: customer.neighborhood || "N/A", 
          status: "novo", 
          criadoEm: serverTimestamp(), 
          telefone: customer.phone || "N/A", 
          tipo: customer.orderType, 
          pagamento: customer.paymentMethod + (customer.needsChange ? ` (Troco R$ ${customer.changeAmount})` : ''), 
          endereco: fullAddress.toUpperCase() 
      });
      setCart([]); setView('SUCCESS'); 
    } catch (err) { alert('Erro ao enviar.'); setIsSending(false); }
  };

  const handleQuickSale = async (product: Product) => {
    try {
      await addDoc(collection(db, 'pedidos'), {
        nomeCliente: "VENDA RÁPIDA",
        itens: `1x ${product.name} - R$ ${product.price.toFixed(2)}`,
        total: Number(product.price.toFixed(2)),
        frete: 0,
        bairro: "BALCÃO",
        status: "concluido",
        criadoEm: serverTimestamp(),
        telefone: "N/A",
        tipo: OrderType.COUNTER,
        pagamento: PaymentMethod.CASH,
        endereco: "VENDA LOCAL"
      });
      setQuickSaleOpen(false);
    } catch (err) {
      alert("Erro ao realizar venda rápida.");
    }
  };

  const addPromoToCart = (p: Promotion) => {
    const promoItem: CartItem = {
      id: p.id,
      cartId: Date.now().toString(),
      name: p.titulo,
      price: Number(p.valor),
      quantity: 1,
      categoryId: 'promocao',
      isPromotion: true,
      observation: p.itens,
    };
    setCart([...cart, promoItem]);
    setPromoAlert(p.titulo);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => { await updateDoc(doc(db, 'pedidos', orderId), { status: newStatus }); };
  const saveEditedOrder = async (updatedOrder: any) => { await updateDoc(doc(db, 'pedidos', updatedOrder.id), { itens: updatedOrder.itens, pagamento: updatedOrder.pagamento }); setEditingOrder(null); };
  
  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este pedido permanentemente?")) {
      try {
        await deleteDoc(doc(db, 'pedidos', orderId));
      } catch (err) {
        alert("Erro ao excluir pedido.");
      }
    }
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const u = formData.get('user');
    const p = formData.get('pass');
    if (u === 'admin' && p === 'admin@1234') { setIsLoggedIn(true); setView('ADMIN'); } else { alert("Credenciais incorretas."); }
  };

  const QuickSaleSection = () => (
    <div className="bg-white rounded-[2rem] shadow-xl border border-red-50 mb-8 overflow-hidden no-print transition-all">
        <button 
          onClick={() => setQuickSaleOpen(!quickSaleOpen)}
          className="w-full flex items-center justify-between p-6 bg-red-50/30 hover:bg-red-50 transition-colors"
        >
          <h3 className="text-lg font-black text-red-800 italic uppercase">Venda Rápida (Balcão/Bebidas)</h3>
          <span className={`text-2xl transition-transform ${quickSaleOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
        
        <div className={`transition-all duration-300 ease-in-out ${quickSaleOpen ? 'max-h-[800px] opacity-100 p-6 pt-2 border-t border-red-50' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col md:flex-row gap-8 overflow-x-auto no-scrollbar text-left">
              {['balcao', 'bebidas'].map(catId => (
                  <div key={catId} className="flex-1 space-y-2 min-w-[200px]">
                      <p className="text-[10px] font-black text-zinc-400 uppercase italic mb-1">{catId === 'balcao' ? 'Balcão 🍰' : 'Bebidas 🥤'}</p>
                      <div className="grid grid-cols-1 gap-2">
                          {PRODUCTS.filter(p => p.categoryId === catId).map(prod => (
                              <button 
                                  key={prod.id} 
                                  onClick={() => handleQuickSale(prod)}
                                  className="bg-zinc-50 hover:bg-red-50 text-red-950 font-bold text-[11px] p-3 rounded-xl border border-zinc-100 transition-all flex justify-between items-center group"
                              >
                                  <span className="uppercase">{prod.name}</span>
                                  <span className="text-red-600 font-black group-hover:scale-110 transition-transform">R$ {prod.price.toFixed(2)}</span>
                              </button>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
        </div>
    </div>
  );

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
        <div className="space-y-6 text-left">
            <div className="bg-white p-6 rounded-3xl border border-red-50 shadow-sm">
                <h3 className="text-sm font-black text-red-800 uppercase italic mb-4">Nova Promoção</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Título" value={title} onChange={e => setTitle(e.target.value)} />
                    <Input label="Valor (R$)" type="number" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div className="mt-4">
                    <label className="block text-red-700 text-sm font-bold mb-2 ml-1">Itens</label>
                    <textarea className="w-full bg-zinc-900 text-white p-4 rounded-2xl outline-none min-h-[100px]" value={itens} onChange={e => setItens(e.target.value)} placeholder="Ex: Lanche + Refri..." />
                </div>
                <Button onClick={handleAddPromo} className="mt-4 w-full">CADASTRAR PROMOÇÃO</Button>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {promos.map(p => (
                    <div key={p.id} className="bg-white p-6 rounded-3xl border border-red-50 shadow-md flex justify-between items-center">
                        <div>
                            <h4 className="font-black text-red-800 uppercase italic">{p.titulo}</h4>
                            <p className="text-xs text-zinc-500">{p.itens}</p>
                            <p className="text-green-600 font-bold">R$ {p.valor.toFixed(2)}</p>
                        </div>
                        <button onClick={() => deleteDoc(doc(db, 'promocoes', p.id))} className="text-red-600 p-2">🗑️</button>
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
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100 mb-10">
                <p className="text-red-900 font-bold uppercase italic text-sm">Quarta a Domingo<br/>Das 18:00 às 23:00</p>
            </div>
            <button onClick={() => setView('LOGIN')} className="hidden md:block mt-16 text-zinc-200 text-[9px] font-black uppercase tracking-[0.3em] hover:text-red-400 transition-all w-full">Acesso Restrito</button>
        </div>
    );
  }

  if (view === 'LOGIN' && !isLoggedIn) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
              <div className="glass-card p-10 rounded-[3rem] w-full max-w-sm shadow-2xl bg-white border border-red-100">
                  <h2 className="text-2xl font-black text-red-800 italic uppercase mb-6 text-center">Login Cozinha</h2>
                  <form onSubmit={handleLogin} className="space-y-4">
                      <Input label="Usuário" name="user" required />
                      <Input label="Senha" name="pass" type="password" required />
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setView('HOME')} className="flex-1">Voltar</Button>
                        <Button type="submit" className="flex-1">Entrar</Button>
                      </div>
                  </form>
              </div>
          </div>
      );
  }

  if (view === 'ADMIN' && isLoggedIn) return (
    <div className="min-h-screen bg-zinc-50 pb-40">
      <div className="p-6 max-w-7xl mx-auto no-print">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-xl border border-red-50 gap-4">
          <div className="flex items-center gap-4">
              <button onClick={() => setView('HOME')} className="bg-red-50 text-red-800 p-2 rounded-full">←</button>
              <h2 className="text-2xl font-black text-red-800 italic uppercase">Cozinha</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {(['novo', 'preparando', 'concluido', 'cancelado', 'promos', 'config'] as AdminTab[]).map(tab => (
              <button key={tab} onClick={() => setAdminTab(tab)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${adminTab === tab ? 'bg-red-700 text-white shadow-lg' : 'bg-white text-zinc-400 border border-zinc-100'}`}>{tab}</button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => { setIsLoggedIn(false); setView('HOME'); }} className="px-5 py-2 text-[9px]">SAIR</Button>
        </header>

        {(adminTab === 'novo' || adminTab === 'preparando') && <QuickSaleSection />}

        {adminTab === 'config' && (
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-red-50 animate-fade-in text-left">
                <h3 className="text-lg font-black text-red-800 italic uppercase mb-6">Controle de Funcionamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button onClick={() => updateDoc(doc(db, 'config', 'loja'), { mode: 'auto' })} className={`p-8 rounded-3xl border-4 transition-all text-center ${config.mode === 'auto' ? 'bg-red-700 border-red-950 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                        <span className="text-4xl block mb-2">⏰</span>
                        <span className="font-black uppercase italic">Automático</span>
                    </button>
                    <button onClick={() => updateDoc(doc(db, 'config', 'loja'), { mode: 'open' })} className={`p-8 rounded-3xl border-4 transition-all text-center ${config.mode === 'open' ? 'bg-green-600 border-green-800 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                        <span className="text-4xl block mb-2">🔓</span>
                        <span className="font-black uppercase italic">FORÇAR ABERTO</span>
                    </button>
                    <button onClick={() => updateDoc(doc(db, 'config', 'loja'), { mode: 'closed' })} className={`p-8 rounded-3xl border-4 transition-all text-center ${config.mode === 'closed' ? 'bg-zinc-800 border-black text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                        <span className="text-4xl block mb-2">🔒</span>
                        <span className="font-black uppercase italic">FORÇAR FECHADO</span>
                    </button>
                </div>
            </div>
        )}

        {adminTab === 'promos' && <PromoManager />}

        {adminTab === 'concluido' && (
            <div className="mb-8 space-y-4 animate-fade-in no-print">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-[2rem] shadow-md border-b-4 border-red-600 text-left">
                        <p className="text-[10px] font-black text-zinc-400 uppercase italic">Vendas Hoje</p>
                        <p className="text-3xl font-black text-red-800 mt-1 italic leading-none">R$ {salesStats.daily.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-md border-b-4 border-red-600 text-left">
                        <p className="text-[10px] font-black text-zinc-400 uppercase italic">Vendas Semana</p>
                        <p className="text-3xl font-black text-red-800 mt-1 italic leading-none">R$ {salesStats.weekly.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-md border-b-4 border-red-600 text-left">
                        <p className="text-[10px] font-black text-zinc-400 uppercase italic">Vendas Mês</p>
                        <p className="text-3xl font-black text-red-800 mt-1 italic leading-none">R$ {salesStats.monthly.toFixed(2)}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-[2rem] shadow-md border-b-4 border-green-600 text-left">
                        <p className="text-[10px] font-black text-zinc-400 uppercase italic">Entregas Hoje</p>
                        <p className="text-3xl font-black text-green-700 mt-1 italic leading-none">R$ {salesStats.deliveryDaily.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-md border-b-4 border-green-600 text-left">
                        <p className="text-[10px] font-black text-zinc-400 uppercase italic">Entregas Semana</p>
                        <p className="text-3xl font-black text-green-700 mt-1 italic leading-none">R$ {salesStats.deliveryWeekly.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-md border-b-4 border-green-600 text-left">
                        <p className="text-[10px] font-black text-zinc-400 uppercase italic">Entregas Mês</p>
                        <p className="text-3xl font-black text-green-700 mt-1 italic leading-none">R$ {salesStats.deliveryMonthly.toFixed(2)}</p>
                    </div>
                </div>
                <Button onClick={() => { setReceiptStats(salesStats); setReceiptOrder(null); setTimeout(() => { window.print(); setReceiptStats(null); }, 300); }} className="w-full md:w-auto py-3 px-8 rounded-xl flex items-center justify-center gap-2">🖨️ IMPRIMIR RELATÓRIOS</Button>
            </div>
        )}

        {['novo', 'preparando', 'concluido', 'cancelado'].includes(adminTab) && (
            <div className="space-y-4">
                {filteredOrders.map(o => (
                  <div key={o.id} className="bg-white p-5 rounded-[1.5rem] border-l-[8px] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-zinc-200">
                    <div className="min-w-[200px] text-left">
                        <p className="text-sm font-black text-red-950 italic uppercase">{o.nomeCliente}</p>
                        <p className="text-[9px] font-black text-zinc-400 uppercase mt-1">{o.tipo} • {o.pagamento}</p>
                    </div>
                    <div className="flex-1 bg-zinc-50 p-4 rounded-xl text-[10px] font-bold text-zinc-700 whitespace-pre-wrap text-left leading-tight">{o.itens}</div>
                    <div className="flex items-center gap-3">
                       <p className="text-xl font-black text-red-700 italic min-w-[100px]">R$ {Number(o.total || 0).toFixed(2)}</p>
                       <div className="flex gap-2">
                         <button onClick={() => setEditingOrder(o)} className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm" title="Editar Pedido">📝</button>
                         <button onClick={() => { setReceiptOrder(o); setReceiptStats(null); setTimeout(() => window.print(), 300); }} className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-sm" title="Imprimir Recibo">🖨️</button>
                         <button onClick={() => handleDeleteOrder(o.id)} className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shadow-sm hover:bg-red-100" title="Excluir Pedido">🗑️</button>
                         {o.status === 'novo' && <button onClick={() => updateOrderStatus(o.id, 'preparando')} className="bg-orange-500 text-white px-4 h-10 rounded-xl text-[9px] font-black uppercase">Preparar</button>}
                         {o.status === 'preparando' && <button onClick={() => updateOrderStatus(o.id, 'concluido')} className="bg-green-600 text-white px-4 h-10 rounded-xl text-[9px] font-black uppercase">Concluir</button>}
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
          <div className="glass-card p-10 md:p-16 rounded-[3rem] text-center shadow-2xl max-w-sm w-full bg-white relative overflow-hidden border-b-[6px] border-red-100">
            <div className="text-[64px] mb-6 animate-float leading-none">🍔</div>
            <h1 className="text-4xl font-black text-red-800 mb-8 tracking-tighter italic leading-none">Cantinho da Sandra</h1>
            <div className="space-y-4">
                <Button fullWidth onClick={() => setView('ORDER')} className="text-xl py-5 rounded-[2rem] border-b-4 border-red-800">FAZER PEDIDO ➡</Button>
                <button onClick={() => setView('PROMOTIONS')} className="w-full bg-yellow-400 border-4 border-yellow-200 text-red-800 font-black py-5 rounded-[2rem] shadow-xl animate-pulse-slow uppercase italic text-lg hover:bg-yellow-500 transition-all">🔥 PROMOÇÕES 🔥</button>
            </div>
            <button onClick={() => setView('LOGIN')} className="hidden md:block mt-16 text-zinc-200 text-[9px] font-black uppercase tracking-[0.3em] hover:text-red-400 transition-all w-full">Acesso Restrito</button>
          </div>
        </div>
      )}

      {view === 'SUCCESS' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 no-print animate-fade-in text-center">
          <div className="glass-card p-10 rounded-[3rem] shadow-2xl max-md w-full bg-white border border-green-100 p-8">
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-2xl font-black text-green-800 uppercase italic mb-4 leading-tight">Pedido realizado com sucesso!</h2>
            <p className="text-zinc-600 font-bold mb-8 leading-relaxed">
              Recebemos seu pedido no Cantinho da Sandra 🍔💛<br/><br/>
              Em breve, nossa equipe entrará em contato para confirmar os detalhes.<br/>
              Obrigado pela preferência! 😋✨
            </p>
            <div className="space-y-3">
              <a 
                href="https://wa.me/5527992269550?text=Ei%2C%20Sandra!%20J%C3%A1%20fiz%20meu%20pedido%20pelo%20app%20%F0%9F%98%8B%F0%9F%8D%94" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-[2rem] shadow-xl uppercase italic text-lg transition-all border-b-4 border-green-900 flex items-center justify-center"
              >
                CONFIRMAR PEDIDO ✅
              </a>
              <Button 
                fullWidth 
                variant="secondary" 
                onClick={() => setView('HOME')} 
                className="py-5 text-zinc-500 border-zinc-200"
              >
                AGUARDAR CONFIRMAÇÃO
              </Button>
            </div>
          </div>
        </div>
      )}

      {view === 'PROMOTIONS' && (
        <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-zinc-50 p-6 animate-fade-in no-print">
            <header className="flex justify-between items-center mb-10">
                <button onClick={() => setView('HOME')} className="bg-white text-red-800 p-3 rounded-full shadow-md">←</button>
                <h2 className="text-2xl font-black text-red-800 italic uppercase">Promoções 🔥</h2>
                <button onClick={() => setView('ORDER')} className="bg-red-700 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase italic">Cardápio 📖</button>
            </header>
            <div className="space-y-6">
                {promos.length === 0 ? (
                    <div className="text-center py-20 opacity-30 italic font-black uppercase">Nenhuma promoção ativa</div>
                ) : (
                    promos.map(p => (
                        <div key={p.id} className="bg-white rounded-[2.5rem] p-8 border-4 border-yellow-300 shadow-2xl relative overflow-hidden text-left">
                            <h3 className="text-3xl font-black text-red-800 uppercase italic mb-2 leading-none">{p.titulo}</h3>
                            <p className="text-zinc-500 font-bold text-sm mb-6 leading-relaxed">{p.itens}</p>
                            <div className="flex justify-between items-end">
                                <p className="text-3xl font-black text-green-600 italic">R$ {p.valor.toFixed(2)}</p>
                                <button onClick={() => addPromoToCart(p)} className="bg-red-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl active:scale-95 transition-all uppercase italic text-xs border-b-4 border-red-950">Adicionar</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {promoAlert && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white p-8 rounded-[3rem] text-center max-w-sm w-full shadow-2xl border-4 border-yellow-400">
                        <div className="text-5xl mb-4">🛒</div>
                        <h3 className="text-xl font-black text-red-800 uppercase italic mb-2">Adicionado à Sacola!</h3>
                        <p className="text-zinc-500 font-bold mb-8 uppercase text-xs italic">A promoção "{promoAlert}" já está no seu pedido.</p>
                        <div className="space-y-3">
                            <Button fullWidth onClick={() => { setPromoAlert(null); setView('ORDER'); setStep('MENU'); }} className="py-4">VER CARDÁPIO</Button>
                            <Button fullWidth variant="secondary" onClick={() => { setPromoAlert(null); setView('ORDER'); setStep('CART_REVIEW'); }} className="py-4">VER SACOLA</Button>
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
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Pesquisar..." className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 px-10 text-[11px] font-bold text-red-900 outline-none shadow-inner" />
                    </div>
                    <div className="p-4 flex gap-3 overflow-x-auto no-scrollbar pb-5 bg-white">
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex-shrink-0 px-5 py-3 rounded-full font-black text-[9px] uppercase transition-all ${activeCategory === cat.id ? 'bg-red-700 text-white shadow-lg' : 'bg-zinc-50 text-zinc-400'}`}>{cat.icon} {cat.name}</button>
                        ))}
                    </div>
                    <div className="flex-1 p-5 space-y-4 pb-44 overflow-y-auto custom-scrollbar">
                        {PRODUCTS.filter(p => (searchTerm === '' ? p.categoryId === activeCategory : p.name.toLowerCase().includes(searchTerm.toLowerCase()))).map(prod => (
                            <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="bg-white border border-zinc-50 p-5 rounded-[2rem] flex justify-between items-center shadow-md active:scale-95 transition-all cursor-pointer">
                                <div className="flex-1 pr-4 text-left">
                                    <h3 className="text-lg font-black text-red-950 italic uppercase leading-tight">{prod.name}</h3>
                                    {prod.unit && <p className="text-[10px] text-zinc-400 font-black uppercase italic leading-none mb-1">{prod.unit}</p>}
                                    <p className="text-red-600 font-black text-base italic">R$ {prod.price.toFixed(2)}</p>
                                </div>
                                <div className="w-10 h-10 bg-red-700 text-white rounded-xl flex items-center justify-center text-2xl font-black">+</div>
                            </div>
                        ))}
                    </div>
                    {cart.length > 0 && <div className="fixed bottom-8 left-6 right-6 z-50 animate-slide-up max-w-lg mx-auto"><Button fullWidth onClick={() => setStep('CART_REVIEW')} className="py-5 text-lg flex justify-between items-center px-8 shadow-2xl rounded-[2rem] border-b-4 border-red-900"><span className="font-black italic uppercase">Sacola ({cart.length})</span><span className="bg-white/20 px-5 py-1.5 rounded-xl text-base font-black">R$ {itemsTotal.toFixed(2)}</span></Button></div>}
                </>
            )}
            {['CART_REVIEW', 'TYPE_SELECTION', 'FORM', 'SUMMARY'].includes(step) && (
                <div className="p-8 pb-44 animate-fade-in space-y-6">
                    {step === 'CART_REVIEW' && (
                        <div className="space-y-6">
                            <h2 className="text-3xl font-black text-red-800 tracking-tighter italic uppercase text-left">Sua Sacola</h2>
                            <div className="space-y-4">
                                {cart.map(item => (
                                    <div key={item.cartId} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 flex justify-between items-center text-left">
                                        <div className="flex-1 pr-4">
                                            <p className="font-black text-red-950 text-sm italic uppercase leading-tight">{item.quantity}x {item.name}</p>
                                            {item.observation && <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1 italic leading-tight whitespace-pre-wrap">{item.observation}</p>}
                                            {item.isPromotion && <span className="text-[8px] bg-yellow-400 text-red-800 px-2 py-0.5 rounded-full font-black uppercase italic">Promo 🔥</span>}
                                        </div>
                                        <div className="flex items-center gap-3"><p className="font-black text-red-800 text-sm italic">R$ {(item.price * item.quantity).toFixed(2)}</p><button onClick={() => setCart(cart.filter(c => c.cartId !== item.cartId))} className="text-red-600">🗑️</button></div>
                                    </div>
                                ))}
                                <div className="pt-6 border-t border-zinc-100 flex justify-between items-center"><span className="text-xl font-black text-zinc-300 italic uppercase">Subtotal</span><span className="text-3xl font-black text-red-700 italic">R$ {itemsTotal.toFixed(2)}</span></div>
                                <Button fullWidth onClick={() => setStep('TYPE_SELECTION')} className="py-5 rounded-[2rem]">CONTINUAR</Button>
                                <button onClick={() => setStep('MENU')} className="w-full text-zinc-400 font-black uppercase text-xs tracking-widest py-2">Voltar ao Cardápio</button>
                            </div>
                        </div>
                    )}
                    {step === 'TYPE_SELECTION' && (
                        <div className="space-y-10 py-10">
                            <h2 className="text-4xl font-black text-red-900 italic text-center uppercase leading-none">Como deseja receber?</h2>
                            <div className="grid grid-cols-1 gap-4">
                                <button onClick={() => { setCustomer({...customer, orderType: OrderType.DELIVERY}); setStep('FORM'); }} className="bg-zinc-50 border p-8 rounded-[2.5rem] flex items-center gap-6 hover:border-red-600 transition-all text-left"><span className="text-5xl">🛵</span><span className="font-black text-red-950 text-xl uppercase italic">Entrega</span></button>
                                <button onClick={() => { setCustomer({...customer, orderType: OrderType.COUNTER}); setStep('FORM'); }} className="bg-zinc-50 border p-8 rounded-[2.5rem] flex items-center gap-6 hover:border-red-600 transition-all text-left"><span className="text-5xl">🥡</span><span className="font-black text-red-950 text-xl uppercase italic">Retirada</span></button>
                                <button onClick={() => { setCustomer({...customer, orderType: OrderType.TABLE, paymentMethod: PaymentMethod.NOT_INFORMED}); setStep('FORM'); }} className="bg-zinc-50 border p-8 rounded-[2.5rem] flex items-center gap-6 hover:border-red-600 transition-all text-left"><span className="text-5xl">🪑</span><span className="font-black text-red-950 text-xl uppercase italic">Mesa</span></button>
                            </div>
                            <button onClick={() => setStep('MENU')} className="w-full text-zinc-400 font-black uppercase text-xs tracking-widest py-2">Voltar ao Cardápio</button>
                        </div>
                    )}
                    {step === 'FORM' && (
                        <div className="space-y-6 text-left">
                            <h2 className="text-3xl font-black text-red-800 italic uppercase">Seus Dados</h2>
                            <form onSubmit={(e) => { e.preventDefault(); setStep('SUMMARY'); }} className="space-y-4">
                                <Input label="Seu Nome" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} required />
                                
                                {customer.orderType !== OrderType.TABLE && (
                                    <>
                                        <Input label="WhatsApp" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="(00) 00000-0000" required />
                                        {customer.orderType === OrderType.DELIVERY && (
                                            <>
                                                <Select label="Bairro" value={customer.neighborhood} onChange={e => {
                                                    const f = DELIVERY_FEES.find(df => df.neighborhood === e.target.value);
                                                    setCustomer({...customer, neighborhood: e.target.value, deliveryFee: f?.fee || 0});
                                                }} options={[{ value: '', label: 'Selecione...' }, ...DELIVERY_FEES.map(f => ({ value: f.neighborhood, label: `${f.neighborhood} - R$ ${f.fee.toFixed(2)}` }))]} required />
                                                <Input label="Endereço" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="Rua e número..." required />
                                            </>
                                        )}
                                        <Select label="Pagamento" options={PAYMENT_METHODS} value={customer.paymentMethod} onChange={e => setCustomer({...customer, paymentMethod: e.target.value as PaymentMethod})} />
                                        
                                        {customer.paymentMethod === PaymentMethod.CASH && (
                                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 animate-fade-in space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type="checkbox" 
                                                        id="needsChange" 
                                                        checked={customer.needsChange} 
                                                        onChange={e => setCustomer({...customer, needsChange: e.target.checked})}
                                                        className="w-5 h-5 rounded accent-red-700"
                                                    />
                                                    <label htmlFor="needsChange" className="text-sm font-black text-red-800 uppercase italic cursor-pointer">Precisa de troco?</label>
                                                </div>
                                                {customer.needsChange && (
                                                    <Input 
                                                        label="Troco para quanto?" 
                                                        type="number" 
                                                        placeholder="Ex: 50.00" 
                                                        value={customer.changeAmount} 
                                                        onChange={e => setCustomer({...customer, changeAmount: e.target.value})} 
                                                        required 
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                <Button type="submit" fullWidth className="py-5 text-lg rounded-[1.5rem] mt-10">VERIFICAR PEDIDO</Button>
                                <button type="button" onClick={() => setStep('MENU')} className="w-full text-zinc-400 font-black uppercase text-xs tracking-widest py-2">Voltar ao Cardápio</button>
                            </form>
                        </div>
                    )}
                    {step === 'SUMMARY' && (
                        <div className="space-y-8 text-left">
                            <h2 className="text-3xl font-black text-red-800 italic uppercase">Confirmar</h2>
                            <div className="bg-zinc-50 p-6 rounded-[2rem] space-y-6 border border-white shadow-xl">
                                <p className="text-2xl font-black text-red-950 italic uppercase leading-none">{customer.name}</p>
                                <div className="space-y-2 border-t border-zinc-200 pt-4">
                                    {cart.map(item => (
                                        <div key={item.cartId} className="flex justify-between text-sm italic font-black uppercase text-red-900 leading-tight">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-zinc-200 pt-4 space-y-2 text-xs font-black uppercase italic">
                                    {customer.orderType !== OrderType.TABLE && <p className="text-zinc-400">PAGAMENTO: {customer.paymentMethod}</p>}
                                    {customer.paymentMethod === PaymentMethod.CASH && customer.needsChange && customer.orderType !== OrderType.TABLE && (
                                        <p className="text-red-600">LEVAR TROCO PARA R$ {Number(customer.changeAmount).toFixed(2)}</p>
                                    )}
                                </div>
                                <div className="border-t border-zinc-200 pt-4 space-y-2">
                                    {customer.orderType === OrderType.DELIVERY && <div className="flex justify-between text-xs font-black text-red-400 italic"><span>Entrega</span><span>R$ {currentFee.toFixed(2)}</span></div>}
                                    <div className="flex justify-between items-center pt-2 text-3xl font-black text-red-700 italic leading-none"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
                                </div>
                            </div>
                            <Button onClick={handleFinishOrder} disabled={isSending} fullWidth className={`py-6 text-2xl rounded-[2.5rem] border-b-8 border-red-950 ${isSending ? 'opacity-50' : 'animate-pulse-slow'}`}>{isSending ? 'ENVIANDO...' : 'FINALIZAR! ✅'}</Button>
                            <button onClick={() => setStep('MENU')} className="w-full text-zinc-400 font-black uppercase text-xs tracking-widest py-2">Voltar ao Cardápio</button>
                        </div>
                    )}
                </div>
            )}
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE AÇAÍ ADICIONADO */}
      {showAcaiConfirmation && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
              <div className="bg-white p-8 rounded-[3rem] text-center max-w-sm w-full shadow-2xl border-4 border-red-50">
                  <div className="text-5xl mb-4">🍧</div>
                  <h3 className="text-xl font-black text-red-800 uppercase italic mb-2">Açaí Adicionado!</h3>
                  <p className="text-zinc-500 font-bold mb-8 uppercase text-[10px] italic">Deseja adicionar outro açaí para outra pessoa ou ir para a sacola?</p>
                  <div className="space-y-3">
                      <button 
                        onClick={() => { setShowAcaiConfirmation(false); setActiveCategory('acai'); setStep('MENU'); }}
                        className="w-full bg-red-700 text-white font-black py-4 rounded-2xl shadow-xl uppercase italic text-xs border-b-4 border-red-950"
                      >
                        PEDIR OUTRO AÇAÍ ➕
                      </button>
                      <button 
                        onClick={() => { setShowAcaiConfirmation(false); setStep('CART_REVIEW'); }}
                        className="w-full bg-zinc-100 text-zinc-500 font-black py-4 rounded-2xl shadow-md uppercase italic text-xs border-b-4 border-zinc-300"
                      >
                        VER MINHA SACOLA 🛒
                      </button>
                  </div>
              </div>
          </div>
      )}

      <ProductModal isOpen={!!selectedProduct} product={selectedProduct} onClose={() => setSelectedProduct(null)} onConfirm={(item: CartItem) => { 
          setCart([...cart, item]); 
          setSelectedProduct(null); 
          if (item.categoryId === 'acai') {
              setShowAcaiConfirmation(true);
          }
      }} />
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 2.5s infinite ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fee2e2; border-radius: 10px; }
        @media print { .no-print { display: none !important; } .printable-area { display: block !important; } }
      `}</style>
    </div>
  );
}
