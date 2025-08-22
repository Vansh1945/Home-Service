import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../store/auth';
import { 
  Calendar, Clock, MapPin, User, Phone, Mail, DollarSign, 
  CheckCircle, XCircle, Play, Pause, RotateCcw, AlertCircle, 
  Filter, Search, RefreshCw, Eye, MessageCircle, Star,
  ChevronDown, ChevronUp, ChevronRight, ArrowRight,
  Briefcase, CreditCard, Timer, Award, TrendingUp,
  FileText, Camera, Upload, Check, X, Loader,
  Bell, Activity, Zap, Target, BarChart3
} from 'lucide-react';

// Custom hooks for better code organization
const useBookingData = (token, API, showToast) => {
  const [bookings, setBookings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBookingsByStatus = useCallback(async (status) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API}/booking/provider/status/${status}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setBookings(prev => ({
          ...prev,
          [status]: data.data
        }));
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error(`Error fetching ${status} bookings:`, error);
      setError(error.message);
      showToast(`Error fetching ${status} bookings`, 'error');
    } finally {
      setLoading(false);
    }
  }, [API, token, showToast]);

  const fetchAllBookings = useCallback(async () => {
    const statuses = ['pending', 'accepted', 'in-progress', 'completed'];
    await Promise.all(statuses.map(status => fetchBookingsByStatus(status)));
  }, [fetchBookingsByStatus]);

  return {
    bookings,
    loading,
    error,
    fetchBookingsByStatus,
    fetchAllBookings,
    setBookings
  };
};

const useBookingActions = (token, API, showToast, onBookingUpdate) => {
  const [actionLoading, setActionLoading] = useState({});

  const performAction = useCallback(async (bookingId, action, data = {}) => {
    setActionLoading(prev => ({ ...prev, [bookingId]: action }));
    
    try {
      const endpoint = `${API}/booking/provider/${bookingId}/${action}`;
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (result.success) {
        showToast(result.message || `Booking ${action}ed successfully`, 'success');
        onBookingUpdate();
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
      showToast(error.message || `Failed to ${action} booking`, 'error');
      throw error;
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: null }));
    }
  }, [token, API, showToast, onBookingUpdate]);

  return {
    actionLoading,
    acceptBooking: (bookingId, time) => performAction(bookingId, 'accept', { time }),
    rejectBooking: (bookingId, reason) => performAction(bookingId, 'reject', { reason }),
    startBooking: (bookingId) => performAction(bookingId, 'start'),
    completeBooking: (bookingId, servicePhotos) => performAction(bookingId, 'complete', { servicePhotos })
  };
};

