import { render, screen, fireEvent, within } from '@testing-library/react';
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
} from '../App';

/**
 * 模擬全域 Context 資料
 */
const mockOrders = [
  {
    id: 1,
    orderNo: 'D001',
    date: new Date().toLocaleDateString(),
    total: 150,
    status: 'unclosed',
    paymentStatus: 'paid',
    orderType: 'dineIn',
    paymentMethod: 'Cash',
    items: [{ name: '招牌美式', price: 75, quantity: 2 }]
  },
  {
    id: 2,
    orderNo: 'D002',
    date: new Date().toLocaleDateString(),
    total: 85,
    status: 'unclosed',
    paymentStatus: 'pending',
    orderType: 'dineIn',
    items: [{ name: '經典拿鐵', price: 85, quantity: 1 }]
  }
];

const mockDailySummaries = [
  {
    id: 'summary_1',
    date: '2024/2/1',
    total: 300,
    orderCount: 2,
    closedAt: '2024/2/1 22:00:00',
    itemSales: { '招牌美式': 4 },
    typeCount: { dineIn: 2, takeOut: 0 },
    relatedOrderIds: [1, 2]
  }
];

const mockContextValue = {
  menu: [
    { id: 1, name: '招牌美式', price: 65, category: '咖啡', isAvailable: true },
    { id: 2, name: '經典拿鐵', price: 85, category: '咖啡', isAvailable: true },
    { id: 3, name: '起司蛋糕', price: 95, category: '甜點', isAvailable: true }
  ],
  orders: mockOrders,
  dailySummaries: mockDailySummaries,
  discountRules: [{ id: 1, name: '9折優惠', type: 'percentage', value: 0.9 }],
  config: {
    storeName: 'Smart POS',
    dineInMode: 'post Pay',
    enableCreditCard: true,
    enableMobilePayment: true
  },
  isLoggedIn: true,
  setIsLoggedIn: vi.fn(),
  setMenu: vi.fn(),
  setOrders: vi.fn(),
  setDailySummaries: vi.fn(),
  setConfig: vi.fn(),
  setDiscountRules: vi.fn(),
};

describe('POSPage (收銀功能) 邏輯測試', () => {
  test('搜尋功能應能正確過濾商品', () => {
    render(
      <POSContext.Provider value={mockContextValue}>
        <POSPage />
      </POSContext.Provider>
    );
    const searchInput = screen.getByPlaceholderText(/搜尋/i);
    fireEvent.change(searchInput, { target: { value: '起司' } });

    expect(screen.getByText(/起司蛋糕/i)).toBeDefined();
    expect(screen.queryByText(/招牌美式/i)).toBeNull();
  });

  test('切換類別應顯示對應商品', () => {
    render(
      <POSContext.Provider value={mockContextValue}>
        <POSPage />
      </POSContext.Provider>
    );
    const categoryButton = screen.getByText('甜點');
    fireEvent.click(categoryButton);

    expect(screen.getByText(/起司蛋糕/i)).toBeDefined();
    expect(screen.queryByText(/經典拿鐵/i)).toBeNull();
  });
});

