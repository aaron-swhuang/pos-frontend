import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Settings, LogOut, Plus, Minus, Trash2,
  Store, User, FileText, ChevronDown, ChevronUp, ChevronRight, Utensils, ShoppingBag,
  Clock, Search, Tag, Edit2, X, CheckCircle2, AlertCircle,
  ClipboardList, Wallet, Banknote, CreditCard, Smartphone,
  Delete, ShieldCheck, RotateCcw, AlertTriangle, Save, Ticket, Eye, EyeOff,
  CalendarCheck, TrendingUp, Receipt, Database, Copy, Code, ChevronLeft, ChevronsLeft, ChevronsRight, ListFilter, Info
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

// 模擬 getUpdatedCart 邏輯 (如外部邏輯有更複雜的實作請以此為準)
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [config, setConfig] = useState(() => JSON.parse(localStorage.getItem('pos_config')) || {
    dineInMode: 'prePay', storeName: 'Smart POS', enableCreditCard: true, enableMobilePayment: true
  });

  // 全局對話框狀態管理
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

  useEffect(() => {
    const hasLegacyVoided = orders.some(o => o.status === 'voided');
    if (hasLegacyVoided) {
      setOrders(prev => prev.map(o =>
        o.status === 'voided' ? { ...o, status: 'unclosed', isVoided: true, voidReason: o.voidReason || 'Migration' } : o
      ));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pos_menu', JSON.stringify(menu));
    localStorage.setItem('pos_orders', JSON.stringify(orders));
    localStorage.setItem('pos_daily_summaries', JSON.stringify(dailySummaries));
    localStorage.setItem('pos_config', JSON.stringify(config));
    localStorage.setItem('pos_discounts', JSON.stringify(discountRules));
  }, [menu, orders, dailySummaries, config, discountRules]);

  return (
    <POSContext.Provider value={{
      menu, setMenu, orders, setOrders, dailySummaries, setDailySummaries,
      discountRules, setDiscountRules, isLoggedIn, setIsLoggedIn, config, setConfig,
      showAlert, showConfirm, modal
    }}>{children}</POSContext.Provider>
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

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-10 flex flex-col items-center text-center">
          <div className={`p-4 rounded-2xl mb-6 ${modal.type === 'danger' ? 'bg-red-50' : modal.type === 'success' ? 'bg-green-50' : 'bg-blue-50'}`}>
            {getIcon()}
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">{modal.title}</h3>
          <p className="text-slate-500 font-medium leading-relaxed">{modal.message}</p>
        </div>
        <div className="flex border-t border-slate-100">
          {modal.onCancel && (
            <button
              onClick={modal.onCancel}
              className="flex-1 py-6 font-bold text-slate-400 hover:bg-slate-50 transition-colors border-r border-slate-100"
            >
              {modal.cancelText}
            </button>
          )}
          <button
            onClick={modal.onConfirm}
            className={`flex-1 py-6 font-black transition-colors hover:opacity-90 ${modal.type === 'danger' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}
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
    <div className="grid grid-cols-3 gap-1">
      {keys.map(key => (
        <button key={key} type="button" onClick={() => onInput(key)} className="h-10 lg:h-11 rounded-xl bg-white border border-slate-200 shadow-sm text-lg font-bold text-slate-800 hover:bg-blue-50 active:scale-95 transition-all">{key}</button>
      ))}
      <button type="button" onClick={onClear} className="h-10 lg:h-11 rounded-xl bg-red-50 text-red-500 font-bold hover:bg-red-100 text-xs uppercase">AC</button>
      <button type="button" onClick={onDelete} className="h-10 lg:h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"><Delete size={18} /></button>
    </div>
  );
};

// --- 3. 結帳確認視窗 ---
export const CheckoutModal = ({ isOpen, onClose, cartTotal, items, onConfirm }) => {
  const { config, discountRules } = useContext(POSContext);
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
      change: paymentMethod === 'Cash' ? Math.max(0, change) : 0
    });
    setDiscount('0'); setDiscountName(''); setCashReceived(''); setPaymentMethod('Cash');
  };

  const options = [
    { id: 'Cash', label: '現金', icon: <Banknote size={18} />, enabled: true },
    { id: 'Credit', label: '刷卡', icon: <CreditCard size={18} />, enabled: config.enableCreditCard },
    { id: 'Mobile', label: '支付', icon: <Smartphone size={18} />, enabled: config.enableMobilePayment }
  ].filter(opt => opt.enabled);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-800">
      <div className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden max-h-[92vh]">
        <div className="lg:w-[32%] bg-slate-50 p-5 border-r border-slate-200 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <h3 className="text-lg font-bold mb-3">結帳內容確認</h3>
            <div className="bg-white/70 rounded-xl border border-slate-100 p-2 overflow-y-auto flex-1">
              {(items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px] text-slate-600 border-b border-slate-50 py-1 last:border-0">
                  <span className="truncate max-w-[65%] font-medium">{item.name} x{item.quantity}</span>
                  <span className="font-bold">${item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-200 shrink-0">
            <div className="flex justify-between text-[11px] text-slate-500 font-bold"><span>原價小計</span><span>${cartTotal}</span></div>
            <div onClick={() => setFocusField('discount')} className={`flex justify-between p-2 rounded-lg border transition-all cursor-pointer ${focusField === 'discount' ? 'border-blue-500 bg-white ring-2 ring-blue-50' : 'border-slate-200 bg-white/40'}`}>
              <span className="text-[10px] font-bold text-slate-400">優惠折抵 {discountName && `(${discountName})`}</span>
              <span className="text-sm font-black text-red-500">-${discount}</span>
            </div>
            <div className="flex justify-between items-end pt-1">
              <span className="text-xs font-bold text-slate-400 uppercase">應收總額</span>
              <span className="text-4xl font-black text-blue-600">${finalTotal}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 flex flex-col bg-white overflow-hidden justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">1. 選擇支付方式</h3>
              <div className="grid grid-cols-3 gap-2">
                {options.map(opt => (
                  <button key={opt.id} type="button" onClick={() => setPaymentMethod(opt.id)} className={`flex flex-col items-center justify-center py-2.5 rounded-xl border-2 transition-all gap-1 ${paymentMethod === opt.id ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                    {opt.icon}<span className="font-bold text-[10px] uppercase">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">2. 套用優惠方案</h3>
              <div className="flex gap-1.5 flex-wrap px-1">
                {discountRules.map(rule => (
                  <button key={rule.id} type="button" onClick={() => {
                    const val = calculateDiscount(cartTotal, rule.value, rule.type);
                    setDiscount(val.toString()); setDiscountName(rule.name);
                  }} className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-black transition-all flex items-center gap-1 ${discountName === rule.name ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200'}`}><Ticket size={10} />{rule.name}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 flex flex-col justify-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-1 px-1">3. 輸入收受金額</h3>
                {paymentMethod === 'Cash' ? (
                  <div className="space-y-2">
                    <div onClick={() => setFocusField('cash')} className={`p-3 rounded-xl border-2 cursor-pointer ${focusField === 'cash' ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                      <div className="flex justify-between items-center mb-1"><span className="text-slate-400 text-[9px] font-bold uppercase">實收</span>
                        <div className="flex gap-1">
                          {[100, 500, 1000].map(v => (
                            <button key={v} type="button" onClick={(e) => { e.stopPropagation(); setCashReceived(prev => ((parseFloat(prev) || 0) + v).toString()); }} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold hover:border-blue-500">+{v}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between font-black"><span className="text-lg text-slate-300">$</span><span className="text-3xl">{cashReceived || '0'}</span></div>
                    </div>
                    <div className={`p-3 rounded-xl border flex flex-col justify-center shadow-sm ${change >= 0 ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-500'}`}>
                      <label className="text-[9px] font-black opacity-60 uppercase mb-0.5">找零金額</label>
                      <div className="flex items-center justify-between px-1 font-black"><span className="text-lg">$</span><span className="text-2xl">{change >= 0 ? Math.round(change) : "金額不足"}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-4 text-center min-h-[140px]">
                    <CheckCircle2 size={32} className="mb-2 opacity-20 text-blue-500" />
                    <p className="font-bold text-xs italic">非現金結帳</p>
                    <p className="text-[9px] mt-1">系統將自動完成全額收款</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center scale-90 origin-right">
                <Keypad onInput={handleKeypadInput} onClear={() => focusField === 'cash' ? setCashReceived('') : (setDiscount('0'), setDiscountName(''))} onDelete={() => {
                  const s = focusField === 'cash' ? setCashReceived : setDiscount;
                  s(p => p.length > 0 ? p.slice(0, -1) : '0');
                }} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-6 py-4 rounded-xl font-bold text-slate-400 hover:bg-slate-50 border border-slate-100 transition-colors">取消返回</button>
            <button type="button" onClick={handleFinalConfirm} disabled={paymentMethod === 'Cash' && change < 0} className={`flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${paymentMethod === 'Cash' && change < 0 ? 'opacity-50 grayscale' : ''}`}>
              <Wallet size={20} /><span>4. 確認完成結帳</span>
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
        <div className="flex items-center gap-4 mb-6 text-red-500"><div className="bg-red-50 p-3 rounded-2xl"><AlertTriangle size={32} /></div><h3 className="text-2xl font-bold">訂單作廢確認</h3></div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {['點錯品項', '客人取消', '操作失誤', '食材不足'].map(r => (<button key={r} type="button" onClick={() => setReason(r)} className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all ${reason === r ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-slate-50 text-slate-500'}`}>{r}</button>))}
        </div>
        <textarea className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-red-500 font-medium mb-8 h-28 resize-none text-sm" placeholder="手動輸入原因..." value={reason} onChange={e => setReason(e.target.value)} />
        <div className="flex gap-4"><button type="button" onClick={onClose} className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50">返回</button><button type="button" disabled={!reason.trim()} onClick={() => onConfirm(reason)} className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg">確認作廢</button></div>
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
    if (auth.user === 'admin' && auth.pass === '1234') {
      setIsLoggedIn(true);
    } else {
      showAlert('登入失敗', '帳號或密碼錯誤。預設帳號為 admin，密碼為 1234。', 'danger');
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
          <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">密碼</label><input type="password" name="password" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" placeholder="1234" value={auth.pass} onChange={e => setAuth({ ...auth, pass: e.target.value })} /></div>
          <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 active:scale-95 shadow-lg transition-all">進入系統</button>
        </form>
      </div>
    </div>
  );
};

// --- 6. 側邊導覽列 ---
export const Sidebar = () => {
  const { config, setIsLoggedIn, showConfirm } = useContext(POSContext);
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
      <div className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto">
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
  const { menu, setOrders, orders, config, showConfirm } = useContext(POSContext);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dineIn');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const todayStr = new Date().toLocaleDateString();
  const categories = useMemo(() => ['全部', ...new Set(menu.map(i => i.category).filter(Boolean))], [menu]);
  const filtered = menu.filter(item => (selectedCategory === '全部' || item.category === selectedCategory) && item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const finalizeOrder = (data) => {
    const handleFinalize = () => {
      const pref = orderType === 'dineIn' ? 'D' : 'T';
      const c = orders.filter(o => o.date === todayStr && o.orderType === orderType).length;
      const orderNo = pref + (c + 1).toString().padStart(3, '0');
      const newO = { id: Date.now(), orderNo, total: data.total ?? cart.reduce((s, i) => s + (i.price * i.quantity), 0), items: [...cart], orderType, date: todayStr, time: new Date().toLocaleTimeString(), status: 'unclosed', isVoided: false, paymentStatus: (orderType === 'dineIn' && config.dineInMode === 'postPay' && !data.paymentMethod) ? 'pending' : 'paid', ...data };
      setOrders(prev => [...prev, newO]);
      setCart([]); setIsCheckoutModalOpen(false);
    };

    if (orderType === 'dineIn' && config.dineInMode === 'postPay' && !data.paymentMethod) {
      showConfirm('送出點餐', '確定要送出此筆點餐清單並記錄為「待付款」嗎？', handleFinalize);
    } else {
      handleFinalize();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full overflow-hidden text-slate-900">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-2xl font-bold">點餐收銀</h2>
          <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="搜尋..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium" /></div>
        </div>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 shrink-0 scrollbar-hide">{categories.map(c => (<button key={c} type="button" onClick={() => setSelectedCategory(c)} className={`px-6 py-2 rounded-full whitespace-nowrap font-bold text-sm border transition-all ${selectedCategory === c ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border-slate-100'}`}>{c}</button>))}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto pr-2 flex-1 pb-10 scrollbar-thin content-start">
          {filtered.map(item => (
            <button key={item.id} type="button" onClick={() => { if (!item.isAvailable) return; setCart(prev => getUpdatedCart(prev, item)) }} className={`p-6 rounded-[2rem] shadow-sm border text-left group h-fit relative overflow-hidden transition-all ${item.isAvailable ? 'bg-white border-slate-100 hover:border-blue-500 hover:shadow-md' : 'bg-slate-50 opacity-60 grayscale'}`}>
              <div className="font-bold mb-1 truncate group-hover:text-blue-600 transition-colors">{item.name}</div><div className="font-black text-xl text-blue-600">${item.price}</div>
              {!item.isAvailable && <div className="absolute inset-0 bg-slate-900/5 flex items-center justify-center"><span className="bg-slate-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest shadow-sm">暫不供應</span></div>}
            </button>
          ))}
        </div>
      </div>
      <div className="w-full lg:w-96 flex-shrink-0 bg-white rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-50 h-full overflow-hidden">
        <div className="p-8 border-b flex flex-col gap-4 bg-slate-50/50 shrink-0">
          <div className="flex justify-between items-center"><h3 className="font-bold text-xl">購物車</h3><span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md shadow-blue-100">{cart.reduce((s, i) => s + i.quantity, 0)} 件</span></div>
          <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-inner font-bold">
            <button type="button" onClick={() => setOrderType('dineIn')} className={`flex items-center justify-center py-2.5 rounded-xl text-sm transition-all ${orderType === 'dineIn' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Utensils size={16} className="mr-2" />內用</button>
            <button type="button" onClick={() => setOrderType('takeOut')} className={`flex items-center justify-center py-2.5 rounded-xl text-sm transition-all ${orderType === 'takeOut' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><ShoppingBag size={16} className="mr-2" />外帶</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {cart.map(i => (
            <div key={i.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-3"><span className="font-bold text-slate-700 text-sm">{i.name}</span><span className="font-black text-slate-900 text-sm">${i.price * i.quantity}</span></div>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-inner">
                  <button type="button" onClick={() => { const nQty = Math.max(0, i.quantity - 1); if (nQty > 0) setCart(cart.map(it => it.id === i.id ? { ...it, quantity: nQty } : it)); else setCart(cart.filter(it => it.id !== i.id)); }} className="p-2.5 hover:bg-slate-200 transition-colors text-slate-500"><Minus size={14} /></button>
                  <span className="w-10 text-center font-bold text-sm text-slate-700">{i.quantity}</span>
                  <button type="button" onClick={() => setCart(cart.map(it => it.id === i.id ? { ...it, quantity: it.quantity + 1 } : it))} className="p-2.5 hover:bg-slate-200 transition-colors text-slate-500"><Plus size={14} /></button>
                </div>
                <button type="button" onClick={() => setCart(cart.filter(it => it.id !== i.id))} className="text-red-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60"><ShoppingCart size={64} className="mb-4 opacity-20" /><p className="text-sm font-medium">尚未點餐</p></div>}
        </div>
        <div className="p-8 bg-slate-900 text-white rounded-b-[2.5rem] shrink-0">
          <div className="flex justify-between items-center mb-6"><span className="text-slate-400 font-medium">應付總計</span><span className="text-4xl font-black">${cart.reduce((s, i) => s + (i.price * i.quantity), 0)}</span></div>
          <button type="button" onClick={() => { if (cart.length > 0) { if (orderType === 'dineIn' && config.dineInMode === 'postPay') finalizeOrder({ total: cart.reduce((s, i) => s + (i.price * i.quantity), 0) }); else setIsCheckoutModalOpen(true); } }} disabled={cart.length === 0} className={`w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-xl ${orderType === 'dineIn' && config.dineInMode === 'postPay' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{orderType === 'dineIn' && config.dineInMode === 'postPay' ? '送出訂單 (待付款)' : '進行結帳確認'}</button>
        </div>
      </div>
      <CheckoutModal isOpen={isCheckoutModalOpen} onClose={() => setIsCheckoutModalOpen(false)} cartTotal={cart.reduce((s, i) => s + (i.price * i.quantity), 0)} items={cart} onConfirm={finalizeOrder} />
    </div>
  );
};

// --- 8. 頁面元件：訂單管理 ---
export const OrderManagementPage = () => {
  const { orders, setOrders } = useContext(POSContext);
  const [expandedId, setExpandedId] = useState(null);
  const [activePayOrder, setActivePayOrder] = useState(null);
  const [voidId, setVoidId] = useState(null);

  const pending = orders.filter(o => o.status === 'unclosed' && o.paymentStatus === 'pending' && !o.isVoided);
  const history = orders.filter(o => o.status === 'unclosed' && (o.paymentStatus === 'paid' || o.isVoided));

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
          <h3 className="text-xs font-black text-slate-400 uppercase mb-5 flex items-center gap-2 px-2"><CheckCircle2 size={16} className="text-blue-500" /> 已付款/作廢單 (未日結)</h3>
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
  const { orders, dailySummaries, setDailySummaries, setOrders, showAlert, showConfirm } = useContext(POSContext);
  const [expandOrderId, setExpandOrderId] = useState(null);
  const [expandSummaryId, setExpandSummaryId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const unclosedPaidOrders = useMemo(() =>
    orders.filter(o => o.status === 'unclosed' && o.paymentStatus === 'paid' && !o.isVoided),
    [orders]);

  const totalRevenue = unclosedPaidOrders.reduce((s, o) => s + o.total, 0);

  const handleDailyClosing = () => {
    const pendingOrders = orders.filter(o =>
      o.status === 'unclosed' &&
      o.paymentStatus === 'pending' &&
      !o.isVoided
    );

    if (pendingOrders.length > 0) {
      showAlert('無法執行日結', `目前還有 ${pendingOrders.length} 筆「待收款」單據未處理。`, 'danger');
      return;
    }

    showConfirm(
      '執行日結結算',
      '確定要結束今日班次嗎？結算後的訂單將會封存。',
      () => {
        const grouped = orders.filter(o => o.status === 'unclosed').reduce((acc, order) => {
          const date = order.date;
          if (!acc[date]) {
            acc[date] = { id: Date.now() + Math.random(), date, total: 0, orderCount: 0, voidedCount: 0, closedAt: new Date().toLocaleString(), itemSales: {}, typeCount: { dineIn: 0, takeOut: 0 }, relatedOrders: [] };
          }
          if (order.isVoided) acc[date].voidedCount += 1;
          else {
            acc[date].total += order.total;
            acc[date].orderCount += 1;
            acc[date].typeCount[order.orderType || 'dineIn'] += 1;
            order.items?.forEach(item => { acc[date].itemSales[item.name] = (acc[date].itemSales[item.name] || 0) + (item.quantity || 1); });
          }
          acc[date].relatedOrders.push(order);
          return acc;
        }, {});
        setDailySummaries([...dailySummaries, ...Object.values(grouped)]);
        setOrders(orders.map(o => o.status === 'unclosed' ? { ...o, status: 'closed' } : o));
        showAlert('日結完成', '今日數據已彙整成功。', 'success');
      }
    );
  };

  const renderItemDetails = (items) => (items || []).map((item, idx) => (
    <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <div className="flex flex-col"><span className="text-slate-700 font-medium text-sm">{item.name}</span><span className="text-[10px] text-slate-400 font-mono italic">單價 ${item.price} x {item.quantity || 1}</span></div>
      <span className="font-bold text-sm text-slate-900">${(item.price || 0) * (item.quantity || 1)}</span>
    </div>
  ));

  return (
    <div className="max-w-5xl h-full flex flex-col overflow-hidden text-slate-900">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 shrink-0">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-3xl text-white shadow-xl flex flex-col justify-between min-h-[220px]">
          <div><p className="opacity-70 text-sm font-bold uppercase tracking-widest mb-2">目前累計營收 (未日結)</p><h3 className="text-5xl font-black">${totalRevenue}</h3></div>
          <button type="button" onClick={handleDailyClosing} className="mt-6 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold border border-white/30"><CalendarCheck size={20} /><span>執行日結結帳</span></button>
        </div>
        <div className="bg-white p-10 rounded-3xl border border-slate-100 flex flex-col justify-center shadow-sm">
          <p className="text-sm font-bold uppercase tracking-widest mb-2 text-slate-400">當前支付分佈</p>
          <div className="space-y-2">
            {['Cash', 'Credit', 'Mobile'].map(pm => (<div key={pm} className="flex justify-between items-center text-sm"><span className="font-bold uppercase text-[10px] text-slate-400">{pm === 'Cash' ? '現金' : pm === 'Credit' ? '刷卡' : '支付'}</span><span className="font-black text-slate-700">${unclosedPaidOrders.filter(o => o.paymentMethod === pm).reduce((s, o) => s + o.total, 0)}</span></div>))}
          </div>
        </div>
      </div>
      <div className="flex space-x-4 mb-6 border-b border-slate-200 shrink-0">
        <button type="button" onClick={() => setShowHistory(false)} className={`pb-4 px-4 font-bold transition-all border-b-2 ${!showHistory ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>日報彙整</button>
        <button type="button" onClick={() => setShowHistory(true)} className={`pb-4 px-4 font-bold transition-all border-b-2 ${showHistory ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>交易明細 (未日結)</button>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 pb-10 scrollbar-thin">
        {!showHistory ? (
          <div className="space-y-4">
            {[...dailySummaries].reverse().map((summary) => (<div key={summary.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all"><div onClick={() => setExpandSummaryId(expandSummaryId === summary.id ? null : summary.id)} className={`p-6 flex items-center justify-between cursor-pointer ${expandSummaryId === summary.id ? 'bg-blue-50/50' : ''}`}><div className="flex items-center space-x-4"><div className="bg-green-100 text-green-600 p-3 rounded-xl"><FileText /></div><div><div className="font-bold text-lg text-slate-800">{summary.date} 彙整報表</div><div className="text-xs italic text-slate-400">結算：{summary.closedAt}</div></div></div><div className="flex items-center space-x-8"><div className="text-right"><div className="text-xs uppercase font-bold text-slate-400">總金額</div><div className="text-2xl font-black text-blue-600">${summary.total}</div></div>{expandSummaryId === summary.id ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}</div></div>
              {expandSummaryId === summary.id && (
                <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 animate-in fade-in space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h4 className="text-xs font-bold uppercase mb-4 flex items-center text-slate-400"><TrendingUp size={14} className="mr-2 text-blue-500" /> 銷量統計</h4><div className="space-y-2">{Object.entries(summary.itemSales || {}).map(([name, count]) => (<div key={name} className="flex justify-between items-center text-sm"><span className="text-slate-600">{name}</span><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{count}</span></div>))}</div></div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h4 className="text-xs font-bold uppercase mb-4 flex items-center text-orange-500"><Utensils size={14} className="mr-2 text-orange-500" /> 內外帶</h4><div className="space-y-4"><div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-600">內用</span><span className="font-black text-blue-600">{summary.typeCount?.dineIn || 0}</span></div><div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-600">外帶</span><span className="font-black text-orange-600">{summary.typeCount?.takeOut || 0}</span></div></div></div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center"><span className="text-xs uppercase font-bold block mb-1 text-slate-400">平均客單</span><span className="text-2xl font-black text-slate-900">${summary.orderCount > 0 ? (summary.total / summary.orderCount).toFixed(0) : 0}</span><span className="text-[10px] mt-2 italic text-slate-400">共計 {summary.orderCount} 筆</span></div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center"><span className="text-xs uppercase font-bold block mb-1 text-slate-400">異常統計</span><span className="text-2xl font-black text-red-500">{summary.voidedCount || 0}</span><span className="text-[10px] mt-2 italic text-slate-400">作廢訂單數</span></div></div><div className="border-t border-slate-200 pt-8"><h4 className="text-sm font-bold mb-4 flex items-center text-slate-900"><Receipt size={16} className="mr-2 text-blue-500" /> 原始訂單明細 (含作廢)</h4><div className="space-y-2">{(summary.relatedOrders || []).map((order) => { const isOrderExpand = expandOrderId === order.id; return (<div key={order.id} className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm ${order.isVoided ? 'opacity-40 grayscale' : ''}`}><div onClick={(e) => { e.stopPropagation(); setExpandOrderId(isOrderExpand ? null : order.id); }} className="flex items-center px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors"><div className="flex flex-col flex-1"><span className={`text-sm font-bold ${order.isVoided ? 'line-through text-red-400' : 'text-slate-700'}`}>號碼 #{order.orderNo || 'N/A'}</span><span className="text-[10px] text-slate-400">{order.time}</span></div><div className="flex-1">{order.isVoided ? <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">已作廢</span> : (order.orderType === 'takeOut' ? <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-1 rounded-md font-bold">外帶</span> : <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-1 rounded-md font-bold">內用</span>)}</div><div className="text-lg font-black mr-4 text-slate-800">${order.total}</div><ChevronRight className={`text-slate-300 transition-transform ${isOrderExpand ? 'rotate-90' : ''}`} size={16} /></div>{isOrderExpand && (<div className="px-10 py-4 bg-slate-50 border-t border-slate-100 animate-in fade-in">{renderItemDetails(order.items)}</div>)}</div>); })}</div></div></div>)}</div>))}</div>
        ) : (
          <div className="space-y-3">
            {orders.filter(o => o.status === 'unclosed').reverse().map(order => (<div key={order.id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${order.isVoided ? 'opacity-30' : 'border-blue-200 shadow-blue-50'}`}><div onClick={() => setExpandOrderId(expandOrderId === order.id ? null : order.id)} className="flex items-center px-6 py-5 cursor-pointer hover:bg-slate-50 transition-colors text-slate-900"><div className="flex-1"><div className="font-bold flex items-center text-slate-700">#{order.orderNo || 'N/A'} - {order.date} <span className={`ml-3 text-[10px] px-2 py-0.5 rounded font-bold ${order.isVoided ? 'bg-red-100 text-red-600' : order.orderType === 'takeOut' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{order.isVoided ? '已作廢' : order.orderType === 'takeOut' ? '外帶' : '內用'}</span></div><div className="text-xs font-mono italic text-slate-400">ID: {order.id} {order.isVoided && `| 原因: ${order.voidReason}`}</div></div><div className={`text-xl font-black mr-6 ${order.isVoided ? 'line-through text-slate-300' : 'text-blue-600'}`}>${order.total}</div><ChevronRight className={`text-slate-300 transition-transform ${expandOrderId === order.id ? 'rotate-90' : ''}`} /></div>{expandOrderId === order.id && <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 animate-in fade-in"><div className="space-y-2">{renderItemDetails(order.items)}</div><div className="mt-4 pt-4 border-t flex justify-between font-black"><span>應付總額</span><span className={order.isVoided ? 'line-through text-slate-300' : 'text-blue-600'}>${order.total}</span></div></div>}</div>))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 11. 頁面元件：原始數據檢視 ---
export const DatabaseViewPage = () => {
  const { orders, showAlert } = useContext(POSContext);
  const [search, setSearch] = useState('');
  const [viewJson, setViewJson] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

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

  return (
    <div className="max-w-full h-full flex flex-col overflow-hidden text-slate-900 px-2">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div><h2 className="text-2xl font-black flex items-center gap-2"><Database className="text-blue-600" /> 原始數據檢視</h2><p className="text-xs text-slate-400 mt-1">開發者專用：支援分頁與 JSON 導出</p></div>
        <div className="flex gap-2">
          <div className="relative w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="搜尋、日期、ID或商品名..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm" /></div>
          <button onClick={() => copyToClipboard(orders)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800"><Copy size={14} /> 導出全部</button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col mb-4">
        <div className="overflow-x-auto flex-1 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-black text-slate-400 w-12 text-center">#</th>
                <th className="p-4 font-black text-slate-400">OrderNo</th>
                <th className="p-4 font-black text-slate-400">Date/Time</th>
                <th className="p-4 font-black text-slate-400">Status</th>
                <th className="p-4 font-black text-slate-400 text-right">Total</th>
                <th className="p-4 font-black text-slate-400 text-center">Payment</th>
                <th className="p-4 font-black text-slate-400 text-right">JSON</th>
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
                    <td className={`p-4 text-right font-black ${o.isVoided ? 'text-slate-300 line-through' : 'text-slate-900'}`}>${o.total}</td>
                    <td className="p-4 text-center"><span className={`font-black text-[9px] px-2 py-0.5 rounded ${o.isVoided ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>{o.isVoided ? 'VOID' : (o.paymentMethod || 'PAY')}</span></td>
                    <td className="p-4 text-right"><button onClick={(e) => { e.stopPropagation(); setViewJson(o); }} className="p-1.5 text-slate-300 hover:text-blue-500"><Code size={14} /></button></td>
                  </tr>
                  {expandedId === o.id && (
                    <tr className="bg-blue-50/20">
                      <td colSpan="8" className="p-0 border-b border-blue-100">
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
                                      <td className="p-2 text-right text-slate-400">${item.price}</td>
                                      <td className="p-2 text-center font-bold text-slate-500">x{item.quantity}</td>
                                      <td className="p-2 text-right font-black text-slate-700">${item.price * item.quantity}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-blue-50/30 font-black">
                                  <tr>
                                    <td colSpan="3" className="p-2 text-right text-blue-600">應收總額</td>
                                    <td className="p-2 text-right text-blue-600 text-sm">${o.total}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                          {/* 右側：元數據摘要 */}
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mb-2">
                              <ListFilter size={12} /> 系統元數據 (Meta)
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
                                      <td className="p-2 text-right text-slate-400">${item.price}</td>
                                      <td className="p-2 text-center font-bold text-slate-500">x{item.quantity}</td>
                                      <td className="p-2 text-right font-black text-slate-700">${item.price * item.quantity}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-blue-50/30 font-black">
                                  <tr>
                                    <td colSpan="3" className="p-2 text-right text-blue-600">應收總額</td>
                                    <td className="p-2 text-right text-blue-600 text-sm">${o.total}</td>
                                  </tr>
                                </tfoot>
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
                              <div className="bg-white p-3 rounded-xl border border-slate-100 col-span-2">
                                <p className="text-slate-400 font-bold mb-1">折扣資訊</p>
                                <p className="text-slate-600 font-medium">
                                  {o.discountName ? `${o.discountName} (-$${o.discount})` : '無套用優惠'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase">每頁顯示</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[10, 25, 50, 100].map(val => <option key={val} value={val}>{val}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all"><ChevronsLeft size={16} /></button>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all"><ChevronLeft size={16} /></button>
              <div className="flex items-center px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black min-w-[80px] justify-center">
                <span className="text-blue-600">{currentPage}</span><span className="mx-2 text-slate-300">/</span><span className="text-slate-500">{totalPages || 1}</span>
              </div>
              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all"><ChevronRight size={16} /></button>
              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(totalPages)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all"><ChevronsRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {viewJson && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50"><h3 className="font-black text-lg">原始 JSON - #{viewJson.orderNo}</h3><button onClick={() => setViewJson(null)} className="p-2 hover:bg-red-100 text-red-500 rounded-xl"><X size={20} /></button></div>
            <div className="flex-1 overflow-auto p-6 bg-slate-900"><pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">{JSON.stringify(viewJson, null, 2)}</pre></div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 12. 系統設定 ---
export const SettingsPage = () => {
  const { config, setConfig, showAlert } = useContext(POSContext);
  const [isEdit, setIsEdit] = useState(false);
  const [temp, setTemp] = useState(config.storeName);
  const handleSave = () => { setConfig(p => ({ ...p, storeName: temp })); setIsEdit(false); showAlert('儲存成功', 'success'); };
  return (
    <div className="max-w-2xl h-full flex flex-col pb-32 text-slate-900">
      <h2 className="text-2xl font-black text-slate-800 mb-8 px-2">系統參數設定</h2>
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 space-y-10">
        <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-3 text-blue-600 mb-2"><AlertCircle size={20} /><span className="text-sm font-bold">提醒：在此更改的所有設定將立即生效。</span></div>
        <section>
          <div className="flex justify-between items-center mb-4 text-slate-400 px-1"><label className="text-xs font-black uppercase tracking-widest">店舖名稱</label>
            {!isEdit ? <button type="button" onClick={() => { setIsEdit(true); setTemp(config?.storeName) }} className="text-blue-600 text-xs font-bold flex items-center gap-1.5 hover:underline"><Edit2 size={12} /> 修改店名</button>
              : <div className="flex gap-5"><button type="button" onClick={handleSave} className="text-green-600 text-xs font-black flex items-center gap-1.5"><Save size={14} /> 儲存</button><button type="button" onClick={() => setIsEdit(false)} className="text-slate-400 text-xs font-bold">取消</button></div>
            }
          </div>
          <div className={`transition-all rounded-2xl ${isEdit ? 'ring-4 ring-blue-50 border-blue-500 shadow-lg' : 'border-slate-100'}`}><input type="text" disabled={!isEdit} className={`w-full px-6 py-4 border rounded-2xl outline-none font-black text-xl transition-all ${!isEdit ? 'bg-slate-50 text-slate-500 border-transparent cursor-not-allowed' : 'bg-white text-slate-900 border-blue-500'}`} value={temp} onChange={e => setTemp(e.target.value)} /></div>
        </section>
        <hr className="border-slate-100" />
        <section><div className="flex justify-between items-center mb-6 px-1"><div><h4 className="font-bold text-lg text-slate-700">內用結帳流程</h4><p className="text-xs text-slate-400 mt-0.5">決定點餐後是否需立
          即完成付款</p></div><div className="bg-slate-100 p-1.5 rounded-2xl flex shadow-inner"><button type="button" onClick={() => setConfig(p => ({ ...p, dineInMode: 'prePay' }))} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${config.dineInMode === 'prePay' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>先結帳</button><button type="button" onClick={() => setConfig(p => ({ ...p, dineInMode: 'postPay' }))} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${config.dineInMode === 'postPay' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>後結帳</button></div></div></section>
        <hr className="border-slate-100" />
        <section className="space-y-6"><h4 className="font-bold text-lg text-slate-700 flex items-center gap-2 px-1"><ShieldCheck size={20} className="text-blue-500" /> 收款管道設定</h4>
          <div className="space-y-3">
            {[
              { id: 'enableCreditCard', label: '信用卡支付系統', desc: '啟用後結帳畫面將出現刷卡選項', icon: CreditCard },
              { id: 'enableMobilePayment', label: '行動支付 (Apple/Line)', desc: '支援感應支付與條碼掃描付款', icon: Smartphone }
            ].map(opt => (
              <div key={opt.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100/60 shadow-sm transition-all hover:bg-slate-100/40">
                <div className="flex items-center gap-4 text-slate-400"><div className="p-2.5 bg-white rounded-xl shadow-sm text-blue-500"><opt.icon size={22} /></div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{opt.label}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{opt.desc}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setConfig(p => ({ ...p, [opt.id]: !p[opt.id] }))} className={`w-16 h-8 rounded-full relative transition-all duration-300 ${config[opt.id] ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${config[opt.id] ? 'left-9' : 'left-1.5'} shadow-sm`}></div></button>
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
  <div className="flex min-h-screen bg-slate-50 text-slate-900">
    <Sidebar />
    <main className="flex-1 ml-64 p-10 h-screen overflow-y-auto relative">
      <Routes>
        <Route path="/pos" element={<POSPage />} />
        <Route path="/orders" element={<OrderManagementPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/database" element={<DatabaseViewPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/pos" />} />
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