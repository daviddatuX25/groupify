## ADDED Requirements

### Requirement: Hosts choose access through plain-language cards

The session creation page SHALL present open access and reviewed access as selectable cards with persistent labels and complete supporting sentences. Open access MUST be the default. The selected card MUST expose its state to assistive technology.

#### Scenario: Host creates an open room
- **WHEN** the host leaves the default access choice selected and creates a session
- **THEN** the session is created with `join_mode` set to `open` and direct participants can join without a PIN

#### Scenario: Host creates a reviewed room
- **WHEN** the host selects reviewed access and creates a session
- **THEN** the session is created with `join_mode` set to `approval` and the existing approval join rules remain active

### Requirement: Hosts choose a duration before creating a session

The session creation page SHALL present duration presets for `1 hour`, `12 hours`, `1 day`, `1 week`, and `1 month`, plus an option to keep the room open until the host ends it. The default duration SHALL be `1 day`. A custom date and time field SHALL remain hidden until the host selects the custom option.

#### Scenario: Host uses a duration preset
- **WHEN** the host selects a preset and creates a session
- **THEN** the server computes `ends_at` from the current server time using the selected duration

#### Scenario: Host keeps a room open
- **WHEN** the host selects the manual-end option and creates a session
- **THEN** the session is created without an `ends_at` value

#### Scenario: Host chooses a custom end time
- **WHEN** the host selects custom end time, enters a future date and time, and creates a session
- **THEN** the server stores that requested end time as `ends_at`

#### Scenario: Custom end time is missing or not future
- **WHEN** the host selects custom end time without a future date and time
- **THEN** the server rejects creation with an actionable validation error on the custom end-time field
