# Zest Firestore Security Specification

## 1. Data Invariants
1. A user profile document at `/users/{userId}` can only be read, created, or updated by the verified authenticated user whose `request.auth.uid == userId`, with `uid == request.auth.uid` and `email_verified == true`.
2. User PII (`email`, `calendarEmail`) is strictly isolated under `/users/{userId}` with zero `list` on `/users` and `get`/`list` restricted solely to `isOwner(userId)` + `existing().ownerId == request.auth.uid`.
3. All subcollections (`/users/{userId}/habits/{habitId}`, `/users/{userId}/completions/{dateKey}`, `/users/{userId}/journalEntries/{entryId}`, `/users/{userId}/tasks/{taskId}`, `/users/{userId}/timeBlocks/{blockId}`, `/users/{userId}/syncState/{syncId}`) enforce the Master Gate: the parent `/users/{userId}` document must exist and carry `uid == request.auth.uid`, and every child document must store `ownerId == request.auth.uid`.
4. All document IDs (`userId`, `habitId`, `dateKey`, `entryId`, `taskId`, `blockId`, `syncId`) must satisfy `isValidId()` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`).
5. All `create` and `update` writes run through entity-specific validation helpers (`isValidUserProfile`, `isValidHabit`, `isValidCompletionDay`, `isValidJournalEntry`, `isValidPlannerTask`, `isValidTimeBlock`, `isValidCalendarSync`) with strict key allowlists (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update), bounded array sizes (`habitIds.size() <= 50`), bounded numeric ranges (`startMinutes`/`endMinutes` in `0..1440`, `syncedCount >= 0`), bounded string lengths, and server-validated timestamps (`request.time`).
6. Immutable ownership and creation fields (`uid`, `ownerId`, `id`, `createdAt`, `dateKey`) cannot be mutated on `update`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated profile read/write**: `get /users/userA` with `auth = null`.
2. **Unverified email write**: `create /users/userA` with `email_verified: false`.
3. **Cross-user PII read**: User B attempts `get /users/userA`.
4. **Users collection scrape**: Authenticated User B attempts `list /users`.
5. **Identity spoofing on create**: User B creates `/users/userB/tasks/t1` with `ownerId: "userA"`.
6. **Ghost / shadow field injection**: User A creates `/users/userA/tasks/t1` including `{ isAdmin: true }`.
7. **Orphaned subcollection write**: User A writes `/users/userA/timeBlocks/tb1` before `/users/userA` exists.
8. **ID poisoning (oversized or invalid characters)**: User A writes `/users/userA/tasks/bad..id!` or 500-char `taskId`.
9. **Client timestamp forgery**: User A creates `/users/userA/timeBlocks/tb1` with `updatedAt: new Date("2020-01-01")` instead of `serverTimestamp()`.
10. **Immutable field mutation**: User A updates `/users/userA/tasks/t1` changing `ownerId` or `createdAt`.
11. **Invalid enum / time bounds poisoning**: User A writes `/users/userA/timeBlocks/tb1` with `startMinutes: 9999` or `category: "Admin"`.
12. **Cross-user list query without owner filter**: User B executes `list /users/userA/tasks` attempting to read User A's tasks.
