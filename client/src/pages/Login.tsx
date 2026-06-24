import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { getLoginUrl, isOAuthConfigured } from '@/const';

export function Login() {
  const [, setLocation] = useLocation();
  const oauthEnabled = isOAuthConfigured();
  const [loginMethod, setLoginMethod] = useState<'oauth' | 'jwt' | 'register' | 'forgot'>(oauthEnabled ? 'oauth' : 'jwt');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuthLogin = () => {
    window.location.href = getLoginUrl();
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      setLocation('/');
    },
    onError: (error) => {
      const errorMessage = error.data?.code === 'UNAUTHORIZED'
        ? 'Email ou senha invalidos'
        : error.message || 'Erro ao fazer login';
      setError(errorMessage);
      setIsLoading(false);
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      setLocation('/');
    },
    onError: (error) => {
      const code = error.data?.code;
      let msg = error.message || 'Erro ao cadastrar';
      if (code === 'FORBIDDEN') msg = 'Email não autorizado para cadastro. Contate o administrador.';
      else if (code === 'BAD_REQUEST') msg = error.message || 'Email já cadastrado ou senha fraca.';
      setError(msg);
      setIsLoading(false);
    },
  });

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSuccess('Se o email estiver cadastrado, você receberá um link para redefinir sua senha.');
      setIsLoading(false);
    },
    onError: () => {
      setSuccess('Se o email estiver cadastrado, você receberá um link para redefinir sua senha.');
      setIsLoading(false);
    },
  });

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!email) {
      setError('Informe seu email');
      setIsLoading(false);
      return;
    }
    forgotMutation.mutate({ email });
  };

  const handleJWTLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Email e senha sao obrigatorios');
      setIsLoading(false);
      return;
    }

    loginMutation.mutate({ email, password });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password || !name) {
      setError('Email, nome e senha sao obrigatorios');
      setIsLoading(false);
      return;
    }
    if (name.length < 3) {
      setError('Nome deve ter no minimo 3 caracteres');
      setIsLoading(false);
      return;
    }

    registerMutation.mutate({ email, password, name });
  };

  const switchTab = (next: 'oauth' | 'jwt' | 'register' | 'forgot') => {
    setError('');
    setSuccess('');
    setLoginMethod(next);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <span className="text-3xl">shield</span>
            </div>
          </div>
          <CardTitle className="text-2xl">RH Prime</CardTitle>
          <CardDescription className="text-blue-100">
            Sistema de Gestao de Recursos Humanos
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Tab Selector */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => oauthEnabled && switchTab('oauth')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                loginMethod === 'oauth'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              disabled={!oauthEnabled}
            >
              Manus OAuth
            </button>
            <button
              onClick={() => switchTab('jwt')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                loginMethod === 'jwt'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                loginMethod === 'register'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {/* OAuth Login */}
          {loginMethod === 'oauth' && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                {oauthEnabled
                  ? 'Acesse o sistema com sua conta Manus'
                  : 'OAuth local não configurado. Use Email/Senha para desenvolvimento.'}
              </p>

              <Button
                onClick={handleOAuthLogin}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={!oauthEnabled}
              >
                Entrar com Manus OAuth
              </Button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-blue-900">
                  Seguranca
                </p>
                <p className="text-xs text-blue-800">
                  Autenticacao segura delegada ao provedor Manus. Seus dados estao protegidos.
                </p>
              </div>
            </div>
          )}

          {/* JWT Login */}
          {loginMethod === 'jwt' && (
            <form onSubmit={handleJWTLogin} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>

              <button
                type="button"
                onClick={() => switchTab('forgot')}
                className="w-full text-sm text-blue-600 hover:underline"
              >
                Esqueceu a senha?
              </button>
            </form>
          )}

          {/* Forgot Password */}
          {loginMethod === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">{success}</span>
                </div>
              )}

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
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !!success}
              >
                {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>

              <button
                type="button"
                onClick={() => switchTab('jwt')}
                className="w-full text-sm text-blue-600 hover:underline"
              >
                Voltar ao login
              </button>
            </form>
          )}

          {/* Register */}
          {loginMethod === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="reg-email" className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="seu@mlservicoseco.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
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
                  minLength={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="reg-password" className="text-sm font-medium text-gray-700">
                  Senha
                </label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  minLength={8}
                  required
                />
                <p className="text-xs text-gray-500">
                  Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Cadastrando...' : 'Cadastrar'}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Cadastro disponível para emails @mlservicoseco.com.br
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-gray-600">
        <p>© 2026 ML Servicos. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
