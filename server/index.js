import express from "express";
// import pg from "pg";

const app = express();
const port = 3000;

// const db = new pg.Client({
//   user: "postgres",
//   host: "localhost",
//   database: "book-notes",
//   password: "postgres",
//   port: 5432,
// });
// db.connect();

app.get("/", (_, res) => {
  res.send("<h1>Hello<h1/>");
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
