import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';
    const API_URL_IMAGE = import.meta.env.VITE_BACKEND_URL ? import.meta.env.VITE_BACKEND_URL.replace('/api', '') : 'http://localhost:5000';

    // State management
    const [token, setToken] = useState(() => localStorage.getItem("token") || null);
    const [role, setRole] = useState(() => localStorage.getItem("role") || null);
    const [user, setUser] = useState(() => {
        try {
            const userData = localStorage.getItem("user");
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            return null;
        }
    });

    // Check if token is expired
    const isTokenExpired = (token) => {
        if (!token) return true;
        try {
            const decoded = jwtDecode(token);
            return decoded.exp * 1000 < Date.now();
        } catch (error) {
            return true;
        }
    };

    // Memoized admin check
    const isAdmin = useMemo(() => {
        if (!token) return false;
        try {
            const decoded = jwtDecode(token);
            return decoded.role === 'admin' || decoded.isAdmin === true;
        } catch (error) {
            return false;
        }
    }, [token]);

    // Toast notification
    const showToast = (message, type = 'success') => {
        toast[type](message, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
        });
    };

    // Login function
    const loginUser = async (newToken, newRole, userData) => {
        try {
            if (isTokenExpired(newToken)) {
                throw new Error("Token is invalid or expired");
            }

            const decodedToken = jwtDecode(newToken);
            const finalRole = (userData?.isAdmin || decodedToken.isAdmin) ? 'admin' : newRole;
            
            const userObj = {
                ...userData,
                _id: decodedToken.id,
                isAdmin: userData?.isAdmin || decodedToken.isAdmin || false
            };

            // Save to localStorage
            localStorage.setItem("token", newToken);
            localStorage.setItem("role", finalRole);
            localStorage.setItem("user", JSON.stringify(userObj));

            // Update state
            setToken(newToken);
            setRole(finalRole);
            setUser(userObj);

            showToast('Login successful!');

            // Redirect based on role
            if (finalRole === 'admin' || userObj.isAdmin) {
                navigate('/admin/dashboard', { replace: true });
            } else if (finalRole === 'provider') {
                navigate(userObj.approved ? '/provider/dashboard' : '/pending-approval');
            } else {
                navigate('/customer/services');
            }

        } catch (error) {
            console.error("Login error:", error);
            showToast(error.message || 'Login failed', 'error');
            logoutUser();
        }
    };

    // Logout function
    const logoutUser = () => {
        localStorage.clear();
        setToken(null);
        setRole(null);
        setUser(null);
        showToast('Logged out successfully');
        navigate('/login');
    };

    // Auto-logout when token expires
    useEffect(() => {
        const checkTokenExpiration = () => {
            if (token && isTokenExpired(token)) {
                logoutUser();
            }
        };

        // Check immediately
        checkTokenExpiration();

        // Set up interval to check every minute
        const interval = setInterval(checkTokenExpiration, 60000);
        return () => clearInterval(interval);
    }, [token]);

    // Context value
    const contextValue = useMemo(() => ({
        token,
        role,
        user,
        isAuthenticated: !!token && !isTokenExpired(token),
        isAdmin,
        loginUser,
        logoutUser,
        API,
        API_URL_IMAGE,
        showToast,
        isTokenExpired
    }), [token, role, user, isAdmin, API]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};