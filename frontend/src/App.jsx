import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './pages/login-section/Login'
import { ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'
import { ProtectedRoute, PublicRoute } from './Protected';
import { Homepage } from './components/Homepage';

function App() {
  return (
    <>
    <ToastContainer position='top-right' autoClose={3000}/>
    <Router>
      <Routes>
        <Route element={<PublicRoute/>}>
          <Route  path="/user-login" element={<Login/>} />
        </Route> 
        <Route element={<ProtectedRoute/>}>
          <Route path='/' element={<Homepage/>}/>
        </Route>
      </Routes>
    </Router>
    </>
  )
}

export default App
