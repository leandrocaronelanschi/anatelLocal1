const express = require("express");
const path = require("path");
const session = require("express-session");
const {
  buildIndexes,
  search,
  getStates,
  getCities,
  getHoods,
} = require("./csv-service");

const app = express();
app.use(express.json());

// Configuração da sessão
app.use(
  session({
    secret: "umSegredoMuitoSecreto",
    resave: false,
    saveUninitialized: false,
  })
);

// Content Security Policy para segurança
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://use.typekit.net; " +
      "style-src 'self' 'unsafe-inline' https://use.typekit.net https://www.gstatic.com; " +
      "font-src 'self' https://use.typekit.net data:; " +
      "connect-src 'self' http://localhost:3000 ws://localhost:3000; " +
      "img-src 'self' data:; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'"
  );
  next();
});

// Servir arquivos estáticos, mas DESABILITAR a entrega automática do index.html na raiz
app.use(express.static(path.join(__dirname, "..", "public"), { index: false }));

// Usuários exemplo
const USERS = [{ username: "admin", password: "123456" }];

// Rota POST para login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(
    (u) => u.username === username && u.password === password
  );
  if (user) {
    req.session.user = username;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: "Usuário ou senha inválidos!" });
  }
});

// Rota para logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login.html"));
});

// Middleware para proteger rotas e redirecionar quem não estiver logado para login
app.use((req, res, next) => {
  if (
    req.path === "/login" ||
    req.path === "/login.html" ||
    req.path === "/logout" ||
    req.path.startsWith("/assets/") ||
    req.path.startsWith("/css/") ||
    req.path.startsWith("/js/")
  )
    return next();

  if (!req.session.user) {
    return res.redirect("/login.html");
  }
  next();
});

// Rota raiz protegida, serve index.html só para usuário autenticado
app.get("/", (req, res) => {
  if (req.session.user) {
    return res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  } else {
    return res.redirect("/login.html");
  }
});

// Rotas principais do sistema
app.get("/health", (_, res) => res.json({ ok: true, country: "Brasil" }));

app.get("/filters/states", (req, res) => {
  res.json({ country: "Brasil", states: getStates() });
});

app.get("/filters/cities", (req, res) => {
  const { uf } = req.query;
  if (!uf) return res.status(400).json({ error: "Informe uf" });
  res.json({ uf, cities: getCities(uf) });
});

app.get("/filters/neighborhoods", (req, res) => {
  const { uf, cidade } = req.query;
  if (!uf || !cidade)
    return res.status(400).json({ error: "Informe uf e cidade" });
  res.json({ uf, cidade, neighborhoods: getHoods(uf, cidade) });
});

app.get("/search", async (req, res) => {
  const uf = req.query.uf;
  const cidade = req.query.cidade;
  const bairro = req.query.bairro;
  const cep = req.query.cep;

  const lat = req.query.lat ? parseFloat(req.query.lat) : undefined;
  const lng = req.query.lng ? parseFloat(req.query.lng) : undefined;
  const raio = req.query.raio ? parseFloat(req.query.raio) : undefined;

  try {
    let rows;
    if (lat !== undefined && lng !== undefined && raio !== undefined) {
      rows = await search({ lat, lng, raio });
    } else {
      rows = await search({ uf, cidade, bairro, cep });
    }
    res.json({ count: rows.length, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;

buildIndexes()
  .then(() => {
    app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error("Falha ao indexar CSV:", e);
    process.exit(1);
  });
