import { useMemo, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BoardMemberData = {
  id: number;
  userId: number;
  role: "admin" | "editor" | "viewer";
  userName: string | null;
  userEmail: string | null;
  employeeName: string | null;
};

type UserCandidateData = {
  userId: number;
  userName: string | null;
  userEmail: string | null;
  employeeId: number | null;
  employeeName: string | null;
  departmentId: number | null;
};

export function BoardMembersDialog({
  boardId,
  members,
}: {
  boardId: number;
  members: BoardMemberData[];
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "editor" | "viewer">("viewer");
  const candidatesQuery = trpc.kanban.boards.listUserCandidates.useQuery(
    { boardId },
    { enabled: open },
  );

  const addMember = trpc.kanban.boards.addMember.useMutation({
    onSuccess: async () => {
      await utils.kanban.boards.listMembers.invalidate({ boardId });
      toast.success("Membro atualizado");
      setSelectedUserId("");
      setSelectedRole("viewer");
    },
    onError: (error) => toast.error(error.message),
  });

  const removeMember = trpc.kanban.boards.removeMember.useMutation({
    onSuccess: async () => {
      await utils.kanban.boards.listMembers.invalidate({ boardId });
      toast.success("Membro removido");
    },
    onError: (error) => toast.error(error.message),
  });

  const memberIds = useMemo(() => new Set(members.map((member) => member.userId)), [members]);
  const candidates = useMemo(
    () =>
      ((candidatesQuery.data ?? []) as UserCandidateData[]).filter((candidate) => !memberIds.has(candidate.userId)),
    [candidatesQuery.data, memberIds],
  );

  const handleAdd = async () => {
    if (!selectedUserId) return;
    await addMember.mutateAsync({
      boardId,
      userId: Number(selectedUserId),
      role: selectedRole,
    });
  };

  const getDisplayName = (entry: Pick<BoardMemberData, "employeeName" | "userName" | "userEmail" | "userId">) =>
    entry.employeeName ?? entry.userName ?? entry.userEmail ?? `Usuario ${entry.userId}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Membros
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar membros</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <div className="text-sm font-medium">Adicionar membro</div>
            <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <div className="space-y-1">
                <Label>Usuario</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((candidate) => (
                      <SelectItem key={candidate.userId} value={String(candidate.userId)}>
                        {candidate.employeeName ?? candidate.userName ?? candidate.userEmail ?? `Usuario ${candidate.userId}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Papel</Label>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as "admin" | "editor" | "viewer")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleAdd} disabled={!selectedUserId || addMember.isPending} className="w-full sm:w-auto">
                  Adicionar
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">Membros atuais</div>
            <div className="space-y-2">
              {members.map((member) => {
                const displayName = getDisplayName(member);
                const initials = displayName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase();

                return (
                  <div key={`${member.userId}-${member.role}`} className="flex items-center gap-3 rounded-lg border p-3">
                    <Avatar className="size-9">
                      <AvatarFallback>{initials || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{displayName}</div>
                      <div className="truncate text-xs text-muted-foreground">{member.userEmail ?? "Sem email"}</div>
                    </div>
                    <Badge variant="outline">{member.role}</Badge>
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        addMember.mutate({
                          boardId,
                          userId: member.userId,
                          role: value as "admin" | "editor" | "viewer",
                        })
                      }
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {member.id > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMember.mutate({ boardId, userId: member.userId })}
                        disabled={removeMember.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
