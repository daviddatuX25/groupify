## 1. Local saved-room foundation

- [x] 1.1 Add a typed, versioned local-storage helper for saved room codes with validation, deduplication, ordering, and storage-failure safety.
- [x] 1.2 Add focused tests for save, remove, duplicate, malformed-storage, and bounded-list behavior.

## 2. Homepage return dock

- [x] 2.1 Redesign the homepage operational hierarchy around create, join by code, and saved rooms while preserving the Kinetic visual system.
- [x] 2.2 Render saved-room cards with open, remove, empty, and stale-state actions using complete sentences and accessible labels.
- [x] 2.3 Remove outdated PIN instructions from the homepage and update the join explanation to defer access requirements to the room.

## 3. Card-first session creation

- [x] 3.1 Replace the access select with accessible open-room and review-arrivals choice cards, including conditional QR PIN bypass guidance.
- [x] 3.2 Replace date-time-first lifecycle input with duration preset cards, manual-end choice, and a revealed custom date-time field.
- [x] 3.3 Add server-side `end_mode` and `custom_ends_at` validation and normalize preset durations to `ends_at`.
- [x] 3.4 Update session setup feature coverage for open and reviewed access plus every lifecycle path.

## 4. Participant return flow

- [x] 4.1 Add explicit save-room controls to the join and live-room surfaces without persisting credentials.
- [x] 4.2 Update join and late-join copy to use persistent labels and complete, translatable sentences.
- [x] 4.3 Update e2e coverage for saved-room navigation, removal, access-card selection, and duration-card behavior.

## 5. Verification and handoff

- [x] 5.1 Run Pint, PHPStan, Pest, frontend type/build checks, and the focused browser suite.
- [x] 5.2 Rebuild the production image and verify the homepage, create-session flow, direct open join, reviewed join, and saved-room return path in a real browser.
- [x] 5.3 Validate the OpenSpec change and record the completed implementation state.
