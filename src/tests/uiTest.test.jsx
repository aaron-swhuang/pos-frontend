import { render, screen, fireEvent, within } from '@testing-library/react';
import { expect, test } from 'vitest';
// 1. 確保 App.jsx 有 export POSContext 與 CheckoutModal
import { CheckoutModal, POSContext, DashboardPage } from '../App';

test('結帳視窗 UI 快照應保持一致', () => {
  // 2. 準備模擬用的 Context 資料
  const mockContextValue = {
    config: { enableCreditCard: true, enableMobilePayment: true },
    discountRules: [
      { id: 1, name: '9折優惠', type: 'percentage', value: 0.9 }
    ]
  };

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

/**
 * 模擬測試資料
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

describe('DashboardPage (報表分析) 深度保護測試', () => {
  const contextValue = {
    orders: mockOrders,
    dailySummaries: mockDailySummaries,
    setDailySummaries: vi.fn(),
    setOrders: vi.fn()
  };

  test('1. 應正確計算並顯示當前累計營收', () => {
    render(
      <POSContext.Provider value={contextValue}>
        <DashboardPage />
      </POSContext.Provider>
    );

    // 修正：由於 $150 可能出現在「總營收」與「支付分佈」中，使用 getAllByText
    const revenueElements = screen.getAllByText(/\$150/);
    expect(revenueElements.length).toBeGreaterThan(0);

    // 或者更精確地檢查標題下方的數值
    expect(screen.getByText(/今日營收 \(排除作廢\)/i)).toBeDefined();
  });

  test('2. 歷史彙整報表應可點擊展開並顯示銷量統計', () => {
    render(
      <POSContext.Provider value={contextValue}>
        <DashboardPage />
      </POSContext.Provider>
    );

    // 點擊卡片展開
    const summaryCard = screen.getByText(/2024\/2\/1 彙整報表/i);
    fireEvent.click(summaryCard);

    // 檢查展開內容
    expect(screen.getByText(/銷量統計/i)).toBeDefined();
    expect(screen.getByText(/招牌美式/i)).toBeDefined();
  });

  test('3. 原始訂單明細區塊應存在且可正確展開', async () => {
    const { asFragment } = render(
      <POSContext.Provider value={contextValue}>
        <DashboardPage />
      </POSContext.Provider>
    );

    // 展開彙整卡片
    const summaryCard = screen.getByText(/2024\/2\/1 彙整報表/i);
    fireEvent.click(summaryCard);

    // 檢查「原始訂單明細」標題是否存在
    const detailHeader = screen.getByText(/原始訂單明細/i);
    expect(detailHeader).toBeDefined();

    // 建立快照鎖定 UI 結構
    expect(asFragment()).toMatchSnapshot();
  });

  test('4. 交易明細分頁切換應正確顯示訂單內容', () => {
    render(
      <POSContext.Provider value={contextValue}>
        <DashboardPage />
      </POSContext.Provider>
    );

    // 切換至交易明細分頁
    const historyTab = screen.getByText(/交易明細/i);
    fireEvent.click(historyTab);

    // 檢查訂單編號
    expect(screen.getByText(/#D001/i)).toBeDefined();

    // 點擊展開單筆訂單
    fireEvent.click(screen.getByText(/#D001/i));

    // 檢查展開後的內容
    expect(screen.getByText(/單價 \$75/i)).toBeDefined();
  });
});