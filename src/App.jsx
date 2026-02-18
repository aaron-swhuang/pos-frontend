import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Settings, LogOut, Plus, Minus, Trash2,
  Store, User, FileText, ChevronDown, ChevronUp, ChevronRight, Utensils, ShoppingBag,
  Clock, Search, Tag, Edit2, X, CheckCircle, AlertCircle,
  ClipboardList, Wallet, Banknote, CreditCard, Smartphone,
  ShieldCheck, RotateCcw, AlertTriangle, Save, Ticket, Eye, EyeOff,
  Receipt, Database, Copy, Code, ChevronLeft,
  ChevronsLeft, ChevronsRight, ListFilter, Info, Calendar, FilterX, Play,
  StopCircle, Lock, Coins, Layers, Check, Box, Bug, CheckCircle2
} from 'lucide-react';

// --- Helpers: 統一日期與時間格式 ---
// 格式: YYYY-MM-DD (補零)
const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 格式: HH:mm:ss
const getCurrentTime = () => {
  const date = new Date();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// 格式: YYYY-MM-DD HH:mm:ss
const getCurrentDateTime = () => {
  return `${getTodayDate()} ${getCurrentTime()}`;
};

// --- DEBUG: Error Boundary ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[POS_CRASH]", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    if (window.confirm('確定要清除所有資料並重置系統嗎？此操作無法復原。')) {
      console.warn("[POS_DEBUG] Force clearing localStorage...");
      localStorage.clear();
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-8 font-sans text-red-900">
          <div className="max-w-2xl w-full bg-white p-8 rounded-3xl shadow-xl border border-red-200">
            <h1 className="text-3xl font-black mb-4 flex items-center gap-3">
              <AlertTriangle size={32} className="text-red-600" />
              系統發生錯誤 (System Error)
            </h1>
            <p className="mb-4 text-slate-600 font-bold">請將下方的錯誤訊息複製給開發者，或嘗試點擊下方的重置按鈕。</p>
            <div className="bg-slate-900 text-green-400 p-4 rounded-xl overflow-auto text-xs font-mono mb-6 max-h-64">
              <p className="font-bold border-b border-white/20 pb-2 mb-2">{this.state.error && this.state.error.toString()}</p>
              <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
            </div>
            <button onClick={this.handleReset} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
              <Trash2 size={20} /> 清除所有資料並重置 (Reset Data)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- 0. 核心業務邏輯 ---

const calculateDiscount = (total, value, type) => {
  if (type === 'percentage') {
    return Math.round(total * (1 - (value > 1 ? value / 100 : value)));
  }
  return value; // 定額折抵
};

const calculateFinalTotal = (total, discount) => Math.max(0, total - (parseFloat(discount) || 0));

const calculateChange = (received, total) => (parseFloat(received) || 0) - total;

const generateCartItemId = (item, selectedModules) => {
  if (!selectedModules || Object.keys(selectedModules).length === 0) {
    return `${item.id}_default`;
  }
  const optionsKey = Object.entries(selectedModules)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, opt]) => `${group}:${opt?.name || 'unknown'}`)
    .join('|');
  return `${item.id}_${optionsKey}`;
};

const getUpdatedCart = (prevCart, newItem) => {
  const cartId = generateCartItemId(newItem, newItem.selectedModules);
  const existing = prevCart.find(i => i.cartId === cartId);
  if (existing) {
    return prevCart.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i);
  }
  return [...prevCart, { ...newItem, cartId, quantity: 1 }];
};

// --- 1. 全域資料管理中心 ---
export const POSContext = createContext();

