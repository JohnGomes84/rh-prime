import { useLocation } from "wouter";
import { Globe, Loader2, Lock, Users } from "lucide-react";
import { NewBoardDialog } from "@/components/kanban/NewBoardDialog";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function KanbanBoards() {
  const [, navigate] = useLocation();
  const { data: boards, isLoading } = trpc.kanban.boards.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kanban</h1>
            <p className="mt-1 text-muted-foreground">Boards de tarefas e processos</p>
          </div>
          <NewBoardDialog />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : boards && boards.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Card
                key={board.id}
                className="cursor-pointer overflow-hidden border-0 shadow-sm transition-shadow hover:shadow-md"
                onClick={() => navigate(`/kanban/${board.id}`)}
              >
                <div className="h-2" style={{ backgroundColor: board.color ?? "#6366f1" }} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{board.name}</h3>
                    <VisibilityIcon visibility={board.visibility} />
                  </div>
                  {board.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{board.description}</p>
                  )}
                  <div className="mt-3 text-xs text-muted-foreground">
                    Atualizado em {new Date(board.updatedAt as never).toLocaleDateString("pt-BR")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed py-16 text-center">
            <p className="text-muted-foreground">Nenhum board ainda.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Clique em <strong>Novo board</strong> para comecar.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function VisibilityIcon({ visibility }: { visibility: string }) {
  if (visibility === "private") return <Lock className="h-4 w-4 text-muted-foreground" />;
  if (visibility === "team") return <Users className="h-4 w-4 text-muted-foreground" />;
  return <Globe className="h-4 w-4 text-muted-foreground" />;
}
