import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">FinHub Inteligente</h1>
        <p className="text-xl text-gray-600 mb-8">
          Plataforma completa de gestao financeira com acesso local direto.
        </p>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-gray-700">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">OK</div>
            <span>Gestao de pagamentos e recebimentos</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">OK</div>
            <span>Conciliacao bancaria automatica</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">OK</div>
            <span>Processamento inteligente de documentos</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">OK</div>
            <span>Dashboard com analise de fluxo de caixa</span>
          </div>
        </div>

        <Button
          size="lg"
          asChild
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
        >
          <a href="/dashboard">Abrir Sistema</a>
        </Button>

        <p className="text-gray-500 mt-6 text-sm">
          Login Manus removido do fluxo local.
        </p>
      </div>
    </div>
  );
}
