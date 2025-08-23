import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import {
  StarIcon,
  ArrowLeftIcon,
  ClockIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  UserIcon,
  ChevronDownIcon,
  CheckIcon,
  CurrencyRupeeIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftEllipsisIcon,
  TruckIcon,
  CreditCardIcon,
  ArrowPathIcon,
  ShareIcon,
  MapPinIcon,
  CalendarIcon,
  CogIcon,
  WrenchIcon,
  BoltIcon,
  HomeIcon,
  PhoneIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import Rating from 'react-rating';
import FeedbackModal from '../Customer/Feedback';

const ServiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { API, showToast, user, isAuthenticated, logoutUser, token } = useAuth();

  // State management
  const [service, setService] = useState(null);
  const [relatedServices, setRelatedServices] = useState([]);
  const [openAccordion, setOpenAccordion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackData, setFeedbackData] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [hasCompletedBooking, setHasCompletedBooking] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [zoomImage, setZoomImage] = useState(false);

  const fetchServiceFeedbacks = async () => {
    try {
      const response = await fetch(`${API}/feedback/service/${id}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setAllFeedbacks(data.data || []);

        if (data.data && data.data.length > 0) {
          const sum = data.data.reduce((acc, curr) => acc + curr.rating, 0);
          const avgRating = parseFloat((sum / data.data.length).toFixed(1));
          setAverageRating(avgRating);
          setRatingCount(data.data.length);
        }
      }
    } catch (error) {
      console.error('Error fetching service feedbacks:', error);
    }
  };

  const fetchServiceData = async () => {
    try {
      setLoading(true);

      const serviceResponse = await fetch(`${API}/service/services/${id}`);
      const serviceData = await serviceResponse.json();

      if (!serviceResponse.ok) {
        throw new Error(serviceData.message || 'Failed to fetch service');
      }

      if (!serviceData.success || !serviceData.data) {
        throw new Error('Service data not available');
      }

      setService(serviceData.data);

      const relatedResponse = await fetch(
        `${API}/service/services/category/${serviceData.data.category}?limit=4`
      );
      const relatedData = await relatedResponse.json();

      if (relatedResponse.ok && relatedData.success) {
        const filteredRelated = relatedData.data.filter(
          s => s._id !== serviceData.data._id
        );
        setRelatedServices(filteredRelated);
      }

      if (isAuthenticated && token) {
        try {
          const bookingsResponse = await fetch(`${API}/booking/customer`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (bookingsResponse.status === 401) {
            logoutUser();
            showToast('Session expired. Please login again.', 'error');
            return;
          }

          if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json();
            const completedBooking = bookingsData.data?.find(
              booking => booking.services.some(s => s.service._id === id) &&
                booking.status === 'completed'
            );
            setHasCompletedBooking(!!completedBooking);
          }

          const userFeedbacks = allFeedbacks.filter(feedback =>
            feedback.customer && feedback.customer._id === user._id
          );
          if (userFeedbacks.length > 0) {
            setFeedbackData(userFeedbacks[0]);
          }
        } catch (err) {
          console.error('Error fetching user-specific data:', err);
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchServiceFeedbacks();
      fetchServiceData();
    }
  }, [id, isAuthenticated]);

  const handleBookNow = () => {
    if (!isAuthenticated || !user) {
      showToast('Please login to book services', 'error');
      navigate('/login', { state: { from: `/customer/service/${id}` } });
      return;
    }

    navigate(`/customer/book-service/${id}`, {
      state: {
        serviceDetails: service
      }
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: service?.title,
        text: `Check out this ${service?.title} service`,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  const handleSubmitFeedback = async (feedback) => {
    try {
      const bookingsResponse = await fetch(`${API}/booking/customer`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (bookingsResponse.status === 401) {
        logoutUser();
        showToast('Session expired. Please login again.', 'error');
        return;
      }

      if (!bookingsResponse.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const bookingsData = await bookingsResponse.json();
      const completedBooking = bookingsData.data?.find(
        booking => booking.services.some(s => s.service._id === id) &&
          booking.status === 'completed'
      );

      if (!completedBooking) {
        throw new Error('No completed booking found for this service');
      }

      const response = await fetch(`${API}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          service: id,
          booking: completedBooking._id,
          rating: feedback.rating,
          comment: feedback.comment
        })
      });

      if (response.status === 401) {
        logoutUser();
        showToast('Session expired. Please login again.', 'error');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit feedback');
      }

      showToast('Feedback submitted successfully!', 'success');
      setFeedbackData(data.data);
      setShowFeedbackModal(false);
      await fetchServiceFeedbacks();
    } catch (error) {
      console.error('Feedback submission error:', error);
      showToast(error.message || 'Failed to submit feedback', 'error');
    }
  };

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const formatDuration = (hours) => {
    const hrs = Math.floor(hours);
    const mins = Math.round((hours - hrs) * 60);
    return `${hrs > 0 ? `${hrs} hr` : ''} ${mins > 0 ? `${mins} min` : ''}`.trim();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCustomerInitials = (customerName) => {
    if (!customerName) return 'U';
    return customerName.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get top-rated review
  const getTopReview = () => {
    if (allFeedbacks.length === 0) return null;
    return allFeedbacks.reduce((prev, current) => 
      (prev.rating > current.rating) ? prev : current
    );
  };

  // Custom Rating Component to avoid deprecated lifecycle warnings
  const CustomRating = ({ value, readonly = true }) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          readonly ? (
            <span key={star}>
              {value >= star ? (
                <StarIconSolid className="w-5 h-5 text-yellow-400" />
              ) : (
                <StarIcon className="w-5 h-5 text-gray-300" />
              )}
            </span>
          ) : (
            <button
              key={star}
              type="button"
              onClick={() => !readonly && onChange(star)}
            >
              {value >= star ? (
                <StarIconSolid className="w-5 h-5 text-yellow-400" />
              ) : (
                <StarIcon className="w-5 h-5 text-gray-300" />
              )}
            </button>
          )
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="inline-flex items-center space-x-2 mb-6">
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-secondary font-medium text-lg">Loading service details...</p>
          <div className="mt-4 w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ExclamationTriangleIcon className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-xl font-semibold text-secondary mb-3">Service Not Found</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            The service you're looking for doesn't exist or may have been removed.
          </p>
          <button
            onClick={() => navigate('/services')}
            className="px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white font-medium rounded-xl hover:from-primary/90 hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Browse Services
          </button>
        </div>
      </div>
    );
  }

  const topReview = getTopReview();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Breadcrumb Navigation */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-2 md:space-x-4">
              <li className="inline-flex items-center">
                <button
                  onClick={() => navigate('/customer/services')}
                  className="inline-flex items-center text-sm font-medium text-secondary hover:text-primary transition-all duration-300 group"
                >
                  <HomeIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  All Services
                </button>
              </li>
              <li>
                <div className="flex items-center">
                  <ChevronRightIcon className="w-4 h-4 mx-2 text-gray-400" />
                  <button
                    onClick={() => navigate(`/customer/services?category=${service.category}`)}
                    className="text-sm font-medium text-gray-600 hover:text-primary transition-all duration-300 px-2 py-1 rounded-lg hover:bg-primary/5"
                  >
                    {service.category}
                  </button>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <ChevronRightIcon className="w-4 h-4 mx-2 text-gray-400" />
                  <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full truncate max-w-xs">
                    {service.title}
                  </span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden border border-white/20">
          <div className="lg:flex">
            {/* Service Image Gallery */}
            <div className="lg:w-2/5 p-6 lg:p-8">
              <div className="sticky top-24">
                <div 
                  className={`relative h-80 lg:h-96 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 mb-6 cursor-${zoomImage ? 'zoom-out' : 'zoom-in'} group`}
                  onClick={() => setZoomImage(!zoomImage)}
                >
                  <img
                    src={`${API}/uploads/services/${service.image || 'default-service.jpg'}`}
                    alt={service.title}
                    className={`w-full h-full object-contain transition-all duration-500 ${zoomImage ? 'scale-150' : 'scale-100 group-hover:scale-105'}`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-service.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {zoomImage && (
                    <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg">
                      Click to zoom out
                    </div>
                  )}
                </div>

                {/* Service Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-green-50 text-green-700 border border-green-200">
                    <CheckBadgeIcon className="w-3 h-3 mr-1.5" />
                    Verified
                  </span>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20">
                    <BoltIcon className="w-3 h-3 mr-1.5" />
                    Popular
                  </span>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-accent/10 to-accent/5 text-accent border border-accent/20">
                    <WrenchIcon className="w-3 h-3 mr-1.5" />
                    Expert Service
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 mb-8">
                  <button
                    onClick={handleBookNow}
                    className="flex-1 flex items-center justify-center bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 group"
                  >
                    <CalendarIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Book Now
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-3.5 rounded-xl border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 group"
                  >
                    <ShareIcon className="w-5 h-5 text-gray-600 group-hover:text-primary transition-colors duration-300" />
                  </button>
                  <button className="p-3.5 rounded-xl border border-gray-200 hover:border-accent/30 hover:bg-accent/5 transition-all duration-300 group">
                    <HeartIcon className="w-5 h-5 text-gray-600 group-hover:text-accent transition-colors duration-300" />
                  </button>
                </div>

                {/* Contact Info */}
                <div className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-primary/10">
                  <div className="flex items-start">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <PhoneIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-semibold text-secondary mb-1">Need Help?</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Contact our support team for any queries about this service.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div className="lg:w-3/5 p-6 lg:p-8 border-l border-gray-200/50">
              <div className="sticky top-24">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-6">
                  <div className="flex-1">
                    <h1 className="text-3xl lg:text-4xl font-bold text-secondary mb-3 leading-tight">{service.title}</h1>
                    <div className="flex items-center mb-4">
                      <span className="text-primary text-sm font-semibold flex items-center bg-gradient-to-r from-green-100 to-green-50 px-3 py-1.5 rounded-full border border-green-200">
                        <CheckBadgeIcon className="w-4 h-4 mr-1.5" />
                        Verified Service
                      </span>
                      <span className="ml-3 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">{service.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center bg-gradient-to-r from-accent/10 to-accent/5 px-4 py-2 rounded-xl border border-accent/20 mt-4 lg:mt-0">
                    <CustomRating value={averageRating} readonly />
                    <span className="text-sm text-secondary font-medium ml-2">
                      {ratingCount} {ratingCount === 1 ? 'Rating' : 'Ratings'}
                    </span>
                  </div>
                </div>

                {/* Price Section */}
                <div className="mb-8 p-6 bg-gradient-to-r from-primary/5 via-white to-accent/5 rounded-2xl border border-primary/10 shadow-sm">
                  <div className="flex items-baseline mb-3">
                    <CurrencyRupeeIcon className="w-7 h-7 text-secondary" />
                    <span className="text-4xl font-bold text-secondary ml-1">
                      {service.basePrice?.toFixed(2) || '0.00'}
                    </span>
                    <span className="ml-3 text-sm text-primary font-semibold bg-primary/10 px-3 py-1 rounded-full">Inclusive of all taxes</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <ClockIcon className="w-5 h-5 text-primary mr-2" />
                    <span className="text-sm font-medium">
                      {formatDuration(service.duration)} service duration
                    </span>
                  </div>
                </div>

                {/* Description Section */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-secondary mb-4 flex items-center">
                    <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full mr-3"></div>
                    Service Details
                  </h3>
                  <div className="prose prose-sm text-gray-700 max-w-none leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    {service.description}
                  </div>
                </div>

                {/* User's Feedback Section */}
                {feedbackData ? (
                  <div className="border-t border-gray-200/50 pt-8">
                    <h3 className="text-xl font-bold text-secondary mb-4 flex items-center">
                      <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full mr-3"></div>
                      Your Feedback
                    </h3>
                    <div className="bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/50 shadow-sm">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-lg">
                            <UserIcon className="h-6 w-6" />
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center mb-2">
                            <CustomRating value={feedbackData.rating} readonly />
                            <span className="ml-3 text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                              {formatDate(feedbackData.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-700 leading-relaxed">
                            {feedbackData.comment || 'No additional comments'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : hasCompletedBooking ? (
                  <div className="border-t border-gray-200/50 pt-8">
                    <h3 className="text-xl font-bold text-secondary mb-4 flex items-center">
                      <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full mr-3"></div>
                      Share Your Experience
                    </h3>
                    <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-6 rounded-2xl border border-primary/10">
                      <p className="text-secondary mb-4 font-medium">How was your experience with this service?</p>
                      <button
                        onClick={() => setShowFeedbackModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white rounded-xl hover:shadow-lg transition-all duration-300 font-semibold flex items-center transform hover:-translate-y-0.5"
                      >
                        <ChatBubbleLeftEllipsisIcon className="w-5 h-5 mr-2" />
                        Submit Feedback
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Detailed Information Section */}
          <div className="border-t border-gray-200/50 p-6 lg:p-8 bg-gradient-to-br from-gray-50/50 to-white/50 backdrop-blur-sm">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
              <div>
                <h3 className="text-2xl font-bold text-secondary mb-6 flex items-center">
                  <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full mr-3"></div>
                  Service Inclusions
                </h3>
                <div className="space-y-4">
                  {[
                    "Professional diagnosis of the issue",
                    "High-quality replacement parts (if needed)",
                    "Complete service as per industry standards",
                    "Testing and verification of the solution",
                    "30-day service warranty"
                  ].map((item, index) => (
                    <div key={index} className="flex items-start p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100/50 hover:border-primary/20 hover:shadow-sm transition-all duration-300 group">
                      <div className="flex-shrink-0 p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors duration-300 mt-0.5">
                        <CheckIcon className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-gray-700 ml-3 leading-relaxed group-hover:text-secondary transition-colors duration-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ Section */}
              <div>
                <h3 className="text-2xl font-bold text-secondary mb-6 flex items-center">
                  <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full mr-3"></div>
                  Frequently Asked Questions
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      question: "Does the cost include spare parts?",
                      answer: "Yes, our service cost includes all necessary spare parts unless specified otherwise in the exclusions."
                    },
                    {
                      question: "What if the same issue occurs again?",
                      answer: "We provide a 30-day warranty on all services. If the same issue reoccurs within this period, we'll fix it at no additional cost."
                    },
                    {
                      question: "What if anything gets damaged during service?",
                      answer: "Our professionals are fully insured. Any accidental damage caused during service will be covered by us."
                    },
                    {
                      question: "Are spare parts covered under warranty?",
                      answer: "Yes, all replacement parts come with a 90-day manufacturer warranty unless otherwise specified."
                    },
                    {
                      question: "What is excluded from the service?",
                      answer: "Wiring beyond 2 meters is not included. Extra charges apply for additional materials or complex installations."
                    }
                  ].map((faq, index) => (
                    <div key={index} className="border border-gray-200/50 rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
                      <button
                        className={`flex items-center justify-between w-full p-4 text-left transition-all duration-300 ${
                          openAccordion === index 
                            ? 'bg-gradient-to-r from-primary/5 to-accent/5 text-secondary' 
                            : 'bg-white/50 hover:bg-gray-50/50 text-gray-900'
                        }`}
                        onClick={() => toggleAccordion(index)}
                      >
                        <span className="font-semibold">{faq.question}</span>
                        <ChevronDownIcon
                          className={`w-5 h-5 text-primary transition-transform duration-300 ${
                            openAccordion === index ? 'transform rotate-180' : ''
                          }`}
                        />
                      </button>
                      {openAccordion === index && (
                        <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-gray-100/50 animate-in slide-in-from-top-2 duration-300">
                          <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <div className="border-t border-gray-200/50 p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
              <h3 className="text-2xl font-bold text-secondary mb-4 lg:mb-0 flex items-center">
                <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full mr-3"></div>
                Customer Reviews
              </h3>
              <div className="flex items-center bg-gradient-to-r from-accent/10 to-accent/5 px-4 py-2 rounded-xl border border-accent/20">
                <CustomRating value={averageRating} readonly />
                <span className="ml-3 text-sm text-secondary font-semibold">
                  {averageRating} out of 5 ({ratingCount} {ratingCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            </div>

            {topReview ? (
              <div className="bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {getCustomerInitials(topReview.customer?.name || 'Unknown User')}
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-3">
                      <div className="flex items-center mb-2 lg:mb-0">
                        <h4 className="font-semibold text-secondary mr-3">
                          {topReview.customer?.name || 'Anonymous User'}
                        </h4>
                        <CustomRating value={topReview.rating} readonly />
                      </div>
                      <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        {formatDate(topReview.createdAt)}
                      </span>
                    </div>
                    {topReview.comment && (
                      <p className="text-gray-700 leading-relaxed mb-3 italic">
                        "{topReview.comment}"
                      </p>
                    )}
                    {topReview.booking && (
                      <div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-green-50 text-green-700 border border-green-200">
                          <CheckBadgeIcon className="w-3 h-3 mr-1.5" />
                          Verified Purchase
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/50">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ChatBubbleLeftEllipsisIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-secondary mb-2">No reviews yet</h4>
                <p className="text-gray-600 mb-6">Be the first to review this service!</p>
                {isAuthenticated && hasCompletedBooking && (
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white rounded-xl hover:shadow-lg transition-all duration-300 font-semibold transform hover:-translate-y-0.5"
                  >
                    Write a Review
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related Services Section */}
        {relatedServices.length > 0 && (
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-secondary mb-8 flex items-center">
              <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full mr-4"></div>
              Similar Services You Might Like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedServices.map((relatedService) => (
                <div
                  key={relatedService._id}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-white/20 group transform hover:-translate-y-2"
                  onClick={() => navigate(`/customer/service/${relatedService._id}`)}
                >
                  <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
                    <img
                      src={`${API}/uploads/serviceImages/${relatedService.image || 'default-service.jpg'}`}
                      alt={relatedService.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-service.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">{relatedService.category}</span>
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                        {formatDuration(relatedService.duration)}
                      </span>
                    </div>
                    <h3 className="font-bold text-secondary mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300">{relatedService.title}</h3>
                    <div className="flex items-center mb-4">
                      <CustomRating value={relatedService.averageRating || 0} readonly />
                      <span className="text-xs text-gray-600 ml-2 bg-gray-50 px-2 py-1 rounded-full">({relatedService.feedback?.length || 0})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline">
                        <CurrencyRupeeIcon className="w-5 h-5 text-secondary" />
                        <span className="text-xl font-bold text-secondary ml-1">
                          {relatedService.basePrice?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <button className="text-primary font-semibold text-sm hover:text-accent transition-colors duration-300 flex items-center group-hover:translate-x-1 transition-transform duration-300">
                        View Details
                        <ChevronRightIcon className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal
          serviceId={id}
          serviceTitle={service.title}
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={handleSubmitFeedback}
        />
      )}
    </div>
  );
};

export default ServiceDetailPage;
