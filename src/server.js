const express = require("express");
const {
  buildIndexes,
  search,
  getStates,
  getCities,
  getHoods,
} = require("./csv-service");

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' https: data:; " +
      "font-src 'self' https: data:; " +
      "style-src 'self' 'unsafe-inline' https:; " +
      "script-src 'self' 'unsafe-inline' https:;"
  );
  next();
});

app.use(express.static("public"));

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

const PORT = process.env.PORT || 3000;

buildIndexes()
  .then(() => {
    app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error("Falha ao indexar CSV:", e);
    process.exit(1);
  });

// Endpoint unificado para as duas formas de busca
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

    // Se lat, lng e raio estão definidos, faz busca espacial somente
    if (lat !== undefined && lng !== undefined && raio !== undefined) {
      rows = await search({ lat, lng, raio });
    } else {
      // Senão usa a busca tradicional por 1-4 filtros (qualquer combinação deles)
      rows = await search({ uf, cidade, bairro, cep });
    }
    res.json({ count: rows.length, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
