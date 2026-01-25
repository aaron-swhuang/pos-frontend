import React, { useState, useEffect, createContext, useContext } from 'react';
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
  History,
  FileText,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Receipt,
  Utensils,
  ShoppingBag,
  Clock
} from 'lucide-react';

// --- 1. 全域資料管理中心 (Context) ---
const POSContext = createContext();

export const POSProvider = ({ children }) => {
  const [menu, setMenu] = useState(() => JSON.parse(localStorage.getItem('pos_menu')) || [
    { id: 1, name: '招牌美式', price: 65 },
    { id: 2, name: '經典拿鐵', price: 85 }
  ]);
  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem('pos_orders')) || []);
  const [dailySummaries, setDailySummaries] = useState(() => JSON.parse(localStorage.getItem('pos_daily_summaries')) || []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    localStorage.setItem('pos_menu', JSON.stringify(menu));
    localStorage.setItem('pos_orders', JSON.stringify(orders));
    localStorage.setItem('pos_daily_summaries', JSON.stringify(dailySummaries));
  }, [menu, orders, dailySummaries]);

  return (
    <POSContext.Provider value={{
      menu, setMenu,
      orders, setOrders,
      dailySummaries, setDailySummaries,
      isLoggedIn, setIsLoggedIn
    }}>
      {children}
    </POSContext.Provider>
  );
};

// --- 2. 側邊導覽列組件 ---
const Sidebar = () => {
  const { setIsLoggedIn } = useContext(POSContext);
  const location = useLocation();

  const navItems = [
    { path: '/pos', label: '櫃檯收銀', icon: <ShoppingCart size={20} /> },
    { path: '/admin', label: '菜單設計', icon: <Settings size={20} /> },
    { path: '/dashboard', label: '報表分析', icon: <LayoutDashboard size={20} /> },
  ];

  return (
    <div className="w-64 h-screen bg-slate-900 text-white fixed left-0 top-0 flex flex-col">
      <div className="p-8 flex items-center space-x-3 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <Store size={24} />
        </div>
        <span className="text-xl font-black tracking-tight text-white uppercase">Smart POS</span>
      </div>

      <div className="flex-1 px-4 space-y-2 mt-6">
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
        className="m-6 p-4 flex items-center space-x-3 text-slate-500 hover:text-red-400 border-t border-slate-800 transition-colors"
      >
        <LogOut size={20} />
        <span className="font-bold">安全登出</span>
      </button>
    </div>
  );
};

// --- 3. 登入頁面 ---
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-10 text-center text-white">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl mb-4">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-bold">POS 系統登入</h2>
        </div>
        <form onSubmit={handleLogin} className="p-10 space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 px-1 uppercase">帳號</label>
            <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" placeholder="admin" onChange={e => setAuth({ ...auth, user: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 px-1 uppercase">密碼</label>
            <input type="password" name="password" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" placeholder="1234" onChange={e => setAuth({ ...auth, pass: e.target.value })} />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg">登入系統</button>
        </form>
      </div>
    </div>
  );
};

