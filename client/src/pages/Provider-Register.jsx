import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaUser, FaEnvelope, FaPhone, FaLock,
  FaHome, FaMapMarkerAlt, FaCity,
  FaFileAlt, FaBriefcase, FaCheck,
  FaArrowLeft, FaBuilding,
  FaWallet, FaCalendarAlt, FaRedo
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ProviderRegistration = () => {
  const navigate = useNavigate();
  const { API } = useAuth();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="flex justify-between items-center mb-12 relative">
          <div className="absolute top-1/3 left-0 right-0 h-1.5 bg-blue-200 -translate-y-1/2 z-0 rounded-full">
            <div
              className="h-full bg-yellow-500 transition-all duration-500 ease-in-out rounded-full"
              style={{ width: `${(step - 1) * 33.33}%` }}
            ></div>
          </div>
          {[1, 2, 3, 4].map((stepNumber) => (
            <div key={stepNumber} className="relative z-10 flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all
                ${step >= stepNumber ? 'bg-yellow-500 text-blue-900' : 'bg-white text-gray-400 border-2 border-blue-200'}`}>
                {step > stepNumber ? <FaCheck className="text-sm" /> : stepNumber}
              </div>
              <span className={`mt-2 text-sm font-medium ${step >= stepNumber ? 'text-blue-900' : 'text-blue-700'}`}>
                {stepNumber === 1 ? 'Email' :
                  stepNumber === 2 ? 'Details' :
                    stepNumber === 3 ? 'Login' : 'Profile'}
              </span>
            </div>
          ))}
        </div>

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-100"
        >
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-blue-900 mb-2">
                {step === 1 ? 'Start Your Provider Journey' :
                  step === 2 ? 'Complete Your Registration' :
                    step === 3 ? 'Login to Continue' : 'Complete Your Profile'}
              </h2>
              <p className="text-blue-700">
                {step === 1 ? 'Enter your email to begin the registration process' :
                  step === 2 ? 'Verify your email and set up your account' :
                    step === 3 ? 'Login to complete your provider profile' :
                      'Add your professional details to start offering services'}
              </p>
            </div>

            <form onSubmit={
              step === 1 ? handleInitiateRegistration :
                step === 2 ? handleCompleteRegistration :
                  step === 3 ? handleLogin :
                    handleCompleteProfile
            }>
              {/* Step 1: Email Verification */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-blue-900 font-medium mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-yellow-500">
                        <FaEnvelope />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                        placeholder="your@email.com"

                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-blue-900 font-bold py-3 px-4 rounded-xl shadow-md transition duration-300 disabled:opacity-70"
                    disabled={isSubmitting}
                  >
                    Send Verification Code
                  </button>
                </div>
              )}

              {/* Step 2: OTP and Basic Details */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <p className="text-blue-900">
                      We've sent a 6-digit code to <span className="font-semibold text-yellow-600">{formData.email}</span>
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {otpExpiryTime ? (
                        <>
                          Code expires at {formatExpiryTime(otpExpiryTime)} •
                          {canResendOtp ? (
                            <button
                              onClick={handleResendOTP}
                              className="ml-1 text-yellow-600 hover:text-yellow-800 font-medium"
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

                  <div>
                    <label htmlFor="otp" className="block text-blue-900 font-medium mb-2">
                      Verification Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="otp"
                        name="otp"
                        value={formData.otp}
                        onChange={handleChange}
                        className="flex-1 px-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition text-center font-mono text-lg"
                        placeholder="••••••"
                        maxLength="6"

                      />
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={!canResendOtp || isSubmitting}
                        className={`px-4 py-3 rounded-xl transition flex items-center ${canResendOtp ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-200 text-blue-500 cursor-not-allowed'} disabled:opacity-70`}
                      >
                        <FaRedo className="mr-2" /> {isSubmitting ? 'Sending...' : 'Resend'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-blue-900 font-medium mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-yellow-500">
                          <FaUser />
                        </div>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                          placeholder="John Doe"

                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-blue-900 font-medium mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-yellow-500">
                          <FaPhone />
                        </div>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                          placeholder="9876543210"

                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dateOfBirth" className="block text-blue-900 font-medium mb-2">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-yellow-500">
                        <FaCalendarAlt />
                      </div>
                      <input
                        type="date"
                        id="dateOfBirth"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition appearance-none"

                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="password" className="block text-blue-900 font-medium mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-yellow-500">
                          <FaLock />
                        </div>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                          placeholder="••••••••"
                          minLength="8"

                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-blue-900 font-medium mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-yellow-500">
                          <FaLock />
                        </div>
                        <input
                          type="password"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                          placeholder="••••••••"

                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-yellow-600 hover:text-yellow-800 font-medium flex items-center px-4 py-2 rounded-lg hover:bg-yellow-50 transition"
                      disabled={isSubmitting}
                    >
                      <FaArrowLeft className="mr-2" /> Back
                    </button>

                    <button
                      type="submit"
                      className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-blue-900 font-bold py-3 px-6 rounded-xl shadow-md transition duration-300 disabled:opacity-70"
                      disabled={isSubmitting}
                    >
                      Complete Registration
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Login */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-blue-900 font-medium mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-yellow-500">
                        <FaEnvelope />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                        placeholder="your@email.com"

                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-blue-900 font-medium mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-yellow-500">
                        <FaLock />
                      </div>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                        placeholder="••••••••"

                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-yellow-600 hover:text-yellow-800 font-medium flex items-center px-4 py-2 rounded-lg hover:bg-yellow-50 transition"
                      disabled={isSubmitting}
                    >
                      <FaArrowLeft className="mr-2" /> Back
                    </button>

                    <button
                      type="submit"
                      className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-blue-900 font-bold py-3 px-6 rounded-xl shadow-md transition duration-300 disabled:opacity-70"
                      disabled={isSubmitting}
                    >
                      Login
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Complete Profile */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="services" className="block text-blue-900 font-medium mb-2">
                        Service Type
                      </label>
                      <select
                        id="services"
                        name="services"
                        value={formData.services}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"

                      >
                        <option value="">Select service</option>
                        <option value="Electrical">Electrical</option>
                        <option value="AC">AC Services</option>
                        <option value="Appliance Repair">Appliance Repair</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="experience" className="block text-blue-900 font-medium mb-2">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        id="experience"
                        name="experience"
                        value={formData.experience}
                        onChange={handleChange}
                        min="0"
                        max="40"
                        className="w-full px-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                        placeholder="0"

                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="serviceArea" className="block text-blue-900 font-medium mb-2">
                      Service Area (Cities/Pincodes)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-yellow-500">
                        <FaMapMarkerAlt />
                      </div>
                      <input
                        type="text"
                        id="serviceArea"
                        name="serviceArea"
                        value={formData.serviceArea}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                        placeholder="Cities or pincodes you serve"

                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="resume" className="block text-blue-900 font-medium mb-2">
                      Professional Resume (PDF)
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
                      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-2 border-blue-100 rounded-xl hover:border-yellow-400 transition">
                        <span className="text-blue-700 truncate">
                          {formData.resume ? formData.resume.name : 'Choose file...'}
                        </span>
                        <FaFileAlt className="text-blue-400" />
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-blue-700">Upload your resume in PDF format</p>
                  </div>

                  <div>
                    <label htmlFor="profilePic" className="block text-blue-900 font-medium mb-2">
                      Profile Picture
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
                      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-2 border-blue-100 rounded-xl hover:border-yellow-400 transition">
                        <span className="text-blue-700 truncate">
                          {formData.profilePic ? formData.profilePic.name : 'Choose file...'}
                        </span>
                        <FaUser className="text-blue-400" />
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-blue-700">Upload a clear profile photo</p>
                  </div>

                  <div className="border-t border-blue-200 pt-6 mt-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                      <FaHome className="mr-2 text-yellow-500" />
                      Address Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="street" className="block text-blue-900 font-medium mb-2">
                          Street Address
                        </label>
                        <input
                          type="text"
                          id="street"
                          name="street"
                          value={formData.street}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                          placeholder="123 Main St"

                        />
                      </div>

                      <div>
                        <label htmlFor="city" className="block text-blue-900 font-medium mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                          placeholder="Your city"

                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label htmlFor="state" className="block text-blue-900 font-medium mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          id="state"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                          placeholder="Your state"

                        />
                      </div>

                      <div>
                        <label htmlFor="postalCode" className="block text-blue-900 font-medium mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          id="postalCode"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                          placeholder="123456"

                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-blue-200 pt-6 mt-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                      <FaWallet className="mr-2 text-yellow-500" />
                      Bank Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="accountNo" className="block text-blue-900 font-medium mb-2">
                          Account Number
                        </label>
                        <input
                          type="text"
                          id="accountNo"
                          name="accountNo"
                          value={formData.accountNo}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                          placeholder="1234567890"

                        />
                      </div>

                      <div>
                        <label htmlFor="ifsc" className="block text-blue-900 font-medium mb-2">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          id="ifsc"
                          name="ifsc"
                          value={formData.ifsc}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition"
                          placeholder="ABCD0123456"

                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label htmlFor="passbookImage" className="block text-blue-900 font-medium mb-2">
                        Passbook Image
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
                        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-2 border-blue-100 rounded-xl hover:border-yellow-400 transition">
                          <span className="text-blue-700 truncate">
                            {formData.passbookImage ? formData.passbookImage.name : 'Choose Passbook file...'}
                          </span>
                          <FaFileAlt className="text-blue-400" />
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-blue-700">Upload clear image of your passbook </p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-8">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-yellow-600 hover:text-yellow-800 font-medium flex items-center px-4 py-2 rounded-lg hover:bg-yellow-50 transition"
                      disabled={isSubmitting}
                    >
                      <FaArrowLeft className="mr-2" /> Back
                    </button>

                    <button
                      type="submit"
                      className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-blue-900 font-bold py-3 px-6 rounded-xl shadow-md transition duration-300 disabled:opacity-70"
                      disabled={isSubmitting}
                    >
                      Complete Profile
                    </button>
                  </div>
                </div>
              )}
            </form>

            <div className="mt-8 text-center">
              <p className="text-blue-700">
                {step === 1 ? 'Already have an account? ' : step === 3 ? 'Need to register? ' : 'Need help? '}
                <Link
                  to={step === 1 || step === 3 ? '/login' : '/contact'}
                  className="text-yellow-600 hover:text-yellow-800 font-medium"
                >
                  {step === 1 ? 'Login' : step === 3 ? 'Register' : 'Contact Support'}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProviderRegistration;