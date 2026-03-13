## ADDED Requirements

### Requirement: User data model
The system SHALL store user information with role-based access control.

#### Scenario: Student user
- **WHEN** a student registers
- **THEN** the system SHALL store user id, name, student number, class, role='STUDENT'

#### Scenario: Teacher user
- **WHEN** a teacher registers
- **THEN** the system SHALL store user id, name, role='TEACHER' or 'ADMIN'

### Requirement: Knowledge point data model
The system SHALL store knowledge points from parsed Excel/CSV files.

#### Scenario: Knowledge point structure
- **WHEN** parsing a knowledge framework file
- **THEN** the system SHALL store id, code, level1, level2, level3, definition, characteristics, importance_level, source_file

### Requirement: Learning record data model
The system SHALL store user learning feedback for each knowledge point.

#### Scenario: Learning session
- **WHEN** user completes learning a knowledge point
- **THEN** the system SHALL store user_id, knowledge_point_id, start_time, duration_minutes, mastery_level (A/B/C/D/E), notes

### Requirement: Database naming convention
The system SHALL follow naming conventions for all database objects.

#### Scenario: Table naming
- **WHEN** creating tables
- **THEN** table names SHALL be snake_case and plural (users, knowledge_points, learning_records)

#### Scenario: Column naming
- **WHEN** creating columns
- **THEN** column names SHALL be snake_case (created_at, importance_level)

### Requirement: Prisma Client configuration
The system SHALL provide a configured Prisma Client for database access.

#### Scenario: Database connection
- **WHEN** the application starts
- **THEN** Prisma Client SHALL connect to PostgreSQL using environment variables

#### Scenario: Connection pooling
- **WHEN** handling multiple requests
- **THEN** Prisma Client SHALL use connection pooling for performance
