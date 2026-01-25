import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Settings,
  LogOut,
  Plus,
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
  Receipt
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
      <div className="p-8 flex items-center space-x-3">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <Store size={24} />
        </div>
        <span className="text-xl font-black tracking-tight text-white">SMART POS</span>
      </div>

      <div className="flex-1 px-4 space-y-2">
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-10 text-center text-white">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl mb-4">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">POS 系統登入</h2>
        </div>
        <form onSubmit={handleLogin} className="p-10 space-y-6">
          <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" placeholder="帳號" onChange={e => setAuth({ ...auth, user: e.target.value })} />
          <input type="password" name="password" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" placeholder="密碼" onChange={e => setAuth({ ...auth, pass: e.target.value })} />
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg">登入系統</button>
        </form>
      </div>
    </div>
  );
};

// --- 4. 前台收銀 ---
const POSPage = () => {
  const { menu, setOrders, orders } = useContext(POSContext);
  const [cart, setCart] = useState([]);

  const addToCart = (p) => setCart([...cart, { ...p, cartId: Date.now() + Math.random() }]);
  const total = cart.reduce((s, i) => s + i.price, 0);

  const checkout = () => {
    if (cart.length === 0) return;
    const newOrder = {
      id: Date.now(),
      total,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      items: [...cart],
      status: 'unclosed'
    };
    setOrders([...orders, newOrder]);
    setCart([]);
    alert('結帳成功！');
  };

  return (
    <div className="flex gap-8">
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">點餐區</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {menu.map(item => (
            <button key={item.id} onClick={() => addToCart(item)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all text-left group">
              <div className="text-slate-800 font-bold mb-1 group-hover:text-blue-600">{item.name}</div>
              <div className="text-blue-600 font-black text-xl">${item.price}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="w-96 bg-white rounded-3xl shadow-xl flex flex-col h-[calc(100vh-140px)] sticky top-8">
        <div className="p-6 border-b flex justify-between items-center"><h3 className="font-bold text-lg text-slate-900">購物車</h3></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map(i => (
            <div key={i.cartId} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-700 text-sm">{i.name}</span>
              <div className="flex items-center space-x-3"><span className="font-black text-sm text-slate-900">${i.price}</span>
                <button onClick={() => setCart(cart.filter(c => c.cartId !== i.cartId))} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 bg-slate-900 text-white rounded-b-3xl">
          <div className="flex justify-between items-center mb-6"><span>總計</span><span className="text-3xl font-black">${total}</span></div>
          <button onClick={checkout} disabled={cart.length === 0} className="w-full bg-blue-600 py-4 rounded-xl font-bold disabled:bg-slate-800 disabled:text-slate-600 transition-all active:scale-95">完成結帳</button>
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
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-8">菜單管理中心</h2>
      <form onSubmit={handleAdd} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex gap-4 mb-8">
        <input className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" placeholder="商品名稱" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
        <input type="number" className="w-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" placeholder="價格" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
        <button type="submit" className="bg-slate-900 text-white px-8 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center shadow-lg"><Plus size={20} className="mr-1" /> 新增</button>
      </form>
      <div className="space-y-3">
        {menu.map(item => (
          <div key={item.id} className="bg-white px-8 py-5 rounded-2xl border border-slate-50 flex justify-between items-center shadow-sm">
            <span className="font-bold text-slate-700">{item.name}</span>
            <div className="flex items-center space-x-10"><span className="text-blue-600 font-black text-xl">${item.price}</span>
              <button onClick={() => setMenu(menu.filter(m => m.id !== item.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={20} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 6. 報表分析與詳細日結報表 ---
const DashboardPage = () => {
  const { orders, setOrders, dailySummaries, setDailySummaries } = useContext(POSContext);
  const [expandOrderId, setExpandOrderId] = useState(null);
  const [expandSummaryId, setExpandSummaryId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const todayStr = new Date().toLocaleDateString();
  const todayOrders = orders.filter(o => o.date === todayStr);
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);

  const handleDailyClosing = () => {
    const unclosedOrders = orders.filter(o => o.status === 'unclosed');
    if (unclosedOrders.length === 0) {
      alert("目前沒有需要結算的訂單。");
      return;
    }

    if (!window.confirm("確定要執行日結嗎？這將會彙整當前所有未結算訂單並產生詳細統計。")) return;

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
          relatedOrderIds: []
        };
      }
      acc[date].total += order.total;
      acc[date].orderCount += 1;
      acc[date].relatedOrderIds.push(order.id);

      order.items.forEach(item => {
        acc[date].itemSales[item.name] = (acc[date].itemSales[item.name] || 0) + 1;
      });

      return acc;
    }, {});

    const newSummaries = Object.values(grouped);
    setDailySummaries([...dailySummaries, ...newSummaries]);

    const updatedOrders = orders.map(o => ({ ...o, status: 'closed' }));
    setOrders(updatedOrders);

    alert("日結作業完成！已產生詳細彙整報表。");
  };

  return (
    <div className="max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 text-slate-900">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-3xl text-white shadow-xl flex flex-col justify-between">
          <div>
            <p className="opacity-70 text-sm font-bold uppercase tracking-widest mb-2">今日即時營收</p>
            <h3 className="text-5xl font-black">${todayRevenue}</h3>
          </div>
          <button
            onClick={handleDailyClosing}
            className="mt-6 flex items-center justify-center space-x-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold transition-all border border-white/30"
          >
            <CalendarCheck size={20} />
            <span>執行日結結帳</span>
          </button>
        </div>
        <div className="bg-white p-10 rounded-3xl border border-slate-100 flex flex-col justify-center shadow-sm">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">未結訂單總數</p>
          <h3 className="text-5xl font-black text-slate-800">
            {orders.filter(o => o.status === 'unclosed').length}
            <span className="text-xl font-normal text-slate-300 italic ml-2">筆待結</span>
          </h3>
        </div>
      </div>

      <div className="flex space-x-4 mb-6 border-b border-slate-200">
        <button
          onClick={() => setShowHistory(false)}
          className={`pb-4 px-4 font-bold transition-all border-b-2 ${!showHistory ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
        >
          已結日報表彙整
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={`pb-4 px-4 font-bold transition-all border-b-2 ${showHistory ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
        >
          所有交易明細紀錄
        </button>
      </div>

      {!showHistory ? (
        <div className="space-y-4">
          <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest px-2">歷史日報表清單</h3>
          {[...dailySummaries].reverse().map((summary) => {
            const isExpand = expandSummaryId === summary.id;
            // 修正點：加入 (summary.relatedOrderIds || []) 防禦性檢查，避免舊資料導致報錯
            const summaryOrders = orders.filter(o => (summary.relatedOrderIds || []).includes(o.id));

            return (
              <div key={summary.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div
                  onClick={() => setExpandSummaryId(isExpand ? null : summary.id)}
                  className={`p-6 flex items-center justify-between cursor-pointer transition-colors ${isExpand ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-center space-x-4 text-slate-900">
                    <div className="bg-green-100 text-green-600 p-3 rounded-xl"><FileText /></div>
                    <div>
                      <div className="font-bold text-slate-800 text-lg">{summary.date} 營收彙整報表</div>
                      <div className="text-xs text-slate-400 font-mono">結案時間：{summary.closedAt}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-8 text-slate-900">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase font-bold">當日總營收</div>
                      <div className="text-2xl font-black text-blue-600">${summary.total}</div>
                    </div>
                    {isExpand ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}
                  </div>
                </div>

                {isExpand && (
                  <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 animate-in fade-in space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-sm font-bold text-slate-500 mb-4 flex items-center">
                          <TrendingUp size={16} className="mr-2 text-blue-500" /> 銷售品項加總
                        </h4>
                        <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                          {Object.entries(summary.itemSales || {}).map(([name, count]) => (
                            <div key={name} className="flex justify-between items-center text-slate-900">
                              <span className="text-slate-600 font-medium">{name}</span>
                              <div className="flex items-center">
                                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{count} 份</span>
                              </div>
                            </div>
                          ))}
                          {Object.keys(summary.itemSales || {}).length === 0 && <div className="text-slate-400 text-sm">無品項銷售數據</div>}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest text-slate-900">營運指標</h4>
                        <div className="grid grid-cols-2 gap-4 text-slate-900">
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-400 block mb-1">總成交數</span>
                            <span className="text-xl font-bold text-slate-800">{summary.orderCount} 筆</span>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-400 block mb-1">平均單價</span>
                            <span className="text-xl font-bold text-slate-800">${summary.orderCount > 0 ? (summary.total / summary.orderCount).toFixed(0) : 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-8">
                      <h4 className="text-sm font-bold text-slate-500 mb-4 flex items-center">
                        <Receipt size={16} className="mr-2 text-blue-500" /> 當日原始訂單明細 (共 {summaryOrders.length} 筆)
                      </h4>
                      <div className="space-y-2">
                        {summaryOrders.map((order) => {
                          const isOrderExpand = expandOrderId === order.id;
                          return (
                            <div key={order.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandOrderId(isOrderExpand ? null : order.id);
                                }}
                                className="flex items-center px-6 py-4 cursor-pointer hover:bg-slate-50 text-slate-900"
                              >
                                <div className="flex-1 text-sm font-bold text-slate-600">{order.time}</div>
                                <div className="flex-1 text-xs text-slate-400 font-mono">#{order.id}</div>
                                <div className="text-lg font-black text-slate-800 mr-4">${order.total}</div>
                                <ChevronRight className={`text-slate-300 transition-transform ${isOrderExpand ? 'rotate-90' : ''}`} size={16} />
                              </div>
                              {isOrderExpand && (
                                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                                  <div className="space-y-1">
                                    {(order.items || []).map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-xs">
                                        <span className="text-slate-500">{item.name}</span>
                                        <span className="font-bold text-slate-700">${item.price}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {summaryOrders.length === 0 && <div className="text-slate-400 text-sm italic">找不對對應的原始訂單明細</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {dailySummaries.length === 0 && <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 text-slate-300">尚未有日結報表紀錄</div>}
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest px-2">全部歷史交易清單</h3>
          {[...orders].reverse().map(order => {
            const isExpand = expandOrderId === order.id;
            return (
              <div key={order.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all ${order.status === 'closed' ? 'border-slate-100 opacity-70' : 'border-blue-200 shadow-blue-50'}`}>
                <div onClick={() => setExpandOrderId(isExpand ? null : order.id)} className="flex items-center px-6 py-5 cursor-pointer hover:bg-slate-50 transition-colors text-slate-900">
                  <div className="flex-1">
                    <div className="font-bold text-slate-700 flex items-center">
                      {order.date} {order.time}
                      {order.status === 'closed' ? (
                        <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-normal italic">已結算</span>
                      ) : (
                        <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-normal italic">未結算</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono italic">#{order.id}</div>
                  </div>
                  <div className="text-xl font-black text-blue-600 mr-6">${order.total}</div>
                  <ChevronRight className={`text-slate-300 transition-transform ${isExpand ? 'rotate-90' : ''}`} />
                </div>
                {isExpand && (
                  <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 animate-in fade-in">
                    <div className="space-y-2 text-slate-900">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-600 font-medium">{item.name}</span>
                          <span className="font-bold text-slate-800">${item.price}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between font-black text-slate-900">
                      <span>單筆總額</span>
                      <span>${order.total}</span>
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

// --- 7. 主架構與導向 ---
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