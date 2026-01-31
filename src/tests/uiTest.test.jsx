import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
// 1. 確保 App.jsx 有 export POSContext 與 CheckoutModal
import { CheckoutModal, POSContext } from '../App';

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