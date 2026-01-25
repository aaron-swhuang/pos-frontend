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
  User,
  History,
  Store
} from 'lucide-react';

// --- 資料管理中心 ---
const POSContext = createContext();

export const POSProvider = ({ children }) => {
  const [menu, setMenu] = useState(() => JSON.parse(localStorage.getItem('pos_menu')) || [
    { id: 1, name: '招牌拿鐵', price: 85 },
    { id: 2, name: '美式咖啡', price: 65 }
  ]);
  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem('pos_orders')) || []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    localStorage.setItem('pos_menu', JSON.stringify(menu));
    localStorage.setItem('pos_orders', JSON.stringify(orders));
  }, [menu, orders]);

  return (
    <POSContext.Provider value={{ menu, setMenu, orders, setOrders, isLoggedIn, setIsLoggedIn }}>
      {children}
    </POSContext.Provider>
  );
};

// --- 共用組件：側邊導覽列 ---
const Sidebar = () => {
  const { setIsLoggedIn } = useContext(POSContext);
  const location = useLocation();

  const menuItems = [
    { path: '/pos', label: '收銀櫃檯', icon: <ShoppingCart size={20} /> },
    { path: '/admin', label: '菜單設計', icon: <Settings size={20} /> },
    { path: '/dashboard', label: '報表分析', icon: <LayoutDashboard size={20} /> },
  ];

  return (
    <div className="w-64 h-screen bg-slate-900 text-slate-300 flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center space-x-3 text-white">
        <Store className="text-blue-400" />
        <span className="font-bold text-xl tracking-tight">智能 POS</span>
      </div>

      <div className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === item.path ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
              }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </div>

      <button
        onClick={() => setIsLoggedIn(false)}
        className="m-4 p-4 flex items-center space-x-3 text-slate-400 hover:text-red-400 border-t border-slate-800"
      >
        <LogOut size={20} />
        <span>登出系統</span>
      </button>
    </div>
  );
};

// --- 頁面 1：專業登入頁 ---
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
      alert('請輸入 admin / 1234');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="max-w-md w-full bg-white shadow-2xl rounded-2xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
          <div className="inline-block p-3 bg-blue-600 rounded-xl mb-4 text-white">
            <User size={32} />
          </div>
          <h2 className="text-white text-2xl font-bold">POS 系統管理入口</h2>
        </div>
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">管理員帳號</label>
            <input
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="admin"
              onChange={e => setAuth({ ...auth, user: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">密碼</label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              onChange={e => setAuth({ ...auth, pass: e.target.value })}
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
            立即登入
          </button>
        </form>
      </div>
    </div>
  );
};

// --- 頁面 2：收銀櫃檯 ---
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
      items: [...cart]
    };
    setOrders([...orders, newOrder]);
    setCart([]);
    alert('結帳成功！');
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <h2 className="text-2xl font-bold mb-6">點購商品</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {menu.map(item => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-500 text-left transition-all group"
            >
              <div className="text-slate-800 font-bold text-lg mb-1">{item.name}</div>
              <div className="text-blue-600 font-bold">${item.price}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="w-96 bg-white shadow-xl rounded-2xl flex flex-col h-[calc(100vh-80px)]">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold flex items-center space-x-2">
            <ShoppingCart size={20} className="text-slate-400" />
            <span>目前訂單</span>
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map(i => (
            <div key={i.cartId} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="font-medium text-slate-700">{i.name}</span>
              <div className="flex items-center space-x-3">
                <span className="font-bold text-slate-900">${i.price}</span>
                <button onClick={() => setCart(cart.filter(c => c.cartId !== i.cartId))} className="text-slate-300 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 bg-slate-900 text-white rounded-b-2xl">
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-400">應收總計</span>
            <span className="text-3xl font-bold">${total}</span>
          </div>
          <button
            onClick={checkout}
            disabled={cart.length === 0}
            className="w-full bg-blue-600 py-4 rounded-xl font-bold text-lg disabled:bg-slate-700 disabled:text-slate-500 transition-colors"
          >
            確認結帳
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 頁面 3：菜單管理 ---
const AdminPage = () => {
  const { menu, setMenu } = useContext(POSContext);
  const [newItem, setNewItem] = useState({ name: '', price: '' });

  const add = (e) => {
    e.preventDefault();
    if (newItem.name && newItem.price) {
      setMenu([...menu, { id: Date.now(), name: newItem.name, price: parseFloat(newItem.price) }]);
      setNewItem({ name: '', price: '' });
    }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold mb-8">菜單設計維護</h2>
      <form onSubmit={add} className="bg-white p-8 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-4 mb-8">
        <input
          className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
          placeholder="商品名稱"
          value={newItem.name}
          onChange={e => setNewItem({ ...newItem, name: e.target.value })}
        />
        <input
          type="number"
          className="w-32 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
          placeholder="定價"
          value={newItem.price}
          onChange={e => setNewItem({ ...newItem, price: e.target.value })}
        />
        <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800">
          <Plus size={20} className="inline mr-2" /> 新增品項
        </button>
      </form>

      <div className="grid gap-3">
        {menu.map(item => (
          <div key={item.id} className="bg-white px-6 py-4 rounded-xl border flex justify-between items-center hover:shadow-md transition-shadow">
            <span className="font-bold text-slate-700">{item.name}</span>
            <div className="flex items-center space-x-6">
              <span className="text-blue-600 font-bold text-lg">${item.price}</span>
              <button onClick={() => setMenu(menu.filter(m => m.id !== item.id))} className="text-slate-300 hover:text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 頁面 4：報表分析 (點選細節) ---
const DashboardPage = () => {
  const { orders } = useContext(POSContext);
  const [expandId, setExpandId] = useState(null);
  const todayRevenue = orders.filter(o => o.date === new Date().toLocaleDateString()).reduce((s, o) => s + o.total, 0);

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-bold text-slate-800">營收統計報告</h2>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <span className="text-slate-400 text-sm block mb-1">今日總營收</span>
          <span className="text-3xl font-black text-blue-600">${todayRevenue}</span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest px-2 mb-4">交易明細</h3>
        {[...orders].reverse().map(order => {
          const isExpand = expandId === order.id;
          return (
            <div key={order.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all">
              <div
                onClick={() => setExpandId(isExpand ? null : order.id)}
                className="flex items-center px-6 py-5 cursor-pointer hover:bg-slate-50"
              >
                <div className="flex-1">
                  <div className="font-bold text-slate-700">{order.date} {order.time}</div>
                  <div className="text-xs text-slate-400">訂單編號: {order.id}</div>
                </div>
                <div className="text-xl font-black text-slate-800 mr-4">${order.total}</div>
                <ChevronRight className={`text-slate-300 transition-transform ${isExpand ? 'rotate-90' : ''}`} />
              </div>
              {isExpand && (
                <div className="px-6 pb-6 pt-2 bg-slate-50 border-t border-slate-100">
                  <div className="space-y-2 mt-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
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
      </div>
    </div>
  );
};

// --- 主架構 ---
const MainLayout = () => (
  <div className="flex">
    <Sidebar />
    <main className="flex-1 ml-64 p-8 min-h-screen bg-slate-50">
      <Routes>
        <Route path="/pos" element={<POSPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/pos" />} />
      </Routes>
    </main>
  </div>
);

export default function App() {
  return (
    <POSProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </POSProvider>
  );
}

const AppContent = () => {
  const { isLoggedIn } = useContext(POSContext);
  return isLoggedIn ? <MainLayout /> : <LoginPage />;
};