// Enhanced status badge component
const StatusBadge = ({ status, className = "" }) => {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
    accepted: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Accepted' },
    'in-progress': { color: 'bg-purple-100 text-purple-800', icon: Play, label: 'In Progress' },
    completed: { color: 'bg-green-100 text-green-800', icon: Award, label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color} ${className}`}>
      <IconComponent className="w-4 h-4 mr-1" />
      {config.label}
    </span>
  );
};

// Enhanced booking card component
const BookingCard = ({ 
  booking, 
  onAccept, 
  onReject, 
  onStart, 
  onComplete, 
  onViewDetails,
  actionLoading 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [servicePhotos, setServicePhotos] = useState([]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return 'Time TBD';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getActionButtons = () => {
    const isLoading = actionLoading[booking._id];
    
    switch (booking.status) {
      case 'pending':
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => onAccept(booking._id)}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading === 'accept' ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>Accept</span>
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading === 'reject' ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>Reject</span>
            </button>
          </div>
        );
      
      case 'accepted':
        return (
          <button
            onClick={() => onStart(booking._id)}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {isLoading === 'start' ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>Start Service</span>
          </button>
        );
      
      case 'in-progress':
        return (
          <button
            onClick={() => setShowCompleteModal(true)}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {isLoading === 'complete' ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Award className="w-4 h-4" />
            )}
            <span>Complete Service</span>
          </button>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Booking #{booking._id.slice(-6)}
                </h3>
                <StatusBadge status={booking.status} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>{formatDate(booking.date)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span>{formatTime(booking.time)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-purple-500" />
                  <span>{booking.customer?.name || 'Customer'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>₹{booking.totalAmount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Services */}
        <div className="p-6 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Briefcase className="w-4 h-4 mr-2" />
            Services
          </h4>
          <div className="space-y-2">
            {booking.services?.map((serviceItem, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{serviceItem.service?.title || serviceItem.service?.name}</p>
                  <p className="text-sm text-gray-600">Quantity: {serviceItem.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">₹{serviceItem.price?.toFixed(2)}</p>
                  {serviceItem.discountAmount > 0 && (
                    <p className="text-sm text-green-600">-₹{serviceItem.discountAmount.toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Details */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Customer Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{booking.customer?.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{booking.customer?.phone}</span>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Service Address
                </h4>
                <div className="text-sm text-gray-600">
                  <p>{booking.address?.street}</p>
                  <p>{booking.address?.city}, {booking.address?.state} {booking.address?.postalCode}</p>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payment Information
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{booking.subtotal?.toFixed(2)}</span>
                  </div>
                  {booking.totalDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-₹{booking.totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>₹{booking.totalAmount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>Your Earnings:</span>
                    <span>₹{booking.netAmount?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {booking.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Special Instructions
                  </h4>
                  <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border">
                    {booking.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={() => onViewDetails(booking)}
                className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-1"
              >
                <Eye className="w-4 h-4" />
                <span>View</span>
              </button>
              <button className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-1">
                <MessageCircle className="w-4 h-4" />
                <span>Message</span>
              </button>
            </div>
            
            <div className="flex-1 max-w-md ml-4">
              {getActionButtons()}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Booking</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this booking:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows="3"
            />
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onReject(booking._id, rejectReason);
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Service</h3>
            <p className="text-gray-600 mb-4">
              Upload photos of completed work (optional):
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">Upload service photos</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setServicePhotos(Array.from(e.target.files))}
                className="hidden"
                id="service-photos"
              />
              <label
                htmlFor="service-photos"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </label>
            </div>
            {servicePhotos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">{servicePhotos.length} file(s) selected</p>
              </div>
            )}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setServicePhotos([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onComplete(booking._id, servicePhotos);
                  setShowCompleteModal(false);
                  setServicePhotos([]);
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Main component
const ActiveBooking = () => {
  const { token, API, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');

  // Custom hooks
  const {
    bookings,
    loading,
    error,
    fetchBookingsByStatus,
    fetchAllBookings
  } = useBookingData(token, API, showToast);

  const {
    actionLoading,
    acceptBooking,
    rejectBooking,
    startBooking,
    completeBooking
  } = useBookingActions(token, API, showToast, () => {
    fetchAllBookings();
  });

  // Load bookings on mount
  useEffect(() => {
    fetchAllBookings();
  }, [fetchAllBookings]);

  // Filter and sort bookings
  const filteredAndSortedBookings = useMemo(() => {
    const currentBookings = bookings[activeTab] || [];
    
    let filtered = currentBookings.filter(booking => {
      if (!searchQuery) return true;
      
      const searchLower = searchQuery.toLowerCase();
      return (
        booking._id.toLowerCase().includes(searchLower) ||
        booking.customer?.name?.toLowerCase().includes(searchLower) ||
        booking.customer?.email?.toLowerCase().includes(searchLower) ||
        booking.services?.some(service => 
          service.service?.title?.toLowerCase().includes(searchLower) ||
          service.service?.name?.toLowerCase().includes(searchLower)
        )
      );
    });

    // Sort bookings
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'amount':
          aValue = a.totalAmount || 0;
          bValue = b.totalAmount || 0;
          break;
        case 'customer':
          aValue = a.customer?.name || '';
          bValue = b.customer?.name || '';
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [bookings, activeTab, searchQuery, sortBy, sortOrder]);

  // Tab configuration
  const tabs = [
    { id: 'pending', label: 'Pending', icon: Clock, count: bookings.pending?.length || 0 },
    { id: 'accepted', label: 'Accepted', icon: CheckCircle, count: bookings.accepted?.length || 0 },
    { id: 'in-progress', label: 'In Progress', icon: Play, count: bookings['in-progress']?.length || 0 },
    { id: 'completed', label: 'Completed', icon: Award, count: bookings.completed?.length || 0 }
  ];

  // Statistics
  const stats = useMemo(() => {
    const allBookings = Object.values(bookings).flat();
    const totalEarnings = allBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.netAmount || 0), 0);
    
    return [
      {
        title: 'Total Bookings',
        value: allBookings.length,
        change: '+12%',
        trend: 'up',
        icon: Activity,
        color: 'from-blue-500 to-blue-600'
      },
      {
        title: 'Pending Requests',
        value: bookings.pending?.length || 0,
        change: '+3',
        trend: 'up',
        icon: Clock,
        color: 'from-yellow-500 to-yellow-600'
      },
      {
        title: 'Active Services',
        value: (bookings.accepted?.length || 0) + (bookings['in-progress']?.length || 0),
        change: '+5',
        trend: 'up',
        icon: Zap,
        color: 'from-purple-500 to-purple-600'
      },
      {
        title: 'Total Earnings',
        value: `₹${totalEarnings.toFixed(0)}`,
        change: '+18%',
        trend: 'up',
        icon: TrendingUp,
        color: 'from-green-500 to-green-600'
      }
    ];
  }, [bookings]);

  const handleViewDetails = (booking) => {
    // Implementation for viewing booking details
    console.log('View booking details:', booking);
  };

  const handleRefresh = () => {
    fetchAllBookings();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <Calendar className="w-8 h-8 mr-3 text-blue-600" />
                Active Bookings
              </h1>
              <p className="text-gray-600">Manage your service bookings and track progress</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Bell className="w-4 h-4" />
                <span>Auto-refresh: On</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search bookings, customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="date">Sort by Date</option>
                  <option value="amount">Sort by Amount</option>
                  <option value="customer">Sort by Customer</option>
                </select>
              </div>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-1"
              >
                {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6 border border-gray-100 overflow-hidden">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-4 px-6 font-medium text-sm transition-all duration-200 relative ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        activeTab === tab.id 
                          ? 'bg-blue-400 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </div>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-gray-600">Loading bookings...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Bookings</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && filteredAndSortedBookings.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                {activeTab === 'pending' && <Clock className="w-12 h-12 text-gray-400" />}
                {activeTab === 'accepted' && <CheckCircle className="w-12 h-12 text-gray-400" />}
                {activeTab === 'in-progress' && <Play className="w-12 h-12 text-gray-400" />}
                {activeTab === 'completed' && <Award className="w-12 h-12 text-gray-400" />}
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No {activeTab.replace('-', ' ')} bookings
              </h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'pending' && "You don't have any pending booking requests at the moment."}
                {activeTab === 'accepted' && "No accepted bookings waiting to be started."}
                {activeTab === 'in-progress' && "No services currently in progress."}
                {activeTab === 'completed' && "No completed bookings to show."}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {!loading && !error && filteredAndSortedBookings.length > 0 && (
            <div className="space-y-6">
              {filteredAndSortedBookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  onAccept={acceptBooking}
                  onReject={rejectBooking}
                  onStart={startBooking}
                  onComplete={completeBooking}
                  onViewDetails={handleViewDetails}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions Floating Button */}
        <div className="fixed bottom-6 right-6">
          <div className="relative group">
            <button className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </button>
            <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
              <div className="flex flex-col space-y-1 min-w-[120px]">
                <button
                  onClick={handleRefresh}
                  className="px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
                <button className="px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </button>
                <button className="px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2">
                  <Target className="w-4 h-4" />
                  <span>Goals</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveBooking;
