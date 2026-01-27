import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Settings,
  LogOut,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  Store,
  User,
  CalendarCheck,
  FileText,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Receipt,
  Utensils,
  ShoppingBag,
  Clock,
  Search,
  Tag,
  Edit2,
  X,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Wallet,
  Eye,
  EyeOff,
  Ban,
  Calculator,
  Banknote,
  CreditCard,
  Smartphone,
  Delete,
  ShieldCheck
} from 'lucide-react';

// --- 1. 全域資料管理中心 (Context) ---
const POSContext = createContext();

export const POSProvider = ({ children }) => {
  const [menu, setMenu] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('pos_menu'));
    const defaultMenu = [
      { id: 1, name: '招牌美式', price: 65, category: '咖啡', isAvailable: true },
      { id: 2, name: '經典拿鐵', price: 85, category: '咖啡', isAvailable: true },
      { id: 3, name: '大吉嶺紅茶', price: 50, category: '茶飲', isAvailable: true },
      { id: 4, name: '起司蛋糕', price: 95, category: '甜點', isAvailable: true }
    ];
    if (!saved) return defaultMenu;
    return saved.map(item => ({ ...item, isAvailable: item.isAvailable ?? true }));
  });

  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem('pos_orders')) || []);
  const [dailySummaries, setDailySummaries] = useState(() => JSON.parse(localStorage.getItem('pos_daily_summaries')) || []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [config, setConfig] = useState(() => {
    const savedConfig = JSON.parse(localStorage.getItem('pos_config'));
    return savedConfig || {
      dineInMode: 'prePay',
      storeName: 'Smart POS',
      enableCreditCard: true,
      enableMobilePayment: true
    };
  });

  useEffect(() => {
    localStorage.setItem('pos_menu', JSON.stringify(menu));
    localStorage.setItem('pos_orders', JSON.stringify(orders));
    localStorage.setItem('pos_daily_summaries', JSON.stringify(dailySummaries));
    localStorage.setItem('pos_config', JSON.stringify(config));
  }, [menu, orders, dailySummaries, config]);

  return (
    <POSContext.Provider value={{
      menu, setMenu,
      orders, setOrders,
      dailySummaries, setDailySummaries,
      isLoggedIn, setIsLoggedIn,
      config, setConfig
    }}>
      {children}
    </POSContext.Provider>
  );
};

// --- 2. 輔助組件：數字算盤鍵盤 ---
const Keypad = ({ onInput, onClear, onDelete }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', '.'];
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map(key => (
        <button
          key={key}
          type="button"
          onClick={() => onInput(key)}
          className="h-14 lg:h-16 rounded-xl bg-white border border-slate-200 shadow-sm text-lg font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all"
        >
          {key}
        </button>
      ))}
      <button type="button" onClick={onClear} className="h-14 lg:h-16 rounded-xl bg-red-50 text-red-500 font-bold hover:bg-red-100 transition-all">AC</button>
      <button type="button" onClick={onDelete} className="h-14 lg:h-16 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-all"><Delete size={20} /></button>
    </div>
  );
};

