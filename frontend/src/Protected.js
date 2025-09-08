import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import useUserStore from "./store/userStore";
import { checkUserAuth } from "./services/user.service";
import Loader from "./components/Loader";

export const ProtectedRoute = () => {
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);

    const { isAuthenticated, setUser, clearUser } = useUserStore();

    useEffect(() => {
        const verifyAuth = async () => {
            try {
                const result = await checkUserAuth();
                if (result?.isAuthenticated) {
                    setUser(result.user);
                } else {
                    clearUser();
                }
            } catch (e) {
                console.error(e);
                clearUser();
            } finally {
                setIsChecking(false);
            }
        };
        verifyAuth();
    }, [setUser, clearUser]);

    if (isChecking) return <Loader />;

    if (!isAuthenticated) {
        return <Navigate to="/user-login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export const PublicRoute = () => {
    const isAuthenticated = useUserStore((state) => state.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};
