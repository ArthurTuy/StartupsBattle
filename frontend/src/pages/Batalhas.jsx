import { useLocation } from "react-router-dom";

export default function Batalhas() {
  const location = useLocation();
  const batalhas = location.state?.batalhas || [];

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", textAlign: "center" }}>
      <h2>Batalhas sorteadas</h2>

      {batalhas.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {batalhas.map((batalha, index) => (
            <li key={index} style={{ marginBottom: 12, background: "#f2f2f2", padding: 12, borderRadius: 8 }}>
              <strong>{batalha.startup_a.nome}</strong> vs <strong>{batalha.startup_b.nome}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "gray" }}>Nenhuma batalha sorteada.</p>
      )}
    </div>
  );
}
