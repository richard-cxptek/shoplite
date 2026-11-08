// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = path.join(process.cwd(), "src");

/** Module chỉ được dùng phía server: import vào Client Component sẽ lộ danh sách mã / dùng node:fs. */
const SERVER_ONLY_MODULES = [
  "@/data/coupons",
  "@/features/coupons/coupon-service",
  "@/features/orders/server",
];

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [fullPath] : [];
  });
}

function importsOf(source: string): string[] {
  return [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
}

/** Chuyển import tương đối ("../coupon-service") về dạng alias ("@/features/coupons/coupon-service"). */
function toAlias(file: string, specifier: string): string {
  if (!specifier.startsWith(".")) return specifier;
  const resolved = path.relative(SRC_DIR, path.resolve(path.dirname(file), specifier));
  return `@/${resolved.split(path.sep).join("/")}`;
}

describe("ranh giới client/server", () => {
  const clientFiles = listSourceFiles(SRC_DIR).filter((file) =>
    /^\s*["']use client["']/.test(readFileSync(file, "utf8")),
  );

  it("tìm thấy các Client Component để kiểm tra", () => {
    expect(clientFiles.length).toBeGreaterThan(0);
    expect(clientFiles.some((file) => file.endsWith("coupon-field.tsx"))).toBe(true);
  });

  it("Client Component không import dữ liệu mã giảm giá hay module chỉ chạy ở server", () => {
    const violations = clientFiles.flatMap((file) =>
      importsOf(readFileSync(file, "utf8"))
        .map((specifier) => toAlias(file, specifier))
        .filter((alias) => SERVER_ONLY_MODULES.includes(alias))
        .map((alias) => `${path.relative(SRC_DIR, file)} → ${alias}`),
    );

    expect(violations).toEqual([]);
  });
});