export const POSProvider = ({ children }) => {
  const safeJsonParse = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved || saved === "undefined" || saved === "null") return defaultValue;
      const parsed = JSON.parse(saved);
      if (Array.isArray(defaultValue) && !Array.isArray(parsed)) return defaultValue;
      return parsed;
    } catch (e) { return defaultValue; }
  };

  const [modifierTemplates, setModifierTemplates] = useState(() => safeJsonParse('pos_templates', [
    { id: 't1', name: '尺寸 (Size)', options: ['大杯', '中杯'] },
    { id: 't2', name: '冰塊 (Ice)', options: ['正常冰', '少冰', '微冰', '去冰', '溫', '熱'] },
    { id: 't3', name: '甜度 (Sugar)', options: ['正常糖', '半糖', '微糖', '無糖'] },
    { id: 't4', name: '加料 (Toppings)', options: ['珍珠', '椰果'] }
  ]));

  const [menu, setMenu] = useState(() => safeJsonParse('pos_menu', [
    { id: 1, name: '招牌美式', price: 65, category: '咖啡', isAvailable: true },
    { id: 2, name: '經典拿鐵', price: 85, category: '咖啡', isAvailable: true },
    { id: 3, name: '大吉嶺紅茶', price: 50, category: '茶飲', isAvailable: true },
    { id: 4, name: '起司蛋糕', price: 95, category: '甜點', isAvailable: true }
  ]));

  const [orders, setOrders] = useState(() => safeJsonParse('pos_orders', []));
  const [dailySummaries, setDailySummaries] = useState(() => safeJsonParse('pos_daily_summaries', []));
  const [discountRules, setDiscountRules] = useState(() => safeJsonParse('pos_discounts', [
    { id: 1, name: '9折優惠', type: 'percentage', value: 0.9 },
    { id: 2, name: '8折優惠', type: 'percentage', value: 0.8 },
    { id: 3, name: '現折 $10', type: 'amount', value: 10 }
  ]));

  const [config, setConfig] = useState(() => safeJsonParse('pos_config', {
    dineInMode: 'prePay', storeName: 'Smart POS', enableCreditCard: true, enableMobilePayment: true
  }));

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [shift, setShift] = useState(() => safeJsonParse('pos_shift', {
    isOpen: false, businessDate: null, openedAt: null
  }));

  const [modal, setModal] = useState({
    isOpen: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null, confirmText: '確認', cancelText: '取消'
  });

  // --- 自動修復舊日期格式 (Migration Effect) ---
  useEffect(() => {
    const fixDate = (d) => {
      if (!d || typeof d !== 'string' || !d.includes('/')) return d;
      const parts = d.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) { // M/D/YYYY
          return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        } else if (parts[0].length === 4) { // YYYY/M/D
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
      return d;
    };

    let shiftFixed = false;
    let ordersFixed = false;
    let summariesFixed = false;

    if (shift.businessDate && shift.businessDate.includes('/')) {
      setShift(prev => ({ ...prev, businessDate: fixDate(prev.businessDate) }));
      shiftFixed = true;
    }

    if (orders.some(o => o.date && o.date.includes('/'))) {
      setOrders(prev => prev.map(o => ({ ...o, date: fixDate(o.date) })));
      ordersFixed = true;
    }

    if (dailySummaries.some(s => s.date && s.date.includes('/'))) {
      setDailySummaries(prev => prev.map(s => ({ ...s, date: fixDate(s.date) })));
      summariesFixed = true;
    }

    if (shiftFixed || ordersFixed || summariesFixed) {
      console.log('[System] Date format migration applied.');
    }
  }, []);

  const showAlert = (title, message, type = 'info') => {
    setModal({
      isOpen: true, title, message, type, confirmText: '我知道了',
      onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })), onCancel: null
    });
  };

  const showConfirm = (title, message, onConfirm, type = 'confirm') => {
    setModal({
      isOpen: true, title, message, type, confirmText: '確定執行', cancelText: '取消返回',
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setModal(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  const openShift = () => {
    const today = getTodayDate();
    const newShift = { isOpen: true, businessDate: today, openedAt: getCurrentDateTime() };
    setShift(newShift);
    try { localStorage.setItem('pos_shift', JSON.stringify(newShift)); } catch (e) { }
    showAlert('開帳成功', `營業日已設定為 ${today}。`, 'success');
  };

  useEffect(() => {
    try {
      localStorage.setItem('pos_templates', JSON.stringify(modifierTemplates));
      localStorage.setItem('pos_menu', JSON.stringify(menu));
      localStorage.setItem('pos_orders', JSON.stringify(orders));
      localStorage.setItem('pos_daily_summaries', JSON.stringify(dailySummaries));
      localStorage.setItem('pos_config', JSON.stringify(config));
      localStorage.setItem('pos_discounts', JSON.stringify(discountRules));
      localStorage.setItem('pos_shift', JSON.stringify(shift));
    } catch (e) {
      console.error("[POS_DEBUG] Storage save failed", e);
    }
  }, [menu, orders, dailySummaries, config, discountRules, shift, modifierTemplates]);

  return (
    <POSContext.Provider value={{
      menu, setMenu, orders, setOrders, dailySummaries, setDailySummaries,
      discountRules, setDiscountRules, modifierTemplates, setModifierTemplates,
      isLoggedIn, setIsLoggedIn, config, setConfig,
      shift, setShift, openShift, showAlert, showConfirm, modal
    }}>
      {children}
    </POSContext.Provider>
  );
};

// --- Components ---
const GlobalModal = () => {
  const { modal } = useContext(POSContext);
  if (!modal.isOpen) return null;
  const getIcon = () => {
    switch (modal.type) {
      case 'danger': return <AlertTriangle className="text-red-500" size={32} />;
      case 'success': return <CheckCircle2 className="text-green-500" size={32} />;
      case 'confirm': return <Info className="text-blue-500" size={32} />;
      default: return <Info className="text-blue-500" size={32} />;
    }
  };
  const theme = modal.type === 'danger' ? { bg: 'bg-red-50', btn: 'bg-red-600' } : modal.type === 'success' ? { bg: 'bg-green-50', btn: 'bg-green-600' } : { bg: 'bg-blue-50', btn: 'bg-blue-600' };
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-white/20">
        <div className="p-10 flex flex-col items-center text-center">
          <div className={`p-4 rounded-2xl mb-6 ${theme.bg}`}>{getIcon()}</div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">{modal.title}</h3>
          <p className="text-slate-500 font-medium leading-relaxed">{modal.message}</p>
        </div>
        <div className="flex border-t border-slate-100">
          {modal.onCancel && <button onClick={modal.onCancel} className="flex-1 py-6 font-bold text-slate-400 border-r border-slate-100 hover:bg-slate-50 transition-colors">{modal.cancelText}</button>}
          <button onClick={modal.onConfirm} className={`flex-1 py-6 font-black text-white transition-colors hover:opacity-90 ${theme.btn}`}>{modal.confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const Keypad = ({ onInput, onClear, onDelete }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', '.'];
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map(key => (<button key={key} type="button" onClick={() => onInput(key)} className="h-12 rounded-xl bg-white border border-slate-200 shadow-sm text-xl font-bold text-slate-800 hover:bg-blue-50 active:scale-95 transition-all">{key}</button>))}
      <button type="button" onClick={onClear} className="h-12 rounded-xl bg-red-50 text-red-500 font-bold hover:bg-red-100 text-sm uppercase">AC</button>
      <button type="button" onClick={onDelete} className="h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"><ChevronLeft size={24} /></button>
    </div>
  );
};

// --- 2.5 ProductOptionModal ---
const ProductOptionModal = ({ isOpen, onClose, product, onConfirm, initialData }) => {
  const [selectedModules, setSelectedModules] = useState({});

  useEffect(() => {
    if (isOpen && product) {
      if (initialData) {
        setSelectedModules(initialData.selectedModules || {});
      } else {
        const defaults = {};
        // 修正：不強制預設選取 Variant
        setSelectedModules(defaults);
      }
    }
  }, [isOpen, product, initialData]);

  if (!isOpen || !product) return null;

  const safeModules = product.modules || [];

  const calculateCurrentPrice = () => {
    let finalPrice = 0;
    let hasVariantSet = false;

    safeModules.forEach(mod => {
      const selectedOpt = selectedModules[mod.name];
      if (mod.type === 'variant' && selectedOpt) {
        finalPrice = parseFloat(selectedOpt.price || 0);
        hasVariantSet = true;
      }
    });

    if (!hasVariantSet) { finalPrice = product.price || 0; }

    safeModules.forEach(mod => {
      const selectedOpt = selectedModules[mod.name];
      if (mod.type === 'addon' && selectedOpt) {
        finalPrice += parseFloat(selectedOpt.price || 0);
      }
    });
    return finalPrice;
  };

  const handleConfirm = () => {
    onConfirm({
      ...product,
      selectedModules,
      price: calculateCurrentPrice()
    });
    onClose();
  };

  const handleSelectOption = (moduleName, option, type) => {
    setSelectedModules(prev => {
      // 修正：允許反選 (取消選擇)
      if (prev[moduleName]?.name === option.name) {
        const next = { ...prev };
        delete next[moduleName];
        return next;
      }
      return { ...prev, [moduleName]: option };
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-800">{product.name}</h3>
            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">{initialData ? '編輯內容' : '客製化選項'}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
          {safeModules.map((mod, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-2 mb-3">
                {mod.type === 'variant' && <Coins size={14} className="text-orange-500" />}
                {mod.type === 'addon' && <Plus size={14} className="text-blue-500" />}
                {mod.type === 'option' && <CheckCircle2 size={14} className="text-green-500" />}
                <h4 className={`text-xs font-black uppercase tracking-widest ${mod.type === 'variant' ? 'text-orange-600' :
                  mod.type === 'addon' ? 'text-blue-600' : 'text-green-600'
                  }`}>
                  {mod.name}
                  {mod.type === 'variant' ? '(定價)' : mod.type === 'addon' ? '(加選)' : '(選項)'}
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {(mod.options || []).map((opt, optIdx) => {
                  if (!opt) return null;
                  const isSelected = selectedModules[mod.name]?.name === opt.name;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(mod.name, opt, mod.type)}
                      className={`px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all flex flex-col items-center min-w-[80px] ${isSelected
                        ? (mod.type === 'variant' ? 'border-orange-500 bg-orange-50 text-orange-700' : mod.type === 'addon' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-green-500 bg-green-50 text-green-700')
                        : 'border-slate-100 hover:border-slate-300 text-slate-600 bg-white'
                        }`}
                    >
                      <span>{opt.name}</span>
                      {mod.type === 'variant' && <span className="text-xs mt-1 font-mono">${opt.price}</span>}
                      {mod.type === 'addon' && opt.price > 0 && <span className="text-xs mt-1 opacity-70">+${opt.price}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {safeModules.length === 0 && <div className="text-center text-slate-400 py-10">此商品無客製化選項</div>}
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">小計金額</p>
            <p className="text-3xl font-black text-blue-600 font-mono">${calculateCurrentPrice()}</p>
          </div>
          <button onClick={handleConfirm} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"><Check size={20} /> {initialData ? '更新購物車' : '加入訂單'}</button>
        </div>
      </div>
    </div>
  );
};

// --- 3. CheckoutModal ---
export const CheckoutModal = ({ isOpen, onClose, cartTotal, items, onConfirm }) => {
  const { config, discountRules, shift } = useContext(POSContext);
  const [discount, setDiscount] = useState('0');
  const [discountName, setDiscountName] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [focusField, setFocusField] = useState('cash');

  if (!isOpen) return null;

  const numDiscount = parseFloat(discount) || 0;
  const numCash = parseFloat(cashReceived) || 0;
  const finalTotal = calculateFinalTotal(cartTotal, numDiscount);
  const change = calculateChange(numCash, finalTotal);

  const handleKeypadInput = (val) => {
    if (focusField === 'cash') {
      setCashReceived(prev => (val === '.' && prev.includes('.')) ? prev : prev + val);
    } else {
      setDiscount(prev => (prev === '0' && val !== '.') ? val : (val === '.' && prev.includes('.')) ? prev : prev + val);
      setDiscountName('手動');
    }
  };

  const handleFinalConfirm = () => {
    if (paymentMethod === 'Cash' && numCash < finalTotal) return;
    onConfirm({
      total: finalTotal, discount: numDiscount, discountName: discountName || (numDiscount > 0 ? '手動' : ''),
      paymentMethod, cashReceived: paymentMethod === 'Cash' ? numCash : finalTotal,
      change: paymentMethod === 'Cash' ? Math.max(0, change) : 0,
      businessDate: shift.businessDate
    });
    setDiscount('0'); setDiscountName(''); setCashReceived(''); setPaymentMethod('Cash');
  };

  const options = [
    { id: 'Cash', label: '現金', icon: <Banknote size={22} />, enabled: true },
    { id: 'Credit', label: '刷卡', icon: <CreditCard size={22} />, enabled: config.enableCreditCard },
    { id: 'Mobile', label: '支付', icon: <Smartphone size={22} />, enabled: config.enableMobilePayment }
  ].filter(opt => opt.enabled);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-800 font-sans">
      <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden max-h-[92vh]">
        <div className="lg:w-[35%] bg-slate-50 p-8 border-r border-slate-200 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <h3 className="text-xl font-black mb-5 text-slate-800">結帳內容確認</h3>
            <div className="bg-white/70 rounded-2xl border border-slate-200 p-4 overflow-y-auto flex-1 shadow-inner">
              {(items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm text-slate-600 border-b border-slate-100 py-3 last:border-0">
                  <div className="flex flex-col max-w-[70%]">
                    <span className="font-bold text-slate-800 truncate">{item.name}</span>
                    {/* 修正：只顯示選項名稱，不顯示模組名稱 */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.values(item.selectedModules || {}).map((val, i) => val ? (
                        <span key={i} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                          {val.name}
                        </span>
                      ) : null)}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">x{item.quantity}</span>
                  </div>
                  <span className="font-bold text-slate-900">${item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3 mt-6 pt-6 border-t border-slate-200 shrink-0">
            <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-widest"><span>原價小計</span><span>${cartTotal}</span></div>
            <div onClick={() => setFocusField('discount')} className={`flex justify-between p-4 rounded-xl border transition-all cursor-pointer ${focusField === 'discount' ? 'border-blue-500 bg-white ring-4 ring-blue-50 shadow-md' : 'border-slate-200 bg-white/40'}`}>
              <span className="text-xs font-black text-slate-400 uppercase">優惠折抵 {discountName && `(${discountName})`}</span>
              <span className="text-lg font-black text-red-500">-${discount}</span>
            </div>
            <div className="flex justify-between items-end pt-2">
              <span className="text-sm font-black text-slate-400 uppercase tracking-tighter">應收總額</span>
              <span className="text-5xl font-black text-blue-600 tracking-tight">${finalTotal}</span>
            </div>
          </div>
        </div>
        <div className="flex-1 p-8 flex flex-col bg-white overflow-hidden justify-between">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">1. 選擇支付方式</h3>
              <div className="grid grid-cols-3 gap-3">
                {options.map(opt => (
                  <button key={opt.id} type="button" onClick={() => setPaymentMethod(opt.id)} className={`flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all gap-2 ${paymentMethod === opt.id ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md scale-[1.02]' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                    {opt.icon}<span className="font-black text-xs uppercase">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">2. 套用優惠方案</h3>
              <div className="flex gap-2 flex-wrap px-1">
                {discountRules.map(rule => (
                  <button key={rule.id} type="button" onClick={() => {
                    const val = calculateDiscount(cartTotal, rule.value, rule.type);
                    setDiscount(val.toString()); setDiscountName(rule.name);
                  }} className={`px-4 py-2 rounded-xl border text-[11px] font-black transition-all flex items-center gap-1.5 ${discountName === rule.name ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300'}`}><Ticket size={12} />{rule.name}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 items-start">
              <div className="flex flex-col">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-1">3. 收受金額與找零</h3>
                {paymentMethod === 'Cash' ? (
                  <div className="space-y-3">
                    <div onClick={() => setFocusField('cash')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${focusField === 'cash' ? 'border-blue-600 bg-white ring-8 ring-blue-50 shadow-lg' : 'border-slate-100 bg-slate-50'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">實收金額</span>
                        <div className="flex gap-1.5">
                          {[100, 500, 1000].map(v => (
                            <button key={v} type="button" onClick={(e) => { e.stopPropagation(); setCashReceived(prev => ((parseFloat(prev) || 0) + v).toString()); }} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold hover:border-blue-600 transition-colors shadow-sm">+{v}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between font-black"><span className="text-xl text-slate-300">$</span><span className="text-3xl text-slate-800">{cashReceived || '0'}</span></div>
                    </div>
                    <div className={`p-4 rounded-2xl border flex flex-col justify-center shadow-sm transition-all ${change >= 0 ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                      <label className="text-[10px] font-black opacity-60 uppercase mb-1 tracking-widest">找零金額</label>
                      <div className="flex items-center justify-between px-1 font-black"><span className="text-xl">$</span><span className="text-2xl">{change >= 0 ? Math.round(change) : "金額不足"}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-6 text-center min-h-[160px]">
                    <CheckCircle2 size={40} className="mb-3 opacity-30 text-blue-500" />
                    <p className="font-black text-sm italic">數位支付模式</p>
                    <p className="text-[10px] mt-1 opacity-70">系統將自動記錄全額扣款</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col pt-6">
                <div className="h-6 invisible md:visible"> </div>
                <Keypad onInput={handleKeypadInput} onClear={() => focusField === 'cash' ? setCashReceived('') : (setDiscount('0'), setDiscountName(''))} onDelete={() => {
                  const s = focusField === 'cash' ? setCashReceived : setDiscount;
                  s(p => p.length > 0 ? p.slice(0, -1) : '0');
                }} />
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <button onClick={onClose} className="px-8 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 border border-slate-100 uppercase text-sm tracking-widest">取消返回</button>
            <button onClick={handleFinalConfirm} disabled={paymentMethod === 'Cash' && change < 0} className={`flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${paymentMethod === 'Cash' && change < 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:shadow-blue-200'}`}>
              <Wallet size={24} /><span>4. 確認完成結帳</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 4. VoidReasonModal (移到 OrderManagementPage 之前) ---
export const VoidReasonModal = ({ isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in text-slate-800 font-sans">
      <div className="bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl p-10 border border-slate-100">
        <div className="flex items-center gap-4 mb-6 text-red-500">
          <div className="bg-red-50 p-3 rounded-2xl"><AlertTriangle size={32} /></div>
          <h3 className="text-2xl font-bold font-black">訂單作廢確認</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {['點錯品項', '客人取消', '操作失誤', '食材不足'].map(r => (
            <button key={r} type="button" onClick={() => setReason(r)} className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all ${reason === r ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-slate-50 text-slate-500'}`}>{r}</button>
          ))}
        </div>
        <textarea className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-red-500 font-medium mb-8 h-28 resize-none text-sm" placeholder="手動輸入原因..." value={reason} onChange={e => setReason(e.target.value)} />
        <div className="flex gap-4">
          <button type="button" onClick={onClose} className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-colors">返回</button>
          <button type="button" disabled={!reason.trim()} onClick={() => onConfirm(reason)} className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg hover:bg-red-700 active:scale-95 transition-all">確認作廢</button>
        </div>
      </div>
    </div>
  );
};

// --- 5. LoginPage ---
export const LoginPage = () => {
  const { setIsLoggedIn, showAlert } = useContext(POSContext);
  const [auth, setAuth] = useState({ user: '', pass: '' });

  const handleLogin = (e) => {
    e.preventDefault();
    if (auth.user === 'admin' && auth.pass === 'posadmin') {
      setIsLoggedIn(true);
    } else {
      showAlert('登入失敗', '帳號密碼錯誤', 'danger');
    }
  };

  const handleReset = () => {
    if (window.confirm('確定要清除所有資料並重置系統嗎？')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 relative">
        <button onClick={handleReset} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 p-2" title="重置系統資料"><Bug size={16} /></button>
        <div className="bg-slate-900 p-12 text-white flex items-center justify-center gap-6">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl shadow-lg"><User size={32} /></div>
          <h2 className="text-3xl font-black tracking-tight">POS 系統登入</h2>
        </div>
        <form onSubmit={handleLogin} className="p-10 space-y-6">
          <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">帳號</label><input className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all" placeholder="admin" value={auth.user} onChange={e => setAuth({ ...auth, user: e.target.value })} /></div>
          <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">密碼</label><input type="password" name="password" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all" placeholder="posadmin" value={auth.pass} onChange={e => setAuth({ ...auth, pass: e.target.value })} /></div>
          <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 active:scale-95 shadow-lg transition-all tracking-widest uppercase">進入系統</button>
        </form>
      </div>
    </div>
  );
};

// --- 6. Sidebar ---
export const Sidebar = () => {
  const { config, setIsLoggedIn, showConfirm, shift } = useContext(POSContext);
  const location = useLocation();
  const navItems = [
    { path: '/pos', label: '櫃檯收銀', icon: ShoppingCart },
    { path: '/orders', label: '訂單管理', icon: ClipboardList },
    { path: '/settlement', label: '結算作業', icon: Coins },
    { path: '/admin', label: '店務管理', icon: Edit2 },
    { path: '/dashboard', label: '報表分析', icon: LayoutDashboard },
    { path: '/database', label: '原始數據', icon: Database },
    { path: '/settings', label: '系統設定', icon: Settings },
  ];
  return (
    <div className="w-64 h-screen bg-slate-900 text-white fixed left-0 top-0 flex flex-col border-r border-slate-800 z-50 font-sans">
      <div className="p-8 flex items-center space-x-3 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg shadow-lg"><Store size={24} /></div>
        <span className="text-xl font-black uppercase truncate">{config?.storeName}</span>
      </div>
      <div className="px-6 py-4"><div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${shift.isOpen ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}><div className={`w-2 h-2 rounded-full animate-pulse ${shift.isOpen ? 'bg-green-400' : 'bg-red-400'}`} /><span className="text-xs font-black uppercase tracking-wider">{shift.isOpen ? '營業中' : '休息中'}</span></div></div>
      <div className="flex-1 px-4 space-y-2 mt-2 overflow-y-auto scrollbar-hide">{navItems.map(item => (<Link key={item.path} to={item.path} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${location.pathname === item.path ? 'bg-blue-600 text-white shadow-lg font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><item.icon size={20} /><span className="font-medium">{item.label}</span></Link>))}</div>
      <button onClick={() => showConfirm('安全登出', '確定要登出系統嗎？', () => setIsLoggedIn(false))} className="m-6 p-4 flex items-center space-x-3 text-slate-500 hover:text-red-400 border-t border-slate-800 font-bold transition-colors shrink-0">
        <LogOut size={20} /><span>安全登出</span>
      </button>
    </div>
  );
};

// --- 7. POSPage ---
export const POSPage = () => {
  const { menu, setOrders, orders, config, shift, openShift, showConfirm } = useContext(POSContext);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dineIn');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [optionModal, setOptionModal] = useState({ isOpen: false, product: null, initialData: null });

  const categories = useMemo(() => ['全部', ...new Set(menu.map(i => i.category).filter(Boolean))], [menu]);
  const filtered = menu.filter(item => (selectedCategory === '全部' || item.category === selectedCategory) && item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAddToCart = (item) => {
    const hasModules = item.modules && item.modules.length > 0;
    if (hasModules) {
      setOptionModal({ isOpen: true, product: item, initialData: null });
    } else {
      const newItem = {
        ...item,
        selectedModules: {},
        price: item.price,
        quantity: 1
      };
      setCart(prev => getUpdatedCart(prev, newItem));
    }
  };

  const handleOptionConfirm = (configuredItem) => {
    const newItem = {
      ...configuredItem,
      quantity: optionModal.initialData ? optionModal.initialData.quantity : 1
    };

    setCart(prev => {
      let currentCart = prev;
      if (optionModal.initialData) {
        const oldId = generateCartItemId(optionModal.initialData, optionModal.initialData.selectedModules);
        currentCart = prev.filter(i => i.cartId !== oldId);
      }
      return getUpdatedCart(currentCart, newItem);
    });
  };

  const handleEditCartItem = (cartItem) => {
    const originalProduct = menu.find(m => m.id === cartItem.id);
    if (originalProduct) {
      setOptionModal({ isOpen: true, product: originalProduct, initialData: cartItem });
    }
  };

  const finalizeOrder = (data) => {
    const handleFinalize = () => {
      const pref = orderType === 'dineIn' ? 'D' : 'T';
      const orderDate = shift.businessDate;
      const c = orders.filter(o => o.date === orderDate && o.orderType === orderType).length;
      const orderNo = pref + (c + 1).toString().padStart(3, '0');
      // Fix: 使用 getCurrentTime 統一時間格式 (HH:mm:ss)
      const newO = { id: Date.now(), orderNo, total: data.total ?? cart.reduce((s, i) => s + (i.price * i.quantity), 0), items: [...cart], orderType, date: orderDate, time: getCurrentTime(), status: 'unclosed', isVoided: false, paymentStatus: (orderType === 'dineIn' && config?.dineInMode === 'postPay' && !data.paymentMethod) ? 'pending' : 'paid', ...data };
      setOrders(prev => [...prev, newO]); setCart([]); setIsCheckoutModalOpen(false);
    };
    if (orderType === 'dineIn' && config?.dineInMode === 'postPay' && !data.paymentMethod) showConfirm('送出點餐', '確定要送出此筆點餐清單並記錄為「待付款」嗎？', handleFinalize);
    else handleFinalize();
  };

  if (!shift.isOpen) return (<div className="h-full flex items-center justify-center font-sans"><div className="bg-white p-16 rounded-[3rem] shadow-2xl text-center max-w-lg border border-slate-100 animate-in fade-in zoom-in-95"><div className="bg-blue-50 w-24 h-24 rounded-[2rem] flex items-center justify-center text-blue-600 mx-auto mb-8 shadow-inner"><Lock size={48} /></div><h2 className="text-3xl font-black text-slate-800 mb-4">班次尚未開啟</h2><p className="text-slate-400 mb-10 leading-relaxed font-medium">系統目前處於「休息結帳」狀態，請先啟動今日班次以開始作業。</p><button onClick={() => showConfirm('開始營業', '確定要開啟今日班次嗎？', openShift)} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 flex items-center justify-center gap-3 transition-all"><Play size={24} /> 啟動今日開帳</button></div></div>);

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full overflow-hidden text-slate-900 font-sans">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-between items-center mb-6 shrink-0"><div className="flex items-center gap-4"><h2 className="text-2xl font-bold">點餐收銀</h2><div className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest">營業日: {shift.businessDate}</div></div><div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="搜尋商品名稱..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none shadow-sm font-medium" /></div></div><div className="flex gap-2 mb-6 overflow-x-auto pb-2 shrink-0 no-scrollbar">{categories.map(c => (<button key={c} onClick={() => setSelectedCategory(c)} className={`px-6 py-2 rounded-full whitespace-nowrap font-bold text-sm border transition-all ${selectedCategory === c ? 'bg-blue-600 text-white shadow-md border-blue-600' : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200'}`}>{c}</button>))}</div>

        {/* UI Fix: gap-3, p-4, rounded-2xl, 移除標籤 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 overflow-y-auto pr-2 flex-1 pb-10 content-start scrollbar-thin">
          {filtered.map(item => (
            <button key={item.id} onClick={() => { if (!item.isAvailable) return; handleAddToCart(item); }} className={`p-4 rounded-2xl shadow-sm border text-left group h-full min-h-[120px] flex flex-col justify-between relative overflow-hidden transition-all ${item.isAvailable ? 'bg-white border-slate-100 hover:border-blue-50' : 'bg-slate-50 opacity-60 grayscale'}`}>
              <div>
                <div className="font-bold mb-1 truncate text-slate-800 text-base">{item.name}</div>
                <div className="font-black text-xl text-blue-600 font-mono">${item.price}</div>
              </div>
              {/* 移除客製化標籤 */}
              {!item.isAvailable && <div className="absolute inset-0 bg-slate-900/5 flex items-center justify-center"><span className="bg-slate-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest shadow-sm">暫不供應</span></div>}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-96 flex-shrink-0 bg-white rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-50 h-full overflow-hidden">
        <div className="p-8 border-b flex flex-col gap-4 bg-slate-50/50">
          <div className="flex justify-between items-center"><h3 className="font-bold text-xl text-slate-800">購物車</h3><span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md">{cart.reduce((s, i) => s + i.quantity, 0)} 件</span></div>
          <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-inner font-bold"><button onClick={() => setOrderType('dineIn')} className={`flex items-center justify-center py-2.5 rounded-xl text-sm transition-all ${orderType === 'dineIn' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Utensils size={16} className="mr-2" />內用</button><button onClick={() => setOrderType('takeOut')} className={`flex items-center justify-center py-2.5 rounded-xl text-sm transition-all ${orderType === 'takeOut' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><ShoppingBag size={16} className="mr-2" />外帶</button></div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {cart.map(i => (
            <div key={i.cartId} onClick={() => handleEditCartItem(i)} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-300 hover:ring-2 hover:ring-blue-50 cursor-pointer transition-all flex flex-col relative group">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <span className="font-bold text-slate-700 text-sm block">{i.name}</span>
                  {/* 顯示客製化詳情: 只顯示選項名稱 */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(i.selectedModules || {}).map(([key, val], idx) => (
                      <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${val.price > 0 ? 'text-blue-600 bg-blue-50' : 'text-slate-500 bg-slate-100'}`}>
                        {val.name}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="font-black text-slate-900 text-sm font-mono tracking-tight">${i.price * i.quantity}</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                <div onClick={(e) => e.stopPropagation()} className="flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-inner">
                  <button onClick={() => { const nQty = Math.max(0, i.quantity - 1); if (nQty > 0) setCart(cart.map(it => it.cartId === i.cartId ? { ...it, quantity: nQty } : it)); else setCart(cart.filter(it => it.cartId !== i.cartId)); }} className="p-2 hover:bg-slate-200 transition-colors text-slate-500"><Minus size={14} /></button>
                  <span className="w-8 text-center font-bold text-sm text-slate-700">{i.quantity}</span>
                  <button onClick={() => setCart(cart.map(it => it.cartId === i.cartId ? { ...it, quantity: it.quantity + 1 } : it))} className="p-2 hover:bg-slate-200 transition-colors text-slate-500"><Plus size={14} /></button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setCart(cart.filter(it => it.cartId !== i.cartId)); }} className="text-red-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18} /></button>
              </div>
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14} className="text-blue-400" /></div>
            </div>
          ))}
          {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60"><ShoppingCart size={64} className="mb-4 opacity-20" /><p className="text-sm font-medium">尚未點餐</p></div>}
        </div>
        <div className="p-8 bg-slate-900 text-white rounded-b-[2.5rem]"><div className="flex justify-between items-center mb-6"><span className="text-slate-400 font-medium">應付總計</span><span className="text-4xl font-black tracking-tight font-mono">${cart.reduce((s, i) => s + (i.price * i.quantity), 0)}</span></div><button type="button" onClick={() => { if (cart.length > 0) { if (orderType === 'dineIn' && config?.dineInMode === 'postPay') finalizeOrder({ total: cart.reduce((s, i) => s + (i.price * i.quantity), 0) }); else setIsCheckoutModalOpen(true); } }} disabled={cart.length === 0} className={`w-full py-5 rounded-2xl font-black text-lg active:scale-95 shadow-xl transition-all ${orderType === 'dineIn' && config?.dineInMode === 'postPay' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{orderType === 'dineIn' && config?.dineInMode === 'postPay' ? '送出訂單 (待付款)' : '進行結帳確認'}</button></div>
      </div>

      <CheckoutModal isOpen={isCheckoutModalOpen} onClose={() => setIsCheckoutModalOpen(false)} cartTotal={cart.reduce((s, i) => s + (i.price * i.quantity), 0)} items={cart} onConfirm={finalizeOrder} />
      <ProductOptionModal isOpen={optionModal.isOpen} onClose={() => setOptionModal({ isOpen: false, product: null, initialData: null })} product={optionModal.product} initialData={optionModal.initialData} onConfirm={handleOptionConfirm} />
    </div>
  );
};

// --- 8. OrderManagementPage (補回遺漏的頁面) ---
export const OrderManagementPage = () => {
  const { orders, setOrders, shift, showAlert } = useContext(POSContext);
  const [expandedId, setExpandedId] = useState(null);
  const [activePayOrder, setActivePayOrder] = useState(null);
  const [voidId, setVoidId] = useState(null);
  const pending = orders.filter(o => o.status === 'unclosed' && o.paymentStatus === 'pending' && !o.isVoided);
  const history = orders.filter(o => o.status === 'unclosed' && (o.paymentStatus === 'paid' || o.isVoided));
  const handleActionClick = (actionFn) => { if (!shift.isOpen) { showAlert('操作鎖定', '目前班次已結清休息中，無法修改。', 'danger'); return; } actionFn(); };
  return (<div className="max-w-6xl h-full flex flex-col overflow-hidden text-slate-900 font-sans"><div className="flex justify-between items-end mb-8 shrink-0"><div><h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">訂單管理</h2><p className="text-slate-400 mt-1 flex items-center gap-2 font-medium">目前未日結交易清單 {!shift.isOpen && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest">班次鎖定</span>}</p></div><div className="flex gap-4 font-bold"><div className="bg-amber-50 px-8 py-4 rounded-3xl text-right border border-amber-100 text-amber-700 shadow-sm"><p className="text-[10px] uppercase font-black text-amber-500">待收</p><p className="text-2xl font-black font-mono">${pending.reduce((s, o) => s + o.total, 0)}</p></div><div className="bg-blue-50 px-8 py-4 rounded-3xl text-right border border-blue-100 text-blue-700 shadow-sm"><p className="text-[10px] uppercase font-black text-blue-500">實收</p><p className="text-2xl font-black font-mono">${history.filter(o => !o.isVoided).reduce((s, o) => s + o.total, 0)}</p></div></div></div><div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-10 overflow-hidden"><div className="flex flex-col min-h-0"><h3 className="text-xs font-black text-slate-400 uppercase mb-5 flex items-center gap-2 px-2 tracking-widest"><AlertCircle size={16} className="text-amber-500" /> 待收款區 ({pending.length})</h3><div className="flex-1 overflow-y-auto space-y-4 pb-10 pr-2 scrollbar-thin">{pending.map(o => (
    <div key={o.id} onClick={() => setExpandedId(expandedId === o.id ? null : o.id)} className={`bg-white p-6 rounded-[2rem] border transition-all cursor-pointer ${expandedId === o.id ? 'ring-2 ring-blue-500 shadow-xl' : 'border-slate-100 hover:border-blue-200'}`}><div className="flex justify-between items-center"><div><div className="flex items-center gap-2 mb-1.5 font-black text-xl text-slate-800">#{o.orderNo} <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded font-black">待付款</span></div><div className="text-xs text-slate-400 flex items-center gap-1 font-mono tracking-tight"><Clock size={12} />{o.date} {o.time}</div></div><div className="flex items-center gap-4"><button onClick={(e) => { e.stopPropagation(); handleActionClick(() => setVoidId(o.id)); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><RotateCcw size={20} /></button><div className="text-right mx-2 font-sans"><p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">金額</p><p className="text-2xl font-black text-slate-800 font-mono">${o.total}</p></div><button onClick={(e) => { e.stopPropagation(); handleActionClick(() => setActivePayOrder(o)); }} className={`bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-blue-600 transition-all text-sm uppercase ${!shift.isOpen ? 'opacity-30' : ''}`}>前往付款 PAY</button></div></div>{expandedId === o.id && <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">{(o.items || []).map((it, idx) => (<div key={idx} className="flex justify-between text-sm text-slate-600 font-medium font-sans"><span>{it.name} {it.variant ? `(${it.variant.name})` : ''} x {it.quantity}</span><span className="font-bold text-slate-800 font-mono font-mono">${it.price * it.quantity}</span></div>))}</div>}</div>))}</div></div><div className="flex flex-col min-h-0"><h3 className="text-xs font-black text-slate-400 uppercase mb-5 flex items-center gap-2 px-2 tracking-widest"><CheckCircle2 size={16} className="text-blue-500" /> 已付清 / 已作廢 (未結算)</h3><div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">{[...history].reverse().map(o => (
      <div key={o.id} onClick={() => setExpandedId(expandedId === o.id ? null : o.id)} className={`bg-white p-5 rounded-[1.5rem] border border-slate-100 transition-all cursor-pointer ${o.isVoided ? 'opacity-40 grayscale bg-slate-50 border-dashed' : 'hover:bg-blue-50/30'}`}><div className="flex justify-between items-center"><div className="flex items-center gap-4"><div className={`p-2 rounded-xl ${o.isVoided ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-500'}`}>{o.orderType === 'takeOut' ? <ShoppingBag size={22} /> : <Utensils size={22} />}</div><div><div className={`font-black text-base text-slate-800 ${o.isVoided ? 'line-through opacity-50' : ''}`}>#{o.orderNo}</div><div className="text-[10px] text-slate-400 font-mono tracking-tight">{o.date} {o.time}</div></div></div><div className="flex items-center gap-5">{!o.isVoided && <button onClick={(e) => { e.stopPropagation(); handleActionClick(() => setVoidId(o.id)); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><RotateCcw size={18} /></button>}<div className="text-right font-sans"><div className={`text-xl font-black font-mono font-mono font-mono ${o.isVoided ? 'text-slate-400' : 'text-slate-800'}`}>${o.total}</div><div className={`text-[10px] font-black uppercase tracking-widest ${o.isVoided ? 'text-red-500' : 'text-blue-400'}`}>{o.isVoided ? 'VOID' : (o.paymentMethod || 'PAID')}</div></div></div></div>{expandedId === o.id && <div className="mt-5 pt-4 border-t border-slate-100 text-[10px] space-y-2 font-sans">{o.isVoided && <div className="bg-red-50 p-2.5 rounded-xl text-red-600 font-bold border border-red-100 flex items-center gap-2 uppercase tracking-wide"><AlertTriangle size={12} />Reason: {o.voidReason}</div>}{o.items?.map((it, idx) => (<div key={idx} className="flex justify-between px-1 text-slate-600 font-medium"><span>{it.name} {it.variant ? `(${it.variant.name})` : ''} x {it.quantity}</span><span className="font-bold text-slate-900 font-mono font-mono font-mono font-mono">${it.price * it.quantity}</span></div>))}</div>}</div>))}</div></div></div><CheckoutModal isOpen={!!activePayOrder} onClose={() => setActivePayOrder(null)} cartTotal={activePayOrder?.total || 0} items={activePayOrder?.items || []} onConfirm={(d) => { setOrders(prev => prev.map(o => o.id === activePayOrder.id ? { ...o, ...d, paymentStatus: 'paid', status: 'unclosed' } : o)); setActivePayOrder(null); }} /><VoidReasonModal isOpen={!!voidId} onClose={() => setVoidId(null)} onConfirm={(r) => { setOrders(prev => prev.map(o => o.id === voidId ? { ...o, isVoided: true, voidReason: r } : o)); setVoidId(null); }} /></div>);
};

// --- 9. AdminPage (排版還原與邏輯修復) ---
export const AdminPage = () => {
  const { menu, setMenu, discountRules, setDiscountRules, showConfirm, modifierTemplates, setModifierTemplates } = useContext(POSContext);
  const [tab, setTab] = useState('menu');
  const [item, setItem] = useState({ name: '', price: '', category: '', modules: [] });
  const [editId, setEditId] = useState(null);
  const [newDisc, setNewDisc] = useState({ name: '', type: 'percentage', value: '' });

  // 模組管理
  const [newTemplate, setNewTemplate] = useState({ name: '', optionsStr: '' });

  // 新增：編輯模組狀態
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  // 新增：編輯優惠狀態
  const [editingDiscountId, setEditingDiscountId] = useState(null);

  // 控制模組選擇器顯示 (Fix: 使用 State 控制顯示)
  const [showModuleSelector, setShowModuleSelector] = useState(false);

  const loadEditItem = (i) => {
    setEditId(i.id);
    // Compatibility: 讀取時防呆
    setItem({ ...i, price: i.price.toString(), modules: i.modules || [] });
  };

  // Fix: Admin Price Input - Handle conversion on submit
  const handleMenuSubmit = (e) => {
    e.preventDefault();
    if (!item.name || !item.category) return;
    const processedModules = item.modules.map(mod => ({ ...mod, options: mod.options.map(opt => ({ ...opt, price: parseFloat(opt.price) || 0 })) }));
    const newItem = {
      ...item,
      price: parseFloat(item.price) || 0,
      modules: processedModules
    };
    if (editId) {
      setMenu(menu.map(i => i.id === editId ? { ...i, ...newItem } : i));
      setEditId(null);
    } else {
      setMenu([...menu, { id: Date.now(), ...newItem, isAvailable: true }]);
    }
    setItem({ name: '', price: '', category: '', modules: [] });
  };

  const handleDiscountSubmit = (e) => {
    e.preventDefault();
    if (!newDisc.name || !newDisc.value) return;

    if (editingDiscountId) {
      setDiscountRules(prev => prev.map(d =>
        d.id === editingDiscountId ? { ...d, name: newDisc.name, type: newDisc.type, value: parseFloat(newDisc.value) } : d
      ));
      setEditingDiscountId(null);
    } else {
      setDiscountRules([...discountRules, { id: Date.now(), name: newDisc.name, type: newDisc.type, value: parseFloat(newDisc.value) }]);
    }
    setNewDisc({ name: '', type: 'percentage', value: '' });
  };

  // 模組管理: 提交 (新增或更新)
  const handleTemplateSubmit = (e) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.optionsStr) return;
    const options = newTemplate.optionsStr.split(/[,，]/).map(s => s.trim()).filter(Boolean);

    if (editingTemplateId) {
      // 更新模式
      setModifierTemplates(prev => prev.map(t =>
        t.id === editingTemplateId ? { ...t, name: newTemplate.name, options } : t
      ));
      setEditingTemplateId(null);
    } else {
      // 新增模式
      setModifierTemplates([...modifierTemplates, { id: Date.now().toString(), name: newTemplate.name, options }]);
    }
    setNewTemplate({ name: '', optionsStr: '' });
  };

  // 模組管理: 載入編輯
  const handleEditTemplate = (template) => {
    setNewTemplate({
      name: template.name,
      optionsStr: template.options.join(', ')
    });
    setEditingTemplateId(template.id);
  };

  // 優惠管理: 載入編輯
  const handleEditDiscount = (discount) => {
    setNewDisc({
      name: discount.name,
      type: discount.type,
      value: discount.value
    });
    setEditingDiscountId(discount.id);
  };

  // 商品編輯功能：加入模組
  const addModuleToItem = (templateId) => {
    const template = modifierTemplates.find(t => t.id === templateId);
    if (!template) return;
    // 預設為 addon (加價)，選項價格預設 0
    const newModule = {
      id: Date.now().toString(),
      templateId: template.id,
      name: template.name.split(' ')[0],
      type: 'addon',
      options: template.options.map(opt => ({ name: opt, price: 0 }))
    };
    setItem(prev => ({ ...prev, modules: [...prev.modules, newModule] }));
    setShowModuleSelector(false); // 關閉下拉選單
  };

  const removeModuleFromItem = (idx) => {
    setItem(prev => ({ ...prev, modules: prev.modules.filter((_, i) => i !== idx) }));
  };

  const updateModuleType = (idx, type) => {
    const newModules = [...item.modules];
    newModules[idx].type = type;

    // 若切換為 option (純選項)，將價格歸零
    if (type === 'option') {
      newModules[idx].options = newModules[idx].options.map(opt => ({ ...opt, price: 0 }));
    }

    setItem(prev => ({ ...prev, modules: newModules }));
  };

  // Fix: 允許直接輸入字串，避免無法輸入小數點或清空
  const updateModuleOptionPrice = (moduleIdx, optionIdx, val) => {
    const newModules = [...item.modules];
    newModules[moduleIdx].options[optionIdx].price = val; // Store as string temporarily
    setItem(prev => ({ ...prev, modules: newModules }));
  };

  return (
    <div className="max-w-4xl h-full flex flex-col overflow-hidden text-slate-900 font-sans">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">店務管理系統</h2>
        <div className="bg-slate-100 p-1.5 rounded-2xl flex font-bold border border-slate-200">
          <button onClick={() => setTab('menu')} className={`px-6 py-2 rounded-xl text-sm transition-all ${tab === 'menu' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>菜單設定</button>
          <button onClick={() => setTab('modules')} className={`px-6 py-2 rounded-xl text-sm transition-all ${tab === 'modules' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>客製模組</button>
          <button onClick={() => setTab('discount')} className={`px-6 py-2 rounded-xl text-sm transition-all ${tab === 'discount' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>優惠方案</button>
        </div>
      </div>

      {tab === 'menu' && (
        <div className="flex gap-6 h-full overflow-hidden">
          {/* 左側列表 (還原) */}
          <div className="w-1/3 overflow-y-auto pr-2 scrollbar-thin space-y-3 pb-20">
            {menu.map((i) => (
              <div key={i.id} className={`bg-white p-4 rounded-2xl border flex flex-col gap-2 shadow-sm transition-all cursor-pointer ${editId === i.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-100 hover:border-blue-200'}`} onClick={() => loadEditItem(i)}>
                <div className="flex justify-between items-center">
                  <div className="font-bold text-slate-800">{i.name}</div>
                  <span className="font-black text-blue-600 font-mono">${i.price}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="uppercase font-black tracking-widest">{i.category}</span>
                  {(i.modules && i.modules.length > 0) && <span className="bg-purple-100 text-purple-600 px-1.5 rounded font-bold">已套用 {i.modules.length} 模組</span>}
                </div>
                <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-50">
                  <button onClick={(e) => { e.stopPropagation(); setMenu(menu.map(m => m.id === i.id ? { ...m, isAvailable: !m.isAvailable } : m)); }} className={`p-1.5 rounded-lg ${i.isAvailable ? 'text-blue-500 bg-blue-50' : 'text-slate-400 bg-slate-100'}`}>{i.isAvailable ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                  <button onClick={(e) => { e.stopPropagation(); showConfirm('刪除品項', `永久刪除「${i.name}」？`, () => setMenu(menu.filter(m => m.id !== i.id)), 'danger'); }} className="p-1.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* 右側表單 (還原) */}
          <form onSubmit={handleMenuSubmit} className="flex-1 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-y-auto scrollbar-thin pb-20">
            <h3 className="font-black text-xl mb-6 text-slate-800 border-b pb-4">{editId ? '編輯商品內容' : '新增商品'}</h3>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="col-span-2"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">商品名稱</label><input className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} placeholder="例如：拿鐵咖啡" /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">分類</label><input className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={item.category} onChange={e => setItem({ ...item, category: e.target.value })} placeholder="例如：咖啡" /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">基礎價格</label><input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono" value={item.price} onChange={e => setItem({ ...item, price: e.target.value })} /></div>
            </div>

            {/* 模組套用區 */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-700 flex items-center gap-2"><Layers size={18} /> 已套用客製模組</h4>
                <div className="relative">
                  <button type="button" onClick={() => setShowModuleSelector(!showModuleSelector)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 flex items-center gap-1">
                    + 套用模組 {showModuleSelector ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {/* 修正：使用 State 控制顯示，避免 Hover 失效 */}
                  {showModuleSelector && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 shadow-xl rounded-xl p-2 z-10 animate-in fade-in zoom-in-95">
                      {modifierTemplates.length > 0 ? modifierTemplates.map(t => (
                        <button key={t.id} type="button" onClick={() => addModuleToItem(t.id)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm rounded-lg font-medium text-slate-600">{t.name}</button>
                      )) : <div className="text-xs text-slate-400 p-2 text-center">無可用模組</div>}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-6">
                {(item.modules || []).map((mod, mIdx) => (
                  <div key={mIdx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">{mod.name}</span>
                        <select
                          value={mod.type}
                          onChange={(e) => updateModuleType(mIdx, e.target.value)}
                          className={`text-xs px-2 py-1 rounded border font-bold outline-none cursor-pointer ${mod.type === 'variant' ? 'bg-orange-100 text-orange-700 border-orange-200' : mod.type === 'addon' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200'}`}
                        >
                          <option value="addon">加價模式 (Add-on)</option>
                          <option value="variant">定價模式 (Variant)</option>
                          <option value="option">純選項 (Option - No Price)</option>
                        </select>
                      </div>
                      <button type="button" onClick={() => removeModuleFromItem(mIdx)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {mod.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                          <span className="text-sm font-medium flex-1 text-slate-600">{opt.name}</span>
                          {mod.type !== 'option' && (
                            <>
                              <span className="text-xs text-slate-400 font-bold">{mod.type === 'variant' ? '單價' : '加價'} $</span>
                              <input
                                type="text" // Fix: 使用 text 允許小數點輸入
                                className="w-16 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-right font-mono font-bold text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                value={opt.price}
                                onChange={(e) => updateModuleOptionPrice(mIdx, oIdx, e.target.value)}
                              />
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400">
                      {mod.type === 'variant' ? '* 選擇此項將直接設定商品單價（覆蓋原價）。' : mod.type === 'addon' ? '* 選擇此項將在原價上額外加價。' : '* 此選項僅作為註記，不影響價格。'}
                    </div>
                  </div>
                ))}
                {item.modules.length === 0 && <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">尚未套用任何客製模組</div>}
              </div>
            </div>

            <div className="flex gap-4 border-t pt-6">
              <button type="button" onClick={() => { setEditId(null); setItem({ name: '', price: '', category: '', modules: [] }); }} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200">取消重置</button>
              <button type="submit" className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700">{editId ? '儲存變更' : '新增商品'}</button>
            </div>
          </form>
        </div>
      )}

      {tab === 'modules' && (
        <div className="flex gap-6 h-full">
          {/* 左側表單 (還原) */}
          <div className="w-1/3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-fit">
            <h3 className="font-bold text-lg mb-4">{editingTemplateId ? '編輯模組' : '建立新模組'}</h3>
            <form onSubmit={handleTemplateSubmit} className="space-y-4">
              <div><label className="text-xs font-bold text-slate-400 uppercase block mb-1">模組名稱</label><input className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="例如: 甜度" value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase block mb-1">預設選項 (以逗號分隔)</label><textarea className="w-full px-3 py-2 bg-slate-50 border rounded-xl h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500" placeholder="例如: 全糖, 半糖, 微糖, 無糖" value={newTemplate.optionsStr} onChange={e => setNewTemplate({ ...newTemplate, optionsStr: e.target.value })} /></div>
              <div className="flex gap-2">
                {editingTemplateId && (
                  <button
                    type="button"
                    onClick={() => { setEditingTemplateId(null); setNewTemplate({ name: '', optionsStr: '' }); }}
                    className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold"
                  >
                    取消
                  </button>
                )}
                <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg">
                  {editingTemplateId ? '更新模組' : '新增模組 Template'}
                </button>
              </div>
            </form>
          </div>
          {/* 右側列表 (還原) */}
          <div className="flex-1 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-y-auto">
            <h3 className="font-black text-xl mb-6 text-slate-800">全域客製模組庫</h3>
            <div className="grid grid-cols-2 gap-4">
              {modifierTemplates.map(t => (
                <div key={t.id} className={`border rounded-2xl p-5 transition-all group relative ${editingTemplateId === t.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}>
                  <div className="font-bold text-lg text-slate-800 mb-3">{t.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {t.options.map(o => <span key={o} className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold">{o}</span>)}
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleEditTemplate(t)} className="text-blue-400 hover:text-blue-600"><Edit2 size={18} /></button>
                    <button onClick={() => setModifierTemplates(modifierTemplates.filter(mt => mt.id !== t.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
              {modifierTemplates.length === 0 && <div className="col-span-2 text-center text-slate-400 py-10">尚無模組</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'discount' && (
        <div className="h-full flex gap-6">
          {/* 左側表單 (還原) */}
          <form onSubmit={handleDiscountSubmit} className="w-1/3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-fit">
            <h3 className="font-bold text-lg mb-4">{editingDiscountId ? '編輯優惠' : '新增優惠'}</h3>
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-slate-400 uppercase block mb-1">名稱</label><input className="w-full px-3 py-2 bg-slate-50 border rounded-xl" value={newDisc.name} onChange={e => setNewDisc({ ...newDisc, name: e.target.value })} /></div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">類型</label>
                <select className="w-full px-3 py-2 bg-slate-50 border rounded-xl" value={newDisc.type} onChange={e => setNewDisc({ ...newDisc, type: e.target.value })}><option value="percentage">折扣 (%)</option><option value="amount">定額折抵 ($)</option></select>
              </div>
              <div><label className="text-xs font-bold text-slate-400 uppercase block mb-1">數值</label><input type="number" step="0.01" className="w-full px-3 py-2 bg-slate-50 border rounded-xl" value={newDisc.value} onChange={e => setNewDisc({ ...newDisc, value: e.target.value })} /></div>

              <div className="flex gap-2">
                {editingDiscountId && (
                  <button type="button" onClick={() => { setEditingDiscountId(null); setNewDisc({ name: '', type: 'percentage', value: '' }); }} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold">取消</button>
                )}
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg mt-2">{editingDiscountId ? '儲存變更' : '新增'}</button>
              </div>
            </div>
          </form>
          {/* 右側列表 (還原) */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {discountRules.map(r => (
              <div key={r.id} className={`bg-white p-5 rounded-2xl border flex justify-between items-center shadow-sm transition-all ${editingDiscountId === r.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-lg"><Ticket size={20} /></div>
                  <div><div className="font-bold text-slate-800">{r.name}</div><div className="text-xs text-slate-400">{r.type === 'percentage' ? '比例折扣' : '定額折抵'}</div></div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-xl text-blue-600 font-mono">{r.type === 'percentage' ? `${Math.round((1 - r.value) * 100)}%` : `-$${r.value}`}</span>
                  <button onClick={() => handleEditDiscount(r)} className="text-blue-400 hover:text-blue-600"><Edit2 size={18} /></button>
                  <button onClick={() => {
                    if (editingDiscountId === r.id) { setEditingDiscountId(null); setNewDisc({ name: '', type: 'percentage', value: '' }); }
                    setDiscountRules(discountRules.filter(d => d.id !== r.id));
                  }} className="text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- 10. SettlementPage (修正日期格式與標籤) ---
export const SettlementPage = () => {
  const { orders, dailySummaries, setDailySummaries, setOrders, showAlert, showConfirm, shift, setShift } = useContext(POSContext);
  const [expandOrderId, setExpandOrderId] = useState(null);

  const currentShiftCompletedOrders = useMemo(() =>
    // Fix: 確保日期比對使用相同格式 (YYYY-MM-DD)
    orders.filter(o => o.date === shift.businessDate && (o.paymentStatus === 'paid' || o.isVoided)),
    [orders, shift.businessDate]);

  const totalRevenue = currentShiftCompletedOrders.filter(o => !o.isVoided).reduce((s, o) => s + o.total, 0);

  // 統計數據計算
  const stats = useMemo(() => {
    return currentShiftCompletedOrders.reduce((acc, order) => {
      if (order.isVoided) {
        acc.voidedCount += 1;
      } else {
        acc.orderCount += 1;
        acc.typeCount[order.orderType || 'dineIn'] += 1;
        order.items?.forEach(item => {
          acc.itemSales[item.name] = (acc.itemSales[item.name] || 0) + (item.quantity || 1);
        });
      }
      return acc;
    }, { orderCount: 0, voidedCount: 0, itemSales: {}, typeCount: { dineIn: 0, takeOut: 0 } });
  }, [currentShiftCompletedOrders]);

  // 修正：先行結算 (將狀態改為 closed，但保持班次開啟)
  const handlePreSettle = (businessDate, allOrders) => {
    const targetOrders = allOrders.filter(o => o.status === 'unclosed' && o.date === businessDate && (o.paymentStatus === 'paid' || o.isVoided));
    if (targetOrders.length === 0) return;

    // 計算當日總結
    const summary = targetOrders.reduce((acc, order) => {
      if (order.isVoided) { acc.voidedCount += 1; }
      else {
        acc.total += order.total; acc.orderCount += 1; acc.typeCount[order.orderType || 'dineIn'] += 1;
        order.items?.forEach(item => { acc.itemSales[item.name] = (acc.itemSales[item.name] || 0) + (item.quantity || 1); });
      }
      acc.relatedOrders.push(order);
      return acc;
    }, { total: 0, orderCount: 0, voidedCount: 0, itemSales: {}, typeCount: { dineIn: 0, takeOut: 0 }, relatedOrders: [] });

    setDailySummaries(prev => {
      const updated = [...prev];
      const existingIdx = updated.findIndex(s => s.date === businessDate);
      if (existingIdx > -1) {
        // 更新現有日報表
        const existing = { ...updated[existingIdx] };
        existing.total = summary.total;
        existing.orderCount = summary.orderCount;
        existing.relatedOrders = summary.relatedOrders;
        updated[existingIdx] = existing;
      } else {
        // Fix: 使用統一的日期時間格式
        updated.push({ id: Date.now(), date: businessDate, ...summary, closedAt: '未關帳 (預覽)' });
      }
      return updated;
    });

    // 關鍵修正：將這些訂單標記為 'closed' (已結算)，讓 UI 標籤變色
    setOrders(prev => prev.map(o => (o.status === 'unclosed' && o.date === businessDate && (o.paymentStatus === 'paid' || o.isVoided)) ? { ...o, status: 'closed' } : o));

    // 注意：這裡不呼叫 setShift(isOpen: false)，所以班次保持開啟
    showAlert('成功', '已執行先行結算，訂單狀態已更新。', 'success');
  };

  const performSettlement = (businessDate, allOrders) => {
    // 日結關帳邏輯：與先行結算類似，但會關閉班次
    handlePreSettle(businessDate, allOrders); // 先結算
    // Fix: 關閉班次時也使用統一格式
    setDailySummaries(prev => prev.map(s => s.date === businessDate ? { ...s, closedAt: getCurrentDateTime() } : s));
    setShift({ isOpen: false, businessDate: null, openedAt: null }); // 再關班
  };

  const renderItemDetails = (items) => (items || []).map((item, idx) => (
    <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 font-sans">
      <div className="flex flex-col"><span className="text-slate-700 font-medium text-sm">{item.name}</span><span className="text-[10px] text-slate-400 font-mono italic">單價 ${item.price} x {item.quantity || 1}</span></div>
      <span className="font-bold text-sm text-slate-900">${(item.price || 0) * (item.quantity || 1)}</span>
    </div>
  ));

  return (
    <div className="max-w-5xl h-full flex flex-col overflow-hidden text-slate-900 px-2 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 shrink-0">
        <div className={`p-10 rounded-3xl text-white shadow-xl flex flex-col justify-between min-h-[220px] transition-all ${shift.isOpen ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gradient-to-br from-slate-600 to-slate-800'}`}>
          <div><p className="opacity-70 text-sm font-bold uppercase tracking-widest mb-2 font-black">{shift.isOpen ? `營業日 ${shift.businessDate} 當前總額` : '休息結帳中 - SHIFT CLOSED'}</p><h3 className="text-5xl font-black tracking-tight font-mono">${totalRevenue}</h3></div>
          {shift.isOpen && (
            <div className="grid grid-cols-2 gap-3 mt-6">
              {/* 修正：先行結算按鈕改呼叫 handlePreSettle */}
              <button onClick={() => handlePreSettle(shift.businessDate, orders)} className="bg-white/10 hover:bg-white/20 px-4 py-3.5 rounded-2xl font-bold border border-white/20 flex items-center justify-center gap-2 transition-all shadow-inner active:scale-95"><Coins size={18} /><span>先行結算</span></button>
              <button onClick={() => {
                const unclosedOrders = orders.filter(o => o.status === 'unclosed');
                const pendingOrders = unclosedOrders.filter(o => o.paymentStatus === 'pending' && !o.isVoided);
                if (pendingOrders.length > 0) showAlert('無法關帳', `還有 ${pendingOrders.length} 筆單據待處理。`, 'danger');
                else showConfirm('日結關帳', `結束營業日 ${shift.businessDate} 並封存數據？`, () => performSettlement(shift.businessDate, orders));
              }} className="bg-white text-blue-700 px-4 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg hover:bg-blue-50 active:scale-95 transition-all"><StopCircle size={18} /><span>日結關帳</span></button>
            </div>
          )}
        </div>
        <div className="bg-white p-10 rounded-3xl border border-slate-100 flex flex-col justify-center shadow-sm"><p className="text-sm font-bold uppercase tracking-widest mb-4 text-slate-400 font-black">當前班次支付分佈</p><div className="space-y-3 font-sans font-medium">{['Cash', 'Credit', 'Mobile'].map(pm => (<div key={pm} className="flex justify-between items-center text-sm font-medium"><span className="uppercase text-[10px] text-slate-400 font-black">{pm === 'Cash' ? '現金' : pm === 'Credit' ? '刷卡' : '支付'}</span><span className="font-black text-slate-700 font-mono">${currentShiftCompletedOrders.filter(o => o.paymentMethod === pm && !o.isVoided).reduce((s, o) => s + o.total, 0)}</span></div>))}</div></div>
      </div>

      {/* 恢復統計區塊 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 shrink-0">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col"><h4 className="text-[10px] font-black uppercase mb-4 text-slate-400 tracking-widest">銷量統計</h4><div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">{Object.entries(stats.itemSales || {}).map(([name, count]) => (<div key={name} className="flex justify-between items-center text-sm font-medium"><span className="text-slate-600">{name}</span><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{count}</span></div>))}</div></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col"><h4 className="text-xs font-bold uppercase mb-4 flex items-center text-orange-500"><Utensils size={14} className="mr-2 text-orange-500" /> 內外帶</h4><div className="space-y-4"><div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-600">內用</span><span className="font-black text-blue-600">{stats.typeCount?.dineIn || 0}</span></div><div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-600">外帶</span><span className="font-black text-orange-600">{stats.typeCount?.takeOut || 0}</span></div></div></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col"><h4 className="text-[10px] font-black uppercase mb-4 text-slate-400 tracking-widest text-red-500">異常統計</h4><span className="text-2xl font-black text-red-600 font-mono">{stats.voidedCount || 0}</span><p className="text-[10px] text-slate-400 mt-2 italic font-mono">Voided Orders</p></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center"><span className="text-xs uppercase font-black block mb-1 text-slate-400 tracking-widest">平均客單</span><span className="text-2xl font-black text-slate-900 tracking-tight font-mono font-mono font-mono font-mono font-mono">${stats.orderCount > 0 ? (totalRevenue / stats.orderCount).toFixed(0) : 0}</span><span className="text-[10px] mt-2 italic text-slate-400 font-mono">共計 {stats.orderCount} 筆</span></div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10 scrollbar-thin">
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase mb-5 flex items-center gap-2 px-2 tracking-widest">當日交易明細 ({currentShiftCompletedOrders.length})</h3>
          {currentShiftCompletedOrders.reverse().map(order => {
            const isOrderExpand = expandOrderId === order.id;
            return (
              <div key={order.id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${order.isVoided ? 'opacity-30' : 'border-blue-200 shadow-blue-50 shadow-sm'}`}>
                <div onClick={() => setExpandOrderId(isOrderExpand ? null : order.id)} className="flex items-center px-6 py-5 cursor-pointer hover:bg-slate-50 transition-colors text-slate-900">
                  <div className="flex-1">
                    <div className="font-bold flex items-center text-slate-700">
                      #{order.orderNo || 'N/A'} - {order.date}
                      <span className={`ml-3 text-[10px] px-2 py-0.5 rounded font-bold ${order.isVoided ? 'bg-red-100 text-red-600' : order.orderType === 'takeOut' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {order.isVoided ? '已作廢' : order.orderType === 'takeOut' ? '外帶' : '內用'}
                      </span>
                      {/* UI Fix: 明確的結算狀態標籤 */}
                      {order.status === 'closed' ? (
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-gray-200 text-gray-600">已結算</span>
                      ) : (
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-green-100 text-green-600 animate-pulse">未結算</span>
                      )}
                    </div>
                    <div className="text-xs font-mono italic text-slate-400">ID: {order.id} {order.isVoided && `| 原因: ${order.voidReason}`}</div>
                  </div>
                  <div className={`text-xl font-black mr-6 ${order.isVoided ? 'line-through text-slate-300' : 'text-blue-600'}`}>${order.total}</div>
                  <ChevronRight size={20} className={`text-slate-300 transition-transform ${isOrderExpand ? 'rotate-90' : ''}`} />
                </div>
                {isOrderExpand && (
                  <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 animate-in fade-in">
                    <div className="space-y-2">{renderItemDetails(order.items)}</div>
                    <div className="mt-4 pt-4 border-t flex justify-between font-black text-slate-900"><span>應付總額</span><span className={order.isVoided ? 'line-through text-slate-300' : 'text-blue-600'}>${order.total}</span></div>
                  </div>
                )}
              </div>
            );
          })}</div>
      </div>
    </div>
  );
};

// --- 11. DashboardPage (修正展開邏輯) ---
export const DashboardPage = () => {
  const { dailySummaries } = useContext(POSContext);
  const [expandSummaryId, setExpandSummaryId] = useState(null);

  // Fix: 這裡也需要 state 來管理內部訂單的展開
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());

  const toggleOrderExpand = (orderId) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const renderItemDetails = (items) => (items || []).map((item, idx) => (
    <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 font-sans">
      <div className="flex flex-col"><span className="text-slate-700 font-medium text-sm">{item.name}</span><span className="text-[10px] text-slate-400 font-mono italic">單價 ${item.price} x {item.quantity || 1}</span></div>
      <span className="font-bold text-sm text-slate-900">${(item.price || 0) * (item.quantity || 1)}</span>
    </div>
  ));

  return (
    <div className="max-w-5xl h-full flex flex-col overflow-hidden text-slate-900 px-2 font-sans">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-black text-slate-800">歷史報表分析</h2>
        <p className="text-slate-400 font-medium">僅顯示已日結之歷史數據</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10 scrollbar-thin">
        <div className="space-y-4">
          {[...dailySummaries].reverse().map((summary, index) => (
            <div key={`${summary.id}-${index}`} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div onClick={() => setExpandSummaryId(expandSummaryId === summary.id ? null : summary.id)} className={`p-6 flex items-center justify-between cursor-pointer ${expandSummaryId === summary.id ? 'bg-blue-50/50' : ''}`}><div className="flex items-center space-x-4"><div className="bg-green-100 text-green-600 p-3 rounded-xl shadow-sm"><FileText /></div><div><div className="font-bold text-lg text-slate-800 tracking-tight">{summary.date} 彙整報表</div><div className="text-xs text-slate-400 font-medium font-mono opacity-60">最後結算：{summary.closedAt}</div></div></div><div className="flex items-center space-x-8"><div className="text-right"><div className="text-xs uppercase font-black text-slate-400 tracking-tighter">總金額</div><div className="text-2xl font-black text-blue-600 tracking-tight font-mono font-mono">${summary.total}</div></div>{expandSummaryId === summary.id ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}</div></div>
              {expandSummaryId === summary.id && (
                <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 animate-in fade-in space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col"><h4 className="text-[10px] font-black uppercase mb-4 text-slate-400 tracking-widest">銷量統計</h4><div className="space-y-2">{Object.entries(summary.itemSales || {}).map(([name, count]) => (<div key={name} className="flex justify-between items-center text-sm font-medium"><span className="text-slate-600">{name}</span><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{count}</span></div>))}</div></div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col"><h4 className="text-xs font-bold uppercase mb-4 flex items-center text-orange-500"><Utensils size={14} className="mr-2 text-orange-500" /> 內外帶</h4><div className="space-y-4"><div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-600">內用</span><span className="font-black text-blue-600">{summary.typeCount?.dineIn || 0}</span></div><div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-600">外帶</span><span className="font-black text-orange-600">{summary.typeCount?.takeOut || 0}</span></div></div></div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col"><h4 className="text-[10px] font-black uppercase mb-4 text-slate-400 tracking-widest text-red-500">異常統計</h4><span className="text-2xl font-black text-red-600">{summary.voidedCount || 0}</span><p className="text-[10px] text-slate-400 mt-2 italic font-mono">Voided Orders</p></div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center"><span className="text-xs uppercase font-black block mb-1 text-slate-400 tracking-widest">平均客單</span><span className="text-2xl font-black text-slate-900 tracking-tight font-mono font-mono font-mono font-mono font-mono">${summary.orderCount > 0 ? (summary.total / summary.orderCount).toFixed(0) : 0}</span><span className="text-[10px] mt-2 italic text-slate-400 font-mono">共計 {summary.orderCount} 筆</span></div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold mb-4 flex items-center text-slate-900"><Receipt size={16} className="mr-2 text-blue-500" /> 原始訂單明細 (含作廢)</h4>
                    <div className="space-y-2">
                      {(summary.relatedOrders || []).map(order => {
                        const isOrderExpand = expandedOrderIds.has(order.id);
                        return (
                          <div key={order.id} className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm ${order.isVoided ? 'opacity-40 grayscale' : ''}`}>
                            <div onClick={(e) => { e.stopPropagation(); toggleOrderExpand(order.id); }} className="flex items-center px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors text-slate-900">
                              <div className="flex-col flex-1"><span className={`text-sm font-bold ${order.isVoided ? 'line-through text-red-400' : 'text-slate-700'}`}>號碼 #{order.orderNo || 'N/A'}</span><span className="text-[10px] text-slate-400">{order.time}</span></div>
                              <div className="flex-1">{order.isVoided ? <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">已作廢</span> : (order.orderType === 'takeOut' ? <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-1 rounded-md font-bold">外帶</span> : <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-1 rounded-md font-bold">內用</span>)}</div>
                              <div className="text-lg font-black mr-4 text-slate-800 font-mono">${order.total}</div>
                              <ChevronRight className={`text-slate-300 transition-transform ${isOrderExpand ? 'rotate-90' : ''}`} size={16} />
                            </div>
                            {isOrderExpand && (<div className="px-10 py-4 bg-slate-50 border-t border-slate-100 animate-in fade-in">{renderItemDetails(order.items)}</div>)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- 12. DatabaseViewPage (表格展開模式還原) ---
export const DatabaseViewPage = () => {
  const { orders, showAlert, setOrders } = useContext(POSContext);
  const [search, setSearch] = useState('');
  const [viewJson, setViewJson] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  const filteredOrders = useMemo(() => {
    const s = search.toLowerCase();
    return [...orders].reverse().filter(o =>
      o.orderNo?.toLowerCase().includes(s) || o.id.toString().includes(s) || o.date.includes(s) || o.items?.some(item => item.name.toLowerCase().includes(s))
    );
  }, [orders, search]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    document.body.appendChild(el); el.select();
    document.execCommand('copy'); document.body.removeChild(el);
    showAlert('複製成功', '數據已複製到剪貼簿。', 'success');
  };

  const handleUpdateOrder = (updatedOrder) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setEditingOrder(null);
    showAlert('更新成功', `訂單 #${updatedOrder.orderNo} 已更新。`, 'success');
  };

  return (
    <div className="max-w-full h-full flex flex-col overflow-hidden text-slate-900 px-2 font-sans">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div><h2 className="text-2xl font-black flex items-center gap-2"><Database className="text-blue-600" /> 原始數據檢視</h2><p className="text-xs text-slate-400 mt-1">開發者專用：支援分頁與 JSON 導出</p></div>
        <div className="flex gap-2">
          <div className="relative w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="搜尋、日期、ID或商品名..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium" /></div>
          <button onClick={() => copyToClipboard(orders)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 active:scale-95"><Copy size={14} /> 導出全部 JSON</button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col mb-4">
        <div className="overflow-x-auto flex-1 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 shadow-sm">
              <tr>
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">OrderNo</th>
                <th className="p-4">Date/Time</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Payment</th>
                <th className="p-4 text-center">Action</th>
                <th className="p-4 text-right">JSON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.map(o => (
                <React.Fragment key={o.id}>
                  <tr onClick={() => setExpandedId(expandedId === o.id ? null : o.id)} className={`cursor-pointer transition-colors ${expandedId === o.id ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}>
                    <td className="p-4 text-center"><ChevronRight size={14} className={`text-slate-300 transition-transform ${expandedId === o.id ? 'rotate-90 text-blue-500' : ''}`} /></td>
                    <td className="p-4 font-bold text-slate-700">#{o.orderNo}</td>
                    <td className="p-4 text-slate-500 font-medium">{o.date} <span className="text-[10px] text-slate-300 ml-1">{o.time}</span></td>
                    <td className="p-4"><span className={`font-bold uppercase text-[9px] ${o.status === 'closed' ? 'text-slate-400' : 'text-green-600'}`}>{o.status}</span></td>
                    <td className={`p-4 text-right font-black font-mono ${o.isVoided ? 'text-slate-300 line-through' : 'text-slate-900'}`}>${o.total}</td>
                    <td className="p-4 text-center"><span className={`font-black text-[9px] px-2 py-0.5 rounded ${o.isVoided ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>{o.isVoided ? 'VOID' : (o.paymentMethod || 'PAY')}</span></td>
                    <td className="p-4 text-center"><button onClick={(e) => { e.stopPropagation(); setEditingOrder(o); }} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={14} /></button></td>
                    <td className="p-4 text-right"><button onClick={(e) => { e.stopPropagation(); setViewJson(o); }} className="p-1.5 text-slate-300 hover:text-blue-500"><Code size={14} /></button></td>
                  </tr>
                  {expandedId === o.id && (
                    <tr className="bg-blue-50/20"><td colSpan="9" className="p-0 border-b border-blue-100">
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2 mb-2"><Receipt size={12} /> 訂單內容明細</h4>
                          <div className="bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-[11px]">
                              <thead className="bg-slate-50 border-b border-slate-100"><tr><th className="p-2 text-slate-400 font-bold">商品名稱</th><th className="p-2 text-right text-slate-400 font-bold">單價</th><th className="p-2 text-center text-slate-400 font-bold">數量</th><th className="p-2 text-right text-slate-400 font-bold">小計</th></tr></thead>
                              <tbody className="divide-y divide-slate-5">{o.items?.map((item, idx) => (<tr key={idx} className="hover:bg-blue-50/10"><td className="p-2 font-bold text-slate-600">{item.name}</td><td className="p-2 text-right text-slate-400 font-mono">${item.price}</td><td className="p-2 text-center font-bold text-slate-500 font-mono">x{item.quantity}</td><td className="p-2 text-right font-black text-slate-700 font-mono">${item.price * item.quantity}</td></tr>))}</tbody>
                            </table>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mb-2"><ListFilter size={12} /> 系統元數據 (Meta)</h4>
                          <div className="grid grid-cols-2 gap-3 text-[10px]">
                            <div className="bg-white p-3 rounded-xl border border-slate-100"><p className="text-slate-400 font-bold mb-1">內部唯一 ID</p><p className="font-mono text-slate-600">{o.id}</p></div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100"><p className="text-slate-400 font-bold mb-1">交易類型</p><p className="font-bold text-slate-600">{o.orderType === 'takeOut' ? '🥡 外帶' : '🍽️ 內用'}</p></div>
                            {o.isVoided && (<div className="bg-red-50 p-3 rounded-xl border border-red-100 col-span-2"><p className="text-red-400 font-bold mb-1 flex items-center gap-1"><AlertCircle size={10} /> 作廢原因</p><p className="font-bold text-red-700">{o.voidReason || '未註記'}</p></div>)}
                          </div>
                        </div>
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center gap-4 shrink-0 rounded-b-3xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase">顯示 {filteredOrders.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filteredOrders.length)} 筆</div>
          <div className="flex items-center gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-1.5 rounded-lg border bg-white disabled:opacity-30"><ChevronLeft size={16} /></button>
            <span className="text-blue-600 font-mono text-xs font-black mx-2">{currentPage} / {totalPages || 1}</span>
            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="p-1.5 rounded-lg border bg-white disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
      {viewJson && (<div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"><div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"><div className="p-8 border-b flex justify-between items-center bg-slate-50"><h3 className="font-black text-xl">JSON</h3><button onClick={() => setViewJson(null)}><X size={24} /></button></div><div className="flex-1 overflow-auto p-8 bg-slate-900 font-mono"><pre className="text-green-400 text-xs">{JSON.stringify(viewJson, null, 2)}</pre></div></div></div>)}
      {editingOrder && (<div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"><div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl"><h3 className="font-black text-xl mb-4">編輯訂單</h3>{/* 簡化編輯表單 */}<div className="flex gap-4 mt-6"><button onClick={() => setEditingOrder(null)} className="flex-1 py-2 bg-slate-100 rounded-xl font-bold">取消</button><button onClick={() => handleUpdateOrder(editingOrder)} className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold">儲存</button></div></div></div>)}
    </div>
  );
};

// --- 13. SettingsPage (補回所有遺失的功能區塊) ---
export const SettingsPage = () => {
  const { config, setConfig, showAlert } = useContext(POSContext);
  const [isEdit, setIsEdit] = useState(false);
  const [temp, setTemp] = useState(config?.storeName || '');
  const handleSave = () => { setConfig(p => ({ ...p, storeName: temp })); setIsEdit(false); showAlert('成功', '已儲存'); };
  return (
    <div className="max-w-2xl mx-auto w-full font-sans pb-32 animate-in fade-in slide-in-from-bottom-2 px-4 text-slate-900">
      <h2 className="text-2xl font-black mb-8 px-2 tracking-tight uppercase">系統參數設定</h2>
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 space-y-10">
        <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-3 text-blue-600 mb-2 font-bold"><AlertCircle size={20} /><span className="text-sm">提醒：在此更改的所有設定將立即生效。</span></div>
        <section>
          <div className="flex justify-between items-center mb-4 text-slate-400 px-1 font-bold">
            <label className="text-xs font-black uppercase tracking-widest">店舖名稱</label>
            {!isEdit ? (
              <button onClick={() => { setIsEdit(true); setTemp(config?.storeName || '') }} className="text-blue-600 text-xs flex items-center gap-1.5 hover:underline"><Edit2 size={12} /> 修改店名</button>
            ) : (
              <div className="flex gap-5"><button onClick={handleSave} className="text-green-600 text-xs font-black flex items-center gap-1.5 hover:underline active:scale-95"><Save size={14} /> 儲存</button><button onClick={() => setIsEdit(false)} className="text-slate-400 text-xs font-bold hover:underline">取消</button></div>
            )}
          </div>
          <div className={`transition-all rounded-2xl ${isEdit ? 'ring-4 ring-blue-50 border-blue-500 shadow-lg' : 'border-slate-100'}`}><input type="text" disabled={!isEdit} className={`w-full px-8 py-5 border rounded-[1.5rem] outline-none font-black text-2xl transition-all ${!isEdit ? 'bg-slate-50 text-slate-500 border-transparent shadow-inner cursor-not-allowed font-mono' : 'bg-white text-slate-900 border-blue-500'}`} value={temp} onChange={e => setTemp(e.target.value)} /></div>
        </section>
        <hr className="border-slate-100" />
        <section>
          <div className="flex justify-between items-center mb-6 px-1 font-bold">
            <div><h4 className="font-bold text-lg text-slate-700">內用結帳模式</h4><p className="text-xs text-slate-400 mt-1 font-medium">控制內用點餐是否需要立即付款</p></div>
            <div className="bg-slate-100 p-1.5 rounded-2xl flex shadow-inner border border-slate-200">
              <button onClick={() => setConfig(p => ({ ...p, dineInMode: 'prePay' }))} className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${config?.dineInMode === 'prePay' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>先付款</button>
              <button onClick={() => setConfig(p => ({ ...p, dineInMode: 'postPay' }))} className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${config?.dineInMode === 'postPay' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-400'}`}>後付款</button>
            </div>
          </div>
        </section>
        <hr className="border-slate-100" />
        <section className="space-y-8 font-sans">
          <h4 className="font-bold text-lg text-slate-700 flex items-center gap-2 px-1 font-black uppercase tracking-tight"><ShieldCheck size={20} className="text-blue-500" /> 支付通路管理 Integration</h4>
          <div className="space-y-4">
            {[
              { id: 'enableCreditCard', label: '信用卡 / 感應', desc: '支援 VISA/MasterCard 信用卡刷卡結帳', icon: CreditCard },
              { id: 'enableMobilePayment', label: '電子支付 / 掃碼', desc: '支援 Apple Pay, LINE Pay 及行動錢包支付', icon: Smartphone }
            ].map(opt => (
              <div key={opt.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100/60 shadow-sm transition-all hover:bg-white hover:border-blue-100">
                <div className="flex items-center gap-5"><div className="p-3.5 bg-white rounded-2xl shadow-sm text-blue-500 border border-slate-50"><opt.icon size={26} /></div><div><p className="text-base font-black text-slate-800">{opt.label}</p><p className="text-xs text-slate-400 font-medium mt-0.5 leading-relaxed">{opt.desc}</p></div></div>
                <button onClick={() => setConfig(p => ({ ...p, [opt.id]: !p[opt.id] }))} className={`w-16 h-8 rounded-full relative transition-all duration-300 ${config?.[opt.id] ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${config?.[opt.id] ? 'left-9' : 'left-1.5'} shadow-md`}></div></button>
              </div>
            ))}
          </div>
        </section>
      </div>
      {isEdit && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-center lg:hidden">
          <button onClick={handleSave} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg">儲存設定</button>
        </div>
      )}
    </div>
  );
};

// --- 14. 主結構入口 ---
const MainLayout = () => (
  <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
    <Sidebar />
    <main className="flex-1 ml-64 p-12 h-screen overflow-y-auto relative scroll-smooth">
      <ErrorBoundary>
        <Routes>
          <Route path="/pos" element={<POSPage />} />
          <Route path="/orders" element={<OrderManagementPage />} />
          <Route path="/settlement" element={<SettlementPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/database" element={<DatabaseViewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </ErrorBoundary>
      <GlobalModal />
    </main>
  </div>
);

const AppContent = () => {
  const { isLoggedIn } = useContext(POSContext);
  return isLoggedIn ? <MainLayout /> : (
    <>
      <LoginPage />
      <GlobalModal />
    </>
  );
};

export default function App() {
  return (
    <POSProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </POSProvider>
  );
}