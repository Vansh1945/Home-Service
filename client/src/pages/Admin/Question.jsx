import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../store/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, PlusCircle, Trash2, Edit2, Download, Upload, X, Check, 
  Search, Filter, BarChart3, Eye, CheckSquare, Square, 
  TrendingUp, Users, Activity, AlertCircle, Loader2,
  ChevronDown, ChevronUp, Star, BookOpen, Zap
} from 'lucide-react';

const AdminQuestions = () => {
  const { token, isAdmin, API, showToast, logoutUser } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [formData, setFormData] = useState({
    questionText: '',
    options: ['', ''],
    correctAnswer: 0,
    category: 'electrical',
    subcategory: 'wiring',
    isActive: true
  });

  // List states
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    subcategory: '',
    isActive: ''
  });

  // Bulk upload
  const [bulkQuestions, setBulkQuestions] = useState('');
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // New enhanced states
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [showStats, setShowStats] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('newest');
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);

  // Check admin status
  useEffect(() => {
    if (!isAdmin || !token) {
      showToast('Unauthorized access', 'error');
      navigate('/admin/dashboard');
    }
  }, [isAdmin, navigate, showToast, token]);

  // Fetch questions
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (filters.search) queryParams.append('search', filters.search);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.subcategory) queryParams.append('subcategory', filters.subcategory);
      if (filters.isActive) queryParams.append('isActive', filters.isActive);

      const response = await fetch(`${API}/question/get?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          logoutUser();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchQuestions();
    }
  }, [filters, token]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle option change
  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  // Add option field
  const addOption = () => {
    if (formData.options.length < 5) {
      setFormData(prev => ({ ...prev, options: [...prev.options, ''] }));
    }
  };

  // Remove option field
  const removeOption = (index) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        options: newOptions,
        correctAnswer: prev.correctAnswer >= newOptions.length ? newOptions.length - 1 : prev.correctAnswer
      }));
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      questionText: '',
      options: ['', ''],
      correctAnswer: 0,
      category: 'electrical',
      subcategory: 'wiring',
      isActive: true
    });
    setEditingId(null);
  };

  // Validate form
  const validateForm = () => {
    if (!formData.questionText.trim()) {
      showToast('Question text is required', 'error');
      return false;
    }

    if (formData.options.some(opt => !opt.trim())) {
      showToast('All options must be filled', 'error');
      return false;
    }

    if (formData.correctAnswer === null || formData.correctAnswer === undefined) {
      showToast('Please select a correct answer', 'error');
      return false;
    }

    if (formData.correctAnswer < 0 || formData.correctAnswer >= formData.options.length) {
      showToast('Correct answer must be one of the provided options', 'error');
      return false;
    }

    return true;
  };

  // Submit question
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const url = editingId
        ? `${API}/question/edit/${editingId}`
        : `${API}/question/`;

      const method = editingId ? 'PUT' : 'POST';

      // Ensure correctAnswer is within bounds
      const payload = {
        ...formData,
        correctAnswer: Math.min(formData.correctAnswer, formData.options.length - 1)
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 401) {
          logoutUser();
          throw new Error('Session expired. Please login again.');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save question');
      }

      const data = await response.json();
      showToast(editingId ? 'Question updated successfully' : 'Question added successfully');
      resetForm();
      if (showEditDialog) setShowEditDialog(false);
      fetchQuestions();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // Open edit dialog
  const openEditDialog = (question) => {
    setCurrentQuestion(question);
    setShowEditDialog(true);
    setFormData({
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      category: question.category,
      subcategory: question.subcategory,
      isActive: question.isActive
    });
    setEditingId(question._id);
  };

  // Close edit dialog
  const closeEditDialog = () => {
    setShowEditDialog(false);
    resetForm();
  };

  // Delete question
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      const response = await fetch(`${API}/question/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          logoutUser();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to delete question');
      }

      showToast('Question deleted successfully');
      fetchQuestions();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // Toggle question status
  const toggleStatus = async (id, currentStatus) => {
    try {
      const response = await fetch(`${API}/question/edit/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!response.ok) {
        if (response.status === 401) {
          logoutUser();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to update question status');
      }

      showToast(`Question ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchQuestions();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!bulkQuestions.trim()) {
      showToast('Please enter questions in the required format', 'error');
      return;
    }

    try {
      // Parse bulk questions
      const questionsArray = bulkQuestions.split('\n\n').map(q => {
        const lines = q.split('\n').filter(line => line.trim());
        if (lines.length < 3) return null;

        const questionText = lines[0].replace(/^\d+\.\s*/, '').trim();
        const options = lines.slice(1, -1).map(line =>
          line.replace(/^[a-z]\)\s*/, '').trim()
        );
        const correctAnswerLine = lines[lines.length - 1].toLowerCase();
        const correctAnswerChar = correctAnswerLine.match(/answer:\s*([a-z])/i)?.[1];
        const correctAnswer = correctAnswerChar ?
          correctAnswerChar.charCodeAt(0) - 'a'.charCodeAt(0) : 0;

        return {
          questionText,
          options,
          correctAnswer,
          category: formData.category,
          subcategory: formData.subcategory,
          isActive: formData.isActive
        };
      }).filter(q => q !== null);

      if (questionsArray.length === 0) {
        throw new Error('No valid questions found in the input');
      }

      const response = await fetch(`${API}/question/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ questions: questionsArray })
      });

      if (!response.ok) {
        if (response.status === 401) {
          logoutUser();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to upload bulk questions');
      }

      const data = await response.json();
      showToast(`${data.count} questions added successfully`);
      setBulkQuestions('');
      setShowBulkUpload(false);
      fetchQuestions();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (filters.category) queryParams.append('category', filters.category);
      if (filters.subcategory) queryParams.append('subcategory', filters.subcategory);

      const response = await fetch(`${API}/question/download/pdf?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          logoutUser();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to download PDF');
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'questions.pdf';

      // Convert the response to a blob
      const blob = await response.blob();

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('PDF download started', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced functions for new features
  const toggleQuestionSelection = useCallback((questionId) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }, []);

  const selectAllQuestions = useCallback(() => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map(q => q._id)));
    }
  }, [questions, selectedQuestions.size]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedQuestions.size === 0) {
      showToast('Please select questions to delete', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedQuestions.size} selected questions?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedQuestions).map(id =>
        fetch(`${API}/question/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      );

      await Promise.all(deletePromises);
      showToast(`${selectedQuestions.size} questions deleted successfully`);
      setSelectedQuestions(new Set());
      fetchQuestions();
    } catch (error) {
      showToast('Failed to delete some questions', 'error');
    }
  }, [selectedQuestions, API, token, showToast, fetchQuestions]);

  const openPreview = useCallback((question) => {
    setPreviewQuestion(question);
    setShowPreview(true);
  }, []);

  const closePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewQuestion(null);
  }, []);

  // Statistics calculations
  const statistics = useMemo(() => {
    const total = questions.length;
    const active = questions.filter(q => q.isActive).length;
    const inactive = total - active;
    const byCategory = questions.reduce((acc, q) => {
      acc[q.category] = (acc[q.category] || 0) + 1;
      return acc;
    }, {});
    const bySubcategory = questions.reduce((acc, q) => {
      acc[q.subcategory] = (acc[q.subcategory] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      active,
      inactive,
      byCategory,
      bySubcategory,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0
    };
  }, [questions]);

  // Sorted and filtered questions
  const sortedQuestions = useMemo(() => {
    let sorted = [...questions];
    
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        break;
      case 'alphabetical':
        sorted.sort((a, b) => a.questionText.localeCompare(b.questionText));
        break;
      case 'category':
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      default:
        break;
    }
    
    return sorted;
  }, [questions, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 transform transition-all hover:shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FileText className="text-blue-500" size={32} />
                Question Bank Management
              </h1>
              <p className="text-gray-600 mt-2">Efficiently manage and organize your test questions</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowStats(!showStats)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  showStats 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <BarChart3 size={18} />
                {showStats ? 'Hide Stats' : 'Show Stats'}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* Total Questions */}
                <motion.div
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                  className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Questions</p>
                      <p className="text-3xl font-bold mt-1">{statistics.total}</p>
                    </div>
                    <div className="bg-blue-400 bg-opacity-30 p-3 rounded-xl">
                      <BookOpen size={24} />
                    </div>
                  </div>
                </motion.div>

                {/* Active Questions */}
                <motion.div
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                  className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Active Questions</p>
                      <p className="text-3xl font-bold mt-1">{statistics.active}</p>
                      <p className="text-green-200 text-xs mt-1">{statistics.activePercentage}% of total</p>
                    </div>
                    <div className="bg-green-400 bg-opacity-30 p-3 rounded-xl">
                      <Check size={24} />
                    </div>
                  </div>
                </motion.div>

                {/* Inactive Questions */}
                <motion.div
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                  className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">Inactive Questions</p>
                      <p className="text-3xl font-bold mt-1">{statistics.inactive}</p>
                      <p className="text-red-200 text-xs mt-1">{100 - statistics.activePercentage}% of total</p>
                    </div>
                    <div className="bg-red-400 bg-opacity-30 p-3 rounded-xl">
                      <X size={24} />
                    </div>
                  </div>
                </motion.div>

                {/* Categories */}
                <motion.div
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                  className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Categories</p>
                      <p className="text-3xl font-bold mt-1">{Object.keys(statistics.byCategory).length}</p>
                      <p className="text-purple-200 text-xs mt-1">Different categories</p>
                    </div>
                    <div className="bg-purple-400 bg-opacity-30 p-3 rounded-xl">
                      <TrendingUp size={24} />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Category and Subcategory Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <motion.div
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                  className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200"
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="text-blue-500" size={20} />
                    Questions by Category
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(statistics.byCategory).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            category === 'electrical' ? 'bg-blue-500' : 'bg-green-500'
                          }`}></div>
                          <span className="text-gray-700 capitalize font-medium">{category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-semibold">{count}</span>
                          <span className="text-gray-500 text-sm">
                            ({Math.round((count / statistics.total) * 100)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Subcategory Breakdown */}
                <motion.div
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                  className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200"
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Activity className="text-purple-500" size={20} />
                    Questions by Subcategory
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(statistics.bySubcategory).map(([subcategory, count]) => (
                      <div key={subcategory} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            subcategory === 'wiring' ? 'bg-yellow-500' : 
                            subcategory === 'ac' ? 'bg-cyan-500' : 
                            subcategory === 'repair' ? 'bg-orange-500' : 'bg-gray-500'
                          }`}></div>
                          <span className="text-gray-700 capitalize font-medium">{subcategory}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-semibold">{count}</span>
                          <span className="text-gray-500 text-sm">
                            ({Math.round((count / statistics.total) * 100)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Question Form */}
            <motion.div
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 transform transition-all hover:shadow-2xl"
            >
              <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                {editingId ? (
                  <>
                    <Edit2 className="text-blue-500" size={20} />
                    Edit Question
                  </>
                ) : (
                  <>
                    <PlusCircle className="text-blue-500" size={20} />
                    Add New Question
                  </>
                )}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Question Text *</label>
                  <textarea
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
                    rows="4"
                    value={formData.questionText}
                    onChange={(e) => handleChange({ target: { name: 'questionText', value: e.target.value } })}
                    required
                    placeholder="Enter your question here..."
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Options *</label>
                  <div className="space-y-3">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3 group">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={formData.correctAnswer === index}
                          onChange={() => setFormData(prev => ({ ...prev, correctAnswer: index }))}
                          className="h-5 w-5 text-blue-500 focus:ring-blue-400 transition-all duration-200"
                          required
                        />
                        <input
                          type="text"
                          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          required
                          placeholder={`Option ${index + 1}`}
                        />
                        {formData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="p-2 text-red-500 hover:text-red-600 rounded-full hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all duration-200"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {formData.options.length < 5 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="mt-3 flex items-center gap-2 text-blue-500 hover:text-blue-600 text-sm font-medium transition-colors duration-200"
                    >
                      <PlusCircle size={16} /> Add Option
                    </button>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Minimum 2 options, maximum 5 options</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">Category *</label>
                    <select
                      name="category"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
                      value={formData.category}
                      onChange={handleChange}
                      required
                    >
                      <option value="electrical">Electrical</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">Subcategory *</label>
                    <select
                      name="subcategory"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
                      value={formData.subcategory}
                      onChange={handleChange}
                      required
                    >
                      <option value="wiring">Wiring</option>
                      <option value="ac">AC</option>
                      <option value="repair">Repair</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    className="h-5 w-5 text-blue-500 focus:ring-blue-400 rounded transition-all duration-200"
                    checked={formData.isActive}
                    onChange={(e) => handleChange({ target: { name: 'isActive', value: e.target.checked } })}
                  />
                  <label className="ml-2 text-gray-700 font-medium">Active Question</label>
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {editingId ? (
                      <>
                        <Edit2 size={16} /> Update
                      </>
                    ) : (
                      <>
                        <PlusCircle size={16} /> Add
                      </>
                    )}
                  </motion.button>

                  {editingId && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={resetForm}
                      className="flex items-center gap-2 px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <X size={16} /> Cancel
                    </motion.button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setShowBulkUpload(!showBulkUpload)}
                    className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {showBulkUpload ? (
                      <>
                        <X size={16} /> Hide Bulk
                      </>
                    ) : (
                      <>
                        <Upload size={16} /> Bulk Upload
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>

            {/* Bulk Upload Section */}
            {showBulkUpload && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 transform transition-all hover:shadow-2xl"
              >
                <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <Upload className="text-blue-500" size={20} />
                  Bulk Upload Questions
                </h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2 font-medium">Format example:</p>
                    <pre className="bg-gray-50 p-4 rounded-xl text-xs font-mono text-gray-700 overflow-x-auto shadow-inner">
                      {`1. What is the color of live wire in electrical wiring?
a) Red
b) Black
c) Green
Correct Answer: a

2. What does AC stand for?
a) Alternating Current
b) Actual Current
c) Active Current
Correct Answer: a`}
                    </pre>
                  </div>

                  <textarea
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
                    rows="8"
                    value={bulkQuestions}
                    onChange={(e) => setBulkQuestions(e.target.value)}
                    placeholder="Paste questions here in the specified format..."
                  />

                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleBulkUpload}
                      className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg flex-1"
                    >
                      <Upload size={16} /> Upload
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setBulkQuestions('')}
                      className="flex items-center gap-2 px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <X size={16} /> Clear
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Questions List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <motion.div
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 transform transition-all hover:shadow-2xl"
            >
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Filters</h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">Search</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search questions..."
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">Category</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  >
                    <option value="">All Categories</option>
                    <option value="electrical">Electrical</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">Subcategory</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
                    value={filters.subcategory}
                    onChange={(e) => setFilters({ ...filters, subcategory: e.target.value })}
                  >
                    <option value="">All Subcategories</option>
                    <option value="wiring">Wiring</option>
                    <option value="ac">AC</option>
                    <option value="repair">Repair</option>
                    <option value="all">All</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">Status</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
                    value={filters.isActive}
                    onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
                  >
                    <option value="">All Statuses</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Download size={16} /> Download PDF
                </motion.button>
              </div>
            </motion.div>

            {/* Questions List */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 transform transition-all hover:shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Questions List</h2>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {questions.length} questions found
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
                  />
                  <p className="text-gray-600">Loading questions...</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-700">No questions found</h3>
                  <p className="text-gray-500 mt-1">Add some questions to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question) => (
                    <motion.div
                      key={question._id}
                      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                      className="bg-gray-50 rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-800">{question.questionText}</h3>
                          <div className="mt-2 space-y-2">
                            {question.options.map((opt, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center text-sm ${idx === question.correctAnswer ? 'font-semibold text-green-600' : 'text-gray-600'}`}
                              >
                                <span className="w-6">{String.fromCharCode(97 + idx)}.</span>
                                <span>{opt}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${question.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {question.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                              {question.category}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => openEditDialog(question)}
                              className="p-2 text-blue-500 hover:text-blue-600 rounded-full hover:bg-blue-100 transition-all duration-200"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(question._id)}
                              className="p-2 text-red-500 hover:text-red-600 rounded-full hover:bg-red-100 transition-all duration-200"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => toggleStatus(question._id, question.isActive)}
                              className={`p-2 rounded-full ${question.isActive ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-100' : 'text-green-500 hover:text-green-600 hover:bg-green-100'} transition-all duration-200`}
                              title={question.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {question.isActive ? (
                                <X size={18} />
                              ) : (
                                <Check size={18} />
                              )}
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Edit Dialog */}
      {showEditDialog && currentQuestion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Edit Question</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={closeEditDialog}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </motion.button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Question Text</label>
                  <textarea
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
                    rows="4"
                    value={formData.questionText}
                    onChange={(e) => handleChange({ target: { name: 'questionText', value: e.target.value } })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Options</label>
                  <div className="space-y-3">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3 group">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={formData.correctAnswer === index}
                          onChange={() => setFormData(prev => ({ ...prev, correctAnswer: index }))}
                          className="h-5 w-5 text-blue-500 focus:ring-blue-400 transition-all duration-200"
                          required
                        />
                        <input
                          type="text"
                          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          required
                        />
                        {formData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="p-2 text-red-500 hover:text-red-600 rounded-full hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all duration-200"
                          >
                            <Trash2 size= {18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {formData.options.length < 5 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="mt-3 flex items-center gap-2 text-blue-500 hover:text-blue-600 text-sm font-medium transition-colors duration-200"
                    >
                      <PlusCircle size={16} /> Add Option
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">Category</label>
                    <select
                      name="category"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
                      value={formData.category}
                      onChange={handleChange}
                      required
                    >
                      <option value="electrical">Electrical</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">Subcategory</label>
                    <select
                      name="subcategory"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
                      value={formData.subcategory}
                      onChange={handleChange}
                      required
                    >
                      <option value="wiring">Wiring</option>
                      <option value="ac">AC</option>
                      <option value="repair">Repair</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    className="h-5 w-5 text-blue-500 focus:ring-blue-400 rounded transition-all duration-200"
                    checked={formData.isActive}
                    onChange={(e) => handleChange({ target: { name: 'isActive', value: e.target.checked } })}
                  />
                  <label className="ml-2 text-gray-700 font-medium">Active Question</label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={closeEditDialog}
                    className="px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Save Changes
                  </motion.button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminQuestions;