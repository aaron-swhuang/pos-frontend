import { describe, it, expect } from 'vitest';
import { calculateFinalTotal, calculateChange, getUpdatedCart } from '../utils/posLogic';

describe('金額與折扣計算', () => {
  it('應正確計算 9 折優惠 (100 -> 90)', () => {
    expect(calculateFinalTotal(100, 0.9, 'percentage')).toBe(90);
  });

  it('應正確計算 85 折優惠並處理四捨五入 (150 -> 128)', () => {
    // 150 * 0.85 = 127.5 -> 128
    expect(calculateFinalTotal(150, 0.85, 'percentage')).toBe(128);
  });

  it('定額折抵不應產生負數金額', () => {
    expect(calculateFinalTotal(50, 100, 'amount')).toBe(0);
  });
});

describe('找零邏輯', () => {
  it('應正確計算應找金額', () => {
    expect(calculateChange('1000', 850)).toBe(150);
  });

  it('金額不足時應回傳負數', () => {
    expect(calculateChange('500', 800)).toBe(-300);
  });
});

describe('購物車操作', () => {
  it('新增相同品項時應增加數量而非增加列數', () => {
    const cart = [{ id: 1, name: '咖啡', quantity: 1 }];
    const newItem = { id: 1, name: '咖啡' };
    const result = getUpdatedCart(cart, newItem);
    expect(result.length).toBe(1);
    expect(result[0].quantity).toBe(2);
  });
});

