import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  FaArrowLeft,
  FaCreditCard,
  FaMoneyBillWave,
  FaCheckCircle,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaClock,
  FaTag,
  FaExclamationTriangle,
  FaShieldAlt,
  FaLock,
  FaTools,
  FaInfoCircle,
  FaSpinner
} from 'react-icons/fa';
import { FiCheck } from 'react-icons/fi';
import razorpayLogo from '../../assets/razorpay.png';

const PaymentConfirmation = () => {
  const { bookingId } = useParams();
  const { state } = useLocation();
  const { user, token, API, showToast } = useAuth();
  const navigate = useNavigate();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [service, setService] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const [error, setError] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const loadRazorpay = () => {
      if (window.Razorpay) {
        setRazorpayLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        console.log('Razorpay script loaded successfully');
        setRazorpayLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        setRazorpayLoaded(false);
      };
      document.body.appendChild(script);
    };

    loadRazorpay();

    return () => {
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  // Fetch booking details
  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Debug logs
        console.log('Booking ID from params:', bookingId);
        console.log('Location state:', state);

        // First check if we have data in location state
        if (state?.booking && state?.service) {
          console.log('Using data from location state');
          setBooking(state.booking);
          setService(state.service);
          setCoupon(state.coupon || null);
          setIsLoading(false);
          return;
        }

        // If no state but we have bookingId, fetch from API
        if (bookingId && bookingId !== 'undefined') {
          console.log('Fetching booking details from API');
          const response = await axios.get(`${API}/booking/user/${bookingId}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });

          if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to load booking');
          }

          const bookingData = response.data.data;
          setBooking({
            ...bookingData,
            subtotal: bookingData.amount + (bookingData.discount || 0),
            totalDiscount: bookingData.discount || 0,
            totalAmount: bookingData.amount
          });

          // Fetch service details
          if (bookingData.service) {
            const serviceResponse = await axios.get(
              `${API}/service/services/${bookingData.service}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (serviceResponse.data.success) {
              setService(serviceResponse.data.data);
            }
          }

          // Set coupon if available
          if (bookingData.couponCode) {
            setCoupon({ code: bookingData.couponCode });
          }
        } else {
          throw new Error('Invalid booking reference');
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load booking details');
        showToast('Failed to load booking details', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, token, API, state, navigate]);

  // Helper function to format date safely
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not set';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date formatting error';
    }
  };

  // Get service details with proper fallbacks
  const getServiceInfo = () => {
    if (service) {
      return {
        title: service.title,
        category: service.category,
        duration: service.duration,
        image: service.image,
        price: service.price || service.basePrice
      };
    }

    if (booking?.service) {
      return {
        title: booking.service.title || booking.service.name,
        category: booking.service.category,
        duration: booking.service.duration,
        image: booking.service.image,
        price: booking.service.price || booking.service.basePrice
      };
    }

    return {
      title: 'Service',
      category: 'General Service',
      duration: null,
      image: null,
      price: booking?.totalAmount || 0
    };
  };

  // Handle cash payment confirmation
  const handleCashPayment = async () => {
    if (!bookingId || bookingId === 'undefined') {
      showToast('Invalid booking ID', 'error');
      return;
    }

    const serviceInfo = getServiceInfo();

    // Show confirmation dialog for cash payment
    const confirmCashPayment = window.confirm(
      `Confirm Cash Payment?\n\n` +
      `Service: ${serviceInfo.title}\n` +
      `Amount: ₹${booking.totalAmount.toFixed(2)}\n` +
      `Date: ${formatDate(booking.date)}\n\n` +
      `You will pay cash after service completion.\n` +
      `Do you want to confirm this booking?`
    );

    if (!confirmCashPayment) {
      return;
    }

    try {
      setPaymentProcessing(true);
      showToast('Confirming your booking...', 'info');

      const response = await axios.put(
        `${API}/booking/user/bookings/${bookingId}/confirm-payment`,
        { 
          paymentMethod: 'cash',
          paymentStatus: 'pending',
          bookingStatus: 'pending',
          notes: 'Customer selected cash payment option'
        },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Payment confirmation failed');
      }

      setBooking(prev => ({
        ...prev,
        confirmedBooking: true,
        paymentMethod: 'cash',
        paymentStatus: 'pending'
      }));

      showToast('✅ Booking confirmed! You can pay cash after service completion.', 'success');
      
      setTimeout(() => {
        navigate('/customer/bookings', {
          state: {
            message: 'Booking confirmed successfully! Payment will be collected after service completion.',
            bookingId: booking._id,
            paymentMethod: 'cash',
            showCashPaymentInfo: true
          }
        });
      }, 2000);

    } catch (err) {
      console.error('Error:', err);
      let errorMessage = 'Failed to confirm booking. ';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage += 'Request timeout. Please check your connection and try again.';
      } else if (err.response?.status === 401) {
        errorMessage += 'Session expired. Please login again.';
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.data?.message) {
        errorMessage += err.response.data.message;
      } else {
        errorMessage += 'Please try again or contact support.';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Handle online payment
  const handleOnlinePayment = async () => {
    if (!bookingId || bookingId === 'undefined') {
      showToast('Invalid booking ID', 'error');
      return;
    }

    if (!razorpayLoaded) {
      showToast('Payment gateway is loading. Please wait...', 'info');
      return;
    }

    try {
      // Enhanced user validation
      if (!user?.email || !user?.phone) {
        showToast('Please update your profile with email and phone number before making payment', 'error');
        setTimeout(() => navigate('/customer/profile'), 2000);
        return;
      }

      setPaymentProcessing(true);
      showToast('Initializing secure payment...', 'info');

      // Create Razorpay order
      const orderResponse = await axios.post(
        `${API}/transaction/create-order`,
        {
          bookingId,
          amount: Math.round(booking.totalAmount * 100),
          currency: 'INR',
          paymentMethod: 'online',
          notes: {
            bookingId: booking._id,
            userId: user._id,
            serviceType: service?.title || 'Service',
            customerName: user.name,
            customerEmail: user.email
          }
        },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000
        }
      );

      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.message || 'Failed to create payment order');
      }

      const { order, key, transactionId } = orderResponse.data.data;

      if (!order?.id || !key) {
        throw new Error('Invalid payment order data received');
      }

      showToast('Opening secure payment gateway...', 'info');

      // Enhanced Razorpay options
      const options = {
        key: key,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Raj Electrical Services',
        description: `Payment for ${service?.title || 'service'}`,
        image: '/logo.png',
        order_id: order.id,
        handler: async function (response) {
          try {
            showToast('Verifying payment...', 'info');

            const verifyResponse = await axios.post(
              `${API}/transaction/verify`,
              {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                bookingId: booking._id,
                transactionId: transactionId,
                bookingStatus: 'pending',
                paymentMethod: 'online'
              },
              {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 20000
              }
            );

            if (!verifyResponse.data.success) {
              throw new Error(verifyResponse.data.message || 'Payment verification failed');
            }

            setBooking(prev => ({
              ...prev,
              confirmedBooking: true,
              paymentMethod: 'online',
              paymentStatus: 'paid'
            }));

            showToast('🎉 Payment successful! Booking confirmed.', 'success');
            
            setTimeout(() => {
              navigate('/customer/bookings', {
                state: {
                  message: 'Payment successful! Your booking has been confirmed.',
                  bookingId: booking._id,
                  paymentId: response.razorpay_payment_id,
                  transactionId: transactionId,
                  showSuccessAnimation: true
                }
              });
            }, 2000);

          } catch (verificationError) {
            console.error('Payment verification error:', verificationError);
            
            let errorMsg = 'Payment verification failed. ';
            if (verificationError.response?.status === 401) {
              errorMsg += 'Please login again and contact support.';
            } else if (verificationError.response?.status === 404) {
              errorMsg += 'Booking not found. Please contact support.';
            } else {
              errorMsg += `Please contact support with payment ID: ${response.razorpay_payment_id}`;
            }
            
            showToast(errorMsg, 'error');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        notes: {
          bookingId: booking._id,
          userId: user?._id || '',
          serviceType: service?.title || 'Service',
          customerName: user?.name || '',
          bookingDate: booking?.date || ''
        },
        theme: {
          color: '#0D9488',
          backdrop_color: 'rgba(0, 0, 0, 0.7)'
        },
        modal: {
          ondismiss: function () {
            console.log('Payment modal dismissed by user');
            showToast('Payment cancelled. You can try again anytime.', 'info');
          },
          confirm_close: true,
          escape: true,
          animation: true
        },
        retry: {
          enabled: true,
          max_count: 3
        },
        timeout: 300,
        remember_customer: false
      };

      const rzp = new window.Razorpay(options);

      // Enhanced error handling
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);

        let errorMessage = 'Payment failed. ';
        
        if (response.error?.code === 'BAD_REQUEST_ERROR') {
          errorMessage += 'Invalid payment details. Please try again.';
        } else if (response.error?.code === 'GATEWAY_ERROR') {
          errorMessage += 'Payment gateway error. Please try a different payment method.';
        } else if (response.error?.code === 'NETWORK_ERROR') {
          errorMessage += 'Network error. Please check your connection and try again.';
        } else if (response.error?.description) {
          errorMessage += response.error.description;
        } else {
          errorMessage += 'Please try again or contact support.';
        }

        showToast(errorMessage, 'error');
      });

      // Open payment modal
      rzp.open();

    } catch (err) {
      console.error('Error:', err);
      
      let errorMessage = 'Failed to initialize payment. ';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage += 'Request timeout. Please check your internet connection and try again.';
      } else if (err.response?.status === 401) {
        errorMessage += 'Session expired. Please login again.';
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 400) {
        errorMessage += err.response.data?.message || 'Invalid payment request. Please check your booking details.';
      } else if (err.response?.status === 500) {
        errorMessage += 'Server error. Please try again in a few minutes.';
      } else if (err.response?.data?.message) {
        errorMessage += err.response.data.message;
      } else {
        errorMessage += 'Please try again or contact support.';
      }

      showToast(errorMessage, 'error');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-secondary/70">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto p-8 bg-background rounded-2xl shadow-lg border border-gray-100">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-200">
            <FaExclamationTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-secondary mb-3">Something went wrong</h2>
          <p className="text-secondary/70 mb-8 leading-relaxed">{error}</p>
          <div className="space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-4 bg-primary text-background rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/customer/bookings')}
              className="w-full px-6 py-4 bg-secondary/10 text-secondary rounded-xl font-semibold hover:bg-secondary/20 transition-all duration-200"
            >
              Go to My Bookings
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Booking not found state
  if (!booking || !booking._id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto p-8 bg-background rounded-2xl shadow-lg border border-gray-100">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-primary/20">
            <FaInfoCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-secondary mb-3">Booking Not Found</h2>
          <p className="text-secondary/70 mb-8 leading-relaxed">We couldn't find the booking details you're looking for.</p>
          <button
            onClick={() => navigate('/customer/services')}
            className="px-8 py-4 bg-primary text-background rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Book a New Service
          </button>
        </div>
      </div>
    );
  }

  const serviceInfo = getServiceInfo();

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center text-primary hover:text-primary/80 transition-all duration-200 mb-6 hover:scale-105"
          >
            <FaArrowLeft className="mr-2 transition-transform group-hover:-translate-x-1" />
            Back to bookings
          </button>

          <div className="text-center lg:text-left">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary mb-2">
              Complete Your Payment
            </h1>
            <p className="text-secondary/60 text-lg">Review your booking details and complete payment securely</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Booking Summary */}
            <div className="bg-background rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
              <h2 className="text-2xl font-bold text-secondary mb-6 flex items-center">
                <FaCalendarAlt className="mr-3 text-primary" />
                Booking Summary
              </h2>

              {/* Service Details */}
              <div className="flex items-start mb-6 pb-6 border-b border-gray-100">
                <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-50 shadow-md">
                  {serviceInfo.image ? (
                    <img
                      src={serviceInfo.image}
                      alt={serviceInfo.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = '/placeholder-service.jpg';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <FaTools className="w-8 h-8 text-primary" />
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-xl font-bold text-secondary mb-1">{serviceInfo.title}</h3>
                  <p className="text-sm text-primary font-medium capitalize bg-primary/10 px-2 py-1 rounded-full inline-block">
                    {serviceInfo.category?.toLowerCase()}
                  </p>
                  <div className="flex items-center mt-2 text-secondary/60">
                    <FaClock className="mr-1 text-xs" />
                    <span className="text-sm">{serviceInfo.duration} hours</span>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div className="space-y-4">
                <div className="flex items-center p-4 rounded-xl hover:bg-gray-50 transition-all duration-200">
                  <div className="bg-primary/10 p-3 rounded-lg text-primary mr-4">
                    <FaCalendarAlt className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-secondary/60 font-medium mb-1">Date & Time</p>
                    <p className="font-semibold text-secondary">
                      {formatDate(booking.date)}
                      {booking.time && ` at ${booking.time}`}
                    </p>
                  </div>
                </div>

                {booking.address && (
                  <div className="flex items-start p-4 rounded-xl hover:bg-gray-50 transition-all duration-200">
                    <div className="bg-primary/10 p-3 rounded-lg text-primary mr-4">
                      <FaMapMarkerAlt className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-secondary/60 font-medium mb-1">Service Address</p>
                      <p className="font-semibold text-secondary">
                        {[
                          booking.address.street,
                          booking.address.city,
                          booking.address.state,
                          booking.address.postalCode
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {booking.notes && (
                  <div className="flex items-start p-4 rounded-xl hover:bg-gray-50 transition-all duration-200">
                    <div className="bg-primary/10 p-3 rounded-lg text-primary mr-4">
                      <FaInfoCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-secondary/60 font-medium mb-1">Special Instructions</p>
                      <p className="font-semibold text-secondary">{booking.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Selection */}
            {!booking.confirmedBooking && (
              <div className="bg-background rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
                <h2 className="text-2xl font-bold text-secondary mb-6 flex items-center">
                  <FaCreditCard className="mr-3 text-primary" />
                  Select Payment Method
                </h2>

                <div className="space-y-4 mb-6">
                  <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online"
                      checked={paymentMethod === 'online'}
                      onChange={() => setPaymentMethod('online')}
                      className="h-5 w-5 text-primary focus:ring-primary border-gray-300 mr-4"
                    />
                    <div className="flex items-center flex-1">
                      <div className="bg-primary/10 p-3 rounded-lg text-primary mr-4">
                        <FaCreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-semibold text-secondary text-lg">Online Payment</span>
                        <p className="text-sm text-secondary/60 mt-1">Pay now using UPI/Card/Wallet - Secure & Instant</p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                      className="h-5 w-5 text-primary focus:ring-primary border-gray-300 mr-4"
                    />
                    <div className="flex items-center flex-1">
                      <div className="bg-accent/10 p-3 rounded-lg text-accent mr-4">
                        <FaMoneyBillWave className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-semibold text-secondary text-lg">Cash on Service</span>
                        <p className="text-sm text-secondary/60 mt-1">Pay when the service is completed</p>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={paymentMethod === 'online' ? handleOnlinePayment : handleCashPayment}
                    disabled={paymentProcessing}
                    className="w-full flex justify-center items-center px-6 py-4 bg-primary text-background rounded-xl font-bold text-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-xl"
                  >
                    {paymentProcessing ? (
                      <>
                        <FaSpinner className="animate-spin mr-3 w-5 h-5" />
                        Processing...
                      </>
                    ) : paymentMethod === 'online' ? (
                      <>
                        <FaCreditCard className="mr-3 w-5 h-5" />
                        Pay ₹{booking.totalAmount?.toFixed(2)} Now
                      </>
                    ) : (
                      <>
                        <FaMoneyBillWave className="mr-3 w-5 h-5" />
                        Confirm Booking
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-center text-sm text-secondary/60 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                  <FaLock className="mr-2 w-4 h-4" />
                  <span className="font-medium">Your payment is secured with 256-bit SSL encryption</span>
                </div>
              </div>
            )}

            {/* Booking Confirmed State */}
            {booking.confirmedBooking && (
              <div className="bg-background rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-200">
                    <FaCheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-secondary mb-3">Booking Confirmed!</h2>
                  <p className="text-secondary/70 mb-6 leading-relaxed">
                    Payment method: {booking.paymentMethod === 'online' ? 'Online Payment' : 'Cash on Service'}
                  </p>
                  <button
                    onClick={() => navigate('/customer/bookings')}
                    className="px-8 py-4 bg-primary text-background rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    View My Bookings
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6 relative">
            {/* Price Summary */}
            <div className="bg-background rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-6 z-50 hover:shadow-xl transition-shadow duration-300 backdrop-blur-sm bg-background/95">
              <h3 className="text-xl font-bold text-secondary mb-4 flex items-center">
                <FaTag className="mr-3 text-primary" />
                Price Summary
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-secondary/70 font-medium">Service Price:</span>
                  <span className="font-semibold text-secondary">
                    ₹{(serviceInfo.price || booking.totalAmount || 0).toFixed(2)}
                  </span>
                </div>

                {coupon && booking.totalDiscount > 0 && (
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <FaTag className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-green-700 font-medium text-sm">Discount ({coupon.code}):</span>
                    </div>
                    <span className="font-semibold text-green-700">-₹{(booking.totalDiscount || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-secondary">Total Amount:</span>
                    <span className="text-xl font-bold text-primary">₹{(booking.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary/70 font-medium text-sm">Payment Status:</span>
                    <span className={`font-semibold text-sm ${booking.paymentStatus === 'paid' ? 'text-primary' : 'text-accent'}`}>
                      {booking.paymentMethod === 'online' && booking.paymentStatus === 'paid'
                        ? 'Paid Online'
                        : booking.paymentMethod === 'cash'
                          ? 'Pending (Pay on Service)'
                          : booking.paymentStatus === 'pending'
                            ? 'Pending'
                            : booking.paymentStatus || 'Not Specified'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Secure Payment Section */}
            <div className="bg-background rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300 relative z-10">
              <h3 className="text-xl font-bold text-secondary mb-4 flex items-center">
                <FaShieldAlt className="mr-3 text-primary" />
                Secure Payment
              </h3>

              <div className="space-y-4">
                {/* Razorpay Logo */}
                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <img 
                    src={razorpayLogo} 
                    alt="Razorpay Secure Payment Gateway" 
                    className="h-10 w-auto opacity-90 hover:opacity-100 transition-opacity duration-200"
                  />
                </div>

                {/* Security Features */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <FaLock className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-xs font-medium text-secondary">256-bit SSL</span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <FaShieldAlt className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-xs font-medium text-secondary">PCI DSS</span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <FaCreditCard className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-xs font-medium text-secondary">Bank Grade</span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <FaCheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-xs font-medium text-secondary">Verified</span>
                  </div>
                </div>

                {/* Security Description */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-secondary/70 leading-relaxed text-center">
                    Your payment information is encrypted and secure. We use industry-standard security measures to protect your data and ensure safe transactions.
                  </p>
                </div>

                {/* Accepted Payment Methods */}
                <div className="text-center">
                  <p className="text-sm text-secondary/60 mb-2 font-medium">Accepted Payment Methods</p>
                  <div className="flex items-center justify-center space-x-3 text-secondary/50">
                    <span className="text-xs font-medium">Cards</span>
                    <span className="w-1 h-1 bg-secondary/30 rounded-full"></span>
                    <span className="text-xs font-medium">UPI</span>
                    <span className="w-1 h-1 bg-secondary/30 rounded-full"></span>
                    <span className="text-xs font-medium">Net Banking</span>
                    <span className="w-1 h-1 bg-secondary/30 rounded-full"></span>
                    <span className="text-xs font-medium">Wallets</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
