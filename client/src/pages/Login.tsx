import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";

type Tab = "login" | "register" | "forgot";

const publicRegistrationEnabled = import.meta.env.VITE_PUBLIC_REGISTRATION_ENABLED === "true";

export function Login() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => setLocation("/"),
    onError: (err) => {
      setError(
        err.data?.code === "UNAUTHORIZED"
          ? "Email ou senha inválidos"
          : err.message || "Erro ao fazer login"
      );
      setIsLoading(false);
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => setLocation("/"),
    onError: (err) => {
      const code = err.data?.code;
      let msg = err.message || "Erro ao cadastrar";
      if (code === "FORBIDDEN") {
        msg = "Apenas emails @mlservicoseco.com.br podem se cadastrar.";
      }
      setError(msg);
      setIsLoading(false);
    },
  });

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSuccess(
        "Se o email estiver cadastrado, você receberá um link para redefinir sua senha."
      );
      setIsLoading(false);
    },
    onError: () => {
      setSuccess(
        "Se o email estiver cadastrado, você receberá um link para redefinir sua senha."
      );
      setIsLoading(false);
    },
  });

  const switchTab = (next: Tab) => {
    if (next === "register" && !publicRegistrationEnabled) return;
    setError("");
    setSuccess("");
    setShowPassword(false);
    setTab(next);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    if (!email || !password) {
      setError("Email e senha são obrigatórios");
      setIsLoading(false);
      return;
    }
    loginMutation.mutate({ email, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    if (!email || !password || !name) {
      setError("Email, nome e senha são obrigatórios");
      setIsLoading(false);
      return;
    }
    if (name.length < 3) {
      setError("Nome deve ter no mínimo 3 caracteres");
      setIsLoading(false);
      return;
    }
    registerMutation.mutate({ email, password, name });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    if (!email) {
      setError("Informe seu email");
      setIsLoading(false);
      return;
    }
    forgotMutation.mutate({ email });
  };

  const passwordField = (
    id: string,
    autoComplete: "current-password" | "new-password",
    minLength?: number,
  ) => (
    <div className="relative">
      <Input
        id={id}
        type={showPassword ? "text" : "password"}
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
        autoComplete={autoComplete}
        className="pr-10"
        minLength={minLength}
        required
      />
      <button
        type="button"
        onClick={() => setShowPassword((current) => !current)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
        disabled={isLoading}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">RH Prime</CardTitle>
          <CardDescription className="text-blue-100">
            Sistema de Gestão de Recursos Humanos
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {tab !== "forgot" && (
            <div className="flex gap-2 border-b">
              <button
                onClick={() => switchTab("login")}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                  tab === "login"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Entrar
              </button>
              {publicRegistrationEnabled && (
                <button
                  onClick={() => switchTab("register")}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                    tab === "register"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Cadastrar
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@mlservicoseco.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha
                </label>
                {passwordField("password", "current-password")}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
              <button
                type="button"
                onClick={() => switchTab("forgot")}
                className="w-full text-sm text-blue-600 hover:underline"
              >
                Esqueceu a senha?
              </button>
            </form>
          )}

          {publicRegistrationEnabled && tab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="reg-email" className="text-sm font-medium text-gray-700">
                  Email corporativo
                </label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="seu@mlservicoseco.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="reg-name" className="text-sm font-medium text-gray-700">
                  Nome completo
                </label>
                <Input
                  id="reg-name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  autoComplete="name"
                  minLength={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="reg-password" className="text-sm font-medium text-gray-700">
                  Senha
                </label>
                {passwordField("reg-password", "new-password", 8)}
                <p className="text-xs text-gray-500">
                  Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Cadastrando..." : "Cadastrar"}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Cadastro disponível para emails @mlservicoseco.com.br
              </p>
            </form>
          )}

          {tab === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-sm text-gray-600">
                Informe seu email e enviaremos um link para redefinir sua senha.
              </p>
              <div className="space-y-2">
                <label htmlFor="forgot-email" className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="seu@mlservicoseco.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !!success}
              >
                {isLoading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
              <button
                type="button"
                onClick={() => switchTab("login")}
                className="w-full text-sm text-blue-600 hover:underline"
              >
                Voltar ao login
              </button>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-gray-600">
        <p>&copy; 2026 ML Servicos. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
