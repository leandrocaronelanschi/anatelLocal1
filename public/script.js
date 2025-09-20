document
  .getElementById("buscaForm")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // evita envio tradicional do form

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
        const resultadoDiv = document.getElementById("resultado");

        if (!data.rows || data.rows.length === 0) {
          resultadoDiv.innerHTML = "<p>Nenhum registro encontrado.</p>";
          return;
        }

        // Montar tabela HTML com os dados
        let html = `<p>Total de resultados: ${data.count}</p><table><thead><tr>
        <th>Entidade</th><th>Tecnologia</th><th>Geração</th>
        <th>Faixa</th><th>UF</th><th>Município</th><th>Bairro</th>
        <th>Endereço</th><th>CEP</th><th>Latitude</th><th>Longitude</th>
      </tr></thead><tbody>`;

        data.rows.forEach((row) => {
          html += `<tr>
          <td>${row.entidade || ""}</td>
          <td>${row.tecnologia || ""}</td>
          <td>${row.geracao || ""}</td>
          <td>${row.faixa || ""}</td>
          <td>${row.uf || ""}</td>
          <td>${row.municipio || ""}</td>
          <td>${row.bairro || ""}</td>
          <td>${row.endereco || ""}</td>
          <td>${row.cep || ""}</td>
          <td>${row.latitude ?? ""}</td>
          <td>${row.longitude ?? ""}</td>
        </tr>`;
        });

        html += "</tbody></table>";
        resultadoDiv.innerHTML = html;
      })
      .catch((error) => {
        document.getElementById(
          "resultado"
        ).innerHTML = `<p>Erro na busca: ${error.message}</p>`;
      });
  });
