import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe, vi } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// 確保從 App.jsx 匯出正確的組件與 Context
import App, {
  POSContext,
  CheckoutModal,
  DashboardPage,
  LoginPage,
  Sidebar,
  OrderManagementPage,
  POSPage,
  AdminPage,
  SettingsPage,
  VoidReasonModal,
  DatabaseViewPage,
  SettlementPage,
  StaffManagementPage // 引入新增的員工管理頁面
} from '../App';

/**
 * 模擬全域 Context 資料
 */
const mockOrders = [
  {
    id: 'uuid-1234-5678',
    serialNo: '202402010000001',
    orderNo: 'D001',
    date: '2024-02-01',
    time: '12:30:00',
    total: 150,
    status: 'unclosed',
    paymentStatus: 'paid',
    orderType: 'dineIn',
    paymentMethod: 'Cash',
    isVoided: false,
    items: [{ name: '招牌美式', price: 75, quantity: 2 }]
  },
  {
    id: 'uuid-8765-4321',
    serialNo: '202402010000002',
    orderNo: 'D002',
    date: '2024-02-01',
    time: '13:00:00',
    total: 85,
    status: 'unclosed',
    paymentStatus: 'pending',
    orderType: 'dineIn',
    isVoided: false,
    items: [{ name: '經典拿鐵', price: 85, quantity: 1 }]
  }
];

const mockDailySummaries = [
  {
    id: 'summary_1',
    date: '2024-02-01',
    total: 150,
    orderCount: 1,
    closedAt: '2024-02-01 22:00:00',
    itemSales: { '招牌美式': 2 },
    typeCount: { dineIn: 1, takeOut: 0 },
    relatedOrders: [mockOrders[0]]
  }
];

// 模擬 RBAC 角色與使用者資料
const mockUsers = [
  { id: 1, username: 'dev', password: '123', name: '系統工程師', roleId: 'developer' },
  { id: 2, username: 'admin', password: '123', name: '店長', roleId: 'manager' },
  { id: 3, username: 'staff', password: '123', name: '櫃檯人員', roleId: 'staff' },
];

const mockRoles = [
  { id: 'developer', name: '開發者', permissions: ['ACCESS_POS', 'ACCESS_ORDERS', 'VOID_ORDERS', 'ACCESS_SETTLEMENT', 'ACCESS_ADMIN', 'ACCESS_STAFF', 'ACCESS_DASHBOARD', 'ACCESS_SETTINGS', 'ACCESS_DATABASE'] },
  { id: 'manager', name: '店舖主管', permissions: ['ACCESS_POS', 'ACCESS_ORDERS', 'VOID_ORDERS', 'ACCESS_SETTLEMENT', 'ACCESS_ADMIN', 'ACCESS_STAFF', 'ACCESS_DASHBOARD', 'ACCESS_SETTINGS'] },
  { id: 'staff', name: '一般店員', permissions: ['ACCESS_POS', 'ACCESS_ORDERS'] }
];

// 將 Context Value 抽離成一個 function 方便每個 test 獨立使用並可覆寫
const getMockContextValue = (overrides = {}) => {
  // 測試環境預設使用最高權限「開發者」登入，以利渲染所有組件進行測試
  const defaultUser = overrides.currentUser !== undefined ? overrides.currentUser : mockUsers[0];

  return {
    menu: [
      { id: 1, name: '招牌美式', price: 65, category: '咖啡', isAvailable: true },
      { id: 2, name: '經典拿鐵', price: 85, category: '咖啡', isAvailable: true },
      { id: 3, name: '起司蛋糕', price: 95, category: '甜點', isAvailable: false }
    ],
    orders: mockOrders,
    dailySummaries: mockDailySummaries,
    modifierTemplates: [
      { id: 't1', name: '甜度', options: ['正常', '半糖'] }
    ],
    discountRules: [
      { id: 1, name: '9折優惠', type: 'percentage', value: 0.9 },
      { id: 2, name: '折抵10元', type: 'amount', value: 10 }
    ],
    config: {
      storeName: 'Smart POS',
      dineInMode: 'postPay',
      enableCreditCard: true,
      enableMobilePayment: true,
      enableVirtualNumpad: false
    },
    shift: {
      isOpen: true,
      businessDate: '2024-02-01',
      openedAt: '2024-02-01 09:00:00'
    },
    modal: { isOpen: false },

    // RBAC 新增狀態與方法
    users: mockUsers,
    roles: mockRoles,
    currentUser: defaultUser,
    hasPermission: vi.fn((permKey) => {
      if (!defaultUser) return false;
      const userRole = mockRoles.find(r => r.id === defaultUser.roleId);
      return userRole ? userRole.permissions.includes(permKey) : false;
    }),

    setCurrentUser: vi.fn(),
    setMenu: vi.fn(),
    setOrders: vi.fn(),
    setDailySummaries: vi.fn(),
    setConfig: vi.fn(),
    setDiscountRules: vi.fn(),
    setShift: vi.fn(),
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
    ...overrides
  };
};

describe('POSPage (收銀功能) UI 與邏輯測試', () => {
  test('搜尋功能應能正確過濾商品', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <POSPage />
      </POSContext.Provider>
    );
    const searchInput = screen.getByPlaceholderText(/搜尋商品名稱/i);
    fireEvent.change(searchInput, { target: { value: '拿鐵' } });

    expect(screen.getByText(/經典拿鐵/i)).toBeDefined();
    expect(screen.queryByText(/招牌美式/i)).toBeNull();
  });

  test('不可用商品應顯示暫不供應', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <POSPage />
      </POSContext.Provider>
    );
    expect(screen.getByText(/起司蛋糕/i)).toBeDefined();
    expect(screen.getByText(/暫不供應/i)).toBeDefined();
  });
});

describe('OrderManagementPage (訂單管理) UI 測試', () => {
  test('應具有待收款與已付清頁籤，且內容正確對應', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <OrderManagementPage />
      </POSContext.Provider>
    );

    expect(screen.getByText(/#D002/i)).toBeDefined();
    expect(screen.queryByText(/#D001/i)).toBeNull();

    const completedTab = screen.getByText(/已付清 \/ 已作廢/i);
    fireEvent.click(completedTab);

    expect(screen.getByText(/#D001/i)).toBeDefined();
    expect(screen.queryByText(/#D002/i)).toBeNull();
  });
});

describe('SettlementPage (結算作業) UI 測試', () => {
  test('營業中應顯示當前總額與結算按鈕', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <SettlementPage />
      </POSContext.Provider>
    );
    expect(screen.getByText(/營業日 2024-02-01 當前總額/i)).toBeDefined();
    const revenueElements = screen.getAllByText(/\$150/i);
    expect(revenueElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/先行結算/i)).toBeDefined();
    expect(screen.getByText(/日結關帳/i)).toBeDefined();
  });
});

describe('DashboardPage (報表分析) 雙頁籤深度測試', () => {
  test('1. 日結報表頁籤：應正確顯示歷史彙整與分頁控制', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <DashboardPage />
      </POSContext.Provider>
    );
    expect(screen.getByText(/2024-02-01 彙整報表/i)).toBeDefined();
    const summaryCard = screen.getByText(/2024-02-01 彙整報表/i);
    fireEvent.click(summaryCard);
    expect(screen.getByText(/銷量統計/i)).toBeDefined();
    expect(screen.getByText(/平均客單/i)).toBeDefined();
  });

  test('2. 單據查詢頁籤：應可透過 SN 或 Order No 搜尋單據', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <DashboardPage />
      </POSContext.Provider>
    );
    const searchTab = screen.getByText(/單據查詢/i);
    fireEvent.click(searchTab);
    expect(screen.getByText(/請輸入關鍵字開始搜尋單據/i)).toBeDefined();
    const searchInput = screen.getByPlaceholderText(/輸入 SN序號 \/ 訂單號碼/i);
    fireEvent.change(searchInput, { target: { value: 'D001' } });
    expect(screen.getByText(/====== 消費明細 ======/i)).toBeDefined();
    expect(screen.getByText(/202402010000001/i)).toBeDefined();
    expect(screen.getByText(/uuid-1234-5678/i)).toBeDefined();
  });
});

describe('DatabaseViewPage (原始數據) UI 測試', () => {
  test('應正確渲染資料表格及分頁選擇器', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <DatabaseViewPage />
      </POSContext.Provider>
    );
    expect(screen.getByText(/OrderNo \/ Serial/i)).toBeDefined();
    const selectElement = screen.getByDisplayValue('25 筆 / 頁');
    expect(selectElement).toBeDefined();
  });
});

describe('AdminPage (店務管理) 三頁籤切換測試', () => {
  test('應可正常切換菜單設定、客製模組、優惠方案', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <AdminPage />
      </POSContext.Provider>
    );

    const menuElements = screen.getAllByText(/新增商品|編輯商品內容/i);
    expect(menuElements.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '客製模組' }));
    expect(screen.getByText(/建立新模組/i)).toBeDefined();
    expect(screen.getByText(/全域客製模組庫/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: '優惠方案' }));
    expect(screen.getByText(/新增優惠/i)).toBeDefined();
    expect(screen.getByText(/9折優惠/i)).toBeDefined();
  });
});

