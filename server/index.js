import express from "express";
import pg from "pg";

const app = express();
const port = 3000;
const dbCfg = {
  host: "localhost",
  port: 5432,
  database: "book_notes",
  user: "postgres",
  password: "postgres",
};
const bookCoverUrl = "https://covers.openlibrary.org/b/isbn/";
const bookCoverSize = "M";
const bookCoverFormat = ".jpg";

function formatResponse(result) {
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

async function getNoteList() {
  let db = new pg.Client(dbCfg);
  db.connect();

  try {
    const result = await db.query("SELECT * FROM book_notes");
    return [formatResponse(result), null];
  } catch (err) {
    return [null, err];
  } finally {
    db.end();
  }
}

async function getNoteById(id) {
  let db = new pg.Client(dbCfg);
  db.connect();

  try {
    const result = await db.query("SELECT * FROM book_notes WHERE id=($1)", [
      id,
    ]);

    return [formatResponse(result), null];
  } catch (err) {
    return [null, err];
  } finally {
    db.end();
  }
}

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

    return [formatResponse(result), null];
  } catch (err) {
    return [null, err];
  } finally {
    db.end();
  }
}

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
    return [formatResponse(result), null];
  } catch (err) {
    return [null, err];
  } finally {
    db.end();
  }
}

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

app.use(express.json());

app.get("/notes", async (_, res) => {
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

app.get("/note/:id", async (req, res) => {
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

app.post("/note", async (req, res) => {
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

app.put("/note", async (req, res) => {
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

app.delete("/note/:id", async (req, res) => {
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

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
