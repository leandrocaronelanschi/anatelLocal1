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

async function search({ uf, cidade, bairro }) {
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

        if (uf && ufVal !== uf) return;
        if (cidade && cityVal !== cidade) return;
        if (bairro && hoodVal !== bairro) return;

        results.push({
          entidade: row["Entidade"],
          tecnologia: row["Tecnologia"],
          geracao: row["Geração"],
          faixa: row["Faixa Estação"],
          subfaixa: row["Subfaixa Estação"],
          uf: ufVal,
          municipio: cityVal,
          bairro: hoodVal,
          endereco: row["EnderecoEstacao"],
          latitude: row["Latitude decimal"],
          longitude: row["Longitude decimal"],
          data_validade: row["Data Validade"],
        });
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
