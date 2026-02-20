import { render, screen, fireEvent, within } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach } from 'vitest';
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
  SettlementPage
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
    status: 'unclosed', // 修正：改回 unclosed，這樣才會出現在「訂單管理 (未日結)」頁面中
    paymentStatus: 'paid',
    orderType: 'dineIn',
    paymentMethod: 'Cash',
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
    paymentStatus: 'pending', // 待收款
    orderType: 'dineIn',
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

// 將 Context Value 抽離成一個 function 方便每個 test 獨立使用並可覆寫
const getMockContextValue = (overrides = {}) => ({
  menu: [
    { id: 1, name: '招牌美式', price: 65, category: '咖啡', isAvailable: true },
    { id: 2, name: '經典拿鐵', price: 85, category: '咖啡', isAvailable: true },
    { id: 3, name: '起司蛋糕', price: 95, category: '甜點', isAvailable: false } // 暫不供應測試
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
    enableMobilePayment: true
  },
  shift: {
    isOpen: true,
    businessDate: '2024-02-01',
    openedAt: '2024-02-01 09:00:00'
  },
  isLoggedIn: true,
  modal: { isOpen: false },
  setIsLoggedIn: vi.fn(),
  setMenu: vi.fn(),
  setOrders: vi.fn(),
  setDailySummaries: vi.fn(),
  setConfig: vi.fn(),
  setDiscountRules: vi.fn(),
  setShift: vi.fn(),
  showAlert: vi.fn(),
  showConfirm: vi.fn(),
  ...overrides
});

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

    // 預設為待收款區
    expect(screen.getByText(/#D002/i)).toBeDefined();
    expect(screen.queryByText(/#D001/i)).toBeNull();

    // 切換至已付清頁籤
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
    // 檢查標題與金額 (只有 paid 且同日期的才算)
    expect(screen.getByText(/營業日 2024-02-01 當前總額/i)).toBeDefined();

    // 修正：因為畫面上會有多個 $150 (總額、現金分佈、訂單列表)，改用 getAllByText
    const revenueElements = screen.getAllByText(/\$150/i);
    expect(revenueElements.length).toBeGreaterThan(0);

    // 檢查操作按鈕
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

    // 檢查是否有日結報表
    expect(screen.getByText(/2024-02-01 彙整報表/i)).toBeDefined();

    // 點擊展開
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

    // 切換至單據查詢
    const searchTab = screen.getByText(/單據查詢/i);
    fireEvent.click(searchTab);

    // 尚未搜尋前應提示輸入
    expect(screen.getByText(/請輸入關鍵字開始搜尋單據/i)).toBeDefined();

    // 進行搜尋
    const searchInput = screen.getByPlaceholderText(/輸入 SN序號 \/ 訂單號碼/i);
    fireEvent.change(searchInput, { target: { value: 'D001' } });

    // 檢查感熱紙 UI 是否出現
    expect(screen.getByText(/====== 消費明細 ======/i)).toBeDefined();
    expect(screen.getByText(/202402010000001/i)).toBeDefined(); // SN
    expect(screen.getByText(/uuid-1234-5678/i)).toBeDefined(); // UUID
  });
});

describe('DatabaseViewPage (原始數據) UI 測試', () => {
  test('應正確渲染資料表格及分頁選擇器', () => {
    render(
      <POSContext.Provider value={getMockContextValue()}>
        <DatabaseViewPage />
      </POSContext.Provider>
    );

    // 檢查表格標題
    expect(screen.getByText(/OrderNo \/ Serial/i)).toBeDefined();

    // 檢查分頁筆數選擇器是否存在
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

    // 1. 預設為菜單設定
    // 修正：因為標題與按鈕都有「新增商品」字樣，改用 getAllByText
    const menuElements = screen.getAllByText(/新增商品|編輯商品內容/i);
    expect(menuElements.length).toBeGreaterThan(0);

    // 2. 切換至客製模組
    // 修正：使用 getByRole 鎖定按鈕，避免選到「已套用客製模組」等其他純文字
    fireEvent.click(screen.getByRole('button', { name: '客製模組' }));
    expect(screen.getByText(/建立新模組/i)).toBeDefined();
    expect(screen.getByText(/全域客製模組庫/i)).toBeDefined();

    // 3. 切換至優惠方案
    // 修正：同步使用 getByRole 鎖定按鈕以防萬一
    fireEvent.click(screen.getByRole('button', { name: '優惠方案' }));
    expect(screen.getByText(/新增優惠/i)).toBeDefined();
    expect(screen.getByText(/9折優惠/i)).toBeDefined();
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

    // 檢查步驟標題是否還原
    expect(screen.getByText(/1. 選擇支付方式/i)).toBeDefined();
    expect(screen.getByText(/2. 套用優惠方案/i)).toBeDefined();
    expect(screen.getByText(/3. 收受金額與找零/i)).toBeDefined();
    expect(screen.getByText(/4. 確認完成結帳/i)).toBeDefined();

    // 測試 Keypad 點擊
    const key5 = screen.getByRole('button', { name: '5' });
    const key0 = screen.getByRole('button', { name: '0' });

    fireEvent.click(key5);
    fireEvent.click(key0);
    fireEvent.click(key0);

    // 檢查畫面上的實收金額是否變為 500
    // 因為 5, 0, 0 連續點擊，預期 DOM 中有包含 '500' 的元素 (實收金額區塊)
    expect(screen.getByText('500')).toBeDefined();
  });
});

describe('LoginPage (登入頁面) UI 測試', () => {
  test('應正確渲染登入表單並包含對應的 placeholder', () => {
    const loginContext = getMockContextValue({ isLoggedIn: false });
    render(
      <POSContext.Provider value={loginContext}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </POSContext.Provider>
    );
    expect(screen.getByText(/POS 系統登入/i)).toBeDefined();

    // 修正：使用精確字串比對，避免正則表達式 /admin/i 同時匹配到 'posadmin'
    expect(screen.getByPlaceholderText('admin')).toBeDefined();
    // 測試 Placeholder 是否已更新為 posadmin
    expect(screen.getByPlaceholderText('posadmin')).toBeDefined();
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
    expect(screen.getByText(/營業中/i)).toBeDefined(); // 因 mockContext 的 shift 設為 isOpen: true
    expect(screen.getByText(/櫃檯收銀/i)).toBeDefined();
    expect(screen.getByText(/結算作業/i)).toBeDefined(); // 確認結算作業也有在導覽列
    expect(screen.getByText(/原始數據/i)).toBeDefined();
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