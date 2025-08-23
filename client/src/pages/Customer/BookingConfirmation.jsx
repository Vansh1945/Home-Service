import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import axios from 'axios';
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
import { motion } from 'framer-motion';
import { FiChevronRight, FiCheck, FiClock, FiAlertCircle } from 'react-icons/fi';
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
          color: '#2563eb',
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

  // Helper function to check if booking can be reactivated
  const canReactivateBooking = () => {
    if (!bookingDetails) return false;
    

    if (bookingDetails.status === 'cancelled') {
      const bookingDate = new Date(bookingDetails.date);
      const now = new Date();
      
      return bookingDate > now && bookingDetails.paymentStatus !== 'paid';
    }
    
    return false;
  };

  // Function to reactivate cancelled booking
  const reactivateBooking = async () => {
    if (!canReactivateBooking()) return;
    
    try {
      
      const response = await axios.put(
        `${API}/booking/${bookingDetails._id}/reactivate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data?.success) {
        bookingDetails.status = 'pending';
        showToast('Booking reactivated successfully! You can now proceed with payment.', 'success');
      } else {
        throw new Error(response.data?.message || 'Failed to reactivate booking');
      }
    } catch (error) {
      console.error('Error reactivating booking:', error);
      showToast(error.response?.data?.message || 'Failed to reactivate booking', 'error');
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
    if (!bookingDetails) return { message: 'Loading...', color: 'text-gray-600', canPay: false };
    
    switch (bookingDetails.status) {
      case 'pending':
        // Enhanced logic for pending status with payment consideration
        if (bookingDetails.paymentStatus === 'paid') {
          return {
            message: 'Payment Complete - Awaiting Provider',
            color: 'text-blue-600',
            canPay: false,
            description: 'Your payment has been processed successfully. We are now finding a provider to accept your booking. You will be notified once a provider accepts your request.'
          };
        } else {
          return {
            message: 'Pending Provider Acceptance',
            color: 'text-amber-600',
            canPay: true,
            description: 'Your booking is waiting for a provider to accept it. Complete payment to secure your booking.'
          };
        }
      case 'accepted':
        return {
          message: 'Accepted by Provider',
          color: 'text-green-600',
          canPay: bookingDetails.paymentStatus !== 'paid',
          description: bookingDetails.paymentStatus === 'paid' 
            ? 'Great! A provider has accepted your booking and payment is complete. The provider will contact you soon to confirm service details.'
            : 'A provider has accepted your booking! Please complete payment to finalize the booking.'
        };
      case 'confirmed':
        return {
          message: 'Booking Confirmed',
          color: 'text-green-600',
          canPay: bookingDetails.paymentStatus !== 'paid',
          description: 'Your booking is confirmed. Payment is required to secure your slot.'
        };
      case 'in-progress':
        return {
          message: 'Service In Progress',
          color: 'text-blue-500',
          canPay: bookingDetails.paymentStatus !== 'paid' && bookingDetails.paymentMethod === 'cash',
          description: 'The service is currently being performed. Cash payment can be made upon completion.'
        };
      case 'completed':
        return {
          message: 'Service Completed',
          color: 'text-green-600',
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
          description: canReactivateBooking() 
            ? 'This booking was cancelled but can be reactivated since the service date is still in the future.'
            : 'This booking has been cancelled and cannot be reactivated.'
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
          color: 'text-gray-600',
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
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
          />
          <h2 className="text-xl font-semibold text-secondary mb-2">Loading Booking Details...</h2>
          <p className="text-secondary/60">Please wait while we fetch your booking information</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-primary/5 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <FaExclamationTriangle className="w-8 h-8 text-red-500" />
          </motion.div>
          <h2 className="text-xl font-semibold text-secondary mb-2">Oops! Something went wrong</h2>
          <p className="text-secondary/60 mb-6">{error}</p>
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              Try Again
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/customer/bookings')}
              className="w-full px-6 py-3 bg-gray-100 text-secondary rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Go to My Bookings
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // No booking details state
  if (!bookingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-primary/5 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <FaInfoCircle className="w-8 h-8 text-amber-500" />
          </motion.div>
          <h2 className="text-xl font-semibold text-secondary mb-2">Booking Not Found</h2>
          <p className="text-secondary/60 mb-6">We couldn't find the booking details you're looking for.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/customer/services')}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Book a New Service
          </motion.button>
        </div>
      </div>
    );
  }

  const serviceInfo = getServiceInfo();

  return (
    <div className="min-h-screen bg-white/80 backdrop-blur-sm py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
          className="mb-8"
        >
          <motion.button
            whileHover={{ x: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(-1)}
            className="group flex items-center text-primary hover:text-primary/80 transition-all duration-200 mb-6 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm hover:shadow-md border border-primary/10"
          >
            <FaArrowLeft className="mr-2 w-4 h-4" />
            <span className="font-medium">Back</span>
          </motion.button>

          <div className="relative">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl lg:text-4xl font-bold text-secondary mb-2"
            >
              Complete Your Booking
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-lg text-secondary/70 mb-4"
            >
              Review your booking details and complete payment securely
            </motion.p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Booking Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-primary/10 transition-all duration-300 hover:shadow-xl hover:border-primary/20"
            >
              <div className="p-6 lg:p-8">
                <h2 className="text-xl font-semibold text-secondary mb-6 flex items-center">
                  <span className="bg-primary/10 text-primary p-2 rounded-lg mr-3">
                    <FiCheck className="w-5 h-5" />
                  </span>
                  Booking Summary
                </h2>

                {/* Service Details */}
                <div className="flex items-start mb-6 pb-6 border-b border-primary/10">
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-primary/5 flex items-center justify-center">
                    {serviceInfo.image ? (
                      <img
                        src={serviceInfo.image}
                        alt={serviceInfo.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-service.jpg';
                        }}
                      />
                    ) : (
                      <FaTools className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-secondary">
                      {serviceInfo.title}
                    </h3>
                    <p className="text-sm text-secondary/60 capitalize mb-2">
                      {serviceInfo.category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {serviceInfo.duration && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                          {serviceInfo.duration}h duration
                        </span>
                      )}
                      {bookingDetails?.services?.[0]?.quantity > 1 && (
                        <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-medium">
                          Qty: {bookingDetails.services[0].quantity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="space-y-3">
                  <motion.div
                    whileHover={{ x: 2, scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center p-3 rounded-lg hover:bg-primary/5 transition-all duration-200 group"
                  >
                    <div className="bg-primary/10 p-2 rounded-lg text-primary mr-3 group-hover:bg-primary/20 transition-colors duration-200">
                      <FaCalendarAlt className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-secondary/60 font-medium">Date & Time</p>
                      <p className="font-semibold text-secondary">
                        {formatDate(bookingDetails.date)}
                        {bookingDetails.time && ` at ${bookingDetails.time}`}
                      </p>
                    </div>
                  </motion.div>

                  {bookingDetails.address && (
                    <motion.div
                      whileHover={{ x: 2, scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start p-3 rounded-lg hover:bg-primary/5 transition-all duration-200 group"
                    >
                      <div className="bg-primary/10 p-2 rounded-lg text-primary mr-3 group-hover:bg-primary/20 transition-colors duration-200">
                        <FaMapMarkerAlt className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm text-secondary/60 font-medium">Service Address</p>
                        <p className="font-semibold text-secondary">
                          {[
                            bookingDetails.address.street,
                            bookingDetails.address.city,
                            bookingDetails.address.state,
                            bookingDetails.address.postalCode
                          ].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {bookingDetails.notes && (
                    <motion.div
                      whileHover={{ x: 2, scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start p-3 rounded-lg hover:bg-primary/5 transition-all duration-200 group"
                    >
                      <div className="bg-primary/10 p-2 rounded-lg text-primary mr-3 group-hover:bg-primary/20 transition-colors duration-200">
                        <FaClock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm text-secondary/60 font-medium">Special Instructions</p>
                        <p className="font-semibold text-secondary">{bookingDetails.notes}</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Booking Status */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10 backdrop-blur-sm"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-secondary/80">Booking Status</p>
                      <p className={`text-lg font-bold ${getBookingStatusInfo().color}`}>
                        {getBookingStatusInfo().message}
                      </p>
                      <p className="text-sm text-secondary/70 mt-1 leading-relaxed">
                        {getBookingStatusInfo().description}
                      </p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-sm">
                      <div className={`w-3 h-3 rounded-full ${
                        bookingDetails.status === 'pending' ? 'bg-amber-400 animate-pulse' :
                        bookingDetails.status === 'accepted' ? 'bg-primary animate-pulse' :
                        bookingDetails.status === 'confirmed' ? 'bg-green-500 animate-pulse' :
                        bookingDetails.status === 'in-progress' ? 'bg-primary animate-bounce' :
                        bookingDetails.status === 'completed' ? 'bg-green-400' :
                        bookingDetails.status === 'cancelled' ? 'bg-red-400' :
                        bookingDetails.status === 'no-show' ? 'bg-red-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                  </div>
                  
                  {/* Reactivation Option for Cancelled Bookings */}
                  {bookingDetails.status === 'cancelled' && canReactivateBooking() && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 pt-4 border-t border-primary/20"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-green-700">Good News!</p>
                          <p className="text-xs text-green-600">This booking can be reactivated</p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={reactivateBooking}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors duration-200"
                        >
                          Reactivate Booking
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>

            {/* Payment Information Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-primary/10 transition-all duration-300 hover:shadow-xl hover:border-primary/20"
            >
              <div className="p-6 lg:p-8">
                <h2 className="text-xl font-semibold text-secondary mb-6 flex items-center">
                  <span className="bg-primary/10 text-primary p-2 rounded-lg mr-3">
                    <FaCreditCard className="w-5 h-5" />
                  </span>
                  Payment Information
                </h2>

                {/* Payment Status Display */}
                <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/10 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary mr-3">
                        <FaCreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-secondary">Payment Status</h3>
                        <p className={`text-sm font-medium ${bookingDetails.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
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
                      <p className="text-xs text-secondary/60">Total Amount</p>
                    </div>
                  </div>
                </div>

                {/* Razorpay Trust Badge */}
                <div className="mb-6 p-4 bg-white/80 backdrop-blur-sm rounded-lg border border-primary/10">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <img 
                        src={razorpayLogo} 
                        alt="Razorpay" 
                        className="h-6 w-auto opacity-80"
                      />
                      <span className="text-sm text-secondary/70 font-medium">Secure Payment Gateway</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaShieldAlt className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-secondary/60">SSL Secured</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Only show if payment is needed */}
                {getBookingStatusInfo().canPay ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleOnlinePayment}
                        className="bg-primary text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center group"
                      >
                        <FaCreditCard className="mr-2 w-4 h-4" />
                        Pay Online Now
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCashPayment}
                        className="bg-accent text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center group"
                      >
                        <FaMoneyBillWave className="mr-2 w-4 h-4" />
                        Confirm Cash Payment
                      </motion.button>
                    </div>

                    <div className="flex items-center justify-center text-xs text-secondary/60">
                      <FaLock className="mr-1 w-3 h-3" />
                      <span>Your payment is secured with 256-bit SSL encryption</span>
                    </div>
                    
                    {/* Additional info for specific statuses */}
                    {bookingDetails.status === 'in-progress' && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center text-primary">
                          <FaInfoCircle className="mr-2 flex-shrink-0 w-4 h-4" />
                          <p className="text-sm">
                            Service is currently in progress. You can complete payment now or pay cash after service completion.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {bookingDetails.status === 'completed' && bookingDetails.paymentStatus !== 'paid' && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center text-green-700">
                          <FaCheckCircle className="mr-2 flex-shrink-0 w-4 h-4" />
                          <p className="text-sm">
                            Service completed successfully! Please complete your payment to close this booking.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-primary/5 rounded-lg text-center border border-primary/10"
                  >
                    <div className="flex items-center justify-center mb-2">
                      {bookingDetails.status === 'cancelled' ? (
                        <FaExclamationTriangle className="text-red-500 mr-2 w-5 h-5" />
                      ) : bookingDetails.status === 'completed' ? (
                        <FaCheckCircle className="text-green-500 mr-2 w-5 h-5" />
                      ) : (
                        <FaInfoCircle className="text-primary mr-2 w-5 h-5" />
                      )}
                    </div>
                    <p className="text-secondary/70 mb-2">
                      {getBookingStatusInfo().description}
                    </p>
                    {bookingDetails.status === 'cancelled' && !canReactivateBooking() && (
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
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Price Summary Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-primary/10 sticky top-6 transition-all duration-300 hover:shadow-xl hover:border-primary/20"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-secondary mb-4 flex items-center">
                  <span className="bg-primary/10 text-primary p-2 rounded-lg mr-3">
                    <FaTag className="w-4 h-4" />
                  </span>
                  Price Summary
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                    <span className="text-secondary/70 font-medium">Service Price:</span>
                    <span className="font-semibold text-secondary">
                      ₹{(serviceInfo.price || bookingDetails.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>

                  {bookingDetails.services?.[0]?.quantity > 1 && (
                    <div className="flex justify-between text-sm p-3 bg-primary/5 rounded-lg">
                      <span className="text-secondary/60">
                        Quantity: {bookingDetails.services[0].quantity}
                      </span>
                      <span className="text-secondary/60">
                        ₹{((serviceInfo.price || bookingDetails.totalAmount || 0) / (bookingDetails.services[0].quantity || 1)).toFixed(2)} each
                      </span>
                    </div>
                  )}

                  {bookingDetails.couponApplied && bookingDetails.totalDiscount > 0 && (
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="flex items-center">
                        <FaTag className="w-3 h-3 mr-2 text-green-600" />
                        <span className="text-green-600 font-medium text-sm">Discount ({bookingDetails.couponApplied.code}):</span>
                      </div>
                      <span className="font-semibold text-green-600">-₹{(bookingDetails.totalDiscount || 0).toFixed(2)}</span>
                    </motion.div>
                  )}

                  <div className="border-t border-primary/20 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-secondary">Total Amount:</span>
                      <span className="text-xl font-bold text-primary">₹{(bookingDetails.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment Status */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="border-t border-primary/20 pt-3 mt-3 p-3 bg-primary/5 rounded-lg"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-secondary/70 font-medium text-sm">Payment Status:</span>
                      <span className={`font-semibold text-sm ${bookingDetails.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                        {bookingDetails.paymentMethod === 'online' && bookingDetails.paymentStatus === 'paid'
                          ? 'Paid Online'
                          : bookingDetails.paymentMethod === 'cash'
                            ? 'Pending (Pay on Service)'
                            : bookingDetails.paymentStatus === 'pending'
                              ? 'Pending'
                              : bookingDetails.paymentStatus}
                      </span>
                    </div>
                  </motion.div>

                  {/* Payment Security Info */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10"
                  >
                    <div className="flex items-center mb-2">
                      <div className="bg-primary/10 p-1 rounded text-primary mr-2">
                        <FaLock className="w-3 h-3" />
                      </div>
                      <span className="text-sm font-semibold text-secondary">Secure Payment</span>
                    </div>
                    <p className="text-xs text-secondary/70 leading-relaxed mb-3">
                      Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
                    </p>
                    <div className="flex items-center justify-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <FaShieldAlt className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-secondary/60 font-medium">SSL Secured</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FaCreditCard className="w-3 h-3 text-primary" />
                        <span className="text-xs text-secondary/60 font-medium">PCI DSS</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
