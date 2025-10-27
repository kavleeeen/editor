import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../../services/authApi';
import Login from '../Login/Login';
import Register from '../Register/Register';
import Loader from '../Loader/Loader';

type AuthView = 'login' | 'register';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const auth = isAuthenticated();
      setAuthenticated(auth);
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    setAuthenticated(true);
  };

  const handleRegisterSuccess = () => {
    setAuthenticated(true);
  };

  if (checkingAuth) {
    return <Loader title="Loading" text="Checking authentication..." />;
  }

  if (!authenticated) {
    if (authView === 'login') {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => setAuthView('register')}
        />
      );
    } else {
      return (
        <Register
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

