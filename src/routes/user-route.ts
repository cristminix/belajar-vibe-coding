import { Elysia, t } from "elysia";
import { registerUser, loginUser } from "../services/users-service";

export const userRoute = new Elysia({ prefix: "/api" })
  .post(
    "/users",
    async ({ body, set }) => {
      try {
        const result = await registerUser(body);
        return result;
      } catch (error) {
        set.status = 400;
        return { error: (error as Error).message };
      }
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
      detail: {
        tags: ["Users"],
        summary: "Register new user",
      },
    }
  )
  .post(
    "/users/login",
    async ({ body, set }) => {
      try {
        const result = await loginUser(body);
        return result;
      } catch (error) {
        set.status = 400;
        return { error: (error as Error).message };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
      detail: {
        tags: ["Users"],
        summary: "Login user",
      },
    }
  );
