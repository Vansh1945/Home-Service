import { useState, useEffect } from 'react';
import { useAuth } from '../store/auth';

const useServices = () => {
  const [services, setServices] = useState([]);
  const [providerServices, setProviderServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providerServicesLoading, setProviderServicesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [providerServicesError, setProviderServicesError] = useState(null);
  const { API } = useAuth();

  const fetchProviderServiceCategories = async () => {
    try {
      setProviderServicesLoading(true);
      setProviderServicesError(null);
      
      const response = await fetch(`${API}/provider/service-categories`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch provider service categories');
      }
      
      if (data.success && data.data) {
        setProviderServices(data.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching provider service categories:', err);
      setProviderServicesError(err.message);
      // Set fallback provider services from Provider model enum
      setProviderServices([
        { _id: 'electrical', title: 'Electrical', category: 'Electrical' },
        { _id: 'ac', title: 'AC', category: 'AC' },
        { _id: 'appliance-repair', title: 'Appliance Repair', category: 'Appliance Repair' },
        { _id: 'other', title: 'Other', category: 'Other' }
      ]);
    } finally {
      setProviderServicesLoading(false);
    }
  };
  

  const refetchProviderServices = () => {
    fetchProviderServiceCategories();
  };





  // Get provider service categories (for provider registration)
  const getProviderServiceCategories = () => {
    return providerServices;
  };

  return {

    
    // Provider service categories (from Provider model enum)
    providerServices,
    providerServicesLoading,
    providerServicesError,
    fetchProviderServiceCategories,
    refetchProviderServices,
    getProviderServiceCategories
  };
};

export default useServices;
