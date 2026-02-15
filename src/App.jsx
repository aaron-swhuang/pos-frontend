import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Settings, LogOut, Plus, Minus, Trash2,
  Store, User, FileText, ChevronDown, ChevronUp, ChevronRight, Utensils, ShoppingBag,
  Clock, Search, Tag, Edit2, X, CheckCircle2, AlertCircle,
  ClipboardList, Wallet, Banknote, CreditCard, Smartphone,
  Delete, ShieldCheck, RotateCcw, AlertTriangle, Save, Ticket, Eye, EyeOff,
  CalendarCheck, TrendingUp, Receipt, Database, Copy, Code, ChevronLeft,
  ChevronsLeft, ChevronsRight, ListFilter, Info, Calendar, FilterX, Play,
  StopCircle, Lock, Coins
} from 'lucide-react';

// TODO: 在本地測試環境中，請取消下方的註解並移除「0. 核心業務邏輯」區塊，以恢復模組化架構。
// import { calculateFinalTotal, calculateDiscount, calculateChange, getUpdatedCart } from './utils/posLogic';

// --- 0. 核心業務邏輯 (TODO: 為了確保預覽環境運行暫時整合至此，未來應回歸外部 import) ---

const calculateDiscount = (total, value, type) => {
  if (type === 'percentage') {
    // 假設 value 為 0.9 代表打 9 折，折扣金額為 10%
    return Math.round(total * (1 - (value > 1 ? value / 100 : value)));
  }
  return value; // 定額折抵
};

const calculateFinalTotal = (total, discount) => Math.max(0, total - (parseFloat(discount) || 0));

const calculateChange = (received, total) => (parseFloat(received) || 0) - total;

/**
 * 更新購物車邏輯
 * 模擬 getUpdatedCart 邏輯 (如外部邏輯有更複雜的實作請以此為準)
 */
const getUpdatedCart = (prevCart, newItem) => {
  const existing = prevCart.find(i => i.id === newItem.id);
  if (existing) {
    return prevCart.map(i => i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i);
  }
  return [...prevCart, { ...newItem, quantity: 1 }];
};

// --- 1. 全域資料管理中心 ---
export const POSContext = createContext();

export const POSProvider = ({ children }) => {
  const [menu, setMenu] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('pos_menu'));
    return saved || [
      { id: 1, name: '招牌美式', price: 65, category: '咖啡', isAvailable: true },
      { id: 2, name: '經典拿鐵', price: 85, category: '咖啡', isAvailable: true },
      { id: 3, name: '大吉嶺紅茶', price: 50, category: '茶飲', isAvailable: true },
      { id: 4, name: '起司蛋糕', price: 95, category: '甜點', isAvailable: true }
    ];
  });

  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem('pos_orders')) || []);
  const [dailySummaries, setDailySummaries] = useState(() => JSON.parse(localStorage.getItem('pos_daily_summaries')) || []);
  const [discountRules, setDiscountRules] = useState(() => JSON.parse(localStorage.getItem('pos_discounts')) || [
    { id: 1, name: '9折優惠', type: 'percentage', value: 0.9 },
    { id: 2, name: '8折優惠', type: 'percentage', value: 0.8 },
    { id: 3, name: '現折 $10', type: 'amount', value: 10 }
  ]);

  const [config, setConfig] = useState(() => JSON.parse(localStorage.getItem('pos_config')) || {
    dineInMode: 'prePay', storeName: 'Smart POS', enableCreditCard: true, enableMobilePayment: true
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // --- 班次管理狀態 ---
  const [shift, setShift] = useState(() => JSON.parse(localStorage.getItem('pos_shift')) || {
    isOpen: false,
    businessDate: null,
    openedAt: null
  });

  // --- 全局對話框 (Modal) 狀態 ---
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    onCancel: null,
    confirmText: '確認',
    cancelText: '取消'
  });

  // --- 對話框 Helper 函式 ---
  const showAlert = (title, message, type = 'info') => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      confirmText: '我知道了',
      onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
      onCancel: null
    });
  };

  const showConfirm = (title, message, onConfirm, type = 'confirm') => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      confirmText: '確定執行',
      cancelText: '取消返回',
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setModal(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  // --- 開帳邏輯 ---
  const openShift = () => {
    const today = new Date().toLocaleDateString();
    const newShift = {
      isOpen: true,
      businessDate: today,
      openedAt: new Date().toLocaleString()
    };
    setShift(newShift);
    localStorage.setItem('pos_shift', JSON.stringify(newShift));
    showAlert('開帳成功', `營業日已設定為 ${today}。`, 'success');
  };

  // --- 資料持久化 ---
  useEffect(() => {
    localStorage.setItem('pos_menu', JSON.stringify(menu));
    localStorage.setItem('pos_orders', JSON.stringify(orders));
    localStorage.setItem('pos_daily_summaries', JSON.stringify(dailySummaries));
    localStorage.setItem('pos_config', JSON.stringify(config));
    localStorage.setItem('pos_discounts', JSON.stringify(discountRules));
    localStorage.setItem('pos_shift', JSON.stringify(shift));
  }, [menu, orders, dailySummaries, config, discountRules, shift]);

  return (
    <POSContext.Provider value={{
      menu, setMenu,
      orders, setOrders,
      dailySummaries, setDailySummaries,
      discountRules, setDiscountRules,
      isLoggedIn, setIsLoggedIn,
      config, setConfig,
      shift, setShift, openShift, showAlert, showConfirm, modal
    }}>
      {children}
    </POSContext.Provider>
  );
};

