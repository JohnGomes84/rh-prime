import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { KanbanCard, type KanbanCardData, type KanbanLabelData, type KanbanAssigneeData } from "./KanbanCard";

type ChecklistCount = { total: number; done: number };

export type KanbanListData = {
  id: number;
  boardId: number;
  name: string;
  position: number;
};

export function KanbanList({
  list,
  cards,
  labelsByCard,
  assigneesByCard,
  checklistByCard,
  expandedCardId,
  onToggleExpandCard,
  onEditCard,
  onArchiveCard,
  onDeleteCard,
  onAddCard,
  onRenameList,
  onArchiveList,
  canDelete,
  readonly,
}: {
  list: KanbanListData;
  cards: KanbanCardData[];
  labelsByCard: Map<number, KanbanLabelData[]>;
  assigneesByCard: Map<number, KanbanAssigneeData[]>;
  checklistByCard?: Map<number, ChecklistCount>;
  expandedCardId: number | null;
  onToggleExpandCard: (cardId: number) => void;
  onEditCard: (cardId: number) => void;
  onArchiveCard: (cardId: number) => void;
  onDeleteCard: (cardId: number) => void;
  onAddCard: (listId: number, title: string) => void | Promise<void>;
  onRenameList: (listId: number, name: string) => void | Promise<void>;
  onArchiveList: (listId: number) => void | Promise<void>;
  canDelete?: boolean;
  readonly?: boolean;
}) {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(list.name);

  const { attributes, listeners, setNodeRef: setSortRef, transform, transition, isDragging } = useSortable({
    id: `list-${list.id}`,
    data: { type: "list", list },
    disabled: readonly,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `list-drop-${list.id}`,
    data: { type: "list-drop", listId: list.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const cardIds = cards.map((c) => `card-${c.id}`);

  return (
    <div
      ref={setSortRef}
      style={style}
      className={cn(
        "flex h-fit max-h-[calc(100vh-200px)] w-72 shrink-0 flex-col rounded-lg bg-muted/40 p-2",
        isOver && "ring-2 ring-primary",
      )}
    >
      <div className="mb-2 flex items-center gap-2 px-1" {...attributes} {...listeners}>
        {renaming ? (
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => {
              if (newName.trim() && newName !== list.name) onRenameList(list.id, newName.trim());
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setNewName(list.name);
                setRenaming(false);
              }
            }}
            autoFocus
            className="h-7"
          />
        ) : (
          <h3
            className="flex-1 cursor-text text-sm font-semibold"
            onClick={() => !readonly && setRenaming(true)}
          >
            {list.name}
          </h3>
        )}
        <span className="text-xs text-muted-foreground">{cards.length}</span>
        {!readonly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenaming(true)}>Renomear</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onArchiveList(list.id)}
                className="text-red-600"
              >
                Arquivar lista
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div ref={setDropRef} className="flex-1 space-y-2 overflow-y-auto px-1 pb-1">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((c) => (
            <KanbanCard
              key={c.id}
              card={c}
              labels={labelsByCard.get(c.id) ?? []}
              assignees={assigneesByCard.get(c.id) ?? []}
              checklist={checklistByCard?.get(c.id)}
              expanded={expandedCardId === c.id}
              onToggleExpand={() => onToggleExpandCard(c.id)}
              onEdit={!readonly ? () => onEditCard(c.id) : undefined}
              onArchive={!readonly ? () => onArchiveCard(c.id) : undefined}
              onDelete={canDelete ? () => onDeleteCard(c.id) : undefined}
              canEdit={!readonly}
              canDelete={!!canDelete}
              readonly={readonly}
            />
          ))}
        </SortableContext>
      </div>

      {!readonly && (
        <div className="mt-2 px-1">
          {addingCard ? (
            <div className="space-y-2 rounded-md bg-background p-2 shadow-sm">
              <Input
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Título do card"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCardTitle.trim()) {
                    onAddCard(list.id, newCardTitle.trim());
                    setNewCardTitle("");
                    setAddingCard(false);
                  }
                  if (e.key === "Escape") {
                    setNewCardTitle("");
                    setAddingCard(false);
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (newCardTitle.trim()) {
                      onAddCard(list.id, newCardTitle.trim());
                      setNewCardTitle("");
                      setAddingCard(false);
                    }
                  }}
                >
                  Adicionar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNewCardTitle("");
                    setAddingCard(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setAddingCard(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Adicionar card
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
