import { describe, expect, it } from "vitest";
import {
  checkoutFormSchema,
  orderItemsSchema,
  placeOrderSchema,
  toFieldErrors,
  VN_PHONE_REGEX,
} from "./checkout-schema";

const validForm = {
  fullName: "Nguyễn Văn A",
  phone: "0912345678",
  email: "",
  address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
  note: "",
  shippingMethod: "standard",
  paymentMethod: "cod",
};

describe("VN_PHONE_REGEX", () => {
  it.each(["0912345678", "0387654321", "+84912345678"])("chấp nhận %s", (phone) => {
    expect(VN_PHONE_REGEX.test(phone)).toBe(true);
  });

  it.each(["091234567", "0212345678", "84912345678", "09123456789", "abc"])(
    "từ chối %s",
    (phone) => {
      expect(VN_PHONE_REGEX.test(phone)).toBe(false);
    },
  );
});

describe("checkoutFormSchema", () => {
  it("chấp nhận dữ liệu hợp lệ, email để trống", () => {
    expect(checkoutFormSchema.safeParse(validForm).success).toBe(true);
  });

  it("trả về lỗi theo từng field", () => {
    const result = checkoutFormSchema.safeParse({
      ...validForm,
      fullName: "A",
      phone: "123",
      email: "khong-phai-email",
      address: "ngắn",
    });
    expect(result.success).toBe(false);
    const errors = toFieldErrors(result.error!);
    expect(Object.keys(errors).sort()).toEqual(["address", "email", "fullName", "phone"]);
    expect(errors.phone).toMatch(/Số điện thoại không hợp lệ/);
  });

  it("từ chối phương thức giao hàng không hỗ trợ", () => {
    const result = checkoutFormSchema.safeParse({ ...validForm, shippingMethod: "drone" });
    expect(result.success).toBe(false);
  });
});

describe("placeOrderSchema - mã giảm giá", () => {
  const validOrder = (overrides: Record<string, unknown> = {}) => ({
    customer: { fullName: "Nguyễn Văn A", phone: "0912345678", address: "12 Nguyễn Huệ, Quận 1" },
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [{ productId: "p010", quantity: 2 }],
    ...overrides,
  });

  it("không có mã giảm giá vẫn hợp lệ", () => {
    const result = placeOrderSchema.safeParse(validOrder());
    expect(result.success).toBe(true);
    expect(result.data?.couponCode).toBeUndefined();
  });

  it("chuẩn hóa mã: bỏ khoảng trắng và chuyển chữ in hoa", () => {
    const result = placeOrderSchema.safeParse(validOrder({ couponCode: " shoplite10 " }));
    expect(result.data?.couponCode).toBe("SHOPLITE10");
  });

  it.each(["", "   "])("chuỗi rỗng sau khi trim (%j) coi như không có mã", (couponCode) => {
    const result = placeOrderSchema.safeParse(validOrder({ couponCode }));
    expect(result.success).toBe(true);
    expect(result.data?.couponCode).toBeUndefined();
  });

  it("mã dài 32 ký tự hợp lệ, 33 ký tự bị từ chối tại trường couponCode", () => {
    expect(placeOrderSchema.safeParse(validOrder({ couponCode: "A".repeat(32) })).success).toBe(
      true,
    );
    const result = placeOrderSchema.safeParse(validOrder({ couponCode: "A".repeat(33) }));
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!)).toHaveProperty("couponCode");
  });

  it("mã không phải chuỗi bị từ chối tại trường couponCode", () => {
    const result = placeOrderSchema.safeParse(validOrder({ couponCode: 123 }));
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!)).toHaveProperty("couponCode");
  });

  it("loại bỏ mọi trường tiền do client gửi lên", () => {
    const result = placeOrderSchema.safeParse(
      validOrder({ couponCode: "GIAM50K", discount: 999_999, subtotal: 1, total: 0 }),
    );
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("discount");
    expect(result.data).not.toHaveProperty("subtotal");
    expect(result.data).not.toHaveProperty("total");
  });
});

describe("orderItemsSchema", () => {
  it("cần ít nhất một dòng sản phẩm", () => {
    expect(orderItemsSchema.safeParse([]).success).toBe(false);
  });

  it("số lượng mỗi dòng từ 1 đến 10", () => {
    expect(orderItemsSchema.safeParse([{ productId: "p010", quantity: 1 }]).success).toBe(true);
    expect(orderItemsSchema.safeParse([{ productId: "p010", quantity: 10 }]).success).toBe(true);
    expect(orderItemsSchema.safeParse([{ productId: "p010", quantity: 0 }]).success).toBe(false);
    expect(orderItemsSchema.safeParse([{ productId: "p010", quantity: 11 }]).success).toBe(false);
  });
});
