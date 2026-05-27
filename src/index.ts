import { Elysia } from "elysia";
import { db } from "./db";
import { users } from "./db/schema";

const app = new Elysia()
  .get("/", () => ({ status: "ok" }))
  .get("/users", async () => {
    const allUsers = await db.select().from(users);
    return allUsers;
  })
  .listen(3000);

console.log(`Server running at http://localhost:${app.server?.port}`);
