/**
 * POS 系統核心運算邏輯
 */

// 1. 最終金額與折扣計算
export const calculateFinalTotal = (subtotal, discountValue, discountType) => {
  if (!subtotal || subtotal < 0) return 0;
  let finalTotal = subtotal;

  if (discountType === 'percentage') {
    // discountValue 0.85 代表 85 折，應付金額為 150 * 0.85 = 127.5
    // 直接對結果取四捨五入
    finalTotal = Math.round(subtotal * discountValue);
  } else {
    // 處理定額折抵 (例如折 10 元)
    const discountAmount = discountValue || 0;
    finalTotal = subtotal - discountAmount;
  }

  return Math.max(0, finalTotal);
};

// 2. 找零計算
export const calculateChange = (cashReceived, finalTotal) => {
  const cash = parseFloat(cashReceived) || 0;
  return cash - finalTotal;
};

// 3. 購物車累加/更新邏輯
export const getUpdatedCart = (prevCart, newItem) => {
  const existingItem = prevCart.find(i => i.id === newItem.id);
  if (existingItem) {
    return prevCart.map(i =>
      i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i
    );
  }
  return [...prevCart, { ...newItem, quantity: 1 }];
};

