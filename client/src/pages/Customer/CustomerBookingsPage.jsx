import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../store/auth';
import { useNavigate } from 'react-router-dom';
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
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  CreditCard,
  Star,
  Package,
  ShoppingCart,
  Timer,
  Wrench,
  Activity,
  Edit3,
  Filter,
  CalendarDays,
  ArrowUpDown
} from 'lucide-react';

const CustomerBookingsPage = () => {
  const { token, API, showToast, user } = useAuth();
  const navigate = useNavigate();
  
  // State variables
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [bookingToReschedule, setBookingToReschedule] = useState(null);
  const [totalBookings, setTotalBookings] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, timeFilter, searchTerm]);

  const fetchBookings = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        status: statusFilter,
        timeFilter: timeFilter,
        searchTerm: searchTerm,
      });

      const response = await fetch(`${API}/booking/customer?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.statusText}`);
      }

      const data = await response.json();
      setBookings(data.data);
      setTotalBookings(data.totalBookings);
    } catch (error) {
      console.error('Fetch bookings error:', error.message);
      showToast(`Error fetching bookings: ${error.message}`, 'error');
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      setSelectedBooking(data.data);
      setShowModal(true);
    } catch (error) {
      console.error('Fetch booking details error:', error.message);
      showToast(`Error fetching booking details: ${error.message}`, 'error');
    }
  };

  const handlePayNow = (booking) => {
    if (booking.status === 'pending' && booking.paymentStatus === 'pending') {
      navigate(`/customer/booking-confirm/${booking._id}`, {
        state: {
          booking,
          service: booking.services?.[0]?.serviceDetails,
          coupon: booking.couponApplied
        }
      });
    } else {
       showToast('Payment can only be made for pending bookings.', 'info');
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

  const handleRescheduleClick = (booking) => {
    setBookingToReschedule(booking);
    setShowRescheduleModal(true);
  };

  const handleRescheduleSubmit = async ({ date, time }) => {
    if (!bookingToReschedule) return;

    try {
      const response = await fetch(`${API}/booking/user/${bookingToReschedule._id}/reschedule`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, time }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reschedule booking');
      }

      showToast('Booking rescheduled successfully', 'success');
      setShowRescheduleModal(false);
      setBookingToReschedule(null);
      fetchBookings(true);
    } catch (error) {
      console.error('Reschedule booking error:', error.message);
      showToast(`Error rescheduling booking: ${error.message}`, 'error');
    }
  };

  const callProvider = (phoneNumber) => {
    if (!phoneNumber) {
      showToast('Provider phone number not available', 'warning');
      return;
    }
    window.location.href = `tel:${phoneNumber}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 border-amber-200';
      case 'accepted':
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border-blue-200';
      case 'in_progress':
      case 'in-progress':
        return 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border-red-200';
      case 'payment_pending':
        return 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-800 border-orange-200';
      default:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Timer className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
      case 'in-progress':
        return <Activity className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'payment_pending':
        return <CreditCard className="w-4 h-4" />;
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
      case 'in_progress':
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

  const needsPayment = (booking) => {
    return (
      booking.paymentStatus === 'pending' &&
      !booking.confirmedBooking
    );
  };

  const canCancelBooking = (booking) => {
    return ['pending', 'accepted'].includes(booking.status);
  };

  const canReschedule = (booking) => {
    return booking.status === 'pending';
  }

  const isActiveBooking = (booking) => {
    return ['pending', 'accepted', 'in_progress', 'in-progress', 'payment_pending'].includes(booking.status);
  };

  const filteredBookings = bookings;

  // Timeline Component
  const BookingTimeline = ({ booking }) => {
    const steps = [
      {
        key: 'booked',
        label: 'Booking Placed',
        icon: ShoppingCart,
        completed: true,
        description: 'Your booking has been placed.',
        time: booking.createdAt,
      },
      {
        key: 'payment',
        label: 'Payment Done',
        icon: booking.paymentMethod === 'cash' ? DollarSign : CreditCard,
        completed: booking.paymentStatus === 'paid',
        active: booking.paymentStatus === 'pending' && !booking.confirmedBooking,
        description: booking.paymentStatus === 'paid' 
          ? `Payment of ₹${booking.totalAmount} completed via ${booking.paymentMethod}`
          : booking.paymentMethod === 'cash'
            ? 'Pay after service completion'
            : 'Payment is pending',
      },
      {
        key: 'assigned',
        label: 'Provider Assigned',
        icon: User,
        completed: ['accepted', 'in_progress', 'completed'].includes(booking.status),
        active: booking.status === 'pending' && booking.paymentStatus === 'paid',
        description: booking.providerDetails
          ? `${booking.providerDetails.name} has been assigned.`
          : 'Waiting for a provider to be assigned.',
      },
      {
        key: 'in_progress',
        label: 'Work Started',
        icon: Wrench,
        completed: ['in_progress', 'completed'].includes(booking.status),
        active: booking.status === 'in_progress',
        description: booking.status === 'in_progress'
          ? 'The provider has started the work.'
          : 'Work will begin soon.',
      },
      {
        key: 'completed',
        label: 'Completed',
        icon: CheckCircle,
        completed: booking.status === 'completed',
        description: booking.status === 'completed'
          ? 'Service has been completed successfully.'
          : 'Service completion is pending.',
      },
    ];

    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex items-center mb-4">
          <Package className="w-5 h-5 text-primary mr-2" />
          <h4 className="font-semibold text-secondary">Booking Process</h4>
        </div>

        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.key} className="relative flex items-start space-x-4">
                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  step.completed 
                    ? 'bg-gradient-to-r from-primary to-primary text-white shadow-lg' 
                    : step.active 
                      ? 'bg-gradient-to-r from-accent to-accent text-white animate-pulse' 
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  <step.icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0 pb-4">
                  <h5 className={`text-sm font-semibold ${
                    step.completed ? 'text-primary' : step.active ? 'text-accent' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </h5>
                  <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                  {step.time && (
                    <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full mt-2 inline-block">
                      {formatDate(step.time)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Booking Card Component
  const BookingCard = ({ booking }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      {/* Status Banner */}
      <div className={`h-1 ${
        booking.status === 'completed' ? 'bg-gradient-to-r from-primary to-primary' :
        booking.status === 'cancelled' ? 'bg-gradient-to-r from-red-500 to-red-500' :
        booking.status === 'in_progress' || booking.status === 'in-progress' ? 'bg-gradient-to-r from-accent to-accent' :
        booking.status === 'accepted' ? 'bg-gradient-to-r from-blue-500 to-blue-500' :
        'bg-gradient-to-r from-amber-500 to-amber-500'
      }`}></div>
      
      <div className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
          <div className="flex items-start space-x-4 flex-1">
            {/* Service Image */}
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
                className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center border-2 border-primary/20"
                style={booking.services?.[0]?.serviceDetails?.image ? { display: 'none' } : {}}
              >
                <Wrench className="w-8 h-8 text-primary" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {/* Service Title */}
              <h3 className="font-semibold text-lg text-secondary mb-1 truncate">
                {booking.services?.[0]?.serviceDetails?.title || 'Service Booking'}
              </h3>
              
              {/* Booking ID */}
              <p className="text-sm text-gray-500 mb-2">
                Booking ID: #{booking?._id?.slice(-8).toUpperCase()}
              </p>
              
              {/* Date & Time */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-3">
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(booking.date)}</span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(booking.time)}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center space-x-1 text-xs font-medium px-3 py-1.5 rounded-full border ${getStatusColor(booking.status)}`}>
                  {getStatusIcon(booking.status)}
                  <span>{getStatusText(booking.status)}</span>
                </span>
                
                {booking.paymentStatus === 'pending' && (
                  <span className="inline-flex items-center space-x-1 text-xs font-medium px-3 py-1.5 rounded-full bg-gradient-to-r from-accent/10 to-accent/20 text-accent border border-accent/30 animate-pulse">
                    <AlertCircle className="w-3 h-3" />
                    <span>Payment Due</span>
                  </span>
                )}
              </div>
                 {booking.paymentStatus === 'pending' && (
                    <p className="text-xs text-amber-700 mt-2 p-2 bg-amber-50 rounded-md">
                        Please confirm your booking so that a provider can be assigned and your request can be resolved.
                    </p>
                )}
            </div>
          </div>

          {/* Price & Actions */}
          <div className="text-right mt-4 sm:mt-0">
            <p className="text-2xl font-bold text-secondary">
              ₹{booking.totalAmount || 0}
            </p>
            <p className={`text-sm font-medium ${
              booking.paymentStatus === 'paid' ? 'text-primary' : 'text-accent'
            }`}>
              {booking.paymentStatus === 'paid' ? '✓ Paid' : 'Payment Pending'} via {booking.paymentMethod}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={() => setExpandedBooking(expandedBooking === booking._id ? null : booking._id)}
            className="flex items-center space-x-1 text-sm font-medium text-primary hover:text-primary/80 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors border border-primary/20"
          >
            <Eye className="w-4 h-4" />
            <span>{expandedBooking === booking._id ? 'Hide Details' : 'View Details'}</span>
          </button>

          {booking.paymentStatus === 'pending' && !booking.confirmedBooking && (
            <button
              onClick={() => handlePayNow(booking)}
              className="flex items-center space-x-1 text-sm font-medium text-white bg-gradient-to-r from-accent to-accent hover:from-accent/90 hover:to-accent/90 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Now</span>
            </button>
          )}

          {canReschedule(booking) && (
             <button
                onClick={() => handleRescheduleClick(booking)}
                className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200"
            >
                <Edit3 className="w-4 h-4" />
                <span>Reschedule</span>
            </button>
          )}

          {booking.status !== 'completed' && booking.status !== 'pending' && booking.status !== 'cancelled' && (booking.providerDetails?.phone || booking.provider?.phone) && (
            <button
              onClick={() => callProvider(booking.providerDetails?.phone || booking.provider?.phone)}
              className="flex items-center space-x-1 text-sm font-medium text-primary hover:text-primary/80 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors border border-primary/20"
            >
              <Phone className="w-4 h-4" />
              <span>Call Provider</span>
            </button>
          )}

          {canCancelBooking(booking) && (
            <button
              onClick={() => handleCancelBooking(booking._id)}
              className="text-sm font-medium text-red-600 hover:text-red-800 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors border border-red-200"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Expanded Details */}
        {expandedBooking === booking._id && (
          <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
            <BookingTimeline booking={booking} />
            
            <div className="grid md:grid-cols-2 gap-6">
                {/* Address */}
                {booking.address && (
                <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-secondary mb-3 flex items-center">
                    <MapPin className="w-4 h-4 text-primary mr-2" />
                    Service Address
                    </h4>
                    <p className="text-sm text-gray-700">
                    {[
                        booking.address.street,
                        booking.address.city,
                        booking.address.state,
                        booking.address.postalCode
                    ].filter(Boolean).join(', ')}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                        Phone: {user.phone}
                    </p>
                </div>
                )}

                {/* Provider Details */}
                {booking.providerDetails && (
                <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-secondary mb-3 flex items-center">
                    <User className="w-4 h-4 text-primary mr-2" />
                    Provider Information
                    </h4>
                    <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{booking.providerDetails.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        {booking.status !== 'completed' ? (
                             <span className="font-medium">{booking.providerDetails.phone}</span>
                        ): (
                             <span className="font-medium text-gray-500">Hidden after completion</span>
                        )}
                    </div>
                    {booking.providerDetails.rating && (
                        <div className="flex justify-between">
                        <span className="text-gray-600">Rating:</span>
                        <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" />
                            <span className="font-medium">{booking.providerDetails.rating}/5</span>
                        </div>
                        </div>
                    )}
                    </div>
                </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Reschedule Modal
  const RescheduleModal = ({ booking, onClose, onConfirm }) => {
    const [date, setDate] = useState(booking ? new Date(booking.date).toISOString().split('T')[0] : '');
    const [time, setTime] = useState(booking?.time || '');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        const now = new Date();
        const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        const bookingDateTime = new Date(`${date}T${time}`);

        if(bookingDateTime < sixHoursLater){
            setError('Cannot reschedule within 6 hours of booking time. Please contact support.');
            return;
        }
        setError('');
        onConfirm({ date, time });
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-secondary">Reschedule Booking</h2>
                    <p className="text-sm text-gray-500">ID: #{booking._id.slice(-8).toUpperCase()}</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">New Date</label>
                        <input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">New Time</label>
                        <input 
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                        Confirm Reschedule
                    </button>
                </div>
            </div>
        </div>
    )
  }

  // Booking Details Modal
  const BookingModal = ({ booking, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-secondary">Booking Details</h2>
              <p className="text-sm text-gray-500">ID: #{booking._id.slice(-8).toUpperCase()}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
            <BookingTimeline booking={booking} />
        </div>

        {/* Modal Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
            
            {needsPayment(booking) && (
              <button
                onClick={() => {
                  onClose();
                  handlePayNow(booking);
                }}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium flex items-center space-x-1"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Loading Component
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-secondary">My Bookings</h1>
              <p className="text-gray-600 mt-1">
                {filteredBookings.length} of {totalBookings} {totalBookings === 1 ? 'booking' : 'total bookings'} shown
              </p>
            </div>
            <button
              onClick={() => fetchBookings(true)}
              disabled={refreshing}
              className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 mt-4 sm:mt-0"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: totalBookings, color: 'bg-primary', icon: Package },
              { label: 'Active', value: bookings.filter(isActiveBooking).length, color: 'bg-blue-500', icon: Activity },
              { label: 'Completed', value: bookings.filter((b) => b.status === 'completed').length, color: 'bg-green-500', icon: CheckCircle },
              { label: 'Payment Due', value: bookings.filter((b) => b.paymentStatus === 'pending').length, color: 'bg-accent', icon: CreditCard },
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-secondary">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="all">All</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="pending_payment">Pending Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">Filter by Time</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="1month">1 Month</option>
                <option value="6months">6 Months</option>
                <option value="1year">1 Year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">Search Bookings</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by service name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setTimeFilter('all');
                  setSearchTerm('');
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div>
          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
              <div className="mx-auto h-24 w-24 text-gray-400 mb-6">
                <Calendar className="w-full h-full" />
              </div>
              <h3 className="text-xl font-medium text-secondary mb-2">No bookings found</h3>
              <p className="text-gray-500 mb-6">
                {statusFilter !== 'all' || searchTerm || timeFilter !== 'all'
                  ? 'Try adjusting your filters to see more results'
                  : "You haven't made any bookings yet. Start exploring our services!"}
              </p>
              {statusFilter === 'all' && !searchTerm && (
                <button
                  onClick={() => navigate('/services')}
                  className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
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
      {showRescheduleModal && bookingToReschedule && (
        <RescheduleModal 
            booking={bookingToReschedule}
            onClose={() => setShowRescheduleModal(false)}
            onConfirm={handleRescheduleSubmit}
        />
      )}
    </div>
  );
};

export default CustomerBookingsPage;
