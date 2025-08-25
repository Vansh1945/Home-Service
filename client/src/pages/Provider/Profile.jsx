import { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ProviderProfile = () => {
  const { token, API, showToast, logoutUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Profile Data State
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    services: '',
    experience: '',
    serviceArea: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India'
    },
    bankDetails: {
      accountNo: '',
      ifsc: '',
      passbookImage: '',
      verified: false
    },
    providerProfile: '',
    resume: '',
    approved: false,
    kycStatus: 'pending',
    profileComplete: false,
    completedBookings: 0,
    canceledBookings: 0,
    testPassed: false,
    isActive: true,
    blockedTill: null,
    registrationDate: null,
    age: 0,
    updatedAt: null,
    createdAt: null,
    feedbacks: [],
    rejectionReason: ''
  });

  // UI State
  const [editMode, setEditMode] = useState({
    basic: false,
    professional: false,
    address: false,
    bank: false
  });
  
  const [fileUploads, setFileUploads] = useState({
    profilePic: null,
    resume: null,
    passbookImage: null
  });

  // Fetch provider profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API}/provider/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        setProfileData({
          ...data.provider,
          address: data.provider.address || {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'India'
          },
          bankDetails: data.provider.bankDetails || {
            accountNo: '',
            ifsc: '',
            passbookImage: '',
            verified: false
          },
          feedbacks: data.provider.feedbacks || []
        });
      } catch (error) {
        showToast(error.message, 'error');
      }
    };

    fetchProfile();
  }, [token, API, showToast]);

  // Handle input changes
  const handleChange = (e, section) => {
    const { name, value } = e.target;

    if (section === 'address') {
      setProfileData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [name]: value
        }
      }));
    } else if (section === 'bank') {
      setProfileData(prev => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [name]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle file uploads
  const handleFileChange = (e, field) => {
    setFileUploads(prev => ({
      ...prev,
      [field]: e.target.files[0]
    }));
  };

  // Unified profile update function
  const updateProfile = async (updateType) => {
    try {
      const formData = new FormData();

      formData.append('updateType', updateType);

      switch (updateType) {
        case 'basic':
          formData.append('name', profileData.name);
          formData.append('phone', profileData.phone);
          formData.append('dateOfBirth', profileData.dateOfBirth);
          if (fileUploads.profilePic) {
            formData.append('profilePic', fileUploads.profilePic);
          }
          break;

        case 'professional':
          formData.append('services', profileData.services);
          formData.append('experience', profileData.experience);
          formData.append('serviceArea', profileData.serviceArea);
          if (fileUploads.resume) {
            formData.append('resume', fileUploads.resume);
          }
          break;

        case 'address':
          formData.append('street', profileData.address.street);
          formData.append('city', profileData.address.city);
          formData.append('state', profileData.address.state);
          formData.append('postalCode', profileData.address.postalCode);
          formData.append('country', profileData.address.country);
          break;

        case 'bank':
          formData.append('accountNo', profileData.bankDetails.accountNo);
          formData.append('ifsc', profileData.bankDetails.ifsc);
          if (fileUploads.passbookImage) {
            formData.append('passbookImage', fileUploads.passbookImage);
          }
          break;

        case 'profilePic':
          if (!fileUploads.profilePic) {
            throw new Error('Please select a profile picture');
          }
          formData.append('profilePic', fileUploads.profilePic);
          break;

        case 'resume':
          if (!fileUploads.resume) {
            throw new Error('Please select a resume file');
          }
          formData.append('resume', fileUploads.resume);
          break;
      }

      const response = await fetch(`${API}/provider/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const data = await response.json();
      setProfileData(prev => ({
        ...prev,
        ...data.provider,
        address: data.provider.address || prev.address,
        bankDetails: data.provider.bankDetails || prev.bankDetails
      }));

      setFileUploads({ profilePic: null, resume: null, passbookImage: null });
      setEditMode({ basic: false, professional: false, address: false, bank: false });

      showToast(data.message || 'Profile updated successfully');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // View document function
  const viewDocument = async (type) => {
    try {
      const response = await fetch(`${API}/provider/document/${type}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to view ${type}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // Delete account
  const deleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        const response = await fetch(`${API}/provider/profile`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete account');
        }

        showToast('Account deleted successfully');
        logoutUser();
      } catch (error) {
        showToast(error.message, 'error');
      }
    }
  };

  // Calculate profile completion percentage
  const calculateProfileCompletion = () => {
    const fields = [
      profileData.name,
      profileData.phone,
      profileData.dateOfBirth,
      profileData.services,
      profileData.experience,
      profileData.serviceArea,
      profileData.address.street,
      profileData.address.city,
      profileData.address.state,
      profileData.address.postalCode,
      profileData.bankDetails.accountNo,
      profileData.bankDetails.ifsc,
      profileData.providerProfile,
      profileData.resume,
      profileData.bankDetails.passbookImage
    ];
    
    const completedFields = fields.filter(field => field && field !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">Service Provider Profile</h1>
          <p className="mt-2 text-secondary">Manage your professional information and documents</p>
        </div>

        {/* Profile Completion Banner */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary">Profile Completion</h3>
              <span className="text-2xl font-bold text-primary">{calculateProfileCompletion()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${calculateProfileCompletion()}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-secondary">
              Complete your profile to increase your chances of getting more bookings
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex flex-wrap space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: '👤' },
                { id: 'documents', name: 'Documents', icon: '📄' },
                { id: 'profile', name: 'Profile Details', icon: '⚙️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-secondary hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Service Statistics */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-primary px-6 py-4">
                <h2 className="text-xl font-semibold text-white">Service Statistics</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{profileData.completedBookings}</div>
                    <div className="text-sm text-secondary">Completed Bookings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent">{profileData.canceledBookings}</div>
                    <div className="text-sm text-secondary">Canceled Bookings</div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">Test Status:</span>
                      <span className={`text-sm font-medium ${profileData.testPassed ? 'text-green-600' : 'text-yellow-500'}`}>
                        {profileData.testPassed ? 'Passed' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">Account Status:</span>
                      <span className={`text-sm font-medium ${profileData.isActive ? 'text-green-600' : 'text-red-500'}`}>
                        {profileData.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">Approval Status:</span>
                      <span className={`text-sm font-medium ${profileData.approved ? 'text-green-600' : 'text-yellow-500'}`}>
                        {profileData.approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">KYC Status:</span>
                      <span className={`text-sm font-medium ${
                        profileData.kycStatus === 'approved' ? 'text-green-600' : 
                        profileData.kycStatus === 'rejected' ? 'text-red-600' : 'text-yellow-500'
                      }`}>
                        {profileData.kycStatus.charAt(0).toUpperCase() + profileData.kycStatus.slice(1)}
                      </span>
                    </div>
                  </div>
                  {profileData.blockedTill && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-secondary">Blocked Until:</span>
                      <span className="text-sm font-medium text-red-600">
                        {new Date(profileData.blockedTill).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-primary px-6 py-4">
                <h2 className="text-xl font-semibold text-white">Account Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-secondary">Registration Date</h3>
                    <p className="mt-1 text-sm text-secondary">
                      {profileData.registrationDate ? 
                        new Date(profileData.registrationDate).toLocaleDateString() : 
                        'Not available'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-secondary">Account Age</h3>
                    <p className="mt-1 text-sm text-secondary">
                      {profileData.age ? `${profileData.age} years` : 'Not available'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-secondary">Last Updated</h3>
                    <p className="mt-1 text-sm text-secondary">
                      {profileData.updatedAt ? 
                        new Date(profileData.updatedAt).toLocaleDateString() : 
                        'Not available'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-secondary">Member Since</h3>
                    <p className="mt-1 text-sm text-secondary">
                      {profileData.createdAt ? 
                        new Date(profileData.createdAt).toLocaleDateString() : 
                        'Not available'}
                    </p>
                  </div>
                </div>

                {profileData.kycStatus === 'rejected' && profileData.rejectionReason && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <h4 className="text-sm font-medium text-red-800">KYC Rejection Reason</h4>
                    <p className="mt-1 text-sm text-red-700">{profileData.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Feedbacks */}
            {profileData.feedbacks && profileData.feedbacks.length > 0 && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-primary px-6 py-4">
                  <h2 className="text-xl font-semibold text-white">Recent Customer Feedbacks</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {profileData.feedbacks.slice(0, 5).map((feedback, index) => (
                      <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`w-4 h-4 ${i < feedback.rating ? 'fill-current' : 'text-gray-300'}`}
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="ml-2 text-sm text-secondary">
                                by {feedback.customer?.name || 'Anonymous'}
                              </span>
                            </div>
                            <p className="text-sm text-secondary">{feedback.comment}</p>
                          </div>
                          <span className="text-xs text-gray-500 ml-4">
                            {new Date(feedback.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Document Center */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-primary px-6 py-4">
                <h2 className="text-xl font-semibold text-white">Document Center</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Profile Picture */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-center">
                      <div className="mb-4">
                        <img
                          src={profileData.providerProfile ? `${API}/${profileData.providerProfile}` : `${API}/uploads/default-provider.jpg`}
                          alt="Profile"
                          className="w-24 h-24 rounded-full mx-auto border-4 border-primary object-cover"
                          onError={(e) => {
                            e.target.src = `${API}/uploads/default-provider.jpg`;
                          }}
                        />
                      </div>
                      <h3 className="text-lg font-medium text-secondary mb-2">Profile Picture</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            profileData.providerProfile ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {profileData.providerProfile ? 'Uploaded' : 'Default'}
                          </span>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <label
                            htmlFor="profilePicUpload"
                            className="cursor-pointer inline-flex justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-secondary bg-white hover:bg-gray-50"
                          >
                            Update Photo
                          </label>
                          <input
                            id="profilePicUpload"
                            type="file"
                            onChange={(e) => handleFileChange(e, 'profilePic')}
                            accept="image/*"
                            className="hidden"
                          />
                          {fileUploads.profilePic && (
                            <button
                              onClick={() => updateProfile('profilePic')}
                              className="px-4 py-2 bg-primary hover:bg-teal-800 rounded-md text-sm font-medium text-white"
                            >
                              Save Photo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resume */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-center">
                      <div className="mb-4">
                        <div className="w-24 h-24 mx-auto bg-red-100 rounded-lg flex items-center justify-center">
                          <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-secondary mb-2">Resume</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            profileData.resume ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {profileData.resume ? 'Uploaded' : 'Not Uploaded'}
                          </span>
                        </div>
                        <div className="flex flex-col space-y-2">
                          {profileData.resume && (
                            <button
                              onClick={() => viewDocument('resume')}
                              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-teal-800 text-sm font-medium"
                            >
                              View Resume
                            </button>
                          )}
                          <label
                            htmlFor="resumeUpload"
                            className="cursor-pointer inline-flex justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-secondary bg-white hover:bg-gray-50"
                          >
                            {profileData.resume ? 'Update Resume' : 'Upload Resume'}
                          </label>
                          <input
                            id="resumeUpload"
                            type="file"
                            onChange={(e) => handleFileChange(e, 'resume')}
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                          />
                          {fileUploads.resume && (
                            <button
                              onClick={() => updateProfile('resume')}
                              className="px-4 py-2 bg-primary hover:bg-teal-800 rounded-md text-sm font-medium text-white"
                            >
                              Save Resume
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Passbook */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="text-center">
                      <div className="mb-4">
                        <div className="w-24 h-24 mx-auto bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-secondary mb-2">Bank Passbook</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            profileData.bankDetails.passbookImage ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {profileData.bankDetails.passbookImage ? 'Uploaded' : 'Not Uploaded'}
                          </span>
                        </div>
                        <div className="flex items-center justify-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            profileData.bankDetails.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {profileData.bankDetails.verified ? 'Verified' : 'Pending Verification'}
                          </span>
                        </div>
                        <div className="flex flex-col space-y-2">
                          {profileData.bankDetails.passbookImage && (
                            <button
                              onClick={() => viewDocument('passbook')}
                              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-teal-800 text-sm font-medium"
                            >
                              View Passbook
                            </button>
                          )}
                          <label
                            htmlFor="passbookUpload"
                            className="cursor-pointer inline-flex justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-secondary bg-white hover:bg-gray-50"
                          >
                            {profileData.bankDetails.passbookImage ? 'Update Passbook' : 'Upload Passbook'}
                          </label>
                          <input
                            id="passbookUpload"
                            type="file"
                            onChange={(e) => handleFileChange(e, 'passbookImage')}
                            accept="image/*"
                            className="hidden"
                          />
                          {fileUploads.passbookImage && (
                            <button
                              onClick={() => updateProfile('bank')}
                              className="px-4 py-2 bg-primary hover:bg-teal-800 rounded-md text-sm font-medium text-white"
                            >
                              Save Passbook
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Guidelines */}
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Document Guidelines</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Profile picture should be clear and professional</li>
                    <li>• Resume should be in PDF, DOC, or DOCX format</li>
                    <li>• Bank passbook image should clearly show account details</li>
                    <li>• All documents will be verified by our team</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Overview Card */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-primary px-6 py-4 text-center">
                <h2 className="text-xl font-semibold text-white">Profile Overview</h2>
              </div>
              <div className="p-6">
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <img
                      src={`${API}/uploads/${profileData.providerProfile || 'default-provider.jpg'}`}
                      alt="Profile"
                      className="w-32 h-32 rounded-full border-4 border-primary object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-secondary">{profileData.name}</h3>
                  <p className="text-primary">{profileData.email}</p>
                  <p className="text-secondary mt-1">{profileData.phone}</p>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-secondary mb-2">ACCOUNT STATUS</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">Approval Status:</span>
                      <span className={`text-sm font-medium ${profileData.approved ? 'text-green-600' : 'text-yellow-500'}`}>
                        {profileData.approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">KYC Status:</span>
                      <span className={`text-sm font-medium ${
                        profileData.kycStatus === 'approved' ? 'text-green-600' : 
                        profileData.kycStatus === 'rejected' ? 'text-red-600' : 'text-yellow-500'
                      }`}>
                        {profileData.kycStatus.charAt(0).toUpperCase() + profileData.kycStatus.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">Profile Completion:</span>
                      <span className={`text-sm font-medium ${profileData.profileComplete ? 'text-green-600' : 'text-yellow-500'}`}>
                        {calculateProfileCompletion()}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">Bank Verification:</span>
                      <span className={`text-sm font-medium ${profileData.bankDetails.verified ? 'text-green-600' : 'text-yellow-500'}`}>
                        {profileData.bankDetails.verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-primary px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Basic Information</h2>
                <button
                  onClick={() => setEditMode({ ...editMode, basic: !editMode.basic })}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    editMode.basic ? 'bg-white text-primary' : 'bg-accent text-white hover:bg-orange-500'
                  }`}
                >
                  {editMode.basic ? 'Cancel' : 'Edit'}
                </button>
              </div>

              <div className="p-6">
                {editMode.basic ? (
                  <form onSubmit={(e) => { e.preventDefault(); updateProfile('basic'); }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={profileData.name}
                          onChange={(e) => handleChange(e)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Email</label>
                        <input
                          type="email"
                          value={profileData.email}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={profileData.phone}
                          onChange={(e) => handleChange(e)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Date of Birth</label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleChange(e)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setEditMode({ ...editMode, basic: false })}
                        className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-secondary bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-secondary">Full Name</h3>
                      <p className="mt-1 text-sm text-secondary">{profileData.name}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-secondary">Email</h3>
                      <p className="mt-1 text-sm text-secondary">{profileData.email}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-secondary">Phone</h3>
                      <p className="mt-1 text-sm text-secondary">{profileData.phone || 'Not provided'}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-secondary">Date of Birth</h3>
                      <p className="mt-1 text-sm text-secondary">
                        {profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toLocaleDateString() : 'Not provided'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-primary px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Professional Information</h2>
                <button
                  onClick={() => setEditMode({ ...editMode, professional: !editMode.professional })}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    editMode.professional ? 'bg-white text-primary' : 'bg-accent text-white hover:bg-orange-500'
                  }`}
                >
                  {editMode.professional ? 'Cancel' : 'Edit'}
                </button>
              </div>

              <div className="p-6">
                {editMode.professional ? (
                  <form onSubmit={(e) => { e.preventDefault(); updateProfile('professional'); }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Service Type</label>
                        <select
                          name="services"
                          value={profileData.services}
                          onChange={(e) => handleChange(e)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select Service</option>
                          <option value="Electrical">Electrical</option>
                          <option value="AC">AC</option>
                          <option value="Appliance Repair">Appliance Repair</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Experience (years)</label>
                        <input
                          type="number"
                          name="experience"
                          value={profileData.experience || ''}
                          onChange={(e) => handleChange(e)}
                          min="0"
                          max="40"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-secondary mb-1">Service Area</label>
                        <input
                          type="text"
                          name="serviceArea"
                          value={profileData.serviceArea || ''}
                          onChange={(e) => handleChange(e)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setEditMode({ ...editMode, professional: false })}
                        className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-secondary bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-secondary">Service Type</h3>
                      <p className="mt-1 text-sm text-secondary">{profileData.services || 'Not provided'}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-secondary">Experience</h3>
                      <p className="mt-1 text-sm text-secondary">
                        {profileData.experience ? `${profileData.experience} years` : 'Not provided'}
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-secondary">Service Area</h3>
                      <p className="mt-1 text-sm text-secondary">{profileData.serviceArea || 'Not provided'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-primary px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Address Information</h2>
                <button
                  onClick={() => setEditMode({ ...editMode, address: !editMode.address })}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    editMode.address ? 'bg-white text-primary' : 'bg-accent text-white hover:bg-orange-500'
                  }`}
                >
                  {editMode.address ? 'Cancel' : 'Edit'}
                </button>
              </div>

              <div className="p-6">
                {editMode.address ? (
                  <form onSubmit={(e) => { e.preventDefault(); updateProfile('address'); }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Street</label>
                        <input
                          type="text"
                          name="street"
                          value={profileData.address.street}
                          onChange={(e) => handleChange(e, 'address')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">City</label>
                        <input
                          type="text"
                          name="city"
                          value={profileData.address.city}
                          onChange={(e) => handleChange(e, 'address')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">State</label>
                        <input
                          type="text"
                          name="state"
                          value={profileData.address.state}
                          onChange={(e) => handleChange(e, 'address')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Postal Code</label>
                        <input
                          type="text"
                          name="postalCode"
                          value={profileData.address.postalCode}
                          onChange={(e) => handleChange(e, 'address')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Country</label>
                        <input
                          type="text"
                          name="country"
                          value={profileData.address.country}
                          onChange={(e) => handleChange(e, 'address')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setEditMode({ ...editMode, address: false })}
                        className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-secondary bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-secondary">Street</h3>
                      <p className="mt-1 text-sm text-secondary">{profileData.address.street || 'Not provided'}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-secondary">City</h3>
                      <p className="mt-1 text-sm text-secondary">{profileData.address.city || 'Not provided'}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-secondary">State</h3>
                      <p className="mt-1 text-sm text-secondary">{profileData.address.state || 'Not provided'}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-secondary">Postal Code</h3>
                      <p className="mt-1 text-sm text-secondary">{profileData.address.postalCode || 'Not provided'}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-secondary">Country</h3>
                      <p className="mt-1 text-sm text-secondary">{profileData.address.country || 'Not provided'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Information */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-primary px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Bank Information</h2>
                <button
                  onClick={() => setEditMode({ ...editMode, bank: !editMode.bank })}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    editMode.bank ? 'bg-white text-primary' : 'bg-accent text-white hover:bg-orange-500'
                  }`}
                >
                  {editMode.bank ? 'Cancel' : 'Edit'}
                </button>
              </div>

              <div className="p-6">
                {editMode.bank ? (
                  <form onSubmit={(e) => { e.preventDefault(); updateProfile('bank'); }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Account Number</label>
                        <input
                          type="text"
                          name="accountNo"
                          value={profileData.bankDetails.accountNo}
                          onChange={(e) => handleChange(e, 'bank')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">IFSC Code</label>
                        <input
                          type="text"
                          name="ifsc"
                          value={profileData.bankDetails.ifsc}
                          onChange={(e) => handleChange(e, 'bank')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setEditMode({ ...editMode, bank: false })}
                        className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-secondary bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-secondary">Account Number</h3>
                      <p className="mt-1 text-sm text-secondary">
                        {profileData.bankDetails.accountNo ? 
                          `****${profileData.bankDetails.accountNo.slice(-4)}` : 
                          'Not provided'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-secondary">IFSC Code</h3>
                      <p className="mt-1 text-sm text-secondary">{profileData.bankDetails.ifsc || 'Not provided'}</p>
                    </div>

                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-secondary">Verification Status</h3>
                      <p className={`mt-1 text-sm font-medium ${
                        profileData.bankDetails.verified ? 'text-green-600' : 'text-yellow-500'
                      }`}>
                        {profileData.bankDetails.verified ? 'Verified' : 'Pending Verification'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-red-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white">Account Actions</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <h4 className="text-sm font-medium text-red-800 mb-2">Delete Account</h4>
                    <p className="text-sm text-red-700 mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button
                      onClick={deleteAccount}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderProfile;