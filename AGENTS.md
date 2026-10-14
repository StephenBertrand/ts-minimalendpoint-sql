# Agent notes

Rules that are already true in this repo. Follow them when adding a feature.

## Names

- A feature is a folder under `src/api/src/features`. An action is a file named for that action and ending in `Endpoint.ts`, such as `CreateTodoEndpoint.ts`. It exports `endpoint`.
- The request type and the row type sit next to that feature, not in a shared models file.
- The store is the only type that runs SQL. The endpoint validates, then calls the store.
- Connection names stay `todos` and `appconfiguration`. The flag id is `HelloNewWorld`. The sentinel is `Demo:Sentinel`.

## A new feature

- Add the folder. Export `endpoint` from each `*Endpoint.ts`. Export `configure` from `configure.ts` when the feature has services to register. `loadFeatures` picks both up. Do not name the feature from `server.ts` or `hosting/app.ts`.
- Those files sit in the feature folder, or one folder under it (`todos/CreateTodo/CreateTodoEndpoint.ts`). Deeper than that is not loaded.
- A feature reads its own connection string inside `configure`. The host does not open pools or flag readers.
- Tests call `buildApp` and `app.inject`. Do not start Aspire, and do not listen on a port, in a test.
- A new table is a script in that feature's `migrations` folder, applied by the feature's schema module and recorded in `dbo.SchemaMigrations`. Schema apply holds `sp_getapplock` for the transaction.
- Relative imports under `src/api/src` end in `.js`. tsx and the tests map those specifiers back to the `.ts` files. `npm start` runs the compiled `dist`.
- The playground calls `/api/...`. The web process strips `/api` and forwards to the API. Do not point the browser at the API origin.

## Leave these alone

- The AppHost stays C#. It is the orchestrator. The API and the playground stay TypeScript.
- An `http://` App Configuration endpoint is the emulator. Read it with HTTP. Do not send the SDK's HMAC handshake to it.
- A missing `ConnectionStrings__appconfiguration` means the flag is off and `/hello` returns Hello World.
- Titles are trimmed. Empty and longer than 200 characters are `400` problem responses and do not reach SQL.
