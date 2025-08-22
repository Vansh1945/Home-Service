import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/auth';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Filter,
  Search,
  Download,
  ChevronRight,
  ChevronDown,
  Truck,
  Info,
  CreditCard,
  Shield,
  HelpCircle,
  MessageSquare,
  Star,
  MoreVertical,
  RefreshCw,
  FileText,
  Timer,
  Package,
  MapPin as LocationIcon,
  Edit,
  RotateCw,
  Check,
  X,
  ShoppingCart,
  Navigation,
  Map,
  Wrench,
  Smile,
  Frown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomerBookingsPage = () => {
  const { token, API, showToast, user } = useAuth();
  const navigate = useNavigate();
  
  // State variables
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    date: '',
    time: '',
  });
  const [feedbackForm, setFeedbackForm] = useState({
    providerRating: 0,
    providerComment: '',
    serviceRating: 0,
    serviceComment: '',
  });
  const [providerLocation, setProviderLocation] = useState(null);
  const [trackingInterval, setTrackingInterval] = useState(null);
  
  // Modal state variables
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    fetchBookings();
    return () => {
      if (trackingInterval) clearInterval(trackingInterval);
    };
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch(`${API}/booking/customer`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.statusText}`);
      }

      const data = await response.json();

      // Process bookings and fetch additional details
      const processedBookings = await Promise.all(
        data.data.map(async (booking) => {
          const processedBooking = {
            ...booking,
            status: booking.status || 'pending',
          };

          // Fetch provider details only if provider exists and status is accepted or later
          if (booking.provider && ['accepted', 'in_progress', 'completed'].includes(booking.status)) {
            try {
              // Get the provider ID - handle both string and object cases
              const providerId = typeof booking.provider === 'object' ? booking.provider._id || booking.provider.id : booking.provider;
              
              if (providerId) {
                const providerResponse = await fetch(`${API}/booking/providers/${providerId}`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                });

                if (providerResponse.ok) {
                  const providerData = await providerResponse.json();
                  processedBooking.providerDetails = providerData.data;
                }
              }
            } catch (providerError) {
              console.error('Error fetching provider details:', providerError);
            }
          }

          // Fetch service details for each service in the booking
          if (booking.services && booking.services.length > 0) {
            try {
              const servicesWithDetails = await Promise.all(
                booking.services.map(async (serviceItem) => {
                  try {
                    // Get the service ID whether it's an object or string
                    const serviceId = serviceItem.service?._id || serviceItem.service;
                    if (!serviceId) return serviceItem;

                    const serviceResponse = await fetch(`${API}/service/services/${serviceId}`, {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    });

                    if (serviceResponse.ok) {
                      const serviceData = await serviceResponse.json();
                      return {
                        ...serviceItem,
                        serviceDetails: serviceData.data
                      };
                    }
                    return serviceItem;
                  } catch (serviceError) {
                    console.error('Error fetching service details:', serviceError);
                    return serviceItem;
                  }
                })
              );
              processedBooking.services = servicesWithDetails;
            } catch (servicesError) {
              console.error('Error processing services:', servicesError);
            }
          }

          return processedBooking;
        })
      );

      setBookings(processedBookings);
    } catch (error) {
      console.error('Fetch bookings error:', error.message);
      showToast(`Error fetching bookings: ${error.message}`, 'error');
      setBookings([]);
    }
  };

  const fetchBookingDetails = async (bookingId) => {
    try {
      const response = await fetch(`${API}/booking/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch booking details: ${response.statusText}`);
      }

      const data = await response.json();
      setSelectedBooking({
        ...data.data,
        status: data.data.provider ? data.data.status : 'pending',
      });
      setShowModal(true);
    } catch (error) {
      console.error('Fetch booking details error:', error.message);
      showToast(`Error fetching booking details: ${error.message}`, 'error');
    }
  };

  const initiatePayment = async (booking) => {
    try {
      // First, ensure Razorpay script is loaded
      if (!window.Razorpay) {
        await loadRazorpayScript();
      }

      const response = await fetch(`${API}/transaction/create-order`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking._id,
          amount: booking.totalAmount,
          currency: 'INR'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment initialization failed');
      }

      const data = await response.json();

      // Check if the response contains the expected data
      if (!data || !data.data || !data.data.order) {
        throw new Error('Invalid payment response from server');
      }

      const order = data.data.order;

      // Verify the amount is in paise (Razorpay expects amount in smallest currency unit)
      const amountInPaise = Math.round(order.amount * 100);

      // Open Razorpay payment modal
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: order.currency || 'INR',
        name: "Service Booking",
        description: `Payment for Booking #${booking._id.slice(-8).toUpperCase()}`,
        image: '/logo.png',
        order_id: order.id,
        handler: async function (response) {
          // Verify payment on the server
          await verifyPayment(booking._id, response);
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone
        },
        theme: {
          color: "#3399cc"
        },
        modal: {
          ondismiss: function () {
            showToast('Payment window closed', 'info');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment error:', error.message);
      showToast(`Payment error: ${error.message}`, 'error');
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        console.log('Razorpay script loaded');
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        resolve();
      };
      document.body.appendChild(script);
    });
  };

  const verifyPayment = async (bookingId, razorpayResponse) => {
    try {
      const response = await fetch(`${API}/transaction/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_signature: razorpayResponse.razorpay_signature
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment verification failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Payment verification failed');
      }

      showToast('Payment successful!', 'success');
      fetchBookings();
    } catch (error) {
      console.error('Payment verification error:', error.message);
      showToast(`Payment verification failed: ${error.message}`, 'error');
    }
  };

  const submitFeedback = async () => {
    try {
      const response = await fetch(`${API}/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: selectedBooking._id,
          providerRating: feedbackForm.providerRating,
          providerComment: feedbackForm.providerComment,
          serviceRating: feedbackForm.serviceRating,
          serviceComment: feedbackForm.serviceComment,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit feedback');
      }

      showToast('Feedback submitted successfully', 'success');
      setFeedbackForm({
        providerRating: 0,
        providerComment: '',
        serviceRating: 0,
        serviceComment: '',
      });
      fetchBookings();
    } catch (error) {
      console.error('Feedback submission error:', error.message);
      showToast(`Error submitting feedback: ${error.message}`, 'error');
    }
  };

  const handleRescheduleBooking = async () => {
    if (!rescheduleForm.date || !rescheduleForm.time) {
      showToast('Please select both date and time', 'warning');
      return;
    }

    try {
      const response = await fetch(`${API}/booking/user/${selectedBooking._id}/reschedule`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: rescheduleForm.date,
          time: rescheduleForm.time,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reschedule booking');
      }

      showToast('Booking rescheduled successfully', 'success');
      fetchBookings();
    } catch (error) {
      console.error('Reschedule error:', error.message);
      showToast(`Error rescheduling booking: ${error.message}`, 'error');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const response = await fetch(`${API}/booking/user/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Customer requested cancellation'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel booking');
      }

      showToast('Booking cancelled successfully', 'success');
      fetchBookings();
    } catch (error) {
      console.error('Cancel booking error:', error.message);
      showToast(`Error cancelling booking: ${error.message}`, 'error');
    }
  };

  const reorderService = (serviceId) => {
    navigate(`/services/${serviceId}`);
  };

  const trackProviderLocation = async (bookingId) => {
    try {
      // Start tracking provider location
      const response = await fetch(`${API}/booking/${bookingId}/track`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch provider location');
      }

      const data = await response.json();
      setProviderLocation(data.location);

      // Set up polling for location updates
      const interval = setInterval(async () => {
        const updateResponse = await fetch(`${API}/booking/${bookingId}/track`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (updateResponse.ok) {
          const updateData = await updateResponse.json();
          setProviderLocation(updateData.location);
        }
      }, 30000); // Update every 30 seconds

      setTrackingInterval(interval);
    } catch (error) {
      console.error('Tracking error:', error);
      showToast('Could not track provider location', 'error');
    }
  };

  const stopTracking = () => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
  };

  const callProvider = (phoneNumber) => {
    if (!phoneNumber) {
      showToast('Provider phone number not available', 'warning');
      return;
    }
    window.location.href = `tel:${phoneNumber}`;
  };

  const chatWithProvider = (providerId) => {
    navigate(`/messages?provider=${providerId}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 border-amber-200 shadow-amber-100';
      case 'accepted':
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border-blue-200 shadow-blue-100';
      case 'in-progress':
        return 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-800 border-purple-200 shadow-purple-100';
      case 'completed':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200 shadow-green-100';
      case 'cancelled':
        return 'bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border-red-200 shadow-red-100';
      case 'payment_pending':
        return 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-800 border-orange-200 shadow-orange-100';
      default:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-800 border-gray-200 shadow-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Timer className="w-4 h-4 animate-pulse" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'in-progress':
        return <RotateCw className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'payment_pending':
        return <CreditCard className="w-4 h-4 animate-bounce" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Finding Provider';
      case 'accepted':
        return 'Confirmed';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'payment_pending':
        return 'Payment Due';
      default:
        return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'online':
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'cash':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'online':
        return 'Online Payment';
      case 'cash':
        return 'Cash Payment';
      default:
        return 'Not Specified';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'text-green-600';
      case 'pending':
        return 'text-orange-600';
      case 'failed':
        return 'text-red-600';
      case 'refunded':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not specified';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'To be confirmed';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not specified';
    return new Date(dateStr).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleBookingExpand = (bookingId) => {
    setExpandedBooking(expandedBooking === bookingId ? null : bookingId);
  };

  const showPaymentOptions = (booking) => {
    setSelectedPaymentBooking(booking);
    setShowPaymentModal(true);
  };

  const showFeedbackForm = (booking) => {
    setSelectedBooking(booking);
    setShowFeedbackModal(true);
  };

  const showRescheduleForm = (booking) => {
    setSelectedBooking(booking);
    setRescheduleForm({
      date: booking.date.split('T')[0],
      time: booking.time || '',
    });
    setShowRescheduleModal(true);
  };

  const canCancelBooking = (booking) => {
    return ['pending', 'accepted'].includes(booking.status);
  };

  const canRescheduleBooking = (booking) => {
    return booking.status === 'pending' && !booking.provider && booking.status !== 'cancelled';
  };

  const needsPayment = (booking) => {
    return (
      booking.paymentStatus === 'pending' &&
      (booking.paymentMethod === 'cash' || booking.paymentMethod === 'online') &&
      !booking.confirmBooking
    );
  };

  const canGiveFeedback = (booking) => {
    return booking.status === 'completed' && !booking.feedback;
  };

  const isActiveBooking = (booking) => {
    return ['pending', 'accepted', 'in_progress', 'payment_pending'].includes(booking.status);
  };

  const getFilteredBookings = () => {
    return bookings
      .filter((booking) => {
        if (statusFilter === 'active' && !isActiveBooking(booking)) return false;
        if (statusFilter === 'past' && isActiveBooking(booking)) return false;
        if (statusFilter !== 'active' && statusFilter !== 'past' && statusFilter !== 'all' && booking.status !== statusFilter) return false;
        if (searchTerm && !booking.services?.[0]?.serviceDetails?.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
        } else if (sortBy === 'status') {
          return a.status.localeCompare(b.status);
        }
        return 0;
      });
  };

  const filteredBookings = getFilteredBookings();

  const BookingTimeline = ({ booking }) => {
    // Handle cancellation progress
    if (booking.status === 'cancelled' && booking.cancellationProgress) {
      const cancellationSteps = [
        {
          key: 'cancelled',
          label: 'Booking Cancelled',
          icon: XCircle,
          completed: true,
          description: booking.cancellationProgress.reason || 'Booking was cancelled',
          time: booking.cancellationProgress.cancelledAt,
        },
        {
          key: 'processing_refund',
          label: 'Processing Refund',
          icon: RefreshCw,
          completed: ['processing_refund', 'refund_completed'].includes(booking.cancellationProgress.status),
          active: booking.cancellationProgress.status === 'processing_refund',
          description: booking.cancellationProgress.status === 'processing_refund' 
            ? 'Your refund is being processed' 
            : booking.cancellationProgress.status === 'refund_completed'
              ? 'Refund has been processed'
              : 'Refund will be processed if applicable',
          time: booking.cancellationProgress.refundInitiatedAt,
        },
        {
          key: 'refund_completed',
          label: 'Refund Completed',
          icon: CheckCircle,
          completed: booking.cancellationProgress.status === 'refund_completed',
          description: booking.cancellationProgress.status === 'refund_completed'
            ? `₹${booking.cancellationProgress.refundAmount} refunded successfully`
            : 'Refund completion pending',
          time: booking.cancellationProgress.refundCompletedAt,
        },
      ];

      return (
        <div className="relative bg-gradient-to-r from-red-50 to-rose-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center mb-4">
            <XCircle className="w-5 h-5 text-red-600 mr-2" />
            <h4 className="font-semibold text-red-800">Cancellation Progress</h4>
          </div>
          
          <div className="space-y-4">
            {cancellationSteps.map((step, index) => (
              <div key={step.key} className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  step.completed 
                    ? 'bg-red-500 text-white' 
                    : step.active 
                      ? 'bg-red-100 text-red-600 animate-pulse' 
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  <step.icon className={`w-4 h-4 ${step.active ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className={`text-sm font-medium ${
                    step.completed ? 'text-red-700' : step.active ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </h5>
                  <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                  {step.time && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateTime(step.time)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Regular booking progress
    const steps = [
      {
        key: 'booked',
        label: 'Order Placed',
        icon: ShoppingCart,
        active: true,
        completed: true,
        description: 'Your booking has been confirmed',
        time: booking.createdAt,
        color: 'green'
      },
      {
        key: 'payment',
        label: 'Payment',
        icon: booking.paymentMethod === 'cash' ? DollarSign : CreditCard,
        active: booking.paymentStatus !== 'pending',
        completed: booking.paymentStatus === 'paid',
        description: booking.paymentStatus === 'paid' 
          ? `Payment completed via ${getPaymentMethodText(booking.paymentMethod)}`
          : booking.paymentMethod === 'cash'
            ? 'Payment on service completion'
            : 'Payment pending',
        time: booking.paymentStatus === 'paid' ? booking.updatedAt : null,
        color: booking.paymentStatus === 'paid' ? 'green' : 'blue'
      },
      {
        key: 'assigned',
        label: 'Provider Assigned',
        icon: User,
        active: booking.status !== 'pending',
        completed: booking.status !== 'pending',
        description: booking.status !== 'pending' 
          ? `${booking.providerDetails?.name || 'Provider'} assigned to your booking`
          : 'Finding the best provider for your service',
        time: booking.status !== 'pending' ? booking.updatedAt : null,
        color: booking.status !== 'pending' ? 'green' : 'amber'
      },
      {
        key: 'on_the_way',
        label: 'Provider En Route',
        icon: Navigation,
        active: ['in-progress', 'completed'].includes(booking.status),
        completed: ['in-progress', 'completed'].includes(booking.status),
        description: ['in-progress', 'completed'].includes(booking.status)
          ? 'Provider is on the way to your location'
          : booking.status === 'accepted'
            ? 'Provider will be on the way soon'
            : 'Waiting for provider assignment',
        time: booking.status === 'in-progress' ? booking.serviceStartedAt : null,
        color: ['in-progress', 'completed'].includes(booking.status) ? 'green' : 'gray'
      },
      {
        key: 'service_started',
        label: 'Service Started',
        icon: Wrench,
        active: booking.status === 'completed',
        completed: booking.status === 'completed',
        description: booking.status === 'completed'
          ? 'Service has been started'
          : 'Service will begin when provider arrives',
        time: booking.serviceStartedAt,
        color: booking.status === 'completed' ? 'green' : 'gray'
      },
      {
        key: 'completed',
        label: 'Service Completed',
        icon: Smile,
        active: booking.status === 'completed',
        completed: booking.status === 'completed',
        description: booking.status === 'completed'
          ? 'Service has been successfully completed'
          : 'Service completion pending',
        time: booking.serviceCompletedAt || (booking.status === 'completed' ? booking.updatedAt : null),
        color: booking.status === 'completed' ? 'green' : 'gray'
      },
    ];

    const getStepColor = (step) => {
      if (step.completed) {
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg';
      } else if (step.active) {
        return step.color === 'amber' 
          ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border-2 border-amber-300 animate-pulse'
          : 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-2 border-blue-300';
      } else {
        return 'bg-gray-100 text-gray-400 border border-gray-200';
      }
    };

    const getConnectorColor = (index, steps) => {
      if (index === steps.length - 1) return '';
      const currentStep = steps[index];
      const nextStep = steps[index + 1];
      
      if (currentStep.completed && nextStep.completed) {
        return 'bg-gradient-to-b from-green-500 to-emerald-500';
      } else if (currentStep.completed && nextStep.active) {
        return 'bg-gradient-to-b from-green-500 to-blue-300';
      } else if (currentStep.completed) {
        return 'bg-gradient-to-b from-green-500 to-gray-200';
      } else {
        return 'bg-gray-200';
      }
    };

    return (
      <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center mb-6">
          <Package className="w-5 h-5 text-blue-600 mr-2" />
          <h4 className="font-semibold text-blue-800">Order Progress</h4>
          <div className="ml-auto">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {steps.filter(s => s.completed).length}/{steps.length} Complete
            </span>
          </div>
        </div>

        <div className="relative">
          {/* Progress Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.key} className="relative flex items-start space-x-4">
                {/* Step Icon */}
                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${getStepColor(step)}`}>
                  <step.icon className={`w-5 h-5 ${step.active && !step.completed ? 'animate-pulse' : ''}`} />
                </div>

                {/* Connector */}
                {index < steps.length - 1 && (
                  <div 
                    className={`absolute left-6 top-12 w-0.5 h-6 transition-all duration-500 ${getConnectorColor(index, steps)}`}
                  />
                )}

                {/* Step Content */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-center justify-between">
                    <h5 className={`text-sm font-semibold ${
                      step.completed ? 'text-green-700' : step.active ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </h5>
                    {step.time && (
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">
                        {formatDateTime(step.time)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{step.description}</p>
                  
                  {/* Action Buttons */}
                  {step.key === 'assigned' && booking.status !== 'pending' && booking.status !== 'cancelled' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => callProvider(booking.providerDetails?.phone || booking.provider?.phone)}
                        className="flex items-center gap-1 text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm"
                      >
                        <Phone className="w-3 h-3" />
                        Call Provider
                      </button>
                      <button
                        onClick={() => chatWithProvider(booking.provider)}
                        className="flex items-center gap-1 text-xs bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1.5 rounded-full hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Chat
                      </button>
                    </div>
                  )}
                  
                  {step.key === 'on_the_way' && ['in-progress', 'completed'].includes(booking.status) && (
                    <button
                      onClick={() => trackProviderLocation(booking._id)}
                      className="flex items-center gap-1 text-xs bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1.5 rounded-full hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-sm mt-3"
                    >
                      <Map className="w-3 h-3" />
                      Track Live Location
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const BookingCard = ({ booking }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden mb-6 hover:border-blue-200">
      {/* Booking Header */}
      <div className="relative">
        {/* Status Banner */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          booking.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
          booking.status === 'cancelled' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
          booking.status === 'in-progress' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
          booking.status === 'accepted' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
          'bg-gradient-to-r from-amber-500 to-yellow-500'
        }`}></div>
        
        <div className="p-6 pt-8">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-4 flex-1">
              {/* Service Image/Icon */}
              <div className="flex-shrink-0">
                {booking.services?.[0]?.serviceDetails?.image ? (
                  <img
                    src={booking.services[0].serviceDetails.image}
                    alt={booking.services[0]?.serviceDetails?.title || 'Service'}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-gray-100"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center border-2 border-blue-100"
                  style={booking.services?.[0]?.serviceDetails?.image ? { display: 'none' } : {}}
                >
                  <Wrench className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {/* Service Title */}
                <h3 className="font-semibold text-lg text-gray-900 mb-1 truncate">
                  {booking.services?.[0]?.serviceDetails?.title || 'Service Booking'}
                </h3>
                
                {/* Booking ID */}
                <p className="text-sm text-gray-500 mb-2">
                  Order #{booking?._id?.slice(-8).toUpperCase()}
                </p>
                
                {/* Date & Time */}
                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(booking.date)}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(booking.time)}</span>
                  </div>
                </div>

                {/* Status & Payment Badges */}
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  <span className={`inline-flex items-center space-x-1 text-xs font-medium px-3 py-1.5 rounded-full border ${getStatusColor(booking.status)}`}>
                    {getStatusIcon(booking.status)}
                    <span>{getStatusText(booking.status)}</span>
                  </span>
                  
                  {/* Payment Method Badge */}
                  <span className="inline-flex items-center space-x-1 text-xs font-medium px-3 py-1.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                    {getPaymentMethodIcon(booking.paymentMethod)}
                    <span>{getPaymentMethodText(booking.paymentMethod)}</span>
                  </span>
                  
                  {needsPayment(booking) && (
                    <span className="inline-flex items-center space-x-1 text-xs font-medium px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border border-orange-200 animate-pulse">
                      <AlertCircle className="w-3 h-3" />
                      <span>Payment Due</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Price & Expand Button */}
            <div className="flex items-start space-x-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  ₹{booking.totalAmount || 0}
                </p>
                <p className={`text-sm font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
                  {booking.paymentStatus === 'paid'
                    ? '✓ Paid'
                    : booking.paymentStatus === 'pending'
                      ? 'Payment Pending'
                      : booking.paymentStatus || 'Not Specified'}
                </p>
              </div>
              <button
                onClick={() => toggleBookingExpand(booking._id)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors group"
              >
                {expandedBooking === booking._id ? 
                  <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" /> : 
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expandedBooking === booking._id && (
        <div className="border-t border-gray-100 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="p-6 space-y-6">
            {/* Service Details - Enhanced */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 text-blue-600 mr-2" />
                Service Details
              </h4>
              
              <div className="space-y-4">
                {/* Service Description */}
                {booking.services?.[0]?.serviceDetails?.description && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {booking.services[0].serviceDetails.description}
                    </p>
                  </div>
                )}
                
                {/* Service Category */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Category:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {booking.services?.[0]?.serviceDetails?.category || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pricing Breakdown - Enhanced */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                Pricing Details
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Service Price</span>
                  <span className="text-sm font-medium">₹{booking.subtotal || 0}</span>
                </div>
                
                {booking.totalDiscount > 0 && (
                  <div className="flex items-center justify-between py-2 bg-green-50 px-3 rounded-lg">
                    <span className="text-sm text-green-700 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Discount Applied
                    </span>
                    <span className="text-sm font-medium text-green-600">-₹{booking.totalDiscount}</span>
                  </div>
                )}
                
                {booking.services?.[0]?.serviceDetails?.basePrice && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Base Price</span>
                    <span className="text-sm font-medium">₹{booking.services[0].serviceDetails.basePrice}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-gray-900">Total Amount</span>
                    <span className="text-xl font-bold text-green-600">
                      ₹{booking.totalAmount || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Timeline */}
            <div>
              <BookingTimeline booking={booking} />
            </div>

            {/* Booking Information */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Info className="w-5 h-5 text-blue-600 mr-2" />
                Booking Information
              </h4>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500">Booked On</p>
                  <p className="text-sm font-medium">{formatDateTime(booking.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Payment Method</p>
                  <p className="text-sm font-medium capitalize">{booking.paymentMethod || 'Not specified'}</p>
                </div>
              </div>

              {/* Provider Information for Accepted Bookings */}
              {booking.status === 'accepted' && (
                <div className="border-t pt-3 mt-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2 text-green-600" />
                    Service Provider Details
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Provider Name</p>
                      <p className="text-sm font-medium">{booking.providerDetails?.name || booking.provider?.name || 'Not assigned yet'}</p>
                    </div>
                    
                    {(booking.providerDetails?.phone || booking.provider?.phone) && (
                      <div>
                        <p className="text-xs text-gray-500">Contact Number</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{booking.providerDetails?.phone || booking.provider?.phone}</p>
                          <button
                            onClick={() => callProvider(booking.providerDetails?.phone || booking.provider?.phone)}
                            className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                            title="Call Provider"
                          >
                            <Phone className="w-3 h-3" />
                            Call
                          </button>
                        </div>
                      </div>
                    )}

                    {(booking.providerDetails?.email || booking.provider?.email) && (
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium">{booking.providerDetails?.email || booking.provider?.email}</p>
                      </div>
                    )}

                    {/* Provider Average Rating with Stars */}
                    {(booking.providerDetails?.rating || booking.provider?.rating) && (
                      <div>
                        <p className="text-xs text-gray-500">Provider Rating</p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= Math.round(booking.providerDetails?.rating || booking.provider?.rating || 0)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">
                            {(booking.providerDetails?.rating || booking.provider?.rating || 0).toFixed(1)}/5
                          </span>
                          {booking.providerDetails?.totalReviews && (
                            <span className="text-xs text-gray-500">
                              ({booking.providerDetails.totalReviews} reviews)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Information for Other States */}
              {booking.status === 'pending' && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-medium text-amber-600">Waiting for provider assignment</p>
                </div>
              )}

              {booking.status === 'cancelled' && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-medium text-red-600">Booking cancelled</p>
                </div>
              )}

              {!['pending', 'cancelled', 'accepted'].includes(booking.status) && (booking.providerDetails?.name || booking.provider?.name) && (
                <div className="border-t pt-3 mt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Service Provider</p>
                      <p className="text-sm font-medium">{booking.providerDetails?.name || booking.provider?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Provider Contact</p>
                      <p className="text-sm font-medium">{booking.providerDetails?.phone || booking.provider?.phone || 'Not available'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MoreVertical className="w-5 h-5 text-blue-600 mr-2" />
                Quick Actions
              </h4>
              
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => fetchBookingDetails(booking._id)}
                    className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>

                  {canRescheduleBooking(booking) && (
                    <button
                      onClick={() => showRescheduleForm(booking)}
                      className="flex items-center space-x-1 text-sm font-medium text-purple-600 hover:text-purple-800 px-3 py-2 rounded-lg hover:bg-purple-50 transition-colors border border-purple-200"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Reschedule</span>
                    </button>
                  )}

                  {/* Call Provider Button - Show prominently when provider is assigned */}
                  {booking.status !== 'pending' && booking.status !== 'cancelled' && (booking.providerDetails?.phone || booking.provider?.phone) && (
                    <button
                      onClick={() => callProvider(booking.providerDetails?.phone || booking.provider?.phone)}
                      className="flex items-center space-x-1 text-sm font-medium text-green-600 hover:text-green-800 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors border border-green-200"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Call Provider</span>
                    </button>
                  )}

                  {canGiveFeedback(booking) && (
                    <button
                      onClick={() => showFeedbackForm(booking)}
                      className="flex items-center space-x-1 text-sm font-medium text-yellow-600 hover:text-yellow-800 px-3 py-2 rounded-lg hover:bg-yellow-50 transition-colors border border-yellow-200"
                    >
                      <Star className="w-4 h-4" />
                      <span>Rate Service</span>
                    </button>
                  )}


                  {needsPayment(booking) && !booking.confirmBooking && (
                    <button
                      onClick={() => showPaymentOptions(booking)}
                      className="flex items-center space-x-1 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm animate-pulse"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay Now</span>
                    </button>
                  )}

                  {booking.status === 'completed' && (
                    <button
                      onClick={() => reorderService(booking.services[0].serviceDetails._id)}
                      className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Book Again</span>
                    </button>
                  )}
                </div>

                {canCancelBooking(booking) && (
                  <button
                    onClick={() => handleCancelBooking(booking._id)}
                    className="text-sm font-medium text-red-600 hover:text-red-800 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors border border-red-200"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const PaymentModal = ({ booking, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Complete Payment</h3>
              <p className="text-sm text-gray-500">Booking ID: #{booking._id.slice(-8).toUpperCase()}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
              ×
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">{booking.services?.[0]?.serviceDetails?.title || 'Unknown Service'}</h4>
              <div className="flex justify-between text-sm">
                <span>Service Amount:</span>
                <span>₹{booking.subtotal || 0}</span>
              </div>
              {booking.totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span className="text-green-600">-₹{booking.totalDiscount}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-2">
                <span>Total to Pay:</span>
                <span className="text-green-600">₹{booking.totalAmount || 0}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => initiatePayment(booking)}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                <span>Pay Online</span>
              </button>

              <p className="text-center text-xs text-gray-500">Secure payment powered by Razorpay</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const FeedbackModal = ({ booking, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Rate Your Experience</h3>
              <p className="text-sm text-gray-500">Service: {booking.services?.[0]?.serviceDetails?.title || 'Unknown Service'}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
              ×
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Rate the Service Provider</h4>
              <div className="flex items-center space-x-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={`provider-${star}`}
                    onClick={() => setFeedbackForm(prev => ({ ...prev, providerRating: star }))}
                    className={`text-2xl ${star <= feedbackForm.providerRating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Your comments about the provider (optional)"
                value={feedbackForm.providerComment}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, providerComment: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                rows="2"
              />
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Rate the Service</h4>
              <div className="flex items-center space-x-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={`service-${star}`}
                    onClick={() => setFeedbackForm(prev => ({ ...prev, serviceRating: star }))}
                    className={`text-2xl ${star <= feedbackForm.serviceRating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Your comments about the service (optional)"
                value={feedbackForm.serviceComment}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, serviceComment: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                rows="2"
              />
            </div>

            <button
              onClick={submitFeedback}
              disabled={!feedbackForm.providerRating || !feedbackForm.serviceRating}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Submit Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const RescheduleModal = ({ booking, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Reschedule Booking</h3>
              <p className="text-sm text-gray-500">ID: #{booking._id.slice(-8).toUpperCase()}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
              <input
                type="date"
                value={rescheduleForm.date}
                onChange={(e) => setRescheduleForm(prev => ({ ...prev, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Time</label>
              <input
                type="time"
                value={rescheduleForm.time}
                onChange={(e) => setRescheduleForm(prev => ({ ...prev, time: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleRescheduleBooking}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const MapTrackingModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Provider Location</h3>
              <p className="text-sm text-gray-500">Tracking provider in real-time</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
              ×
            </button>
          </div>

          <div className="bg-gray-100 rounded-lg h-64 mb-4 flex items-center justify-center">
            {providerLocation ? (
              <div className="text-center">
                <Map className="w-16 h-16 mx-auto text-blue-500 mb-2" />
                <p className="font-medium">Provider is on the way</p>
                <p className="text-sm text-gray-600 mt-1">
                  Estimated arrival: 15-20 mins
                </p>
              </div>
            ) : (
              <div className="text-center">
                <Navigation className="w-16 h-16 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Location data not available</p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => callProvider(selectedBooking?.providerDetails?.phone || selectedBooking?.provider?.phone)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Call Provider</span>
            </button>
            <button
              onClick={stopTracking}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Stop Tracking
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const BookingModal = ({ booking, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Booking Details</h2>
              <p className="text-sm text-gray-500">ID: #{booking._id.slice(-8).toUpperCase()}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Booking Timeline */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-500" />
              Booking Progress
            </h3>
            <BookingTimeline booking={booking} />
          </div>

          {/* Service Details */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-blue-500" />
              Service Details
            </h3>
            <div className="flex mb-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                {booking.services?.[0]?.serviceDetails?.image ? (
                  <img
                    src={booking.services[0].serviceDetails.image}
                    alt={booking.services[0]?.serviceDetails?.title || 'Service'}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Package className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">{booking.services?.[0]?.serviceDetails?.title || 'Unknown Service'}</h4>
                <p className="text-sm text-gray-500 capitalize mb-2">{booking.services?.[0]?.serviceDetails?.category || 'N/A'}</p>
                <p className="text-sm text-gray-600">{booking.services?.[0]?.serviceDetails?.description || 'No description available'}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Service Price</p>
                  <p className="text-sm font-medium">₹{booking.subtotal || 0}</p>
                </div>
                {booking.totalDiscount > 0 && (
                  <div>
                    <p className="text-xs text-gray-500">Discount Applied</p>
                    <p className="text-sm font-medium text-green-600">-₹{booking.totalDiscount}</p>
                  </div>
                )}
                <div className="col-span-2 border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Final Amount</span>
                    <span className="text-lg font-semibold text-green-600">
                      ₹{booking.totalAmount || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Information */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-500" />
              Booking Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Booking Date</p>
                <p className="text-sm font-medium">{formatDate(booking.date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Service Time</p>
                <p className="text-sm font-medium">{formatTime(booking.time)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Booked On</p>
                <p className="text-sm font-medium">{formatDateTime(booking.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(booking.status)}`}>
                  {getStatusText(booking.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Provider Information - Show limited info for pending bookings */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-500" />
              Service Provider
            </h3>
            {booking.status === 'pending' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Timer className="w-8 h-8 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-amber-800 mb-2">Provider Assignment Pending</p>
                <p className="text-xs text-gray-600">We're finding the best provider for your service. You'll receive provider details once your booking is accepted.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Provider Name</p>
                  <p className="text-sm font-medium">{booking.providerDetails?.name || booking.provider?.name || 'Not assigned yet'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Contact Number</p>
                  <p className="text-sm font-medium">{booking.providerDetails?.phone || booking.provider?.phone || 'Not available'}</p>
                </div>
                {(booking.providerDetails?.rating || booking.provider?.rating) && (
                  <div>
                    <p className="text-xs text-gray-500">Provider Rating</p>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="text-sm font-medium">{booking.providerDetails?.rating || booking.provider?.rating}/5</span>
                    </div>
                  </div>
                )}
                {booking.providerDetails?.businessName && (
                  <div>
                    <p className="text-xs text-gray-500">Business Name</p>
                    <p className="text-sm font-medium">{booking.providerDetails.businessName}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Service Address */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <LocationIcon className="w-5 h-5 mr-2 text-blue-500" />
              Service Address
            </h3>
            <div className="text-sm space-y-1">
              <p className="font-medium">{booking.address?.street || 'Address not provided'}</p>
              <p className="text-gray-600">
                {booking.address?.city && booking.address?.state
                  ? `${booking.address.city}, ${booking.address.state}`
                  : 'N/A'}
              </p>
              <p className="text-gray-600">
                {booking.address?.postalCode && booking.address?.country
                  ? `${booking.address.postalCode}, ${booking.address.country}`
                  : 'N/A'}
              </p>
              {booking.address?.landmark && <p className="text-gray-500">Near: {booking.address.landmark}</p>}
            </div>
          </div>

          {/* Payment Information */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-blue-500" />
              Payment Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-sm font-medium">₹{booking.totalAmount || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Method</p>
                <p className="text-sm font-medium capitalize">{booking.paymentMethod || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Status</p>
                <p className={`text-sm font-medium capitalize ${getPaymentStatusColor(booking.paymentStatus)}`}>
                  {booking.paymentStatus === 'paid'
                    ? 'Paid'
                    : booking.paymentStatus === 'pending'
                      ? 'Payment Pending'
                      : booking.paymentStatus || 'Not Specified'}
                </p>
              </div>
              {booking.paymentDate && (
                <div>
                  <p className="text-xs text-gray-500">Payment Date</p>
                  <p className="text-sm font-medium">{formatDateTime(booking.paymentDate)}</p>
                </div>
              )}
            </div>

            {needsPayment(booking) && !booking.confirmBooking && (
              <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-900">Payment Required</p>
                    <p className="text-xs text-orange-700">
                      {booking.paymentMethod === 'cash'
                        ? 'Please complete the payment.'
                        : 'Please complete your online payment.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      showPaymentOptions(booking);
                    }}
                    className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700 transition-colors"
                  >
                    Pay Now
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order History */}
          {booking.statusHistory && booking.statusHistory.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-500" />
                Order History
              </h3>
              <div className="space-y-3">
                {booking.statusHistory.map((history, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 capitalize">{getStatusText(history.status)}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(history.timestamp)}</p>
                      {history.note && <p className="text-xs text-gray-600 mt-1">{history.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Support */}
          <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
              <HelpCircle className="w-5 h-5 mr-2 text-blue-500" />
              Need Help?
            </h3>
            <p className="text-sm text-gray-600 mb-3">Having issues with your booking? Our support team is here to help.</p>
            <div className="flex flex-wrap gap-2">
              <button className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-800 bg-white px-3 py-2 rounded-md hover:bg-blue-50 transition-colors border border-blue-200">
                <MessageSquare className="w-4 h-4" />
                <span>Chat Support</span>
              </button>
              <button className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-800 bg-white px-3 py-2 rounded-md hover:bg-blue-50 transition-colors border border-blue-200">
                <Phone className="w-4 h-4" />
                <span>Call Support</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>

            {booking.status === 'completed' && (
              <button
                onClick={() => {
                  onClose();
                  reorderService(booking.services[0].serviceDetails._id);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-1"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Book Again</span>
              </button>
            )}

            {canRescheduleBooking(booking) && (
              <button
                onClick={() => {
                  onClose();
                  showRescheduleForm(booking);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center space-x-1"
              >
                <Edit className="w-4 h-4" />
                <span>Reschedule</span>
              </button>
            )}

            {canGiveFeedback(booking) && (
              <button
                onClick={() => {
                  onClose();
                  showFeedbackForm(booking);
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium flex items-center space-x-1"
              >
                <Star className="w-4 h-4" />
                <span>Give Feedback</span>
              </button>
            )}

            {needsPayment(booking) && !booking.confirmBooking && (
              <button
                onClick={() => {
                  onClose();
                  showPaymentOptions(booking);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-1"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Now</span>
              </button>
            )}

            {canCancelBooking(booking) && (
              <button
                onClick={() => {
                  onClose();
                  handleCancelBooking(booking._id);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Cancel Booking
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
              <div className="flex items-center text-sm text-gray-500 mt-2">
                <span>{bookings.length} {bookings.length === 1 ? 'booking' : 'total bookings'}</span>
                <span className="mx-2">•</span>
                <span>{bookings.filter((b) => b.status === 'completed').length} completed</span>
                <span className="mx-2">•</span>
                <span>{bookings.filter((b) => needsPayment(b)).length} pending payment</span>
              </div>
            </div>
            <button
              onClick={fetchBookings}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">View</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="active">Active Bookings</option>
                <option value="past">Past Bookings</option>
                <option value="all">All Bookings</option>
                <option value="pending">⏳ Pending</option>
                <option value="accepted">✅ Accepted</option>
                <option value="in_progress">🛠️ In Progress</option>
                <option value="completed">🎉 Completed</option>
                <option value="cancelled">❌ Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Bookings</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by service name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="date">Most Recent</option>
                <option value="status">Status</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('active');
                  setSearchTerm('');
                  setSortBy('date');
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Bookings', value: bookings.length, color: 'bg-blue-500' },
            { label: 'Active', value: bookings.filter(isActiveBooking).length, color: 'bg-green-500' },
            { label: 'Completed', value: bookings.filter((b) => b.status === 'completed').length, color: 'bg-purple-500' },
            { label: 'Payment Due', value: bookings.filter((b) => needsPayment(b)).length, color: 'bg-orange-500' },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full ${stat.color} mr-3`}></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bookings List */}
        <div>
          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
              <div className="mx-auto h-24 w-24 text-gray-400 mb-6">
                <Calendar className="w-full h-full" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-500 mb-6">
                {statusFilter !== 'all' || searchTerm
                  ? 'Try adjusting your filters to see more results'
                  : "You haven't made any bookings yet. Start exploring our services!"}
              </p>
              {statusFilter === 'all' && !searchTerm && (
                <button
                  onClick={() => navigate('/services')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Browse Services
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))}
            </div>
          )}
        </div>

        {/* Load More Button (if needed for pagination) */}
        {filteredBookings.length >= 10 && (
          <div className="text-center mt-8">
            <button className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium">
              Load More Bookings
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && selectedBooking && (
        <BookingModal booking={selectedBooking} onClose={() => setShowModal(false)} />
      )}

      {showPaymentModal && selectedPaymentBooking && (
        <PaymentModal booking={selectedPaymentBooking} onClose={() => setShowPaymentModal(false)} />
      )}

      {showFeedbackModal && selectedBooking && (
        <FeedbackModal booking={selectedBooking} onClose={() => setShowFeedbackModal(false)} />
      )}

      {showRescheduleModal && selectedBooking && (
        <RescheduleModal booking={selectedBooking} onClose={() => setShowRescheduleModal(false)} />
      )}

      {showMapModal && (
        <MapTrackingModal onClose={stopTracking} />
      )}
    </div>
  );
};

export default CustomerBookingsPage;