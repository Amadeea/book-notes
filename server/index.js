import express from "express";
import session from "express-session";
import pg from "pg";
import env from "dotenv";
import passport from "passport";
import LocalStrategy from "passport-local";
import bcrypt from "bcrypt";

env.config();

const app = express();
const port = 3000;
const saltRounds = 12;
const bookCoverUrl = "https://covers.openlibrary.org/b/isbn/";
const bookCoverSize = "M";
const bookCoverFormat = ".jpg";

const dbCfg = {
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
};

app.use(express.json());

//session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

//initialize passport.js with session
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  const db = new pg.Client(dbCfg);
  db.connect();
  db.query("SELECT * FROM users WHERE id = $1", [id], (err, result) => {
    if (err) {
      done(err);
      return;
    }
    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(new Error("User not found"));
    }
    db.end();
  });
});

// passport middleware to handle user's login
passport.use(
  "login",
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
    },
    async (username, password, done) => {
      const db = new pg.Client(dbCfg);
      db.connect();
      try {
        const result = await db.query(
          "SELECT * FROM users WHERE username = $1",
          [username]
        );
        if (result.rows.length === 0) {
          return done(null, false, { message: "User not found" });
        }
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      } finally {
        db.end();
      }
    }
  )
);

// passport middleware to handle user's registration
passport.use(
  "register",
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
    },
    async (username, password, done) => {
      const db = new pg.Client(dbCfg);
      db.connect();
      try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const result = await db.query(
          "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
          [username, hashedPassword]
        );
        const user = result.rows[0];
        return done(null, user);
      } catch (err) {
        if (err.code === "23505") {
          // Unique violation error
          return done(null, false, { message: "User already exists" });
        }
        return done(err);
      } finally {
        db.end();
      }
    }
  )
);

// formatNoteResponse converts SQL result to a more readable format
function formatNoteResponse(result) {
  let noteList = [];

  result.rows.forEach((item) => {
    let day = item.date_read.getDate();
    let month = item.date_read.getMonth() + 1;
    let year = item.date_read.getFullYear();
    let formattedDate = `${day}-${month}-${year}`;

    let note = {
      id: item.id,
      title: item.title,
      author: item.author,
      isbn: item.isbn,
      cover_url: item.cover_url,
      date_read: formattedDate,
      score: item.score,
      summary: item.summary,
      note: item.note,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };

    noteList.push(note);
  });

  return noteList;
}

// getNoteList retrieves all book notes from the database
async function getNoteList() {
  let db = new pg.Client(dbCfg);
  db.connect();

  try {
    const result = await db.query("SELECT * FROM book_notes");
    return [formatNoteResponse(result), null];
  } catch (err) {
    return [null, err];
  } finally {
    db.end();
  }
}

// getNoteById retrieves a single book note by its ID
async function getNoteById(id) {
  let db = new pg.Client(dbCfg);
  db.connect();

  try {
    const result = await db.query("SELECT * FROM book_notes WHERE id=($1)", [
      id,
    ]);

    return [formatNoteResponse(result), null];
  } catch (err) {
    return [null, err];
  } finally {
    db.end();
  }
}

// createNote inserts a new book note into the database
async function createNote(note) {
  const db = new pg.Client(dbCfg);
  db.connect();

  try {
    const result = await db.query(
      `INSERT INTO book_notes (title, author, isbn, cover_url, date_read, score, summary, note)
        VALUES (($1), ($2), ($3), ($4), ($5), ($6), ($7), ($8))
        RETURNING *
      `,
      [
        note.title,
        note.author,
        note.isbn,
        note.cover_url,
        note.date_read,
        note.score,
        note.summary,
        note.note,
      ]
    );

    return [formatNoteResponse(result), null];
  } catch (err) {
    return [null, err];
  } finally {
    db.end();
  }
}

// editNote updates an existing book note in the database
async function editNote(note) {
  const db = new pg.Client(dbCfg);
  db.connect();

  try {
    const result = await db.query(
      `UPDATE book_notes
        SET title = ($1),
           author = ($2),
           isbn = ($3),
           cover_url = ($4),
           date_read = ($5),
           score = ($6),
           summary = ($7),
           note = ($8),
           updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `,
      [
        note.title,
        note.author,
        note.isbn,
        note.cover_url,
        note.date_read,
        note.score,
        note.summary,
        note.note,
        note.id,
      ]
    );
    return [formatNoteResponse(result), null];
  } catch (err) {
    return [null, err];
  } finally {
    db.end();
  }
}

