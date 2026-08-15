## ADDED Requirements

### Requirement: Entry surfaces use accessible instructional copy

The homepage, join page, and session creation page SHALL use persistent labels for form controls and complete sentences for instructions. User-facing copy MUST NOT rely on em dashes, semicolon-packed summaries, sentence fragments, or placeholder text to communicate requirements.

#### Scenario: Participant reads the homepage join action
- **WHEN** a participant views the homepage
- **THEN** the code field has a visible label and the supporting copy explains that the room will indicate whether a PIN is needed

#### Scenario: Host compares access choices
- **WHEN** a host views the session creation page
- **THEN** each access card explains who can enter and what the host will control in complete plain-language sentences

#### Scenario: Participant enters a room
- **WHEN** a participant views the join page
- **THEN** the page visibly labels the name, optional email, and conditional PIN fields without using placeholders as instructions
