import fs from "fs";
import path from "path";
import { hashPassword } from "../auth/jwt-service.js";

type LocalUserRole = "admin" | "gestor" | "colaborador" | "user";
type LocalUserStatus = "active" | "inactive";

export type LocalUserRecord = {
  id: number;
  openId: string | null;
  email: string;
  passwordHash: string | null;
  name: string | null;
  loginMethod: string | null;
  role: LocalUserRole;
  status: LocalUserStatus;
  resetToken: string | null;
  resetTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type LocalUsersFile = {
  users: Array<Omit<LocalUserRecord, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  }>;
};

const LOCAL_USERS_PATH = path.resolve(process.cwd(), ".local-dev-users.json");
const DEFAULT_ADMIN_EMAIL = "adm@mlservicoseco.com.br";
const DEFAULT_ADMIN_PASSWORD = "12345";

export function isLocalDevUsersEnabled() {
  return !process.env.DATABASE_URL && process.env.NODE_ENV !== "production";
}

function toSerializable(user: LocalUserRecord) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function fromSerializable(
  user: LocalUsersFile["users"][number]
): LocalUserRecord {
  return {
    ...user,
    status: (user as any).status ?? "active",
    resetToken: user.resetToken ?? null,
    resetTokenExpiresAt: user.resetTokenExpiresAt ? new Date(user.resetTokenExpiresAt as unknown as string) : null,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

async function readUsersFile(): Promise<LocalUserRecord[]> {
  if (!fs.existsSync(LOCAL_USERS_PATH)) {
    return [];
  }

  const raw = await fs.promises.readFile(LOCAL_USERS_PATH, "utf8");
  const parsed = JSON.parse(raw) as LocalUsersFile;
  return (parsed.users ?? []).map(fromSerializable);
}

async function writeUsersFile(users: LocalUserRecord[]) {
  const payload: LocalUsersFile = {
    users: users.map(toSerializable),
  };
  await fs.promises.writeFile(
    LOCAL_USERS_PATH,
    JSON.stringify(payload, null, 2),
    "utf8"
  );
}

async function ensureSeedAdmin() {
  if (!isLocalDevUsersEnabled()) {
    return;
  }

  const users = await readUsersFile();
  const admin = users.find((user) => user.email === DEFAULT_ADMIN_EMAIL);
  if (admin) {
    return;
  }

  const now = new Date();
  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  users.push({
    id: 1,
    openId: null,
    email: DEFAULT_ADMIN_EMAIL,
    passwordHash,
    name: "Administrador Local",
    loginMethod: "jwt",
    role: "admin",
    status: "active",
    resetToken: null,
    resetTokenExpiresAt: null,
    createdAt: now,
    updatedAt: now,
  });
  await writeUsersFile(users);
}

export const localDevUsers = {
  async listUsers() {
    await ensureSeedAdmin();
    return readUsersFile();
  },

  async getUser(email: string) {
    const users = await this.listUsers();
    return users.find((user) => user.email === email) ?? null;
  },

  async getUserById(id: number) {
    const users = await this.listUsers();
    return users.find((user) => user.id === id) ?? null;
  },

  async getUserByOpenId(openId: string) {
    const users = await this.listUsers();
    return users.find((user) => user.openId === openId) ?? undefined;
  },

  async createUser(data: {
    email: string;
    name?: string | null;
    passwordHash?: string | null;
    role?: string;
    status?: string;
    loginMethod?: string | null;
    openId?: string | null;
  }) {
    const users = await this.listUsers();
    if (users.some((user) => user.email === data.email)) {
      throw new Error("Duplicate email");
    }

    const id =
      users.reduce((max, user) => Math.max(max, user.id), 0) + 1;
    const now = new Date();
    const user: LocalUserRecord = {
      id,
      openId: data.openId ?? null,
      email: data.email,
      passwordHash: data.passwordHash ?? null,
      name: data.name ?? null,
      loginMethod: data.loginMethod ?? "jwt",
      role: (data.role as LocalUserRole | undefined) ?? "colaborador",
      status: (data.status as LocalUserStatus | undefined) ?? "active",
      resetToken: null,
      resetTokenExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    };
    users.push(user);
    await writeUsersFile(users);
    return user;
  },

  async updateUser(
    id: number,
    data: Partial<{
      email: string;
      name: string | null;
      passwordHash: string | null;
      role: string;
      status: string;
      loginMethod: string | null;
      openId: string | null;
    }>
  ) {
    const users = await this.listUsers();
    const index = users.findIndex((user) => user.id === id);
    if (index < 0) {
      return null;
    }

    const nextUser: LocalUserRecord = {
      ...users[index],
      ...data,
      role:
        (data.role as LocalUserRole | undefined) ??
        users[index]!.role,
      status:
        (data.status as LocalUserStatus | undefined) ??
        users[index]!.status,
      updatedAt: new Date(),
    };
    users[index] = nextUser;
    await writeUsersFile(users);
    return nextUser;
  },

  async deleteUser(id: number) {
    const users = await this.listUsers();
    const filtered = users.filter((user) => user.id !== id);
    await writeUsersFile(filtered);
    return { success: true };
  },

  async upsertUser(data: {
    email: string;
    openId?: string | null;
    name?: string | null;
    loginMethod?: string | null;
    role?: string;
    status?: string;
    passwordHash?: string | null;
  }) {
    const existing = await this.getUser(data.email);
    if (existing) {
      await this.updateUser(existing.id, {
        email: data.email,
        openId: data.openId ?? existing.openId,
        name: data.name ?? existing.name,
        loginMethod: data.loginMethod ?? existing.loginMethod,
        role: data.role ?? existing.role,
        status: data.status ?? existing.status,
        passwordHash: data.passwordHash ?? existing.passwordHash,
      });
      return;
    }

    await this.createUser({
      email: data.email,
      openId: data.openId ?? null,
      name: data.name ?? null,
      loginMethod: data.loginMethod ?? "jwt",
      role: data.role ?? "colaborador",
      status: data.status ?? "active",
      passwordHash: data.passwordHash ?? null,
    });
  },

  async getUsersByRole(role: string) {
    const users = await this.listUsers();
    return users.filter((user) => user.role === role);
  },

  async getUsersByDepartment(_departmentId: string) {
    return [] as LocalUserRecord[];
  },
};
