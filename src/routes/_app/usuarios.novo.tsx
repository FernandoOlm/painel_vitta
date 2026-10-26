import { createFileRoute, Navigate, useNavigate, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ShieldCheck, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createUserFn } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_app/usuarios/novo")({
  component: NovoUsuarioPage,
});

type Role = "admin" | "user";

function NovoUsuarioPage() {
  const { isAdminOrDev, rolesLoading } = useAuth();
  const navigate = useNavigate();
  const create = useServerFn(createUserFn);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "user" as Role,
  });

  const createMut = useMutation({
    mutationFn: () =>
      create({
        data: {
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
        },
      }),
    onSuccess: () => {
      toast.success("Usuário criado com sucesso");
      navigate({ to: "/usuarios" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let p = "";
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setForm((f) => ({ ...f, password: p }));
  }

  if (rolesLoading) {
    return <div className="text-sm text-muted-foreground">Carregando permissões...</div>;
  }
  if (!isAdminOrDev) return <Navigate to="/dashboard" />;

  return (
    <div>
      <PageHeader
        title="Criar usuário"
        description="Cadastre um novo acesso ao sistema e defina o papel."
        actions={
          <Button variant="outline" asChild>
            <Link to="/usuarios">
              <ArrowLeft className="size-4 mr-2" /> Voltar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMut.mutate();
              }}
              className="space-y-5"
            >
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nome completo *</Label>
                <Input
                  id="full_name"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Ex.: Maria Silva"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="usuario@empresa.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha inicial *</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type="text"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                  />
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    Gerar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Compartilhe a senha com o usuário em um canal seguro. Ele poderá alterá-la depois.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Papel *</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as Role })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending ? "Criando..." : "Criar usuário"}
                </Button>
                <Button type="button" variant="ghost" asChild>
                  <Link to="/usuarios">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-display font-semibold">Sobre os papéis</h3>
            <div className="flex gap-3">
              <div className="size-9 rounded-md bg-primary/10 grid place-items-center shrink-0">
                <ShieldCheck className="size-4 text-primary" />
              </div>
              <div>
                <div className="font-medium text-sm">Administrador</div>
                <p className="text-xs text-muted-foreground">
                  Acesso total: gerencia usuários, contatos, empresas, trabalhadores e laudos.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="size-9 rounded-md bg-muted grid place-items-center shrink-0">
                <UserIcon className="size-4 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium text-sm">Usuário</div>
                <p className="text-xs text-muted-foreground">
                  Acessa os módulos operacionais, sem gerenciamento de usuários do sistema.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
