import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { 
  Search, Check, RotateCcw, AlertCircle, Calendar, 
  Wrench, Clock, DollarSign, Filter, Download, Eye, MessageSquare,
  TrendingUp, Users, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  Grid3X3, List, Zap, Shield, Star, Activity, BarChart3, FileText,
  Phone, Mail, MapPin, Image as ImageIcon, X, Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminComplaints = () => {
  const { API, isAdmin, logoutUser, showToast } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedComplaints, setSelectedComplaints] = useState([]);
  const [viewMode, setViewMode] = useState('cards');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      logoutUser();
      return;
    }
    fetchComplaints();
  }, [isAdmin]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/complaint/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setComplaints(data.complaints || []);
      } else {
        showToast(data.message || 'Failed to fetch complaints', 'error');
        setComplaints([]);
      }
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showToast('Network error: Unable to connect to server', 'error');
      } else {
        showToast('Error fetching complaints', 'error');
      }
      console.error('Error fetching complaints:', error);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveComplaint = async () => {
    if (!responseText.trim()) {
      showToast('Please provide a response before resolving the complaint', 'error');
      return;
    }

    if (responseText.trim().length < 10) {
      showToast('Response must be at least 10 characters long', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API}/complaint/${selectedComplaint._id}/resolve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ response: responseText.trim() })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        showToast('Complaint resolved successfully');
        setIsResolveModalOpen(false);
        setSelectedComplaint(null);
        setResponseText('');
        fetchComplaints();
      } else {
        showToast(data.message || 'Failed to resolve complaint', 'error');
      }
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showToast('Network error: Unable to connect to server', 'error');
      } else {
        showToast('Error resolving complaint', 'error');
      }
      console.error('Error resolving complaint:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReopenComplaint = async (complaint) => {
    if (!window.confirm('Are you sure you want to reopen this complaint?')) return;

    try {
      setLoading(true);
      const response = await fetch(`${API}/complaint/${complaint._id}/reopen`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          reason: 'Reopened by admin for further investigation' 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        showToast('Complaint reopened successfully');
        fetchComplaints();
      } else {
        showToast(data.message || 'Failed to reopen complaint', 'error');
      }
    } catch (error) {
      showToast('Network error: Unable to reopen complaint', 'error');
      console.error('Error reopening complaint:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredComplaints = complaints.filter(complaint => {
    const searchStr = searchText.toLowerCase();
    const matchesSearch = (
      complaint.customer?.name?.toLowerCase().includes(searchStr) ||
      complaint.provider?.name?.toLowerCase().includes(searchStr) ||
      complaint.message?.toLowerCase().includes(searchStr) ||
      complaint._id.toLowerCase().includes(searchStr) ||
      (complaint.booking?.serviceType?.toLowerCase().includes(searchStr)) ||
      (complaint.booking?._id.toLowerCase().includes(searchStr))
    );

    const matchesFilter = filterStatus === 'all' || complaint.status === filterStatus;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  const getStatusBadge = (status) => {
    if (status === 'open') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="mr-1.5" size={12} />
          Open
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200">
        <CheckCircle2 className="mr-1.5" size={12} />
        Resolved
      </span>
    );
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatBookingDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const stats = {
    total: complaints.length,
    open: complaints.filter(c => c.status === 'open').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
    thisMonth: complaints.filter(c => {
      const complaintDate = new Date(c.createdAt);
      const now = new Date();
      return complaintDate.getMonth() === now.getMonth() && complaintDate.getFullYear() === now.getFullYear();
    }).length
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, subtitle, percentage }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative overflow-hidden bg-gradient-to-br ${color} rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/20 backdrop-blur-sm`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full"></div>
      <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-white/5 rounded-full"></div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-white/90 uppercase tracking-wide">{title}</p>
              {percentage && (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  percentage > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {percentage > 0 ? '+' : ''}{percentage}%
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-white mb-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-white/70">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center mt-3 text-sm text-green-300">
                <TrendingUp size={14} className="mr-1" />
                <span className="font-medium">{trend}</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
            <Icon size={28} className="text-white" />
          </div>
        </div>
        
        {/* Progress bar for visual enhancement */}
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((value / stats.total) * 100, 100)}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full bg-gradient-to-r from-white/60 to-white/80 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );

  const ComplaintCard = ({ complaint, index }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 border border-gray-100/50 overflow-hidden"
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Priority indicator */}
      <div className={`absolute top-0 left-0 w-1 h-full ${
        complaint.status === 'open' ? 'bg-gradient-to-b from-red-400 to-orange-400' : 'bg-gradient-to-b from-green-400 to-emerald-400'
      }`}></div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {complaint.customer?.name?.charAt(0) || 'U'}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                complaint.status === 'open' ? 'bg-red-400' : 'bg-green-400'
              }`}></div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors duration-300">
                {complaint.customer?.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Mail size={14} className="text-gray-400" />
                <p className="text-sm text-gray-600">{complaint.customer?.email}</p>
              </div>
              {complaint.customer?.phone && (
                <div className="flex items-center gap-2 mt-1">
                  <Phone size={14} className="text-gray-400" />
                  <p className="text-sm text-gray-600">{complaint.customer?.phone}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(complaint.status)}
            <span className="text-xs text-gray-500 font-medium">
              ID: #{complaint._id.substring(0, 8)}
            </span>
          </div>
        </div>

        {/* Complaint Message */}
        <div className="mb-6">
          <div className="bg-gray-50/80 rounded-xl p-4 border-l-4 border-blue-400">
            <div className="flex items-start gap-2 mb-2">
              <MessageSquare size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <h4 className="font-semibold text-gray-800 text-sm">Complaint Details</h4>
            </div>
            <p className="text-gray-700 leading-relaxed text-sm">{complaint.message}</p>
          </div>
        </div>

        {/* Provider Info */}
        {complaint.provider && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                {complaint.provider.name?.charAt(0) || 'P'}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Provider: {complaint.provider.name}</p>
                <p className="text-xs text-gray-600">{complaint.provider.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={16} className="text-blue-400" />
            <div>
              <p className="font-medium">Created</p>
              <p className="text-xs">{formatDate(complaint.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={16} className="text-green-400" />
            <div>
              <p className="font-medium">Priority</p>
              <p className="text-xs">{complaint.status === 'open' ? 'High' : 'Resolved'}</p>
            </div>
          </div>
        </div>

        {/* Image Proof */}
        {complaint.imageProof && (
          <div className="mb-6">
            <div className="relative group/image">
              <img
                src={complaint.imageProof.startsWith('http') ? complaint.imageProof : `${API.replace('/api', '')}/${complaint.imageProof}`}
                alt="Complaint proof"
                className="w-full h-32 object-cover rounded-xl border border-gray-200 group-hover/image:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.style.display = 'none';
                  console.error('Failed to load complaint image:', complaint.imageProof);
                }}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 rounded-xl transition-colors duration-300 flex items-center justify-center">
                <Eye className="text-white opacity-0 group-hover/image:opacity-100 transition-opacity duration-300" size={24} />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex space-x-2">
            {complaint.status === 'open' ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedComplaint(complaint);
                  setIsResolveModalOpen(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Check className="mr-2" size={16} />
                Resolve
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleReopenComplaint(complaint)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <RotateCcw className="mr-2" size={16} />
                Reopen
              </motion.button>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedComplaint(complaint);
              setIsBookingModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Eye className="mr-2" size={16} />
            Details
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'
    } ${isFullscreen ? 'p-0' : 'p-4 md:p-6'}`}>
      <div className={`${isFullscreen ? 'h-full' : 'max-w-7xl'} mx-auto ${isFullscreen ? 'p-6' : ''}`}>
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5 rounded-3xl -z-10"></div>
          
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 p-6 bg-white/60 backdrop-blur-sm rounded-3xl border border-white/20 shadow-xl">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Complaints Management
                  </h1>
                  <p className="text-gray-600 mt-2 text-lg">Monitor and resolve customer complaints with advanced analytics</p>
                </div>
              </div>
              
              {/* Quick stats in header */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-800">{stats.total} Total</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-full">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-semibold text-red-800">{stats.open} Open</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-800">{stats.resolved} Resolved</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {isFullscreen ? <Minimize2 className="mr-2" size={18} /> : <Maximize2 className="mr-2" size={18} />}
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => showToast('Export functionality coming soon')}
                className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Download className="mr-2" size={18} />
                Export
              </motion.button>
              
              {selectedComplaints.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    showToast(`${selectedComplaints.length} complaints resolved successfully`);
                    setSelectedComplaints([]);
                  }}
                  className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Check className="mr-2" size={18} />
                  Resolve Selected ({selectedComplaints.length})
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Complaints"
            value={stats.total}
            icon={MessageSquare}
            color="from-blue-500 via-blue-600 to-blue-700"
            trend="+12% from last month"
            subtitle="All time complaints"
            percentage={12}
          />
          <StatCard
            title="Open Complaints"
            value={stats.open}
            icon={AlertTriangle}
            color="from-red-500 via-red-600 to-red-700"
            subtitle="Requires attention"
            percentage={-5}
          />
          <StatCard
            title="Resolved"
            value={stats.resolved}
            icon={CheckCircle2}
            color="from-green-500 via-green-600 to-green-700"
            subtitle="Successfully closed"
            percentage={18}
          />
          <StatCard
            title="This Month"
            value={stats.thisMonth}
            icon={Calendar}
            color="from-purple-500 via-purple-600 to-purple-700"
            subtitle="Current month activity"
            percentage={8}
          />
        </div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search complaints, customers, providers..."
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  showFilters 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                <Filter className="mr-2" size={16} />
                Filters
                {showFilters ? <ChevronUp className="ml-1" size={16} /> : <ChevronDown className="ml-1" size={16} />}
              </button>

              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="status">By Status</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setFilterStatus('all');
                        setSortBy('newest');
                        setSearchText('');
                      }}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Complaints Display */}
        <AnimatePresence mode="wait">
          {loading && complaints.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-xl shadow-lg p-12 text-center"
            >
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading complaints...</p>
            </motion.div>
          ) : complaints.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-xl shadow-lg p-12 text-center"
            >
              <MessageSquare className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">No complaints found.</p>
            </motion.div>
          ) : viewMode === 'cards' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {filteredComplaints.length > 0 ? (
                filteredComplaints.map((complaint, index) => (
                  <ComplaintCard key={complaint._id} complaint={complaint} index={index} />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <MessageSquare className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-600 text-lg">No complaints match your current filters.</p>
                  <button
                    onClick={() => {
                      setFilterStatus('all');
                      setSortBy('newest');
                      setSearchText('');
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100"
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <tr>
                      <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={filteredComplaints.length > 0 && selectedComplaints.length === filteredComplaints.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedComplaints(filteredComplaints.map(c => c._id));
                            } else {
                              setSelectedComplaints([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Customer</th>
                      <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Provider</th>
                      <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Complaint</th>
                      <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Date</th>
                      <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredComplaints.map((complaint, index) => (
                      <motion.tr
                        key={complaint._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
                      >
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedComplaints.includes(complaint._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedComplaints([...selectedComplaints, complaint._id]);
                              } else {
                                setSelectedComplaints(selectedComplaints.filter(id => id !== complaint._id));
                              }
                            }}
                          />
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold mr-2 sm:mr-3 text-xs sm:text-sm">
                              {complaint.customer?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-900 truncate">{complaint.customer?.name || 'Unknown'}</div>
                              <div className="text-xs sm:text-sm text-gray-500 truncate">{complaint.customer?.email || 'No email'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-sm font-medium text-gray-900">{complaint.provider?.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{complaint.provider?.email || 'No email'}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 max-w-xs">
                          <div className="text-sm text-gray-900 line-clamp-2" title={complaint.message}>
                            {complaint.message || 'No message provided'}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                          <div className="text-sm text-gray-900">{formatDate(complaint.createdAt)}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(complaint.status)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {complaint.status === 'open' ? (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setSelectedComplaint(complaint);
                                  setIsResolveModalOpen(true);
                                }}
                                className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm"
                              >
                                <Check className="mr-1" size={12} />
                                Resolve
                              </motion.button>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleReopenComplaint(complaint)}
                                className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-medium rounded-lg hover:from-amber-600 hover:to-yellow-600 transition-all duration-200 shadow-sm"
                              >
                                <RotateCcw className="mr-1" size={12} />
                                Reopen
                              </motion.button>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setSelectedComplaint(complaint);
                                setIsBookingModalOpen(true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs font-medium rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-sm"
                            >
                              <Eye className="mr-1" size={12} />
                              View
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Resolve Complaint Modal */}
      {isResolveModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="resolve-modal-title">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={(e) => {
                e.stopPropagation();
                setIsResolveModalOpen(false);
                setResponseText('');
              }}
            >
              <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <div className="flex justify-between items-center mb-4">
                      <h3 id="resolve-modal-title" className="text-lg leading-6 font-medium text-gray-900">
                        Resolve Complaint #{selectedComplaint._id.substring(0, 8)}
                      </h3>
                      <button
                        onClick={() => {
                          setIsResolveModalOpen(false);
                          setResponseText('');
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close modal"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Response</label>
                        <textarea
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                          placeholder="Enter your response to the complaint... (minimum 10 characters)"
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          maxLength={1000}
                          required
                        />
                        <div className="flex justify-between items-center mt-1">
                          <span className={`text-xs ${responseText.length < 10 ? 'text-red-500' : 'text-gray-500'}`}>
                            {responseText.length < 10 ? `${10 - responseText.length} more characters needed` : `${responseText.length}/1000 characters`}
                          </span>
                          {responseText.length >= 1000 && (
                            <span className="text-xs text-red-500">Maximum length reached</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-md">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Complaint Details</h4>
                        <div className="space-y-2 text-sm text-gray-700">
                          <p><span className="font-medium">Customer:</span> {selectedComplaint.customer?.name || 'N/A'}</p>
                          <p><span className="font-medium">Provider:</span> {selectedComplaint.provider?.name || 'N/A'}</p>
                          <p><span className="font-medium">Message:</span> {selectedComplaint.message || 'N/A'}</p>
                          {selectedComplaint.imageProof && (
                            <div className="mt-2">
                              <img
                                src={selectedComplaint.imageProof.startsWith('http') ? selectedComplaint.imageProof : `${API.replace('/api', '')}/${selectedComplaint.imageProof}`}
                                alt="Complaint proof"
                                className="max-w-full h-auto max-h-40 rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  console.error('Failed to load complaint image in modal:', selectedComplaint.imageProof);
                                }}
                                onClick={() => window.open(selectedComplaint.imageProof.startsWith('http') ? selectedComplaint.imageProof : `${API.replace('/api', '')}/${selectedComplaint.imageProof}`, '_blank')}
                                loading="lazy"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedComplaint.booking && (
                        <div className="bg-blue-50 p-4 rounded-md">
                          <h4 className="text-sm font-medium text-blue-800 mb-2">Booking Details</h4>
                          <div className="space-y-2 text-sm text-gray-700">
                            <p className="flex items-center">
                              <Wrench className="mr-2" size={14} />
                              <span className="font-medium">Service:</span> {selectedComplaint.booking.serviceType || 'N/A'}
                            </p>
                            <p className="flex items-center">
                              <Calendar className="mr-2" size={14} />
                              <span className="font-medium">Date:</span> {selectedComplaint.booking.date ? formatBookingDate(selectedComplaint.booking.date) : 'N/A'}
                            </p>
                            <p className="flex items-center">
                              <Clock className="mr-2" size={14} />
                              <span className="font-medium">Time Slot:</span> {selectedComplaint.booking.timeSlot || 'N/A'}
                            </p>
                            <p className="flex items-center">
                              <DollarSign className="mr-2" size={14} />
                              <span className="font-medium">Amount:</span> ₹{selectedComplaint.booking.amount || '0'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${
                    loading || !responseText.trim() || responseText.length < 10
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  onClick={handleResolveComplaint}
                  disabled={loading || !responseText.trim() || responseText.length < 10}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Resolving...
                    </div>
                  ) : (
                    'Submit Resolution'
                  )}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setIsResolveModalOpen(false);
                    setResponseText('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {isBookingModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={(e) => {
                e.stopPropagation();
                setIsBookingModalOpen(false);
              }}
            >
              <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <div className="flex justify-between items-center mb-4">
                      <h3 id="booking-modal-title" className="text-lg leading-6 font-medium text-gray-900">
                        Booking Details for Complaint #{selectedComplaint._id.substring(0, 8)}
                      </h3>
                      <button
                        onClick={() => setIsBookingModalOpen(false)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close modal"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {selectedComplaint.booking ? (
                        <div className="bg-blue-50 p-4 rounded-md">
                          <h4 className="text-sm font-medium text-blue-800 mb-2">Booking Information</h4>
                          <div className="space-y-2 text-sm text-gray-700">
                            <p className="flex items-center">
                              <Wrench className="mr-2" size={14} />
                              <span className="font-medium">Service Type:</span> {selectedComplaint.booking.service || selectedComplaint.booking.serviceType || 'N/A'}
                            </p>
                            <p className="flex items-center">
                              <Calendar className="mr-2" size={14} />
                              <span className="font-medium">Booking Date:</span> {selectedComplaint.booking.date ? formatBookingDate(selectedComplaint.booking.date) : 'N/A'}
                            </p>
                            <p className="flex items-center">
                              <Clock className="mr-2" size={14} />
                              <span className="font-medium">Time Slot:</span> {selectedComplaint.booking.timeSlot || 'N/A'}
                            </p>
                            <p className="flex items-center">
                              <DollarSign className="mr-2" size={14} />
                              <span className="font-medium">Amount Paid:</span> ₹{selectedComplaint.booking.amount || '0'}
                            </p>
                            <p className="flex items-center">
                              <span className="font-medium">Booking Status:</span>
                              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                selectedComplaint.booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                selectedComplaint.booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {selectedComplaint.booking.status || 'N/A'}
                              </span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 p-4 rounded-md">
                          <p className="text-sm text-yellow-800">No booking information available for this complaint.</p>
                        </div>
                      )}

                      <div className="bg-blue-50 p-4 rounded-md">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Customer Details</h4>
                        <div className="space-y-2 text-sm text-gray-700">
                          <p><span className="font-medium">Name:</span> {selectedComplaint.customer?.name || 'N/A'}</p>
                          <p><span className="font-medium">Email:</span> {selectedComplaint.customer?.email || 'N/A'}</p>
                          <p><span className="font-medium">Phone:</span> {selectedComplaint.customer?.phone || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-md">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Provider Details</h4>
                        <div className="space-y-2 text-sm text-gray-700">
                          <p><span className="font-medium">Name:</span> {selectedComplaint.provider?.name || 'N/A'}</p>
                          <p><span className="font-medium">Email:</span> {selectedComplaint.provider?.email || 'N/A'}</p>
                          <p><span className="font-medium">Phone:</span> {selectedComplaint.provider?.phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setIsBookingModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminComplaints;
