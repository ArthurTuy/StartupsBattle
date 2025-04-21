import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Confrontos.css";
import axios from "axios";

const eventos = [
  { nome: "Pitch convincente", valor: 6, campo: "pitch" },
  { nome: "Produto com bugs", valor: -4, campo: "bugs" },
  { nome: "Boa tracao de usuarios", valor: 3, campo: "tracao" },
  { nome: "Investidor irritado", valor: -6, campo: "investidor_irritado" },
  { nome: "Fake News", valor: -8, campo: "fake_news" },
];

export default function Confrontos() {
  const location = useLocation();
  const batalha = location.state?.batalha;
  const navigate = useNavigate();

  const [rodada, setRodada] = useState(1);
  const [maxRodadas] = useState(5);
  const [finalizada, setFinalizada] = useState(false);
  const [eventosAplicados, setEventosAplicados] = useState([]);
  const [usados, setUsados] = useState({ A: {}, B: {} });

  const [startupA, setStartupA] = useState(null);
  const [startupB, setStartupB] = useState(null);

  useEffect(() => {
    if (batalha) {
      setStartupA({ ...batalha.startup_a });
      setStartupB({ ...batalha.startup_b });
    }
  }, [batalha]);

  if (!batalha || !startupA || !startupB) {
    return <p style={{ textAlign: "center", marginTop: 40 }}>Carregando dados da batalha...</p>;
  }

  if (batalha.encerrado) {
    return <p style={{ textAlign: "center", marginTop: 40 }}>Esta batalha já foi encerrada.</p>;
  }

  const aplicarEvento = (lado, evento) => {
    if (usados[lado][evento.nome]) return;

    const atual = lado === "A" ? { ...startupA } : { ...startupB };
    atual.pontos += evento.valor;
    atual[evento.campo] = (atual[evento.campo] || 0) + 1;

    if (lado === "A") setStartupA(atual);
    else setStartupB(atual);

    setUsados((prev) => ({
      ...prev,
      [lado]: { ...prev[lado], [evento.nome]: true },
    }));

    setEventosAplicados((prev) => [
      ...prev,
      {
        nome: atual.nome,
        evento: evento.nome,
        valor: evento.valor,
        rodada,
      },
    ]);
  };

  const finalizarRodada = () => {
    if (!finalizada) {
      setFinalizada(true);
      alert("Rodada finalizada!");
    }
  };

  const proximaRodada = () => {
    if (rodada >= maxRodadas) {
      return decidirVencedor();
    }

    setRodada((prev) => prev + 1);
    setUsados({ A: {}, B: {} });
    setFinalizada(false);
  };

  const decidirVencedor = () => {
    let vencedor = null;
    let perdedor = null;

    if (startupA.pontos === startupB.pontos) {
      const sorteado = Math.random() < 0.5 ? "A" : "B";
      const ganhadora = sorteado === "A" ? startupA : startupB;
      ganhadora.pontos += 2;

      setEventosAplicados((prev) => [
        ...prev,
        {
          nome: ganhadora.nome,
          evento: "Shark Fight (+2)",
          valor: 2,
          rodada: "Desempate",
        },
      ]);
    }

    if (startupA.pontos >= startupB.pontos) {
      vencedor = { ...startupA, pontos: startupA.pontos + 30 };
      perdedor = startupB;
    } else {
      vencedor = { ...startupB, pontos: startupB.pontos + 30 };
      perdedor = startupA;
    }

    salvarConfronto(vencedor, perdedor);
  };

  const salvarConfronto = async (vencedor, perdedor) => {
    const confrontoFinal = {
      startup_a: startupA,
      startup_b: startupB,
      vencedor,
      perdedor,
      encerrado: true,
      eventos: eventosAplicados,
    };

    try {
      await axios.post("http://localhost:8000/confrontos", confrontoFinal);
      navigate("/sorteio", { state: { ultimaBatalhaFinalizada: true } });
    } catch (err) {
      console.error("Erro ao salvar confronto:", err);
      alert("Erro ao salvar o confronto.");
    }
  };

  return (
    <div className="confronto-container">
      <h2>Rodada {rodada} / {maxRodadas}</h2>

      <div className="duelo">
        {[startupA, startupB].map((s, i) => (
          <div key={i} className="lado">
            <h3>{s.nome}</h3>
            <h1>{s.pontos}</h1>
            {eventos.map((e) => (
              <button
                key={e.nome}
                onClick={() => aplicarEvento(i === 0 ? "A" : "B", e)}
                disabled={usados[i === 0 ? "A" : "B"][e.nome] || finalizada}
              >
                {e.nome} ({e.valor > 0 ? "+" : ""}{e.valor})
              </button>
            ))}
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        {finalizada ? (
          rodada === maxRodadas ? (
            <button className="btn-proxima" onClick={decidirVencedor}>Finalizar Confronto</button>
          ) : (
            <button className="btn-proxima" onClick={proximaRodada}>Próxima Rodada</button>
          )
        ) : (
          <button className="btn-proxima" onClick={finalizarRodada}>Finalizar Rodada</button>
        )}
      </div>

      <div className="resumo-batalha">
        <h3>Resumo do confronto:</h3>
        <ul>
          {eventosAplicados.map((e, i) => (
            <li key={i}>
              <strong>{e.nome}</strong> {e.valor > 0 ? "+" : ""}{e.valor} pontos — <em>{e.evento}</em> (Rodada {e.rodada})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}