# Issue: API Get Current User

## Deskripsi

Buat API endpoint untuk mendapatkan data user yang sedang login berdasarkan token dari header `Authorization`.

---

## Spesifikasi

### Endpoint

```
POST /api/users/current
```

### Headers

```
Authorization: Bearer <token>
```

- `<token>` adalah nilai token yang ada di tabel `sessions` (kolom `token`), didapatkan saat user login via `POST /api/users/login`.

### Response Body (Success)

```json
{
  "data": {
    "id": 1,
    "name": "Putra",
    "email": "cristminix@gmail.com",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### Response Body (Error)

```json
{
  "error": "Unauthorized"
}
```

HTTP status code error: `401`

---

## Tech Stack

- **Runtime**: Bun
- **Framework**: ElysiaJS
- **ORM**: Drizzle ORM (PostgreSQL)

---

## Tahapan Pengerjaan (Kerjakan Berurutan!)

### Langkah 1 — Tambahkan fungsi `getCurrentUser` di service

**File: `src/services/users-service.ts`**

Buka file ini, lalu lakukan hal berikut:

1. Di baris import (paling atas), tambahkan `and` dari `drizzle-orm` jika nanti dibutuhkan. Namun untuk fitur ini, kamu hanya butuh `eq` yang sudah ada. Jadi pastikan baris import-nya menjadi:

   ```ts
   import { eq } from "drizzle-orm";
   ```

   > `eq` sudah di-import, jadi cukup pastikan saja.

2. Tambahkan fungsi baru `getCurrentUser` di **akhir file** (setelah fungsi `loginUser`):

   ```ts
   export async function getCurrentUser(token: string) {
     // 1. Cari session berdasarkan token dari tabel sessions
     const sessionResult = await db
       .select()
       .from(sessions)
       .where(eq(sessions.token, token))
       .limit(1);

     // 2. Jika session tidak ditemukan, throw error
     if (sessionResult.length === 0) {
       throw new Error("Unauthorized");
     }

     // 3. Ambil userId dari session yang ditemukan
     const userId = sessionResult[0].userId;

     // 4. Cari user berdasarkan userId dari tabel users
     const userResult = await db
       .select()
       .from(users)
       .where(eq(users.id, userId))
       .limit(1);

     // 5. Jika user tidak ditemukan, throw error
     if (userResult.length === 0) {
       throw new Error("Unauthorized");
     }

     // 6. Return data user dengan format yang diinginkan
     const user = userResult[0];
     return {
       data: {
         id: user.id,
         name: user.name,
         email: user.email,
         created_at: user.createdAt,
       },
     };
   }
   ```

**Penjelasan logika**:
- Token dikirim oleh client via header `Authorization: Bearer <token>`.
- Kita cari token tersebut di tabel `sessions`. Kalau tidak ketemu → Unauthorized.
- Kalau ketemu, ambil `userId` dari session tersebut.
- Cari user berdasarkan `userId` di tabel `users`. Kalau tidak ketemu → Unauthorized.
- Return data user dengan format `{ data: { id, name, email, created_at } }`.

> **PENTING**: Di schema database, kolomnya bernama `createdAt` (camelCase), tapi di response API kita kirim sebagai `created_at` (snake_case). Pastikan mapping-nya benar: `created_at: user.createdAt`.

---

### Langkah 2 — Tambahkan route `POST /users/current` di route file

**File: `src/routes/user-route.ts`**

Buka file ini, lalu lakukan hal berikut:

1. Tambahkan `getCurrentUser` ke baris import:

   ```ts
   // Sebelum:
   import { registerUser, loginUser } from "../services/users-service";

   // Sesudah:
   import { registerUser, loginUser, getCurrentUser } from "../services/users-service";
   ```

2. Tambahkan route baru dengan **method chaining** setelah route `/users/login` (sebelum tanda titik koma `;` terakhir):

   ```ts
   .post(
     "/users/current",
     async ({ request, set }) => {
       try {
         // 1. Ambil header Authorization dari request
         const authHeader = request.headers.get("Authorization");

         // 2. Jika header tidak ada atau tidak dimulai dengan "Bearer ", return Unauthorized
         if (!authHeader || !authHeader.startsWith("Bearer ")) {
           set.status = 401;
           return { error: "Unauthorized" };
         }

         // 3. Ambil token dari header (hapus "Bearer " di depan)
         const token = authHeader.slice(7);

         // 4. Panggil service function
         const result = await getCurrentUser(token);

         // 5. Return hasil
         return result;
       } catch (error) {
         set.status = 401;
         return { error: "Unauthorized" };
       }
     },
     {
       detail: {
         tags: ["Users"],
         summary: "Get current logged in user",
       },
     }
   )
   ```

**Penjelasan logika route**:
- Di ElysiaJS, cara akses request headers adalah melalui `request.headers.get("Authorization")`. Gunakan `{ request, set }` sebagai parameter, **bukan** `{ body, set }`.
- Route ini TIDAK punya body validation (karena tidak menerima request body, hanya header).
- Jika header `Authorization` tidak ada atau format-nya salah (tidak dimulai `Bearer `) → return `{ error: "Unauthorized" }` dengan status `401`.
- Jika service throw error (token tidak valid / user tidak ditemukan) → tangkap di `catch`, return `{ error: "Unauthorized" }` dengan status `401`.

> **PENTING**: Method-nya `POST` (bukan GET), sesuai spesifikasi. Ini memang tidak lazim, tapi ikuti spesifikasi yang ada.

---

### Langkah 3 — Tidak perlu ubah schema database

Schema database sudah lengkap. Tabel yang relevan:

**Tabel `users`**:

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial (integer) | Primary key |
| `name` | text | Nama user |
| `email` | text | Email user (unique) |
| `password` | varchar(255) | Hash bcrypt |
| `createdAt` | timestamp | Waktu pembuatan (auto) |

**Tabel `sessions`**:

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial (integer) | Primary key |
| `token` | varchar(255) | Token unik (unique) |
| `userId` | integer | FK ke `users.id` (cascade delete) |
| `createdAt` | timestamp | Waktu pembuatan (auto) |

Relasi: `sessions.userId` → `users.id` (foreign key dengan `onDelete: cascade`).

---

### Langkah 4 — Tidak perlu ubah `src/index.ts`

Route `userRoute` sudah di-daftarkan di `src/index.ts`:

```ts
const app = new Elysia()
  .use(userRoute)
  ...