describe('OrderManagementPage (訂單管理) 邏輯測試', () => {
  test('應區分顯示待收款與已完成清單 (不限日期)', () => {
    render(
      <POSContext.Provider value={mockContextValue}>
        <OrderManagementPage />
      </POSContext.Provider>
    );

    // 待收款區應包含 D002 (pending)
    const pendingSection = screen.getByText(/待收款區/i).parentElement;
    expect(within(pendingSection).getByText(/#D002/i)).toBeDefined();

    // 已完成區應包含 D001 (paid)
    const completedSection = screen.getByText(/已付款\/作廢單 \(未日結\)/i).parentElement;
    expect(within(completedSection).getByText(/#D001/i)).toBeDefined();
  });
});

// --- 既有測試項目 (保留並整合) ---

test('結帳視窗 UI 快照應保持一致', () => {
  const { asFragment } = render(
    <POSContext.Provider value={mockContextValue}>
      <CheckoutModal
        isOpen={true}
        cartTotal={100}
        items={[{ id: 1, name: '測試商品', price: 100, quantity: 1 }]}
        onClose={() => { }}
        onConfirm={() => { }}
      />
    </POSContext.Provider>
  );
  expect(asFragment()).toMatchSnapshot();
});

describe('DashboardPage (報表分析) 深度保護測試', () => {
  test('1. 應正確計算並顯示當前累計營收', () => {
    render(
      <POSContext.Provider value={mockContextValue}>
        <DashboardPage />
      </POSContext.Provider>
    );
    const revenueElements = screen.getAllByText(/\$150/);
    expect(revenueElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/目前累計營收 \(未日結\)/i)).toBeDefined();
  });

  test('2. 歷史彙整報表應可點擊展開並顯示銷量統計', () => {
    render(
      <POSContext.Provider value={mockContextValue}>
        <DashboardPage />
      </POSContext.Provider>
    );
    const summaryCard = screen.getByText(/2024\/2\/1 彙整報表/i);
    fireEvent.click(summaryCard);
    expect(screen.getByText(/銷量統計/i)).toBeDefined();
    expect(screen.getByText(/招牌美式/i)).toBeDefined();
  });

  test('3. 原始訂單明細區塊應存在且可正確展開', async () => {
    const { asFragment } = render(
      <POSContext.Provider value={mockContextValue}>
        <DashboardPage />
      </POSContext.Provider>
    );
    const summaryCard = screen.getByText(/2024\/2\/1 彙整報表/i);
    fireEvent.click(summaryCard);
    expect(screen.getByText(/原始訂單明細/i)).toBeDefined();
    expect(asFragment()).toMatchSnapshot();
  });

  test('4. 交易明細分頁切換應正確顯示訂單內容', () => {
    render(
      <POSContext.Provider value={mockContextValue}>
        <DashboardPage />
      </POSContext.Provider>
    );
    const historyTab = screen.getByText(/交易明細/i);
    fireEvent.click(historyTab);
    expect(screen.getByText(/#D001/i)).toBeDefined();
    fireEvent.click(screen.getByText(/#D001/i));
    expect(screen.getByText(/單價 \$75/i)).toBeDefined();
  });
});

// --- 新增測試項目 (完善全組件覆蓋) ---

describe('LoginPage (登入頁面) 測試', () => {
  test('應正確渲染登入表單並包含必要欄位', () => {
    const loginContext = { ...mockContextValue, isLoggedIn: false };
    render(
      <POSContext.Provider value={loginContext}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </POSContext.Provider>
    );
    expect(screen.getByText(/POS 系統登入/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/admin/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/1234/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /進入系統/i })).toBeDefined();
  });
});

describe('Sidebar & Navigation (導覽與結構) 測試', () => {
  test('應正確顯示商店名稱與導覽選單項目', () => {
    render(
      <POSContext.Provider value={mockContextValue}>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </POSContext.Provider>
    );
    expect(screen.getByText(/Smart POS/i)).toBeDefined();
    expect(screen.getByText(/櫃檯收銀/i)).toBeDefined();
    expect(screen.getByText(/訂單管理/i)).toBeDefined();
    expect(screen.getByText(/報表分析/i)).toBeDefined();
  });
});

describe('VoidReasonModal (作廢確認) 邏輯測試', () => {
  test('應顯示預設原因按鈕並可供點擊', () => {
    const onConfirm = vi.fn();
    render(<VoidReasonModal isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} />);

    expect(screen.getByText(/點錯品項/i)).toBeDefined();

    fireEvent.click(screen.getByText(/客人取消/i));
    fireEvent.click(screen.getByText(/確認作廢/i));

    expect(onConfirm).toHaveBeenCalledWith('客人取消');
  });
});

describe('AdminPage (店務管理) 測試', () => {
  test('菜單設定與優惠方案頁籤切換邏輯', () => {
    // 假設目前在路由 /admin
    render(
      <POSContext.Provider value={mockContextValue}>
        <MemoryRouter initialEntries={['/admin']}>
          <AdminPage />
        </MemoryRouter>
      </POSContext.Provider>
    );

    // 檢查初始為菜單設定
    expect(screen.getByText(/商品名稱/i)).toBeDefined();

    // 切換至優惠方案
    const discountTab = screen.getByText(/優惠方案/i);
    fireEvent.click(discountTab);
    expect(screen.getByText(/方案名稱/i)).toBeDefined();
  });
});

describe('SettingsPage (系統設定) 測試', () => {
  test('應正確渲染設定選項與提醒文字', () => {
    render(
      <POSContext.Provider value={mockContextValue}>
        <MemoryRouter initialEntries={['/settings']}>
          <SettingsPage />
        </MemoryRouter>
      </POSContext.Provider>
    );
    expect(screen.getByText(/系統參數設定/i)).toBeDefined();
    expect(screen.getByText(/提醒：在此更改的所有設定將立即生效/i)).toBeDefined();
    expect(screen.getByText(/內用結帳流程/i)).toBeDefined();
    expect(screen.getByText(/收款管道設定/i)).toBeDefined();
  });
});

describe('Checkout Logic (結帳互動) 測試', () => {
  test('Keypad 點擊輸入應反映在實收金額', () => {
    render(
      <POSContext.Provider value={mockContextValue}>
        <CheckoutModal
          isOpen={true}
          cartTotal={100}
          items={[{ id: 1, name: '測試商品', price: 100, quantity: 1 }]}
          onClose={() => { }}
          onConfirm={() => { }}
        />
      </POSContext.Provider>
    );

    const key5 = screen.getByRole('button', { name: '5' });
    const key0 = screen.getByRole('button', { name: '0' });

    fireEvent.click(key5);
    fireEvent.click(key0);

    // 檢查畫面上的實收金額是否變為 500
    expect(screen.getByText('50')).toBeDefined();
  });
});