import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './pages/login-section/Login'

function App() {
  return (
    <Router>
      <Routes>
        <Route  path="/user-login" element={<Login/>} />
      </Routes>
    </Router>
  )
}

export default App
