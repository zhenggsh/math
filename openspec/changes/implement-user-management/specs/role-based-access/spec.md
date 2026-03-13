## ADDED Requirements

### Requirement: Role definition
The system SHALL support three roles: STUDENT, TEACHER, ADMIN.

#### Scenario: Role assignment
- **WHEN** a user is created
- **THEN** the system SHALL assign exactly one role

### Requirement: Role-based API access
The system SHALL restrict API access based on user roles.

#### Scenario: Student access
- **GIVEN** a user with STUDENT role
- **WHEN** accessing learning-related endpoints
- **THEN** access SHALL be allowed

#### Scenario: Teacher access
- **GIVEN** a user with TEACHER role
- **WHEN** accessing knowledge management endpoints
- **THEN** access SHALL be allowed

#### Scenario: Admin access
- **GIVEN** a user with ADMIN role
- **WHEN** accessing user management endpoints
- **THEN** access SHALL be allowed

#### Scenario: Unauthorized access
- **GIVEN** a user with STUDENT role
- **WHEN** accessing teacher-only endpoints
- **THEN** the system SHALL return 403 Forbidden

### Requirement: Protected routes
The system SHALL protect API routes using Guards.

#### Scenario: Public routes
- **WHEN** accessing /auth/login or /auth/register
- **THEN** no authentication SHALL be required

#### Scenario: Private routes
- **WHEN** accessing any other API endpoint
- **THEN** valid JWT token SHALL be required