// --- 1.1 全局對話框組件 ---
const GlobalModal = () => {
  const { modal } = useContext(POSContext);
  if (!modal.isOpen) return null;

  const getIcon = () => {
    switch (modal.type) {
      case 'danger': return <AlertTriangle className="text-red-500" size={32} />;
      case 'success': return <CheckCircle2 className="text-green-500" size={32} />;
      case 'confirm': return <HelpCircle className="text-blue-500" size={32} />;
      default: return <Info className="text-blue-500" size={32} />;
    }
  };

  const getThemeClasses = () => {
    if (modal.type === 'danger') return { bg: 'bg-red-50', btn: 'bg-red-600' };
    if (modal.type === 'success') return { bg: 'bg-green-50', btn: 'bg-green-600' };
    return { bg: 'bg-blue-50', btn: 'bg-blue-600' };
  };

  const theme = getThemeClasses();

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-white/20">
        <div className="p-10 flex flex-col items-center text-center">
          <div className={`p-4 rounded-2xl mb-6 ${theme.bg}`}>
            {getIcon()}
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">{modal.title}</h3>
          <p className="text-slate-500 font-medium leading-relaxed">{modal.message}</p>
        </div>
        <div className="flex border-t border-slate-100">
          {modal.onCancel && (
            <button
              onClick={modal.onCancel}
              className="flex-1 py-6 font-bold text-slate-400 border-r border-slate-100 hover:bg-slate-50 transition-colors"
            >
              {modal.cancelText}
            </button>
          )}
          <button
            onClick={modal.onConfirm}
            className={`flex-1 py-6 font-black text-white transition-colors hover:opacity-90 ${theme.btn}`}
          >
            {modal.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const HelpCircle = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// --- 2. 組件：數字算盤 ---
const Keypad = ({ onInput, onClear, onDelete }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', '.'];
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map(key => (
        <button key={key} type="button" onClick={() => onInput(key)} className="h-12 rounded-xl bg-white border border-slate-200 shadow-sm text-xl font-bold text-slate-800 hover:bg-blue-50 active:scale-95 transition-all">{key}</button>
      ))}
      <button type="button" onClick={onClear} className="h-12 rounded-xl bg-red-50 text-red-500 font-bold hover:bg-red-100 text-sm uppercase">AC</button>
      <button type="button" onClick={onDelete} className="h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"><Delete size={20} /></button>
    </div>
  );
};

