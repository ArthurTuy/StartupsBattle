import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Vencedor.css";

export default function Vencedor() {
  const [ranking, setRanking] = useState([]);
  const [campeao, setCampeao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function carregarDados() {
      try {
        const res = await axios.get("http://localhost:8000/relatorio-final");
        setRanking(res.data.ranking || []);
        setCampeao(res.data.campeao || null);
      } catch (err) {
        console.error("Erro ao carregar dados do vencedor:", err);
        alert("Erro ao carregar dados do vencedor.");
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, []);

  if (carregando) {
    return <p style={{ textAlign: "center", marginTop: 40 }}>Carregando dados do torneio...</p>;
  }

  return (
    <div className="vencedor-container">
      <h2>🏆 Startup Campeã</h2>
      {campeao ? (
        <div className="campeao-info">
          <h3>{campeao.nome}</h3>
          <p><em>{campeao.slogan}</em></p>
        </div>
      ) : (
        <p style={{ textAlign: "center" }}>Nenhum campeão definido.</p>
      )}

      <h2 style={{ marginTop: 40 }}>Ranking Final</h2>

      {ranking.length > 0 ? (
        <table className="tabela-final">
          <thead>
            <tr>
              <th>Startup</th>
              <th>Pontos</th>
              <th>Pitch</th>
              <th>Bugs</th>
              <th>Trações</th>
              <th>Investidores</th>
              <th>Fake News</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((s, i) => (
              <tr key={i}>
                <td>{s.nome}</td>
                <td>{s.pontos}</td>
                <td>{s.pitch || 0}</td>
                <td>{s.bugs || 0}</td>
                <td>{s.tracao || 0}</td>
                <td>{s.investidor_irritado || 0}</td>
                <td>{s.fake_news || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ textAlign: "center" }}>Nenhuma startup registrada no ranking final.</p>
      )}

      <div style={{ textAlign: "center", marginTop: 30 }}>
        <button className="voltar-btn" onClick={() => navigate("/")}>
          Voltar ao início
        </button>
      </div>
    </div>
  );
}
