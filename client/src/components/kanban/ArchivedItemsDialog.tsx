import { useState } from "react";
import { Archive, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ArchivedItemsDialog({
  boardId,
  open,
  onClose,
}: {
  boardId: number;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const archivedQuery = trpc.kanban.boards.listArchived.useQuery(
    { boardId },
    { enabled: open },
  );

  const invalidateAll = async () => {
    await Promise.all([
      utils.kanban.boards.listArchived.invalidate({ boardId }),
      utils.kanban.cards.listByBoard.invalidate({ boardId }),
      utils.kanban.lists.listByBoard.invalidate({ boardId }),
    ]);
  };

  const restoreCard = trpc.kanban.cards.restore.useMutation({
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Card restaurado");
    },
    onError: (err) => toast.error(err.message ?? "Falha ao restaurar"),
  });

  const deleteCard = trpc.kanban.cards.deleteHard.useMutation({
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Card excluido permanentemente");
    },
    onError: (err) => toast.error(err.message ?? "Falha ao excluir"),
  });

  const restoreList = trpc.kanban.lists.restore.useMutation({
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Lista restaurada");
    },
    onError: (err) => toast.error(err.message ?? "Falha ao restaurar"),
  });

  const deleteList = trpc.kanban.lists.deleteHard.useMutation({
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Lista excluida permanentemente");
    },
    onError: (err) => toast.error(err.message ?? "Falha ao excluir"),
  });

  const cards = archivedQuery.data?.cards ?? [];
  const lists = archivedQuery.data?.lists ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Itens arquivados
          </DialogTitle>
        </DialogHeader>

        {archivedQuery.isLoading ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <Tabs defaultValue="cards">
            <TabsList>
              <TabsTrigger value="cards">Cards ({cards.length})</TabsTrigger>
              <TabsTrigger value="lists">Listas ({lists.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="cards" className="mt-3">
              {cards.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum card arquivado
                </p>
              ) : (
                <ul className="max-h-[400px] space-y-1 overflow-y-auto">
                  {cards.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-2 rounded border px-3 py-2 text-sm"
                    >
                      <span className="flex-1 truncate">{c.title}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={restoreCard.isPending}
                        onClick={() =>
                          restoreCard.mutate({ id: c.id, boardId })
                        }
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Restaurar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        disabled={deleteCard.isPending}
                        onClick={() => {
                          if (
                            confirm(
                              `Excluir "${c.title}" permanentemente?\n\nComentarios, anexos, checklist e responsaveis serao removidos.\nEsta acao nao pode ser desfeita.`,
                            )
                          ) {
                            deleteCard.mutate({ id: c.id, boardId });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="lists" className="mt-3">
              {lists.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma lista arquivada
                </p>
              ) : (
                <ul className="max-h-[400px] space-y-1 overflow-y-auto">
                  {lists.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center gap-2 rounded border px-3 py-2 text-sm"
                    >
                      <span className="flex-1 truncate">{l.name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={restoreList.isPending}
                        onClick={() =>
                          restoreList.mutate({ id: l.id, boardId })
                        }
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Restaurar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        disabled={deleteList.isPending}
                        onClick={() => {
                          if (
                            confirm(
                              `Excluir lista "${l.name}" permanentemente?\n\nTodos os cards desta lista (e seus comentarios, anexos, checklist, responsaveis) serao removidos.\nEsta acao nao pode ser desfeita.`,
                            )
                          ) {
                            deleteList.mutate({ id: l.id, boardId });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
