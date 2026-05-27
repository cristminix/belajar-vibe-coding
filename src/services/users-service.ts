import { db } from "../db";
import { users, sessions, type NewUser, type NewSession } from "../db/schema";
import { eq } from "drizzle-orm";

export async function registerUser(data: { name: string; email: string; password: string }) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Email sudah terdaftar");
  }

  const hashedPassword = await Bun.password.hash(data.password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  const newUser: NewUser = {
    name: data.name,
    email: data.email,
    password: hashedPassword,
  };

  await db.insert(users).values(newUser);

  return { data: "OK" };
}

export async function loginUser(data: { email: string; password: string }) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (result.length === 0) {
    throw new Error("Email atau password salah");
  }

  const user = result[0];

  const isPasswordValid = await Bun.password.verify(
    data.password,
    user.password,
    "bcrypt"
  );

  if (!isPasswordValid) {
    throw new Error("Email atau password salah");
  }

  const token = crypto.randomUUID();

  const newSession: NewSession = {
    token,
    userId: user.id,
  };

  await db.insert(sessions).values(newSession);

  return { data: token };
}
