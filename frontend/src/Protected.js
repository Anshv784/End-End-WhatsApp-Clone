import {useLocation} from 'react-router-dom';
import {useState} from 'react'
import useUserStore from './store/userStore';
import {checkUserAuth} from './services/user.service'

export const protectedRoute=()=>{
    const location = useLocation();
    const [isChecking,setIsChecking] = useState(true);

    const {isAuthenticated,setUser,clearUser} = useUserStore();

    useEffect(()=>{
        const verifyAuth = async ()=>{
            try{
                const result = checkUserAuth();
                if(result?.isAuthenticated){
                    setUser(result.user);
                }
                else{
                clearUser()
            }
            }
            catch(e){
                console.error(e);
                clearUser();
            }finally{
                setIsChecking(false);
            }
        }
        verifyAuth();
    },[setUser,clearUser])

}