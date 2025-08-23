 import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
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
  FaInfoCircle
} from 'react-icons/fa';
import { FiCheck } from 'react-icons/fi';
import razorpayLogo from '../../assets/razorpay.png';

const BookingConfirmation = () => {
  const { bookingId } = useParams();
  const { token, user, isAuthenticated, API, showToast } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [bookingDetails, setBookingDetails] = useState(null);
  const [serviceDetails, setServiceDetails] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [error, setError] = useState(null);

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

  const fetchServiceDetails = async (serviceId) => {
    try {
      console.log('Fetching service details for ID:', serviceId);
      const response = await axios.get(`${API}/service/services/${serviceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.data?.success) {
        console.log('Service details fetched successfully:', response.data.data);
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching service details:', error);
      return null;
    }
  };

  const fetchBookingDetails = async () => {
    try {
      console.log('Fetching booking details for ID:', bookingId);
      
      if (!token) {
        throw new Error('Authentication token is missing');
      }

      const response = await axios.get(`${API}/booking/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch booking details');
      }

      const booking = response.data.data;
      if (!booking) {
        throw new Error('Booking data not found in response');
      }

      console.log('Booking details fetched successfully:', booking);

      // Set payment method based on booking data
      if (booking.paymentMethod) {
        setPaymentMethod(booking.paymentMethod);
      }

      setBookingDetails(booking);

      // Fetch service details if not in location state
      if (!location.state?.service) {
        const serviceId =
          booking.serviceId ||
          (booking.services && booking.services[0]?.serviceId) ||
          (booking.service && booking.service._id);

        if (serviceId) {
          const service = await fetchServiceDetails(serviceId);
          if (service) {
            setServiceDetails(service);
          }
        }
      } else if (location.state?.service) {
        console.log('Using service details from location state:', location.state.service);
        setServiceDetails(location.state.service);
      }

      setError(null);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      let errorMessage = 'Failed to load booking details';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
        setError(errorMessage);
        setTimeout(() => navigate('/login'), 3000);
        return;
      } else if (error.response?.status === 404) {
        errorMessage = 'Booking not found. It may have been cancelled or doesn\'t exist.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setError(errorMessage);
      showToast(errorMessage, 'error');

      // Only redirect after showing error for non-auth errors
      if (error.response?.status !== 401) {
        setTimeout(() => navigate('/customer/bookings'), 5000);
      }
    }
  };

  // Initialize component
  useEffect(() => {
    console.log('BookingConfirmation component initializing...');
    console.log('BookingId:', bookingId);
    console.log('IsAuthenticated:', isAuthenticated);
    console.log('Token exists:', !!token);
    console.log('Location state:', location.state);

    const initializeComponent = async () => {
      setIsLoading(true);
      setError(null);

      // Check authentication
      if (!isAuthenticated || !token) {
        console.log('User not authenticated, redirecting to login');
        showToast('Please login to view booking details', 'error');
        navigate('/login');
        return;
      }

      // Validate booking ID
      if (!bookingId || bookingId === 'undefined' || bookingId === 'null') {
        console.error('Invalid booking ID:', bookingId);
        setError('Invalid booking ID. Please try booking again.');
        showToast('Invalid booking ID. Please try booking again.', 'error');
        setTimeout(() => navigate('/customer/services'), 3000);
        return;
      }

      try {
        // Use data from location state if available (from booking creation)
        if (location.state?.booking) {
          console.log('Using booking details from location state');
          setBookingDetails(location.state.booking);
          setServiceDetails(location.state.service);
          
          if (location.state.booking.paymentMethod) {
            setPaymentMethod(location.state.booking.paymentMethod);
          }
        } else {
          console.log('Fetching booking details from API');
          await fetchBookingDetails();
        }
      } catch (error) {
        console.error('Error during initialization:', error);
        setError('Failed to initialize booking confirmation');
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    if (!isInitialized) {
      initializeComponent();
    }
  }, [bookingId, isAuthenticated, token, location.state, isInitialized]);

  const validateBookingDetails = () => {
    if (!bookingDetails) {
      showToast('Booking details are missing', 'error');
      return false;
    }

    if (!bookingDetails._id) {
      showToast('Invalid booking ID', 'error');
      return false;
    }

    if (!bookingDetails.totalAmount || bookingDetails.totalAmount <= 0) {
      showToast('Invalid booking amount', 'error');
      return false;
    }

    return true;
  };

  const handleCashPayment = async () => {
    if (!validateBookingDetails()) return;

    const serviceInfo = getServiceInfo();

    // Show confirmation dialog for cash payment
    const confirmCashPayment = window.confirm(
      `Confirm Cash Payment?\n\n` +
      `Service: ${serviceInfo.title}\n` +
      `Amount: ₹${bookingDetails.totalAmount.toFixed(2)}\n` +
      `Date: ${formatDate(bookingDetails.date)}\n\n` +
      `You will pay cash after service completion.\n` +
      `Do you want to confirm this booking?`
    );

    if (!confirmCashPayment) {
      return;
    }

    try {
      // Show processing toast
      showToast('Confirming your booking...', 'info');

      // For cash payments, we only update the booking payment method and status
      // NO transaction record should be created for cash payments
      const response = await axios.post(
        `${API}/booking/${bookingDetails._id}/payment`,
        {
          paymentMethod: 'cash',
          paymentStatus: 'pending', // Cash payments remain pending until service completion
          bookingStatus: 'pending',
          notes: 'Customer selected cash payment option'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to update payment details');
      }

      // Update booking details
      try {
        await fetchBookingDetails();
      } catch (fetchError) {
        console.warn('Failed to fetch updated booking details:', fetchError);
        // Don't fail the entire process if fetching fails
      }

      // Success message with more details
      showToast('✅ Booking confirmed! You can pay cash after service completion.', 'success');

      // Navigate with enhanced state
      setTimeout(() => {
        navigate('/customer/bookings', {
          state: {
            message: 'Booking confirmed successfully! Payment will be collected after service completion.',
            bookingId: bookingDetails._id,
            paymentMethod: 'cash',
            showCashPaymentInfo: true
          }
        });
      }, 2000);

    } catch (error) {
      console.error('Cash payment error:', error);
      
      let errorMessage = 'Failed to confirm booking. ';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage += 'Request timeout. Please check your connection and try again.';
      } else if (error.response?.status === 401) {
        errorMessage += 'Session expired. Please login again.';
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 400) {
        errorMessage += error.response.data?.message || 'Invalid booking data. Please try again.';
      } else if (error.response?.status === 409) {
        errorMessage += 'Booking conflict. Please refresh and try again.';
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else {
        errorMessage += 'Please try again or contact support.';
      }
      
      showToast(errorMessage, 'error');
    }
  };

  const handleOnlinePayment = async () => {
    if (!validateBookingDetails()) return;

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

      // Show payment processing toast
      const processingToast = showToast('Initializing secure payment...', 'info');

      const orderResponse = await axios.post(
        `${API}/transaction/create-order`,
        {
          bookingId: bookingDetails._id,
          amount: Math.round(bookingDetails.totalAmount * 100),
          currency: 'INR',
          paymentMethod: 'online',
          notes: {
            bookingId: bookingDetails._id,
            userId: user._id,
            serviceType: serviceDetails?.title || bookingDetails?.services?.[0]?.serviceDetails?.title || 'Service',
            customerName: user.name,
            customerEmail: user.email
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000 // Increased timeout
        }
      );

      if (!orderResponse.data?.success) {
        throw new Error(orderResponse.data?.message || 'Failed to create payment order');
      }

      const { order, key, transactionId } = orderResponse.data.data;

      if (!order?.id || !key) {
        throw new Error('Invalid payment order data received');
      }

      // Update toast
      showToast('Opening secure payment gateway...', 'info');

      const options = {
        key: key,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Raj Electrical Services',
        description: `Payment for ${serviceDetails?.title || bookingDetails?.services?.[0]?.serviceDetails?.title || 'service'}`,
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
                bookingId: bookingDetails._id,
                transactionId: transactionId,
                bookingStatus: 'pending',
                paymentMethod: 'online'
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                timeout: 20000
              }
            );

            if (!verifyResponse.data?.success) {
              throw new Error(verifyResponse.data?.message || 'Payment verification failed');
            }

            // Update booking details
            try {
              await fetchBookingDetails();
            } catch (fetchError) {
              console.warn('Failed to fetch updated booking details:', fetchError);
            }

            // Success animation and redirect
            showToast('🎉 Payment successful! Booking confirmed.', 'success');
            
            setTimeout(() => {
              navigate('/customer/bookings', {
                state: {
                  message: 'Payment successful! Your booking has been confirmed.',
                  bookingId: bookingDetails._id,
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
          bookingId: bookingDetails._id,
          userId: user?._id || '',
          serviceType: serviceDetails?.title || 'Service',
          customerName: user?.name || '',
          bookingDate: bookingDetails?.date || ''
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
        timeout: 300, // 5 minutes timeout
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

    } catch (error) {
      console.error('Payment initialization error:', error);

      let errorMessage = 'Failed to initialize payment. ';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage += 'Request timeout. Please check your internet connection and try again.';
      } else if (error.response?.status === 401) {
        errorMessage += 'Session expired. Please login again.';
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 400) {
        errorMessage += error.response.data?.message || 'Invalid payment request. Please check your booking details.';
      } else if (error.response?.status === 500) {
        errorMessage += 'Server error. Please try again in a few minutes.';
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else {
        errorMessage += 'Please try again or contact support.';
      }

      showToast(errorMessage, 'error');
    }
  };

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
    if (serviceDetails) {
      return {
        title: serviceDetails.title,
        category: serviceDetails.category,
        duration: serviceDetails.duration,
        image: serviceDetails.image,
        price: serviceDetails.price
      };
    }

    if (bookingDetails?.services?.[0]?.serviceDetails) {
      return {
        title: bookingDetails.services[0].serviceDetails.title,
        category: bookingDetails.services[0].serviceDetails.category,
        duration: bookingDetails.services[0].serviceDetails.duration,
        image: bookingDetails.services[0].serviceDetails.image,
        price: bookingDetails.services[0].serviceDetails.price
      };
    }

    if (bookingDetails?.service) {
      return {
        title: bookingDetails.service.title || bookingDetails.service.name,
        category: bookingDetails.service.category,
        duration: bookingDetails.service.duration,
        image: bookingDetails.service.image,
        price: bookingDetails.service.price
      };
    }

    return {
      title: 'Service',
      category: 'General Service',
      duration: null,
      image: null,
      price: bookingDetails?.totalAmount || 0
    };
  };

  // Get booking status display info
  const getBookingStatusInfo = () => {
    if (!bookingDetails) return { message: 'Loading...', color: 'text-secondary/60', canPay: false };
    
    switch (bookingDetails.status) {
      case 'pending':
        // Enhanced logic for pending status with payment consideration
        if (bookingDetails.paymentStatus === 'paid') {
          return {
            message: 'Payment Complete - Awaiting Provider',
            color: 'text-primary',
            canPay: false,
            description: 'Your payment has been processed successfully. We are now finding a provider to accept your booking. You will be notified once a provider accepts your request.'
          };
        } else {
          return {
            message: 'Pending Provider Acceptance',
            color: 'text-accent',
            canPay: true,
            description: 'Your booking is waiting for a provider to accept it. Complete payment to secure your booking.'
          };
        }
      case 'accepted':
        return {
          message: 'Accepted by Provider',
          color: 'text-primary',
          canPay: bookingDetails.paymentStatus !== 'paid',
          description: bookingDetails.paymentStatus === 'paid' 
            ? 'Great! A provider has accepted your booking and payment is complete. The provider will contact you soon to confirm service details.'
            : 'A provider has accepted your booking! Please complete payment to finalize the booking.'
        };
      case 'confirmed':
        return {
          message: 'Booking Confirmed',
          color: 'text-primary',
          canPay: bookingDetails.paymentStatus !== 'paid',
          description: 'Your booking is confirmed. Payment is required to secure your slot.'
        };
      case 'in-progress':
        return {
          message: 'Service In Progress',
          color: 'text-primary',
          canPay: bookingDetails.paymentStatus !== 'paid' && bookingDetails.paymentMethod === 'cash',
          description: 'The service is currently being performed. Cash payment can be made upon completion.'
        };
      case 'completed':
        return {
          message: 'Service Completed',
          color: 'text-primary',
          canPay: bookingDetails.paymentStatus !== 'paid' && bookingDetails.paymentMethod === 'cash',
          description: bookingDetails.paymentStatus !== 'paid' 
            ? 'Service completed successfully. Please complete your cash payment.'
            : 'The service has been completed successfully. Thank you!'
        };
      case 'cancelled':
        return {
          message: 'Booking Cancelled',
          color: 'text-red-600',
          canPay: false,
          description: 'This booking has been cancelled and cannot be reactivated.'
        };
      case 'no-show':
        return {
          message: 'Customer No-Show',
          color: 'text-red-500',
          canPay: false,
          description: 'This booking was marked as no-show. Please contact support if this was an error.'
        };
      default:
        // Handle any unexpected status gracefully
        const statusDisplay = bookingDetails.status 
          ? bookingDetails.status.charAt(0).toUpperCase() + bookingDetails.status.slice(1).replace(/[-_]/g, ' ')
          : 'Unknown Status';
        
        return {
          message: statusDisplay,
          color: 'text-secondary/60',
          canPay: ['pending', 'accepted', 'confirmed'].includes(bookingDetails.status) && bookingDetails.paymentStatus !== 'paid',
          description: `Booking status: ${statusDisplay}. ${
            ['pending', 'accepted', 'confirmed'].includes(bookingDetails.status) && bookingDetails.paymentStatus !== 'paid'
              ? 'Payment is required to confirm your booking.'
              : 'Please contact support if you need assistance.'
          }`
        };
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-secondary/70">Loading booking details...</p>
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

  // No booking details state
  if (!bookingDetails) {
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
            Back to services
          </button>

          <div className="text-center lg:text-left">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary mb-2">
              Complete Your Booking
            </h1>
            <p className="text-secondary/60 text-lg">Review your booking details and complete payment securely</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Service Card */}
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
                    <FaTools className="w-8 h-8 text-primary" />
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
                  {bookingDetails?.services?.[0]?.quantity > 1 && (
                    <div className="mt-2">
                      <span className="text-sm bg-accent/15 text-accent px-3 py-1 rounded-full font-semibold">
                        Quantity: {bookingDetails.services[0].quantity}
                      </span>
                    </div>
                  )}
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
                      {formatDate(bookingDetails.date)}
                      {bookingDetails.time && ` at ${bookingDetails.time}`}
                    </p>
                  </div>
                </div>

                {bookingDetails.address && (
                  <div className="flex items-start p-4 rounded-xl hover:bg-gray-50 transition-all duration-200">
                    <div className="bg-primary/10 p-3 rounded-lg text-primary mr-4">
                      <FaMapMarkerAlt className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-secondary/60 font-medium mb-1">Service Address</p>
                      <p className="font-semibold text-secondary">
                        {[
                          bookingDetails.address.street,
                          bookingDetails.address.city,
                          bookingDetails.address.state,
                          bookingDetails.address.postalCode
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {bookingDetails.notes && (
                  <div className="flex items-start p-4 rounded-xl hover:bg-gray-50 transition-all duration-200">
                    <div className="bg-primary/10 p-3 rounded-lg text-primary mr-4">
                      <FaClock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-secondary/60 font-medium mb-1">Special Instructions</p>
                      <p className="font-semibold text-secondary">{bookingDetails.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Booking Status */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-secondary/80 mb-1">Booking Status</p>
                    <p className={`text-lg font-bold ${getBookingStatusInfo().color} mb-2`}>
                      {getBookingStatusInfo().message}
                    </p>
                    <p className="text-sm text-secondary/70 leading-relaxed">
                      {getBookingStatusInfo().description}
                    </p>
                  </div>
                  <div className="bg-background p-2 rounded-lg shadow-sm border border-gray-200">
                    <div className={`w-3 h-3 rounded-full ${
                      bookingDetails.status === 'pending' ? 'bg-accent animate-pulse' :
                      bookingDetails.status === 'accepted' ? 'bg-primary animate-pulse' :
                      bookingDetails.status === 'confirmed' ? 'bg-primary animate-pulse' :
                      bookingDetails.status === 'in-progress' ? 'bg-primary animate-bounce' :
                      bookingDetails.status === 'completed' ? 'bg-primary' :
                      bookingDetails.status === 'cancelled' ? 'bg-red-400' :
                      bookingDetails.status === 'no-show' ? 'bg-red-500' : 'bg-secondary/40'
                    }`}></div>
                  </div>
                </div>
                
              </div>
            </div>

            {/* Payment Information Section */}
            <div className="bg-background rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
              <h2 className="text-2xl font-bold text-secondary mb-6 flex items-center">
                <FaCreditCard className="mr-3 text-primary" />
                Payment Information
              </h2>

              {/* Payment Status Display */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-3 rounded-lg text-primary mr-4">
                      <FaCreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-secondary mb-1">Payment Status</h3>
                      <p className={`text-sm font-medium ${bookingDetails.paymentStatus === 'paid' ? 'text-primary' : 'text-accent'}`}>
                        {bookingDetails.paymentMethod === 'online' && bookingDetails.paymentStatus === 'paid'
                          ? 'Paid Online'
                          : bookingDetails.paymentMethod === 'cash'
                            ? 'Cash Payment (Pay on Service)'
                            : bookingDetails.paymentStatus === 'pending'
                              ? 'Payment Pending'
                              : bookingDetails.paymentStatus || 'Not Specified'}
                      </p>
                      <p className="text-xs text-secondary/60 mt-1">
                        Payment Method: {bookingDetails.paymentMethod ? bookingDetails.paymentMethod.charAt(0).toUpperCase() + bookingDetails.paymentMethod.slice(1) : 'Not specified'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">₹{(bookingDetails.totalAmount || 0).toFixed(2)}</p>
                    <p className="text-xs text-secondary/60 font-medium">Total Amount</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Only show if payment is needed */}
              {getBookingStatusInfo().canPay ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={handleOnlinePayment}
                      className="w-full sm:w-auto bg-primary hover:bg-accent text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3 text-lg"
                    >
                      <FaCreditCard className="w-5 h-5" />
                      Pay Online Now
                    </button>

                    <button
                      onClick={handleCashPayment}
                      className="w-full sm:w-auto bg-accent hover:bg-primary text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3 text-lg"
                    >
                      <FaMoneyBillWave className="w-5 h-5" />
                      Confirm Cash Payment
                    </button>
                  </div>

                  <div className="flex items-center justify-center text-sm text-secondary/60 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <FaLock className="mr-2 w-4 h-4" />
                    <span className="font-medium">Your payment is secured with 256-bit SSL encryption</span>
                  </div>
                  
                  {/* Additional info for specific statuses */}
                  {bookingDetails.status === 'in-progress' && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center text-blue-700">
                        <FaInfoCircle className="mr-3 flex-shrink-0 w-5 h-5" />
                        <p className="text-sm font-medium">
                          Service is currently in progress. You can complete payment now or pay cash after service completion.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {bookingDetails.status === 'completed' && bookingDetails.paymentStatus !== 'paid' && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center text-green-700">
                        <FaCheckCircle className="mr-3 flex-shrink-0 w-5 h-5" />
                        <p className="text-sm font-medium">
                          Service completed successfully! Please complete your payment to close this booking.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-gray-50 rounded-lg text-center border border-gray-200">
                  <div className="flex items-center justify-center mb-4">
                    {bookingDetails.status === 'cancelled' ? (
                      <FaExclamationTriangle className="text-red-500 mr-3 w-6 h-6" />
                    ) : bookingDetails.status === 'completed' ? (
                      <FaCheckCircle className="text-primary mr-3 w-6 h-6" />
                    ) : (
                      <FaInfoCircle className="text-primary mr-3 w-6 h-6" />
                    )}
                  </div>
                  <p className="text-secondary/70 mb-3 font-medium">
                    {getBookingStatusInfo().description}
                  </p>
                  {bookingDetails.status === 'cancelled' && (
                    <p className="text-sm text-secondary/60">
                      {bookingDetails.paymentStatus === 'paid' 
                        ? 'A refund will be processed if applicable.' 
                        : 'You can book a new service from our services page.'}
                    </p>
                  )}
                  {bookingDetails.status === 'completed' && (
                    <p className="text-sm text-secondary/60">
                      Thank you for using our service! You can leave feedback if you haven't already.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6 relative">
            {/* Price Summary */}
            <div className="bg-background rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-xl font-bold text-secondary mb-4 flex items-center">
                <FaTag className="mr-3 text-primary" />
                Price Summary
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-secondary/70 font-medium">Service Price:</span>
                  <span className="font-semibold text-secondary">
                    ₹{(serviceInfo.price || bookingDetails.totalAmount || 0).toFixed(2)}
                  </span>
                </div>

                {bookingDetails.services?.[0]?.quantity > 1 && (
                  <div className="flex justify-between items-center">
                    <span className="text-secondary/60 font-medium">
                      Quantity: {bookingDetails.services[0].quantity}
                    </span>
                    <span className="text-secondary/60 font-medium">
                      ₹{((serviceInfo.price || bookingDetails.totalAmount || 0) / (bookingDetails.services[0].quantity || 1)).toFixed(2)} each
                    </span>
                  </div>
                )}

                {bookingDetails.couponApplied && bookingDetails.totalDiscount > 0 && (
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <FaTag className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-green-700 font-medium text-sm">Discount ({bookingDetails.couponApplied.code}):</span>
                    </div>
                    <span className="font-semibold text-green-700">-₹{(bookingDetails.totalDiscount || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-secondary">Total Amount:</span>
                    <span className="text-xl font-bold text-primary">₹{(bookingDetails.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary/70 font-medium text-sm">Payment Status:</span>
                    <span className={`font-semibold text-sm ${bookingDetails.paymentStatus === 'paid' ? 'text-primary' : 'text-accent'}`}>
                      {bookingDetails.paymentMethod === 'online' && bookingDetails.paymentStatus === 'paid'
                        ? 'Paid Online'
                        : bookingDetails.paymentMethod === 'cash'
                          ? 'Pending (Pay on Service)'
                          : bookingDetails.paymentStatus === 'pending'
                            ? 'Pending'
                            : bookingDetails.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Secure Payment Section */}
            <div className="bg-background rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
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
                    className="h-30 w-40 opacity-90 hover:opacity-100 transition-opacity duration-200"
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

export default BookingConfirmation;
