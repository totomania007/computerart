-- ============================================================
-- Classwork Hub — Cloudflare D1 Database Schema (Clean)
-- ============================================================

DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS assignment_examples;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS post_comments;
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS posts;

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'คุณครู',
  text TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  video_file_url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE post_likes (
  post_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, user_name),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  due_date TEXT NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 10,
  attachment_name TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE assignment_examples (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  type TEXT DEFAULT 'image/png',
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  text TEXT,
  file_name TEXT,
  file_url TEXT,
  file_type TEXT,
  link TEXT,
  submitted_at TEXT NOT NULL,
  score REAL,
  comment TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  graded_at TEXT,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_comments_post ON post_comments(post_id);
CREATE INDEX idx_likes_post ON post_likes(post_id);
CREATE INDEX idx_assignments_created ON assignments(created_at DESC);
CREATE INDEX idx_examples_assignment ON assignment_examples(assignment_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_name);