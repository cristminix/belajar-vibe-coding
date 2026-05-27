import { db } from "../db";
import { users, type NewUser } from "../db/schema";
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
