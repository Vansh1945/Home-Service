import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaCheckCircle, FaPlus, FaMinus, FaMapMarkerAlt, FaTag, FaClock, FaCalendarAlt, FaShieldAlt, FaLock, FaCreditCard } from 'react-icons/fa';
import razorpayLogo from '../../assets/razorpay.png';

const BookService = () => {
  const { serviceId } = useParams();
  const { user, token, API } = useAuth();
  const navigate = useNavigate();

  // State declarations
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCoupons, setIsFetchingCoupons] = useState(false);
  const [service, setService] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [coupons, setCoupons] = useState([]);

  // Form state with proper initial values
  const [formData, setFormData] = useState({
    date: new Date(),
    time: '',
    addressId: '',
    customAddress: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India'
    },
    useCustomAddress: false,
    notes: '',
    quantity: 1,
    couponCode: '',
    appliedCoupon: null
  });

  // Get next 3 days from today for date picker
  const getNext3Days = () => {
    const today = new Date();
    const next3Days = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      next3Days.push(date);
    }
    return next3Days;
  };

  const availableDates = getNext3Days();
  const maxDate = availableDates[availableDates.length - 1];

  // Generate time slots from current hour to 8 PM for today, or 8 AM to 8 PM for future dates
  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const isToday = formData.date.toDateString() === now.toDateString();
    const currentHour = now.getHours();

    const startHour = isToday ? Math.max(currentHour + 1, 8) : 8;
    const endHour = 20; // 8 PM

    for (let hour = startHour; hour <= endHour; hour++) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      const timeString = `${displayHour.toString().padStart(2, '0')}:00 ${period}`;
      slots.push({
        display: timeString,
        value: `${hour.toString().padStart(2, '0')}:00`
      });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Fetch service details
  const fetchService = async () => {
    try {
      const response = await axios.get(`${API}/service/services/${serviceId}`);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load service');
      }
      return response.data.data;
    } catch (err) {
      console.error('Error fetching service:', err);
      toast.error(err.response?.data?.message || 'Failed to load service details');
      throw err;
    }
  };

  // Fetch user addresses
  const fetchUserAddresses = async () => {
    try {
      const response = await axios.get(`${API}/customer/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.user.address ? [response.data.user.address] : [];
    } catch (err) {
      console.error('Error fetching user addresses:', err);
      toast.error('Failed to load your saved address');
      return [];
    }
  };

  // Fetch available coupons
  const fetchAvailableCoupons = async () => {
    setIsFetchingCoupons(true);
    try {
      const response = await axios.get(`${API}/coupon/coupons/available`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          bookingValue: service.basePrice * formData.quantity
        }
      });
      setCoupons(response.data.data || []);
    } catch (err) {
      console.error('Error fetching coupons:', err);
      toast.error('Failed to load available coupons');
      setCoupons([]);
    } finally {
      setIsFetchingCoupons(false);
    }
  };

  // Apply coupon function
  const applyCoupon = async () => {
    if (!formData.couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    if (!service?.basePrice) {
      toast.error('Service price not loaded yet');
      return;
    }

    try {
      const response = await axios.post(
        `${API}/coupon/coupons/apply`,
        {
          code: formData.couponCode,
          bookingValue: service.basePrice * formData.quantity
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Invalid coupon');
      }

      const couponData = response.data.data.coupon;

      setFormData(prev => ({
        ...prev,
        appliedCoupon: {
          code: couponData.code,
          discountType: couponData.discountType,
          discountValue: couponData.discountValue,
          maxDiscount: couponData.maxDiscount || null
        },
        couponCode: couponData.code
      }));

      toast.success('Coupon applied successfully!');
    } catch (err) {
      console.error('Coupon error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to apply coupon');
    }
  };

  // Mark coupon as used after successful booking
  const markCouponUsed = async (couponCode, bookingValue) => {
    if (!formData.appliedCoupon) return;

    try {
      await axios.post(
        `${API}/coupon/coupons/mark-used`,
        {
          code: couponCode,
          bookingValue: bookingValue
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } catch (err) {
      console.error('Error marking coupon as used:', err);
    }
  };

  // Calculate discount amount
  const calculateDiscount = () => {
    if (!service?.basePrice || !formData.appliedCoupon) return 0;

    const baseAmount = service.basePrice * (formData.quantity || 1);

    if (formData.appliedCoupon.discountType === 'percent') {
      const discount = (baseAmount * formData.appliedCoupon.discountValue) / 100;
      return formData.appliedCoupon.maxDiscount
        ? Math.min(discount, formData.appliedCoupon.maxDiscount)
        : discount;
    } else {
      return Math.min(formData.appliedCoupon.discountValue, baseAmount);
    }
  };

  // Calculate total amount
  const calculateTotal = () => {
    if (!service?.basePrice) return 0;

    const baseAmount = service.basePrice * (formData.quantity || 1);
    const discount = calculateDiscount();

    return baseAmount - discount;
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        if (!token) {
          toast.error('Please login to book a service');
          navigate('/login');
          return;
        }

        const [serviceData, addressesData] = await Promise.all([
          fetchService(),
          fetchUserAddresses()
        ]);

        setService(serviceData);
        setAddresses(addressesData);

        // Set default to custom address if no saved addresses exist
        setFormData(prev => ({
          ...prev,
          useCustomAddress: addressesData.length === 0
        }));

      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [serviceId, token, API, navigate]);

  // Fetch coupons when service is loaded or quantity changes
  useEffect(() => {
    if (service) {
      fetchAvailableCoupons();
    }
  }, [service, formData.quantity]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle quantity changes
  const handleQuantityChange = (action) => {
    setFormData(prev => {
      const newQuantity = action === 'increment'
        ? Math.min(prev.quantity + 1, 10)
        : Math.max(prev.quantity - 1, 1);

      return {
        ...prev,
        quantity: newQuantity,
        appliedCoupon: null,
        couponCode: prev.appliedCoupon ? '' : prev.couponCode
      };
    });
  };

  // Handle address changes
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      customAddress: {
        ...prev.customAddress,
        [name]: value
      }
    }));
  };

  // Handle date change
  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      date,
      appliedCoupon: null,
      time: ''
    }));
  };

  // Remove coupon
  const removeCoupon = () => {
    setFormData(prev => ({
      ...prev,
      couponCode: '',
      appliedCoupon: null
    }));
  };

  // Validate form
  const validateForm = () => {
    if (!service) {
      toast.error('Service information is not loaded');
      return false;
    }
    
    if (!formData.date || formData.date < new Date().setHours(0,0,0,0) || formData.date > maxDate) {
      toast.error('Please select a valid date within the next 3 days');
      return false;
    }

    if (!formData.time) {
      toast.error('Please select a time');
      return false;
    }

    if (!formData.useCustomAddress && addresses.length === 0) {
      toast.error('Please add an address to continue');
      return false;
    }

    if (formData.useCustomAddress) {
      const { street, city, state, postalCode } = formData.customAddress;
      if (!street?.trim() || !city?.trim() || !state?.trim() || !postalCode?.trim()) {
        toast.error('Please fill all address fields');
        return false;
      }

      if (!/^\d{6}$/.test(postalCode.trim())) {
        toast.error('Please enter a valid 6-digit postal code');
        return false;
      }
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    const toastId = toast.loading('Creating your booking...');

    try {
      // Prepare address data
      let addressData;
      if (formData.useCustomAddress) {
        addressData = formData.customAddress;
      } else {
        if (addresses.length === 0) {
          throw new Error('No address available');
        }
        addressData = addresses[0];
      }

      // Format the date correctly (YYYY-MM-DD)
      const formattedDate = formData.date.toISOString().split('T')[0];
      const baseAmount = service.basePrice * formData.quantity;
      const discountAmount = calculateDiscount();
      const totalAmount = calculateTotal();

      // Enhanced booking data with better validation
      const bookingData = {
        serviceId: service._id,
        date: formattedDate,
        time: formData.time,
        address: {
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          postalCode: addressData.postalCode,
          country: addressData.country || 'India'
        },
        notes: formData.notes.trim(),
        quantity: formData.quantity,
        couponCode: formData.appliedCoupon?.code || null,
        paymentMethod: 'online', // Default to online payment
        // These will be calculated by the backend, but can be sent for validation
        totalDiscount: discountAmount,
        subtotal: baseAmount,
        totalAmount: totalAmount
      };

      // Create booking with timeout
      const response = await axios.post(
        `${API}/booking`,
        bookingData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 second timeout
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create booking');
      }

      const bookingId = response.data.bookingId || response.data.data?._id;

      if (!bookingId) {
        throw new Error('Booking ID not received from server');
      }

      // Mark coupon as used if applied
      if (formData.appliedCoupon) {
        try {
          await markCouponUsed(formData.appliedCoupon.code, baseAmount);
        } catch (couponError) {
          console.warn('Failed to mark coupon as used:', couponError);
          // Don't fail the booking for coupon marking failure
        }
      }

      toast.update(toastId, {
        render: 'Booking created successfully! Redirecting to payment...',
        type: 'success',
        isLoading: false,
        autoClose: 2000
      });

      // Enhanced navigation with better data structure and validation
      console.log('Booking created successfully, preparing navigation...');
      console.log('BookingId received:', bookingId);
      console.log('Response data:', response.data);

      // Validate bookingId before navigation
      if (!bookingId || bookingId === 'undefined' || bookingId === 'null') {
        console.error('Invalid booking ID received:', bookingId);
        toast.update(toastId, {
          render: 'Booking created but navigation failed. Please check your bookings page.',
          type: 'warning',
          isLoading: false,
          autoClose: 5000
        });
        
        // Fallback navigation to bookings page
        setTimeout(() => {
          navigate('/customer/bookings', {
            state: {
              message: 'Booking created successfully! Please find your booking in the list below.',
              showRefresh: true
            }
          });
        }, 2000);
        return;
      }

      // Prepare comprehensive booking data for navigation
      const navigationBookingData = {
        ...response.data.data,
        _id: bookingId,
        service: service,
        couponApplied: formData.appliedCoupon,
        subtotal: baseAmount,
        totalDiscount: discountAmount,
        totalAmount: totalAmount,
        paymentStatus: 'pending',
        status: 'pending',
        // Ensure all required fields are present
        date: formData.date.toISOString().split('T')[0],
        time: formData.time,
        address: formData.useCustomAddress ? formData.customAddress : addresses[0],
        notes: formData.notes.trim(),
        quantity: formData.quantity,
        paymentMethod: 'online' // Default payment method
      };

      console.log('Navigation data prepared:', navigationBookingData);

      setTimeout(() => {
        try {
          navigate(`/customer/booking-confirm/${bookingId}`, {
            state: {
              booking: navigationBookingData,
              service: service,
              fromBookingPage: true,
              timestamp: Date.now()
            },
            replace: false // Don't replace current history entry
          });
          console.log('Navigation initiated successfully');
        } catch (navigationError) {
          console.error('Navigation error:', navigationError);
          toast.update(toastId, {
            render: 'Booking created successfully! Redirecting to bookings page...',
            type: 'success',
            isLoading: false,
            autoClose: 3000
          });
          
          // Fallback navigation
          setTimeout(() => {
            navigate('/customer/bookings', {
              state: {
                message: 'Booking created successfully!',
                bookingId: bookingId,
                showSuccessMessage: true
              }
            });
          }, 1000);
        }
      }, 1000);

    } catch (err) {
      console.error('Booking error:', err);
      
      let errorMessage = 'Failed to process booking';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection and try again.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Invalid booking data. Please check your details.';
      } else if (err.response?.status === 409) {
        errorMessage = 'This time slot is no longer available. Please select a different time.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast.update(toastId, {
        render: errorMessage,
        type: 'error',
        isLoading: false,
        autoClose: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = calculateTotal();
  const baseAmount = service?.basePrice * (formData.quantity || 1) || 0;
  const discountAmount = calculateDiscount();

  // Loading state
  if (isLoading || !service) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-secondary/70">Loading service details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center text-primary hover:text-primary/80 transition-all duration-200 mb-6 hover:scale-105"
          >
            <FaArrowLeft className="mr-2 transition-transform group-hover:-translate-x-1" />
            Back to services
          </button>
          <div className="text-center lg:text-left">
            <h1 className="text-3xl lg:text-4xl font-bold text-secondary mb-2">
              Book {service.title}
            </h1>
            <p className="text-secondary/60 text-lg">Complete your booking details below</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Service Summary Card */}
          <div className="lg:col-span-1">
            <div className="bg-background rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-6 hover:shadow-xl transition-shadow duration-300">
              {/* Service Header */}
              <div className="flex items-start mb-6">
                <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-50 shadow-md">
                  <img
                    src={service.image || '/placeholder-service.jpg'}
                    alt={service.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = '/placeholder-service.jpg';
                    }}
                  />
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-xl font-bold text-secondary mb-1">{service.title}</h2>
                  <p className="text-sm text-primary font-medium capitalize bg-primary/10 px-2 py-1 rounded-full inline-block">
                    {service.category?.toLowerCase()}
                  </p>
                  <div className="flex items-center mt-2 text-secondary/60">
                    <FaClock className="mr-1 text-xs" />
                    <span className="text-sm">{service.duration} hours</span>
                  </div>
                </div>
              </div>

              {/* Price Details */}
              <div className="space-y-4 border-t border-gray-100 pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-secondary/70">Service Price:</span>
                  <span className="font-semibold text-secondary">
                    ₹{(service.basePrice || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary/70">Quantity:</span>
                  <span className="font-semibold text-secondary">{formData.quantity}</span>
                </div>

                {/* Applied Coupon Display */}
                {formData.appliedCoupon && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-green-700 flex items-center">
                        <FaTag className="mr-2" />
                        {formData.appliedCoupon.code} Applied
                      </span>
                      <button
                        onClick={removeCoupon}
                        className="text-red-500 hover:text-red-700 text-sm font-medium hover:scale-105 transition-all duration-200"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-green-600">
                      {formData.appliedCoupon.discountType === 'percent' ? (
                        <span>{formData.appliedCoupon.discountValue}% OFF</span>
                      ) : (
                        <span>₹{formData.appliedCoupon.discountValue} OFF</span>
                      )}
                      {formData.appliedCoupon.maxDiscount && (
                        <span> (Max ₹{formData.appliedCoupon.maxDiscount})</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Price Summary */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary/70">Subtotal:</span>
                    <span className="font-medium text-secondary">₹{baseAmount.toFixed(2)}</span>
                  </div>
                  {formData.appliedCoupon && (
                    <div className="flex justify-between items-center">
                      <span className="text-secondary/70">Discount:</span>
                      <span className="font-medium text-green-600">-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                    <span className="text-secondary font-bold text-lg">Total Amount:</span>
                    <span className="font-bold text-xl text-primary">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Coupon Section */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center">
                    <FaTag className="mr-2 text-primary" />
                    Apply Coupon
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={formData.couponCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, couponCode: e.target.value }))}
                      className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                      disabled={!!formData.appliedCoupon || isFetchingCoupons}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={!!formData.appliedCoupon || isFetchingCoupons || !formData.couponCode.trim()}
                      className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                    >
                      {isFetchingCoupons ? 'Checking...' : 'Apply'}
                    </button>
                  </div>

                  {/* Available Coupons */}
                  {coupons.length > 0 && !formData.appliedCoupon && (
                    <div className="mt-4">
                      <p className="text-xs text-secondary/60 mb-2">Available coupons:</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {coupons.map(coupon => (
                          <div
                            key={coupon._id}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                couponCode: coupon.code
                              }));
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-medium text-primary">{coupon.code}</span>
                              <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                {coupon.discountType === 'percent'
                                  ? `${coupon.discountValue}% OFF`
                                  : `₹${coupon.discountValue} OFF`}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-secondary/60">
                              {coupon.minBookingValue > 0 && (
                                <p>Min. order: ₹{coupon.minBookingValue}</p>
                              )}
                              {coupon.expiryDate && (
                                <p>Valid until: {new Date(coupon.expiryDate).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Security Information Section */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center">
                    <FaShieldAlt className="mr-2 text-primary" />
                    Secure Booking
                  </h3>
                  
                  {/* Razorpay Logo */}
                  <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg border border-gray-200 mb-3">
                    <img 
                      src={razorpayLogo} 
                      alt="Razorpay Secure Payment Gateway" 
                      className="h-8 w-auto opacity-90 hover:opacity-100 transition-opacity duration-200"
                    />
                  </div>

                  {/* Security Features */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <FaLock className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="text-xs font-medium text-secondary">SSL Secure</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <FaShieldAlt className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="text-xs font-medium text-secondary">Protected</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <FaCreditCard className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="text-xs font-medium text-secondary">Bank Grade</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <FaCheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="text-xs font-medium text-secondary">Verified</span>
                    </div>
                  </div>

                  {/* Security Description */}
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-secondary/70 leading-relaxed text-center">
                      Your booking and payment information is encrypted and secure. We use industry-standard security measures.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-background rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300">
              <h2 className="text-2xl font-bold text-secondary mb-8 flex items-center">
                <FaCalendarAlt className="mr-3 text-primary" />
                Booking Details
              </h2>

              <div className="space-y-8">
                {/* Date and Time */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-2 items-center">
                      <FaCalendarAlt className="mr-2 text-primary" />
                      Booking Date *
                    </label>
                    <DatePicker
                      selected={formData.date}
                      onChange={handleDateChange}
                      minDate={new Date()}
                      maxDate={maxDate}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-primary/50"
                      dateFormat="MMMM d, yyyy"
                      required
                      placeholderText="Select booking date"
                    />
                    <p className="text-xs text-secondary/60 mt-1">Available for next 3 days only</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-2 items-center">
                      <FaClock className="mr-2 text-primary" />
                      Time Slot *
                    </label>
                    <select
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-primary/50"
                      required
                    >
                      <option value="">Select a time slot</option>
                      {timeSlots.length > 0 ? (
                        timeSlots.map((time, index) => (
                          <option key={`time-${index}`} value={time.value}>{time.display}</option>
                        ))
                      ) : (
                        <option disabled>No available time slots for today</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-semibold text-secondary mb-2">Quantity *</label>
                  <div className="flex items-center space-x-0">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange('decrement')}
                      className="px-4 py-3 border border-gray-200 rounded-l-xl bg-gray-50 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={formData.quantity <= 1}
                    >
                      <FaMinus className="w-4 h-4 text-secondary" />
                    </button>
                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      max="10"
                      value={formData.quantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          const clampedValue = Math.min(Math.max(value, 1), 10);
                          setFormData(prev => ({
                            ...prev,
                            quantity: clampedValue,
                            appliedCoupon: null
                          }));
                        }
                      }}
                      className="w-20 px-3 py-3 border-t border-b border-gray-200 text-center focus:outline-none focus:ring-2 focus:ring-primary font-semibold text-secondary"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange('increment')}
                      className="px-4 py-3 border border-gray-200 rounded-r-xl bg-gray-50 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={formData.quantity >= 10}
                    >
                      <FaPlus className="w-4 h-4 text-secondary" />
                    </button>
                  </div>
                  <p className="text-xs text-secondary/60 mt-1">Maximum 10 services can be booked at once</p>
                </div>

                {/* Address Selection */}
                <div>
                  <label className="block text-sm font-semibold text-secondary mb-3 items-center">
                    <FaMapMarkerAlt className="mr-2 text-primary" />
                    Service Address *
                  </label>

                  <div className="space-y-4">
                    {addresses.length > 0 && (
                      <>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="savedAddress"
                            checked={!formData.useCustomAddress}
                            onChange={() => setFormData(prev => ({ ...prev, useCustomAddress: false }))}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                          />
                          <label htmlFor="savedAddress" className="ml-3 block text-sm font-medium text-secondary">
                            Use saved address
                          </label>
                        </div>

                        {!formData.useCustomAddress && (
                          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 hover:border-primary/40 transition-colors duration-200">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mt-1">
                                <FaMapMarkerAlt className="h-5 w-5 text-primary" />
                              </div>
                              <div className="ml-3">
                                <p className="text-sm text-secondary font-medium">
                                  {addresses[0].street}, {addresses[0].city}, {addresses[0].state} - {addresses[0].postalCode}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="customAddress"
                        checked={formData.useCustomAddress}
                        onChange={() => setFormData(prev => ({ ...prev, useCustomAddress: true }))}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <label htmlFor="customAddress" className="ml-3 block text-sm font-medium text-secondary">
                        Use custom address
                      </label>
                    </div>

                    {formData.useCustomAddress && (
                      <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div>
                          <label htmlFor="street" className="block text-sm font-medium text-secondary mb-1">Street Address *</label>
                          <input
                            type="text"
                            id="street"
                            name="street"
                            placeholder="House no., Building, Street"
                            value={formData.customAddress.street}
                            onChange={handleAddressChange}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-primary/50"
                            required
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="city" className="block text-sm font-medium text-secondary mb-1">City *</label>
                            <input
                              type="text"
                              id="city"
                              name="city"
                              placeholder="City"
                              value={formData.customAddress.city}
                              onChange={handleAddressChange}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-primary/50"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="state" className="block text-sm font-medium text-secondary mb-1">State *</label>
                            <input
                              type="text"
                              id="state"
                              name="state"
                              placeholder="State"
                              value={formData.customAddress.state}
                              onChange={handleAddressChange}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-primary/50"
                              required
                            />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="postalCode" className="block text-sm font-medium text-secondary mb-1">Postal Code *</label>
                            <input
                              type="text"
                              id="postalCode"
                              name="postalCode"
                              placeholder="6-digit postal code"
                              value={formData.customAddress.postalCode}
                              onChange={handleAddressChange}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-primary/50"
                              pattern="\d{6}"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="country" className="block text-sm font-medium text-secondary mb-1">Country</label>
                            <input
                              type="text"
                              id="country"
                              name="country"
                              value={formData.customAddress.country}
                              onChange={handleAddressChange}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                              disabled
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-semibold text-secondary mb-2">Additional Notes (Optional)</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-primary/50 resize-none"
                    rows="4"
                    placeholder="Any special instructions for the service provider..."
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center items-center px-8 py-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-xl"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing Booking...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle className="mr-3 text-xl" />
                        Confirm Booking - ₹{totalAmount.toFixed(2)}
                      </>
                    )}
                  </button>
                  <p className="text-xs text-secondary/60 text-center mt-2">
                    You will be redirected to payment after booking confirmation
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookService;