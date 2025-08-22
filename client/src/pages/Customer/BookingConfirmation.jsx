import React, { useEffect } from 'react';
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
  FaInfoCircle
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { FiChevronRight } from 'react-icons/fi';

const BookingConfirmation = () => {
  const { bookingId } = useParams();
  const { token, user, isAuthenticated, API, showToast } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  let paymentMethod = 'online';
  let bookingDetails = null;
  let serviceDetails = null;
  let razorpayLoaded = false;

  // Load Razorpay script
  useEffect(() => {
    const loadRazorpay = () => {
      if (window.Razorpay) {
        razorpayLoaded = true;
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        razorpayLoaded = true;
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
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
      const response = await axios.get(`${API}/services/${serviceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.data?.success) {
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

      // Set default payment method based on booking data
      if (booking.paymentMethod) {
        paymentMethod = booking.paymentMethod;
      }

      bookingDetails = booking;

      // Fetch service details if not in location state
      if (!location.state?.service) {
        const serviceId =
          booking.serviceId ||
          (booking.services && booking.services[0]?.serviceId) ||
          (booking.service && booking.service._id);

        if (serviceId) {
          const service = await fetchServiceDetails(serviceId);
          if (service) {
            serviceDetails = service;
          }
        }
      } else if (location.state?.service) {
        serviceDetails = location.state.service;
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      let errorMessage = 'Failed to load booking details';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 404) {
        errorMessage = 'Booking not found. It may have been cancelled or doesn\'t exist.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      showToast(errorMessage, 'error');

      if (error.response?.status !== 401) {
        setTimeout(() => navigate('/customer/bookings'), 2000);
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !token) {
      showToast('Please login to view booking details', 'error');
      navigate('/login');
      return;
    }

    if (!bookingId || bookingId === 'undefined' || bookingId === 'null') {
      console.error('Invalid booking ID:', bookingId);
      showToast('Invalid booking ID. Please try booking again.', 'error');
      navigate('/customer/services');
      return;
    }

    if (location.state?.booking) {
      bookingDetails = location.state.booking;
      serviceDetails = location.state.service;
    } else {
      fetchBookingDetails();
    }
  }, [bookingId, isAuthenticated, token]);

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
            await fetchBookingDetails();

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

  const serviceInfo = getServiceInfo();

  if (!bookingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center"
        >
          <div className="text-red-500 text-6xl mb-6">
            <FaExclamationTriangle />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Booking Not Found</h2>
          <p className="text-gray-600 mb-6">The booking details could not be loaded.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/customer/bookings')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg"
            >
              View All Bookings
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/customer/services')}
              className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all shadow-lg"
            >
              Book New Service
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <motion.button
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(-1)}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-6"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </motion.button>

          <div className="relative">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold text-gray-900 mb-2"
            >
              Complete Your Booking
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-600"
            >
              Review your booking details and complete payment
            </motion.p>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
            />
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Booking Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transform transition-all hover:shadow-2xl"
            >
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
                    <FiChevronRight className="w-5 h-5" />
                  </span>
                  Booking Summary
                </h2>

                {/* Service Details */}
                <div className="flex items-start mb-6 pb-6 border-b border-gray-200">
                  <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 shadow-inner flex items-center justify-center">
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
                      <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                        <FaTools className="w-8 h-8 text-blue-500" />
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {serviceInfo.title}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {serviceInfo.category}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {serviceInfo.duration && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Duration: {serviceInfo.duration} hours
                        </span>
                      )}
                      {bookingDetails?.services?.[0]?.quantity > 1 && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Quantity: {bookingDetails.services[0].quantity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="space-y-5">
                  <motion.div
                    whileHover={{ x: 5 }}
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="bg-blue-100 p-3 rounded-lg text-blue-600 mr-4">
                      <FaCalendarAlt className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date & Time</p>
                      <p className="font-medium">
                        {formatDate(bookingDetails.date)}
                        {bookingDetails.time && ` at ${bookingDetails.time}`}
                      </p>
                    </div>
                  </motion.div>

                  {bookingDetails.address && (
                    <motion.div
                      whileHover={{ x: 5 }}
                      className="flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="bg-blue-100 p-3 rounded-lg text-blue-600 mr-4">
                        <FaMapMarkerAlt className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Service Address</p>
                        <p className="font-medium">
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
                      whileHover={{ x: 5 }}
                      className="flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="bg-blue-100 p-3 rounded-lg text-blue-600 mr-4">
                        <FaClock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Special Instructions</p>
                        <p className="font-medium">{bookingDetails.notes}</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Booking Status */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Booking Status</p>
                      <p className={`text-sm font-semibold ${getBookingStatusInfo().color}`}>
                        {getBookingStatusInfo().message}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {getBookingStatusInfo().description}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <div className={`w-3 h-3 rounded-full ${
                        bookingDetails.status === 'pending' ? 'bg-amber-400 animate-pulse' :
                        bookingDetails.status === 'accepted' ? 'bg-blue-400 animate-pulse' :
                        bookingDetails.status === 'confirmed' ? 'bg-green-500 animate-pulse' :
                        bookingDetails.status === 'in-progress' ? 'bg-blue-500 animate-bounce' :
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
                      className="mt-4 pt-4 border-t border-blue-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700">Good News!</p>
                          <p className="text-xs text-green-600">This booking can be reactivated</p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={reactivateBooking}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Reactivate Booking
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>

          {/* Payment Status Section - Simplified */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
          >
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
                  <FiChevronRight className="w-5 h-5" />
                </span>
                Payment Information
              </h2>

              {/* Payment Status Display */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-3 rounded-lg text-blue-600 mr-4">
                      <FaCreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Payment Status</h3>
                      <p className={`text-sm font-medium ${bookingDetails.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                        {bookingDetails.paymentMethod === 'online' && bookingDetails.paymentStatus === 'paid'
                          ? 'Paid Online'
                          : bookingDetails.paymentMethod === 'cash'
                            ? 'Cash Payment (Pay on Service)'
                            : bookingDetails.paymentStatus === 'pending'
                              ? 'Payment Pending'
                              : bookingDetails.paymentStatus || 'Not Specified'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Payment Method: {bookingDetails.paymentMethod ? bookingDetails.paymentMethod.charAt(0).toUpperCase() + bookingDetails.paymentMethod.slice(1) : 'Not specified'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">₹{(bookingDetails.totalAmount || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Total Amount</p>
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
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center"
                    >
                      <FaCreditCard className="mr-2" />
                      Pay Online Now
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCashPayment}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center"
                    >
                      <FaMoneyBillWave className="mr-2" />
                      Confirm Cash Payment
                    </motion.button>
                  </div>

                  <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
                    <FaLock className="mr-1" />
                    <span>Your payment is secured with 256-bit SSL encryption</span>
                  </div>
                  
                  {/* Additional info for specific statuses */}
                  {bookingDetails.status === 'in-progress' && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center text-blue-700">
                        <FaInfoCircle className="mr-2 flex-shrink-0" />
                        <p className="text-sm">
                          Service is currently in progress. You can complete payment now or pay cash after service completion.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {bookingDetails.status === 'completed' && bookingDetails.paymentStatus !== 'paid' && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center text-green-700">
                        <FaCheckCircle className="mr-2 flex-shrink-0" />
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
                  className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl text-center border border-blue-100"
                >
                  <div className="flex items-center justify-center mb-2">
                    {bookingDetails.status === 'cancelled' ? (
                      <FaExclamationTriangle className="text-red-500 mr-2" />
                    ) : bookingDetails.status === 'completed' ? (
                      <FaCheckCircle className="text-green-500 mr-2" />
                    ) : (
                      <FaInfoCircle className="text-blue-500 mr-2" />
                    )}
                  </div>
                  <p className="text-gray-600 mb-2">
                    {getBookingStatusInfo().description}
                  </p>
                  {bookingDetails.status === 'cancelled' && !canReactivateBooking() && (
                    <p className="text-sm text-gray-500">
                      {bookingDetails.paymentStatus === 'paid' 
                        ? 'A refund will be processed if applicable.' 
                        : 'You can book a new service from our services page.'}
                    </p>
                  )}
                  {bookingDetails.status === 'completed' && (
                    <p className="text-sm text-gray-500">
                      Thank you for using our service! You can leave feedback if you haven't already.
                    </p>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
          </div>

          {/* Price Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 sticky top-6"
            >
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
                    <FiChevronRight className="w-5 h-5" />
                  </span>
                  Price Summary
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Service Price:</span>
                    <span className="font-medium">
                      ₹{(serviceInfo.price || bookingDetails.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>

                  {bookingDetails.services?.[0]?.quantity > 1 && (
                    <div className="flex justify-between text-sm p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-500">
                        Quantity: {bookingDetails.services[0].quantity}
                      </span>
                      <span className="text-gray-500">
                        ₹{((serviceInfo.price || bookingDetails.totalAmount || 0) / (bookingDetails.services[0].quantity || 1)).toFixed(2)} each
                      </span>
                    </div>
                  )}

                  {bookingDetails.couponApplied && bookingDetails.totalDiscount > 0 && (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100"
                    >
                      <div className="flex items-center">
                        <FaTag className="w-4 h-4 mr-2 text-green-600" />
                        <span className="text-green-600">Discount ({bookingDetails.couponApplied.code}):</span>
                      </div>
                      <span className="font-medium text-green-600">-₹{(bookingDetails.totalDiscount || 0).toFixed(2)}</span>
                    </motion.div>
                  )}

                  <div className="border-t border-gray-200 pt-4 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total Amount:</span>
                      <span className="text-2xl font-bold text-blue-600">₹{(bookingDetails.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment Status */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="border-t border-gray-200 pt-4 mt-4 p-3 bg-blue-50 rounded-lg"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Payment Status:</span>
                      <span className={`font-medium ${bookingDetails.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'
                        }`}>
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
                    className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
                  >
                    <div className="flex items-center mb-3">
                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mr-3">
                        <FaLock className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Secure Payment</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
                    </p>
                    <div className="flex items-center mt-3 space-x-2">
                      <div className="bg-white p-1 rounded shadow-xs">
                        <FaShieldAlt className="w-4 h-4 text-green-500" />
                      </div>
                      <span className="text-xs text-gray-500">SSL Secured</span>
                      <div className="bg-white p-1 rounded shadow-xs">
                        <FaCreditCard className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-xs text-gray-500">PCI DSS Compliant</span>
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