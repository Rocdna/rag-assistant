/**
 * 文档元数据管理 API
 *
 * 功能：
 * - GET: 获取用户所有文档列表
 * - POST: 创建文档记录
 * - PUT: 更新文档状态（indexed / chunk_count）
 * - DELETE: 删除文档记录
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

// ============================================================
// GET - 获取用户文档列表
// ============================================================
export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: '缺少用户身份' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return Response.json({ documents: data });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================
// POST - 创建文档记录（上传后调用）
// ============================================================
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: '缺少用户身份' }, { status: 401 });
    }

    const { id, name, size, type } = await req.json();

    if (!id || !name || !size || !type) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('documents')
      .upsert(
        { id, user_id: userId, name, size, type, indexed: false, chunk_count: 0 },
        { onConflict: 'user_id,name' }
      )
      .select()
      .single();

    if (error) throw error;

    return Response.json({ document: data });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================
// PUT - 更新文档状态（索引完成后调用）
// ============================================================
export async function PUT(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: '缺少用户身份' }, { status: 401 });
    }

    const { id, indexed, chunk_count } = await req.json();

    if (!id) {
      return Response.json({ error: '缺少文档ID' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof indexed === 'boolean') updates.indexed = indexed;
    if (typeof chunk_count === 'number') updates.chunk_count = chunk_count;

    const { data, error } = await supabaseAdmin
      .from('documents')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId) // 双重保险：用户只能更新自己的文档
      .select()
      .single();

    if (error) throw error;

    return Response.json({ document: data });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================
// DELETE - 删除文档记录
// ============================================================
export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: '缺少用户身份' }, { status: 401 });
    }

    const { documentId } = await req.json();

    if (!documentId) {
      return Response.json({ error: '缺少文档ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId); // 双重保险

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
