import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Confrontos.css";
import axios from "axios";

const eventos = [
  { nome: "Pitch convincente", valor: 6, campo: "pitches" },
  { nome: "Produto com bugs", valor: -4, campo: "bugs" },
  { nome: "Boa tracao de usuarios", valor: 3, campo: "tracoes" },
  { nome: "Investidor irritado", valor: -6, campo: "investidores" },
  { nome: "Fake News", valor: -8, campo: "penalidades" },
];

export default function Confrontos() {
  const location = useLocation();
  const navigate = useNavigate();
  const batalha = location.state?.batalha || JSON.parse(localStorage.getItem("batalhaAtual"));

  const [rodada, setRodada] = useState(1);
  const [maxRodadas] = useState(5);
  const [finalizada, setFinalizada] = useState(false);
  const [eventosAplicados, setEventosAplicados] = useState([]);
  const [usados, setUsados] = useState({ A: {}, B: {} });

  const [startupA, setStartupA] = useState(null);
  const [startupB, setStartupB] = useState(null);

  useEffect(() => {
    if (!batalha) {
      return;
    }

    // salva no localStorage ao entrar
    localStorage.setItem("batalhaAtual", JSON.stringify(batalha));

    setStartupA({
      ...batalha.startup_a,
      stats: { pitches: 0, bugs: 0, tracoes: 0, investidores: 0, penalidades: 0 },
    });
    setStartupB({
      ...batalha.startup_b,
      stats: { pitches: 0, bugs: 0, tracoes: 0, investidores: 0, penalidades: 0 },
    });
  }, [batalha]);

  if (!batalha || !startupA || !startupB) {
    return <p style={{ textAlign: "center", marginTop: 40 }}>Carregando dados da batalha...</p>;
  }

  if (batalha.encerrado) {
    return <p style={{ textAlign: "center", marginTop: 40 }}>Esta batalha já foi encerrada.</p>;
  }

  const aplicarEvento = (lado, evento) => {
    if (usados[lado][evento.nome]) return;

    const atualizarStartup = lado === "A" ? setStartupA : setStartupB;
    const atual = lado === "A" ? startupA : startupB;

    atualizarStartup({
      ...atual,
      pontos: atual.pontos + evento.valor,
      stats: {
        ...atual.stats,
        [evento.campo]: atual.stats[evento.campo] + 1,
      },
    });

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

    setRodada(rodada + 1);
    setUsados({ A: {}, B: {} });
    setFinalizada(false);
  };

  const decidirVencedor = () => {
    let vencedor, perdedor;

    if (startupA.pontos === startupB.pontos) {
      const ladoSorteado = Math.random() < 0.5 ? "A" : "B";
      const ganhadora = ladoSorteado === "A" ? startupA : startupB;
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

      vencedor = { ...ganhadora, pontos: ganhadora.pontos + 30 };
      perdedor = ladoSorteado === "A" ? startupB : startupA;
    } else {
      vencedor = startupA.pontos > startupB.pontos
        ? { ...startupA, pontos: startupA.pontos + 30 }
        : { ...startupB, pontos: startupB.pontos + 30 };

      perdedor = startupA.pontos > startupB.pontos ? startupB : startupA;
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
      localStorage.removeItem("batalhaAtual"); // limpa depois de finalizado
      navigate("/sorteio", { state: { ultimaBatalhaFinalizada: true } });
    } catch (err) {
      console.error("Erro ao salvar confronto:", err);
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
