import { BrowserRouter, Routes, Route } from "react-router-dom";
import Cadastro from "./pages/Cadastro.jsx";
import Sorteio from "./pages/Sorteio.jsx";
import Confrontos from "./pages/Confrontos.jsx";
import Vencedor from "./pages/Vencedor.jsx";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Cadastro />} />
        <Route path="/sorteio" element={<Sorteio />} />
        <Route path="/confrontos/:id" element={<Confrontos />} />
        <Route path="/vencedor" element={<Vencedor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;