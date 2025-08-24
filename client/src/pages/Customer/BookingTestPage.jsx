import React, { useState, useMemo } from 'react';
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

// Mock data for testing
const mockBookings = [
  {
    _id: '1',
    services: [{
      serviceDetails: {
        title: 'Electrical Wiring Installation',
        category: 'electrical',
        duration: 3,
        image: null,
        basePrice: 2500
      },
      quantity: 1,
      price: 2500
    }],
    date: new Date('2024-08-25'),
    time: '10:00',
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'online',
    totalAmount: 2500,
    confirmedBooking: false,
    address: {
      street: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001'
    },
    createdAt: new Date('2024-08-24'),
    providerDetails: null
  },
  {
    _id: '2',
    services: [{
      serviceDetails: {
        title: 'AC Repair Service',
        category: 'electrical',
        duration: 2,
        image: null,
        basePrice: 1500
      },
      quantity: 1,
      price: 1500
    }],
    date: new Date('2024-08-23'),
    time: '14:00',
    status: 'accepted',
    paymentStatus: 'paid',
    paymentMethod: 'online',
    totalAmount: 1500,
    confirmedBooking: true,
    address: {
      street: '456 Park Avenue',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001'
    },
    createdAt: new Date('2024-08-20'),
    providerDetails: {
      name: 'Raj Electrical Services',
      phone: '+91-9876543210',
      rating: 4.5
    }
  },
  {
    _id: '3',
    services: [{
      serviceDetails: {
        title: 'Fan Installation',
        category: 'electrical',
        duration: 1,
        image: null,
        basePrice: 800
      },
      quantity: 2,
      price: 800
    }],
    date: new Date('2024-08-20'),
    time: '16:00',
    status: 'completed',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    totalAmount: 1600,
    confirmedBooking: true,
    address: {
      street: '789 Garden Road',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560001'
    },
    createdAt: new Date('2024-08-18'),
    providerDetails: {
      name: 'Expert Electricians',
      phone: '+91-9876543211',
      rating: 4.8
    }
  },
  {
    _id: '4',
    services: [{
      serviceDetails: {
        title: 'Switch Board Repair',
        category: 'electrical',
        duration: 2,
        image: null,
        basePrice: 1200
      },
      quantity: 1,
      price: 1200
    }],
    date: new Date('2024-08-15'),
    time: '11:00',
    status: 'cancelled',
    paymentStatus: 'refunded',
    paymentMethod: 'online',
    totalAmount: 1200,
    confirmedBooking: false,
    address: {
      street: '321 Tech Park',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001'
    },
    createdAt: new Date('2024-08-14'),
    providerDetails: null
  }
];

