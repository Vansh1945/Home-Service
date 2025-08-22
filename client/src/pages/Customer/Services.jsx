import React, { useEffect } from 'react';
import {
  Search, Filter, Star, Clock, IndianRupee,
  ChevronRight, Heart, ShieldCheck, Sparkles, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../store/auth';
import ServiceImg from '../../assets/ServiceImg.png';
import Rating from '@mui/material/Rating';

const ServiceListingPage = () => {
  const { API, user } = useAuth();
  const navigate = useNavigate();

  let services = [];
  let filteredServices = [];
  let searchTerm = '';
  let selectedCategory = 'All';
  let sortBy = 'popular';
  let categories = [];
  let favorites = new Set();

  // Fetch services
  const fetchServices = async () => {
    try {
      const response = await fetch(`${API}/service/services`);
      const data = await response.json();
      
      if (data.success) {
        services = data.data;
        filteredServices = data.data;
        
        // Extract unique categories from service data
        const uniqueCategories = ['All', ...new Set(
          data.data.map(service => service.category)
        )];
        categories = uniqueCategories;
      } else {
        throw new Error(data.message || 'Failed to fetch services');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load services');
      console.error('Fetch error:', error);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Filter and sort services function
  const getFilteredServices = () => {
    let results = [...services];

    // Apply category filter
    if (selectedCategory !== 'All') {
      results = results.filter(service => service.category === selectedCategory);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(service =>
        service.title.toLowerCase().includes(term) ||
        service.description.toLowerCase().includes(term) ||
        service.category.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    results.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.basePrice - b.basePrice;
        case 'price-high':
          return b.basePrice - a.basePrice;
        case 'rating':
          return (b.averageRating || 0) - (a.averageRating || 0);
        case 'name':
          return a.title.localeCompare(b.title);
        default: // popular
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return results;
  };

  filteredServices = getFilteredServices();

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

  const toggleFavorite = (serviceId) => {
    if (favorites.has(serviceId)) {
      favorites.delete(serviceId);
      toast.success('Removed from favorites');
    } else {
      favorites.add(serviceId);
      toast.success('Added to favorites!');
    }
  };

  const ServiceCard = ({ service }) => {
    const imageUrl = service.image 
      ? `${API}/uploads/serviceImage/${service.image}`
      : ServiceImg;

    const isFavorite = favorites.has(service._id);
    const isServiceAvailable = service.isActive !== false; // Explicit check for false only

    return (
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden group relative">
        {/* Service Image and Badges */}
        <div className="relative overflow-hidden h-48">
          <img
            src={imageUrl}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = ServiceImg;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
          
          {/* Premium Badge */}
          {service.basePrice > 1000 && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
              <Sparkles size={12} />
              <span>Premium</span>
            </div>
          )}
          
          {/* Favorite Button */}
          <button
            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-sm hover:shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(service._id);
            }}
          >
            <Heart 
              className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-gray-500 hover:text-rose-500'}`} 
            />
          </button>
        </div>

        {/* Service Details */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
              {service.category}
            </span>
            {isServiceAvailable ? (
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                <CheckCircle size={12} /> Available
              </span>
            ) : (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                Unavailable
              </span>
            )}
          </div>

          <h3 className="font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
            {service.title}
          </h3>
          <p className="text-gray-500 text-sm mb-3 line-clamp-2">
            {service.description}
          </p>

          {/* Rating and Duration */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-600 font-medium">
                {service.duration} hrs
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Rating
                name="read-only"
                value={service.averageRating || 0}
                precision={0.5}
                readOnly
                size="small"
              />
              <span className="text-xs font-medium text-gray-500">
                ({service.ratingCount || 0})
              </span>
            </div>
          </div>

          {/* Price and Book Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-end gap-1">
              <IndianRupee className="w-4 h-4 text-gray-600" />
              <span className="text-lg font-bold text-gray-800">
                {service.basePrice}
              </span>
              {service.originalPrice && (
                <span className="text-xs text-gray-400 line-through ml-1">
                  {service.originalPrice}
                </span>
              )}
            </div>
            <button
              onClick={() => handleBookNow(service._id, isServiceAvailable)}
              disabled={!isServiceAvailable}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 shadow-sm hover:shadow-md transition-all ${
                isServiceAvailable 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isServiceAvailable ? (
                <>
                  Book Now
                  <ChevronRight className="w-3 h-3" />
                </>
              ) : 'Unavailable'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Search Section */}
      <div className="relative bg-gradient-to-r from-blue-700 to-blue-800 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Discover Professional Services</h1>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto">
              Book trusted professionals for all your home service needs
            </p>
          </div>

          <div className="max-w-2xl mx-auto relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-blue-300" />
            </div>
            <input
              type="text"
              placeholder="Search for services (e.g. 'AC repair', 'Electrician')..."
              value={searchTerm}
              onChange={(e) => searchTerm = e.target.value}
              className="block w-full pl-10 pr-3 py-3 border border-transparent rounded-lg bg-blue-600/20 backdrop-blur-sm placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent text-white shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filters */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex space-x-2 pb-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => selectedCategory = category}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              {selectedCategory === 'All' ? 'All Services' : selectedCategory}
            </h2>
            <p className="text-sm text-gray-500">
              {`${filteredServices.length} services available`}
            </p>
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => sortBy = e.target.value}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
              >
                <option value="popular">Most Recent</option>
                <option value="rating">Top Rated</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Alphabetical</option>
              </select>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Filter className="w-3 h-3 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No services found</h3>
            <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
              We couldn't find any services matching your criteria.
            </p>
            <button
              onClick={() => {
                searchTerm = '';
                selectedCategory = 'All';
                sortBy = 'popular';
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredServices.map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceListingPage;
