-- Day 6 School Database - SQLite compatible

-- Clean up if rerun
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS courses;

-- 1. STUDENTS TABLE
CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

-- 2. COURSES TABLE
CREATE TABLE courses (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT
);

-- 3. ENROLMENTS TABLE - join table with grade, links students and courses
CREATE TABLE enrolments (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  grade TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE (student_id, course_id)
);

-- SAMPLE DATA
INSERT INTO students (id, name, email) VALUES
(1, 'Amina Otieno', 'amina@example.com'),
(2, 'John Kato', 'john@example.com'),
(3, 'Fatima Ali', 'fatima@example.com'),
(4, 'David Okello', 'david@example.com');

INSERT INTO courses (id, title, description) VALUES
(1, 'Intro to SQL', 'Basics of relational databases'),
(2, 'Web Foundations', 'HTML CSS and JS fundamentals'),
(3, 'Data Structures', 'Arrays, trees and graphs');

INSERT INTO enrolments (id, student_id, course_id, grade) VALUES
(1, 1, 1, 'B'),
(2, 1, 2, 'A'),
(3, 2, 1, 'C'),
(4, 2, 3, 'B'),
(5, 3, 2, 'A');

-- QUERIES

-- 1. All courses for one student (by name) - Amina Otieno
SELECT courses.title, enrolments.grade
FROM courses
JOIN enrolments ON courses.id = enrolments.course_id
JOIN students ON students.id = enrolments.student_id
WHERE students.name = 'Amina Otieno';

-- 2. All students on one course - Intro to SQL
SELECT students.name, students.email
FROM students
JOIN enrolments ON students.id = enrolments.student_id
JOIN courses ON courses.id = enrolments.course_id
WHERE courses.title = 'Intro to SQL';

-- 3. Number of students per course
SELECT courses.title, COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments ON courses.id = enrolments.course_id
GROUP BY courses.id;

-- 4. Students who have no enrolments
SELECT students.name
FROM students
LEFT JOIN enrolments ON students.id = enrolments.student_id
WHERE enrolments.student_id IS NULL;

-- 5. Update of one enrolment's grade
UPDATE enrolments SET grade = 'A' WHERE id = 1;

-- Verify update
SELECT * FROM enrolments WHERE id = 1;