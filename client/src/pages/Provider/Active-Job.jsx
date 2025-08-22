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
  Banknote,
  FileText,
  Users,
  Target
} from 'lucide-react';

// Confirmation Dialog Component
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

// Main Active Jobs Component
const ActiveJobs = () => {
  const { token, API, showToast, user } = useAuth();
  
  // State Management
  const [activeJobs, setActiveJobs] = useState([]);
  const [allBookings, setAllBookings] = useState({
    accepted: [],
    'in-progress': [],
    completed: [],
    cancelled: []
  });
  const [error, setError] = useState(null);
  
  // Filter and Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // UI States
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', data: null });
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);

  // Utility Functions
  const maskPhoneNumber = useCallback((phone) => {
    if (!phone) return 'N/A';
    const phoneStr = phone.toString();
    if (phoneStr.length >= 4) {
      return `****${phoneStr.slice(-6)}`;
    }
    return phoneStr;
  }, []);

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

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';

      return date.toLocaleDateString('en-IN', {
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

  // Status and Service Icon Functions
  const getStatusColor = useCallback((status) => {
    switch (status?.toLowerCase()) {
      case 'accepted': return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 shadow-blue-100';
      case 'in-progress': return 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-purple-200 shadow-purple-100';
      case 'completed': return 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 shadow-green-100';
      case 'cancelled': return 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 shadow-red-100';
      default: return 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border-gray-200 shadow-gray-100';
    }
  }, []);

  const getStatusIcon = useCallback((status) => {
    switch (status?.toLowerCase()) {
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

  // API Functions
  const fetchBookings = useCallback(async (status) => {
    try {
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
      return data.data || [];
    } catch (err) {
      console.error(`Error fetching ${status} bookings:`, err);
      throw err;
    }
  }, [API, token]);

  const fetchAllBookings = useCallback(async () => {
    try {
      setError(null);

      const [accepted, inProgress, completed, cancelled] = await Promise.all([
        fetchBookings('accepted'),
        fetchBookings('in-progress'),
        fetchBookings('completed'),
        fetchBookings('cancelled')
      ]);

      const bookingsData = {
        accepted,
        'in-progress': inProgress,
        completed,
        cancelled
      };

      setAllBookings(bookingsData);
      
      // Set active jobs (accepted + in-progress)
      const activeJobsList = [...accepted, ...inProgress];
      setActiveJobs(activeJobsList);

    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    }
  }, [fetchBookings, showToast]);

  // Job Action Handlers
  const handleJobAction = useCallback(async (jobId, action, additionalData = {}) => {
    // Show confirmation dialog for critical actions
    if (['start', 'complete', 'cancel'].includes(action)) {
      const dialogConfig = {
        start: {
          type: 'success',
          title: 'Start Job',
          message: 'Are you sure you want to start this job? This will change the status to "In Progress".'
        },
        complete: {
          type: 'success',
          title: 'Mark Job Completed',
          message: 'Are you sure you want to mark this job as completed? This action cannot be undone.'
        },
        cancel: {
          type: 'danger',
          title: 'Cancel Job',
          message: 'Are you sure you want to cancel this job? This action cannot be undone and may affect your rating.'
        }
      };

      setConfirmDialog({
        isOpen: true,
        ...dialogConfig[action],
        data: { jobId, action, additionalData }
      });
      return;
    }

    await executeJobAction(jobId, action, additionalData);
  }, []);

  const executeJobAction = useCallback(async (jobId, action, additionalData = {}) => {
    try {
      if (!jobId) {
        showToast('Booking ID is missing. Please try again.', 'error');
        return;
      }

      let endpoint, method, body = {};
      
      switch (action) {
        case 'start':
          endpoint = `${API}/booking/provider/${jobId}/start`;
          method = 'PATCH';
          break;
        case 'complete':
          endpoint = `${API}/booking/provider/${jobId}/complete`;
          method = 'PATCH';
          if (additionalData.photos) body.servicePhotos = additionalData.photos;
          break;
        case 'cancel':
          endpoint = `${API}/booking/provider/${jobId}/reject`;
          method = 'PATCH';
          body.reason = additionalData.reason || 'Provider cancelled';
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
        let errorMessage = errorData.message || `Failed to ${action} job`;
        
        if (response.status === 404) {
          errorMessage = 'Job not found or not available for this action';
        } else if (response.status === 403) {
          errorMessage = 'Permission denied';
        } else if (response.status === 400) {
          errorMessage = 'Invalid request';
        }

        showToast(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      const result = await response.json();
      showToast(result.message || `Job ${action}ed successfully`, 'success');

      // Update data to get updated status
      await fetchAllBookings();
      
      setShowJobModal(false);
      setSelectedJob(null);
      setConfirmDialog({ isOpen: false, type: '', data: null });
    } catch (err) {
      console.error(`Error ${action}ing job ${jobId}:`, err);
    }
  }, [API, token, showToast, fetchAllBookings]);

  const handleConfirmAction = useCallback(() => {
    const { data } = confirmDialog;
    if (data) {
      executeJobAction(data.jobId, data.action, data.additionalData);
    }
  }, [confirmDialog, executeJobAction]);

  const getJobDetails = useCallback(async (jobId) => {
    try {
      const response = await fetch(`${API}/booking/provider-booking/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch job details');
      }

      const data = await response.json();
      setSelectedJob(data.data || null);
      setShowJobModal(true);
    } catch (err) {
      showToast(err.message, 'error');
      setShowJobModal(false);
    }
  }, [API, token, showToast]);

  // Dashboard Statistics
  const dashboardStats = useMemo(() => {
    const totalActiveJobs = allBookings.accepted.length + allBookings['in-progress'].length;
    const jobsInProgress = allBookings['in-progress'].length;
    
    // Calculate completed today
    const today = new Date().toISOString().split('T')[0];
    const completedToday = allBookings.completed.filter(job => 
      new Date(job.serviceCompletedAt || job.updatedAt).toISOString().split('T')[0] === today
    ).length;
    
    const cancelledJobs = allBookings.cancelled.length;
    
    return {
      totalActiveJobs,
      jobsInProgress,
      completedToday,
      cancelledJobs
    };
  }, [allBookings]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    let filtered = [...activeJobs];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job =>
        (job.customer?.name?.toLowerCase().includes(query)) ||
        (job.services?.some(service =>
          service.service?.title?.toLowerCase().includes(query) ||
          service.service?.category?.toLowerCase().includes(query))) ||
        (job._id?.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    // Apply service filter
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(job =>
        job.services?.some(service =>
          service.service?.category?.toLowerCase() === serviceFilter.toLowerCase()
        )
      );
    }

    // Apply date filter
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(job => 
        new Date(job.date).toISOString().split('T')[0] === today
      );
    } else if (dateFilter === 'upcoming') {
      const today = new Date();
      filtered = filtered.filter(job => new Date(job.date) >= today);
    } else if (dateFilter === 'past') {
      const today = new Date();
      filtered = filtered.filter(job => new Date(job.date) < today);
    }

    return filtered;
  }, [activeJobs, searchQuery, statusFilter, serviceFilter, dateFilter]);

  // Get unique service categories for filter
  const serviceCategories = useMemo(() => {
    const categories = new Set();
    activeJobs.forEach(job => {
      job.services?.forEach(service => {
        if (service.service?.category) {
          categories.add(service.service.category);
        }
      });
    });
    return Array.from(categories);
  }, [activeJobs]);

  // Initial data fetch
  useEffect(() => {
    if (token) {
      fetchAllBookings();
    }
  }, [token, fetchAllBookings]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchAllBookings}
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
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
                  Active Jobs
                </h1>
                <p className="text-gray-600 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Manage your accepted and in-progress jobs
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Active Jobs */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Active Jobs</p>
                <p className="text-2xl font-bold text-blue-600">{dashboardStats.totalActiveJobs}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Jobs in Progress */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Jobs in Progress</p>
                <p className="text-2xl font-bold text-purple-600">{dashboardStats.jobsInProgress}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Timer className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Completed Today */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">{dashboardStats.completedToday}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Cancelled Jobs */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelled Jobs</p>
                <p className="text-2xl font-bold text-red-600">{dashboardStats.cancelledJobs}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <X className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by booking ID, customer name, or service..."
                className="pl-12 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute left-4 top-3.5 text-gray-400">
                <Search className="w-5 h-5" />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 font-medium hover:shadow-md transition-all min-w-[140px]"
                >
                  <option value="all">All Status</option>
                  <option value="accepted">Accepted</option>
                  <option value="in-progress">In Progress</option>
                </select>
                <div className="absolute right-3 top-3.5 text-gray-400 pointer-events-none">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {/* Date Filter */}
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 font-medium hover:shadow-md transition-all min-w-[120px]"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
                <div className="absolute right-3 top-3.5 text-gray-400 pointer-events-none">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>

              {/* Service Category Filter */}
              <div className="relative">
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 font-medium hover:shadow-md transition-all min-w-[140px]"
                >
                  <option value="all">All Services</option>
                  {serviceCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3.5 text-gray-400 pointer-events-none">
                  <Filter className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all' || serviceFilter !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-600">Active Filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Search className="w-3 h-3 mr-1" />
                    Search: "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery('')}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {getStatusIcon(statusFilter)}
                    <span className="ml-1 capitalize">{statusFilter === 'in-progress' ? 'In Progress' : statusFilter}</span>
                    <button
                      onClick={() => setStatusFilter('all')}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {dateFilter !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span className="capitalize">{dateFilter}</span>
                    <button
                      onClick={() => setDateFilter('all')}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {serviceFilter !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <Package className="w-3 h-3 mr-1" />
                    <span>{serviceFilter}</span>
                    <button
                      onClick={() => setServiceFilter('all')}
                      className="ml-2 text-orange-600 hover:text-orange-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setDateFilter('all');
                    setServiceFilter('all');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <ClipboardList className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Jobs Found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || statusFilter !== 'all' || dateFilter !== 'all' || serviceFilter !== 'all'
                    ? "No jobs match your current filters. Try adjusting your search criteria."
                    : "You don't have any active jobs at the moment. New bookings will appear here once accepted."}
                </p>
                {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all' || serviceFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setDateFilter('all');
                      setServiceFilter('all');
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job._id} className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="p-6">
                  {/* Job Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl">
                        {getServiceIcon(job.services?.[0]?.service?.category)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          Booking #{job._id?.slice(-8)?.toUpperCase()}
                        </h3>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border shadow-sm ${getStatusColor(job.status)}`}>
                            {getStatusIcon(job.status)}
                            <span className="ml-1 capitalize">
                              {job.status === 'in-progress' ? 'In Progress' : job.status}
                            </span>
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(job.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => getJobDetails(job._id)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>

                  {/* Job Content */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Customer Info */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        <User className="w-4 h-4 mr-2 text-blue-500" />
                        Customer Details
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {job.customer?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{job.customer?.name || 'Unknown Customer'}</p>
                            <p className="text-sm text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {maskPhoneNumber(job.customer?.phone)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {formatAddress(job.address)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Service Details */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        <Package className="w-4 h-4 mr-2 text-green-500" />
                        Services
                      </h4>
                      <div className="space-y-3">
                        {job.services?.map((serviceItem, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900 flex items-center">
                                {getServiceIcon(serviceItem.service?.category)}
                                <span className="ml-2">{serviceItem.service?.title || 'Service'}</span>
                              </h5>
                              <span className="text-sm font-semibold text-green-600">
                                ₹{serviceItem.service?.price || 0}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">
                              {serviceItem.service?.category || 'General'}
                            </p>
                            {serviceItem.service?.description && (
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {serviceItem.service.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Schedule & Payment */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-purple-500" />
                        Schedule & Payment
                      </h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-700">Scheduled Date</span>
                            <Calendar className="w-4 h-4 text-blue-500" />
                          </div>
                          <p className="text-sm font-semibold text-blue-900">
                            {formatDate(job.date)}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-purple-700">Time Slot</span>
                            <Clock className="w-4 h-4 text-purple-500" />
                          </div>
                          <p className="text-sm font-semibold text-purple-900">
                            {formatTime(job.timeSlot)}
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-green-700">Total Amount</span>
                            <DollarSign className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-lg font-bold text-green-900">
                            ₹{job.totalAmount || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-3">
                      {job.status === 'accepted' && (
                        <button
                          onClick={() => handleJobAction(job._id, 'start')}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2"
                        >
                          <Play className="w-4 h-4" />
                          <span>Start Job</span>
                        </button>
                      )}
                      {job.status === 'in-progress' && (
                        <button
                          onClick={() => handleJobAction(job._id, 'complete')}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Mark Complete</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleJobAction(job._id, 'cancel')}
                        className="px-4 py-3 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 hover:border-red-400 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel Job</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Job Details Modal */}
        {showJobModal && selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl">
                      {getServiceIcon(selectedJob.services?.[0]?.service?.category)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Booking #{selectedJob._id?.slice(-8)?.toUpperCase()}
                      </h2>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border shadow-sm ${getStatusColor(selectedJob.status)}`}>
                          {getStatusIcon(selectedJob.status)}
                          <span className="ml-1 capitalize">
                            {selectedJob.status === 'in-progress' ? 'In Progress' : selectedJob.status}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowJobModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Customer Information */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <User className="w-5 h-5 mr-2 text-blue-500" />
                        Customer Information
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {selectedJob.customer?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{selectedJob.customer?.name || 'Unknown Customer'}</p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {maskPhoneNumber(selectedJob.customer?.phone)}
                            </p>
                            {selectedJob.customer?.email && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <Mail className="w-4 h-4 mr-1" />
                                {selectedJob.customer.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            Service Address
                          </p>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {formatAddress(selectedJob.address)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Schedule Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-purple-500" />
                        Schedule Information
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-white rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">Date</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatDate(selectedJob.date)}
                            </p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">Time</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatTime(selectedJob.timeSlot)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Package className="w-5 h-5 mr-2 text-green-500" />
                        Service Details
                      </h3>
                      <div className="space-y-4">
                        {selectedJob.services?.map((serviceItem, index) => (
                          <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900 flex items-center">
                                {getServiceIcon(serviceItem.service?.category)}
                                <span className="ml-2">{serviceItem.service?.title || 'Service'}</span>
                              </h4>
                              <span className="text-lg font-bold text-green-600">
                                ₹{serviceItem.service?.price || 0}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Category:</span> {serviceItem.service?.category || 'General'}
                              </p>
                              {serviceItem.service?.description && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Description:</span> {serviceItem.service.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CreditCard className="w-5 h-5 mr-2 text-indigo-500" />
                        Payment Information
                      </h3>
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-green-700">Total Amount</span>
                          <span className="text-2xl font-bold text-green-900">
                            ₹{selectedJob.totalAmount || 0}
                          </span>
                        </div>
                        <p className="text-sm text-green-600 mt-2">
                          Payment Method: {selectedJob.paymentMethod || 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {selectedJob.status === 'accepted' && (
                      <button
                        onClick={() => handleJobAction(selectedJob._id, 'start')}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2"
                      >
                        <Play className="w-5 h-5" />
                        <span>Start Job</span>
                      </button>
                    )}
                    {selectedJob.status === 'in-progress' && (
                      <button
                        onClick={() => handleJobAction(selectedJob._id, 'complete')}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        <span>Mark Complete</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleJobAction(selectedJob._id, 'cancel')}
                      className="px-6 py-3 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 hover:border-red-400 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
                    >
                      <X className="w-5 h-5" />
                      <span>Cancel Job</span>
                    </button>
                  </div>
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
    </div>
  );
};

export default ActiveJobs;