// --- 4. 前台收銀 (優化連續結帳流程) ---
const POSPage = () => {
  const { menu, setOrders, orders } = useContext(POSContext);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dineIn');

  const addToCart = (product) => {
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

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // 計算今天的取餐序號
  const todayStr = new Date().toLocaleDateString();
  const todayOrderCount = orders.filter(o => o.date === todayStr).length;

  const checkout = () => {
    if (cart.length === 0) return;

    const orderNo = (todayOrderCount + 1).toString().padStart(3, '0');
    const newOrder = {
      id: Date.now(),
      orderNo, // 加入取餐號
      total,
      date: todayStr,
      time: new Date().toLocaleTimeString(),
      items: [...cart],
      orderType,
      status: 'unclosed'
    };

    setOrders([...orders, newOrder]);
    setCart([]);
    setOrderType('dineIn'); // 結帳後重置回內用
    alert(`結帳成功！取餐號：${orderNo} (${orderType === 'dineIn' ? '內用' : '外帶'})`);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 text-slate-900">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">點餐區</h2>
          <div className="bg-slate-100 px-4 py-2 rounded-lg text-sm text-slate-500 font-medium">
            下一個取餐號: <span className="text-blue-600 font-bold">#{(todayOrderCount + 1).toString().padStart(3, '0')}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
          {menu.map(item => (
            <button key={item.id} onClick={() => addToCart(item)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all text-left group">
              <div className="text-slate-800 font-bold mb-1 group-hover:text-blue-600 truncate">{item.name}</div>
              <div className="text-blue-600 font-black text-xl">${item.price}</div>
            </button>
          ))}
        </div>

        {/* 新增：近期訂單區塊 (讓收銀員知道上一筆有沒有結帳成功) */}
        <div className="mt-auto border-t border-slate-200 pt-8">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
            <Clock size={16} className="mr-2" /> 近期完成訂單 (今日共 {todayOrderCount} 筆)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...orders].filter(o => o.date === todayStr).slice(-3).reverse().map(o => (
              <div key={o.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-xs">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-slate-700">號碼 #{o.orderNo}</span>
                  <span className="text-slate-400">{o.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-0.5 rounded font-bold ${o.orderType === 'takeOut' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {o.orderType === 'takeOut' ? '外帶' : '內用'}
                  </span>
                  <span className="font-black text-slate-800 text-base">${o.total}</span>
                </div>
              </div>
            ))}
            {todayOrderCount === 0 && <div className="text-slate-300 italic text-sm">今日尚無訂單</div>}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-96 bg-white rounded-3xl shadow-xl flex flex-col h-[calc(100vh-140px)] sticky top-8 border border-slate-100">
        <div className="p-6 border-b flex flex-col space-y-4 bg-slate-50/50 rounded-t-3xl">
          <div className="flex justify-between items-center text-slate-900">
            <h3 className="font-bold text-lg">購物車</h3>
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">{cart.reduce((s, i) => s + i.quantity, 0)} 件</span>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setOrderType('dineIn')}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-bold transition-all ${orderType === 'dineIn' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <Utensils size={16} />
              <span>內用</span>
            </button>
            <button
              onClick={() => setOrderType('takeOut')}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-bold transition-all ${orderType === 'takeOut' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <ShoppingBag size={16} />
              <span>外帶</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map(item => (
            <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-900">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-700">{item.name}</span>
                <span className="font-black text-slate-900">${item.price * item.quantity}</span>
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-slate-100 text-slate-500"><Minus size={14} /></button>
                  <span className="w-10 text-center font-bold text-sm text-slate-900">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-slate-100 text-slate-500"><Plus size={14} /></button>
                </div>
                <button onClick={() => updateQuantity(item.id, -999)} className="text-red-400 hover:text-red-600 p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
              <ShoppingCart size={48} className="mb-2" />
              <p>尚未點餐</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-900 text-white rounded-b-3xl">
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-400 font-medium">總計金額</span>
            <span className="text-3xl font-black text-white">${total}</span>
          </div>
          <button
            onClick={checkout}
            disabled={cart.length === 0}
            className="w-full bg-blue-600 py-4 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
          >
            完成結帳 (取餐號)
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 5. 菜單管理 ---
const AdminPage = () => {
  const { menu, setMenu } = useContext(POSContext);
  const [newItem, setNewItem] = useState({ name: '', price: '' });

  const handleAdd = (e) => {
    e.preventDefault();
    if (newItem.name && newItem.price) {
      setMenu([...menu, { id: Date.now(), name: newItem.name, price: parseFloat(newItem.price) }]);
      setNewItem({ name: '', price: '' });
    }
  };

  return (
    <div className="max-w-4xl text-slate-900">
      <h2 className="text-2xl font-bold mb-8">菜單管理中心</h2>
      <form onSubmit={handleAdd} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">商品名稱</label>
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" placeholder="例如：焦糖瑪奇朵" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
        </div>
        <div className="sm:w-32">
          <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">價格</label>
          <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" placeholder="0" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
        </div>
        <button type="submit" className="bg-slate-900 text-white px-8 h-12 self-end rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"><Plus size={20} className="mr-1" /> 新增</button>
      </form>
      <div className="grid gap-3">
        {menu.map(item => (
          <div key={item.id} className="bg-white px-8 py-5 rounded-2xl border border-slate-50 flex justify-between items-center shadow-sm">
            <span className="font-bold text-slate-700">{item.name}</span>
            <div className="flex items-center space-x-10">
              <span className="text-blue-600 font-black text-xl">${item.price}</span>
              <button onClick={() => setMenu(menu.filter(m => m.id !== item.id))} className="text-slate-200 hover:text-red-500"><Trash2 size={20} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 6. 報表分析 (含明細價格修復) ---
const DashboardPage = () => {
  const { orders, setOrders, dailySummaries, setDailySummaries } = useContext(POSContext);
  const [expandOrderId, setExpandOrderId] = useState(null);
  const [expandSummaryId, setExpandSummaryId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const todayStr = new Date().toLocaleDateString();
  const todayRevenue = orders.filter(o => o.date === todayStr).reduce((s, o) => s + o.total, 0);

  const handleDailyClosing = () => {
    const unclosedOrders = orders.filter(o => o.status === 'unclosed');
    if (unclosedOrders.length === 0) {
      alert("目前沒有需要結算的訂單。");
      return;
    }

    if (!window.confirm("確定要執行日結嗎？")) return;

    const grouped = unclosedOrders.reduce((acc, order) => {
      const date = order.date;
      if (!acc[date]) {
        acc[date] = {
          id: Date.now() + Math.random(),
          date,
          total: 0,
          orderCount: 0,
          closedAt: new Date().toLocaleString(),
          itemSales: {},
          typeCount: { dineIn: 0, takeOut: 0 },
          relatedOrderIds: []
        };
      }
      acc[date].total += order.total;
      acc[date].orderCount += 1;
      acc[date].relatedOrderIds.push(order.id);

      const type = order.orderType || 'dineIn';
      acc[date].typeCount[type] += 1;

      order.items.forEach(item => {
        const qty = item.quantity || 1;
        acc[date].itemSales[item.name] = (acc[date].itemSales[item.name] || 0) + qty;
      });

      return acc;
    }, {});

    setDailySummaries([...dailySummaries, ...Object.values(grouped)]);
    setOrders(orders.map(o => ({ ...o, status: 'closed' })));
    alert("日結作業完成！");
  };

  const renderItemDetails = (items) => {
    return (items || []).map((item, idx) => {
      const qty = item.quantity || 1;
      const price = item.price || 0;
      return (
        <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
          <div className="flex flex-col">
            <span className="text-slate-700 font-medium text-sm">{item.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              單價 ${price} x {qty}
            </span>
          </div>
          <span className="font-bold text-slate-900 text-sm">
            ${price * qty}
          </span>
        </div>
      );
    });
  };

  return (
    <div className="max-w-5xl text-slate-900">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 text-slate-900">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-3xl text-white shadow-xl flex flex-col justify-between min-h-[220px]">
          <div>
            <p className="opacity-70 text-sm font-bold uppercase tracking-widest mb-2 text-white/80">今日營收</p>
            <h3 className="text-5xl font-black text-white">${todayRevenue}</h3>
          </div>
          <button onClick={handleDailyClosing} className="mt-6 flex items-center justify-center space-x-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold transition-all border border-white/30 text-white">
            <CalendarCheck size={20} />
            <span>執行日結結帳</span>
          </button>
        </div>
        <div className="bg-white p-10 rounded-3xl border border-slate-100 flex flex-col justify-center shadow-sm">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">待結訂單</p>
          <h3 className="text-5xl font-black text-slate-800">{orders.filter(o => o.status === 'unclosed').length} <span className="text-xl font-normal text-slate-300">筆</span></h3>
        </div>
      </div>

      <div className="flex space-x-4 mb-6 border-b border-slate-200">
        <button onClick={() => setShowHistory(false)} className={`pb-4 px-4 font-bold transition-all border-b-2 ${!showHistory ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>日報彙整</button>
        <button onClick={() => setShowHistory(true)} className={`pb-4 px-4 font-bold transition-all border-b-2 ${showHistory ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>交易明細</button>
      </div>

      {!showHistory ? (
        <div className="space-y-4">
          {[...dailySummaries].reverse().map((summary) => {
            const isExpand = expandSummaryId === summary.id;
            const summaryOrders = orders.filter(o => (summary.relatedOrderIds || []).includes(o.id));
            return (
              <div key={summary.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div onClick={() => setExpandSummaryId(isExpand ? null : summary.id)} className={`p-6 flex items-center justify-between cursor-pointer ${isExpand ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex items-center space-x-4 text-slate-900">
                    <div className="bg-green-100 text-green-600 p-3 rounded-xl"><FileText /></div>
                    <div>
                      <div className="font-bold text-slate-800 text-lg">{summary.date} 彙整報表</div>
                      <div className="text-xs text-slate-400 font-mono italic">結帳：{summary.closedAt}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-8 text-slate-900">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase font-bold text-slate-400">總營收</div>
                      <div className="text-2xl font-black text-blue-600">${summary.total}</div>
                    </div>
                    {isExpand ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}
                  </div>
                </div>

                {isExpand && (
                  <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 animate-in fade-in space-y-8 text-slate-900">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center"><TrendingUp size={14} className="mr-2 text-blue-500" /> 銷量統計</h4>
                        <div className="space-y-2">
                          {Object.entries(summary.itemSales || {}).map(([name, count]) => (
                            <div key={name} className="flex justify-between items-center text-sm">
                              <span className="text-slate-600">{name}</span>
                              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center"><Utensils size={14} className="mr-2 text-orange-500" /> 內外帶比例</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 font-bold">內用筆數</span>
                            <span className="font-black text-blue-600">{summary.typeCount?.dineIn || 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 font-bold">外帶筆數</span>
                            <span className="font-black text-orange-600">{summary.typeCount?.takeOut || 0}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <span className="text-xs text-slate-400 uppercase font-bold block mb-1">平均客單價</span>
                        <span className="text-3xl font-black text-slate-800">${summary.orderCount > 0 ? (summary.total / summary.orderCount).toFixed(0) : 0}</span>
                        <span className="text-xs text-slate-400 mt-2 italic">共計 {summary.orderCount} 筆交易</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-8">
                      <h4 className="text-sm font-bold text-slate-500 mb-4 flex items-center text-slate-900"><Receipt size={16} className="mr-2 text-blue-500" /> 原始訂單明細</h4>
                      <div className="space-y-2">
                        {summaryOrders.map((order) => {
                          const isOrderExpand = expandOrderId === order.id;
                          return (
                            <div key={order.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                              <div onClick={(e) => { e.stopPropagation(); setExpandOrderId(isOrderExpand ? null : order.id); }} className="flex items-center px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors">
                                <div className="flex flex-col flex-1">
                                  <span className="text-sm font-bold text-slate-700">號碼 #{order.orderNo || 'N/A'}</span>
                                  <span className="text-[10px] text-slate-400">{order.time}</span>
                                </div>
                                <div className="flex-1">
                                  {order.orderType === 'takeOut' ?
                                    <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-1 rounded-md font-bold">外帶</span> :
                                    <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-1 rounded-md font-bold">內用</span>
                                  }
                                </div>
                                <div className="text-lg font-black text-slate-800 mr-4">${order.total}</div>
                                <ChevronRight className={`text-slate-300 transition-transform ${isOrderExpand ? 'rotate-90' : ''}`} size={16} />
                              </div>
                              {isOrderExpand && (
                                <div className="px-10 py-4 bg-slate-50 border-t border-slate-100 text-slate-900 animate-in fade-in">
                                  <div className="space-y-1">
                                    {renderItemDetails(order.items)}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest px-2 mb-2">歷史交易明細</h3>
          {[...orders].reverse().map(order => {
            const isExpand = expandOrderId === order.id;
            return (
              <div key={order.id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${order.status === 'closed' ? 'border-slate-100 opacity-70' : 'border-blue-200 shadow-blue-50'}`}>
                <div onClick={() => setExpandOrderId(isExpand ? null : order.id)} className="flex items-center px-6 py-5 cursor-pointer hover:bg-slate-50 text-slate-900 transition-colors">
                  <div className="flex-1">
                    <div className="font-bold text-slate-700 flex items-center">
                      #{order.orderNo || 'N/A'} - {order.date} {order.time}
                      <span className={`ml-3 text-[10px] px-2 py-0.5 rounded font-bold ${order.orderType === 'takeOut' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {order.orderType === 'takeOut' ? '外帶' : '內用'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono italic">ID: {order.id}</div>
                  </div>
                  <div className="text-xl font-black text-blue-600 mr-6">${order.total}</div>
                  <ChevronRight className={`text-slate-300 transition-transform ${isExpand ? 'rotate-90' : ''}`} />
                </div>
                {isExpand && (
                  <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 text-slate-900 animate-in fade-in">
                    <div className="space-y-2">
                      {renderItemDetails(order.items)}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between font-black text-slate-900">
                      <span>總計金額</span>
                      <span className="text-blue-600">${order.total}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- 7. 主架構 ---
const MainLayout = () => (
  <div className="flex min-h-screen bg-slate-50">
    <Sidebar />
    <main className="flex-1 ml-64 p-10">
      <Routes>
        <Route path="/pos" element={<POSPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
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