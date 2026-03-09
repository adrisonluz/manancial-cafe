# Copilot instructions for manancial-cafe

Purpose: give an AI coding agent immediate, actionable context for working in this repo.

- Quick commands
  - Start dev server: `npm run dev` (runs `expo start`).
  - Run on device/emulator: `npm run android` or `npm run ios`.
  - Export web build: `npm run build:web`.
  - Lint: `npm run lint` (uses `expo lint`).

- High-level architecture
  - Expo + React Native app using `expo-router` (file-based routing). The router entry is `expo-router/entry` (see `package.json`).
  - Pages and routes live under `app/`. The `(tabs)` folder implements the tabbed area (`app/(tabs)/*`).
  - State & auth: `AuthProvider` in `app/_layout.tsx` wraps the app and exposes `useAuth()` from `hooks/useAuth.tsx`.
  - Services: server-side integrations are organized in `services/` as classes with static methods (e.g. `AuthService`, `AdminService`, `PedidoService`). These directly call Firebase SDK functions.
  - Firebase: configured in `services/FirebaseConfig.ts` and uses Expo public environment variables (prefixed with `EXPO_PUBLIC_FIREBASE_*`).

- Important project conventions
  - TypeScript with `strict: true` (see `tsconfig.json`). Keep types/interfaces in the same service file when present (e.g. `Usuario`, `ConfiguracaoApp` in `services/AdminService.ts`).
  - Path alias: `@/*` maps to project root — imports use `@/services/...`, `@/hooks/...`, etc.
  - Styling: common styles exported from `app/styles.js` and reused across screens.
  - Persisted auth: auth user is stored in AsyncStorage under the key `@auth_user` (see `hooks/useAuth.tsx`).
  - Language: UI strings are in Portuguese — keep translations or messages consistent.

- Data & Firebase patterns (concrete examples)
  - Realtime Database paths you’ll see: `usuarios/{userId}`, `configuracoes`, `pedidos`, `backups`, `sistema`.
  - Example: creating a user
    - `AdminService.criarUsuario` creates an Auth user via `createUserWithEmailAndPassword`, then stores additional profile data under `usuarios/{uid}`.
  - Example: soft-delete pattern
    - `AdminService.removerUsuario` marks `usuarios/{uid}/ativo` = false instead of hard deleting.
  - Destructive ops: `AdminService.limparDados()` creates a backup then removes old `pedidos` — treat with caution.

- How auth flow is implemented (quick contract)
  - Input: email/password → `AuthService.signIn(email,password)`
  - Output: returns a `User` object (id, email, nome, role). `useAuth` saves it to AsyncStorage and provides via context.
  - Error mode: AuthService throws on invalid/inactive user; callers catch and show Alerts (see `app/index.tsx` login screen).

- Editing and code patterns to follow
  - Prefer service methods for backend interactions; screens call `Service.method()` and then update local state.
  - Keep UI logic in `app/*` screens and business logic in `services/*`.
  - Use interfaces exported in service files for typing components state (e.g. `Usuario` from `services/AdminService.ts`).
  - Avoid changing Firebase rules or destructive service methods without adding backups/tests — these methods are production-affecting.

- Environment & secrets
  - Firebase config uses `EXPO_PUBLIC_FIREBASE_*` environment variables. Provide them via `eas` or local `.env` when running locally.
  - Analytics is conditionally initialized (`isSupported()` check) in `services/FirebaseConfig.ts`.

- Files to inspect first when making changes
  - `package.json` — scripts and main entry
  - `app/_layout.tsx` — top-level providers & routing
  - `hooks/useAuth.tsx` — auth context contract and AsyncStorage key
  - `services/FirebaseConfig.ts` — how Firebase is initialized and env vars used
  - `services/AdminService.ts` & `services/AuthService.ts` — canonical service patterns and DB paths
  - `app/(tabs)/admin.tsx` — example of admin UI using services and modal flows

If anything above is unclear or you'd like me to expand an area (data model, another service, or add suggested tests), tell me which part and I'll iterate. 
