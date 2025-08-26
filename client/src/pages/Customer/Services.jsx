import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Filter, Clock, IndianRupee, ChevronRight, 
  CheckCircle, Loader2, AlertCircle, RefreshCw, MapPin, Sliders, ChevronDown, ChevronUp
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../store/auth';
import ServiceImg from '../../assets/ServiceImg.png';
import Rating from '@mui/material/Rating';

const ServiceListingPage = () => {
  const { API, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State Management
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [locationSearch, setLocationSearch] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [retryCount, setRetryCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Derived state for categories
  const categories = useMemo(() => {
    if (services.length === 0) return ['All'];
    const uniqueCategories = ['All', ...new Set(services.map(service => service.category))];
    return uniqueCategories;
  }, [services]);

  // Calculate price range from services
  const maxPrice = useMemo(() => {
    if (services.length === 0) return 10000;
    return Math.max(...services.map(service => service.basePrice || 0));
  }, [services]);

  // Update price range when services load
  useEffect(() => {
    if (services.length > 0 && priceRange[1] === 10000) {
      setPriceRange([0, maxPrice]);
    }
  }, [services, maxPrice, priceRange]);

  // Filtered and sorted services
  const filteredServices = useMemo(() => {
    let results = [...services];

    // Apply category filter
    if (selectedCategory !== 'All') {
      results = results.filter(service => service.category === selectedCategory);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      results = results.filter(service =>
        service.title?.toLowerCase().includes(term) ||
        service.description?.toLowerCase().includes(term) ||
        service.category?.toLowerCase().includes(term)
      );
    }

    // Apply price range filter
    results = results.filter(service => 
      service.basePrice >= priceRange[0] && service.basePrice <= priceRange[1]
    );

    // Apply location filter (simple text search in description for now)
    if (locationSearch.trim()) {
      const locationTerm = locationSearch.toLowerCase().trim();
      results = results.filter(service =>
        service.description?.toLowerCase().includes(locationTerm) ||
        service.title?.toLowerCase().includes(locationTerm)
      );
    }

    // Apply sorting
    results.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.basePrice || 0) - (b.basePrice || 0);
        case 'price-high':
          return (b.basePrice || 0) - (a.basePrice || 0);
        case 'rating':
          return (b.averageRating || 0) - (a.averageRating || 0);
        case 'name':
          return (a.title || '').localeCompare(b.title || '');
        default: // popular
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    return results;
  }, [services, selectedCategory, searchTerm, priceRange, locationSearch, sortBy]);

  // Fetch services from backend
  const fetchServices = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await fetch(`${API}/service/services`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        setServices(data.data);
        setRetryCount(0);
      } else {
        throw new Error(data.message || 'Invalid response format');
      }
    } catch (error) {
      console.error('Fetch services error:', error);
      setError(error.message || 'Failed to load services');
      
      if (retryCount < 2) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchServices(false);
        }, 2000);
      } else {
        toast.error('Failed to load services. Please try again later.');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchServices();
  }, [API]);

  // Update URL search params when search term changes
  useEffect(() => {
    if (searchTerm.trim()) {
      setSearchParams({ search: searchTerm.trim() });
    } else {
      setSearchParams({});
    }
  }, [searchTerm, setSearchParams]);

  // Handle booking navigation
  const handleBookNow = (serviceId, isActive) => {
    if (!isActive) {
      toast.error('This service is currently unavailable');
      return;
    }
    
    if (!user) {
      toast.info('Please login to book a service');
      navigate('/login');
      return;
    }
    
    navigate(`/customer/services/${serviceId}`);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setPriceRange([0, maxPrice]);
    setLocationSearch('');
    setSortBy('popular');
    setSearchParams({});
  };

  // Service Card Component
  const ServiceCard = ({ service }) => {
    const imageUrl = service.image 
      ? `${API}/uploads/serviceImage/${service.image}`
      : ServiceImg;

    const isServiceAvailable = service.isActive !== false;

    return (
      <div className="flex flex-col h-full bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
        {/* Service Image */}
        <div className="relative h-48 overflow-hidden flex-shrink-0">
          <img
            src={imageUrl}
            alt={service.title || 'Service'}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = ServiceImg;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          
          {/* Premium Badge */}
          {service.basePrice > 1000 && (
            <div className="absolute top-3 left-3 bg-accent text-background px-3 py-1 rounded-full text-xs font-bold">
              Premium
            </div>
          )}
        </div>

        {/* Service Details */}
        <div className="flex flex-col flex-grow p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-primary bg-primary/20 backdrop-blur-sm px-3 py-1 rounded-full">
              {service.category}
            </span>
            {isServiceAvailable ? (
              <span className="text-xs font-medium text-green-600 bg-green-100/50 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle size={12} /> Available
              </span>
            ) : (
              <span className="text-xs font-medium text-red-600 bg-red-100/50 backdrop-blur-sm px-3 py-1 rounded-full">
                Unavailable
              </span>
            )}
          </div>

          <h3 className="font-bold text-secondary mb-2 line-clamp-2 text-lg min-h-[56px]">
            {service.title}
          </h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed flex-grow">
            {service.description}
          </p>

          {/* Rating and Duration */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm text-secondary font-medium">
                {service.duration || 1} hrs
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Rating
                name="read-only"
                value={service.averageRating || 0}
                precision={0.5}
                readOnly
                size="small"
                sx={{
                  '& .MuiRating-iconFilled': {
                    color: '#F97316',
                  },
                }}
              />
              <span className="text-sm font-medium text-gray-600 ml-1">
                ({service.ratingCount || 0})
              </span>
            </div>
          </div>

          {/* Price and Book Button */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-end gap-1">
              <IndianRupee className="w-5 h-5 text-secondary" />
              <span className="text-xl font-bold text-secondary">
                {service.basePrice || 0}
              </span>
            </div>
            <button
              onClick={() => handleBookNow(service._id, isServiceAvailable)}
              disabled={!isServiceAvailable}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                isServiceAvailable 
                  ? 'bg-primary hover:bg-primary/90 text-background shadow-md hover:shadow-lg'
                  : 'bg-gray-100/50 text-gray-400 cursor-not-allowed backdrop-blur-sm'
              }`}
            >
              {isServiceAvailable ? (
                <>
                  Book Now
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : 'Unavailable'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <div className="w-full px-2 sm:px-4 py-12">
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-secondary font-medium">Loading services...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error && services.length === 0) {
    return (
      <div className="min-h-screen bg-transparent">
        <div className="w-full px-2 sm:px-4 py-12">
          <div className="text-center py-20 bg-background rounded-xl shadow-sm border border-gray-200">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-secondary mb-2">Failed to Load Services</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {error}
            </p>
            <button
              onClick={() => fetchServices()}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-background font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Main Content */}
      <div className="w-full py-2">
        {/* Filter Dropdown */}
        <div className="mb-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-all duration-300 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-5 h-5 text-primary" />
                <span className="text-lg font-semibold text-secondary">Filters</span>
                <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                  {filteredServices.length} services
                </span>
              </div>
              {showFilters ? (
                <ChevronUp className="w-5 h-5 text-gray-500 transition-transform duration-300" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500 transition-transform duration-300" />
              )}
            </button>
            
            {/* Collapsible Filter Content */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="p-4 pt-0 border-t border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Search Filter */}
                  <div className="transform transition-all duration-300 hover:scale-105">
                    <label className="block text-sm font-medium text-secondary mb-2">Search Services</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search services..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white/50 backdrop-blur-sm transition-all duration-300 hover:bg-white/70"
                      />
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div className="transform transition-all duration-300 hover:scale-105">
                    <label className="block text-sm font-medium text-secondary mb-2">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white/50 backdrop-blur-sm transition-all duration-300 hover:bg-white/70"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range Filter */}
                  <div className="transform transition-all duration-300 hover:scale-105">
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Price Range: ₹{priceRange[0]} - ₹{priceRange[1]}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="range"
                        min="0"
                        max={maxPrice}
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider transition-all duration-300 hover:bg-primary/20"
                      />
                      <input
                        type="range"
                        min="0"
                        max={maxPrice}
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider transition-all duration-300 hover:bg-primary/20"
                      />
                    </div>
                  </div>

                  {/* Location Filter */}
                  <div className="transform transition-all duration-300 hover:scale-105">
                    <label className="block text-sm font-medium text-secondary mb-2">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search location..."
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white/50 backdrop-blur-sm transition-all duration-300 hover:bg-white/70"
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex flex-wrap items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-secondary transition-all duration-300 hover:bg-white/10 rounded-lg"
                    >
                      Reset Filters
                    </button>
                  </div>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium transition-all duration-300 hover:bg-white/70"
                    >
                      <option value="popular">Most Recent</option>
                      <option value="rating">Top Rated</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="name">Alphabetical</option>
                    </select>
                    <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-16 mx-4 sm:mx-6 lg:mx-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg">
            <div className="mx-auto w-20 h-20 bg-gray-50/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-secondary mb-3">No services found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              We couldn't find any services matching your criteria. Try adjusting your search or filters.
            </p>
            <button
              onClick={resetFilters}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-background font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 px-4 sm:px-6 lg:px-8">
            {filteredServices.map((service, index) => (
              <div
                key={service._id}
                className="animate-fade-in h-full"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <ServiceCard service={service} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceListingPage;