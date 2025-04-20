import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Cadastro.css"; 

export default function Cadastro() {
  const [form, setForm] = useState({
    nome: "",
    slogan: "",
    ano_fundacao: ""
  });

  const [mensagem, setMensagem] = useState("");
  const [startups, setStartups] = useState([]);
  const navigate = useNavigate();

  // Buscar startups no back-end
  const buscarStartups = () => {
    axios.get("http://localhost:8000/startups")
      .then(res => setStartups(res.data))
      .catch(() => setStartups([]));
  };

  const excluirStartup = (nome) => {
    if (window.confirm(`Tem certeza que deseja excluir a startup "${nome}"?`)) {
      axios.delete(`http://localhost:8000/startups/${nome}`)
        .then(() => buscarStartups())
        .catch(() => alert("Erro ao excluir startup."));
    }
  };

  const gerarBatalhas = () => {
    console.log("Enviando requisição para /batalhas...");
    axios.post("http://localhost:8000/batalhas")
      .then((res) => {
        console.log("Batalhas geradas:", res.data);
        navigate("/sorteio", { state: { batalhas: res.data.batalhas } });
      })
      .catch((err) => {
        console.error("Erro ao gerar batalhas:", err);
        alert(err.response?.data?.detail || "Erro ao gerar batalhas.");
      });
  };
  

  // Executar ao carregar a página
  useEffect(() => {
    buscarStartups();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post("http://localhost:8000/startups", form)
      .then(res => {
        setMensagem(res.data.message);
        setForm({ nome: "", slogan: "", ano_fundacao: "" });
        buscarStartups(); // Atualiza a lista após cadastro
      })
      .catch(err => {
        setMensagem(err.response?.data?.detail || "Erro ao cadastrar.");
      });
  };

  return (
    <div className="form-container">
      <h2>Cadastrar Startup</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="nome"
          placeholder="Nome"
          value={form.nome}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="slogan"
          placeholder="Slogan"
          value={form.slogan}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="ano_fundacao"
          placeholder="Ano de Fundação"
          value={form.ano_fundacao}
          onChange={handleChange}
          required
        />
        <button type="submit">Cadastrar</button>
      </form>

      {mensagem && <p>{mensagem}</p>}

      <h3>
        Startups cadastradas: <span className="contador">{startups.length}/8</span>
      </h3>

      <h4 className="warning">
        Devem ser cadastradas 4, 6 ou 8 startups para poder começar a batalhar!
      </h4>

      <div className="startup-list">
        {startups.map((startup, index) => (
          <div className="startup-card" key={index}>
            <button
              className="excluir-btn"
              onClick={() => excluirStartup(startup.nome)}
              title="Excluir startup"
            >
              X
            </button>
            <div className="startup-nome">{startup.nome}</div>
            <div className="startup-info">{startup.slogan}</div>
            <div className="startup-info">Fundada em {startup.ano_fundacao}</div>
          </div>
        ))}
      </div>

      {[4, 6, 8].includes(startups.length) && (
        <button className="gerar-btn" onClick={gerarBatalhas}>
          Gerar batalhas
        </button>
        
      )}

<button
  style={{ marginTop: 20 }}
  className="gerar-btn"
  onClick={() => {
    axios.delete("http://localhost:8000/confrontos/limpar")
      .then(() => {
        alert("Confrontos apagados com sucesso!");
      })
      .catch((err) => {
        alert("Erro ao apagar confrontos.");
        console.error(err);
      });
  }}
>
  🧹 Limpar confrontos
</button>

    </div>
  );
}
