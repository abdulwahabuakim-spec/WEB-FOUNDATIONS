# School Database Design

## Tables

### students
- `id` INTEGER PRIMARY KEY - unique identifier
- `name` TEXT NOT NULL - student full name, required
- `email` TEXT NOT NULL UNIQUE - must be unique and required to prevent duplicate accounts

### courses
- `id` INTEGER PRIMARY KEY
- `title` TEXT NOT NULL - course name, required
- `description` TEXT - optional details

### enrolments
- `id` INTEGER PRIMARY KEY
- `student_id` INTEGER NOT NULL FOREIGN KEY -> students(id) ON DELETE CASCADE
- `course_id` INTEGER NOT NULL FOREIGN KEY -> courses(id) ON DELETE CASCADE
- `grade` TEXT - grade for that student in that course, can be NULL until graded
- `UNIQUE(student_id, course_id)` - prevents same student enrolling twice in same course

## Relationships

- **One-to-Many**: One student -> many enrolments. Implemented by `enrolments.student_id` FK.
- **One-to-Many**: One course -> many enrolments. Implemented by `enrolments.course_id` FK.
- **Many-to-Many**: Students <-> Courses. One student can take many courses, one course has many students.
- **Why join table needed**: Relational databases cannot store a list in one column. We need a separate table `enrolments` to store pairs of (student_id, course_id) plus extra data like `grade`. This follows normalization - no comma-separated values.

## Index

```sql
CREATE INDEX idx_enrolments_student_id ON enrolments(student_id);