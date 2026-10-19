import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';


export default function App() {
  return (
    <div className="min-h-screen bg-[#F5EBE6] font-sans">
      <BrowserRouter>
        <Navbar/>
        <main className="scroll-smooth">
          <Routes>
            <Route path="/" element={<Home></Home>}></Route>
            <Route path="/login" element={<Login></Login>}></Route>
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}