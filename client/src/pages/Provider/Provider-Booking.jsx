import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../store/auth';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  DollarSign,
  Eye,
  Check,
  CheckCircle,
  X,
  AlertCircle,
  Percent,
  Wallet,
  Tag,
  ChevronDown,
  ChevronUp,
  Filter,
  ClipboardList,
  Scissors,
  Clock4,
  Home,
  Sparkles,
  Zap,
  Plug,
  Wrench,
  Play,
  Camera,
  CreditCard,
  CheckSquare,
  AlertTriangle,
  Star,
  Package,
  Search,
  BarChart3,
  Activity,
  Timer,
  CheckCheck,
  HelpCircle,
  Copy,
  Grid,
  List,
  TrendingUp,
  Banknote
} from 'lucide-react';

// Simple Confirmation Dialog Component
const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message, type = 'default' }) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      default:
        return <HelpCircle className="w-6 h-6 text-blue-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 transform transition-all">
        <div className="p-6">
          <div className="flex items-center mb-4">
            {getIcon()}
            <h3 className="text-lg font-semibold text-gray-900 ml-3">{title}</h3>
          </div>
          <div className={`p-4 rounded-xl border ${getTypeStyles()} mb-6`}>
            <p className="text-sm">{message}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ${
                type === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : type === 'success'
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Provider Booking Component
const ProviderBooking = () => {
  const { token, API, showToast, user } = useAuth();
  const [bookings, setBookings] = useState({
    pending: [],
    accepted: [],
    'in-progress': [],
    completed: [],
    cancelled: []
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    booking: true,
    customer: true,
    service: true,
    payment: true,
    address: true
  });
  const [activeTab, setActiveTab] = useState('all');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', data: null });
  const [viewMode, setViewMode] = useState('card');
  const [servicePhotos, setServicePhotos] = useState({});

  // Utility functions
  const maskPhoneNumber = useCallback((phone) => {
    if (!phone) return 'N/A';
    const phoneStr = phone.toString();
    if (phoneStr.length >= 4) {
      return `****${phoneStr.slice(-6)}`;
    }
    return phoneStr;
  }, []);

  const calculateSubtotal = useCallback((booking) => {
    if (!booking?.services) return 0;
    return booking.services.reduce((sum, item) => {
      return sum + (item.price * item.quantity) - (item.discountAmount || 0);
    }, 0).toFixed(2);
  }, []);

  const calculateNetAmount = useCallback((booking) => {
    if (!booking) return 0;
    const totalAmount = booking.totalAmount || calculateSubtotal(booking);
    const commissionAmount = booking.commission?.amount || 0;
    return (totalAmount - commissionAmount).toFixed(2);
  }, [calculateSubtotal]);

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Fetch bookings function
  const fetchBookings = useCallback(async (status) => {
    try {
      setError(null);
      const response = await fetch(`${API}/booking/provider/status/${status}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch ${status} bookings`);
      }

      const data = await response.json();
      const newBookings = data.data || [];

      setBookings(prev => ({
        ...prev,
        [status]: newBookings
      }));
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    }
  }, [API, token, showToast]);

  // Initial data fetch
  useEffect(() => {
    if (token) {
      fetchBookings('pending');
      fetchBookings('accepted');
      fetchBookings('in-progress');
      fetchBookings('completed');
      fetchBookings('cancelled');
    }
  }, [token, fetchBookings]);

  // Booking action handler
  const handleBookingAction = useCallback(async (bookingId, action, additionalData = {}) => {
    // Show confirmation dialog for critical actions
    if (['reject', 'complete'].includes(action)) {
      setConfirmDialog({
        isOpen: true,
        type: action === 'reject' ? 'danger' : 'success',
        data: { bookingId, action, additionalData },
        title: action === 'reject' ? 'Reject Booking' : 'Complete Service',
        message: action === 'reject' 
          ? 'Are you sure you want to reject this booking? This action cannot be undone.'
          : 'Are you sure you want to mark this service as completed?'
      });
      return;
    }

    await executeBookingAction(bookingId, action, additionalData);
  }, []);

  const executeBookingAction = useCallback(async (bookingId, action, additionalData = {}) => {
    try {
      if (!bookingId) {
        showToast('Booking ID is missing. Please refresh and try again.', 'error');
        return;
      }

      let endpoint, method, body = {};
      
      switch (action) {
        case 'accept':
          endpoint = `${API}/booking/provider/${bookingId}/accept`;
          method = 'PATCH';
          if (selectedBooking?.time) body.time = selectedBooking.time;
          break;
        case 'reject':
          endpoint = `${API}/booking/provider/${bookingId}/reject`;
          method = 'PATCH';
          body.reason = additionalData.reason || 'Provider rejected';
          break;
        case 'start':
          endpoint = `${API}/booking/provider/${bookingId}/start`;
          method = 'PATCH';
          break;
        case 'complete':
          endpoint = `${API}/booking/provider/${bookingId}/complete`;
          method = 'PATCH';
          if (additionalData.photos) body.servicePhotos = additionalData.photos;
          break;
        default:
          throw new Error('Invalid action');
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.message || `Failed to ${action} booking`;
        
        if (response.status === 404) {
          errorMessage = action === 'complete' 
            ? 'Booking Not Available for Completion'
            : 'Booking Not Found';
        } else if (response.status === 403) {
          errorMessage = 'Permission Denied';
        } else if (response.status === 400) {
          errorMessage = 'Invalid Request';
        }

        showToast(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      const result = await response.json();
      showToast(result.message || `Booking ${action}ed successfully`, 'success');

      // Update bookings state
      setBookings(prev => {
        const updatedBookings = { ...prev };
        
        if (action === 'accept') {
          const bookingIndex = updatedBookings.pending.findIndex(b => b._id === bookingId);
          if (bookingIndex !== -1) {
            const [booking] = updatedBookings.pending.splice(bookingIndex, 1);
            updatedBookings.accepted.unshift({
              ...booking,
              status: 'accepted',
              provider: user._id
            });
          }
        } else if (action === 'reject') {
          const bookingIndex = updatedBookings.pending.findIndex(b => b._id === bookingId);
          if (bookingIndex !== -1) {
            const [booking] = updatedBookings.pending.splice(bookingIndex, 1);
            updatedBookings.cancelled.unshift({
              ...booking,
              status: 'cancelled'
            });
          }
        } else if (action === 'start') {
          const bookingIndex = updatedBookings.accepted.findIndex(b => b._id === bookingId);
          if (bookingIndex !== -1) {
            const [booking] = updatedBookings.accepted.splice(bookingIndex, 1);
            updatedBookings['in-progress'].unshift({
              ...booking,
              status: 'in-progress'
            });
          }
        } else if (action === 'complete') {
          let bookingIndex = updatedBookings['in-progress'].findIndex(b => b._id === bookingId);
          let sourceArray = 'in-progress';
          
          if (bookingIndex === -1) {
            bookingIndex = updatedBookings.accepted.findIndex(b => b._id === bookingId);
            sourceArray = 'accepted';
          }
          
          if (bookingIndex !== -1) {
            const [booking] = updatedBookings[sourceArray].splice(bookingIndex, 1);
            updatedBookings.completed.unshift({
              ...booking,
              status: 'completed'
            });
          }
        }
        
        return updatedBookings;
      });

      setShowModal(false);
      setSelectedBooking(null);
      setConfirmDialog({ isOpen: false, type: '', data: null });
    } catch (err) {
      console.error(`Error ${action}ing booking ${bookingId}:`, err);
    }
  }, [API, token, selectedBooking, showToast, user]);

  const handleConfirmAction = useCallback(() => {
    const { data } = confirmDialog;
    if (data) {
      executeBookingAction(data.bookingId, data.action, data.additionalData);
    }
  }, [confirmDialog, executeBookingAction]);

  const handlePhotoUpload = useCallback((bookingId, files) => {
    setServicePhotos(prev => ({
      ...prev,
      [bookingId]: Array.from(files)
    }));
  }, []);

  const getBookingDetails = useCallback(async (bookingId) => {
    try {
      const response = await fetch(`${API}/booking/provider-booking/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch booking details');
      }

      const data = await response.json();
      setSelectedBooking(data.data || null);
      setShowModal(true);
    } catch (err) {
      showToast(err.message, 'error');
      setShowModal(false);
    }
  }, [API, token, showToast]);

  const formatAddress = useCallback((address) => {
    if (!address) return 'Address not specified';
    if (typeof address === 'string') return address;

    const parts = [
      address.street,
      address.city,
      address.state,
      address.postalCode,
      address.country
    ].filter(Boolean);

    return parts.join(', ') || 'Address not specified';
  }, []);

  // Styling functions
  const getStatusColor = useCallback((status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200 shadow-amber-100';
      case 'accepted': return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 shadow-blue-100';
      case 'in-progress': return 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-purple-200 shadow-purple-100';
      case 'completed': return 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 shadow-green-100';
      case 'cancelled': return 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 shadow-red-100';
      default: return 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border-gray-200 shadow-gray-100';
    }
  }, []);

  const getStatusIcon = useCallback((status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return <Timer className="w-4 h-4" />;
      case 'accepted': return <CheckCheck className="w-4 h-4" />;
      case 'in-progress': return <Activity className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  }, []);

  const getServiceIcon = useCallback((category) => {
    switch (category?.toLowerCase()) {
      case 'salon':
      case 'beauty':
        return <Scissors className="w-5 h-5 text-pink-500" />;
      case 'cleaning':
        return <Sparkles className="w-5 h-5 text-blue-500" />;
      case 'electrical':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'ac':
        return <Plug className="w-5 h-5 text-blue-400" />;
      case 'appliance repair':
      case 'repair':
      case 'maintenance':
        return <Wrench className="w-5 h-5 text-orange-500" />;
      case 'home':
        return <Home className="w-5 h-5 text-green-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';

      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }, []);

  const formatTime = useCallback((timeString) => {
    if (!timeString) return '--:--';
    return timeString;
  }, []);

  const formatDuration = useCallback((hours) => {
    if (!hours) return 'N/A';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours > 0 ? `${wholeHours} hr` : ''} ${minutes > 0 ? `${minutes} min` : ''}`.trim();
  }, []);

  // Dashboard Statistics
  const dashboardStats = useMemo(() => {
    const allBookings = Object.values(bookings).flat();
    const totalBookings = allBookings.length;
    const completedBookings = bookings.completed.length;
    const pendingBookings = bookings.pending.length;
    
    // Calculate cash collected (only from completed COD bookings with paid status)
    const totalCashCollected = bookings.completed
      .filter(booking => booking.paymentMethod === 'cash' && booking.paymentStatus === 'paid')
      .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    
    // Calculate commission 
    const commissionPayable = totalCashCollected * 0.25;
    
    // Calculate net earnings (after commission)
    const netEarnings = totalCashCollected - commissionPayable;
    
    return {
      totalBookings,
      completedBookings,
      pendingBookings,
      totalCashCollected,
      commissionPayable,
      netEarnings
    };
  }, [bookings]);

  // Enhanced filtering with combined status and time filters
  const currentBookings = useMemo(() => {
    // Get all bookings or specific status bookings
    let filtered = activeTab === 'all' 
      ? Object.values(bookings).flat() 
      : bookings[activeTab] || [];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        (booking.customer?.name?.toLowerCase().includes(query)) ||
        (booking.services?.some(service =>
          service.service?.title?.toLowerCase().includes(query))) ||
        (booking._id?.toLowerCase().includes(query)));
    }

    // Apply time-based filter
    if (filter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(booking => 
        new Date(booking.date).toISOString().split('T')[0] === today);
    } else if (filter === 'upcoming') {
      const today = new Date();
      filtered = filtered.filter(booking => new Date(booking.date) >= today);
    } else if (filter === 'past') {
      const today = new Date();
      filtered = filtered.filter(booking => new Date(booking.date) < today);
    }

    return filtered;
  }, [bookings, activeTab, searchQuery, filter]);


  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
                  Service Dashboard
                </h1>
                <p className="text-gray-600 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Manage your service bookings efficiently
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Search bookings..."
                  className="pl-12 pr-4 py-3 w-80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-all duration-200 group-hover:shadow-md"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-4 top-3.5 text-gray-400 group-hover:text-blue-500 transition-colors">
                  <Search className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {/* Total Bookings */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalBookings}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <ClipboardList className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Completed Bookings */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{dashboardStats.completedBookings}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Pending Bookings */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{dashboardStats.pendingBookings}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Timer className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          {/* Total Cash Collected */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cash Collected</p>
                <p className="text-2xl font-bold text-green-600">₹{dashboardStats.totalCashCollected.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Banknote className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Commission Payable */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Commission (25%)</p>
                <p className="text-2xl font-bold text-red-600">₹{dashboardStats.commissionPayable.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <Percent className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Net Earnings */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Earnings</p>
                <p className="text-2xl font-bold text-indigo-600">₹{dashboardStats.netEarnings.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Modern Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Status Filter Dropdown */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 font-medium hover:shadow-md transition-all min-w-[180px]"
                >
                  <option value="all">All Bookings ({Object.values(bookings).flat().length})</option>
                  <option value="pending">Pending ({bookings.pending.length})</option>
                  <option value="accepted">Accepted ({bookings.accepted.length})</option>
                  <option value="in-progress">In Progress ({bookings['in-progress'].length})</option>
                  <option value="completed">Completed ({bookings.completed.length})</option>
                  <option value="cancelled">Cancelled ({bookings.cancelled.length})</option>
                </select>
                <div className="absolute right-3 top-9 text-gray-400 pointer-events-none">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {/* Time Filter Dropdown */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Time</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 font-medium hover:shadow-md transition-all min-w-[150px]"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
                <div className="absolute right-3 top-9 text-gray-400 pointer-events-none">
                  <Filter className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="flex items-end space-x-3">
              <button
                onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
                className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
                title={`Switch to ${viewMode === 'card' ? 'List' : 'Card'} View`}
              >
                {viewMode === 'card' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(activeTab !== 'all' || filter !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-600">Active Filters:</span>
                {activeTab !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getStatusIcon(activeTab)}
                    <span className="ml-1 capitalize">{activeTab === 'in-progress' ? 'In Progress' : activeTab}</span>
                    <button
                      onClick={() => setActiveTab('all')}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filter !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span className="capitalize">{filter}</span>
                    <button
                      onClick={() => setFilter('all')}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setActiveTab('all');
                    setFilter('all');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {currentBookings.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
              <div className="text-gray-400 mb-6">
                <List className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                No bookings found
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {activeTab === 'all'
                  ? searchQuery
                    ? `No bookings match your search "${searchQuery}".`
                    : filter !== 'all'
                      ? `No bookings found for the selected time filter "${filter}".`
                      : "You don't have any bookings at the moment. New bookings will appear here."
                  : activeTab === 'pending'
                    ? "You don't have any pending bookings at the moment. New bookings will appear here."
                    : activeTab === 'accepted'
                      ? "You don't have any accepted bookings. Once you accept pending bookings, they'll appear here."
                      : activeTab === 'in-progress'
                        ? "No services are currently in progress. Start accepted bookings to see them here."
                        : activeTab === 'completed'
                          ? "You haven't completed any bookings yet. Completed services will be listed here."
                          : "No cancelled bookings found."}
              </p>
            </div>
          ) : (
            currentBookings.map((booking) => (
              <div
                key={booking._id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all hover:shadow-xl hover:scale-[1.01] duration-300 group"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border shadow-sm ${getStatusColor(booking.status)}`}>
                          {getStatusIcon(booking.status)}
                          <span className="ml-2 capitalize">{booking.status === 'in-progress' ? 'In Progress' : booking.status || 'unknown'}</span>
                        </span>
                        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
                          ID: {booking._id.slice(-8)}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(booking._id)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy Booking ID"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center text-gray-700 group-hover:text-gray-900 transition-colors">
                          <div className="p-2 bg-orange-100 rounded-lg mr-3 group-hover:bg-orange-200 transition-colors">
                            {getServiceIcon(booking.services?.[0]?.service?.category)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Service</p>
                            <p className="font-medium">
                              {booking.services?.map(s => s.service?.title).join(', ') || 'Service'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center text-gray-700 md:col-span-2 group-hover:text-gray-900 transition-colors">
                          <div className="p-2 bg-red-100 rounded-lg mr-3 group-hover:bg-red-200 transition-colors">
                            <MapPin className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Address</p>
                            <p className="font-medium truncate">{formatAddress(booking.address)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Payment method indicator */}
                      <div className="flex items-center gap-3 mb-2">
                        {booking.paymentMethod === 'cash' ? (
                          <div className="flex items-center text-green-600 text-sm bg-green-50 px-3 py-1 rounded-lg">
                            <Banknote className="w-4 h-4 mr-2" />
                            <span className="font-medium">Cash on Delivery</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-blue-600 text-sm bg-blue-50 px-3 py-1 rounded-lg">
                            <CreditCard className="w-4 h-4 mr-2" />
                            <span className="font-medium">Online Payment</span>
                          </div>
                        )}
                        {booking.paymentStatus === 'paid' && (
                          <CheckSquare className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-3 min-w-[200px]">
                      <button
                        onClick={() => getBookingDetails(booking._id)}
                        className="inline-flex items-center justify-center px-4 py-3 border border-gray-200 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-md"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </button>

                      {/* Action buttons based on status */}
                      {booking.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleBookingAction(booking._id, 'accept')}
                            className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleBookingAction(booking._id, 'reject', { reason: 'Provider declined' })}
                            className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </button>
                        </div>
                      )}

                      {booking.status === 'accepted' && (
                        <button
                          onClick={() => handleBookingAction(booking._id, 'start')}
                          className="inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Service
                        </button>
                      )}

                      {booking.status === 'in-progress' && (
                        <button
                          onClick={() => handleBookingAction(booking._id, 'complete')}
                          className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Complete Service
                        </button>
                      )}

                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Created: {formatDate(booking.createdAt)}
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      Total: ₹{booking.totalAmount?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Booking Details Modal */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-gray-200 transform transition-all max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <ClipboardList className="w-6 h-6 mr-2 text-blue-600" />
                  Booking Details
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Booking Information Section */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('booking')}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <ClipboardList className="w-5 h-5 mr-2 text-blue-600" />
                      Booking Information
                    </h3>
                    {expandedSections.booking ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  
                  {expandedSections.booking && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg mr-3">
                          <Tag className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Booking ID</p>
                          <p className="font-medium">{selectedBooking._id}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg mr-3">
                          <Calendar className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Date & Time</p>
                          <p className="font-medium">
                            {formatDate(selectedBooking.date)} at {formatTime(selectedBooking.time)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg mr-3">
                          <Clock4 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Duration</p>
                          <p className="font-medium">
                            {formatDuration(selectedBooking.duration)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="p-2 bg-amber-100 rounded-lg mr-3">
                          {getStatusIcon(selectedBooking.status)}
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <p className="font-medium capitalize">
                            {selectedBooking.status === 'in-progress' ? 'In Progress' : selectedBooking.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Information Section */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('customer')}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <User className="w-5 h-5 mr-2 text-blue-600" />
                      Customer Information
                    </h3>
                    {expandedSections.customer ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  
                  {expandedSections.customer && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg mr-3">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Name</p>
                          <p className="font-medium">
                            {selectedBooking.customer?.name || 'Not specified'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg mr-3">
                          <Phone className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium">
                            {maskPhoneNumber(selectedBooking.customer?.phone)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg mr-3">
                          <Mail className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">
                            {selectedBooking.customer?.email || 'Not specified'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg mr-3">
                          <Star className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Customer Since</p>
                          <p className="font-medium">
                            {selectedBooking.customer?.createdAt ? formatDate(selectedBooking.customer.createdAt) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Service Information Section */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('service')}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      {getServiceIcon(selectedBooking.services?.[0]?.service?.category)}
                      <span className="ml-2">Service Information</span>
                    </h3>
                    {expandedSections.service ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  
                  {expandedSections.service && (
                    <div className="mt-4 space-y-4">
                      {selectedBooking.services?.map((service, index) => (
                        <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {service.service?.title || 'Service'}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {service.service?.description || 'No description available'}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-medium text-gray-900">
                                ₹{service.price?.toFixed(2) || '0.00'}
                              </p>
                              <p className="text-sm text-gray-500">
                                Qty: {service.quantity || 1}
                              </p>
                            </div>
                          </div>
                          {service.discountAmount > 0 && (
                            <div className="flex items-center mt-2 text-sm text-green-600">
                              <Percent className="w-4 h-4 mr-1" />
                              <span>Discount: ₹{service.discountAmount?.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {selectedBooking.status === 'in-progress' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Service Completion Photos
                          </label>
                          <div className="flex items-center space-x-4">
                            <label className="cursor-pointer">
                              <div className="px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 transition-colors">
                                <div className="flex items-center justify-center">
                                  <Camera className="w-5 h-5 mr-2 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-600">
                                    Add Photos
                                  </span>
                                </div>
                              </div>
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) => handlePhotoUpload(selectedBooking._id, e.target.files)}
                                className="hidden"
                              />
                            </label>
                            {servicePhotos[selectedBooking._id]?.length > 0 && (
                              <span className="text-sm text-gray-500">
                                {servicePhotos[selectedBooking._id].length} photo(s) selected
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment Information Section */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('payment')}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                      Payment Information
                    </h3>
                    {expandedSections.payment ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  
                  {expandedSections.payment && (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3">
                            <Wallet className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Payment Method</p>
                            <p className="font-medium capitalize">
                              {selectedBooking.paymentMethod || 'Not specified'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 rounded-lg mr-3">
                            <CheckSquare className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Payment Status</p>
                            <p className="font-medium capitalize">
                              {selectedBooking.paymentStatus || 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">₹{calculateSubtotal(selectedBooking)}</span>
                        </div>
                        {selectedBooking.commission?.amount > 0 && (
                          <div className="flex justify-between py-2 text-gray-600">
                            <span>Platform Commission ({selectedBooking.commission?.rate || 0}%):</span>
                            <span>-₹{selectedBooking.commission?.amount?.toFixed(2) || '0.00'}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-2 border-t border-gray-200 mt-2">
                          <span className="text-gray-900 font-medium">Net Amount:</span>
                          <span className="text-gray-900 font-bold">₹{calculateNetAmount(selectedBooking)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Address Information Section */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('address')}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                      Service Address
                    </h3>
                    {expandedSections.address ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  
                  {expandedSections.address && (
                    <div className="mt-4">
                      <p className="font-medium">
                        {formatAddress(selectedBooking.address)}
                      </p>
                      {selectedBooking.address?.coordinates && (
                        <div className="mt-4 h-48 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                          Map View (Coordinates: {selectedBooking.address.coordinates.join(', ')})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                {selectedBooking.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleBookingAction(selectedBooking._id, 'accept')}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 border border-transparent text-sm font-medium rounded-xl text-white hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <Check className="w-4 h-4 mr-2 inline" />
                      Accept Booking
                    </button>
                    <button
                      onClick={() => handleBookingAction(selectedBooking._id, 'reject', { reason: 'Provider declined' })}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 border border-transparent text-sm font-medium rounded-xl text-white hover:from-red-600 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <X className="w-4 h-4 mr-2 inline" />
                      Reject Booking
                    </button>
                  </>
                )}

                {selectedBooking.status === 'accepted' && (
                  <button
                    onClick={() => handleBookingAction(selectedBooking._id, 'start')}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 border border-transparent text-sm font-medium rounded-xl text-white hover:from-purple-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Play className="w-4 h-4 mr-2 inline" />
                    Start Service
                  </button>
                )}

                {selectedBooking.status === 'in-progress' && (
                  <button
                    onClick={() => handleBookingAction(selectedBooking._id, 'complete', { photos: servicePhotos[selectedBooking._id] })}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 border border-transparent text-sm font-medium rounded-xl text-white hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <CheckCircle className="w-4 h-4 mr-2 inline" />
                    Mark as Completed
                  </button>
                )}


                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: '', data: null })}
        onConfirm={handleConfirmAction}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />
    </div>
  );
};

export default ProviderBooking;