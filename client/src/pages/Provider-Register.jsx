import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, 
  Mail, 
  Phone, 
  Lock, 
  MapPin, 
  Home, 
  Building, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Shield,
  Clock,
  Star,
  Zap,
  HeadphonesIcon,
  Sparkles,
  Award,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  FileText,
  Camera,
  CreditCard,
  Briefcase,
  RotateCcw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import useServices from '../hooks/useServices';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ProviderRegistration = () => {
  const navigate = useNavigate();
  const { API } = useAuth();
  
  // Fetch provider service categories from backend
  const { 
    providerServices, 
    providerServicesLoading, 
    providerServicesError, 
    fetchProviderServiceCategories,
    getProviderServiceCategories 
  } = useServices();

  const [formData, setFormData] = useState({
    // Step 1: Email
    email: '',

    // Step 2: OTP and Basic Details
    otp: '',
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',

    // Step 4: Professional Details
    services: '',
    experience: '',
    serviceArea: '',
    resume: null,
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    accountNo: '',
    ifsc: '',
    passbookImage: null,
    profilePic: null
  });

  const [step, setStep] = useState(1);
  const [otpSentTime, setOtpSentTime] = useState(null);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [otpExpiryTime, setOtpExpiryTime] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch provider service categories when component mounts
  useEffect(() => {
    fetchProviderServiceCategories();
  }, []);

  // Handle OTP resend countdown and expiry
  useEffect(() => {
    let timer;
    if (otpSentTime) {
      timer = setInterval(() => {
        const now = Date.now();
        const secondsSinceSent = Math.round((now - otpSentTime) / 1000);

        // Handle resend countdown (60 seconds)
        if (secondsSinceSent < 60) {
          setResendCountdown(60 - secondsSinceSent);
          setCanResendOtp(false);
        } else {
          setCanResendOtp(true);
        }

        // Handle OTP expiry (5 minutes)
        if (secondsSinceSent >= 300) {
          setOtpExpiryTime(null);
          clearInterval(timer);
        } else if (otpExpiryTime === null) {
          setOtpExpiryTime(new Date(otpSentTime + 300000));
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpSentTime, otpExpiryTime]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.files[0] }));
  };

  // Step 1: Initiate Registration (Send OTP)
  const handleInitiateRegistration = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`${API}/provider/register/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to send OTP');
        }

        const sentTime = Date.now();
        setOtpSentTime(sentTime);
        setOtpExpiryTime(new Date(sentTime + 300000)); // 5 minutes from now
        setCanResendOtp(false);
        setResendCountdown(60);
        setStep(2);
        resolve('OTP sent successfully! Check your email.');
      } catch (error) {
        reject(error.message);
      } finally {
        setIsSubmitting(false);
      }
    });

    toast.promise(promise, {
      pending: 'Sending OTP...',
      success: {
        render({ data }) { return data; },
        autoClose: 3000
      },
      error: {
        render({ data }) { return data; },
        autoClose: 3000
      }
    });
  };

  // Step 2: Complete Registration (Verify OTP and create account)
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`${API}/provider/register/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            otp: formData.otp,
            password: formData.password,
            name: formData.name,
            phone: formData.phone,
            dateOfBirth: formData.dateOfBirth
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Registration failed');
        }

        localStorage.setItem('providerToken', data.token);
        setStep(3);
        resolve('Registration successful! Please login to complete your profile.');
      } catch (error) {
        reject(error.message);
      } finally {
        setIsSubmitting(false);
      }
    });

    toast.promise(promise, {
      pending: 'Registering...',
      success: {
        render({ data }) { return data; },
        autoClose: 3000
      },
      error: {
        render({ data }) { return data; },
        autoClose: 3000
      }
    });
  };

  // Step 3: Login for profile completion
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`${API}/provider/login-for-completion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed');
        }

        localStorage.setItem('providerToken', data.token);
        setStep(4);
        resolve('Login successful! Please complete your profile.');
      } catch (error) {
        reject(error.message);
      } finally {
        setIsSubmitting(false);
      }
    });

    toast.promise(promise, {
      pending: 'Logging in...',
      success: {
        render({ data }) { return data; },
        autoClose: 3000
      },
      error: {
        render({ data }) { return data; },
        autoClose: 3000
      }
    });
  };

  // Step 4: Complete Profile
  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const promise = new Promise(async (resolve, reject) => {
      try {
        const formDataToSend = new FormData();

        Object.entries(formData).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            if (key === 'resume' || key === 'passbookImage' || key === 'profilePic') {
              if (value) formDataToSend.append(key, value);
            } else {
              formDataToSend.append(key, value);
            }
          }
        });

        const response = await fetch(`${API}/provider/profile/complete`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('providerToken')}`
          },
          body: formDataToSend
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Profile completion failed');
        }

        resolve('Profile completed successfully! Your account is pending approval.');
        navigate('/');
      } catch (error) {
        reject(error.message);
      } finally {
        setIsSubmitting(false);
      }
    });

    toast.promise(promise, {
      pending: 'Completing profile...',
      success: {
        render({ data }) { return data; },
        autoClose: 3000
      },
      error: {
        render({ data }) { return data; },
        autoClose: 3000
      }
    });
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (!canResendOtp) return;

    setIsSubmitting(true);
    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`${API}/provider/register/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to resend OTP');
        }

        const sentTime = Date.now();
        setOtpSentTime(sentTime);
        setOtpExpiryTime(new Date(sentTime + 300000)); // 5 minutes from now
        setCanResendOtp(false);
        setResendCountdown(60);
        resolve('New OTP sent successfully!');
      } catch (error) {
        reject(error.message);
      } finally {
        setIsSubmitting(false);
      }
    });

    toast.promise(promise, {
      pending: 'Resending OTP...',
      success: {
        render({ data }) { return data; },
        autoClose: 3000
      },
      error: {
        render({ data }) { return data; },
        autoClose: 3000
      }
    });
  };

  // Format expiry time for display
  const formatExpiryTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Progress Steps Component
  const ProgressIndicator = () => (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-6">
        {[1, 2, 3, 4].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 transform ${
                stepNumber <= step
                  ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/30 scale-110'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {stepNumber < step ? (
                <CheckCircle className="w-6 h-6 animate-pulse" />
              ) : (
                <span className="font-bold">{stepNumber}</span>
              )}
              {stepNumber <= step && (
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
              )}
            </div>
            {stepNumber < 4 && (
              <div className="flex-1 mx-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ease-out ${
                    stepNumber < step 
                      ? 'w-full bg-gradient-to-r from-primary to-primary/80' 
                      : 'w-0 bg-gray-300'
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-sm text-secondary/60 font-medium tracking-wide">
          Step {step} of 4
        </p>
        <div className="mt-2 text-xs text-primary font-semibold">
          {step === 1 && "Email Verification"}
          {step === 2 && "Personal Details"}
          {step === 3 && "Account Login"}
          {step === 4 && "Professional Profile"}
        </div>
      </div>
    </div>
  );

  // Benefits Section Component
  const BenefitsSection = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full mb-4">
          <Sparkles className="w-4 h-4 text-primary mr-2" />
          <span className="text-sm font-semibold text-secondary">Join 2,000+ Trusted Providers</span>
        </div>
        
        <h1 className="text-5xl lg:text-6xl font-bold text-secondary leading-tight">
          Become a <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">SafeVolt</span>
          <br />
          <span className="text-3xl lg:text-4xl font-semibold text-secondary/80">Trusted Provider!</span>
        </h1>
        
        <p className="text-xl text-secondary/70 max-w-md mx-auto leading-relaxed">
          Join our network of verified electrical professionals and 
          <span className="font-semibold text-primary"> start earning more today!</span>
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="group bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div className="ml-4">
              <h3 className="font-bold text-secondary">Earn More Income</h3>
              <p className="text-sm text-secondary/60">Flexible earnings</p>
            </div>
          </div>
          <p className="text-sm text-secondary/70">Set your own rates and work schedule. Earn 20-40% more than traditional employment with verified leads.</p>
        </div>

        <div className="group bg-gradient-to-br from-accent/5 to-accent/10 rounded-2xl p-6 border border-accent/20 hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <div className="ml-4">
              <h3 className="font-bold text-secondary">Get Verified</h3>
              <p className="text-sm text-secondary/60">Build trust & credibility</p>
            </div>
          </div>
          <p className="text-sm text-secondary/70">Complete verification process increases customer trust and booking rates by up to 300%.</p>
        </div>

        {/* <div className="group bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div className="ml-4">
              <h3 className="font-bold text-secondary">Instant Payments</h3>
              <p className="text-sm text-secondary/60">Secure & fast</p>
            </div>
          </div>
          <p className="text-sm text-secondary/70">Get paid instantly after job completion through our secure payment system. No waiting periods.</p>
        </div>

        <div className="group bg-gradient-to-br from-accent/5 to-accent/10 rounded-2xl p-6 border border-accent/20 hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-6 h-6 text-accent" />
            </div>
            <div className="ml-4">
              <h3 className="font-bold text-secondary">Flexible Hours</h3>
              <p className="text-sm text-secondary/60">Work on your terms</p>
            </div>
          </div>
          <p className="text-sm text-secondary/70">Choose your working hours and service areas. Perfect for full-time professionals or side income.</p>
        </div> */}
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-8 border border-primary/20">
        <h3 className="text-2xl font-bold text-secondary mb-6 text-center flex items-center justify-center">
          <Award className="w-6 h-6 text-primary mr-2" />
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">1</span>
            </div>
            <h4 className="font-bold text-secondary mb-2">Register</h4>
            <p className="text-sm text-secondary/70">Complete your profile with credentials and experience</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-accent">2</span>
            </div>
            <h4 className="font-bold text-secondary mb-2">Get Verified</h4>
            <p className="text-sm text-secondary/70">Our team reviews and verifies your qualifications</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">3</span>
            </div>
            <h4 className="font-bold text-secondary mb-2">Start Earning</h4>
            <p className="text-sm text-secondary/70">Receive bookings and start providing services</p>
          </div>
        </div>
      </div>

      {/* Trust Points */}
      <div className="bg-gradient-to-r from-accent/5 to-primary/5 rounded-2xl p-6 border border-accent/20">
        <h3 className="text-xl font-bold text-secondary mb-4 flex items-center">
          <Users className="w-5 h-5 text-accent mr-2" />
          Why Providers Trust SafeVolt
        </h3>
        <div className="space-y-3">
          {/* <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
            <span className="text-sm text-secondary/80">Secure payments with instant transfer to your account</span>
          </div> */}
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
            <span className="text-sm text-secondary/80">24/7 customer support and provider assistance</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
            <span className="text-sm text-secondary/80">Pre-screened customers with verified requirements</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Form Content Renderer
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-secondary mb-3">Start Your Provider Journey</h2>
              <p className="text-secondary/70 text-lg">Enter your email to begin registration</p>
              <div className="w-16 h-1 bg-gradient-to-r from-primary to-accent mx-auto mt-4 rounded-full"></div>
            </div>
            
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
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                  placeholder="your@email.com"
                  
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-secondary mb-3">Verify & Complete Details</h2>
              <p className="text-secondary/70 text-lg">Enter the OTP and your basic information</p>
              <div className="w-16 h-1 bg-gradient-to-r from-primary to-accent mx-auto mt-4 rounded-full"></div>
            </div>

            {/* OTP Section */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-6 border border-primary/20">
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-secondary/80 mb-2">
                  Verification code sent to:
                </p>
                <p className="font-semibold text-secondary">{formData.email}</p>
                <p className="text-sm text-secondary/60 mt-2">
                  {otpExpiryTime ? (
                    <>
                      Code expires at {formatExpiryTime(otpExpiryTime)} •
                      {canResendOtp ? (
                        <button
                          onClick={handleResendOTP}
                          className="ml-1 text-accent hover:text-accent/80 font-medium"
                          disabled={isSubmitting}
                        >
                          Resend now
                        </button>
                      ) : (
                        <span className="ml-1">Resend in {resendCountdown}s</span>
                      )}
                    </>
                  ) : 'Code expired'}
                </p>
              </div>
            </div>

            <div className="group">
              <label htmlFor="otp" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                Enter 6-Digit Code *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  className="flex-1 px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 text-center tracking-widest text-secondary bg-gradient-to-r from-primary/5 to-transparent placeholder-secondary/50 text-xl font-semibold hover:border-primary/50 hover:shadow-md focus:shadow-lg"
                  placeholder="123456"
                  maxLength="6"
                  
                />
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={!canResendOtp || isSubmitting}
                  className={`px-4 py-4 rounded-2xl transition flex items-center ${canResendOtp ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'} disabled:opacity-70`}
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label htmlFor="name" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <User className="text-primary w-5 h-5 group-focus-within:scale-110 transition-transform duration-200" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                    placeholder="John Doe"
                    
                  />
                </div>
              </div>

              <div className="group">
                <label htmlFor="phone" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                  Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Phone className="text-primary w-5 h-5 group-focus-within:scale-110 transition-transform duration-200" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                    placeholder="9876543210"
                    maxLength="10"
                  />
                </div>
              </div>
            </div>

            <div className="group">
              <label htmlFor="dateOfBirth" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                Date of Birth *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Calendar className="text-primary w-5 h-5 group-focus-within:scale-110 transition-transform duration-200" />
                </div>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                  
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label htmlFor="password" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                  Create Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Lock className="text-primary w-5 h-5 group-focus-within:scale-110 transition-transform duration-200" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                    placeholder="At least 8 characters"
                    minLength="8"
                    
                  />
                </div>
              </div>

              <div className="group">
                <label htmlFor="confirmPassword" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Lock className="text-primary w-5 h-5 group-focus-within:scale-110 transition-transform duration-200" />
                  </div>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                    placeholder="Confirm your password"
                    
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-secondary mb-3">Login to Continue</h2>
              <p className="text-secondary/70 text-lg">Access your account to complete your profile</p>
              <div className="w-16 h-1 bg-gradient-to-r from-primary to-accent mx-auto mt-4 rounded-full"></div>
            </div>

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
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                  placeholder="your@email.com"
                  
                />
              </div>
            </div>

            <div className="group">
              <label htmlFor="password" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Lock className="text-primary w-5 h-5 group-focus-within:scale-110 transition-transform duration-200" />
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                  placeholder="Enter your password"
                  
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-secondary mb-3">Complete Your Profile</h2>
              <p className="text-secondary/70 text-lg">Add your professional details to start earning</p>
              <div className="w-16 h-1 bg-gradient-to-r from-primary to-accent mx-auto mt-4 rounded-full"></div>
            </div>

            {/* Professional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label htmlFor="services" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                  Service Category *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Briefcase className="text-primary w-5 h-5 group-focus-within:scale-110 transition-transform duration-200" />
                  </div>
                  <select
                    id="services"
                    name="services"
                    value={formData.services}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                    required
                    disabled={providerServicesLoading}
                  >
                    <option value="">
                      {providerServicesLoading ? 'Loading service categories...' : 'Select service category'}
                    </option>
                    
                    {/* Show provider service categories from backend */}
                    {!providerServicesLoading && providerServices.length > 0 ? (
                      // Simple list of provider service categories
                      providerServices.map(service => (
                        <option key={service._id} value={service.category}>
                          {service.title}
                        </option>
                      ))
                    ) : (
                      // Fallback options if provider services fail to load
                      !providerServicesLoading && (
                        <>
                          <option value="Electrical">Electrical</option>
                          <option value="AC">AC</option>
                          <option value="Appliance Repair">Appliance Repair</option>
                          <option value="Other">Other</option>
                        </>
                      )
                    )}
                  </select>
                  
                  {/* Loading indicator */}
                  {providerServicesLoading && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                  )}
                  
                  {/* Error indicator */}
                  {providerServicesError && !providerServicesLoading && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </div>
                
                {/* Error message */}
                {providerServicesError && !providerServicesLoading && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Failed to load service categories. Using fallback options.
                  </p>
                )}
              </div>

              <div className="group">
                <label htmlFor="experience" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                  Years of Experience *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Award className="text-primary w-5 h-5 group-focus-within:scale-110 transition-transform duration-200" />
                  </div>
                  <input
                    type="number"
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    min="0"
                    max="40"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                    placeholder="Years of experience"
                    
                  />
                </div>
              </div>
            </div>

            <div className="group">
              <label htmlFor="serviceArea" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                Service Area *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <MapPin className="text-primary w-5 h-5 group-focus-within:scale-110 transition-transform duration-200" />
                </div>
                <input
                  type="text"
                  id="serviceArea"
                  name="serviceArea"
                  value={formData.serviceArea}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                  placeholder="Cities or pincodes you serve (e.g., Mumbai, 400001, 400002)"
                  
                />
              </div>
            </div>

            {/* File Uploads */}
            <div className="space-y-6">
              <div className="group">
                <label htmlFor="resume" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                  Professional Resume (PDF) *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="resume"
                    name="resume"
                    onChange={handleFileChange('resume')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf"
                    
                  />
                  <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-primary/5 to-transparent border-2 border-gray-200 rounded-2xl hover:border-primary/50 transition-all duration-300 hover:shadow-md">
                    <span className="text-secondary/70 truncate">
                      {formData.resume ? formData.resume.name : 'Choose PDF file...'}
                    </span>
                    <FileText className="text-primary w-5 h-5" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-secondary/60">Upload your professional resume highlighting electrical experience</p>
              </div>

              <div className="group">
                <label htmlFor="profilePic" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                  Profile Picture *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="profilePic"
                    name="profilePic"
                    onChange={handleFileChange('profilePic')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*"
                    
                  />
                  <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-primary/5 to-transparent border-2 border-gray-200 rounded-2xl hover:border-primary/50 transition-all duration-300 hover:shadow-md">
                    <span className="text-secondary/70 truncate">
                      {formData.profilePic ? formData.profilePic.name : 'Choose image file...'}
                    </span>
                    <Camera className="text-primary w-5 h-5" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-secondary/60">Upload a clear, professional photo of yourself</p>
              </div>
            </div>

            {/* Address Information */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-bold text-secondary mb-4 flex items-center">
                <Home className="mr-2 text-primary w-5 h-5" />
                Address Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label htmlFor="street" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    id="street"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                    placeholder="123 Main Street"
                    
                  />
                </div>

                <div className="group">
                  <label htmlFor="city" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                    City *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                    placeholder="Your city"
                    
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="group">
                  <label htmlFor="state" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                    State *
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                    placeholder="Your state"
                    
                  />
                </div>

                <div className="group">
                  <label htmlFor="postalCode" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                    placeholder="123456"
                    
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-bold text-secondary mb-4 flex items-center">
                <CreditCard className="mr-2 text-primary w-5 h-5" />
                Bank Details for Payments
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label htmlFor="accountNo" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    id="accountNo"
                    name="accountNo"
                    value={formData.accountNo}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                    placeholder="1234567890"
                    
                  />
                </div>

                <div className="group">
                  <label htmlFor="ifsc" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    id="ifsc"
                    name="ifsc"
                    value={formData.ifsc}
                    onChange={handleChange}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-gradient-to-r from-primary/5 to-transparent text-secondary placeholder-secondary/50 hover:border-primary/50 hover:shadow-md focus:shadow-lg font-medium"
                    placeholder="ABCD0123456"
                    
                  />
                </div>
              </div>

              <div className="mt-4 group">
                <label htmlFor="passbookImage" className="block text-secondary font-semibold mb-3 text-sm tracking-wide">
                  Bank Passbook Image *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="passbookImage"
                    name="passbookImage"
                    onChange={handleFileChange('passbookImage')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*"
                    
                  />
                  <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-primary/5 to-transparent border-2 border-gray-200 rounded-2xl hover:border-primary/50 transition-all duration-300 hover:shadow-md">
                    <span className="text-secondary/70 truncate">
                      {formData.passbookImage ? formData.passbookImage.name : 'Choose passbook image...'}
                    </span>
                    <Camera className="text-primary w-5 h-5" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-secondary/60">Upload clear image of your bank passbook for verification</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
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

      {/* Main Container - Desktop: Grid Layout, Mobile: Single Column */}
      <div className="w-full max-w-7xl relative z-10 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">
        
        {/* Benefits Section - Hidden on mobile, Left side on desktop */}
        <div className="hidden lg:block lg:sticky lg:top-8">
          <BenefitsSection />
        </div>
        
        {/* Form Container - Full width on mobile, Right side on desktop */}
        <div className="w-full max-w-lg mx-auto lg:mx-0">
          <div className="bg-background/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-primary/20 shadow-primary/10">
            <ProgressIndicator />
            
            <form onSubmit={
              step === 1 ? handleInitiateRegistration :
                step === 2 ? handleCompleteRegistration :
                  step === 3 ? handleLogin :
                    handleCompleteProfile
            }>
              {renderStepContent()}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 space-x-4">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="flex items-center px-6 py-3 rounded-2xl border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300 font-semibold"
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex items-center justify-center px-8 py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none ${
                    step === 1 ? 'w-full' : 'flex-1'
                  } bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-background shadow-lg hover:shadow-xl`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-background mr-2"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <>
                      <span className="mr-2">
                        {step === 1 ? 'Send Verification Code' :
                          step === 2 ? 'Complete Registration' :
                            step === 3 ? 'Login & Continue' :
                              'Register & Start Earning'}
                      </span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Login Link */}
            <div className="text-center mt-6">
              <Link
                to="/login"
                className="text-accent hover:text-accent/80 font-semibold transition-colors duration-300"
              >
                Already registered? Sign in to your provider account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderRegistration;
