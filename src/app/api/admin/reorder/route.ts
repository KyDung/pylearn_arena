import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import pool from "@/lib/db";

// POST /api/admin/reorder - Đổi vị trí 2 items (swap order_num)
export const POST = withAuth(
  async (request: NextRequest) => {
    const body = await request.json();
    const { type, id, swap_with_id } = body;

    if (!type || !id || !swap_with_id) {
      return errorResponse("type, id và swap_with_id là bắt buộc");
    }

    const tableMap: Record<string, string> = {
      course: "courses",
      topic: "topics",
      lesson: "lessons",
      game: "games",
    };

    const table = tableMap[type];
    if (!table) {
      return errorResponse("type không hợp lệ (course/topic/lesson/game)");
    }

    // Lấy order_num của 2 items
    const [rows]: any = await pool.query(
      `SELECT id, order_num FROM ${table} WHERE id IN (?, ?)`,
      [id, swap_with_id],
    );

    if (rows.length !== 2) {
      return errorResponse("Không tìm thấy một hoặc cả hai items");
    }

    const itemA = rows.find((r: any) => r.id == id);
    const itemB = rows.find((r: any) => r.id == swap_with_id);

    if (!itemA || !itemB) {
      return errorResponse("Không tìm thấy items");
    }

    // Swap order_nums
    await pool.query(
      `UPDATE ${table} SET order_num = ? WHERE id = ?`,
      [itemB.order_num, itemA.id],
    );
    await pool.query(
      `UPDATE ${table} SET order_num = ? WHERE id = ?`,
      [itemA.order_num, itemB.id],
    );

    return successResponse({ swapped: true }, "Đã đổi vị trí thành công");
  },
  ["admin"],
);

// PUT /api/admin/reorder - Cập nhật order_num cho nhiều items cùng lúc (bulk)
export const PUT = withAuth(
  async (request: NextRequest) => {
    const body = await request.json();
    const { type, items } = body;

    if (!type || !Array.isArray(items) || items.length === 0) {
      return errorResponse("type và items[] là bắt buộc");
    }

    const tableMap: Record<string, string> = {
      course: "courses",
      topic: "topics",
      lesson: "lessons",
      game: "games",
    };

    const table = tableMap[type];
    if (!table) {
      return errorResponse("type không hợp lệ");
    }

    // Bulk update - gán order_num theo vị trí trong mảng (1-based)
    for (let i = 0; i < items.length; i++) {
      await pool.query(
        `UPDATE ${table} SET order_num = ? WHERE id = ?`,
        [i + 1, items[i].id],
      );
    }

    return successResponse({ updated: items.length }, "Đã cập nhật thứ tự thành công");
  },
  ["admin"],
);