```

Karena kita hanya menambahkan route baru di dalam `userRoute` (via method chaining), file `src/index.ts` **tidak perlu diubah sama sekali**.

---

### Langkah 5 — Uji Coba

Jalankan server:

```bash
bun run dev
```

Lalu test dengan curl:

**Langkah awal: Login dulu untuk dapatkan token**

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "cristminix@gmail.com", "password": "bismillah123"}'
```

Response:

```json
{ "data": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

Catat token tersebut.

**Test: Request sukses (token valid)**

```bash
curl -X POST http://localhost:3000/api/users/current \
  -H "Authorization: Bearer <token-yang-didapat>"
```

Response yang diharapkan:

```json
{
  "data": {
    "id": 1,
    "name": "Putra",
    "email": "cristminix@gmail.com",
    "created_at": "2025-..."
  }
}
```

**Test: Request error (tanpa header Authorization)**

```bash
curl -X POST http://localhost:3000/api/users/current
```

Response yang diharapkan:

```json
{ "error": "Unauthorized" }
```

**Test: Request error (token salah)**

```bash
curl -X POST http://localhost:3000/api/users/current \
  -H "Authorization: Bearer token-palsu"
```

Response yang diharapkan:

```json
{ "error": "Unauthorized" }
```

---

## Checklist Verifikasi

- [ ] Fungsi `getCurrentUser` sudah ditambahkan di `src/services/users-service.ts`
- [ ] Import `getCurrentUser` sudah ditambahkan di `src/routes/user-route.ts`
- [ ] Route `POST /users/current` sudah ditambahkan dengan method chaining di `userRoute`
- [ ] `POST /api/users/current` dengan token valid → return data user (status 200)
- [ ] `POST /api/users/current` tanpa header Authorization → return `{ "error": "Unauthorized" }` (status 401)
- [ ] `POST /api/users/current` dengan token palsu → return `{ "error": "Unauthorized" }` (status 401)
- [ ] Response field menggunakan `created_at` (snake_case), bukan `createdAt` (camelCase)
- [ ] Tidak ada error TypeScript
- [ ] Tidak ada perubahan di `src/index.ts`

---

## Catatan untuk Implementor

1. **Kerjakan urut dari Langkah 1 sampai 5** — jangan skip langkah apapun.
2. **Token ada di tabel `sessions`**, bukan di tabel `users`. Flow-nya: token → cari di `sessions` → dapat `userId` → cari di `users`.
3. **Perhatikan mapping field**: di database kolomnya `createdAt`, tapi di response harus `created_at`.
4. **Method HTTP pakai `POST`** (bukan GET), sesuai spesifikasi.
5. **Gunakan `request.headers.get("Authorization")`** untuk ambil header di ElysiaJS, bukan cara lain.
6. **Jangan install package baru** — semua yang dibutuhkan sudah ada.
7. **Jangan ubah `src/index.ts`** — route baru cukup ditambahkan di `userRoute` karena sudah ter-register.
8. **Error handling**: Semua jenis error (token tidak ada, format salah, token tidak ditemukan di DB, user tidak ditemukan) → return `{ "error": "Unauthorized" }` dengan HTTP status `401`.