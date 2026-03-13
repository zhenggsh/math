## ADDED Requirements

### Requirement: User registration
The system SHALL allow new users to register with email and password.

#### Scenario: Student registration
- **WHEN** a user provides email, password, name, student number, class
- **THEN** the system SHALL create a user with role='STUDENT'

#### Scenario: Duplicate email prevention
- **WHEN** a user tries to register with an existing email
- **THEN** the system SHALL return error "Email already exists"

### Requirement: User login
The system SHALL authenticate users with email and password.

#### Scenario: Successful login
- **WHEN** a user provides correct email and password
- **THEN** the system SHALL return JWT token and user info

#### Scenario: Failed login
- **WHEN** a user provides incorrect credentials
- **THEN** the system SHALL return error "Invalid credentials" without revealing which field is wrong

### Requirement: JWT authentication
The system SHALL use JWT for stateless authentication.

#### Scenario: Protected API access
- **WHEN** a request includes valid JWT token in Authorization header
- **THEN** the system SHALL allow access and attach user info to request

#### Scenario: Expired token
- **WHEN** a request includes expired JWT token
- **THEN** the system SHALL return 401 Unauthorized

### Requirement: Password security
The system SHALL store passwords securely using bcrypt.

#### Scenario: Password hashing
- **WHEN** a user registers
- **THEN** the password SHALL be hashed with bcrypt (10+ rounds) before storage
