import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../store/auth';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  Upload,
  Download,
  Settings,
  Star,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  FileText,
  BarChart3,
  TrendingUp,
  Package,
  Activity,
  X,
  Save
} from 'lucide-react';

const AdminServices = () => {
  const { token, API, API_URL_IMAGE, logoutUser, showToast, isAdmin } = useAuth();
  
  // State management
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalRevenue: 0,
    avgRating: 0
  });

  // Form states
  const [createForm, setCreateForm] = useState({
    title: '',
    category: 'Electrical',
    description: '',
    basePrice: '',
    duration: '',
    image: null
  });
  const [editForm, setEditForm] = useState({});
  const [bulkFile, setBulkFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

  // Refs
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const bulkFileInputRef = useRef(null);

  // Categories
  const categories = ['Electrical', 'AC', 'Appliance Repair', 'Other'];

  // Check admin access
  useEffect(() => {
    if (!isAdmin) {
      logoutUser();
      return;
    }
    fetchServices();
  }, [isAdmin]);

  // Filter and search services
  useEffect(() => {
    let filtered = [...services];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(service => service.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(service => service.isActive === isActive);
    }
    
    setFilteredServices(filtered);
  }, [services, searchTerm, categoryFilter, statusFilter]);

  // Calculate stats whenever services change
  useEffect(() => {
    const ratedServices = services.filter(s => s.averageRating && s.averageRating > 0);
    const newStats = {
      total: services.length,
      active: services.filter(s => s.isActive).length,
      inactive: services.filter(s => !s.isActive).length,
      ratedServices: ratedServices.length
    };
    setStats(newStats);
  }, [services]);

  // Fetch all services
  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/service/admin/services`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          logoutUser();
          return;
        }
        throw new Error('Failed to fetch services');
      }
      
      const data = await response.json();
      setServices(data.data || []);
    } catch (error) {
      console.error('Fetch services error:', error);
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle create form changes
  const handleCreateFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image' && files[0]) {
      setCreateForm(prev => ({ ...prev, image: files[0] }));
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(files[0]);
    } else {
      setCreateForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle edit form changes
  const handleEditFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image' && files[0]) {
      setEditForm(prev => ({ ...prev, image: files[0] }));
      const reader = new FileReader();
      reader.onload = (e) => setEditImagePreview(e.target.result);
      reader.readAsDataURL(files[0]);
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Create new service
  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', createForm.title);
      formData.append('category', createForm.category);
      formData.append('description', createForm.description);
      formData.append('basePrice', createForm.basePrice);
      formData.append('duration', createForm.duration);
      if (createForm.image) {
        formData.append('image', createForm.image);
      }

      const response = await fetch(`${API}/service/admin/services`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to create service');
      }

      const data = await response.json();
      setServices(prev => [data.data, ...prev]);
      showToast('Service created successfully!', 'success');
      resetCreateForm();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Create service error:', error);
      showToast(error.message, 'error');
    }
  };

  // Update service
  const handleUpdateService = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(editForm).forEach(key => {
        if (key !== 'image' && editForm[key] !== undefined) {
          formData.append(key, editForm[key]);
        }
      });
      if (editForm.image) {
        formData.append('image', editForm.image);
      }

      const response = await fetch(`${API}/service/admin/service/${selectedService._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to update service');
      }

      const data = await response.json();
      setServices(prev => prev.map(s => s._id === data.data._id ? data.data : s));
      showToast('Service updated successfully!', 'success');
      setShowEditModal(false);
    } catch (error) {
      console.error('Update service error:', error);
      showToast(error.message, 'error');
    }
  };

  // Update service price
  const handleUpdatePrice = async (serviceId, newPrice) => {
    try {
      const response = await fetch(`${API}/service/admin/services/${serviceId}/price`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ basePrice: newPrice })
      });

      if (!response.ok) {
        throw new Error('Failed to update price');
      }

      const data = await response.json();
      setServices(prev => prev.map(s => s._id === data.data._id ? data.data : s));
      showToast('Price updated successfully!', 'success');
    } catch (error) {
      console.error('Update price error:', error);
      showToast(error.message, 'error');
    }
  };

  // Toggle service status
  const handleToggleStatus = async (service) => {
    try {
      let response;
      
      if (service.isActive) {
        // Deactivate service using DELETE endpoint
        response = await fetch(`${API}/service/admin/services/${service._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } else {
        // Activate service using PUT endpoint to update isActive field
        response = await fetch(`${API}/service/admin/service/${service._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ isActive: true })
        });
      }

      if (!response.ok) {
        throw new Error('Failed to update service status');
      }

      // Refetch services to get updated status
      fetchServices();
      showToast(`Service ${service.isActive ? 'deactivated' : 'activated'} successfully!`, 'success');
    } catch (error) {
      console.error('Toggle status error:', error);
      showToast(error.message, 'error');
    }
  };

  // Handle bulk import
  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      showToast('Please select a file', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('servicesFile', bulkFile);

      const response = await fetch(`${API}/service/admin/bulk-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to import services');
      }

      const data = await response.json();
      showToast(`Successfully imported ${data.importedCount} services!`, 'success');
      if (data.errorCount > 0) {
        showToast(`${data.errorCount} services had errors`, 'warning');
      }
      
      fetchServices();
      setShowBulkImportModal(false);
      setBulkFile(null);
    } catch (error) {
      console.error('Bulk import error:', error);
      showToast(error.message, 'error');
    }
  };

  // Reset create form
  const resetCreateForm = () => {
    setCreateForm({
      title: '',
      category: 'Electrical',
      description: '',
      basePrice: '',
      duration: '',
      image: null
    });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle edit click
  const handleEditClick = (service) => {
    setSelectedService(service);
    setEditForm({
      title: service.title,
      category: service.category,
      description: service.description,
      basePrice: service.basePrice,
      duration: service.duration
    });
    setEditImagePreview(service.image ? `${API_URL_IMAGE}/uploads/serviceImages/${service.image}` : null);
    setShowEditModal(true);
  };

  // Handle view click
  const handleViewClick = (service) => {
    setSelectedService(service);
    setShowViewModal(true);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format duration
  const formatDuration = (duration) => {
    const hours = Math.floor(duration);
    const minutes = Math.round((duration - hours) * 60);
    return `${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes}m` : ''}`.trim();
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentServices = filteredServices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Services Management</h1>
            <p className="text-blue-600 mt-1">Manage all your services and offerings</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowBulkImportModal(true)}
              className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              <Upload className="w-5 h-5 mr-2" />
              Bulk Import
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Service
            </button>
            <button
              onClick={fetchServices}
              disabled={loading}
              className="flex items-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Services</p>
                <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Services</p>
                <p className="text-3xl font-bold text-green-900">{stats.active}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Services</p>
                <p className="text-3xl font-bold text-red-900">{stats.inactive}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Services with Ratings</p>
                <p className="text-3xl font-bold text-yellow-900">{stats.ratedServices}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search services by title, description, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Filter className="text-gray-400 w-5 h-5" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Services Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading services...</p>
            </div>
          ) : currentServices.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No services found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters' 
                  : 'Create your first service to get started'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-900 text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Rating</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentServices.map((service) => (
                      <tr key={service._id} className="hover:bg-blue-50 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12">
                              {service.image ? (
                                <img
                                  className="h-12 w-12 rounded-lg object-cover"
                                  src={`${API_URL_IMAGE}/uploads/serviceImages/${service.image}`}
                                  alt={service.title}
                                  onError={(e) => {
                                    e.target.src = `${API_URL_IMAGE}/uploads/serviceImages/default-service.jpg`;
                                  }}
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{service.title}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {service.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {service.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-green-600">
                            {formatCurrency(service.basePrice)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-900">
                              {formatDuration(service.duration)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" />
                            <span className="text-sm text-gray-900">
                              {service.averageRating || 0} ({service.ratingCount || 0})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            service.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {service.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewClick(service)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors duration-200"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditClick(service)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors duration-200"
                              title="Edit Service"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(service)}
                              className={`p-1 rounded transition-colors duration-200 ${
                                service.isActive 
                                  ? 'text-red-600 hover:text-red-900' 
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                              title={service.isActive ? 'Deactivate Service' : 'Activate Service'}
                            >
                              {service.isActive ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                  <div className="text-sm text-gray-700">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredServices.length)} of {filteredServices.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 text-sm rounded-lg ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create Service Modal */}
        {showCreateModal && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              resetCreateForm();
            }}
            title="Create New Service"
            size="large"
          >
            <form onSubmit={handleCreateService} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={createForm.title}
                    onChange={handleCreateFormChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter service title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={createForm.category}
                    onChange={handleCreateFormChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={createForm.description}
                  onChange={handleCreateFormChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter service description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    name="basePrice"
                    value={createForm.basePrice}
                    onChange={handleCreateFormChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter base price"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (hours) *
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={createForm.duration}
                    onChange={handleCreateFormChange}
                    required
                    min="0.25"
                    max="500"
                    step="0.25"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter duration in hours"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Image
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    name="image"
                    ref={fileInputRef}
                    onChange={handleCreateFormChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <ImageIcon className="w-5 h-5 mr-2 text-gray-400" />
                    Choose Image
                  </button>
                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setCreateForm(prev => ({ ...prev, image: null }));
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Service
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Edit Service Modal */}
        {showEditModal && selectedService && (
          <Modal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            title="Edit Service"
            size="large"
          >
            <form onSubmit={handleUpdateService} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={editForm.title}
                    onChange={handleEditFormChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter service title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={editForm.category}
                    onChange={handleEditFormChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditFormChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter service description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    name="basePrice"
                    value={editForm.basePrice}
                    onChange={handleEditFormChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter base price"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (hours) *
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={editForm.duration}
                    onChange={handleEditFormChange}
                    required
                    min="0.25"
                    max="500"
                    step="0.25"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter duration in hours"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Image
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    name="image"
                    ref={editFileInputRef}
                    onChange={handleEditFormChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <ImageIcon className="w-5 h-5 mr-2 text-gray-400" />
                    Change Image
                  </button>
                  {editImagePreview && (
                    <div className="relative">
                      <img
                        src={editImagePreview}
                        alt="Preview"
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditImagePreview(null);
                          setEditForm(prev => ({ ...prev, image: null }));
                          if (editFileInputRef.current) editFileInputRef.current.value = '';
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update Service
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* View Service Modal */}
        {showViewModal && selectedService && (
          <Modal
            isOpen={showViewModal}
            onClose={() => setShowViewModal(false)}
            title="Service Details"
            size="large"
          >
            <div className="space-y-6">
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  {selectedService.image ? (
                    <img
                      className="h-32 w-32 rounded-lg object-cover"
                      src={`${API_URL_IMAGE}/uploads/serviceImages/${selectedService.image}`}
                      alt={selectedService.title}
                      onError={(e) => {
                        e.target.src = `${API_URL_IMAGE}/uploads/serviceImages/default-service.jpg`;
                      }}
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-lg bg-gray-200 flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedService.title}</h3>
                  <div className="flex items-center space-x-4 mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {selectedService.category}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedService.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedService.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{selectedService.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-600">Base Price</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {formatCurrency(selectedService.basePrice)}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-600">Duration</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {formatDuration(selectedService.duration)}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-yellow-600">Rating</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-900 mt-1">
                    {selectedService.averageRating || 0} ({selectedService.ratingCount || 0})
                  </p>
                </div>
              </div>

              {selectedService.feedback && selectedService.feedback.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Customer Feedback</h4>
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {selectedService.feedback.slice(0, 5).map((feedback, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="ml-2 text-sm font-medium text-gray-900">
                              {feedback.customer?.name || feedback.customerName || 'Anonymous Customer'}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(feedback.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {feedback.comment && (
                          <p className="text-gray-600 text-sm">{feedback.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Bulk Import Modal */}
        {showBulkImportModal && (
          <Modal
            isOpen={showBulkImportModal}
            onClose={() => setShowBulkImportModal(false)}
            title="Bulk Import Services"
            size="medium"
          >
            <form onSubmit={handleBulkImport} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Excel File
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    ref={bulkFileInputRef}
                    onChange={(e) => setBulkFile(e.target.files[0])}
                    accept=".xlsx,.xls"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => bulkFileInputRef.current?.click()}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <Upload className="w-5 h-5 mr-2 text-gray-400" />
                    Choose Excel File
                  </button>
                  {bulkFile && (
                    <span className="text-sm text-gray-600">{bulkFile.name}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Upload an Excel file with columns: Title, Category, Description, Base Price, Duration
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Excel Format Requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Column 1: Title (required)</li>
                  <li>• Column 2: Category (Electrical, AC, Appliance Repair, Other)</li>
                  <li>• Column 3: Description (required)</li>
                  <li>• Column 4: Base Price (required, number)</li>
                  <li>• Column 5: Duration in hours (required, number)</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!bulkFile}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Services
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
};

// Reusable Modal Component
const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    medium: 'sm:max-w-lg',
    large: 'sm:max-w-2xl',
    xlarge: 'sm:max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} sm:w-full`}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminServices;
