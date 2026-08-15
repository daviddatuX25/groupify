## ADDED Requirements

### Requirement: Participants can save a room on the current browser

The system SHALL let a participant explicitly save a room by its six-digit session code from the join or live-room surface. The saved record MUST remain in browser local storage and MUST NOT contain a device token, admin token, PIN, participant name, or message content.

#### Scenario: Participant saves a room
- **WHEN** a participant activates the save-room control for a valid session code
- **THEN** the browser stores one record for that code and the control exposes the saved state

#### Scenario: Saving the same room twice
- **WHEN** a participant activates save for a code that is already saved
- **THEN** the browser keeps one record for that code and updates its last-visited metadata without duplicating it

### Requirement: Participants can reopen saved rooms from the homepage

The homepage SHALL display saved rooms when valid local records exist. Each saved room SHALL show its code, a human-readable saved or last-used state, and an action that opens the room's join route.

#### Scenario: Returning participant opens a saved room
- **WHEN** a participant selects `Open room` on a saved-room card
- **THEN** the browser navigates to `/join/{code}` and leaves the server to determine the current access requirements

#### Scenario: No rooms are saved
- **WHEN** the homepage has no valid saved-room records
- **THEN** the homepage explains that rooms saved on this browser appear there and keeps the code-entry action visible

### Requirement: Participants can remove saved rooms

The homepage SHALL provide an accessible remove action for every saved room and SHALL update the list immediately after removal.

#### Scenario: Participant removes a saved room
- **WHEN** a participant activates the remove action for a saved-room card
- **THEN** the record is deleted from local storage and the card disappears without affecting the server session

#### Scenario: Saved room no longer exists
- **WHEN** opening a saved room returns a session-not-found or ended state
- **THEN** the participant can remove that local record and the application does not treat the saved record as access proof