// deleteNoteById removes a book note from the database by its ID
async function deleteNoteById(id) {
  let db = new pg.Client(dbCfg);
  db.connect();

  try {
    await db.query("DELETE FROM book_notes WHERE id=($1)", [id]);
    return null;
  } catch (err) {
    return err;
  } finally {
    db.end();
  }
}

app.get("/notes/list", async (_, res) => {
  var [notes, err] = await getNoteList();
  if (err) {
    res.send({
      status: 400,
      err: err,
    });
    return;
  }

  res.send({
    status: 200,
    data: notes,
  });
});

app.get("/notes/:id", async (req, res) => {
  let id = req.params.id;
  if (!id) {
    res.send({
      status: 400,
      err: "Note's ID must be specified",
    });
    return;
  }

  var [note, err] = await getNoteById(id);
  if (err) {
    res.send({
      status: 400,
      err: err,
    });
    return;
  }

  res.send({
    status: 200,
    data: note,
  });
});

app.post("/notes", async (req, res) => {
  if (!req.body.title) {
    res.send({
      status: 400,
      error: "Book's title must be specified.",
    });
    return;
  }
  if (!req.body.author) {
    res.send({
      status: 400,
      error: "Book's author must be specified.",
    });
    return;
  }
  if (!req.body.isbn) {
    res.send({
      status: 400,
      error: "Book's ISBN must be specified.",
    });
    return;
  }

  req.body.cover_url =
    bookCoverUrl + req.body.isbn + "-" + bookCoverSize + bookCoverFormat;

  var [newNote, err] = await createNote(req.body);
  if (err) {
    res.send({
      status: 400,
      error: err,
    });
    return;
  }

  res.send({
    status: 200,
    data: newNote,
  });
});

app.put("/notes", async (req, res) => {
  let id = req.body.id;
  if (!id) {
    res.send({
      status: 400,
      err: "Note's ID must be specified",
    });
    return;
  }

  var [note, err] = await getNoteById(id);
  if (err) {
    res.send({
      status: 400,
      err: err,
    });
    return;
  }

  if (note.length === 0) {
    res.send({
      status: 400,
      err: "Note doesn't exist.",
    });
    return;
  }

  if (!req.body.title) {
    res.send({
      status: 400,
      error: "Book's title must be specified.",
    });
    return;
  }
  if (!req.body.author) {
    res.send({
      status: 400,
      error: "Book's author must be specified.",
    });
    return;
  }
  if (!req.body.isbn) {
    res.send({
      status: 400,
      error: "Book's ISBN must be specified.",
    });
    return;
  }

  req.body.cover_url =
    bookCoverUrl + req.body.isbn + "-" + bookCoverSize + bookCoverFormat;

  var [editedNote, err] = await editNote(req.body);
  if (err) {
    res.send({
      status: 400,
      error: err,
    });
    return;
  }

  res.send({
    status: 200,
    data: editedNote,
  });
});

app.delete("/notes/:id", async (req, res) => {
  let id = req.params.id;
  if (!id) {
    res.send({
      status: 400,
      err: "Note's ID must be specified",
    });
    return;
  }

  var err = await deleteNoteById(id);
  if (err) {
    res.send({
      status: 400,
      err: err,
    });
    return;
  }

  res.send({
    status: 200,
  });
});

app.post("/users/login", async (req, res, next) => {
  passport.authenticate("login", async (err, user, info) => {
    try {
      if (err) {
        return res.status(500).send({ error: err.message });
      }
      if (!user) {
        return res.status(401).send({ error: info.message });
      }
      req.login(user, async (err) => {
        if (err) {
          return res.status(500).send({ error: err.message });
        }
        return res.send({
          status: 200,
          message: "Login successful",
          // user: user,
        });
      });
    } catch (error) {
      return next(error);
    }
  })(req, res, next);
});

app.post("/users/register", async (req, res, next) => {
  passport.authenticate("register", async (err, user, info) => {
    try {
      if (err) {
        return res.status(500).send({ error: err.message });
      }
      if (!user) {
        return res.status(400).send({ error: info.message });
      }
      req.login(user, async (err) => {
        if (err) {
          return res.status(500).send({ error: err.message });
        }
        return res.send({
          status: 200,
          message: "Registration successful and logged in",
          // user: user,
        });
      });
    } catch (error) {
      return next(error);
    }
  })(req, res, next);
});

app.get("/users/login-check", (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.send({
      status: 200,
      message: "User is authenticated",
      // user: req.user,
    });
  } else {
    return res.status(401).send({ error: "User is not authenticated" });
  }
});

app.get("/users/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).send({ error: err.message });
    }
    return res.send({
      status: 200,
      message: "Logout successful",
    });
  });
});

app.listen(port, (err) => {
  if (err) {
    throw err;
  }
  console.log(`Server running on port ${port}`);
});
