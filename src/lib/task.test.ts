import { describe, expect, it } from "vitest";
import { validateTaskInput } from "./task";

const validInput = { title: "買い物に行く", description: "", status: "todo" };

describe("validateTaskInput", () => {
  describe("タイトル", () => {
    it("1文字の場合、有効と判定する", () => {
      expect(validateTaskInput({ ...validInput, title: "a" })).toEqual({
        ok: true,
        value: { ...validInput, title: "a" },
      });
    });

    it("100文字ちょうどの場合、有効と判定する", () => {
      const result = validateTaskInput({ ...validInput, title: "あ".repeat(100) });

      expect(result.ok).toBe(true);
    });

    it("101文字の場合、文字数超過のエラーを返す", () => {
      expect(validateTaskInput({ ...validInput, title: "あ".repeat(101) })).toEqual({
        ok: false,
        errors: { title: "タイトルは100文字以内で入力してください" },
      });
    });

    it("絵文字を含む場合、見た目の文字数で数えて100文字までを有効と判定する", () => {
      expect(validateTaskInput({ ...validInput, title: "😀".repeat(100) }).ok).toBe(true);
      expect(validateTaskInput({ ...validInput, title: "😀".repeat(101) }).ok).toBe(false);
    });

    it("空文字の場合、入力必須のエラーを返す", () => {
      expect(validateTaskInput({ ...validInput, title: "" })).toEqual({
        ok: false,
        errors: { title: "タイトルを入力してください" },
      });
    });

    it("空白のみの場合、入力必須のエラーを返す", () => {
      expect(validateTaskInput({ ...validInput, title: " 　\t" })).toEqual({
        ok: false,
        errors: { title: "タイトルを入力してください" },
      });
    });

    it("前後に空白がある場合、取り除いた値を返す", () => {
      expect(validateTaskInput({ ...validInput, title: "  資料作成  " })).toEqual({
        ok: true,
        value: { ...validInput, title: "資料作成" },
      });
    });

    it("前後の空白を除いて100文字の場合、有効と判定する", () => {
      const result = validateTaskInput({
        ...validInput,
        title: ` ${"あ".repeat(100)} `,
      });

      expect(result.ok).toBe(true);
    });
  });

  describe("説明", () => {
    it("空の場合、有効と判定する", () => {
      expect(validateTaskInput({ ...validInput, description: "" }).ok).toBe(true);
    });

    it("1000文字ちょうどの場合、有効と判定する", () => {
      const result = validateTaskInput({ ...validInput, description: "a".repeat(1000) });

      expect(result.ok).toBe(true);
    });

    it("1001文字の場合、文字数超過のエラーを返す", () => {
      expect(validateTaskInput({ ...validInput, description: "a".repeat(1001) })).toEqual({
        ok: false,
        errors: { description: "説明は1000文字以内で入力してください" },
      });
    });

    it("前後に空白がある場合、取り除いた値を返す", () => {
      expect(validateTaskInput({ ...validInput, description: "\n メモ \n" })).toEqual({
        ok: true,
        value: { ...validInput, description: "メモ" },
      });
    });
  });

  describe("ステータス", () => {
    it.each(["todo", "in_progress", "done"])("%s の場合、有効と判定する", (status) => {
      expect(validateTaskInput({ ...validInput, status }).ok).toBe(true);
    });

    it("定義外の値の場合、ステータス不正のエラーを返す", () => {
      expect(validateTaskInput({ ...validInput, status: "archived" })).toEqual({
        ok: false,
        errors: { status: "ステータスが不正です" },
      });
    });
  });

  it("複数の項目が不正な場合、すべての項目のエラーを返す", () => {
    expect(
      validateTaskInput({ title: "", description: "a".repeat(1001), status: "x" }),
    ).toEqual({
      ok: false,
      errors: {
        title: "タイトルを入力してください",
        description: "説明は1000文字以内で入力してください",
        status: "ステータスが不正です",
      },
    });
  });
});
