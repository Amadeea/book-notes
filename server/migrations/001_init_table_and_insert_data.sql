-- CREATE TABLES
CREATE TABLE IF NOT EXISTS users (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) NOT NULL,
  "password" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS book_notes (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(200) NOT NULL,
  "author" VARCHAR (200) NOT NULL,
  "isbn" VARCHAR(20),
  "cover_url" VARCHAR,
  "date_read" DATE DEFAULT NOW(),
  "score" SMALLINT,
  "summary" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- INSERT DATAS
INSERT INTO users (username, password)
VALUES ('testUser','$2a$12$cEzrkXYlCFhNpE9uLXgd3.RkhgdZs74rPbG1IcYGezCosMYm1HiCa');

INSERT INTO book_notes(title, author, isbn, cover_url, date_read, score, summary, note)
VALUES(
  'How to Win Friends & Influence People',
  'Dale Carnegie',
  '1439167346',  
  'https://covers.openlibrary.org/b/isbn/1439167346-M.jpg',
  '2025-07-21',
  9,
  'Your ability to lead others, make friends, influence people, have a happy relationship, all depend on how you make other people feel when they interact with you.',
  'Techniques in Handling People: Don’t criticize, condemn, or complain.;Give honest and sincere appreciation.;Arouse in the other person an eager want.'
);
INSERT INTO book_notes(title, author, isbn, cover_url, date_read, score, summary, note)
VALUES(
  'Men are from Mars Women are from Venus',
  'John Gray',
  '9780060574215',
  'https://covers.openlibrary.org/b/isbn/9780060574215-M.jpg',
  '2025-12-06',
  10,
  'Explores the fundamental differences between men and women in communication, emotional needs, and behavior, using the metaphor of different planets to illustrate these disparities.',
  'Men tend to be problem-solvers, often offering solutions when women express concerns, while women often seek empathy and understanding rather than immediate fixes.'
);