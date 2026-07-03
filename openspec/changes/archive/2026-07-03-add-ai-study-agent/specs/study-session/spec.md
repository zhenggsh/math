## ADDED Requirements

### Requirement: Session is created per user and knowledge point
The system SHALL create a `StudySession` record for each `(userId, knowledgePointId)` pair when a student first opens the AI assistant for that knowledge point.

#### Scenario: New session for a knowledge point
- **WHEN** a student opens the AI assistant on "三角函数的基本概念"
- **AND** no existing session exists for that user and knowledge point
- **THEN** the system creates a new `StudySession` with the knowledge point title

#### Scenario: Existing session is reused
- **WHEN** a student opens the AI assistant on a knowledge point that already has a session
- **THEN** the system returns the existing `StudySession`
- **AND** its historical messages are loaded

### Requirement: Session creation is idempotent
The system SHALL use an upsert operation to prevent duplicate sessions for the same `(userId, knowledgePointId)`.

#### Scenario: Concurrent session creation
- **WHEN** two requests attempt to create a session for the same user and knowledge point simultaneously
- **THEN** only one session is created
- **AND** both requests receive the same session id

### Requirement: Session has a unique constraint on (userId, knowledgePointId)
The system SHALL enforce a unique constraint on the `(userId, knowledgePointId)` pair in the `StudySession` table so that upsert and concurrent creation behave correctly.

#### Scenario: Duplicate session attempt
- **WHEN** a request tries to create a second session for the same user and knowledge point
- **THEN** the existing session is returned instead of creating a duplicate

### Requirement: Messages are persisted per session
The system SHALL store every user message and agent message in the `StudyMessage` table linked to the session.

#### Scenario: Student sends a question
- **WHEN** a student sends a question
- **THEN** a `StudyMessage` record with `role=user` is created
- **AND** after the LLM responds, a `StudyMessage` record with `role=agent` is created
- **AND** the agent message stores the parsed `followUps` array

### Requirement: Messages can be retrieved in chronological order
The system SHALL return all messages for a session ordered by `createdAt` ascending.

#### Scenario: Loading chat history
- **WHEN** a student opens the AI assistant for a knowledge point with prior messages
- **THEN** the system returns the messages in chronological order
- **AND** the UI displays them in the correct conversation sequence

### Requirement: Session access is scoped to the owning user
The system SHALL only allow a student to access their own sessions.

#### Scenario: Another user attempts access
- **WHEN** a user requests a session that belongs to another user
- **THEN** the system returns HTTP 404

### Requirement: Messages support user feedback
The system SHALL allow a user to record positive or negative feedback on an agent message.

#### Scenario: User rates a message
- **WHEN** a user submits feedback for an agent message
- **THEN** the system stores the feedback value in the `StudyMessage` record
- **AND** only the owning user can submit feedback for messages in their session
- **AND** the user can update or remove their feedback
