## ADDED Requirements

### Requirement: Identity file defines the agent persona
The system SHALL read `server/study-agent-config/Identity.md` and use it as part of the system prompt.

#### Scenario: Service loads identity
- **WHEN** the backend service starts
- **THEN** it reads `Identity.md`
- **AND** the file content is included in the system prompt sent to the LLM

### Requirement: Memory file defines global constraints
The system SHALL read `server/study-agent-config/Memory.md` and use it as part of the system prompt.

#### Scenario: Service loads memory
- **WHEN** the backend service starts
- **THEN** it reads `Memory.md`
- **AND** the file content is included in the system prompt sent to the LLM

### Requirement: SOULE file defines values and follow-up strategy
The system SHALL read `server/study-agent-config/SOULE.md` and use it as part of the system prompt.

#### Scenario: Service loads SOULE
- **WHEN** the backend service starts
- **THEN** it reads `SOULE.md`
- **AND** the file content instructs the LLM to output 3 follow-up questions after each answer

### Requirement: Configuration files are loaded at startup
The system SHALL load all three configuration files during service startup and cache them in memory.

#### Scenario: First request after startup
- **WHEN** the first study-agent request is received after startup
- **THEN** the system uses the cached configuration
- **AND** it does not re-read the files on every request

### Requirement: Missing configuration files are handled gracefully
The system SHALL fail fast with a clear error if any configuration file is missing.

#### Scenario: Identity.md is missing
- **WHEN** `Identity.md` is not present at startup
- **THEN** the system logs an error and refuses to process study-agent requests
