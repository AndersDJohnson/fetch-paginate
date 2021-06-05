import express from "express";

const app = express();

app.use((req, _res, next) => {
  console.log(req.path, req.query);
  next();
});

app.get("/pages", (req, res) => {
  const page = (req.query.page as string) ?? "1";

  if (page === "1") {
    res.json({
      items: [{ name: "one" }, { name: "two" }],
    });
  } else if (page === "2") {
    res.json({
      items: [{ name: "three" }, { name: "four" }],
    });
  }

  res.status(404).end();
});

app.get("/pg", (req, res) => {
  const page = (req.query.pg as string) ?? "1";

  if (page === "1") {
    res.json({
      items: [{ name: "one" }, { name: "two" }],
    });
  } else if (page === "2") {
    res.json({
      items: [{ name: "three" }, { name: "four" }],
    });
  }

  res.status(404).end();
});

const items = [
  { name: "one" },
  { name: "two" },
  { name: "three" },
  { name: "four" },
];

app.get("/offset", (req, res) => {
  const offset = (req.query.offset as string) ?? "0";
  const limit = (req.query.limit as string) ?? "2";

  const sliced = items.slice(
    parseInt(offset, 10),
    parseInt(offset, 10) + parseInt(limit, 10)
  );

  if (sliced.length) {
    res.json({
      items: sliced,
    });
  }

  res.status(404).end();
});

app.get("/ofs", (req, res) => {
  const offset = (req.query.ofs as string) ?? "0";
  const limit = (req.query.lmt as string) ?? "2";

  const sliced = items.slice(
    parseInt(offset, 10),
    parseInt(offset, 10) + parseInt(limit, 10)
  );

  if (sliced.length) {
    res.json({
      items: sliced,
    });
  }

  res.status(404).end();
});

app.listen(54321, () => {
  console.log("http://localhost:54321");
});
