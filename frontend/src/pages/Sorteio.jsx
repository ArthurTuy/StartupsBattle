import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/Sorteio.css";
import axios from "axios";

export default function Sorteio() {
  const location = useLocation();
  const navigate = useNavigate();

  const [batalhas, setBatalhas] = useState([]);
  const [classificados, setClassificados] = useState([]);
  const [gerandoConfrontos, setGerandoConfrontos] = useState(false);
  const [campeao, setCampeao] = useState(null);
  const [faseAtual, setFaseAtual] = useState(1);

  useEffect(() => {
    async function carregarDados() {
      try {
        const resConfrontos = await axios.get("http://localhost:8000/confrontos");
        const resClassificados = await axios.get("http://localhost:8000/confrontos/classificados");

        const dadosConfrontos = resConfrontos.data;
        const dadosClassificados = resClassificados.data;

        setBatalhas(dadosConfrontos);
        if (dadosConfrontos.length > 0) {
          setFaseAtual(dadosConfrontos[0].fase || 1);
        }

        if (dadosClassificados.length === 1 && dadosClassificados[0].campeao) {
          setCampeao(dadosClassificados[0]);
          navigate("/vencedor");
          return;
        }

        const lista = dadosClassificados.map((c) => c.vencedor || c);
        setClassificados(lista);

        const todasEncerradas =
          dadosConfrontos.length > 0 &&
          dadosConfrontos.every((b) => b.encerrado);

        if (location.state?.ultimaBatalhaFinalizada && todasEncerradas) {
          setGerandoConfrontos(true);
          setTimeout(async () => {
            try {
              const res = await axios.post("http://localhost:8000/confrontos/gerar-proxima-fase");
              if (res.data.message === "Torneio finalizado. Apenas um vencedor.") {
                navigate("/vencedor");
              } else {
                navigate("/sorteio", { state: {} });
              }
            } catch (err) {
              console.error("Erro ao gerar próxima fase:", err);
              alert("Erro ao gerar próxima fase.");
            }
          }, 2000);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        alert("Erro ao carregar dados.");
      }
    }

    carregarDados();
  }, [location.state, navigate]);

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: 24 }}>
      <button className="voltar-btn" onClick={() => navigate("/")}>
        ← Voltar para o cadastro
      </button>

      <h2 style={{ textAlign: "center", marginBottom: 30 }}>
        Batalhas Sorteadas {faseAtual > 1 && `(Fase ${faseAtual})`}
      </h2>

      {batalhas.map((batalha, index) => {
        const encerrada = batalha.encerrado;
        const vencedor = batalha.vencedor;

        const pontosA =
          encerrada && vencedor?.nome === batalha.startup_a.nome
            ? vencedor.pontos
            : batalha.startup_a.pontos;

        const pontosB =
          encerrada && vencedor?.nome === batalha.startup_b.nome
            ? vencedor.pontos
            : batalha.startup_b.pontos;

        return (
          <div key={index} className="batalha-card">
            <div className="batalha-topo">
              <div className="lado">
                <div className="pontos">{pontosA}</div>
                <div className="nome">{batalha.startup_a.nome}</div>
              </div>
              <div className="versus">X</div>
              <div className="lado">
                <div className="pontos">{pontosB}</div>
                <div className="nome">{batalha.startup_b.nome}</div>
              </div>
            </div>

            {encerrada && vencedor ? (
              <div className="finalizado">
                🏆 <strong>{vencedor.nome}</strong> venceu
              </div>
            ) : (
              <button
                className="admin-btn-full"
                onClick={() => navigate(`/confrontos/${index}`, { state: { batalha } })}
              >
                Administrar
              </button>
            )}
          </div>
        );
      })}

      <h2 style={{ textAlign: "center", marginTop: 40 }}>
        {campeao ? "🏆 VENCEDOR DO TORNEIO" : "Classificados para a próxima fase"}
      </h2>

      {!campeao &&
        classificados.map((startup, i) => (
          <div key={i} className="classificado-card">
            <div className="classificado-info">
              <div className="classificado-nome">{startup.nome}</div>
              <div className="classificado-pontos">{startup.pontos} pontos</div>
            </div>
          </div>
        ))}

      {gerandoConfrontos && (
        <p style={{ textAlign: "center", marginTop: 30 }}>
          <em>Gerando próximos confrontos...</em>
        </p>
      )}
    </div>
  );
}