const BookingTestPage = () => {
  // State variables
  const [bookings] = useState(mockBookings);
  const [loading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshing] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  // Helper functions
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
    return booking.paymentStatus === 'pending' && !booking.confirmedBooking;
  };

  const canCancelBooking = (booking) => {
    return ['pending', 'accepted'].includes(booking.status);
  };

  const canRescheduleBooking = (booking) => {
    return booking.status === 'pending';
  };

  const isActiveBooking = (booking) => {
    return ['pending', 'accepted', 'in_progress', 'in-progress', 'payment_pending'].includes(booking.status);
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

  // Filter bookings based on time
  const filterBookingsByTime = (bookings, timeFilter) => {
    if (timeFilter === 'all') return bookings;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (timeFilter) {
      case '7days':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '1month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case '6months':
        filterDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return bookings;
    }
    
    return bookings.filter(booking => new Date(booking.createdAt) >= filterDate);
  };

  const getFilteredBookings = () => {
    let filtered = bookings;
    
    // Apply time filter first
    filtered = filterBookingsByTime(filtered, timeFilter);
    
    return filtered
      .filter((booking) => {
        // Status filter
        if (statusFilter === 'upcoming' && !['pending', 'accepted'].includes(booking.status)) return false;
        if (statusFilter === 'completed' && booking.status !== 'completed') return false;
        if (statusFilter === 'cancelled' && booking.status !== 'cancelled') return false;
        if (statusFilter === 'pending_payment' && !needsPayment(booking)) return false;
        if (statusFilter !== 'all' && statusFilter !== 'upcoming' && statusFilter !== 'completed' && statusFilter !== 'cancelled' && statusFilter !== 'pending_payment' && booking.status !== statusFilter) return false;
        
        // Search filter
        if (searchTerm && !booking.services?.[0]?.serviceDetails?.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        
        return true;
      })
      .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  };

  const filteredBookings = getFilteredBookings();

  // Handle reschedule
  const handleReschedule = (booking) => {
    setRescheduleBooking(booking);
    setRescheduleDate(booking.date.toISOString().split('T')[0]);
    setRescheduleTime(booking.time || '');
    setShowRescheduleModal(true);
  };

  const submitReschedule = () => {
    // In real app, this would call the API
    console.log('Rescheduling booking:', rescheduleBooking._id, 'to', rescheduleDate, rescheduleTime);
    setShowRescheduleModal(false);
    setRescheduleBooking(null);
    alert('Booking rescheduled successfully! (This is a demo)');
  };

  // Timeline Component
  const BookingTimeline = ({ booking }) => {
    const steps = [
      {
        key: 'booked',
        label: 'Order Placed',
        icon: ShoppingCart,
        completed: true,
        description: 'Your booking has been confirmed',
        time: booking.createdAt,
      },
      {
        key: 'payment',
        label: 'Payment',
        icon: booking.paymentMethod === 'cash' ? DollarSign : CreditCard,
        completed: booking.paymentStatus === 'paid',
        active: booking.paymentStatus === 'pending',
        description: booking.paymentStatus === 'paid' 
          ? `Payment completed via ${booking.paymentMethod}`
          : booking.paymentMethod === 'cash'
            ? 'Payment on service completion'
            : 'Payment pending',
      },
      {
        key: 'assigned',
        label: 'Provider Assigned',
        icon: User,
        completed: booking.status !== 'pending',
        active: booking.status === 'pending',
        description: booking.status !== 'pending' 
          ? `${booking.providerDetails?.name || 'Provider'} assigned`
          : 'Finding the best provider',
      },
      {
        key: 'in_progress',
        label: 'Service Started',
        icon: Wrench,
        completed: ['in_progress', 'in-progress', 'completed'].includes(booking.status),
        active: ['in_progress', 'in-progress'].includes(booking.status),
        description: ['in_progress', 'in-progress', 'completed'].includes(booking.status)
          ? 'Service is in progress'
          : 'Service will begin soon',
      },
      {
        key: 'completed',
        label: 'Completed',
        icon: CheckCircle,
        completed: booking.status === 'completed',
        description: booking.status === 'completed'
          ? 'Service completed successfully'
          : 'Service completion pending',
      },
    ];

    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex items-center mb-4">
          <Package className="w-5 h-5 text-primary mr-2" />
          <h4 className="font-semibold text-secondary">Order Progress</h4>
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
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start space-x-4 flex-1">
            {/* Service Image */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center border-2 border-primary/20">
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

              {/* Status Badge */}
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center space-x-1 text-xs font-medium px-3 py-1.5 rounded-full border ${getStatusColor(booking.status)}`}>
                  {getStatusIcon(booking.status)}
                  <span>{getStatusText(booking.status)}</span>
                </span>
                
                {needsPayment(booking) && (
                  <span className="inline-flex items-center space-x-1 text-xs font-medium px-3 py-1.5 rounded-full bg-gradient-to-r from-accent/10 to-accent/20 text-accent border border-accent/30 animate-pulse">
                    <AlertCircle className="w-3 h-3" />
                    <span>Payment Due</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Price & Actions */}
          <div className="text-right">
            <p className="text-2xl font-bold text-secondary">
              ₹{booking.totalAmount || 0}
            </p>
            <p className={`text-sm font-medium ${
              booking.paymentStatus === 'paid' ? 'text-primary' : 'text-accent'
            }`}>
              {booking.paymentStatus === 'paid' ? '✓ Paid' : 'Payment Pending'}
            </p>
          </div>
        </div>

        {/* Pending Booking Message */}
        {booking.status === 'pending' && !booking.confirmedBooking && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-amber-600 mr-2" />
              <p className="text-sm text-amber-800 font-medium">
                Please confirm booking so provider can be assigned
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={() => {
              setSelectedBooking(booking);
              setShowModal(true);
            }}
            className="flex items-center space-x-1 text-sm font-medium text-primary hover:text-primary/80 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors border border-primary/20"
          >
            <Eye className="w-4 h-4" />
            <span>View Details</span>
          </button>

          {needsPayment(booking) && (
            <button
              onClick={() => alert('Redirecting to payment page... (Demo)')}
              className="flex items-center space-x-1 text-sm font-medium text-white bg-gradient-to-r from-accent to-accent hover:from-accent/90 hover:to-accent/90 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Now</span>
            </button>
          )}

          {canRescheduleBooking(booking) && (
            <button
              onClick={() => handleReschedule(booking)}
              className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200"
            >
              <Edit3 className="w-4 h-4" />
              <span>Reschedule</span>
            </button>
          )}

          {booking.status !== 'pending' && booking.status !== 'cancelled' && booking.status !== 'completed' && booking.providerDetails?.phone && (
            <button
              onClick={() => alert(`Calling ${booking.providerDetails.phone}... (Demo)`)}
              className="flex items-center space-x-1 text-sm font-medium text-primary hover:text-primary/80 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors border border-primary/20"
            >
              <Phone className="w-4 h-4" />
              <span>Call Provider</span>
            </button>
          )}

          {canCancelBooking(booking) && (
            <button
              onClick={() => alert('Booking cancelled! (Demo)')}
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
            
            {/* Service Details */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-secondary mb-3 flex items-center">
                <Package className="w-4 h-4 text-primary mr-2" />
                Service Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium capitalize">{booking.services?.[0]?.serviceDetails?.category || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{booking.services?.[0]?.serviceDetails?.duration || 'N/A'} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Price:</span>
                  <span className="font-medium">₹{booking.services?.[0]?.serviceDetails?.basePrice || 0}</span>
                </div>
              </div>
            </div>

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
                    <span className="font-medium">{booking.providerDetails.phone}</span>
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
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpandedBooking(expandedBooking === booking._id ? null : booking._id)}
          className="w-full mt-4 pt-4 border-t border-gray-100 flex items-center justify-center text-sm text-gray-500 hover:text-primary transition-colors"
        >
          {expandedBooking === booking._id ? (
            <>
              <span>Show Less</span>
              <ChevronDown className="w-4 h-4 ml-1" />
            </>
          ) : (
            <>
              <span>Show More</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-secondary">My Bookings</h1>
              <p className="text-gray-600 mt-1">
                {bookings.length} {bookings.length === 1 ? 'booking' : 'total bookings'}
              </p>
            </div>
            <button
              disabled={refreshing}
              className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: bookings.length, color: 'bg-primary', icon: Package },
              { label: 'Active', value: bookings.filter(isActiveBooking).length, color: 'bg-blue-500', icon: Activity },
              { label: 'Completed', value: bookings.filter((b) => b.status === 'completed').length, color: 'bg-green-500', icon: CheckCircle },
              { label: 'Payment Due', value: bookings.filter((b) => needsPayment(b)).length, color: 'bg-accent', icon: CreditCard },
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

        {/* Enhanced Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="all">All Bookings</option>
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
                <option value="1month">Last Month</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
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
                {statusFilter !== 'all' || timeFilter !== 'all' || searchTerm
                  ? 'Try adjusting your filters to see more results'
                  : "You haven't made any bookings yet. Start exploring our services!"}
              </p>
              {statusFilter === 'all' && timeFilter === 'all' && !searchTerm && (
                <button
                  onClick={() => alert('Redirecting to services... (Demo)')}
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

      {/* Booking Details Modal */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-secondary">Booking Details</h2>
                  <p className="text-sm text-gray-500">ID: #{selectedBooking._id.slice(-8).toUpperCase()}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Service Details */}
              <div className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-secondary mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-primary" />
                  Service Details
                </h3>
                <div className="flex mb-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <Package className="w-10 h-10 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-secondary mb-1">{selectedBooking.services?.[0]?.serviceDetails?.title || 'Unknown Service'}</h4>
                    <p className="text-sm text-gray-500 capitalize mb-2">{selectedBooking.services?.[0]?.serviceDetails?.category || 'N/A'}</p>
                    <p className="text-sm text-gray-600">Professional electrical service</p>
                  </div>
                </div>
              </div>

              {/* Booking Information */}
              <div className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-secondary mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-primary" />
                  Booking Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm font-medium">{formatDate(selectedBooking.date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="text-sm font-medium">{formatTime(selectedBooking.time)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedBooking.status)}`}>
                      {getStatusText(selectedBooking.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment Status</p>
                    <p className={`text-sm font-medium ${selectedBooking.paymentStatus === 'paid' ? 'text-primary' : 'text-accent'}`}>
                      {selectedBooking.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-secondary mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-primary" />
                  Price Details
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Price:</span>
                    <span className="font-medium">₹{selectedBooking.totalAmount}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-primary">₹{selectedBooking.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Address */}
              {selectedBooking.address && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <h3 className="font-semibold text-secondary mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-primary" />
                    Service Address
                  </h3>
                  <p className="text-sm text-gray-700">
                    {[
                      selectedBooking.address.street,
                      selectedBooking.address.city,
                      selectedBooking.address.state,
                      selectedBooking.address.postalCode
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {/* Provider Information */}
              {selectedBooking.providerDetails && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <h3 className="font-semibold text-secondary mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-primary" />
                    Provider Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedBooking.providerDetails.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{selectedBooking.providerDetails.phone}</span>
                    </div>
                    {selectedBooking.providerDetails.rating && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rating:</span>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span className="font-medium">{selectedBooking.providerDetails.rating}/5</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
                
                {needsPayment(selectedBooking) && (
                  <button
                    onClick={() => {
                      setShowModal(false);
                      alert('Redirecting to payment... (Demo)');
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
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && rescheduleBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-secondary">Reschedule Booking</h2>
                  <p className="text-sm text-gray-500">ID: #{rescheduleBooking._id.slice(-8).toUpperCase()}</p>
                </div>
                <button onClick={() => setShowRescheduleModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">New Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">New Time</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-amber-600 mr-2" />
                  <p className="text-sm text-amber-800">
                    Rescheduling is only allowed for pending bookings at least 6 hours before the scheduled time.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitReschedule}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center space-x-1"
              >
                <Edit3 className="w-4 h-4" />
                <span>Reschedule</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingTestPage;
