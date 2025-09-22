const fs = require("fs");
const { parse } = require("csv-parse");

const SOURCE = "./data/estacoes.csv";

const stateSet = new Set();
const cityByState = new Map();
const hoodByCity = new Map();

function normalizeCity(municipioUF) {
  if (!municipioUF) return null;
  const parts = String(municipioUF).split(" - ");
  return parts[0]?.trim() || null;
}

function addToMapSet(map, key, value) {
  if (!map.has(key)) map.set(key, new Set());
  if (value) map.get(key).add(value);
}

async function buildIndexes() {
  return new Promise((resolve, reject) => {
    const parser = parse({
      columns: true,
      delimiter: ";",
      trim: true,
      skip_empty_lines: true,
      relaxColumnCount: true,
    });

    fs.createReadStream(SOURCE)
      .pipe(parser)
      .on("data", (row) => {
        const uf = row["UF"]?.trim() || null;
        const cidade = normalizeCity(row["Município-UF"]);
        const bairro = row["EndBairro"]?.trim() || null;

        if (uf) stateSet.add(uf);
        if (uf && cidade) addToMapSet(cityByState, uf, cidade);
        if (uf && cidade && bairro)
          addToMapSet(hoodByCity, `${uf}|${cidade}`, bairro);
      })
      .on("end", resolve)
      .on("error", reject);
  });
}

function distanceInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// FUNÇÃO search MODIFICADA PARA RETORNAR TODOS OS CAMPOS!
async function search({ uf, cidade, bairro, cep, lat, lng, raio }) {
  return new Promise((resolve, reject) => {
    const results = [];
    const parser = parse({
      columns: true,
      delimiter: ";",
      trim: true,
      skip_empty_lines: true,
      relaxColumnCount: true,
    });

    fs.createReadStream(SOURCE)
      .pipe(parser)
      .on("data", (row) => {
        const ufVal = row["UF"]?.trim();
        const cityVal = normalizeCity(row["Município-UF"]);
        const hoodVal = row["EndBairro"]?.trim();
        const cepVal = row["Cep"]?.trim();
        const latVal = parseFloat(row["Latitude decimal"]);
        const lonVal = parseFloat(row["Longitude decimal"]);

        // Aplicar filtros normalmente
        if (uf && ufVal !== uf) return;
        if (cidade && cityVal !== cidade) return;
        if (bairro && hoodVal !== bairro) return;
        if (cep && cepVal !== cep) return;
        if (lat && lng && raio) {
          if (
            isNaN(latVal) ||
            isNaN(lonVal) ||
            distanceInKm(lat, lng, latVal, lonVal) > raio
          )
            return;
        }

        // Retorne toda a linha do CSV (todos campos do cabeçalho)
        results.push(row);
      })
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

function getStates() {
  return Array.from(stateSet).sort();
}
function getCities(uf) {
  return Array.from(cityByState.get(uf) || []).sort();
}
function getHoods(uf, cidade) {
  return Array.from(hoodByCity.get(`${uf}|${cidade}`) || []).sort();
}

module.exports = { buildIndexes, search, getStates, getCities, getHoods };
