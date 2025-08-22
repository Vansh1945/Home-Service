import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import {
  Users,
  Search,
  Eye,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Star,
  Award,
  FileText,
  Calendar,
  Wallet,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  User,
  Home,
  File,
  Image,
  FileImage
} from 'lucide-react';

const ProviderList = () => {
  const { API, isAdmin } = useAuth();
  const [providers, setProviders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [documents, setDocuments] = useState({
    profilePic: null,
    resume: null,
    passbook: null
  });
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const fetchProviders = async () => {
    try {
      const response = await fetch(
        `${API}/admin/providers?status=approved&page=${page}&search=${searchTerm}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Add this debug log
      const data = await response.json();
      console.log("API Response:", data);

      if (data.success) {
        setProviders(data.providers || []);
        setTotalPages(data.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const fetchProviderDetails = async (providerId) => {
    try {
      const response = await fetch(`${API}/admin/providers/${providerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setSelectedProvider(data.provider || data.data?.provider);
        fetchProviderDocuments(providerId);
        setDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching provider details:', error);
    }
  };

  const fetchProviderDocuments = async (providerId) => {
    setLoadingDocuments(true);
    try {
      // Fetch all document URLs in parallel
      const [profilePicUrl, resumeUrl, passbookUrl] = await Promise.all([
        fetchDocument(providerId, 'profile'),
        fetchDocument(providerId, 'resume'),
        fetchDocument(providerId, 'passbook')
      ]);

      setDocuments({
        profilePic: profilePicUrl,
        resume: resumeUrl,
        passbook: passbookUrl
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchDocument = async (providerId, type) => {
    try {
      const response = await fetch(`${API}/admin/providers/${providerId}/documents/${type}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        // For images, we can use the URL directly
        if (type === 'profile' || type === 'passbook') {
          const blob = await response.blob();
          return URL.createObjectURL(blob);
        }
        // For PDFs, we can download them
        if (type === 'resume') {
          const blob = await response.blob();
          return URL.createObjectURL(blob);
        }
      }
      return null;
    } catch (error) {
      console.error(`Error fetching ${type} document:`, error);
      return null;
    }
  };

  const handleViewDetails = (provider) => {
    if (provider._id) {
      fetchProviderDetails(provider._id);
    } else {
      setSelectedProvider(provider);
      setDialogOpen(true);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setPage(1);
      fetchProviders();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getDocumentIcon = (type) => {
    switch (type) {
      case 'profile':
        return <Image className="w-4 h-4 mr-2" />;
      case 'resume':
        return <File className="w-4 h-4 mr-2" />;
      case 'passbook':
        return <FileImage className="w-4 h-4 mr-2" />;
      default:
        return <File className="w-4 h-4 mr-2" />;
    }
  };

  const getDocumentName = (type) => {
    switch (type) {
      case 'profile':
        return 'Profile Picture';
      case 'resume':
        return 'Resume/CV';
      case 'passbook':
        return 'Bank Passbook';
      default:
        return type;
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="max-w-md p-8 bg-white rounded-xl shadow-lg border border-blue-100 text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-blue-900 mb-3">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            Administrator privileges required to view this content
          </p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-900 transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-blue-50 min-h-screen">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl shadow-lg p-6 mb-8 text-white">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Approved Service Providers</h1>
          <p className="text-blue-200">Manage and view all approved service providers</p>
        </div>

        <div className="relative flex-1 w-full max-w-2xl">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-200 w-5 h-5" />
          <input
            type="text"
            placeholder="Search providers by name, email, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full pl-12 pr-4 py-2 md:py-3 bg-blue-800 bg-opacity-30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-blue-200 text-sm md:text-base"
          />
        </div>
      </div>

      {/* Providers Table */}
      <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
                <th className="py-3 px-4 md:px-6 text-left font-bold text-sm md:text-base">Provider</th>
                <th className="py-3 px-2 md:px-4 text-left font-bold text-sm md:text-base hidden sm:table-cell">Contact</th>
                <th className="py-3 px-2 md:px-4 text-left font-bold text-sm md:text-base">Service</th>
                <th className="py-3 px-2 md:px-4 text-left font-bold text-sm md:text-base hidden md:table-cell">Area</th>
                <th className="py-3 px-2 md:px-4 text-left font-bold text-sm md:text-base hidden lg:table-cell">Experience</th>
                <th className="py-3 px-2 md:px-4 text-left font-bold text-sm md:text-base hidden lg:table-cell">Performance</th>
                <th className="py-3 px-4 md:px-6 text-left font-bold text-sm md:text-base">Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.length > 0 ? (
                providers.map((provider) => (
                  <tr
                    key={provider._id}
                    className="hover:bg-blue-50 transition-colors border-b border-blue-100 last:border-0"
                  >
                    <td className="py-3 px-4 md:px-6">
                      <div className="flex items-center">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-blue-100 rounded-full flex items-center justify-center mr-3 md:mr-4 border-2 border-blue-200">
                          <User className="w-4 h-4 md:w-6 md:h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-blue-900 text-sm md:text-base">{provider.name}</p>
                          <div className="flex gap-1 md:gap-2 mt-1">
                            <span className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xs font-medium ${provider.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {provider.approved ? 'Approved' : 'Pending'}
                            </span>
                            {provider.testPassed && (
                              <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                Test Passed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 md:px-4 hidden sm:table-cell">
                      <div>
                        <div className="flex items-center text-gray-600 mb-1">
                          <Mail className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-blue-600" />
                          <span className="text-xs md:text-sm truncate max-w-[120px] md:max-w-none">{provider.email}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Phone className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-blue-600" />
                          <span className="text-xs md:text-sm">{provider.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 md:px-4">
                      <p className="font-medium text-blue-900 text-sm md:text-base truncate max-w-[100px] md:max-w-none">
                        {provider.services}
                      </p>
                    </td>
                    <td className="py-3 px-2 md:px-4 hidden md:table-cell">
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-blue-600" />
                        <span className="text-xs md:text-sm">{provider.serviceArea}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 md:px-4 hidden lg:table-cell">
                      <div className="flex items-center">
                        <Briefcase className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-blue-600" />
                        <span className="font-medium text-blue-900 text-sm md:text-base">
                          {provider.experience} years
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 md:px-4 hidden lg:table-cell">
                      <div>
                        <p className="text-green-600 font-medium text-sm md:text-base">
                          {provider.completedBookings || 0} completed
                        </p>
                        {provider.rating && (
                          <div className="flex items-center mt-1">
                            <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 mr-0.5 md:mr-1" />
                            <span className="font-medium text-xs md:text-sm">{provider.rating}/5</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 md:px-6">
                      <button
                        onClick={() => handleViewDetails(provider)}
                        className="p-1.5 md:p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        aria-label="View details"
                      >
                        <Eye className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                      <Search className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-blue-900 mb-2">No Providers Found</h3>
                    <p className="text-gray-600 text-sm md:text-base mb-4 md:mb-6">
                      {searchTerm ? 'Try adjusting your search terms' : 'No approved providers available'}
                    </p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setPage(1);
                        fetchProviders();
                      }}
                      className="px-4 py-1.5 md:px-6 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-900 transition-colors text-sm md:text-base"
                    >
                      Reset Search
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {providers.length > 0 && (
        <div className="flex justify-center mt-6 md:mt-8">
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="p-1.5 md:p-2 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = page <= 3 ? i + 1 :
                page >= totalPages - 2 ? totalPages - 4 + i :
                  page - 2 + i;
              return pageNum > 0 && pageNum <= totalPages && (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-lg transition-colors text-sm md:text-base ${page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 md:p-2 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Provider Details Dialog */}
      {selectedProvider && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${dialogOpen ? 'block' : 'hidden'}`}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Dialog Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-4 md:p-6 text-white rounded-t-xl">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center mr-4 md:mr-6 border-4 border-yellow-400">
                    {documents.profilePic ? (
                      <img
                        src={documents.profilePic}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold flex items-center">
                      {selectedProvider.name}
                      {selectedProvider.testPassed && (
                        <Award className="w-5 h-5 md:w-6 md:h-6 ml-2 text-yellow-400" />
                      )}
                    </h2>
                    <p className="text-blue-200 mt-1 text-sm md:text-base">
                      {selectedProvider.services} • {selectedProvider.serviceArea}
                    </p>
                    <div className="flex flex-wrap gap-1 md:gap-2 mt-2">
                      <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium ${selectedProvider.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {selectedProvider.approved ? 'Approved' : 'Pending'}
                      </span>
                      {selectedProvider.testPassed && (
                        <span className="px-2 py-0.5 md:px-3 md:py-1 bg-blue-100 text-blue-800 rounded-full text-xs md:text-sm font-medium">
                          Test Passed
                        </span>
                      )}
                      {selectedProvider.rating >= 4.5 && (
                        <span className="px-2 py-0.5 md:px-3 md:py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs md:text-sm font-medium flex items-center">
                          <Star className="w-3 h-3 md:w-4 md:h-4 mr-1 text-yellow-600" />
                          Top Rated
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setDialogOpen(false);
                    // Clean up object URLs when dialog closes
                    Object.values(documents).forEach(url => {
                      if (url) URL.revokeObjectURL(url);
                    });
                    setDocuments({
                      profilePic: null,
                      resume: null,
                      passbook: null
                    });
                  }}
                  className="p-1 md:p-2 text-blue-200 hover:text-white self-start md:self-center"
                  aria-label="Close dialog"
                >
                  <XCircle className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            </div>

            {/* Dialog Content */}
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Contact Information */}
                <div className="bg-blue-50 p-3 md:p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center mb-3 md:mb-4">
                    <Mail className="w-5 h-5 md:w-6 md:h-6 text-blue-900 mr-2 md:mr-3" />
                    <h3 className="text-base md:text-lg font-bold text-blue-900">Contact Information</h3>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <p className="text-xs md:text-sm text-gray-600 flex items-center">
                        <Mail className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-blue-600" />
                        Email
                      </p>
                      <p className="font-medium text-blue-900 mt-1 text-sm md:text-base">
                        {selectedProvider.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-gray-600 flex items-center">
                        <Phone className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-blue-600" />
                        Phone
                      </p>
                      <p className="font-medium text-blue-900 mt-1 text-sm md:text-base">
                        {selectedProvider.phone || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-gray-600 flex items-center">
                        <Home className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-blue-600" />
                        Address
                      </p>
                      <div className="font-medium text-blue-900 mt-1 text-sm md:text-base">
                        {selectedProvider.address ? (
                          <div>
                            <p>{selectedProvider.address.street}</p>
                            <p>{selectedProvider.address.city}, {selectedProvider.address.state}</p>
                            <p>{selectedProvider.address.postalCode}, {selectedProvider.address.country || 'India'}</p>
                          </div>
                        ) : (
                          'Not specified'
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Details */}
                <div className="bg-blue-50 p-3 md:p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center mb-3 md:mb-4">
                    <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-blue-900 mr-2 md:mr-3" />
                    <h3 className="text-base md:text-lg font-bold text-blue-900">Professional Details</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">Experience</p>
                      <p className="font-bold text-blue-900 mt-1 text-sm md:text-base">
                        {selectedProvider.experience || '0'} years
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">Service Area</p>
                      <p className="font-bold text-blue-900 mt-1 text-sm md:text-base">
                        {selectedProvider.serviceArea || 'Not specified'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs md:text-sm text-gray-600">Services</p>
                      <p className="font-bold text-blue-900 mt-1 text-sm md:text-base">
                        {selectedProvider.services || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">Rating</p>
                      <div className="flex items-center mt-1">
                        <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 mr-1" />
                        <span className="font-bold text-blue-900 text-sm md:text-base">
                          {selectedProvider.rating || 'No rating yet'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">Wallet Balance</p>
                      <div className="flex items-center mt-1">
                        <Wallet className="w-3 h-3 md:w-4 md:h-4 text-green-600 mr-1" />
                        <span className="font-bold text-green-600 text-sm md:text-base">
                          ₹{selectedProvider.wallet || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="col-span-2 bg-blue-50 p-3 md:p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center mb-3 md:mb-4">
                    <Star className="w-5 h-5 md:w-6 md:h-6 text-blue-900 mr-2 md:mr-3" />
                    <h3 className="text-base md:text-lg font-bold text-blue-900">Performance Statistics</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-blue-600 p-3 md:p-4 rounded-lg text-white text-center">
                      <p className="text-xl md:text-2xl font-bold">
                        ₹{selectedProvider.totalEarnings || 0}
                      </p>
                      <p className="text-xs md:text-sm opacity-90 mt-1">Total Earnings</p>
                    </div>
                    <div className="bg-green-600 p-3 md:p-4 rounded-lg text-white text-center">
                      <p className="text-xl md:text-2xl font-bold">
                        {selectedProvider.completedBookings || 0}
                      </p>
                      <p className="text-xs md:text-sm opacity-90 mt-1">Completed Jobs</p>
                    </div>
                    <div className="bg-yellow-500 p-3 md:p-4 rounded-lg text-white text-center">
                      <p className="text-xl md:text-2xl font-bold">
                        {selectedProvider.totalBookings || 0}
                      </p>
                      <p className="text-xs md:text-sm opacity-90 mt-1">Total Bookings</p>
                    </div>
                    <div className="bg-indigo-900 p-3 md:p-4 rounded-lg text-white text-center">
                      <p className="text-xl md:text-2xl font-bold">
                        {selectedProvider.acceptanceRate || 0}%
                      </p>
                      <p className="text-xs md:text-sm opacity-90 mt-1">Acceptance Rate</p>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="col-span-2 bg-blue-50 p-3 md:p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center mb-3 md:mb-4">
                    <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-900 mr-2 md:mr-3" />
                    <h3 className="text-base md:text-lg font-bold text-blue-900">Additional Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">Registration Date</p>
                      <div className="flex items-center mt-1">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4 text-blue-600 mr-1 md:mr-2" />
                        <span className="font-medium text-blue-900 text-sm md:text-base">
                          {formatDate(selectedProvider.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">Last Updated</p>
                      <div className="flex items-center mt-1">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4 text-blue-600 mr-1 md:mr-2" />
                        <span className="font-medium text-blue-900 text-sm md:text-base">
                          {formatDate(selectedProvider.updatedAt)}
                        </span>
                      </div>
                    </div>
                    {selectedProvider.description && (
                      <div className="col-span-2">
                        <p className="text-xs md:text-sm text-gray-600">Description</p>
                        <p className="text-gray-600 mt-1 text-sm md:text-base">
                          {selectedProvider.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Documents Section */}
                <div className="col-span-2 bg-blue-50 p-3 md:p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center mb-3 md:mb-4">
                    <Download className="w-5 h-5 md:w-6 md:h-6 text-blue-900 mr-2 md:mr-3" />
                    <h3 className="text-base md:text-lg font-bold text-blue-900">Documents</h3>
                  </div>
                  {loadingDocuments ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                      {/* Profile Picture */}
                      {documents.profilePic && (
                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center mb-2">
                            <Image className="w-4 h-4 mr-2 text-blue-600" />
                            <span className="font-medium text-sm">Profile Picture</span>
                          </div>
                          <div className="aspect-square bg-gray-100 rounded-md overflow-hidden mb-2">
                            <img
                              src={documents.profilePic}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            onClick={() => window.open(documents.profilePic, '_blank')}
                            className="w-full py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center justify-center"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </button>
                        </div>
                      )}

                      {/* Resume */}
                      {documents.resume && (
                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center mb-2">
                            <File className="w-4 h-4 mr-2 text-blue-600" />
                            <span className="font-medium text-sm">Resume/CV</span>
                          </div>
                          <div className="aspect-[4/3] bg-gray-100 rounded-md flex items-center justify-center mb-2">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                          <button
                            onClick={() => window.open(documents.resume, '_blank')}
                            className="w-full py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center justify-center"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </button>
                        </div>
                      )}

                      {/* Passbook */}
                      {documents.passbook && (
                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center mb-2">
                            <FileImage className="w-4 h-4 mr-2 text-blue-600" />
                            <span className="font-medium text-sm">Bank Passbook</span>
                          </div>
                          <div className="aspect-[4/3] bg-gray-100 rounded-md flex items-center justify-center mb-2">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                          <button
                            onClick={() => window.open(documents.passbook, '_blank')}
                            className="w-full py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center justify-center"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </button>
                        </div>
                      )}

                      {/* Show message if no documents */}
                      {!documents.profilePic && !documents.resume && !documents.passbook && (
                        <div className="col-span-3 text-center py-4 text-gray-500">
                          No documents available for this provider
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="p-3 md:p-4 bg-blue-50 border-t border-blue-100 flex justify-end">
              <button
                onClick={() => {
                  setDialogOpen(false);
                  // Clean up object URLs when dialog closes
                  Object.values(documents).forEach(url => {
                    if (url) URL.revokeObjectURL(url);
                  });
                  setDocuments({
                    profilePic: null,
                    resume: null,
                    passbook: null
                  });
                }}
                className="px-4 py-1.5 md:px-6 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-900 transition-colors text-sm md:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderList;