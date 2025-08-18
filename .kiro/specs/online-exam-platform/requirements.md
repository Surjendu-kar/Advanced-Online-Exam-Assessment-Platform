# Requirements Document

## Introduction

This document outlines the requirements for an Advanced Online Exam & Assessment Platform that provides comprehensive examination capabilities including multiple choice questions (MCQ), short answer questions (SAQ), and coding challenges with real-time execution. The platform includes advanced proctoring features, secure access controls, and comprehensive analytics for both students and educators.

## Requirements

### Requirement 1: Admin-Controlled User Management and Authentication

**User Story:** As a platform administrator, I want to control user access by managing teacher accounts and allowing teachers to invite students, so that the platform maintains security and commercial viability.

#### Acceptance Criteria

1. WHEN a user visits the platform THEN the system SHALL display only login options (no public registration)
2. WHEN an admin creates a teacher account THEN the system SHALL send welcome email with login credentials
3. WHEN a teacher invites a student THEN the system SHALL send invitation email with registration link
4. WHEN a student clicks invitation link THEN the system SHALL auto-register them as a student
5. WHEN a user logs in THEN the system SHALL authenticate using Supabase Auth and determine role
6. WHEN authentication succeeds THEN the system SHALL redirect to role-appropriate dashboard
7. IF user is admin THEN the system SHALL provide teacher account management capabilities
8. IF user is teacher THEN the system SHALL provide exam creation and student invitation capabilities
9. IF user is student THEN the system SHALL provide exam participation capabilities

### Requirement 2: Exam Creation and Management

**User Story:** As a teacher, I want to create and manage exams with different question types, so that I can assess students comprehensively.

#### Acceptance Criteria

1. WHEN a teacher creates an exam THEN the system SHALL generate a unique exam code
2. WHEN creating an exam THEN the system SHALL allow setting exam duration, start/end times
3. WHEN adding questions THEN the system SHALL support MCQ, SAQ, and coding question types
4. WHEN creating MCQ THEN the system SHALL allow multiple options with one correct answer
5. WHEN creating SAQ THEN the system SHALL allow setting expected answers and marking criteria
6. WHEN creating coding questions THEN the system SHALL allow setting starter code and expected output
7. WHEN exam is created THEN the system SHALL save all questions to respective tables (mcq, saq, coding)

### Requirement 3: Secure Exam Access and Student Management

**User Story:** As a teacher, I want to control exam access by inviting specific students via email, so that only authorized students can participate in my exams.

#### Acceptance Criteria

1. WHEN creating an exam THEN the system SHALL allow adding student email addresses
2. WHEN student emails are added THEN the system SHALL send invitation emails with unique tokens
3. WHEN student clicks invitation link THEN the system SHALL auto-authenticate them for that exam
4. WHEN unauthorized student tries to access THEN the system SHALL deny access
5. IF exam has not started THEN the system SHALL display waiting message with start time
6. IF exam has ended THEN the system SHALL prevent access and show completion message
7. WHEN exam is active AND student is authorized THEN the system SHALL allow exam access
8. WHEN teacher wants open access THEN the system SHALL support exam codes as alternative

### Requirement 4: MCQ Assessment Interface

**User Story:** As a student, I want to answer multiple choice questions with an intuitive interface, so that I can complete my exam efficiently.

#### Acceptance Criteria

1. WHEN viewing MCQ THEN the system SHALL display question text and all options clearly
2. WHEN selecting an option THEN the system SHALL highlight the selected choice
3. WHEN changing selection THEN the system SHALL update the highlighted option
4. WHEN submitting MCQ THEN the system SHALL save selected_option to database
5. WHEN exam is submitted THEN the system SHALL auto-grade MCQ by comparing with correct_option
6. WHEN auto-grading THEN the system SHALL calculate marks_obtained based on correctness

### Requirement 5: SAQ Assessment Interface

**User Story:** As a student, I want to provide written answers to short answer questions, so that I can demonstrate my knowledge in detail.

#### Acceptance Criteria

1. WHEN viewing SAQ THEN the system SHALL display question text with text input area
2. WHEN typing answer THEN the system SHALL save draft automatically every 30 seconds
3. WHEN submitting SAQ THEN the system SHALL save answer_text to database
4. WHEN exam is submitted THEN the system SHALL mark SAQ as pending manual review
5. WHEN teacher reviews SAQ THEN the system SHALL allow assigning marks_obtained

