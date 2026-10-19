import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { CustomerDashboard } from './pages/Dashboard/Customer';
import { CustomerPayment } from './pages/Dashboard/Customer/Payment';
import { OwnerDashboard } from './pages/Dashboard/Owner';
import { OwnerSummary } from './pages/Dashboard/Owner/Summary';
import { OwnerRooms } from './pages/Dashboard/Owner/Rooms';
import { OwnerPayments } from './pages/Dashboard/Owner/Payments';
import { OwnerReports } from './pages/Dashboard/Owner/Reports';
import { OwnerSettings } from './pages/Dashboard/Owner/Settings';
import { ProtectedRoute } from './components/ProtectedRoute';


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
          <Route element={<ProtectedRoute roles={['customer']} />}>
            <Route path="/dashboard/customer" element={<CustomerDashboard />}></Route>
            <Route path="/dashboard/customer/payment" element={<CustomerPayment />}></Route>
          </Route>
          <Route element={<ProtectedRoute roles={['owner']} />}>
          <Route path="/dashboard/owner" element={<OwnerDashboard />}>
            <Route index element={<OwnerSummary />}></Route>
            <Route path="kamar" element={<OwnerRooms />}></Route>
            <Route path="pembayaran" element={<OwnerPayments />}></Route>
            <Route path="rekap" element={<OwnerReports />}></Route>
            <Route path="pengaturan" element={<OwnerSettings />}></Route>
          </Route>
          </Route>
        </Routes>
      </main>
    </>
  );
}