import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const createInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  role: z.enum(["admin", "dev", "user"]),
});

export const createUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: roleCheck } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "dev"]);
    if (!roleCheck || roleCheck.length === 0) {
      throw new Error("Apenas administradores podem criar usuários");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    if (!created.user) throw new Error("Falha ao criar usuário");

    // Ensure profile exists (in case trigger did not fire)
    await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: created.user.id, email: data.email, full_name: data.full_name },
        { onConflict: "id" },
      );

    // Ensure role row exists (idempotent for both 'user' and admin promotions)
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: created.user.id, role: data.role }, { onConflict: "user_id,role" });

    return { id: created.user.id, email: created.user.email };
  });

const deleteInput = z.object({ user_id: z.string().uuid() });

export const deleteUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: roleCheck } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "dev"]);
    if (!roleCheck || roleCheck.length === 0) {
      throw new Error("Apenas administradores podem remover usuários");
    }
    if (data.user_id === context.userId) {
      throw new Error("Você não pode remover sua própria conta");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const promoteInput = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "dev", "user"]),
});

export const setUserRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => promoteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: roleCheck } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "dev"]);
    if (!roleCheck || roleCheck.length === 0) {
      throw new Error("Apenas administradores podem alterar papéis");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listUsersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleCheck } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "dev"]);
    if (!roleCheck || roleCheck.length === 0) {
      throw new Error("Apenas administradores podem listar usuários");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersList, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const rolesByUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });
    return usersList.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      full_name: (u.user_metadata as { full_name?: string } | null)?.full_name ?? "",
      created_at: u.created_at,
      roles: rolesByUser.get(u.id) ?? ["user"],
    }));
  });