### Requirement 6: Coding Challenge Interface

**User Story:** As a student, I want to solve coding problems with real-time code execution, so that I can test my solutions before submission.

#### Acceptance Criteria

1. WHEN viewing coding question THEN the system SHALL display problem statement and code editor
2. WHEN code editor loads THEN the system SHALL populate with starter_code if provided
3. WHEN student writes code THEN the system SHALL provide syntax highlighting for selected language
4. WHEN student clicks run THEN the system SHALL execute code using Judge0 API
5. WHEN code executes THEN the system SHALL display output and execution results
6. WHEN submitting code THEN the system SHALL save submitted_code and final output
7. WHEN exam is submitted THEN the system SHALL compare output with expected_output for auto-grading

### Requirement 7: Proctoring and Anti-Cheating

**User Story:** As a teacher, I want to monitor students during exams and detect potential cheating, so that I can maintain exam integrity.

#### Acceptance Criteria

1. WHEN exam starts THEN the system SHALL request webcam access from student
2. WHEN webcam is denied THEN the system SHALL prevent exam access
3. WHEN exam is active THEN the system SHALL continuously capture webcam feed
4. WHEN student switches tabs THEN the system SHALL detect and log the event
5. WHEN tab switching is detected THEN the system SHALL display warning to student
6. WHEN multiple violations occur THEN the system SHALL alert the teacher
7. WHEN exam ends THEN the system SHALL compile proctoring report with violations

### Requirement 8: Real-time Exam Monitoring

**User Story:** As a teacher, I want to monitor ongoing exams in real-time, so that I can ensure proper exam conduct.

#### Acceptance Criteria

1. WHEN exam is active THEN the system SHALL display live monitoring dashboard
2. WHEN viewing dashboard THEN the system SHALL show list of active participants
3. WHEN monitoring students THEN the system SHALL display webcam feeds in grid view
4. WHEN violations occur THEN the system SHALL highlight affected students with alerts
5. WHEN teacher clicks on student THEN the system SHALL show detailed violation history

### Requirement 9: Grading and Results

**User Story:** As a teacher, I want to grade exams and publish results, so that students can receive feedback on their performance.

#### Acceptance Criteria

1. WHEN exam ends THEN the system SHALL auto-grade MCQ and coding questions
2. WHEN auto-grading completes THEN the system SHALL calculate total marks for auto-gradable sections
3. WHEN teacher accesses grading THEN the system SHALL display pending SAQ for manual review
4. WHEN grading SAQ THEN the system SHALL allow assigning marks with comments
5. WHEN all grading is complete THEN the system SHALL calculate final scores
6. WHEN results are published THEN the system SHALL notify students via email

### Requirement 10: Analytics and Leaderboard

**User Story:** As a student and teacher, I want to view performance analytics and leaderboards, so that I can track progress and compare performance.

#### Acceptance Criteria

1. WHEN exam is completed THEN the system SHALL generate performance analytics
2. WHEN viewing analytics THEN the system SHALL display score breakdown by question type
3. WHEN teacher views analytics THEN the system SHALL show class performance statistics
4. WHEN leaderboard is accessed THEN the system SHALL display top performers for each exam
5. WHEN student views results THEN the system SHALL show individual performance compared to class average
6. WHEN analytics are generated THEN the system SHALL include time spent per question and accuracy rates

### Requirement 11: Payment Integration

**User Story:** As a teacher, I want to monetize premium features through payment integration, so that I can offer advanced functionality.

#### Acceptance Criteria

1. WHEN accessing premium features THEN the system SHALL prompt for payment
2. WHEN payment is initiated THEN the system SHALL integrate with Razorpay/Stripe
3. WHEN payment is successful THEN the system SHALL unlock premium features
4. WHEN payment fails THEN the system SHALL display error and retry options
5. WHEN subscription expires THEN the system SHALL restrict access to premium features

### Requirement 12: Responsive Design and User Experience

**User Story:** As a user, I want the platform to work seamlessly across devices with smooth animations, so that I can have a great user experience.

#### Acceptance Criteria

1. WHEN accessing platform THEN the system SHALL display responsive design on all screen sizes
2. WHEN navigating THEN the system SHALL provide smooth transitions using Framer Motion
3. WHEN loading content THEN the system SHALL display appropriate loading states
4. WHEN errors occur THEN the system SHALL display user-friendly error messages
5. WHEN using mobile device THEN the system SHALL optimize touch interactions and layout
