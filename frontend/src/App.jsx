import { BrowserRouter, Routes, Route } from "react-router-dom";
import Cadastro from "./pages/Cadastro.jsx";
import Batalhas from "./pages/Batalhas.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Cadastro />} />
        <Route path="/batalhas" element={<Batalhas />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