// --- 3. 結帳確認視窗組件 ---
const CheckoutModal = ({ isOpen, onClose, cartTotal, onConfirm }) => {
  const { config } = useContext(POSContext);
  const [discount, setDiscount] = useState('0');
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
      setCashReceived(prev => {
        if (val === '.' && prev.includes('.')) return prev;
        return prev + val;
      });
    } else {
      setDiscount(prev => {
        if (prev === '0' && val !== '.') return val;
        if (val === '.' && prev.includes('.')) return prev;
        return prev + val;
      });
    }
  };

  const handleClear = () => focusField === 'cash' ? setCashReceived('') : setDiscount('0');
  const handleDelete = () => {
    const setter = focusField === 'cash' ? setCashReceived : setDiscount;
    setter(prev => prev.length > 0 ? (prev.length === 1 && focusField === 'discount' ? '0' : prev.slice(0, -1)) : (focusField === 'discount' ? '0' : ''));
  };

  const handleFinalConfirm = () => {
    if (paymentMethod === 'Cash' && numCash < finalTotal) {
      alert("收受金額不足！");
      return;
    }
    onConfirm({
      total: finalTotal,
      discount: numDiscount,
      paymentMethod,
      cashReceived: paymentMethod === 'Cash' ? numCash : finalTotal,
      change: paymentMethod === 'Cash' ? Math.max(0, change) : 0
    });
    setDiscount('0');
    setCashReceived('');
    setPaymentMethod('Cash');
    setFocusField('cash');
  };

  const availableMethods = [
    { id: 'Cash', label: '現金', icon: <Banknote size={24} />, enabled: true },
    { id: 'Credit', label: '刷卡', icon: <CreditCard size={24} />, enabled: config.enableCreditCard },
    { id: 'Mobile', label: '行動支付', icon: <Smartphone size={24} />, enabled: config.enableMobilePayment }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden max-h-[95vh] text-slate-900">

        {/* 左側：摘要 */}
        <div className="lg:w-[35%] bg-slate-50 p-8 border-r border-slate-200 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">結帳明細確認</h3>
            <button type="button" onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 lg:hidden"><X size={20} /></button>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">訂單小計</p>
              <p className="text-2xl font-black text-slate-800">${cartTotal}</p>
            </div>

            <div
              onClick={() => setFocusField('discount')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${focusField === 'discount' ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-slate-100 bg-slate-50/50'}`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">優惠折扣</span>
                <div className="flex gap-1">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setDiscount(Math.round(cartTotal * 0.1).toString()); }} className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold hover:bg-blue-100 hover:text-blue-600 transition-colors">9折</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setDiscount(Math.round(cartTotal * 0.2).toString()); }} className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold hover:bg-blue-100 hover:text-blue-600 transition-colors">8折</button>
                </div>
              </div>
              <div className="flex items-center justify-between text-red-500">
                <span className="text-xl font-bold">-$</span>
                <span className="text-3xl font-black">{discount}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-dashed border-slate-300">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">應收總額</p>
              <p className="text-5xl font-black text-blue-600">${finalTotal}</p>
            </div>
          </div>
        </div>

        {/* 右側：支付與算盤 */}
        <div className="flex-1 p-8 flex flex-col min-h-0 bg-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">步驟 1：選擇支付方式</h3>
            <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hidden lg:block"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {availableMethods.map(method => (
              method.enabled ? (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex items-center justify-center p-4 rounded-2xl border-2 transition-all gap-3 ${paymentMethod === method.id ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm' : 'border-slate-100 text-slate-400 hover:bg-slate-50'
                    }`}
                >
                  {method.icon}
                  <span className="font-bold text-sm">{method.label}</span>
                </button>
              ) : <div key={method.id} />
            ))}
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">金額確認</h3>
              {paymentMethod === 'Cash' ? (
                <div className="space-y-4">
                  <div
                    onClick={() => setFocusField('cash')}
                    className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${focusField === 'cash' ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-slate-100 bg-slate-50/50'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">實收金額</label>
                      <div className="flex gap-1">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setCashReceived(prev => ((parseFloat(prev) || 0) + 100).toString()); }} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold hover:border-blue-500 transition-all">100</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setCashReceived(prev => ((parseFloat(prev) || 0) + 500).toString()); }} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold hover:border-blue-500 transition-all">500</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setCashReceived(prev => ((parseFloat(prev) || 0) + 1000).toString()); }} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold hover:border-blue-500 transition-all">1000</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-slate-300">$</span>
                      <span className="text-4xl font-black">{cashReceived || '0'}</span>
                    </div>
                  </div>

                  <div className={`p-6 rounded-[2rem] border-2 flex flex-col justify-center ${change >= 0 ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-500'}`}>
                    <label className="text-[10px] font-bold opacity-60 uppercase mb-1">找零金額</label>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold">$</span>
                      <span className="text-4xl font-black">{change >= 0 ? Math.round(change) : "金額不足"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                  <CheckCircle2 size={40} className="text-blue-500 mb-4 opacity-50" />
                  <p className="font-bold text-slate-600 italic">非現金支付</p>
                  <p className="text-[10px] text-slate-400 mt-2">系統將自動結清 ${finalTotal}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calculator size={14} /> 數字算盤
              </h3>
              <div className="flex-1 bg-slate-50 p-4 rounded-[2rem] border border-slate-200 shadow-inner">
                <Keypad
                  onInput={handleKeypadInput}
                  onClear={handleClear}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4 shrink-0">
            <button type="button" onClick={onClose} className="px-8 py-5 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-colors">取消</button>
            <button
              type="button"
              onClick={handleFinalConfirm}
              className="flex-1 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Wallet size={24} />
              <span>確認完成結帳</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 4. 側邊導覽列 ---
const Sidebar = () => {
  const { setIsLoggedIn, config } = useContext(POSContext);
  const location = useLocation();

  const navItems = [
    { path: '/pos', label: '櫃檯收銀', icon: <ShoppingCart size={20} /> },
    { path: '/orders', label: '訂單管理', icon: <ClipboardList size={20} /> },
    { path: '/admin', label: '菜單設計', icon: <Edit2 size={20} /> },
    { path: '/dashboard', label: '報表分析', icon: <LayoutDashboard size={20} /> },
    { path: '/settings', label: '系統設定', icon: <Settings size={20} /> },
  ];

  return (
    <div className="w-64 h-screen bg-slate-900 text-white fixed left-0 top-0 flex flex-col border-r border-slate-800">
      <div className="p-8 flex items-center space-x-3 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <Store size={24} />
        </div>
        <span className="text-xl font-black tracking-tight text-white uppercase truncate">{config.storeName}</span>
      </div>

      <div className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${location.pathname === item.path ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'
              }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </div>

      <button
        onClick={() => setIsLoggedIn(false)}
        className="m-6 p-4 flex items-center space-x-3 text-slate-500 hover:text-red-400 border-t border-slate-800 transition-colors shrink-0"
      >
        <LogOut size={20} />
        <span className="font-bold">安全登出</span>
      </button>
    </div>
  );
};

// --- 5. 登入頁面 ---
const LoginPage = () => {
  const { setIsLoggedIn } = useContext(POSContext);
  const navigate = useNavigate();
  const [auth, setAuth] = useState({ user: '', pass: '' });

  const handleLogin = (e) => {
    e.preventDefault();
    if (auth.user === 'admin' && auth.pass === '1234') {
      setIsLoggedIn(true);
      navigate('/pos');
    } else {
      alert('預設帳號 admin / 密碼 1234');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-10 text-center text-white">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl mb-4 text-white">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-bold">POS 系統登入</h2>
        </div>
        <form onSubmit={handleLogin} className="p-10 space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 px-1 uppercase">帳號</label>
            <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900" placeholder="admin" onChange={e => setAuth({ ...auth, user: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 px-1 uppercase">密碼</label>
            <input type="password" name="password" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900" placeholder="1234" onChange={e => setAuth({ ...auth, pass: e.target.value })} />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg">登入系統</button>
        </form>
      </div>
    </div>
  );
};

// --- 6. 前台收銀 ---
const POSPage = () => {
  const { menu, setOrders, orders, config } = useContext(POSContext);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dineIn');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const todayStr = new Date().toLocaleDateString();
  const todayDineInCount = orders.filter(o => o.date === todayStr && o.orderType === 'dineIn').length;
  const todayTakeOutCount = orders.filter(o => o.date === todayStr && o.orderType === 'takeOut').length;

  const categories = useMemo(() => {
    const cats = menu.map(item => item.category).filter(Boolean);
    return ['全部', ...new Set(cats)];
  }, [menu]);

  const filteredMenu = menu.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '全部' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product) => {
    if (!product.isAvailable) return;
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === id) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const checkout = () => {
    if (cart.length === 0) return;
    if (orderType === 'dineIn' && config.dineInMode === 'postPay') {
      confirmOrder({ total: cartTotal, discount: 0, paymentMethod: 'pending' });
    } else {
      setIsCheckoutModalOpen(true);
    }
  };

  const confirmOrder = (paymentData) => {
    const specificCount = orders.filter(o => o.date === todayStr && o.orderType === orderType).length;
    const prefix = orderType === 'dineIn' ? 'D' : 'T';
    const orderNo = prefix + (specificCount + 1).toString().padStart(3, '0');

    const newOrder = {
      id: Date.now(),
      orderNo,
      total: paymentData.total,
      discount: paymentData.discount || 0,
      paymentMethod: paymentData.paymentMethod,
      cashReceived: paymentData.cashReceived || 0,
      change: paymentData.change || 0,
      date: todayStr,
      time: new Date().toLocaleTimeString(),
      items: [...cart],
      orderType,
      status: 'unclosed',
      paymentStatus: paymentData.paymentMethod === 'pending' ? 'pending' : 'paid'
    };
    setOrders([...orders, newOrder]);
    setCart([]);
    setIsCheckoutModalOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 text-slate-900 h-full overflow-hidden text-slate-900">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold">點餐區</h2>
            <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center font-mono text-blue-600">
              <span className="text-[10px] font-black mr-2 uppercase tracking-tighter">Next</span>
              <span className="font-black text-lg">
                {orderType === 'dineIn' ? `D${(todayDineInCount + 1).toString().padStart(3, '0')}` : `T${(todayTakeOutCount + 1).toString().padStart(3, '0')}`}
              </span>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="搜尋品項..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium text-slate-900"
            />
          </div>
        </div>

        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 shrink-0 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2 rounded-full whitespace-nowrap font-bold text-sm transition-all border ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 flex-1 pb-10 scrollbar-thin content-start">
          {filteredMenu.map(item => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              disabled={!item.isAvailable}
              className={`p-6 rounded-2xl shadow-sm border transition-all text-left group h-fit relative overflow-hidden ${item.isAvailable
                ? 'bg-white border-slate-100 hover:border-blue-500 hover:shadow-md'
                : 'bg-slate-50 border-slate-200 cursor-not-allowed grayscale-[0.8]'
                }`}
            >
              <div className={`font-bold mb-1 truncate ${item.isAvailable ? 'text-slate-800 group-hover:text-blue-600' : 'text-slate-400'}`}>
                {item.name}
              </div>
              <div className={`font-black text-xl ${item.isAvailable ? 'text-blue-600' : 'text-slate-400'}`}>
                ${item.price}
              </div>
              {!item.isAvailable && (
                <div className="absolute inset-0 bg-slate-900/5 flex items-center justify-center">
                  <span className="bg-slate-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter">暫不供應</span>
                </div>
              )}
            </button>
          ))}
          {filteredMenu.length === 0 && <div className="col-span-full py-20 text-center text-slate-300 italic font-medium">找不到商品</div>}
        </div>
      </div>

      <div className="w-full lg:w-96 flex-shrink-0 bg-white rounded-3xl shadow-xl flex flex-col border border-slate-100 h-full overflow-hidden text-slate-900">
        <div className="p-6 border-b flex flex-col space-y-4 bg-slate-50/50 rounded-t-3xl shrink-0">
          <div className="flex justify-between items-center text-slate-900">
            <h3 className="font-bold text-lg">購物車</h3>
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full text-white font-bold">{cart.reduce((s, i) => s + i.quantity, 0)} 件</span>
          </div>
          <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-inner font-bold">
            <button onClick={() => setOrderType('dineIn')} className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-sm transition-all ${orderType === 'dineIn' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><Utensils size={16} /><span>內用</span></button>
            <button onClick={() => setOrderType('takeOut')} className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-sm transition-all ${orderType === 'takeOut' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><ShoppingBag size={16} /><span>外帶</span></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {cart.map(item => (
            <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                <span className="font-black text-slate-900 text-sm">${item.price * item.quantity}</span>
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-slate-100 text-slate-500"><Minus size={14} /></button>
                  <span className="w-10 text-center font-bold text-sm text-slate-700">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-slate-100 text-slate-500"><Plus size={14} /></button>
                </div>
                <button onClick={() => updateQuantity(item.id, -999)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60"><ShoppingCart size={48} className="mb-2" /><p className="font-medium text-sm text-slate-400">尚未點餐</p></div>}
        </div>

        <div className="p-6 bg-slate-900 text-white rounded-b-3xl shrink-0">
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-400 font-medium">總計金額</span>
            <span className="text-3xl font-black text-white">${cartTotal}</span>
          </div>
          <button
            onClick={checkout}
            disabled={cart.length === 0}
            className={`w-full py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg text-white ${orderType === 'dineIn' && config.dineInMode === 'postPay' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {orderType === 'dineIn' && config.dineInMode === 'postPay' ? '送出訂單 (未結帳)' : '進行結帳確認'}
          </button>
        </div>
      </div>

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        cartTotal={cartTotal}
        onConfirm={confirmOrder}
      />
    </div>
  );
};

// --- 7. 訂單管理頁面 ---
const OrderManagementPage = () => {
  const { orders, setOrders } = useContext(POSContext);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [activeOrderToPay, setActiveOrderToPay] = useState(null);
  const todayStr = new Date().toLocaleDateString();

  const pendingOrders = orders.filter(o => o.paymentStatus === 'pending');
  const finishedOrders = orders.filter(o => o.paymentStatus === 'paid' && o.date === todayStr);

  const handlePay = (e, order) => {
    e.stopPropagation();
    setActiveOrderToPay(order);
  };

  const confirmPay = (paymentData) => {
    setOrders(orders.map(o => o.id === activeOrderToPay.id ? { ...o, ...paymentData, paymentStatus: 'paid' } : o));
    setActiveOrderToPay(null);
  };

  const toggleExpand = (id) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  const renderItems = (items) => (
    <div className="space-y-1 mt-4 pt-4 border-t border-slate-100 text-slate-900">
      {(items || []).map((item, idx) => (
        <div key={idx} className="flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">{item.name} x {item.quantity || 1}</span>
          <span className="font-bold text-slate-700">${(item.price || 0) * (item.quantity || 1)}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl text-slate-900 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h2 className="text-2xl font-bold">訂單管理</h2>
          <p className="text-slate-400 text-sm">追蹤待結帳單與今日交易狀況</p>
        </div>
        <div className="flex space-x-4 font-bold">
          <div className="bg-amber-50 px-6 py-3 rounded-2xl border border-amber-100 text-right text-amber-700"><p className="text-[10px] font-bold uppercase">待結總額</p><p className="text-xl font-black">${pendingOrders.reduce((s, o) => s + o.total, 0)}</p></div>
          <div className="bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 text-right text-blue-700"><p className="text-[10px] font-bold uppercase">今日已收</p><p className="text-xl font-black">${finishedOrders.reduce((s, o) => s + o.total, 0)}</p></div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
        <div className="flex flex-col min-h-0 text-slate-900">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center shrink-0">
            <AlertCircle size={16} className="mr-2 text-amber-500" /> 待結帳單 ({pendingOrders.length})
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin pb-10 text-slate-900">
            {pendingOrders.map(o => (
              <div
                key={o.id}
                onClick={() => toggleExpand(o.id)}
                className={`bg-white p-5 rounded-3xl border transition-all cursor-pointer hover:shadow-md ${expandedOrderId === o.id ? 'border-amber-400 shadow-md' : 'border-amber-200 shadow-sm'}`}
              >
                <div className="flex justify-between items-center text-slate-900 text-slate-900">
                  <div>
                    <div className="flex items-center space-x-2 mb-1 text-slate-900">
                      <span className="text-lg font-black text-slate-800">#{o.orderNo}</span>
                      <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">內用後結</span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center"><Clock size={12} className="mr-1" /> {o.time}</div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase">應收</p><p className="text-xl font-black text-slate-900">${o.total}</p></div>
                    <button
                      onClick={(e) => handlePay(e, o)}
                      className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center shadow-md"
                    >
                      <Wallet size={18} className="mr-2" /> 結帳
                    </button>
                    {expandedOrderId === o.id ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}
                  </div>
                </div>
                {expandedOrderId === o.id && renderItems(o.items)}
              </div>
            ))}
            {pendingOrders.length === 0 && <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl py-20 text-center text-slate-300 italic font-medium">目前暫無待結訂單</div>}
          </div>
        </div>

        <div className="flex flex-col min-h-0 text-slate-900">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center shrink-0">
            <CheckCircle2 size={16} className="mr-2 text-blue-500" /> 今日已完成 ({finishedOrders.length})
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin pb-10">
            {[...finishedOrders].reverse().map(o => (
              <div
                key={o.id}
                onClick={() => toggleExpand(o.id)}
                className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer opacity-80 hover:opacity-100 ${expandedOrderId === o.id ? 'border-blue-400 shadow-md' : 'border-slate-100 shadow-sm'}`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${o.orderType === 'takeOut' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
                      {o.orderType === 'takeOut' ? <ShoppingBag size={20} /> : <Utensils size={20} />}
                    </div>
                    <div>
                      <div className="font-black text-slate-700 text-sm text-slate-700">#{o.orderNo}</div>
                      <div className="text-[10px] text-slate-400">{o.time}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-lg font-black text-slate-800">${o.total}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-end">{o.paymentMethod === 'Cash' ? '現金' : o.paymentMethod === 'Credit' ? '刷卡' : '行動支付'}</div>
                    </div>
                    {expandedOrderId === o.id ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
                  </div>
                </div>
                {expandedOrderId === o.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100 text-[10px] space-y-1">
                    <div className="flex justify-between text-slate-400"><span>原價</span><span>${o.total + (o.discount || 0)}</span></div>
                    <div className="flex justify-between text-red-400"><span>折扣</span><span>-${o.discount || 0}</span></div>
                    {o.paymentMethod === 'Cash' && (<div className="flex justify-between text-slate-400"><span>實收/找零</span><span>${o.cashReceived || 0} / ${o.change || 0}</span></div>)}
                    {renderItems(o.items)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <CheckoutModal
        isOpen={!!activeOrderToPay}
        onClose={() => setActiveOrderToPay(null)}
        cartTotal={activeOrderToPay?.total || 0}
        onConfirm={confirmPay}
      />
    </div>
  );
};

// --- 8. 菜單設計 ---
const AdminPage = () => {
  const { menu, setMenu } = useContext(POSContext);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '' });
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price || !newItem.category) { alert('請填寫完整資訊'); return; }
    if (editingId) {
      setMenu(menu.map(item => item.id === editingId ? { ...item, ...newItem, price: parseFloat(newItem.price) } : item));
      setEditingId(null);
    } else {
      setMenu([...menu, { id: Date.now(), ...newItem, price: parseFloat(newItem.price), isAvailable: true }]);
    }
    setNewItem({ name: '', price: '', category: '' });
  };

  const toggleAvailability = (id) => {
    setMenu(menu.map(item =>
      item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
    ));
  };

  return (
    <div className="max-w-4xl text-slate-900 h-full flex flex-col overflow-hidden text-slate-900">
      <h2 className="text-2xl font-bold mb-8 shrink-0">菜單設計維護</h2>
      <form onSubmit={handleSubmit} className={`bg-white p-8 rounded-3xl shadow-sm border transition-all mb-8 shrink-0 ${editingId ? 'border-amber-400 ring-4 ring-amber-50' : 'border-slate-100'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-5"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">商品名稱</label><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} /></div>
          <div className="sm:col-span-3"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">分類</label><input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">價格</label><input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} /></div>

          <div className="sm:col-span-2 flex items-end gap-2 text-white">
            <button type="submit" className={`flex-1 rounded-xl font-bold h-12 transition-all flex items-center justify-center gap-2 shadow-lg text-white ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
              {editingId ? <Edit2 size={18} /> : <Plus size={20} />}
              <span>{editingId ? '更新' : '新增'}</span>
            </button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setNewItem({ name: '', price: '', category: '' }) }} className="bg-slate-100 p-3 rounded-xl text-slate-400 hover:bg-slate-200 transition-colors"><X size={20} /></button>}
          </div>
        </div>
      </form>

      <div className="grid gap-3 overflow-y-auto flex-1 pr-2 pb-10 scrollbar-thin">
        {menu.map(item => (
          <div key={item.id} className={`bg-white px-8 py-5 rounded-2xl border flex justify-between items-center shadow-sm shrink-0 transition-all text-slate-900 ${item.isAvailable ? 'border-slate-50 opacity-100' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-2 rounded-lg ${item.isAvailable ? 'bg-slate-100 text-slate-400' : 'bg-red-50 text-red-300'}`}>
                {item.isAvailable ? <Tag size={16} /> : <Ban size={16} />}
              </div>
              <div>
                <div className="font-bold text-slate-700">{item.name} {!item.isAvailable && <span className="ml-2 text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded uppercase font-bold">停用中</span>}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.category}</div>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-slate-900 text-slate-900">
              <span className={`font-black text-xl ${item.isAvailable ? 'text-blue-600' : 'text-slate-400'}`}>${item.price}</span>
              <div className="flex space-x-2 border-l pl-6 border-slate-100 items-center">
                <button
                  type="button"
                  onClick={() => toggleAvailability(item.id)}
                  title={item.isAvailable ? "設為不供應" : "設為供應中"}
                  className={`p-2 rounded-lg transition-colors ${item.isAvailable ? 'text-slate-300 hover:text-blue-500' : 'text-blue-500 hover:text-blue-600 bg-blue-50'}`}
                >
                  {item.isAvailable ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button type="button" onClick={() => { setEditingId(item.id); setNewItem({ name: item.name, price: item.price.toString(), category: item.category }) }} className="text-slate-300 hover:text-amber-500 p-2 transition-colors"><Edit2 size={18} /></button>
                <button type="button" onClick={() => setMenu(menu.filter(m => m.id !== item.id))} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={20} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 9. 報表分析 ---
const DashboardPage = () => {
  const { orders, dailySummaries, setDailySummaries, setOrders } = useContext(POSContext);
  const [expandOrderId, setExpandOrderId] = useState(null);
  const [expandSummaryId, setExpandSummaryId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const todayStr = new Date().toLocaleDateString();
  const todayPaidOrders = orders.filter(o => o.date === todayStr && o.paymentStatus === 'paid');
  const todayRevenue = todayPaidOrders.reduce((s, o) => s + o.total, 0);

  const handleDailyClosing = () => {
    const pendingCount = orders.filter(o => o.paymentStatus === 'pending').length;
    if (pendingCount > 0) {
      alert(`還有 ${pendingCount} 筆待結訂單未處理，請先完成收款後再執行日結。`);
      return;
    }
    const unclosedOrders = orders.filter(o => o.status === 'unclosed');
    if (unclosedOrders.length === 0) { alert("目前沒有需要結算的訂單。"); return; }
    if (!window.confirm("確定要執行日結嗎？")) return;

    const grouped = unclosedOrders.reduce((acc, order) => {
      const date = order.date;
      if (!acc[date]) { acc[date] = { id: Date.now() + Math.random(), date, total: 0, orderCount: 0, closedAt: new Date().toLocaleString(), itemSales: {}, typeCount: { dineIn: 0, takeOut: 0 }, paymentMethodCount: { Cash: 0, Credit: 0, Mobile: 0 }, relatedOrderIds: [] }; }
      acc[date].total += order.total;
      acc[date].orderCount += 1;
      acc[date].relatedOrderIds.push(order.id);
      acc[date].typeCount[order.orderType || 'dineIn'] += 1;
      if (order.paymentMethod) {
        acc[date].paymentMethodCount[order.paymentMethod] = (acc[date].paymentMethodCount[order.paymentMethod] || 0) + order.total;
      }
      order.items.forEach(item => { acc[date].itemSales[item.name] = (acc[date].itemSales[item.name] || 0) + (item.quantity || 1); });
      return acc;
    }, {});

    setDailySummaries([...dailySummaries, ...Object.values(grouped)]);
    setOrders(orders.map(o => ({ ...o, status: 'closed' })));
    alert("日結作業完成！");
  };

  const renderItemDetails = (items) => (items || []).map((item, idx) => (
    <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-slate-900">
      <div className="flex flex-col text-slate-900"><span className="text-slate-700 font-medium text-sm">{item.name}</span><span className="text-[10px] text-slate-400 font-mono italic">單價 ${item.price} x {item.quantity || 1}</span></div>
      <span className="font-bold text-sm text-slate-900">${(item.price || 0) * (item.quantity || 1)}</span>
    </div>
  ));

  return (
    <div className="max-w-5xl text-slate-900 h-full flex flex-col overflow-hidden text-slate-900">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 shrink-0">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-3xl text-white shadow-xl flex flex-col justify-between min-h-[220px]">
          <div><p className="opacity-70 text-sm font-bold uppercase tracking-widest mb-2 text-white/80">今日營收 (已結帳)</p><h3 className="text-5xl font-black text-white">${todayRevenue}</h3></div>
          <button type="button" onClick={handleDailyClosing} className="mt-6 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold border border-white/30 text-white"><CalendarCheck size={20} /><span>執行日結結帳</span></button>
        </div>
        <div className="bg-white p-10 rounded-3xl border border-slate-100 flex flex-col justify-center shadow-sm">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">今日支付分佈</p>
          <div className="space-y-2 text-slate-900">
            {['Cash', 'Credit', 'Mobile'].map(pm => (
              <div key={pm} className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-bold uppercase text-[10px]">{pm === 'Cash' ? '現金' : pm === 'Credit' ? '刷卡' : '行動支付'}</span>
                <span className="font-black text-slate-700">${todayPaidOrders.filter(o => o.paymentMethod === pm).reduce((s, o) => s + o.total, 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex space-x-4 mb-6 border-b border-slate-200 shrink-0 text-slate-900">
        <button type="button" onClick={() => setShowHistory(false)} className={`pb-4 px-4 font-bold transition-all border-b-2 ${!showHistory ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>日報彙整</button>
        <button type="button" onClick={() => setShowHistory(true)} className={`pb-4 px-4 font-bold transition-all border-b-2 ${showHistory ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>交易明細</button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10 scrollbar-thin text-slate-900">
        {!showHistory ? (
          <div className="space-y-4 text-slate-900">
            {[...dailySummaries].reverse().map((summary) => {
              const summaryOrders = orders.filter(o => (summary.relatedOrderIds || []).includes(o.id));
              return (
                <div key={summary.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all text-slate-900">
                  <div onClick={() => setExpandSummaryId(expandSummaryId === summary.id ? null : summary.id)} className={`p-6 flex items-center justify-between cursor-pointer ${expandSummaryId === summary.id ? 'bg-blue-50/50' : ''}`}>
                    <div className="flex items-center space-x-4 text-slate-900"><div className="bg-green-100 text-green-600 p-3 rounded-xl text-green-600"><FileText /></div><div><div className="font-bold text-slate-800 text-lg">{summary.date} 彙整報表</div><div className="text-xs text-slate-400 italic">結帳：{summary.closedAt}</div></div></div>
                    <div className="flex items-center space-x-8 text-slate-900"><div className="text-right text-slate-900"><div className="text-xs text-slate-400 uppercase font-bold text-slate-400">總營收</div><div className="text-2xl font-black text-blue-600">${summary.total}</div></div>{expandSummaryId === summary.id ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}</div>
                  </div>
                  {expandSummaryId === summary.id && (
                    <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 animate-in fade-in space-y-8 text-slate-900">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-900">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-slate-900"><h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center text-slate-400"><TrendingUp size={14} className="mr-2 text-blue-500" /> 銷量統計</h4><div className="space-y-2 text-slate-900">{Object.entries(summary.itemSales || {}).map(([name, count]) => (<div key={name} className="flex justify-between items-center text-sm text-slate-900"><span className="text-slate-600">{name}</span><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{count}</span></div>))}</div></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-slate-900"><h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center text-slate-400 text-orange-500"><Utensils size={14} className="mr-2" /> 比例</h4><div className="space-y-4 text-slate-900"><div className="flex justify-between items-center text-slate-900"><span className="text-sm text-slate-600 font-bold">內用</span><span className="font-black text-blue-600">{summary.typeCount?.dineIn || 0}</span></div><div className="flex justify-between items-center text-slate-900"><span className="text-sm text-slate-600 font-bold">外帶</span><span className="font-black text-orange-600">{summary.typeCount?.takeOut || 0}</span></div></div></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-slate-900"><span className="text-xs text-slate-400 uppercase font-bold block mb-1">平均客單</span><span className="text-3xl font-black text-slate-900">${summary.orderCount > 0 ? (summary.total / summary.orderCount).toFixed(0) : 0}</span><span className="text-xs text-slate-400 mt-2 italic">共計 {summary.orderCount} 筆交易</span></div>
                      </div>
                      <div className="border-t border-slate-200 pt-8 text-slate-900"><h4 className="text-sm font-bold text-slate-500 mb-4 flex items-center text-slate-900"><Receipt size={16} className="mr-2 text-blue-500" /> 原始訂單明細</h4><div className="space-y-2 text-slate-900">{summaryOrders.map((order) => { const isOrderExpand = expandOrderId === order.id; return (<div key={order.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm text-slate-900"><div onClick={(e) => { e.stopPropagation(); setExpandOrderId(isOrderExpand ? null : order.id); }} className="flex items-center px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors text-slate-900"><div className="flex flex-col flex-1 text-slate-900"><span className="text-sm font-bold text-slate-700">號碼 #{order.orderNo || 'N/A'}</span><span className="text-[10px] text-slate-400">{order.time}</span></div><div className="flex-1">{order.orderType === 'takeOut' ? <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-1 rounded-md font-bold">外帶</span> : <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-1 rounded-md font-bold">內用</span>}</div><div className="text-lg font-black text-slate-800 mr-4 text-slate-800">${order.total}</div><ChevronRight className={`text-slate-300 transition-transform ${isOrderExpand ? 'rotate-90' : ''}`} size={16} /></div>{isOrderExpand && (<div className="px-10 py-4 bg-slate-50 border-t border-slate-100 animate-in fade-in text-slate-900"><div className="space-y-1 text-slate-900">{renderItemDetails(order.items)}</div></div>)}</div>); })}</div></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest px-2 mb-2 text-slate-900 text-slate-900 text-slate-900">歷史交易明細</h3>
            {[...orders].reverse().map(order => {
              const isExpand = expandOrderId === order.id;
              return (
                <div key={order.id} className={`bg-white rounded-2xl border overflow-hidden transition-all text-slate-900 ${order.status === 'closed' ? 'border-slate-100 opacity-70' : 'border-blue-200 shadow-blue-50'}`}>
                  <div onClick={() => setExpandOrderId(isExpand ? null : order.id)} className="flex items-center px-6 py-5 cursor-pointer hover:bg-slate-50 transition-colors text-slate-900">
                    <div className="flex-1 text-slate-900"><div className="font-bold text-slate-700 flex items-center text-slate-700">#{order.orderNo || 'N/A'} - {order.date} <span className={`ml-3 text-[10px] px-2 py-0.5 rounded font-bold ${order.orderType === 'takeOut' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{order.orderType === 'takeOut' ? '外帶' : '內用'}</span>
                      {order.paymentStatus === 'pending' && <span className="ml-2 text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded font-bold italic">待結帳</span>}
                    </div><div className="text-xs text-slate-400 font-mono italic text-slate-400">ID: {order.id}</div></div>
                    <div className="text-xl font-black text-blue-600 mr-6 text-blue-600">${order.total}</div><ChevronRight className={`text-slate-300 transition-transform ${isExpand ? 'rotate-90' : ''}`} />
                  </div>
                  {isExpand && <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 animate-in fade-in text-slate-900"><div className="space-y-2 text-slate-900">{renderItemDetails(order.items)}</div><div className="mt-4 pt-4 border-t flex justify-between font-black text-slate-900 text-slate-900"><span>總計金額</span><span className="text-blue-600 text-blue-600">${order.total}</span></div></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 10. 系統設定頁面 ---
const SettingsPage = () => {
  const { config, setConfig } = useContext(POSContext);
  const updateConfig = (key, value) => { setConfig({ ...config, [key]: value }); };

  return (
    <div className="max-w-2xl text-slate-900 h-full overflow-hidden text-slate-900">
      <h2 className="text-2xl font-bold mb-8 text-slate-900">系統參數設定</h2>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden text-slate-900">
        <div className="p-8 space-y-8 text-slate-900">
          <section><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block text-slate-400">店舖名稱</label><input type="text" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg text-slate-900" value={config.storeName} onChange={(e) => updateConfig('storeName', e.target.value)} /></section>
          <hr className="border-slate-100" />
          <section>
            <div className="flex justify-between items-center mb-4">
              <div><h4 className="font-bold text-slate-700">內用結帳流程</h4><p className="text-sm text-slate-400">設定內用客人的結帳時機</p></div>
              <div className="bg-slate-100 p-1 rounded-xl flex text-slate-900"><button type="button" onClick={() => updateConfig('dineInMode', 'prePay')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${config.dineInMode === 'prePay' ? 'bg-white text-blue-600 shadow-sm text-blue-600' : 'text-slate-400'}`}>先結帳</button><button type="button" onClick={() => updateConfig('dineInMode', 'postPay')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${config.dineInMode === 'postPay' ? 'bg-white text-blue-600 shadow-sm text-blue-600' : 'text-slate-400'}`}>後結帳</button></div>
            </div>
            <div className={`p-4 rounded-2xl flex items-start space-x-3 text-slate-900 ${config.dineInMode === 'prePay' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{config.dineInMode === 'prePay' ? <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-blue-700" /> : <Clock size={20} className="shrink-0 mt-0.5 text-amber-700" />}<p className="text-xs leading-relaxed font-medium text-slate-900">{config.dineInMode === 'prePay' ? "模式：【先結帳】。點餐後需立即收款。" : "模式：【後結帳】。點餐後進入「訂單管理」，離開前收款。"}</p></div>
          </section>
          <hr className="border-slate-100" />
          <section className="space-y-4">
            <h4 className="font-bold text-slate-700 flex items-center gap-2"><ShieldCheck size={18} className="text-blue-500" /> 收款管道權限設定</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3"><CreditCard size={20} className="text-slate-400" /><div><p className="text-sm font-bold">信用卡支付</p><p className="text-[10px] text-slate-400">啟用後結帳畫面將顯示刷卡選項</p></div></div>
                <button type="button" onClick={() => updateConfig('enableCreditCard', !config.enableCreditCard)} className={`w-14 h-7 rounded-full relative transition-all ${config.enableCreditCard ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${config.enableCreditCard ? 'left-8' : 'left-1'}`}></div></button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3"><Smartphone size={20} className="text-slate-400" /><div><p className="text-sm font-bold">行動支付 (LinePay/ApplePay)</p><p className="text-[10px] text-slate-400">啟用後結帳畫面將顯示行動支付按鈕</p></div></div>
                <button type="button" onClick={() => updateConfig('enableMobilePayment', !config.enableMobilePayment)} className={`w-14 h-7 rounded-full relative transition-all ${config.enableMobilePayment ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${config.enableMobilePayment ? 'left-8' : 'left-1'}`}></div></button>
              </div>
            </div>
          </section>
        </div>
        <div className="bg-slate-50 p-6 border-t border-slate-100 text-center text-slate-900"><p className="text-xs text-slate-400 flex items-center justify-center text-slate-400"><Sliders size={14} className="mr-2 text-slate-400" /> 設定立即生效</p></div>
      </div>
    </div>
  );
};

// --- 11. 主架構 ---
const MainLayout = () => (
  <div className="flex min-h-screen bg-slate-50 text-slate-900 text-slate-900">
    <Sidebar />
    <main className="flex-1 ml-64 p-10 h-screen overflow-hidden text-slate-900 text-slate-900 text-slate-900"><Routes>
      <Route path="/pos" element={<POSPage />} />
      <Route path="/orders" element={<OrderManagementPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/pos" />} />
    </Routes></main>
  </div>
);

const AppContent = () => { const { isLoggedIn } = useContext(POSContext); return isLoggedIn ? <MainLayout /> : <LoginPage />; };
export default function App() { return (<POSProvider><BrowserRouter><AppContent /></BrowserRouter></POSProvider>); }