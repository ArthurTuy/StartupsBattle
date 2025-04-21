import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import "../styles/Sorteio.css";
import axios from "axios";

export default function Sorteio() {
  const navigate = useNavigate();
  const [batalhas, setBatalhas] = useState([]);
  const [gerandoConfrontos, setGerandoConfrontos] = useState(false);
  const [faseAtual, setFaseAtual] = useState(1);
  const tentandoGerar = useRef(false);

  useEffect(() => {
    async function carregarDados() {
      try {
        const resConfrontos = await axios.get("http://localhost:8000/confrontos");
        const dadosConfrontos = resConfrontos.data;

        console.log("🔄 Dados das batalhas carregados:", dadosConfrontos);
        setBatalhas(dadosConfrontos);

        if (dadosConfrontos.length > 0) {
          setFaseAtual(dadosConfrontos[0].fase || 1);
        }

        const todasEncerradas = dadosConfrontos.every((b) => b.encerrado);
        console.log("✅ Todas encerradas?", todasEncerradas);

        if (todasEncerradas && dadosConfrontos.length > 0) {
          setGerandoConfrontos(true);
        }
      } catch (err) {
        console.error("❌ Erro ao carregar dados:", err);
        alert("Erro ao carregar dados.");
      }
    }

    carregarDados();

    const interval = setInterval(async () => {
      if (tentandoGerar.current) return;

      tentandoGerar.current = true;
      try {
        const resConfrontos = await axios.get("http://localhost:8000/confrontos");
        const dados = resConfrontos.data;
        const encerradas = dados.length > 0 && dados.every((b) => b.encerrado);

        console.log("📦 Verificação periódica:");
        console.log("→ Confrontos atuais:", dados);
        console.log("→ Encerradas:", encerradas);

        if (encerradas) {
          setGerandoConfrontos(true);
          console.log("⚙️ Tentando gerar nova fase...");

          const res = await axios.post("http://localhost:8000/confrontos/gerar-proxima-fase");
          console.log("📬 Resposta ao tentar gerar nova fase:", res.data);

          if (res.data?.message?.includes("Nova fase gerada")) {
            clearInterval(interval);
            window.location.reload(); // força recarregamento total
          }
        }
      } catch (err) {
        console.error("⚠️ Erro ao tentar gerar nova fase:", err);
      } finally {
        tentandoGerar.current = false;
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [navigate]);

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
                onClick={() => {
                  localStorage.setItem("batalhaAtual", JSON.stringify(batalha));
                  navigate(`/confrontos/${index}`);
                }}
              >
                Administrar
              </button>
            )}
          </div>
        );
      })}

      {gerandoConfrontos && (
        <p style={{ textAlign: "center", marginTop: 30 }}>
          <em>Gerando próximos confrontos...</em>
        </p>
      )}
    </div>
  );
}
