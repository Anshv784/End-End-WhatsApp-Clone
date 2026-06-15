import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './pages/login-section/Login'
import { ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'
import { ProtectedRoute, PublicRoute } from './Protected';
import { Homepage } from './components/Homepage';
import UserDetails from './components/UserDetails';
import Status from './pages/status-section/Status';
import Setting  from './pages/setting-section/Setting';
import useUserStore from './store/userStore';
import useChatStore from './store/chatStore';
import { useEffect } from 'react';
import { getSocket, disconnectSocket } from './services/chat.service';

function App() {
  const {user} = useUserStore();
  const { initSocketListeners } = useChatStore();

  useEffect(() => {
    if(user?._id){
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("user_connected", user._id);
      }
      initSocketListeners();
    }

    return () => {
      if (!user) {
        disconnectSocket();
        useChatStore.setState({ socketListenersInitialized: false });
      }
    };
  },[user, initSocketListeners])
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
          <Route path='/user-profile' element={<UserDetails/>}/>
          <Route path='/status' element={<Status/>}/>
          <Route path='/setting' element={<Setting/>}/>
        </Route>
      </Routes>
    </Router>
    </>
  )
}

export default App