describe('StaffManagementPage (員工與權限管理) UI 測試', () => {
  test('應可正常切換員工帳號與權限角色頁籤', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <StaffManagementPage />
      </POSContext.Provider>
    );
    expect(screen.getByText(/建立新員工帳號/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /權限角色/i }));
    expect(screen.getByText(/自訂新角色/i)).toBeDefined();
  });

  test('應正確渲染現有員工列表', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <StaffManagementPage />
      </POSContext.Provider>
    );

    // 驗證預設的 mockUsers 是否成功顯示在列表中
    expect(screen.getByText('系統工程師')).toBeDefined();
    expect(screen.getByText('店長')).toBeDefined();
    expect(screen.getByText('櫃檯人員')).toBeDefined();

    // 驗證帳號名稱是否出現
    expect(screen.getByText('dev')).toBeDefined();
    expect(screen.getByText('admin')).toBeDefined();
  });

  test('權限角色頁籤應正確標示 System Default (系統預設角色)', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <StaffManagementPage />
      </POSContext.Provider>
    );

    // 切換至權限角色頁籤
    fireEvent.click(screen.getByRole('button', { name: /權限角色/i }));

    // 驗證預設角色是否有渲染
    expect(screen.getByText('開發者')).toBeDefined();
    expect(screen.getByText('店舖主管')).toBeDefined();

    // 驗證是否有加上防呆的 System Default 標籤 (預設共有三個：developer, manager, staff)
    const defaultTags = screen.getAllByText(/System Default/i);
    expect(defaultTags.length).toBe(3);
  });

  test('操作防呆：嘗試刪除系統核心開發者帳號時應觸發警告', () => {
    const mockShowAlert = vi.fn();
    render(
      <POSContext.Provider value={getMockContextValue({ showAlert: mockShowAlert })}>
        <StaffManagementPage />
      </POSContext.Provider>
    );

    // 抓取所有刪除按鈕 (根據 mockUsers 順序，第 0 個是 dev)
    const deleteButtons = screen.getAllByTitle('刪除帳號');
    fireEvent.click(deleteButtons[0]);

    // 驗證是否呼叫了阻擋刪除的 showAlert
    expect(mockShowAlert).toHaveBeenCalledWith('操作拒絕', '系統核心開發者帳號無法刪除，以防系統失聯。', 'danger');
  });
});

describe('SettingsPage (系統設定) UI 測試', () => {
  test('應正確渲染設定選項與自訂提醒文字', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <SettingsPage />
      </POSContext.Provider>
    );
    expect(screen.getByText(/系統參數設定/i)).toBeDefined();
    expect(screen.getByText(/在此更改的所有設定將立即生效/i)).toBeDefined();
    expect(screen.getByText(/內用結帳模式/i)).toBeDefined();
    expect(screen.getByText(/支付通路管理 Integration/i)).toBeDefined();
  });
});

describe('CheckoutModal (結帳視窗) UI 與邏輯測試', () => {
  test('應具有數字步驟標示，且 Keypad 輸入應反映在實收金額', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <CheckoutModal
          isOpen={true}
          cartTotal={100}
          items={[{ id: 1, name: '測試商品', price: 100, quantity: 1 }]}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </POSContext.Provider>
    );

    expect(screen.getByText(/1. 選擇支付方式/i)).toBeDefined();
    expect(screen.getByText(/2. 套用優惠方案/i)).toBeDefined();
    expect(screen.getByText(/3. 收受金額與找零/i)).toBeDefined();
    expect(screen.getByText(/4. 確認完成結帳/i)).toBeDefined();

    const key5 = screen.getByRole('button', { name: '5' });
    const key0 = screen.getByRole('button', { name: '0' });

    fireEvent.click(key5);
    fireEvent.click(key0);
    fireEvent.click(key0);

    expect(screen.getByText('500')).toBeDefined();
  });
});

describe('LoginPage (登入頁面) UI 測試', () => {
  test('應正確渲染登入表單並包含對應的 placeholder', () => {
    // 修正：狀態從 isLoggedIn: false 變為 currentUser: null
    const loginContext = getMockContextValue({ currentUser: null });
    render(
      <POSContext.Provider value={loginContext}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </POSContext.Provider>
    );
    expect(screen.getByText(/登入您的帳戶/i)).toBeDefined();

    // 修正：對齊 RBAC 新版本的 Placeholder 文案，注意這裡使用的是半形冒號「:」
    expect(screen.getByPlaceholderText(/例如: admin/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/輸入密碼/i)).toBeDefined();
  });
});

describe('Sidebar & Navigation (導覽與結構) 測試', () => {
  test('應正確顯示商店名稱、班次狀態與導覽選單項目', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </POSContext.Provider>
    );
    expect(screen.getByText(/Smart POS/i)).toBeDefined();
    expect(screen.getByText(/營業中/i)).toBeDefined();
    expect(screen.getByText(/櫃檯收銀/i)).toBeDefined();
    expect(screen.getByText(/結算作業/i)).toBeDefined();
    expect(screen.getByText(/原始數據/i)).toBeDefined();
    // 檢查是否有新增的員工管理頁籤
    expect(screen.getByText(/員工與權限/i)).toBeDefined();
  });
});

describe('VoidReasonModal (作廢確認) 邏輯測試', () => {
  test('應顯示預設原因按鈕並可供點擊傳遞值', () => {
    const onConfirm = vi.fn();
    render(<VoidReasonModal isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} />);

    expect(screen.getByText(/點錯品項/i)).toBeDefined();

    fireEvent.click(screen.getByText(/客人取消/i));
    fireEvent.click(screen.getByText(/確認作廢/i));

    expect(onConfirm).toHaveBeenCalledWith('客人取消');
  });
});