import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { AlertCircle } from 'lucide-react';

export function Login() {
  const [, setLocation] = useLocation();
  const [loginMethod, setLoginMethod] = useState<'oauth' | 'jwt'>('oauth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuthLogin = () => {
    window.location.href = `/api/oauth/authorize?redirect_uri=${window.location.origin}`;
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
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
              onClick={() => setLoginMethod('oauth')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                loginMethod === 'oauth'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Manus OAuth
            </button>
            <button
              onClick={() => setLoginMethod('jwt')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                loginMethod === 'jwt'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Email/Senha
            </button>
          </div>

          {/* OAuth Login */}
          {loginMethod === 'oauth' && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Acesse o sistema com sua conta Manus
              </p>

              <Button
                onClick={handleOAuthLogin}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
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
