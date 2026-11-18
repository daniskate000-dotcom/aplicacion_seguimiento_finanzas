# Especificación de Seguridad Firestore (`security_spec.md`)

## 1. Invariantes de Datos
1. **Aislamiento total por cuenta**: Cada documento en `/users/{userId}` y cada movimiento en `/users/{userId}/movements/{movementId}` pertenece exclusivamente a `request.auth.uid == userId` y debe portar `ownerId == request.auth.uid`.
2. **Propiedad inmutable**: Ni `ownerId` ni `createdAt` pueden modificarse después de la creación.
3. **Integridad de marca de tiempo**: `createdAt` (y `updatedAt` en perfiles) debe coincidir estrictamente con `request.time`.
4. **Existencia del perfil padre (Master Gate)**: No se pueden crear, actualizar ni eliminar movimientos en `/users/{userId}/movements/{movementId}` si no existe el documento padre `/users/{userId}` con `ownerId == request.auth.uid`.
5. **Validación estricta de esquema y límites**: Todo string tiene límite `.size()`, todo ID cumple `^[a-zA-Z0-9_\-]+$` (máx. 128 caracteres), todo monto es positivo (`> 0` y `<= 1.000.000.000`), y no se permiten campos sombra (`hasOnly`).

## 2. "Dirty Dozen" Payloads (Vectores de ataque bloqueados)
1. **Unauthenticated Read/Write**: Intentar leer o escribir `/users/{uid}` o `/users/{uid}/movements/{id}` con `request.auth == null` -> `PERMISSION_DENIED`.
2. **Cross-User Profile Read**: Usuario B (`uidB`) intenta leer `/users/{uidA}` -> `PERMISSION_DENIED`.
3. **Cross-User Movement List**: Usuario B (`uidB`) intenta listar `/users/{uidA}/movements` -> `PERMISSION_DENIED`.
4. **User Directory Enumeration**: Intentar listar `/users` -> `PERMISSION_DENIED` (`allow list: if false`).
5. **Identity Spoofing on Profile Create**: Usuario A crea `/users/{uidA}` con `ownerId: "uidB"` -> `PERMISSION_DENIED`.
6. **Identity Spoofing on Movement Create**: Usuario A crea `/users/{uidA}/movements/m1` con `ownerId: "uidB"` -> `PERMISSION_DENIED`.
7. **Shadow Field Injection**: Crear perfil o movimiento con campo extra `{ isAdmin: true }` o `{ role: "admin" }` -> bloqueado por `keys().hasOnly(...)` -> `PERMISSION_DENIED`.
8. **ID Poisoning**: Intentar crear documento con ID malformado (ej. `../../other` o string > 128 chars) -> bloqueado por `isValidId()` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Crear perfil o movimiento con `createdAt` distinto de `request.time` -> `PERMISSION_DENIED`.
10. **Negative or Zero Amount Poisoning**: Crear movimiento con `amount: -5000` o `amount: 0` -> `PERMISSION_DENIED`.
11. **Value Poisoning on Update**: Actualizar `monthlyBudget` con un string `"mucho"` o actualizar `ownerId` / `createdAt` -> bloqueado por `isValidUserProfile` e inmutabilidad -> `PERMISSION_DENIED`.
12. **Orphaned Movement Write**: Crear movimiento en `/users/{uidA}/movements/m1` antes de que exista `/users/{uidA}` -> bloqueado por `ownsUserProfile(userId)` -> `PERMISSION_DENIED`.