// --- 3. 結帳確認視窗 ---
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-800">
      <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden max-h-[92vh]">
        {/* 左側資訊區 */}
        <div className="lg:w-[35%] bg-slate-50 p-8 border-r border-slate-200 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <h3 className="text-xl font-black mb-5 text-slate-800">結帳內容確認</h3>
            <div className="bg-white/70 rounded-2xl border border-slate-200 p-4 overflow-y-auto flex-1 shadow-inner">
              {(items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm text-slate-600 border-b border-slate-100 py-3 last:border-0">
                  <span className="truncate max-w-[70%] font-semibold">{item.name} x{item.quantity}</span>
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

        {/* 右側操作區 */}
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
            <button type="button" onClick={onClose} className="px-8 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 border border-slate-100 uppercase text-sm tracking-widest">取消返回</button>
            <button type="button" onClick={handleFinalConfirm} disabled={paymentMethod === 'Cash' && change < 0} className={`flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${paymentMethod === 'Cash' && change < 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:shadow-blue-200'}`}>
              <Wallet size={24} /><span>4. 確認完成結帳</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 4. 組件：作廢原因 ---
export const VoidReasonModal = ({ isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in text-slate-800">
      <div className="bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl p-10">
        <div className="flex items-center gap-4 mb-6 text-red-500">
          <div className="bg-red-50 p-3 rounded-2xl"><AlertTriangle size={32} /></div>
          <h3 className="text-2xl font-bold">訂單作廢確認</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {['點錯品項', '客人取消', '操作失誤', '食材不足'].map(r => (
            <button key={r} type="button" onClick={() => setReason(r)} className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all ${reason === r ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-slate-50 text-slate-500'}`}>{r}</button>
          ))}
        </div>
        <textarea className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-red-500 font-medium mb-8 h-28 resize-none text-sm" placeholder="手動輸入原因..." value={reason} onChange={e => setReason(e.target.value)} />
        <div className="flex gap-4">
          <button type="button" onClick={onClose} className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50">返回</button>
          <button type="button" disabled={!reason.trim()} onClick={() => onConfirm(reason)} className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg">確認作廢</button>
        </div>
      </div>
    </div>
  );
};

// --- 5. 頁面元件：登入 ---
export const LoginPage = () => {
  const { setIsLoggedIn, showAlert } = useContext(POSContext);
  const [auth, setAuth] = useState({ user: '', pass: '' });
  const handleLogin = (e) => {
    e.preventDefault();
    if (auth.user === 'admin' && auth.pass === 'posadmin') {
      setIsLoggedIn(true);
    } else {
      showAlert('登入失敗', '帳號或密碼錯誤。預設帳號為 admin，密碼為 posadmin。', 'danger');
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-12 text-white flex items-center justify-center gap-6">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl shadow-lg">
            <User size={32} />
          </div>
          <h2 className="text-3xl font-black tracking-tight">POS 系統登入</h2>
        </div>
        <form onSubmit={handleLogin} className="p-10 space-y-6">
          <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">帳號</label><input className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" placeholder="admin" value={auth.user} onChange={e => setAuth({ ...auth, user: e.target.value })} /></div>
          <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">密碼</label><input type="password" name="password" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" placeholder="posadmin" value={auth.pass} onChange={e => setAuth({ ...auth, pass: e.target.value })} /></div>
          <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 active:scale-95 shadow-lg transition-all">進入系統</button>
        </form>
      </div>
    </div>
  );
};

// --- 6. 側邊導覽列 ---
export const Sidebar = () => {
  const { config, setIsLoggedIn, showConfirm, shift } = useContext(POSContext);
  const location = useLocation();

  const navItems = [
    { path: '/pos', label: '櫃檯收銀', icon: ShoppingCart },
    { path: '/orders', label: '訂單管理', icon: ClipboardList },
    { path: '/admin', label: '店務管理', icon: Edit2 },
    { path: '/dashboard', label: '報表分析', icon: LayoutDashboard },
    { path: '/database', label: '原始數據', icon: Database },
    { path: '/settings', label: '系統設定', icon: Settings },
  ];

  return (
    <div className="w-64 h-screen bg-slate-900 text-white fixed left-0 top-0 flex flex-col border-r border-slate-800">
      <div className="p-8 flex items-center space-x-3 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg shadow-lg"><Store size={24} /></div>
        <span className="text-xl font-black uppercase truncate">{config.storeName}</span>
      </div>

      <div className="px-6 py-4">
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${shift.isOpen ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${shift.isOpen ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs font-black uppercase tracking-wider">{shift.isOpen ? '營業中' : '休息結帳中'}</span>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${location.pathname === item.path ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
      <button
        onClick={() => showConfirm('安全登出', '確定要登出系統嗎？未儲存的暫存資料可能會遺失。', () => setIsLoggedIn(false))}
        className="m-6 p-4 flex items-center space-x-3 text-slate-500 hover:text-red-400 border-t border-slate-800 transition-colors shrink-0 font-bold"
      >
        <LogOut size={20} /><span>安全登出</span>
      </button>
    </div>
  );
};

// --- 7. 前台收銀頁面 ---
export const POSPage = () => {
  const { menu, setOrders, orders, config, shift, openShift, showConfirm } = useContext(POSContext);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dineIn');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const categories = useMemo(() => ['全部', ...new Set(menu.map(i => i.category).filter(Boolean))], [menu]);
  const filtered = menu.filter(item => (selectedCategory === '全部' || item.category === selectedCategory) && item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const finalizeOrder = (data) => {
    const handleFinalize = () => {
      const pref = orderType === 'dineIn' ? 'D' : 'T';
      const orderDate = shift.businessDate;
      const c = orders.filter(o => o.date === orderDate && o.orderType === orderType).length;
      const orderNo = pref + (c + 1).toString().padStart(3, '0');

      const newO = {
        id: Date.now(), orderNo, total: data.total ?? cart.reduce((s, i) => s + (i.price * i.quantity), 0),
        items: [...cart], orderType, date: orderDate, time: new Date().toLocaleTimeString(),
        status: 'unclosed', isVoided: false,
        paymentStatus: (orderType === 'dineIn' && config.dineInMode === 'postPay' && !data.paymentMethod) ? 'pending' : 'paid',
        ...data
      };

      setOrders(prev => [...prev, newO]);
      setCart([]);
      setIsCheckoutModalOpen(false);
    };

    if (orderType === 'dineIn' && config.dineInMode === 'postPay' && !data.paymentMethod) {
      showConfirm('送出點餐', '確定要送出此筆點餐清單並記錄為「待付款」嗎？', handleFinalize);
    } else {
      handleFinalize();
    }
  };

  if (!shift.isOpen) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white p-16 rounded-[3rem] shadow-2xl text-center max-w-lg border border-slate-100 animate-in fade-in zoom-in-95">
          <div className="bg-blue-50 w-24 h-24 rounded-[2rem] flex items-center justify-center text-blue-600 mx-auto mb-8 shadow-inner">
            <Lock size={48} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4">班次尚未開啟</h2>
          <p className="text-slate-400 mb-10 leading-relaxed font-medium">系統目前處於「休息結帳」狀態，請先啟動今日班次以開始收銀作業。</p>
          <button
            onClick={() => showConfirm('開始營業', '確定要開啟今日班次並設定營業日嗎？', openShift)}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Play size={24} /> 啟動今日開帳
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full overflow-hidden text-slate-900">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">點餐收銀</h2>
            <div className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest">營業日: {shift.businessDate}</div>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="搜尋..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
          </div>
        </div>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 shrink-0 no-scrollbar">
          {categories.map(c => (
            <button key={c} onClick={() => setSelectedCategory(c)} className={`px-6 py-2 rounded-full whitespace-nowrap font-bold text-sm border transition-all ${selectedCategory === c ? 'bg-blue-600 text-white shadow-md border-blue-600' : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto pr-2 flex-1 pb-10 content-start scrollbar-thin">          {filtered.map(item => (
          <button key={item.id} onClick={() => { if (!item.isAvailable) return; setCart(prev => getUpdatedCart(prev, item)) }} className={`p-6 rounded-[2rem] shadow-sm border text-left group h-fit relative overflow-hidden transition-all ${item.isAvailable ? 'bg-white border-slate-100 hover:border-blue-500' : 'bg-slate-50 opacity-60 grayscale'}`}>
            <div className="font-bold mb-1 truncate">{item.name}</div>
            <div className="font-black text-xl text-blue-600">${item.price}</div>
            {!item.isAvailable && <div className="absolute inset-0 bg-slate-900/5 flex items-center justify-center"><span className="bg-slate-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest shadow-sm">暫不供應</span></div>}
          </button>
        ))}
        </div>
      </div>
      <div className="w-full lg:w-96 flex-shrink-0 bg-white rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-50 h-full overflow-hidden">
        <div className="p-8 border-b flex flex-col gap-4 bg-slate-50/50 shrink-0">
          <div className="flex justify-between items-center"><h3 className="font-bold text-xl">購物車</h3><span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md shadow-blue-100">{cart.reduce((s, i) => s + i.quantity, 0)} 件</span></div>
          <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-inner font-bold">
            <button onClick={() => setOrderType('dineIn')} className={`flex items-center justify-center py-2.5 rounded-xl text-sm transition-all ${orderType === 'dineIn' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Utensils size={16} className="mr-2" />內用</button>
            <button onClick={() => setOrderType('takeOut')} className={`flex items-center justify-center py-2.5 rounded-xl text-sm transition-all ${orderType === 'takeOut' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><ShoppingBag size={16} className="mr-2" />外帶</button>          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {cart.map(i => (
            <div key={i.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-100 transition-all flex flex-col">
              <div className="flex justify-between items-start mb-3"><span className="font-bold text-slate-700 text-sm">{i.name}</span><span className="font-black text-slate-900 text-sm">${i.price * i.quantity}</span></div>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-inner">
                  <button onClick={() => { const nQty = Math.max(0, i.quantity - 1); if (nQty > 0) setCart(cart.map(it => it.id === i.id ? { ...it, quantity: nQty } : it)); else setCart(cart.filter(it => it.id !== i.id)); }} className="p-2.5 hover:bg-slate-200 transition-colors text-slate-500"><Minus size={14} /></button>
                  <span className="w-10 text-center font-bold text-sm text-slate-700">{i.quantity}</span>
                  <button onClick={() => setCart(cart.map(it => it.id === i.id ? { ...it, quantity: it.quantity + 1 } : it))} className="p-2.5 hover:bg-slate-200 transition-colors text-slate-500"><Plus size={14} /></button>
                </div>
                <button onClick={() => setCart(cart.filter(it => it.id !== i.id))} className="text-red-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60"><ShoppingCart size={64} className="mb-4 opacity-20" /><p className="text-sm font-medium">尚未點餐</p></div>}
        </div>
        <div className="p-8 bg-slate-900 text-white rounded-b-[2.5rem]">
          <div className="flex justify-between items-center mb-6"><span className="text-slate-400 font-medium">應付總計</span><span className="text-4xl font-black tracking-tight">${cart.reduce((s, i) => s + (i.price * i.quantity), 0)}</span></div>
          <button type="button" onClick={() => { if (cart.length > 0) { if (orderType === 'dineIn' && config.dineInMode === 'postPay') finalizeOrder({ total: cart.reduce((s, i) => s + (i.price * i.quantity), 0) }); else setIsCheckoutModalOpen(true); } }} disabled={cart.length === 0} className={`w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-xl ${orderType === 'dineIn' && config.dineInMode === 'postPay' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {orderType === 'dineIn' && config.dineInMode === 'postPay' ? '送出訂單 (待付款)' : '進行結帳確認'}
          </button>
        </div>
      </div>
      <CheckoutModal isOpen={isCheckoutModalOpen} onClose={() => setIsCheckoutModalOpen(false)} cartTotal={cart.reduce((s, i) => s + (i.price * i.quantity), 0)} items={cart} onConfirm={finalizeOrder} />
    </div>
  );
};

// --- 8. 頁面元件：訂單管理 ---
export const OrderManagementPage = () => {
  const { orders, setOrders, shift, showAlert } = useContext(POSContext);
  const [expandedId, setExpandedId] = useState(null);
  const [activePayOrder, setActivePayOrder] = useState(null);
  const [voidId, setVoidId] = useState(null);

  const pending = orders.filter(o => o.status === 'unclosed' && o.paymentStatus === 'pending' && !o.isVoided);
  const history = orders.filter(o => o.status === 'unclosed' && (o.paymentStatus === 'paid' || o.isVoided));

  const handleActionClick = (actionFn) => {
    if (!shift.isOpen) {
      showAlert('操作已鎖定', '目前班次已結清休息中，無法修改現有訂單。', 'danger');
      return;
    }
    actionFn();
  };

  return (
    <div className="max-w-6xl h-full flex flex-col overflow-hidden text-slate-900">
      <div className="flex justify-between items-end mb-8 shrink-0">
        <div><h2 className="text-3xl font-black text-slate-800">訂單管理</h2><p className="text-slate-400 mt-1">目前所有未日結交易清單</p></div>
        <div className="flex gap-4 font-bold"><div className="bg-amber-50 px-8 py-4 rounded-3xl text-right border border-amber-100 shadow-sm text-amber-700"><p className="text-[10px] text-amber-500 uppercase font-black">待收總額</p><p className="text-2xl font-black">${pending.reduce((s, o) => s + o.total, 0)}</p></div><div className="bg-blue-50 px-8 py-4 rounded-3xl text-right border border-blue-100 shadow-sm text-blue-700"><p className="text-[10px] text-blue-500 uppercase font-black">實收累計</p><p className="text-2xl font-black">${history.filter(o => !o.isVoided).reduce((s, o) => s + o.total, 0)}</p></div></div>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-10 overflow-hidden">
        <div className="flex flex-col min-h-0">
          <h3 className="text-xs font-black text-slate-400 uppercase mb-5 flex items-center gap-2 px-2"><AlertCircle size={16} className="text-amber-500" /> 待收款區 ({pending.length})</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pb-10 scrollbar-thin pr-2">
            {pending.map(o => (
              <div key={o.id} onClick={() => setExpandedId(expandedId === o.id ? null : o.id)} className={`bg-white p-6 rounded-[2rem] border transition-all cursor-pointer ${expandedId === o.id ? 'ring-2 ring-blue-500 shadow-xl border-transparent' : 'border-slate-100 hover:border-blue-200'}`}>
                <div className="flex justify-between items-center">
                  <div><div className="flex items-center gap-2 mb-1.5 font-black text-xl text-slate-800">#{o.orderNo} <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-lg">等待付款</span></div><div className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12} />{o.date} {o.time}</div></div>
                  <div className="flex items-center gap-4"><button type="button" onClick={(e) => { e.stopPropagation(); setVoidId(o.id) }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><RotateCcw size={20} /></button><div className="text-right mx-2"><p className="text-[10px] text-slate-400 uppercase font-bold">金額</p><p className="text-2xl font-black text-slate-800">${o.total}</p></div><button type="button" onClick={(e) => { e.stopPropagation(); setActivePayOrder(o) }} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-blue-600 transition-all text-sm uppercase">前往付款</button></div>
                </div>
                {expandedId === o.id && <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">{(o.items || []).map((it, idx) => (<div key={idx} className="flex justify-between text-sm text-slate-600"><span>{it.name} x {it.quantity}</span><span className="font-bold text-slate-800">${it.price * it.quantity}</span></div>))}</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col min-h-0">
          <h3 className="text-xs font-black text-slate-400 uppercase mb-5 flex items-center gap-2 px-2"><CheckCircle2 size={16} className="text-blue-500" /> 已付清 / 已作廢 (未結算)</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {[...history].reverse().map(o => (
              <div key={o.id} onClick={() => setExpandedId(expandedId === o.id ? null : o.id)} className={`bg-white p-5 rounded-[1.5rem] border border-slate-100 transition-all cursor-pointer ${o.isVoided ? 'opacity-40 grayscale bg-slate-50 border-dashed' : 'hover:bg-blue-50/30'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4"><div className={`p-2 rounded-xl ${o.isVoided ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-500'}`}>{o.orderType === 'takeOut' ? <ShoppingBag size={22} /> : <Utensils size={22} />}</div><div><div className={`font-black text-base text-slate-800 ${o.isVoided ? 'line-through' : ''}`}>#{o.orderNo}</div><div className="text-[10px] text-slate-400">{o.date} {o.time}</div></div></div>
                  <div className="flex items-center gap-5">{!o.isVoided && <button type="button" onClick={(e) => { e.stopPropagation(); setVoidId(o.id) }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><RotateCcw size={18} /></button>}<div className="text-right"><div className="text-xl font-black text-slate-800">${o.total}</div><div className={`text-[10px] font-black uppercase tracking-tighter ${o.isVoided ? 'text-red-500' : 'text-blue-400'}`}>{o.isVoided ? '已作廢' : (o.paymentMethod || '已支付')}</div></div></div>
                </div>
                {expandedId === o.id && <div className="mt-5 pt-4 border-t border-slate-100 text-[10px] space-y-2">{o.isVoided && <div className="bg-red-50 p-2.5 rounded-xl text-red-600 font-bold border border-red-100 flex items-center gap-2"><AlertTriangle size={12} />原因：{o.voidReason}</div>}{o.items?.map((it, idx) => (<div key={idx} className="flex justify-between px-1 text-slate-600"><span>{it.name} x {it.quantity}</span><span className="font-bold text-slate-900">${it.price * it.quantity}</span></div>))}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <CheckoutModal isOpen={!!activePayOrder} onClose={() => setActivePayOrder(null)} cartTotal={activePayOrder?.total || 0} items={activePayOrder?.items || []} onConfirm={(d) => { setOrders(prev => prev.map(o => o.id === activePayOrder.id ? { ...o, ...d, paymentStatus: 'paid', status: 'unclosed' } : o)); setActivePayOrder(null); }} />
      <VoidReasonModal
        isOpen={!!voidId}
        onClose={() => setVoidId(null)}
        onConfirm={(r) => {
          setOrders(prev => prev.map(o =>
            o.id === voidId
              ? { ...o, isVoided: true, voidReason: r }
              : o
          ));
          setVoidId(null);
        }}
      />
    </div>
  );
};

// --- 9. 頁面元件：店務管理 ---
export const AdminPage = () => {
  const { menu, setMenu, discountRules, setDiscountRules, showConfirm } = useContext(POSContext);
  const [tab, setTab] = useState('menu');
  const [item, setItem] = useState({ name: '', price: '', category: '' });
  const [editId, setEditId] = useState(null);
  const [newDisc, setNewDisc] = useState({ name: '', type: 'percentage', value: '' });

  const handleMenuSubmit = (e) => {
    e.preventDefault();
    if (!item.name || !item.price || !item.category) return;
    if (editId) {
      setMenu(menu.map(i => i.id === editId ? { ...i, ...item, price: parseFloat(item.price) } : i));
      setEditId(null);
    } else {
      setMenu([...menu, { id: Date.now(), ...item, price: parseFloat(item.price), isAvailable: true }]);
    }
    setItem({ name: '', price: '', category: '' });
  };

  const handleDiscountSubmit = (e) => {
    e.preventDefault();
    if (!newDisc.name || !newDisc.value) return;
    setDiscountRules([...discountRules, {
      id: Date.now(),
      name: newDisc.name,
      type: newDisc.type,
      value: parseFloat(newDisc.value)
    }]);
    setNewDisc({ name: '', type: 'percentage', value: '' });
  };

  return (
    <div className="max-w-4xl h-full flex flex-col overflow-hidden text-slate-900">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-black">店務管理系統</h2>
        <div className="bg-slate-100 p-1 rounded-xl flex font-bold border border-slate-200">
          <button type="button" onClick={() => setTab('menu')} className={`px-8 py-2 rounded-lg text-sm transition-all ${tab === 'menu' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>菜單設定</button>
          <button type="button" onClick={() => setTab('discount')} className={`px-8 py-2 rounded-lg text-sm transition-all ${tab === 'discount' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>優惠方案</button>
        </div>
      </div>
      {tab === 'menu' ? (
        <><form onSubmit={handleMenuSubmit} className={`bg-white p-6 rounded-3xl border mb-6 shrink-0 ${editId ? 'border-amber-400 ring-4 ring-amber-50 shadow-lg' : 'border-slate-100 shadow-sm'}`}><div className="grid grid-cols-12 gap-4"><div className="col-span-5"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">商品名稱</label><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} /></div><div className="col-span-3"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">分類</label><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={item.category} onChange={e => setItem({ ...item, category: e.target.value })} /></div><div className="col-span-2"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">單價</label><input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={item.price} onChange={e => setItem({ ...item, price: e.target.value })} /></div><div className="col-span-2 flex items-end"><button type="submit" className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold active:scale-95">新增/更新</button></div></div></form>
          <div className="grid gap-3 overflow-y-auto flex-1 pr-2 pb-10 scrollbar-thin">
            {menu.map(i => (
              <div key={i.id} className={`bg-white px-6 py-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm ${i.isAvailable ? '' : 'bg-slate-50 opacity-60'}`}>
                <div className="flex items-center gap-4"><Tag size={18} /><div><div className="font-bold text-slate-800">{i.name}</div><div className="text-[10px] text-slate-400 uppercase">{i.category}</div></div></div>
                <div className="flex items-center gap-6"><span className="font-black text-xl text-blue-600">${i.price}</span>
                  <div className="flex gap-2 border-l pl-6 border-slate-100 text-slate-400">
                    <button type="button" onClick={() => setMenu(menu.map(m => m.id === i.id ? { ...m, isAvailable: !m.isAvailable } : m))} className="p-2">{i.isAvailable ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                    <button type="button" onClick={() => { setEditId(i.id); setItem({ name: i.name, price: i.price.toString(), category: i.category }); }} className="p-2"><Edit2 size={18} /></button>
                    <button type="button" onClick={() => showConfirm('刪除品項', `確定要從菜單中永久刪除「${i.name}」嗎？`, () => setMenu(menu.filter(m => m.id !== i.id)), 'danger')} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <><form onSubmit={(e) => { e.preventDefault(); if (!newDisc.name || !newDisc.value) return; setDiscountRules([...(discountRules || []), { id: Date.now(), ...newDisc, value: parseFloat(newDisc.value) }]); setNewDisc({ name: '', type: 'percentage', value: '' }); }} className="bg-white p-6 rounded-3xl border border-slate-100 mb-6 shrink-0 shadow-sm"><div className="grid grid-cols-12 gap-4"><div className="col-span-5"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">方案名稱</label><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={newDisc.name} onChange={e => setNewDisc({ ...newDisc, name: e.target.value })} placeholder="例如：慶開幕8折" /></div><div className="col-span-3"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">類型</label><select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer" value={newDisc.type} onChange={e => setNewDisc({ ...newDisc, type: e.target.value })}><option value="percentage">折扣 (%)</option><option value="amount">折抵 ($)</option></select></div><div className="col-span-2"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">數值</label><input type="number" step="0.01" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={newDisc.value} onChange={e => setNewDisc({ ...newDisc, value: e.target.value })} /></div><div className="col-span-2 flex items-end"><button type="submit" className="w-full h-12 bg-blue-600 text-white rounded-xl font-bold shadow-lg active:scale-95">新增方案</button></div></div></form>
          <div className="grid gap-3 overflow-y-auto flex-1 pr-2 pb-10 scrollbar-thin">
            {(discountRules || []).map(r => (
              <div key={r.id} className="bg-white px-6 py-4 rounded-2xl border border-slate-50 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4"><div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Ticket size={18} /></div><div><div className="font-bold text-slate-800">{r.name}</div><div className="text-[10px] text-slate-400 uppercase">{r.type === 'percentage' ? '比例折扣' : '定額折抵'}</div></div></div>
                <div className="flex items-center gap-6"><span className="font-black text-xl text-blue-600">${r.type === 'percentage' ? `${Math.round(r.value * 100)}%` : `-$${r.value}`}</span><button type="button" onClick={() => showConfirm('刪除方案', `確定要刪除「${r.name}」優惠方案嗎？`, () => setDiscountRules(discountRules.filter(it => it.id !== r.id)), 'danger')} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button></div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// --- 10. 頁面元件：報表分析 ---
export const DashboardPage = () => {
  const { orders, dailySummaries, setDailySummaries, setOrders, showAlert, showConfirm, shift, setShift } = useContext(POSContext);
  const [expandOrderId, setExpandOrderId] = useState(null);
  const [expandSummaryId, setExpandSummaryId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const currentShiftCompletedOrders = useMemo(() => orders.filter(o => o.status === 'unclosed' && (o.paymentStatus === 'paid' || o.isVoided)), [orders]);
  const totalRevenue = currentShiftCompletedOrders.filter(o => !o.isVoided).reduce((s, o) => s + o.total, 0);

  const performSettlement = (businessDate, allOrders) => {
    const targetOrders = allOrders.filter(o => o.status === 'unclosed' && o.date === businessDate && (o.paymentStatus === 'paid' || o.isVoided));
    if (targetOrders.length === 0) return;

    const summary = targetOrders.reduce((acc, order) => {
      if (order.isVoided) { acc.voidedOrders.push(order); acc.voidedCount += 1; }
      else {
        acc.total += order.total; acc.orderCount += 1; acc.typeCount[order.orderType || 'dineIn'] += 1;
        order.items?.forEach(item => { acc.itemSales[item.name] = (acc.itemSales[item.name] || 0) + (item.quantity || 1); });
      }
      acc.relatedOrders.push(order);
      return acc;
    }, { total: 0, orderCount: 0, voidedCount: 0, itemSales: {}, typeCount: { dineIn: 0, takeOut: 0 }, relatedOrders: [], voidedOrders: [] });

    setDailySummaries(prev => {
      const updated = [...prev];
      const existingIdx = updated.findIndex(s => s.date === businessDate);
      if (existingIdx > -1) {
        const existing = { ...updated[existingIdx] };
        existing.total += summary.total; existing.orderCount += summary.orderCount; existing.voidedCount += summary.voidedCount; existing.closedAt = new Date().toLocaleString();
        Object.entries(summary.itemSales).forEach(([n, q]) => { existing.itemSales[n] = (existing.itemSales[n] || 0) + q; });
        existing.typeCount.dineIn += summary.typeCount.dineIn; existing.typeCount.takeOut += summary.typeCount.takeOut;
        existing.relatedOrders = [...(existing.relatedOrders || []), ...summary.relatedOrders];
        existing.voidedOrders = [...(existing.voidedOrders || []), ...summary.voidedOrders];
        updated[existingIdx] = existing;
      } else {
        updated.push({ id: Date.now(), date: businessDate, ...summary, closedAt: new Date().toLocaleString() });
      }
      return updated;
    });
    setOrders(prev => prev.map(o => (o.status === 'unclosed' && o.date === businessDate && (o.paymentStatus === 'paid' || o.isVoided)) ? { ...o, status: 'closed' } : o));
  };

  const renderItemDetails = (items) => (items || []).map((item, idx) => (
    <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
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
              <button onClick={() => showConfirm('先行結算', '將目前數據併入日報，但不關帳？', () => performSettlement(shift.businessDate, orders))} className="bg-white/10 hover:bg-white/20 px-4 py-3.5 rounded-2xl font-bold border border-white/20 flex items-center justify-center gap-2 transition-all shadow-inner active:scale-95"><Coins size={18} /><span>先行結算</span></button>
              <button onClick={() => {
                const unclosedOrders = orders.filter(o => o.status === 'unclosed');
                const pendingOrders = unclosedOrders.filter(o => o.paymentStatus === 'pending' && !o.isVoided);
                if (pendingOrders.length > 0) showAlert('無法關帳', `還有 ${pendingOrders.length} 筆單據待處理。`, 'danger');
                else showConfirm('日結關帳', `結束營業日 ${shift.businessDate} 並封存數據？`, () => { performSettlement(shift.businessDate, orders); setShift({ isOpen: false, businessDate: null, openedAt: null }); });
              }} className="bg-white text-blue-700 px-4 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg hover:bg-blue-50 active:scale-95 transition-all"><StopCircle size={18} /><span>日結關帳</span></button>
            </div>
          )}
        </div>
        <div className="bg-white p-10 rounded-3xl border border-slate-100 flex flex-col justify-center shadow-sm"><p className="text-sm font-bold uppercase tracking-widest mb-4 text-slate-400 font-black">當前班次支付分佈</p><div className="space-y-3 font-sans font-medium">{['Cash', 'Credit', 'Mobile'].map(pm => (<div key={pm} className="flex justify-between items-center text-sm font-medium"><span className="uppercase text-[10px] text-slate-400 font-black">{pm === 'Cash' ? '現金' : pm === 'Credit' ? '刷卡' : '支付'}</span><span className="font-black text-slate-700 font-mono">${currentShiftCompletedOrders.filter(o => o.paymentMethod === pm && !o.isVoided).reduce((s, o) => s + o.total, 0)}</span></div>))}</div></div>
      </div>
      <div className="flex space-x-4 mb-6 border-b border-slate-200 shrink-0"><button onClick={() => setShowHistory(false)} className={`pb-4 px-4 font-bold transition-all border-b-2 ${!showHistory ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>日報彙整</button><button onClick={() => setShowHistory(true)} className={`pb-4 px-4 font-bold transition-all border-b-2 ${showHistory ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>交易明細</button></div>
      <div className="flex-1 overflow-y-auto pr-2 pb-10 scrollbar-thin">
        {!showHistory ? (
          <div className="space-y-4">
            {[...dailySummaries].reverse().map(summary => (
              <div key={summary.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div onClick={() => setExpandSummaryId(expandSummaryId === summary.id ? null : summary.id)} className={`p-6 flex items-center justify-between cursor-pointer ${expandSummaryId === summary.id ? 'bg-blue-50/50' : ''}`}><div className="flex items-center space-x-4"><div className="bg-green-100 text-green-600 p-3 rounded-xl shadow-sm"><FileText /></div><div><div className="font-bold text-lg text-slate-800 tracking-tight">{summary.date} 彙整報表</div><div className="text-xs text-slate-400 font-medium font-mono opacity-60">最後結算：{summary.closedAt}</div></div></div><div className="flex items-center space-x-8"><div className="text-right"><div className="text-xs uppercase font-black text-slate-400 tracking-tighter">總金額</div><div className="text-2xl font-black text-blue-600 tracking-tight font-mono font-mono">${summary.total}</div></div>{expandSummaryId === summary.id ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}</div></div>
                {expandSummaryId === summary.id && (
                  <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 animate-in fade-in space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col"><h4 className="text-[10px] font-black uppercase mb-4 text-slate-400 tracking-widest">銷量統計</h4><div className="space-y-2">{Object.entries(summary.itemSales || {}).map(([name, count]) => (<div key={name} className="flex justify-between items-center text-sm font-medium"><span className="text-slate-600">{name}</span><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{count}</span></div>))}</div></div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col"><h4 className="text-xs font-bold uppercase mb-4 flex items-center text-orange-500"><Utensils size={14} className="mr-2 text-orange-500" /> 內外帶</h4><div className="space-y-4"><div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-600">內用</span><span className="font-black text-blue-600">{summary.typeCount?.dineIn || 0}</span></div><div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-600">外帶</span><span className="font-black text-orange-600">{summary.typeCount?.takeOut || 0}</span></div></div></div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col"><h4 className="text-[10px] font-black uppercase mb-4 text-slate-400 tracking-widest text-red-500">異常統計</h4><span className="text-2xl font-black text-red-600">{summary.voidedCount || 0}</span><p className="text-[10px] text-slate-400 mt-2 italic">作廢訂單數</p></div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center"><span className="text-xs uppercase font-black block mb-1 text-slate-400 tracking-widest">平均客單</span><span className="text-2xl font-black text-slate-900 tracking-tight font-mono font-mono font-mono font-mono">${summary.orderCount > 0 ? (summary.total / summary.orderCount).toFixed(0) : 0}</span><span className="text-[10px] mt-2 italic text-slate-400 font-mono">共計 {summary.orderCount} 筆</span></div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold mb-4 flex items-center text-slate-900"><Receipt size={16} className="mr-2 text-blue-500" /> 原始訂單明細 (含作廢)</h4>
                      <div className="space-y-2">
                        {(summary.relatedOrders || []).map(order => {
                          const isOrderExpand = expandOrderId === order.id;
                          return (
                            <div key={order.id} className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm ${order.isVoided ? 'opacity-40 grayscale' : ''}`}>
                              <div onClick={(e) => { e.stopPropagation(); setExpandOrderId(isOrderExpand ? null : order.id); }} className="flex items-center px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors">
                                <div className="flex flex-col flex-1"><span className={`text-sm font-bold ${order.isVoided ? 'line-through text-red-400' : 'text-slate-700'}`}>號碼 #{order.orderNo || 'N/A'}</span><span className="text-[10px] text-slate-400">{order.time}</span></div>
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
        ) : (
          <div className="space-y-3">{orders.filter(o => o.status === 'unclosed').reverse().map(order => {
            const isOrderExpand = expandOrderId === order.id;
            return (
              <div key={order.id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${order.isVoided ? 'opacity-30' : 'border-blue-200 shadow-blue-50 shadow-sm'}`}>
                <div onClick={() => setExpandOrderId(isOrderExpand ? null : order.id)} className="flex items-center px-6 py-5 cursor-pointer hover:bg-slate-50 transition-colors text-slate-900">
                  <div className="flex-1">
                    <div className="font-bold flex items-center text-slate-700">#{order.orderNo || 'N/A'} - {order.date} <span className={`ml-3 text-[10px] px-2 py-0.5 rounded font-bold ${order.isVoided ? 'bg-red-100 text-red-600' : order.orderType === 'takeOut' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{order.isVoided ? '已作廢' : order.orderType === 'takeOut' ? '外帶' : '內用'}</span></div>
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
        )}
      </div>
    </div>
  );
};

// --- 11. 頁面元件：原始數據檢視 ---
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
      o.orderNo?.toLowerCase().includes(s) ||
      o.id.toString().includes(s) ||
      o.date.includes(s) ||
      o.items?.some(item => item.name.toLowerCase().includes(s))
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
          <button onClick={() => copyToClipboard(orders)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95"><Copy size={14} /> 導出全部 JSON</button>
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
                    <td className="p-4 text-center">
                      <button onClick={(e) => { e.stopPropagation(); setEditingOrder(o); }} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={14} /></button>
                    </td>
                    <td className="p-4 text-right"><button onClick={(e) => { e.stopPropagation(); setViewJson(o); }} className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"><Code size={14} /></button></td>
                  </tr>
                  {expandedId === o.id && (
                    <tr className="bg-blue-50/20"><td colSpan="9" className="p-0 border-b border-blue-100">
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-200">
                        {/* 左側：商品清單 */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2 mb-2">
                            <Receipt size={12} /> 訂單內容明細
                          </h4>
                          <div className="bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-[11px]">
                              <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                  <th className="p-2 text-slate-400 font-bold">商品名稱</th>
                                  <th className="p-2 text-right text-slate-400 font-bold">單價</th>
                                  <th className="p-2 text-center text-slate-400 font-bold">數量</th>
                                  <th className="p-2 text-right text-slate-400 font-bold">小計</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {o.items?.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-blue-50/10">
                                    <td className="p-2 font-bold text-slate-600">{item.name}</td>
                                    <td className="p-2 text-right text-slate-400 font-mono">${item.price}</td>
                                    <td className="p-2 text-center font-bold text-slate-500 font-mono">x{item.quantity}</td>
                                    <td className="p-2 text-right font-black text-slate-700 font-mono">${item.price * item.quantity}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        {/* 右側：元數據摘要 */}
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mb-2">
                            <ListFilter size={12} /> 系統元數據 (Meta)
                          </h4>
                          <div className="grid grid-cols-2 gap-3 text-[10px]">
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <p className="text-slate-400 font-bold mb-1">內部唯一 ID</p>
                              <p className="font-mono text-slate-600">{o.id}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <p className="text-slate-400 font-bold mb-1">交易類型</p>
                              <p className="font-bold text-slate-600">{o.orderType === 'takeOut' ? '🥡 外帶' : '🍽️ 內用'}</p>
                            </div>
                            {o.isVoided && (
                              <div className="bg-red-50 p-3 rounded-xl border border-red-100 col-span-2">
                                <p className="text-red-400 font-bold mb-1 flex items-center gap-1"><AlertCircle size={10} /> 作廢原因</p>
                                <p className="font-bold text-red-700">{o.voidReason || '未註記'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {paginatedOrders.length === 0 && (
            <div className="p-20 text-center text-slate-300">查無對應數據</div>
          )}
        </div>

        {/* 分頁控制條 */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 rounded-b-3xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase">
            顯示 {filteredOrders.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filteredOrders.length)} 筆，共 {filteredOrders.length} 筆
          </div>
          <div className="flex items-center gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all"><ChevronsLeft size={16} /></button>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all"><ChevronLeft size={16} /></button>
            <div className="flex items-center px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black min-w-[80px] justify-center">
              <span className="text-blue-600 font-mono">{currentPage}</span><span className="mx-2 text-slate-300">/</span><span className="text-slate-500 font-mono">{totalPages || 1}</span>
            </div>
            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all"><ChevronRight size={16} /></button>
            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(totalPages)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all"><ChevronsRight size={16} /></button>
          </div>
        </div>
      </div>

      {viewJson && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in font-sans text-slate-900">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50 font-sans"><h3 className="font-black text-xl">原始數據 JSON - #{viewJson.orderNo}</h3><button onClick={() => setViewJson(null)} className="p-2 hover:bg-red-100 text-red-500 rounded-2xl transition-all"><X size={24} /></button></div>
            <div className="flex-1 overflow-auto p-8 bg-slate-900 font-mono"><pre className="text-green-400 text-xs whitespace-pre-wrap leading-relaxed">{JSON.stringify(viewJson, null, 2)}</pre></div>
          </div>
        </div>
      )}

      {/* NEW: Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="font-black text-xl mb-4">編輯訂單 #{editingOrder.orderNo}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500">狀態 (Status)</label>
                <select
                  className="w-full border rounded-lg p-2 mt-1"
                  value={editingOrder.status}
                  onChange={e => setEditingOrder({ ...editingOrder, status: e.target.value })}
                >
                  <option value="unclosed">Unclosed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500">付款狀態 (Payment)</label>
                <select
                  className="w-full border rounded-lg p-2 mt-1"
                  value={editingOrder.paymentStatus}
                  onChange={e => setEditingOrder({ ...editingOrder, paymentStatus: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500">日期 (YYYY-MM-DD) <span className="text-red-500">*</span></label>
                <input
                  className="w-full border rounded-lg p-2 mt-1 font-mono"
                  value={editingOrder.date}
                  onChange={e => setEditingOrder({ ...editingOrder, date: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="voidCheck"
                  checked={editingOrder.isVoided}
                  onChange={e => setEditingOrder({ ...editingOrder, isVoided: e.target.checked })}
                  className="w-4 h-4 accent-red-600"
                />
                <label htmlFor="voidCheck" className="text-sm font-bold text-slate-700">標記為已作廢 (Voided)</label>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setEditingOrder(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-500">取消</button>
              <button onClick={() => handleUpdateOrder(editingOrder)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg">儲存變更</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export const SettingsPage = () => {
  const { config, setConfig, showAlert } = useContext(POSContext);
  const [isEdit, setIsEdit] = useState(false);
  const [temp, setTemp] = useState(config?.storeName || '');
  const handleSave = () => { setConfig(p => ({ ...p, storeName: temp })); setIsEdit(false); showAlert('成功', '儲存成功', 'success'); };
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
    </div>
  );
};

// --- 13. 主結構入口 ---
const MainLayout = () => (
  <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
    <Sidebar />
    <main className="flex-1 ml-64 p-12 h-screen overflow-y-auto relative scroll-smooth">
      <Routes>
        <Route path="/pos" element={<POSPage />} />
        <Route path="/orders" element={<OrderManagementPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/database" element={<DatabaseViewPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
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