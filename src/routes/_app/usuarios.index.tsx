import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listUsersFn, deleteUserFn, setUserRoleFn } from "@/lib/admin-users.functions";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_app/usuarios/")({
  component: UsuariosPage,
});

function UsuariosPage() {
  const { isAdminOrDev } = useAuth();
  if (!isAdminOrDev) return <Navigate to="/dashboard" />;

  const qc = useQueryClient();
  const list = useServerFn(listUsersFn);
  const del = useServerFn(deleteUserFn);
  const setRole = useServerFn(setUserRoleFn);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => list(),
  });

  const delMut = useMutation({
    mutationFn: (user_id: string) => del({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Usuário removido");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMut = useMutation({
    mutationFn: (d: { user_id: string; role: "admin" | "user" }) => setRole({ data: d }),
    onSuccess: () => {
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Usuários"
        description="Apenas administradores criam novos acessos."
        actions={
          <Button asChild>
            <Link to="/usuarios/novo">
              <Plus className="size-4 mr-2" /> Novo usuário
            </Link>
          </Button>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const isDev = u.roles.includes("dev");
              const role = (u.roles.includes("admin") ? "admin" : "user") as "admin" | "user";
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {isDev ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-md bg-muted">Dev</span>
                    ) : (
                      <Select
                        value={role}
                        onValueChange={(v) => roleMut.mutate({ user_id: u.id, role: v as "admin" | "user" })}
                      >
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>{fmtDate(u.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {!isDev && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { if (confirm(`Remover ${u.email}?`)) delMut.mutate(u.id); }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
