import React, { useState } from 'react';
import { User, Mail, Lock, Shield, Key, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminRegistration = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    adminKey: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.email = 'Valid email is required';
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!formData.adminKey) newErrors.adminKey = 'Admin key is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      console.log('Registering admin:', formData);
      // Add your admin registration API call here
      // await registerAdmin(formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // On successful registration
      // navigate('/admin/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({
        ...errors,
        server: error.message || 'Registration failed. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-32 h-32 bg-yellow-400 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-blue-200 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-yellow-500 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            Admin <span className="text-yellow-500">Registration</span>
          </h1>
          <p className="text-gray-600">Create a new administrator account</p>
        </div>

        {/* Form Container */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-blue-200/50">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-blue-900 mb-2 flex items-center justify-center">
              <Shield className="mr-2 text-yellow-500" size={24} />
              Administrator Sign Up
            </h2>
            <p className="text-gray-600">
              Restricted access - authorized personnel only
            </p>
          </div>

          {errors.server && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg">
              {errors.server}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="group">
              <label htmlFor="name" className="block text-blue-900 font-semibold mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="text-blue-600 w-5 h-5" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 ${errors.name ? 'border-red-300' : 'border-blue-200'} focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300 bg-blue-50/50 text-blue-900 placeholder-gray-600`}
                  placeholder="John Doe"
                  required
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Email Field */}
            <div className="group">
              <label htmlFor="email" className="block text-blue-900 font-semibold mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="text-blue-600 w-5 h-5" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 ${errors.email ? 'border-red-300' : 'border-blue-200'} focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300 bg-blue-50/50 text-blue-900 placeholder-gray-600`}
                  placeholder="admin@example.com"
                  required
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="group">
              <label htmlFor="password" className="block text-blue-900 font-semibold mb-2">
                Create Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="text-blue-600 w-5 h-5" />
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 ${errors.password ? 'border-red-300' : 'border-blue-200'} focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300 bg-blue-50/50 text-blue-900 placeholder-gray-600`}
                  placeholder="At least 8 characters"
                  required
                  minLength="8"
                />
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
            </div>

            {/* Admin Key Field */}
            <div className="group">
              <label htmlFor="adminKey" className="block text-blue-900 font-semibold mb-2">
                Admin Authorization Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Key className="text-blue-600 w-5 h-5" />
                </div>
                <input
                  type="password"
                  id="adminKey"
                  name="adminKey"
                  value={formData.adminKey}
                  onChange={handleChange}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 ${errors.adminKey ? 'border-red-300' : 'border-blue-200'} focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300 bg-blue-50/50 text-blue-900 placeholder-gray-600`}
                  placeholder="Enter admin key"
                  required
                />
              </div>
              {errors.adminKey && <p className="mt-1 text-sm text-red-500">{errors.adminKey}</p>}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="terms"
                name="terms"
                required
                className="h-4 w-4 text-yellow-500 focus:ring-yellow-400 border-blue-200 rounded"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                I agree to the <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-blue-900 font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                <>
                  <span className="mr-2">Register Admin</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-8">
            <Link
              to="/admin/login"
              className="text-yellow-400 hover:text-yellow-600 font-semibold text-lg transition-colors duration-300"
            >
              Already have an admin account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegistration;