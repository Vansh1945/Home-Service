import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { User, Mail, Phone, Lock, MapPin, Home, Building, ArrowRight } from 'lucide-react';

const CustomerRegistration = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    address: {
      street: '',
      city: '',
      pincode: ''
    },
    otp: ''
  });

  const [step, setStep] = useState(1); // 1: Basic info, 2: OTP verification
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [errors, setErrors] = useState({});

  const { API, showToast } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateBasicInfo = () => {
    const newErrors = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10,15}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!validateBasicInfo()) {
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API}/api/customer/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }
      
      setOtpSent(true);
      showToast('OTP sent to your email');
      setStep(2); // Move to OTP verification step
    } catch (error) {
      showToast(error.message, 'error');
      console.error('OTP sending error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validate all information before submitting
    if (!validateBasicInfo()) {
      setIsLoading(false);
      return;
    }
    
    if (!formData.otp || formData.otp.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP' });
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API}/api/customer/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          otp: formData.otp,
          address: formData.address
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      showToast('Registration successful! You can now login.');
      navigate('/login');
      
    } catch (error) {
      showToast(error.message, 'error');
      console.error('Registration error:', error);
      
      if (error.message.includes('OTP not found') || error.message.includes('expired')) {
        setErrors({ otp: 'Invalid or expired OTP. Please request a new one.' });
        setFormData(prev => ({ ...prev, otp: '' }));
      }
    } finally {
      setIsLoading(false);
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
            Welcome to <span className="text-yellow-500">Raj Electrical</span>
          </h1>
          <p className="text-gray-600">
            {step === 1 ? 'Create your customer account' : 'Verify your email'}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-blue-200/50">
          <form onSubmit={step === 1 ? handleSendOtp : handleSubmit} className="space-y-6">
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <>
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
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
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
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                {/* Phone Field */}
                <div className="group">
                  <label htmlFor="phone" className="block text-blue-900 font-semibold mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="text-blue-600 w-5 h-5" />
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 ${errors.phone ? 'border-red-300' : 'border-blue-200'} focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300 bg-blue-50/50 text-blue-900 placeholder-gray-600`}
                      placeholder="+1 (123) 456-7890"
                      required
                    />
                  </div>
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
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
                      placeholder="At least 6 characters"
                      required
                      minLength="6"
                    />
                  </div>
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>

                {/* Address Section */}
                <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-200">
                  <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
                    <MapPin className="mr-2 text-yellow-500 w-5 h-5" />
                    Address Information
                  </h3>

                  <div className="space-y-4">
                    {/* Street Address */}
                    <div>
                      <label htmlFor="street" className="block text-blue-900 font-semibold mb-2">
                        Street Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Home className="text-blue-600 w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          id="street"
                          name="address.street"
                          value={formData.address.street}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-blue-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300 bg-white text-blue-900 placeholder-gray-600"
                          placeholder="123 Main St"
                          required
                        />
                      </div>
                    </div>

                    {/* City */}
                    <div>
                      <label htmlFor="city" className="block text-blue-900 font-semibold mb-2">
                        City
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Building className="text-blue-600 w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          id="city"
                          name="address.city"
                          value={formData.address.city}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-blue-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300 bg-white text-blue-900 placeholder-gray-600"
                          placeholder="Your city"
                          required
                        />
                      </div>
                    </div>

                    {/* Pincode */}
                    <div>
                      <label htmlFor="pincode" className="block text-blue-900 font-semibold mb-2">
                        Postal/Zip Code
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <MapPin className="text-blue-600 w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          id="pincode"
                          name="address.pincode"
                          value={formData.address.pincode}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-blue-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300 bg-white text-blue-900 placeholder-gray-600"
                          placeholder="12345"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <p className="text-gray-700 mb-4">
                    We've sent a 6-digit verification code to<br />
                    <span className="font-semibold">{formData.email}</span>
                  </p>
                  {otpSent && (
                    <p className="text-green-500 mb-4">
                      OTP sent successfully!
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="otp" className="block text-blue-900 font-semibold mb-2">
                    Enter OTP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="otp"
                      name="otp"
                      value={formData.otp}
                      onChange={handleChange}
                      className={`w-full px-4 py-4 rounded-2xl border-2 ${errors.otp ? 'border-red-300' : 'border-blue-200'} focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300 text-center tracking-widest`}
                      placeholder="123456"
                      maxLength="6"
                      required
                    />
                  </div>
                  {errors.otp && <p className="text-red-500 text-sm mt-1">{errors.otp}</p>}
                </div>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center mx-auto"
                  >
                    Back to registration
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center mx-auto mt-2"
                  >
                    Didn't receive code? Resend OTP
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-blue-900 font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center group disabled:opacity-70"
            >
              {isLoading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span className="mr-2">
                    {step === 1 ? 'Send OTP' : 'Complete Registration'}
                  </span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-8">
            <a
              href="/login"
              className="text-yellow-400 hover:text-yellow-600 font-semibold text-lg transition-colors duration-300"
            >
              Already have an account? Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerRegistration;