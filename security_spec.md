# Security Specification for vamo.AI

## 1. Data Invariants
- `users`: Can only be created, read, and updated by their owner matching `request.auth.uid`.
- `saved_places`: A user can only read, create, update, and delete their own saved places (`resource.data.userId == request.auth.uid`).
- `reviews`: Any user can read authentic reviews. Only verified authenticated users can post reviews with `userId == request.auth.uid`.
- `outing_plans`: Outing decision sessions belong to the user who created them (`userId == request.auth.uid`).

## 2. Dirty Dozen Threat Vectors
1. Spoofed User ID in `users` collection (attempting to write another user's document).
2. Modifying another user's `saved_places`.
3. Reading another user's private profile.
4. Injecting malicious oversized strings in reviews.
5. Deleting someone else's review.
6. Forging user review author (`userId` not matching auth token).
7. Injecting unauthorized fields into user documents (shadow updates).
8. Arbitrary query without matching `userId` on saved places.
9. Modifying immutable creation timestamps.
10. Unauthenticated write to `saved_places`.
11. Bypassing size constraints on tags and notes.
12. Attempting to hijack plan sessions.

## 3. Enforcement Strategy
- Strict `isValidId()` regex guard.
- Isolated collection access with `isOwner()`.
- Explicit schema check helpers `isValidUser`, `isValidSavedPlace`, `isValidReview`, and `isValidPlan`.
- Default deny catch-all `match /{document=**} { allow read, write: if false; }`.
