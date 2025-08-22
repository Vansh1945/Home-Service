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
  BoltIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
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

  const serviceHighlights = [
    {
      icon: <ShieldCheckIcon className="w-6 h-6 text-blue-600" />,
      title: "30-Day Warranty",
      description: "Free service if issue reoccurs within warranty period"
    },
    {
      icon: <TruckIcon className="w-6 h-6 text-blue-600" />,
      title: "Same Day Service",
      description: "Available in most locations"
    },
    {
      icon: <UserIcon className="w-6 h-6 text-blue-600" />,
      title: "Certified Experts",
      description: "Trained professionals"
    },
    {
      icon: <CreditCardIcon className="w-6 h-6 text-blue-600" />,
      title: "Secure Payments",
      description: "100% payment protection"
    }
  ];

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Service Not Found</h3>
          <p className="text-gray-600 mb-4">
            The service you're looking for doesn't exist or may have been removed.
          </p>
          <button
            onClick={() => navigate('/services')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Browse Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <button
                  onClick={() => navigate('/services')}
                  className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  All Services
                </button>
              </li>
              <li>
                <div className="flex items-center">
                  <ChevronRightIcon className="w-4 h-4 mx-1 text-gray-400" />
                  <button
                    onClick={() => navigate(`/services?category=${service.category}`)}
                    className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    {service.category}
                  </button>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <ChevronRightIcon className="w-4 h-4 mx-1 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 truncate max-w-xs">{service.title}</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="md:flex">
            {/* Service Image Gallery */}
            <div className="md:w-2/5 p-6">
              <div className="sticky top-6">
                <div 
                  className={`relative h-96 rounded-xl overflow-hidden bg-gray-100 mb-4 cursor-${zoomImage ? 'zoom-out' : 'zoom-in'}`}
                  onClick={() => setZoomImage(!zoomImage)}
                >
                  <img
                    src={`${API}/uploads/services/${service.image || 'default-service.jpg'}`}
                    alt={service.title}
                    className={`w-full h-full object-contain transition-transform duration-300 ${zoomImage ? 'scale-150' : 'scale-100'}`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-service.jpg';
                    }}
                  />
                  {zoomImage && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      Click to zoom out
                    </div>
                  )}
                </div>

                {/* Service Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckBadgeIcon className="w-3 h-3 mr-1" />
                    Verified
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <BoltIcon className="w-3 h-3 mr-1" />
                    Popular
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <WrenchIcon className="w-3 h-3 mr-1" />
                    Expert Service
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={handleBookNow}
                    className="flex-1 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all shadow-md hover:shadow-lg"
                  >
                    <CalendarIcon className="w-5 h-5 mr-2" />
                    Book Now
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    <ShareIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>


                 {/* Service Highlights */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Why Choose Us?</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {serviceHighlights.map((highlight, index) => (
                      <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-white transition-colors">
                        <div className="flex-shrink-0 mt-1">
                          {highlight.icon}
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-gray-900">{highlight.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">{highlight.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Info */}
                {/* <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start">
                    <MapPinIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Delivery & Service Availability</h4>
                      <p className="text-xs text-gray-600">
                        Available in most areas. Enter your location during booking to check exact availability.
                      </p>
                    </div>
                  </div>
                </div> */}
              </div>
            </div>

            {/* Service Details */}
            <div className="md:w-3/5 p-6 border-l border-gray-200">
              <div className="sticky top-6">
                <div className="flex justify-between items-start mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{service.title}</h1>
                  <div className="flex items-center bg-blue-100 px-3 py-1 rounded-full">
                    <CustomRating value={averageRating} readonly />
                    <span className="text-xs text-gray-700 ml-1">
                      {ratingCount} {ratingCount === 1 ? 'Rating' : 'Ratings'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  <span className="text-green-600 text-sm font-medium flex items-center bg-green-50 px-2.5 py-1 rounded-full">
                    <CheckBadgeIcon className="w-4 h-4 mr-1" />
                    Verified Service
                  </span>
                  <span className="ml-2 text-sm text-gray-500">| {service.category}</span>
                </div>

                {/* Price Section */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-baseline">
                    <CurrencyRupeeIcon className="w-6 h-6 text-gray-900" />
                    <span className="text-3xl font-bold text-gray-900 ml-1">
                      {service.basePrice?.toFixed(2) || '0.00'}
                    </span>
                    <span className="ml-2 text-sm text-green-600 font-medium">Inclusive of all taxes</span>
                  </div>
                  <div className="flex items-center mt-2">
                    <ClockIcon className="w-5 h-5 text-gray-500 mr-1" />
                    <span className="text-sm text-gray-700">
                      {formatDuration(service.duration)} service duration
                    </span>
                  </div>
                </div>

               

                {/* Description Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <CogIcon className="w-5 h-5 text-blue-600 mr-2" />
                    Service Details
                  </h3>
                  <div className="prose prose-sm text-gray-700 max-w-none">
                    {service.description}
                  </div>
                </div>

                {/* User's Feedback Section */}
                {feedbackData ? (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Feedback</h3>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <UserIcon className="h-6 w-6" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <CustomRating value={feedbackData.rating} readonly />
                            <span className="ml-2 text-sm text-gray-500">
                              {formatDate(feedbackData.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-700">
                            {feedbackData.comment || 'No additional comments'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : hasCompletedBooking ? (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Share Your Experience</h3>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-gray-700 mb-3">How was your experience with this service?</p>
                      <button
                        onClick={() => setShowFeedbackModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
                      >
                        <ChatBubbleLeftEllipsisIcon className="w-4 h-4 mr-2" />
                        Submit Feedback
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Detailed Information Section */}
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                  Service Inclusions
                </h3>
                <div className="space-y-3">
                  {[
                    "Professional diagnosis of the issue",
                    "High-quality replacement parts (if needed)",
                    "Complete service as per industry standards",
                    "Testing and verification of the solution",
                    "30-day service warranty",
                    "Detailed service report",
                    "Expert consultation",
                    "Cleanup after service"
                  ].map((item, index) => (
                    <div key={index} className="flex items-start">
                      <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ Section */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-500 mr-2" />
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
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <button
                        className={`flex items-center justify-between w-full p-4 text-left ${openAccordion === index ? 'bg-blue-50' : 'bg-white'}`}
                        onClick={() => toggleAccordion(index)}
                      >
                        <span className="font-medium text-gray-900">{faq.question}</span>
                        <ChevronDownIcon
                          className={`w-5 h-5 text-blue-600 transition-transform ${openAccordion === index ? 'transform rotate-180' : ''}`}
                        />
                      </button>
                      {openAccordion === index && (
                        <div className="p-4 bg-white border-t border-gray-100">
                          <p className="text-gray-700">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-500 mr-2" />
                Customer Reviews
              </h3>
              <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                <CustomRating value={averageRating} readonly />
                <span className="ml-2 text-sm text-gray-700">
                  {averageRating} out of 5 ({ratingCount} {ratingCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            </div>

            {allFeedbacks.length > 0 ? (
              <div className="space-y-4">
                {allFeedbacks.map((feedback, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                          {getCustomerInitials(feedback.customer?.name || 'Unknown User')}
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <h4 className="font-medium text-gray-900">
                              {feedback.customer?.name || 'Anonymous User'}
                            </h4>
                            <div className="ml-3 flex items-center">
                              <CustomRating value={feedback.rating} readonly />
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(feedback.createdAt)}
                          </span>
                        </div>
                        {feedback.comment && (
                          <p className="text-gray-700 text-sm leading-relaxed">
                            "{feedback.comment}"
                          </p>
                        )}
                        {feedback.booking && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              <CheckBadgeIcon className="w-3 h-3 mr-1" />
                              Verified Purchase
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <ChatBubbleLeftEllipsisIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No reviews yet</p>
                <p className="text-sm text-gray-500 mt-1">Be the first to review this service!</p>
                {isAuthenticated && hasCompletedBooking && (
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
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
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <ArrowPathIcon className="w-6 h-6 text-blue-600 mr-2" />
              Similar Services You Might Like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedServices.map((relatedService) => (
                <div
                  key={relatedService._id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer border border-gray-200 group"
                  onClick={() => navigate(`/service/${relatedService._id}`)}
                >
                  <div className="relative h-48 bg-gray-100">
                    <img
                      src={`${API}/uploads/services/${relatedService.image || 'default-service.jpg'}`}
                      alt={relatedService.title}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-service.jpg';
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-500">{relatedService.category}</span>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        {formatDuration(relatedService.duration)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{relatedService.title}</h3>
                    <div className="flex items-center mb-3">
                      <CustomRating value={relatedService.averageRating || 0} readonly />
                      <span className="text-xs text-gray-500 ml-1">({relatedService.feedback?.length || 0})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline">
                        <CurrencyRupeeIcon className="w-4 h-4 text-gray-600" />
                        <span className="text-lg font-bold text-gray-800">
                          {relatedService.basePrice?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <button className="text-blue-600 text-sm font-medium hover:underline flex items-center">
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