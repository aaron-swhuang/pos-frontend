import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Settings, LogOut, Plus, Minus, Trash2,
  Store, User, FileText, ChevronDown, ChevronUp, ChevronRight, Utensils, ShoppingBag,
  Clock, Search, Tag, Edit2, X, CheckCircle2, AlertCircle,
  ClipboardList, Wallet, Banknote, CreditCard, Smartphone,
  Delete, ShieldCheck, RotateCcw, AlertTriangle, Save, Ticket, Eye, EyeOff,
  CalendarCheck, TrendingUp, Receipt
} from 'lucide-react';

//import { calculateFinalTotal, calculateChange, getUpdatedCart } from './utils/posLogic';

// --- 1. 全域資料管理中心 ---
const POSContext = createContext();
const getTodayKey = () => new Date().toLocaleDateString();

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
      discountRules, setDiscountRules, isLoggedIn, setIsLoggedIn, config, setConfig
    }}>{children}</POSContext.Provider>
  );
};

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

// --- 3. 結帳確認視窗 (步驟 1-2-3-4 & 動態隱藏支付選項) ---
const CheckoutModal = ({ isOpen, onClose, cartTotal, items, onConfirm }) => {
  const { config, discountRules } = useContext(POSContext);
  const [discount, setDiscount] = useState('0');
  const [discountName, setDiscountName] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [focusField, setFocusField] = useState('cash');

  if (!isOpen) return null;

  const numDiscount = parseFloat(discount) || 0;
  const numCash = parseFloat(cashReceived) || 0;
  const finalTotal = Math.max(0, cartTotal - numDiscount);
  const change = numCash - finalTotal;

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

  // 根據設定過濾要顯示的支付選項
  const options = [
    { id: 'Cash', label: '現金', icon: <Banknote size={18} />, enabled: true },
    { id: 'Credit', label: '刷卡', icon: <CreditCard size={18} />, enabled: config.enableCreditCard },
    { id: 'Mobile', label: '支付', icon: <Smartphone size={18} />, enabled: config.enableMobilePayment }
  ].filter(opt => opt.enabled);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-800">
      <div className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden max-h-[92vh]">
        <div className="lg:w-[32%] bg-slate-50 p-5 border-r border-slate-200 flex flex-col justify-between overflow-hidden text-slate-800">
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
                    const val = cartTotal - (rule.type === 'percentage' ? Math.round(cartTotal * rule.value) : rule.value);
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
                      <div className="flex items-center justify-between text-slate-800 font-black"><span className="text-lg text-slate-300">$</span><span className="text-3xl">{cashReceived || '0'}</span></div>
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
                    <p className="text-[9px] mt-1 text-slate-400">系統將自動完成全額收款</p>
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
const VoidReasonModal = ({ isOpen, onClose, onConfirm }) => {
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

// --- 5. 登入頁面 ---
const LoginPage = () => {
  const { setIsLoggedIn } = useContext(POSContext);
  const [auth, setAuth] = useState({ user: '', pass: '' });
  const handleLogin = (e) => {
    e.preventDefault();
    if (auth.user === 'admin' && auth.pass === '1234') setIsLoggedIn(true);
    else alert('預設帳號 admin / 密碼 1234');
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-12 text-center text-white"><div className="inline-flex p-4 bg-blue-600 rounded-2xl mb-4 text-white"><User size={32} /></div><h2 className="text-3xl font-bold">POS 系統登入</h2></div>
        <form onSubmit={handleLogin} className="p-10 space-y-6">
          <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">帳號</label><input className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" placeholder="admin" value={auth.user} onChange={e => setAuth({ ...auth, user: e.target.value })} /></div>
          <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">密碼</label><input type="password" name="password" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" placeholder="1234" value={auth.pass} onChange={e => setAuth({ ...auth, pass: e.target.value })} /></div>
          <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 active:scale-95 shadow-lg">進入系統</button>
        </form>
      </div>
    </div>
  );
};

// --- 6. 側邊導覽列 ---
const Sidebar = () => {
  const { config, setIsLoggedIn } = useContext(POSContext);
  const location = useLocation();
  const navItems = [
    { path: '/pos', label: '櫃檯收銀', icon: ShoppingCart },
    { path: '/orders', label: '訂單管理', icon: ClipboardList },
    { path: '/admin', label: '店務管理', icon: Edit2 },
    { path: '/dashboard', label: '報表分析', icon: LayoutDashboard },
    { path: '/settings', label: '系統設定', icon: Settings },
  ];
  return (
    <div className="w-64 h-screen bg-slate-900 text-white fixed left-0 top-0 flex flex-col border-r border-slate-800">
      <div className="p-8 flex items-center space-x-3 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-900/50"><Store size={24} /></div>
        <span className="text-xl font-black uppercase truncate text-white">{config.storeName}</span>
      </div>
      <div className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${location.pathname === item.path ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Icon size={20} /><span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <button onClick={() => setIsLoggedIn(false)} className="m-6 p-4 flex items-center space-x-3 text-slate-500 hover:text-red-400 border-t border-slate-800 transition-colors shrink-0 text-slate-500"><LogOut size={20} /><span className="font-bold">安全登出</span></button>
    </div>
  );
};

// --- 7. 前台收銀頁面 ---
const POSPage = () => {
  const { menu, setOrders, orders, config } = useContext(POSContext);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dineIn');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const todayStr = new Date().toLocaleDateString();
  const categories = useMemo(() => ['全部', ...new Set(menu.map(i => i.category).filter(Boolean))], [menu]);
  const filtered = menu.filter(item => (selectedCategory === '全部' || item.category === selectedCategory) && item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const finalizeOrder = (data) => {
    const pref = orderType === 'dineIn' ? 'D' : 'T';
    const c = orders.filter(o => o.date === todayStr && o.orderType === orderType).length;
    const orderNo = pref + (c + 1).toString().padStart(3, '0');
    const newO = { id: Date.now(), orderNo, total: data.total ?? cart.reduce((s, i) => s + (i.price * i.quantity), 0), items: [...cart], orderType, date: todayStr, time: new Date().toLocaleTimeString(), status: 'unclosed', paymentStatus: (orderType === 'dineIn' && config.dineInMode === 'postPay' && !data.paymentMethod) ? 'pending' : 'paid', ...data };
    setOrders(prev => [...prev, newO]);
    setCart([]); setIsCheckoutModalOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full overflow-hidden text-slate-900">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-4 text-slate-900"><h2 className="text-2xl font-bold">點餐收銀</h2></div>
          <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="搜尋..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium" /></div>
        </div>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 shrink-0 scrollbar-hide">{categories.map(c => (<button key={c} type="button" onClick={() => setSelectedCategory(c)} className={`px-6 py-2 rounded-full whitespace-nowrap font-bold text-sm border transition-all ${selectedCategory === c ? 'bg-blue-600 text-white shadow-md text-white' : 'bg-white text-slate-500 border-slate-100'}`}>{c}</button>))}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto pr-2 flex-1 pb-10 scrollbar-thin content-start">
          {filtered.map(item => (
            <button key={item.id} type="button" onClick={() => { if (!item.isAvailable) return; setCart(prev => { const ex = prev.find(i => i.id === item.id); return ex ? prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { ...item, quantity: 1 }] }) }} className={`p-6 rounded-[2rem] shadow-sm border text-left group h-fit relative overflow-hidden transition-all ${item.isAvailable ? 'bg-white border-slate-100 hover:border-blue-500 hover:shadow-md text-slate-800' : 'bg-slate-50 opacity-60 grayscale'}`}>
              <div className="font-bold mb-1 truncate text-slate-800 group-hover:text-blue-600 transition-colors">{item.name}</div><div className="font-black text-xl text-blue-600">${item.price}</div>
              {!item.isAvailable && <div className="absolute inset-0 bg-slate-900/5 flex items-center justify-center"><span className="bg-slate-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest shadow-sm">暫不供應</span></div>}
            </button>
          ))}
        </div>
      </div>
      <div className="w-full lg:w-96 flex-shrink-0 bg-white rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-50 h-full overflow-hidden text-slate-900">
        <div className="p-8 border-b flex flex-col gap-4 bg-slate-50/50 shrink-0">
          <div className="flex justify-between items-center text-slate-900"><h3 className="font-bold text-xl">購物車</h3><span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md shadow-blue-100">{cart.reduce((s, i) => s + i.quantity, 0)} 件</span></div>
          <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-inner font-bold">
            <button type="button" onClick={() => setOrderType('dineIn')} className={`flex items-center justify-center py-2.5 rounded-xl text-sm transition-all ${orderType === 'dineIn' ? 'bg-slate-900 text-white shadow-lg text-white' : 'text-slate-400 hover:bg-slate-50'}`}><Utensils size={16} className="mr-2" />內用</button>
            <button type="button" onClick={() => setOrderType('takeOut')} className={`flex items-center justify-center py-2.5 rounded-xl text-sm transition-all ${orderType === 'takeOut' ? 'bg-slate-900 text-white shadow-lg text-white' : 'text-slate-400 hover:bg-slate-50'}`}><ShoppingBag size={16} className="mr-2" />外帶</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {cart.map(i => (
            <div key={i.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-3 text-slate-900"><span className="font-bold text-slate-700 text-sm">{i.name}</span><span className="font-black text-slate-900 text-sm">${i.price * i.quantity}</span></div>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-inner">
                  <button type="button" onClick={() => { const nQty = Math.max(0, i.quantity - 1); if (nQty > 0) setCart(cart.map(it => it.id === i.id ? { ...it, quantity: nQty } : it)); else setCart(cart.filter(it => it.id !== i.id)); }} className="p-2.5 hover:bg-slate-200 transition-colors text-slate-500"><Minus size={14} /></button>
                  <span className="w-10 text-center font-bold text-sm text-slate-700">{i.quantity}</span>
                  <button type="button" onClick={() => setCart(cart.map(it => it.id === i.id ? { ...it, quantity: it.quantity + 1 } : it))} className="p-2.5 hover:bg-slate-200 transition-colors text-slate-500"><Plus size={14} /></button>
                </div>
                <button type="button" onClick={() => setCart(cart.filter(it => it.id !== i.id))} className="text-red-300 hover:text-red-500 p-2 transition-colors text-red-500"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60"><ShoppingCart size={64} className="mb-4 opacity-20 text-slate-300" /><p className="text-sm font-medium">尚未點餐</p></div>}
        </div>
        <div className="p-8 bg-slate-900 text-white rounded-b-[2.5rem] shrink-0">
          <div className="flex justify-between items-center mb-6"><span className="text-slate-400 font-medium">應付總計</span><span className="text-4xl font-black text-white">${cart.reduce((s, i) => s + (i.price * i.quantity), 0)}</span></div>
          <button type="button" onClick={() => { if (cart.length > 0) { if (orderType === 'dineIn' && config.dineInMode === 'postPay') finalizeOrder({ total: cart.reduce((s, i) => s + (i.price * i.quantity), 0) }); else setIsCheckoutModalOpen(true); } }} disabled={cart.length === 0} className={`w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-xl text-white ${orderType === 'dineIn' && config.dineInMode === 'postPay' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{orderType === 'dineIn' && config.dineInMode === 'postPay' ? '送出訂單 (未結帳)' : '進行結帳確認'}</button>
        </div>
      </div>
      <CheckoutModal isOpen={isCheckoutModalOpen} onClose={() => setIsCheckoutModalOpen(false)} cartTotal={cart.reduce((s, i) => s + (i.price * i.quantity), 0)} items={cart} onConfirm={finalizeOrder} />
    </div>
  );
};

// --- 8. 訂單管理 ---
const OrderManagementPage = () => {
  const { orders, setOrders } = useContext(POSContext);
  const [expandedId, setExpandedId] = useState(null);
  const [activePayOrder, setActivePayOrder] = useState(null);
  const [voidId, setVoidId] = useState(null);
  const today = getTodayKey();
  const pending = orders.filter(o => o.paymentStatus === 'pending' && o.status !== 'voided');
  const history = orders.filter(o => o.date === today && (o.paymentStatus === 'paid' || o.status === 'voided'));
  return (
    <div className="max-w-6xl h-full flex flex-col overflow-hidden text-slate-900">
      <div className="flex justify-between items-end mb-8 shrink-0 text-slate-900 text-slate-900">
        <div><h2 className="text-3xl font-black text-slate-800 text-slate-800">訂單管理</h2><p className="text-slate-400 mt-1">追蹤今日交易</p></div>
        <div className="flex gap-4 font-bold"><div className="bg-amber-50 px-8 py-4 rounded-3xl text-right border border-amber-100 shadow-sm text-amber-700"><p className="text-[10px] text-amber-500 uppercase font-black">今日待結</p><p className="text-2xl font-black">${pending.reduce((s, o) => s + o.total, 0)}</p></div><div className="bg-blue-50 px-8 py-4 rounded-3xl text-right border border-blue-100 shadow-sm text-blue-700"><p className="text-[10px] text-blue-500 uppercase font-black">今日已收</p><p className="text-2xl font-black">${history.filter(o => o.status !== 'voided').reduce((s, o) => s + o.total, 0)}</p></div></div>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-10 overflow-hidden text-slate-900">
        <div className="flex flex-col min-h-0"><h3 className="text-xs font-black text-slate-400 uppercase mb-5 flex items-center gap-2 px-2 text-slate-400 text-slate-400"><AlertCircle size={16} className="text-amber-500" /> 待收款 ({pending.length})</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pb-10 scrollbar-thin pr-2 text-slate-900 text-slate-900">
            {pending.map(o => (
              <div key={o.id} onClick={() => setExpandedId(expandedId === o.id ? null : o.id)} className={`bg-white p-6 rounded-[2rem] border transition-all cursor-pointer ${expandedId === o.id ? 'ring-2 ring-blue-500 shadow-xl border-transparent' : 'border-slate-100 hover:border-blue-200'}`}>
                <div className="flex justify-between items-center text-slate-900 text-slate-900 text-slate-900"><div><div className="flex items-center gap-2 mb-1.5 font-black text-xl text-slate-800 text-slate-800 text-slate-800">#{o.orderNo} <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-lg text-amber-700">待結</span></div><div className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12} />{o.time}</div></div>
                  <div className="flex items-center gap-4"><button type="button" onClick={(e) => { e.stopPropagation(); setVoidId(o.id) }} className="p-2 text-slate-300 hover:text-red-500 transition-colors text-slate-300"><RotateCcw size={20} /></button><div className="text-right mx-2 text-slate-900 text-slate-900"><p className="text-[10px] text-slate-400 uppercase font-bold text-slate-400">應收</p><p className="text-2xl font-black text-slate-800 text-slate-800">${o.total}</p></div><button type="button" onClick={(e) => { e.stopPropagation(); setActivePayOrder(o) }} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-blue-600 transition-all text-sm uppercase text-white">結帳</button></div>
                </div>
                {expandedId === o.id && <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-slate-900 text-slate-900 text-slate-900">{(o.items || []).map((it, idx) => (<div key={idx} className="flex justify-between text-sm text-slate-600 text-slate-600"><span>{it.name} x {it.quantity}</span><span className="font-bold text-slate-800 text-slate-800">${it.price * it.quantity}</span></div>))}</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col min-h-0 text-slate-900 text-slate-900 text-slate-900"><h3 className="text-xs font-black text-slate-400 uppercase mb-5 flex items-center gap-2 px-2 text-slate-400 text-slate-400"><CheckCircle2 size={16} className="text-blue-500" /> 已完成明細</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin text-slate-900 text-slate-900 text-slate-900 text-slate-900">
            {[...history].reverse().map(o => (
              <div key={o.id} onClick={() => setExpandedId(expandedId === o.id ? null : o.id)} className={`bg-white p-5 rounded-[1.5rem] border border-slate-100 transition-all cursor-pointer ${o.status === 'voided' ? 'opacity-40 grayscale bg-slate-50 border-dashed text-slate-900' : 'hover:bg-blue-50/30'}`}>
                <div className="flex justify-between items-center text-slate-900 text-slate-900 text-slate-900 text-slate-900 text-slate-900"><div className="flex items-center gap-4 text-slate-900 text-slate-900 text-slate-900"><div className={`p-2 rounded-xl ${o.status === 'voided' ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-500 text-blue-500 text-blue-500'}`}>{o.orderType === 'takeOut' ? <ShoppingBag size={22} /> : <Utensils size={22} />}</div><div><div className={`font-black text-base text-slate-800 text-slate-800 ${o.status === 'voided' ? 'line-through' : ''}`}>#{o.orderNo}</div><div className="text-[10px] text-slate-400 text-slate-400">{o.time}</div></div></div>
                  <div className="flex items-center gap-5">{o.status !== 'voided' && <button type="button" onClick={(e) => { e.stopPropagation(); setVoidId(o.id) }} className="p-2 text-slate-300 hover:text-red-500 transition-colors text-slate-300"><RotateCcw size={18} /></button>}<div className="text-right text-slate-900"><div className="text-xl font-black text-slate-800 text-slate-800">${o.total}</div><div className={`text-[10px] font-black uppercase tracking-tighter ${o.status === 'voided' ? 'text-red-500' : 'text-blue-400 text-blue-400'}`}>{o.status === 'voided' ? '已作廢' : o.paymentMethod}</div></div></div>
                </div>
                {expandedId === o.id && <div className="mt-5 pt-4 border-t border-slate-100 text-[10px] space-y-2 text-slate-900 text-slate-900 text-slate-900 text-slate-900">{o.status === 'voided' && <div className="bg-red-50 p-2.5 rounded-xl text-red-600 font-bold border border-red-100 flex items-center gap-2 text-red-600"><AlertTriangle size={12} />原因：{o.voidReason}</div>}{o.items?.map((it, idx) => (<div key={idx} className="flex justify-between px-1 text-slate-600 text-slate-600 text-slate-600"><span>{it.name} x {it.quantity}</span><span className="font-bold text-slate-900 text-slate-800 text-slate-800">${it.price * it.quantity}</span></div>))}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <CheckoutModal isOpen={!!activePayOrder} onClose={() => setActivePayOrder(null)} cartTotal={activePayOrder?.total || 0} items={activePayOrder?.items || []} onConfirm={(d) => { setOrders(prev => prev.map(o => o.id === activePayOrder.id ? { ...o, ...d, paymentStatus: 'paid' } : o)); setActivePayOrder(null); }} />
      <VoidReasonModal isOpen={!!voidId} onClose={() => setVoidId(null)} onConfirm={(r) => { setOrders(prev => prev.map(o => o.id === voidId ? { ...o, status: 'voided', voidReason: r } : o)); setVoidId(null); }} />
    </div>
  );
};

// --- 9. 店務管理 ---
const AdminPage = () => {
  const { menu, setMenu, discountRules, setDiscountRules } = useContext(POSContext);
  const [tab, setTab] = useState('menu');
  const [item, setItem] = useState({ name: '', price: '', category: '' });
  const [editId, setEditId] = useState(null);
  const [newDisc, setNewDisc] = useState({ name: '', type: 'percentage', value: '' });

  const handleMenuSubmit = (e) => {
    e.preventDefault(); if (!item.name || !item.price || !item.category) return;
    if (editId) { setMenu(menu.map(i => i.id === editId ? { ...i, ...item, price: parseFloat(item.price) } : i)); setEditId(null); }
    else setMenu([...menu, { id: Date.now(), ...item, price: parseFloat(item.price), isAvailable: true }]);
    setItem({ name: '', price: '', category: '' });
  };
  const handleDiscountSubmit = (e) => {
    e.preventDefault(); if (!newDisc.name || !newDisc.value) return;
    setDiscountRules([...(discountRules || []), { id: Date.now(), ...newDisc, value: parseFloat(newDisc.value) }]);
    setNewDisc({ name: '', type: 'percentage', value: '' });
  };

  return (
    <div className="max-w-4xl h-full flex flex-col overflow-hidden text-slate-800 text-slate-800 text-slate-800">
      <div className="flex justify-between items-center mb-6 shrink-0 text-slate-900 text-slate-900">
        <h2 className="text-2xl font-black text-slate-800 text-slate-800 text-slate-800">店務管理系統</h2>
        <div className="bg-slate-100 p-1 rounded-xl flex font-bold border border-slate-200">
          <button type="button" onClick={() => setTab('menu')} className={`px-8 py-2 rounded-lg text-sm transition-all ${tab === 'menu' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>菜單設定</button>
          <button type="button" onClick={() => setTab('discount')} className={`px-8 py-2 rounded-lg text-sm transition-all ${tab === 'discount' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>優惠方案</button>
        </div>
      </div>
      {tab === 'menu' ? (
        <>
          <form onSubmit={handleMenuSubmit} className={`bg-white p-6 rounded-3xl border mb-6 shrink-0 ${editId ? 'border-amber-400 ring-4 ring-amber-50 shadow-lg' : 'border-slate-100 shadow-sm'}`}>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-5"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block text-slate-400">名稱</label><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} /></div>
              <div className="col-span-3"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block text-slate-400">分類</label><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={item.category} onChange={e => setItem({ ...item, category: e.target.value })} /></div>
              <div className="col-span-2"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block text-slate-400 text-slate-400">單價</label><input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={item.price} onChange={e => setItem({ ...item, price: e.target.value })} /></div>
              <div className="col-span-2 flex items-end"><button type="submit" className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold active:scale-95 text-white">{editId ? '更新' : '新增'}</button></div>
            </div>
          </form>
          <div className="grid gap-3 overflow-y-auto flex-1 pr-2 pb-10 scrollbar-thin text-slate-900 text-slate-900">
            {menu.map(i => (
              <div key={i.id} className={`bg-white px-6 py-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm ${i.isAvailable ? '' : 'bg-slate-50 opacity-60'}`}>
                <div className="flex items-center gap-4 text-slate-900 text-slate-900"><div className="p-2 bg-slate-50 rounded-lg text-slate-300 text-slate-300"><Tag size={18} /></div><div><div className="font-bold text-slate-800 text-slate-800">{i.name}</div><div className="text-[10px] text-slate-400 uppercase text-slate-400">{i.category}</div></div></div>
                <div className="flex items-center gap-6 text-slate-900 text-slate-900"><span className="font-black text-xl text-blue-600 text-blue-600">${i.price}</span>
                  <div className="flex gap-2 border-l pl-6 border-slate-100 text-slate-400 text-slate-400">
                    <button type="button" onClick={() => setMenu(menu.map(m => m.id === i.id ? { ...m, isAvailable: !m.isAvailable } : m))} className="p-2">{i.isAvailable ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                    <button type="button" onClick={() => { setEditId(i.id); setItem({ name: i.name, price: i.price.toString(), category: i.category }); }} className="p-2"><Edit2 size={18} /></button>
                    <button type="button" onClick={() => setMenu(menu.filter(m => m.id !== i.id))} className="p-2 text-slate-300 text-slate-300 hover:text-red-500 text-slate-300"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <form onSubmit={handleDiscountSubmit} className="bg-white p-6 rounded-3xl border border-slate-100 mb-6 shrink-0 shadow-sm text-slate-800 text-slate-800 text-slate-800">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-5"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">名稱</label><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={newDisc.name} onChange={e => setNewDisc({ ...newDisc, name: e.target.value })} placeholder="例如：週年慶8折" /></div>
              <div className="col-span-3"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">類型</label><select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer" value={newDisc.type} onChange={e => setNewDisc({ ...newDisc, type: e.target.value })}><option value="percentage">折扣 (%)</option><option value="amount">折抵 ($)</option></select></div>
              <div className="col-span-2"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">數值</label><input type="number" step="0.01" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={newDisc.value} onChange={e => setNewDisc({ ...newDisc, value: e.target.value })} /></div>
              <div className="col-span-2 flex items-end"><button type="submit" className="w-full h-12 bg-blue-600 text-white rounded-xl font-bold shadow-lg active:scale-95 text-white">新增</button></div>
            </div>
          </form>
          <div className="grid gap-3 overflow-y-auto flex-1 pr-2 pb-10 scrollbar-thin text-slate-900 text-slate-900">
            {(discountRules || []).map(r => (
              <div key={r.id} className="bg-white px-6 py-4 rounded-2xl border border-slate-50 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4 text-slate-900 text-slate-900"><div className="p-2 bg-blue-50 rounded-lg text-blue-600 text-blue-600 text-blue-600"><Ticket size={18} /></div><div><div className="font-bold text-slate-800 text-slate-800">{r.name}</div><div className="text-[10px] text-slate-400 uppercase text-slate-400">{r.type === 'percentage' ? '比例' : '定額'}</div></div></div>
                <div className="flex items-center gap-6 text-slate-900 text-slate-900"><span className="font-black text-xl text-blue-600 text-blue-600">{r.type === 'percentage' ? `${Math.round(r.value * 100)}%` : `-$${r.value}`}</span><button type="button" onClick={() => setDiscountRules(discountRules.filter(it => it.id !== r.id))} className="p-2 text-slate-300 text-slate-300 hover:text-red-500 transition-colors text-slate-300"><Trash2 size={18} /></button></div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// --- 10. 報表分析 ---
const DashboardPage = () => {
  const { orders, dailySummaries, setDailySummaries, setOrders } = useContext(POSContext);
  const [expandOrderId, setExpandOrderId] = useState(null);
  const [expandSummaryId, setExpandSummaryId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const todayStr = new Date().toLocaleDateString();
  const todayActiveOrders = orders.filter(o => o.date === todayStr && o.status !== 'voided');
  const todayPaidOrders = todayActiveOrders.filter(o => o.paymentStatus === 'paid');
  const todayRevenue = todayPaidOrders.reduce((s, o) => s + o.total, 0);

  const handleDailyClosing = () => {
    const pendingCount = orders.filter(o => o.paymentStatus === 'pending' && o.status !== 'voided').length;
    if (pendingCount > 0) { alert(`還有 ${pendingCount} 筆待結訂單未處理，請先完成收款或作廢再執行日結。`); return; }
    if (!window.confirm("確定要執行日結嗎？")) return;
    const grouped = orders.filter(o => o.status === 'unclosed').reduce((acc, order) => {
      const date = order.date;
      if (!acc[date]) { acc[date] = { id: Date.now() + Math.random(), date, total: 0, orderCount: 0, closedAt: new Date().toLocaleString(), itemSales: {}, typeCount: { dineIn: 0, takeOut: 0 }, relatedOrderIds: [] }; }
      if (order.status !== 'voided') {
        acc[date].total += order.total;
        acc[date].orderCount += 1;
        acc[date].typeCount[order.orderType || 'dineIn'] += 1;
        order.items.forEach(item => { acc[date].itemSales[item.name] = (acc[date].itemSales[item.name] || 0) + (item.quantity || 1); });
      }
      acc[date].relatedOrderIds.push(order.id); return acc;
    }, {});
    setDailySummaries([...dailySummaries, ...Object.values(grouped)]);
    setOrders(orders.map(o => ({ ...o, status: 'closed' }))); alert("日結作業完成！");
  };

  const renderItemDetails = (items) => (items || []).map((item, idx) => (
    <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-slate-900 text-slate-900">
      <div className="flex flex-col text-slate-900"><span className="text-slate-700 font-medium text-sm text-slate-700">{item.name}</span><span className="text-[10px] text-slate-400 font-mono italic text-slate-400">單價 ${item.price} x {item.quantity || 1}</span></div>
      <span className="font-bold text-sm text-slate-900 text-slate-900">${(item.price || 0) * (item.quantity || 1)}</span>
    </div>
  ));

  return (
    <div className="max-w-5xl h-full flex flex-col overflow-hidden text-slate-900 text-slate-900">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 shrink-0 text-slate-900 text-slate-900">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-3xl text-white shadow-xl flex flex-col justify-between min-h-[220px]">
          <div><p className="opacity-70 text-sm font-bold uppercase tracking-widest mb-2 text-white/80">今日營收 (排除作廢)</p><h3 className="text-5xl font-black text-white text-white">${todayRevenue}</h3></div>
          <button type="button" onClick={handleDailyClosing} className="mt-6 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold border border-white/30 text-white text-white"><CalendarCheck size={20} /><span>執行日結結帳</span></button>
        </div>
        <div className="bg-white p-10 rounded-3xl border border-slate-100 flex flex-col justify-center shadow-sm text-slate-900 text-slate-900">
          <p className="text-sm font-bold uppercase tracking-widest mb-2 text-slate-400 text-slate-400">今日支付分佈</p>
          <div className="space-y-2 text-slate-900 text-slate-900">
            {['Cash', 'Credit', 'Mobile'].map(pm => (<div key={pm} className="flex justify-between items-center text-sm text-slate-900 text-slate-900"><span className="font-bold uppercase text-[10px] text-slate-400 text-slate-400">{pm === 'Cash' ? '現金' : pm === 'Credit' ? '刷卡' : '行動支付'}</span><span className="font-black text-slate-700 text-slate-700">${todayPaidOrders.filter(o => o.paymentMethod === pm).reduce((s, o) => s + o.total, 0)}</span></div>))}
          </div>
        </div>
      </div>
      <div className="flex space-x-4 mb-6 border-b border-slate-200 shrink-0 text-slate-900 text-slate-900">
        <button type="button" onClick={() => setShowHistory(false)} className={`pb-4 px-4 font-bold transition-all border-b-2 ${!showHistory ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>日報彙整</button>
        <button type="button" onClick={() => setShowHistory(true)} className={`pb-4 px-4 font-bold transition-all border-b-2 ${showHistory ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>交易明細</button>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 pb-10 scrollbar-thin text-slate-900 text-slate-900">
        {!showHistory ? (
          <div className="space-y-4 text-slate-900 text-slate-900">
            {[...dailySummaries].reverse().map((summary) => {
              const summaryOrders = orders.filter(o => (summary.relatedOrderIds || []).includes(o.id));
              return (
                <div key={summary.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all text-slate-900 text-slate-900">
                  <div onClick={() => setExpandSummaryId(expandSummaryId === summary.id ? null : summary.id)} className={`p-6 flex items-center justify-between cursor-pointer ${expandSummaryId === summary.id ? 'bg-blue-50/50' : ''}`}>
                    <div className="flex items-center space-x-4 text-slate-900 text-slate-900"><div className="bg-green-100 text-green-600 p-3 rounded-xl text-green-600 text-green-600"><FileText /></div><div><div className="font-bold text-lg text-slate-800 text-slate-800">{summary.date} 彙整報表</div><div className="text-xs italic text-slate-400 text-slate-400">結帳：{summary.closedAt}</div></div></div>
                    <div className="flex items-center space-x-8 text-slate-900 text-slate-900"><div className="text-right text-slate-900 text-slate-900"><div className="text-xs uppercase font-bold text-slate-400 text-slate-400">總營收</div><div className="text-2xl font-black text-blue-600 text-blue-600">${summary.total}</div></div>{expandSummaryId === summary.id ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}</div>
                  </div>
                  {expandSummaryId === summary.id && (
                    <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 animate-in fade-in space-y-8 text-slate-900 text-slate-900">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-900 text-slate-900">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-slate-900 text-slate-900"><h4 className="text-xs font-bold uppercase mb-4 flex items-center text-slate-400 text-slate-400"><TrendingUp size={14} className="mr-2 text-blue-500" /> 銷量統計</h4><div className="space-y-2 text-slate-900 text-slate-900">{Object.entries(summary.itemSales || {}).map(([name, count]) => (<div key={name} className="flex justify-between items-center text-sm text-slate-900 text-slate-900"><span className="text-slate-600 text-slate-600">{name}</span><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold text-blue-600">{count}</span></div>))}</div></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-slate-900 text-slate-900"><h4 className="text-xs font-bold uppercase mb-4 flex items-center text-slate-400 text-orange-500 text-slate-400 text-orange-500 text-orange-500"><Utensils size={14} className="mr-2 text-orange-500" /> 比例</h4><div className="space-y-4 text-slate-900 text-slate-900"><div className="flex justify-between items-center text-slate-900 text-slate-900"><span className="text-sm font-bold text-slate-600 text-slate-600">內用</span><span className="font-black text-blue-600 text-blue-600">{summary.typeCount?.dineIn || 0}</span></div><div className="flex justify-between items-center text-slate-900 text-slate-900"><span className="text-sm font-bold text-slate-600 text-slate-600">外帶</span><span className="font-black text-orange-600 text-orange-600">{summary.typeCount?.takeOut || 0}</span></div></div></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-slate-900 text-slate-900"><span className="text-xs uppercase font-bold block mb-1 text-slate-400 text-slate-400">平均客單</span><span className="text-3xl font-black text-slate-900 text-slate-900">${summary.orderCount > 0 ? (summary.total / summary.orderCount).toFixed(0) : 0}</span><span className="text-xs mt-2 italic text-slate-400 text-slate-400">共計 {summary.orderCount} 筆</span></div>
                      </div>
                      <div className="border-t border-slate-200 pt-8 text-slate-900 text-slate-900"><h4 className="text-sm font-bold mb-4 flex items-center text-slate-900 text-slate-900"><Receipt size={16} className="mr-2 text-blue-500 text-blue-500" /> 原始訂單明細</h4><div className="space-y-2 text-slate-900 text-slate-900">{summaryOrders.map((order) => { const isOrderExpand = expandOrderId === order.id; return (<div key={order.id} className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm text-slate-900 text-slate-900 ${order.status === 'voided' ? 'opacity-40 grayscale' : ''}`}><div onClick={(e) => { e.stopPropagation(); setExpandOrderId(isOrderExpand ? null : order.id); }} className="flex items-center px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors text-slate-900 text-slate-900"><div className="flex flex-col flex-1 text-slate-900 text-slate-900"><span className={`text-sm font-bold ${order.status === 'voided' ? 'line-through text-red-400' : 'text-slate-700'}`}>號碼 #{order.orderNo || 'N/A'}</span><span className="text-[10px] text-slate-400 text-slate-400">{order.time}</span></div><div className="flex-1 text-slate-900 text-slate-900">{order.status === 'voided' ? <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter text-red-500">已作廢 ({order.voidReason})</span> : (order.orderType === 'takeOut' ? <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-1 rounded-md font-bold text-orange-600 text-orange-600">外帶</span> : <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-1 rounded-md font-bold text-blue-600 text-blue-600">內用</span>)}</div><div className="text-lg font-black mr-4 text-slate-800 text-slate-800">${order.total}</div><ChevronRight className={`text-slate-300 transition-transform ${isOrderExpand ? 'rotate-90' : ''}`} size={16} /></div>{isOrderExpand && (<div className="px-10 py-4 bg-slate-50 border-t border-slate-100 animate-in fade-in text-slate-900 text-slate-900">{renderItemDetails(order.items)}</div>)}</div>); })}</div></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3 text-slate-900 text-slate-900">
            {[...orders].reverse().map(order => {
              const isExpand = expandOrderId === order.id;
              return (
                <div key={order.id} className={`bg-white rounded-2xl border overflow-hidden transition-all text-slate-900 text-slate-900 ${order.status === 'voided' ? 'opacity-30' : order.status === 'closed' ? 'border-slate-100 opacity-70' : 'border-blue-200 shadow-blue-50'}`}>
                  <div onClick={() => setExpandOrderId(isExpand ? null : order.id)} className="flex items-center px-6 py-5 cursor-pointer hover:bg-slate-50 transition-colors text-slate-900 text-slate-900">
                    <div className="flex-1 text-slate-900 text-slate-900"><div className="font-bold flex items-center text-slate-700 text-slate-700">#{order.orderNo || 'N/A'} - {order.date} <span className={`ml-3 text-[10px] px-2 py-0.5 rounded font-bold ${order.status === 'voided' ? 'bg-red-100 text-red-600' : order.orderType === 'takeOut' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{order.status === 'voided' ? '已作廢' : order.orderType === 'takeOut' ? '外帶' : '內用'}</span>
                      {order.paymentStatus === 'pending' && order.status !== 'voided' && <span className="ml-2 text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded font-bold italic text-amber-600">待結帳</span>}
                    </div><div className="text-xs font-mono italic text-slate-400 text-slate-400">ID: {order.id} {order.status === 'voided' && `| 原因: ${order.voidReason}`}</div></div>
                    <div className={`text-xl font-black mr-6 ${order.status === 'voided' ? 'line-through text-slate-300' : 'text-blue-600 text-blue-600'}`}>${order.total}</div><ChevronRight className={`text-slate-300 transition-transform ${isExpand ? 'rotate-90' : ''}`} />
                  </div>
                  {isExpand && <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 animate-in fade-in text-slate-900 text-slate-900"><div className="space-y-2 text-slate-900 text-slate-900">{renderItemDetails(order.items)}</div><div className="mt-4 pt-4 border-t flex justify-between font-black text-slate-900 text-slate-900"><span>總計金額</span><span className={order.status === 'voided' ? 'line-through text-slate-300' : 'text-blue-600 text-blue-600'}>${order.total}</span></div></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 11. 系統設定 (提醒置頂) ---
const SettingsPage = () => {
  const { config, setConfig } = useContext(POSContext);
  const [isEdit, setIsEdit] = useState(false);
  const [temp, setTemp] = useState(config.storeName);
  const handleSave = () => { setConfig(p => ({ ...p, storeName: temp })); setIsEdit(false); };
  return (
    <div className="max-w-2xl h-full flex flex-col overflow-hidden text-slate-900 text-slate-900">
      <h2 className="text-2xl font-black text-slate-800 mb-8 px-2 text-slate-800">系統參數設定</h2>
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 space-y-10 text-slate-900 text-slate-900">
        <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-3 text-blue-600 mb-2 text-blue-600"><AlertCircle size={20} /><span className="text-sm font-bold text-blue-600">提醒：在此更改的所有設定將立即生效。</span></div>
        <section>
          <div className="flex justify-between items-center mb-4 text-slate-400 px-1 text-slate-400"><label className="text-xs font-black uppercase tracking-widest text-slate-400">店舖名稱</label>
            {!isEdit ? <button type="button" onClick={() => { setIsEdit(true); setTemp(config.storeName) }} className="text-blue-600 text-xs font-bold flex items-center gap-1.5 hover:underline text-blue-600"><Edit2 size={12} /> 修改店名</button>
              : <div className="flex gap-5 text-slate-900 text-slate-900"><button type="button" onClick={handleSave} className="text-green-600 text-xs font-black flex items-center gap-1.5 text-green-600"><Save size={14} /> 儲存</button><button type="button" onClick={() => setIsEdit(false)} className="text-slate-400 text-xs font-bold text-slate-400 text-slate-400">取消</button></div>}
          </div>
          <div className={`transition-all rounded-2xl ${isEdit ? 'ring-4 ring-blue-50 border-blue-500 shadow-lg text-blue-500' : 'border-slate-100'}`}><input type="text" disabled={!isEdit} className={`w-full px-6 py-4 border rounded-2xl outline-none font-black text-xl transition-all ${!isEdit ? 'bg-slate-50 text-slate-500 border-transparent cursor-not-allowed text-slate-500' : 'bg-white text-slate-900 border-blue-500 text-slate-900'}`} value={temp} onChange={e => setTemp(e.target.value)} /></div>
        </section>
        <hr className="border-slate-100" />
        <section><div className="flex justify-between items-center mb-6 px-1 text-slate-900 text-slate-900 text-slate-900"><div><h4 className="font-bold text-lg text-slate-700 text-slate-700">內用結帳流程</h4><p className="text-xs text-slate-400 mt-0.5 text-slate-400">決定點餐後是否需立即完成付款</p></div><div className="bg-slate-100 p-1.5 rounded-2xl flex text-slate-900 shadow-inner text-slate-900 text-slate-900"><button type="button" onClick={() => setConfig(p => ({ ...p, dineInMode: 'prePay' }))} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${config.dineInMode === 'prePay' ? 'bg-white text-blue-600 shadow-md text-blue-600' : 'text-slate-400 text-slate-400'}`}>先結帳</button><button type="button" onClick={() => setConfig(p => ({ ...p, dineInMode: 'postPay' }))} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${config.dineInMode === 'postPay' ? 'bg-white text-blue-600 shadow-md text-blue-600' : 'text-slate-400 text-slate-400'}`}>後結帳</button></div></div></section>
        <hr className="border-slate-100" />
        <section className="space-y-6 text-slate-900 text-slate-900 text-slate-900 text-slate-900 text-slate-900"><h4 className="font-bold text-lg text-slate-700 flex items-center gap-2 px-1 text-slate-700 text-slate-700"><ShieldCheck size={20} className="text-blue-500" /> 收款管道設定</h4>
          <div className="space-y-3 text-slate-900 text-slate-900">
            {[{ id: 'enableCreditCard', label: '信用卡支付系統', icon: CreditCard }, { id: 'enableMobilePayment', label: '行動支付 (Apple/Line)', icon: Smartphone }].map(opt => (
              <div key={opt.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100/60 shadow-sm transition-all hover:bg-slate-100/40 text-slate-900 text-slate-900">
                <div className="flex items-center gap-4 text-slate-400 text-slate-400 text-slate-400"><div className="p-2.5 bg-white rounded-xl shadow-sm text-blue-500 text-blue-500"><opt.icon size={22} /></div><div><p className="text-sm font-black text-slate-800 text-slate-800">{opt.label}</p></div></div>
                <button type="button" onClick={() => setConfig(p => ({ ...p, [opt.id]: !p[opt.id] }))} className={`w-16 h-8 rounded-full relative transition-all duration-300 ${config[opt.id] ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${config[opt.id] ? 'left-9' : 'left-1.5'} shadow-sm text-slate-900 text-slate-900`}></div></button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

// --- 12. 主結構入口 ---
const MainLayout = () => (
  <div className="flex min-h-screen bg-slate-50 text-slate-900">
    <Sidebar />
    <main className="flex-1 ml-64 p-10 h-screen overflow-hidden text-slate-900 text-slate-900 text-slate-900">
      <Routes>
        <Route path="/pos" element={<POSPage />} />
        <Route path="/orders" element={<OrderManagementPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/pos" />} />
      </Routes>
    </main>
  </div>
);

const AppContent = () => {
  const { isLoggedIn } = useContext(POSContext);
  return isLoggedIn ? <MainLayout /> : <LoginPage />;
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