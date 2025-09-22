// Função para criar modal de carregamento com GIF
function createLoadingModal() {
  let modal = document.createElement("div");
  modal.id = "loadingModal";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  modal.style.display = "flex";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.zIndex = "9999";

  let content = document.createElement("div");
  content.style.background = "#fff";
  content.style.padding = "20px 30px";
  content.style.borderRadius = "8px";
  content.style.textAlign = "center";
  content.style.minWidth = "280px";

  let message = document.createElement("p");
  message.textContent =
    "O programa está na fase de teste! Isso pode demorar alguns segundos.";
  message.style.marginBottom = "15px";
  message.style.fontWeight = "bold";

  // Ícone carregando GIF (coloque um arquivo loading.gif na pasta public)
  let spinner = document.createElement("img");
  spinner.src = "./assets/loading.gif"; // caminho do gif na pasta public
  spinner.alt = "Carregando...";
  spinner.style.width = "200px";
  spinner.style.height = "auto";
  spinner.style.display = "flex";
  spinner.style.margin = "0 auto";

  content.appendChild(message);
  content.appendChild(spinner);
  modal.appendChild(content);
  document.body.appendChild(modal);
}

// Função para remover o modal de carregamento
function removeLoadingModal() {
  let modal = document.getElementById("loadingModal");
  if (modal) modal.remove();
}

document
  .getElementById("buscaForm")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // evita envio tradicional do form

    // Limpa resultados e mensagens anteriores
    const resultadoDiv = document.getElementById("resultado");
    resultadoDiv.innerHTML = "";

    // Exibe modal carregando
    createLoadingModal();

    // Pega todos os campos do form
    const formData = new FormData(this);

    // Monta query string ignorando campos vazios
    const params = Array.from(formData.entries())
      .filter(([_, value]) => value.trim() !== "")
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value.trim())}`
      )
      .join("&");

    // Faz requisição GET para /search com os parâmetros
    fetch("/search?" + params)
      .then((response) => response.json())
      .then((data) => {
        // Remove modal carregando
        removeLoadingModal();

        if (!data.rows || data.rows.length === 0) {
          resultadoDiv.innerHTML = "<p>Nenhum registro encontrado.</p>";
          return;
        }

        // Salva resultado para reordenar depois
        window.tabelaRows = data.rows.slice();
        window.tabelaHeaders = Object.keys(data.rows[0]);
        window.tabelaSort = { key: null, asc: true };
        renderTable(window.tabelaRows, window.tabelaHeaders, window.tabelaSort);
      })
      .catch((error) => {
        // Remove modal carregando
        removeLoadingModal();
        resultadoDiv.innerHTML = `<p>Erro na busca: ${error.message}</p>`;
      });
  });

function renderTable(rows, headers, sortState) {
  const resultadoDiv = document.getElementById("resultado");
  let html = `<p>Total de resultados: ${rows.length}</p><table><thead><tr>`;

  headers.forEach((key) => {
    let sortArrow = ' <span style="color:#888;">▲▼</span>';
    if (sortState.key === key) {
      sortArrow = sortState.asc
        ? ' <span style="color:#0658b2; font-weight:bold;">▲</span>'
        : ' <span style="color:#0658b2; font-weight:bold;">▼</span>';
    }
    html += `<th data-key="${key}" style="cursor:pointer">${key}${sortArrow}</th>`;
  });

  html += "</tr></thead><tbody>";

  rows.forEach((row) => {
    html += "<tr>";
    headers.forEach((key) => {
      html += `<td>${row[key] ?? ""}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  resultadoDiv.innerHTML = html;

  // Liga evento de ordenação nos cabeçalhos da tabela
  resultadoDiv.querySelectorAll("th").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-key");
      let asc = true;
      if (window.tabelaSort.key === key) {
        asc = !window.tabelaSort.asc;
      }
      window.tabelaSort = { key, asc };
      sortAndRender(key, asc);
    });
  });
}

function sortAndRender(key, asc) {
  const rows = window.tabelaRows;
  const isNumeric = rows.every(
    (row) =>
      row[key] !== undefined && row[key] !== "" && !isNaN(Number(row[key]))
  );
  rows.sort((a, b) => {
    let v1 = a[key] ?? "";
    let v2 = b[key] ?? "";
    if (isNumeric) {
      v1 = Number(v1);
      v2 = Number(v2);
      return asc ? v1 - v2 : v2 - v1;
    } else {
      return asc
        ? String(v1).localeCompare(String(v2), "pt-BR", { sensitivity: "base" })
        : String(v2).localeCompare(String(v1), "pt-BR", {
            sensitivity: "base",
          });
    }
  });
  renderTable(rows, window.tabelaHeaders, window.tabelaSort);
}
