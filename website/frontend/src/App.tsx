import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { CustomerDashboard } from './pages/Dashboard/Customer';
import { CustomerPayment } from './pages/Dashboard/Customer/Payment';
import { OwnerDashboard } from './pages/Dashboard/Owner';


export default function App() {
  return (
    <div className="min-h-screen bg-[#F5EBE6] font-sans">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </div>
  );
}

function AppRoutes() {
  const { pathname } = useLocation();

  return (
    <>
      {(pathname === '/' || pathname === '/login') && <Navbar />}
      <main className="scroll-smooth">
        <Routes>
          <Route path="/" element={<Home></Home>}></Route>
          <Route path="/login" element={<Login></Login>}></Route>
          <Route path="/dashboard/customer" element={<CustomerDashboard />}></Route>
          <Route path="/dashboard/customer/payment" element={<CustomerPayment />}></Route>
          <Route path="/dashboard/owner" element={<OwnerDashboard />}></Route>
        </Routes>
      </main>
    </>
  );
}