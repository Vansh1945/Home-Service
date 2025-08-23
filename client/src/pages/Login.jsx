import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff
} from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginUser, API, showToast } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Helper function to handle backend validation errors
  const handleValidationErrors = (backendErrors) => {
    if (backendErrors && typeof backendErrors === 'object') {
      setErrors(backendErrors);
      
      // Show toast for the first error
      const firstError = Object.values(backendErrors)[0];
      if (firstError) {
        showToast(firstError, 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    // Basic validation
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fill in all fields', 'error');
      setIsLoading(false);
      return;
    }

    try {
      console.log("Attempting login with:", formData.email);

      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Login failed:", data.message || 'Unknown error');
        
        if (data.errors) {
          handleValidationErrors(data.errors);
        } else {
          showToast(data.message || 'Login failed', 'error');
        }
        return;
      }

      // ✅ CRITICAL FIX: Call loginUser to authenticate and redirect
      if (data.token && data.user) {
        showToast(data.message || 'Login successful!', 'success');
        loginUser(data.token, data.user.role || 'customer', data.user);
      } else {
        throw new Error('Invalid response from server');
      }

    } catch (err) {
      const errorMsg = err.message || 'Invalid email or password';
      console.error("Login error:", errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-28 bg-gradient-to-br from-primary/5 via-background to-primary/10 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-15">
        <div className="absolute top-20 left-20 w-32 h-32 bg-accent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-primary/60 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-accent/80 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      {/* Centered Form Container */}
      <div className="w-full max-w-lg relative z-10">
        <div className="bg-background/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-primary/20 shadow-primary/10">
          
          {/* Header Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-secondary mb-3">Sign In</h2>
            <p className="text-secondary/70 text-lg">Access your SafeVolt Solutions account</p>
            <div className="w-16 h-1 bg-gradient-to-r from-primary to-accent mx-auto mt-4 rounded-full"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="group">
              <label htmlFor="email" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Mail className="text-primary w-5 h-5 group-focus-within:scale-110 transition-transform duration-200" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 hover:border-primary/50 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:shadow-md focus:shadow-lg font-medium"
                  placeholder="Enter your email address"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="group">
              <label htmlFor="password" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Lock className="text-primary w-5 h-5 group-focus-within:scale-110 transition-transform duration-200" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 hover:border-primary/50 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:shadow-md focus:shadow-lg font-medium"
                  placeholder="Enter your password"
                  minLength="6"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors z-10"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 text-sm text-secondary/70 font-medium">
                  Remember me
                </label>
              </div>
              <Link 
                to="/forgot-password" 
                className="text-sm text-primary hover:text-primary/80 font-semibold transition-colors duration-300"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-background font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-background mr-2"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <>
                  <span className="mr-2">Sign In</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Registration Links */}
          <div className="text-center mt-8 space-y-3">
            <div className="border-t border-gray-200 pt-6">
              <p className="text-secondary/70 text-sm">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="text-primary hover:text-primary/80 font-semibold transition-colors duration-300"
                >
                  Sign up
                </Link>
              </p>
            </div>
            <p className="text-secondary/60 text-xs">
              Are you a service provider?{' '}
              <Link 
                to="/register-provider" 
                className="text-accent hover:text-accent/80 font-semibold transition-colors duration-300"
              >
                Register as Provider
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
