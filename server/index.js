import express from "express";
import bodyParser from "body-parser";
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

function formatResponse(result) {
  var noteList = [];

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
    };

    noteList.push(note);
  });

  return noteList;
}

async function getNoteList(db) {
  const result = await db.query("SELECT * FROM book_notes");
  return formatResponse(result);
}

async function getNoteById(db, id) {
  const result = await db.query("SELECT * FROM book_notes WHERE id=($1)", [id]);
  return formatResponse(result);
}

app.get("/notes", async (_, res) => {
  let db = new pg.Client(dbCfg);
  db.connect();

  let notes = await getNoteList(db);
  db.end();

  res.send(notes);
});

app.get("/note/:id", async (req, res) => {
  let db = new pg.Client(dbCfg);
  db.connect();

  let note = await getNoteById(db, req.params.id);
  db.end();

  res.send(note);
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
