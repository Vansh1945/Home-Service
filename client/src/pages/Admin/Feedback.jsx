import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { 
  Table, 
  Card, 
  Typography, 
  Rate, 
  Tag, 
  Space, 
  Input, 
  Select, 
  Statistic, 
  Row, 
  Col, 
  Spin, 
  Alert, 
  Button, 
  Modal, 
  Divider,
  Avatar,
  Progress,
  Badge,
  Tooltip,
  Empty
} from 'antd';
import { 
  SearchOutlined, 
  StarOutlined, 
  FilterOutlined, 
  UserOutlined,
  ToolOutlined,
  CalendarOutlined,
  CommentOutlined,
  TrophyOutlined,
  HeartOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const AdminFeedback = () => {
  const { API, isAdmin, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState(null);
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('all'); // 'all', 'provider', 'service'
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      logoutUser();
      return;
    }
    fetchAllFeedbacks();
  }, []);

  const fetchAllFeedbacks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API}/feedback/admin/all-feedbacks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch feedbacks');
      }

      setFeedbacks(data.data || []);
      calculateStats(data.data || []);
    } catch (err) {
      setError(err.message || 'Error connecting to server');
      console.error('Error fetching feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateStats = (feedbackData) => {
    if (!feedbackData || feedbackData.length === 0) {
      setStats(null);
      return;
    }

    // Calculate provider feedback stats
    const providerRatings = feedbackData
      .filter(fb => fb.providerFeedback?.rating)
      .map(fb => fb.providerFeedback.rating);
    
    // Calculate service feedback stats
    const serviceRatings = feedbackData
      .filter(fb => fb.serviceFeedback?.rating)
      .map(fb => fb.serviceFeedback.rating);

    // Combined stats
    const allRatings = [...providerRatings, ...serviceRatings];
    const totalRatings = allRatings.reduce((sum, rating) => sum + rating, 0);
    const averageRating = allRatings.length > 0 ? totalRatings / allRatings.length : 0;
    
    // Rating distribution for all ratings
    const ratingCounts = [0, 0, 0, 0, 0];
    allRatings.forEach(rating => {
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating - 1]++;
      }
    });

    setStats({
      averageRating,
      totalFeedbacks: feedbackData.length,
      providerFeedbackCount: providerRatings.length,
      serviceFeedbackCount: serviceRatings.length,
      averageProviderRating: providerRatings.length > 0 ? 
        providerRatings.reduce((sum, rating) => sum + rating, 0) / providerRatings.length : 0,
      averageServiceRating: serviceRatings.length > 0 ? 
        serviceRatings.reduce((sum, rating) => sum + rating, 0) / serviceRatings.length : 0,
      ratingDistribution: ratingCounts
    });
  };

  const filteredFeedbacks = (feedbacks || []).filter(feedback => {
    // Search filter
    const matchesSearch = 
      (feedback.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (feedback.providerFeedback?.provider?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (feedback.serviceFeedback?.service?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (feedback.providerFeedback?.comment || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (feedback.serviceFeedback?.comment || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Rating filter
    let matchesRating = true;
    if (ratingFilter) {
      if (feedbackTypeFilter === 'provider') {
        matchesRating = feedback.providerFeedback?.rating === ratingFilter;
      } else if (feedbackTypeFilter === 'service') {
        matchesRating = feedback.serviceFeedback?.rating === ratingFilter;
      } else {
        // For 'all', match if either provider or service rating matches
        matchesRating = 
          feedback.providerFeedback?.rating === ratingFilter || 
          feedback.serviceFeedback?.rating === ratingFilter;
      }
    }
    
    return matchesSearch && matchesRating;
  });

  const handleResetFilters = () => {
    setSearchTerm('');
    setRatingFilter(null);
    setFeedbackTypeFilter('all');
  };

  const showFeedbackDetails = (feedback) => {
    setSelectedFeedback(feedback);
    setDetailModalVisible(true);
  };

  const columns = [
    {
      title: 'Customer',
      dataIndex: ['customer', 'name'],
      key: 'customer',
      width: 150,
      render: (name, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <Button 
            type="link" 
            onClick={() => showFeedbackDetails(record)}
            style={{ padding: 0, fontWeight: 500 }}
          >
            {name || 'N/A'}
          </Button>
        </div>
      )
    },
    {
      title: 'Provider',
      dataIndex: ['providerFeedback', 'provider', 'name'],
      key: 'provider',
      width: 150,
      render: (name) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size="small" icon={<ToolOutlined />} style={{ backgroundColor: '#52c41a' }} />
          <Text strong>{name || 'N/A'}</Text>
        </div>
      )
    },
    {
      title: 'Service',
      dataIndex: ['serviceFeedback', 'service', 'title'],
      key: 'service',
      width: 180,
      render: (title, record) => (
        <div>
          <Text strong style={{ color: '#1890ff' }}>{title || 'N/A'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.serviceFeedback?.service?.category || 'N/A'}
          </Text>
        </div>
      )
    },
    {
      title: 'Provider Rating',
      key: 'providerRating',
      width: 140,
      align: 'center',
      render: (_, record) => {
        const rating = record.providerFeedback?.rating || 0;
        return (
          <div style={{ textAlign: 'center' }}>
            <Rate 
              disabled 
              value={rating} 
              style={{ fontSize: 14 }} 
            />
            <div style={{ marginTop: 4 }}>
              <Badge 
                count={rating} 
                style={{ 
                  backgroundColor: rating >= 4 ? '#52c41a' : rating >= 3 ? '#faad14' : '#ff4d4f',
                  fontSize: 10
                }} 
              />
            </div>
          </div>
        );
      },
      sorter: (a, b) => (a.providerFeedback?.rating || 0) - (b.providerFeedback?.rating || 0)
    },
    {
      title: 'Service Rating',
      key: 'serviceRating',
      width: 140,
      align: 'center',
      render: (_, record) => {
        const rating = record.serviceFeedback?.rating || 0;
        return (
          <div style={{ textAlign: 'center' }}>
            <Rate 
              disabled 
              value={rating} 
              style={{ fontSize: 14 }} 
            />
            <div style={{ marginTop: 4 }}>
              <Badge 
                count={rating} 
                style={{ 
                  backgroundColor: rating >= 4 ? '#52c41a' : rating >= 3 ? '#faad14' : '#ff4d4f',
                  fontSize: 10
                }} 
              />
            </div>
          </div>
        );
      },
      sorter: (a, b) => (a.serviceFeedback?.rating || 0) - (b.serviceFeedback?.rating || 0)
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      width: 120,
      render: (date) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CalendarOutlined style={{ color: '#8c8c8c' }} />
          <Text style={{ fontSize: 12 }}>
            {date ? new Date(date).toLocaleDateString() : 'N/A'}
          </Text>
        </div>
      ),
      sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const providerRating = record.providerFeedback?.rating || 0;
        const serviceRating = record.serviceFeedback?.rating || 0;
        const avgRating = (providerRating + serviceRating) / 2;
        
        const getStatusConfig = (rating) => {
          if (rating >= 4) return { color: 'success', icon: <TrophyOutlined />, text: 'Excellent' };
          if (rating >= 3) return { color: 'warning', icon: <HeartOutlined />, text: 'Good' };
          return { color: 'error', icon: <CommentOutlined />, text: 'Needs Attention' };
        };
        
        const config = getStatusConfig(avgRating);
        
        return (
          <Tag color={config.color} icon={config.icon} style={{ fontWeight: 500 }}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="View Details">
          <Button 
            type="primary" 
            shape="circle" 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => showFeedbackDetails(record)}
            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
          />
        </Tooltip>
      )
    }
  ];

  if (loading && feedbacks.length === 0) {
    return (
      <Card style={{ margin: 20 }}>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Loading feedback data...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{ margin: 20 }}>
        <Alert message="Error" description={error} type="error" showIcon />
        <Button style={{ marginTop: 16 }} onClick={fetchAllFeedbacks}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div style={{ 
      padding: 24, 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '24px 32px', 
        borderRadius: 12, 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: 24
      }}>
        <Title level={2} style={{ 
          margin: 0, 
          background: 'linear-gradient(45deg, #1890ff, #722ed1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: 28
        }}>
          ⭐ Customer Feedback Management
        </Title>
        <Paragraph style={{ 
          margin: '8px 0 0 0', 
          fontSize: 16, 
          color: '#666' 
        }}>
          Monitor and analyze customer feedback for providers and services
        </Paragraph>
      </div>

      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card 
              style={{ 
                borderRadius: 12, 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              <Statistic 
                title={<span style={{ color: 'white', fontWeight: 500 }}>Overall Average Rating</span>}
                value={stats.averageRating.toFixed(1)} 
                prefix={<StarOutlined style={{ color: '#ffd700' }} />}
                valueStyle={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card 
              style={{ 
                borderRadius: 12, 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                border: 'none'
              }}
            >
              <Statistic 
                title={<span style={{ color: 'white', fontWeight: 500 }}>Total Feedbacks</span>}
                value={stats.totalFeedbacks}
                prefix={<CommentOutlined style={{ color: 'white' }} />}
                valueStyle={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card 
              style={{ 
                borderRadius: 12, 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                border: 'none'
              }}
            >
              <Statistic 
                title={<span style={{ color: 'white', fontWeight: 500 }}>Provider Avg Rating</span>}
                value={stats.averageProviderRating.toFixed(1)}
                prefix={<ToolOutlined style={{ color: 'white' }} />}
                valueStyle={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card 
              style={{ 
                borderRadius: 12, 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                border: 'none'
              }}
            >
              <Statistic 
                title={<span style={{ color: 'white', fontWeight: 500 }}>Service Avg Rating</span>}
                value={stats.averageServiceRating.toFixed(1)}
                prefix={<HeartOutlined style={{ color: 'white' }} />}
                valueStyle={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {stats && (
        <Card style={{ 
          marginBottom: 24, 
          borderRadius: 12, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
        }}>
          <Title level={4} style={{ marginBottom: 16 }}>
            📊 Rating Distribution
          </Title>
          <Row gutter={16}>
            {stats.ratingDistribution.map((count, index) => {
              const rating = 5 - index;
              const percentage = stats.totalFeedbacks > 0 ? (count / (stats.providerFeedbackCount + stats.serviceFeedbackCount)) * 100 : 0;
              return (
                <Col span={4} key={index}>
                  <div style={{ textAlign: 'center', padding: 16 }}>
                    <Rate 
                      disabled 
                      value={rating} 
                      style={{ fontSize: 16, marginBottom: 8 }} 
                      count={1}
                    />
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                      {count}
                    </div>
                    <Progress 
                      percent={percentage} 
                      showInfo={false} 
                      strokeColor={{
                        '0%': rating >= 4 ? '#52c41a' : rating >= 3 ? '#faad14' : '#ff4d4f',
                        '100%': rating >= 4 ? '#73d13d' : rating >= 3 ? '#ffc53d' : '#ff7875',
                      }}
                      style={{ marginTop: 8 }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {percentage.toFixed(1)}%
                    </Text>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Card>
      )}

      <Card
        style={{ 
          borderRadius: 12, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CommentOutlined style={{ color: '#1890ff' }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>📋 Feedback List</span>
          </div>
        }
        extra={
          <Button 
            icon={<FilterOutlined />} 
            onClick={handleResetFilters}
            disabled={!searchTerm && !ratingFilter && feedbackTypeFilter === 'all'}
            style={{ 
              borderRadius: 8,
              background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
              borderColor: 'transparent',
              color: 'white'
            }}
          >
            Clear Filters
          </Button>
        }
      >
        <div style={{ 
          marginBottom: 20, 
          padding: 16, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 12
        }}>
          <Space size="large" wrap>
            <Input
              placeholder="🔍 Search feedbacks..."
              prefix={<SearchOutlined style={{ color: 'white' }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: 280,
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.9)'
              }}
            />
            <Select
              placeholder="📊 Filter by feedback type"
              value={feedbackTypeFilter}
              onChange={(value) => setFeedbackTypeFilter(value)}
              style={{ 
                width: 200,
                borderRadius: 8
              }}
            >
              <Option value="all">🌟 All Feedback</Option>
              <Option value="provider">👨‍🔧 Provider Feedback</Option>
              <Option value="service">🛠️ Service Feedback</Option>
            </Select>
            <Select
              placeholder="⭐ Filter by rating"
              allowClear
              value={ratingFilter}
              onChange={(value) => setRatingFilter(value)}
              style={{ 
                width: 170,
                borderRadius: 8
              }}
            >
              <Option value={5}>⭐⭐⭐⭐⭐ 5 Stars</Option>
              <Option value={4}>⭐⭐⭐⭐ 4 Stars</Option>
              <Option value={3}>⭐⭐⭐ 3 Stars</Option>
              <Option value={2}>⭐⭐ 2 Stars</Option>
              <Option value={1}>⭐ 1 Star</Option>
            </Select>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredFeedbacks}
          rowKey="_id"
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} feedbacks`,
            style: { marginTop: 16 }
          }}
          style={{ 
            borderRadius: 8,
            overflow: 'hidden'
          }}
          scroll={{ x: true }}
          locale={{ 
            emptyText: (
              <Empty 
                description="No feedback data available" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          }}
        />
      </Card>

      <Modal
        title={
          <div style={{ 
            textAlign: 'center',
            background: 'linear-gradient(45deg, #1890ff, #722ed1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: 20,
            fontWeight: 'bold'
          }}>
            🔍 Detailed Feedback Analysis
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={1000}
        style={{ top: 20 }}
        bodyStyle={{ 
          padding: '24px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: 12
        }}
      >
        {selectedFeedback && (
          <div>
            {/* Customer & Booking Info */}
            <Card style={{ 
              marginBottom: 16, 
              borderRadius: 12,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar size={48} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                    <div>
                      <Text strong style={{ color: 'white', fontSize: 16 }}>
                        {selectedFeedback.customer?.name || 'N/A'}
                      </Text>
                      <br />
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                        {selectedFeedback.customer?.email || ''}
                      </Text>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CalendarOutlined style={{ color: 'white', fontSize: 24 }} />
                    <div>
                      <Text strong style={{ color: 'white', fontSize: 16 }}>Booking Date</Text>
                      <br />
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                        {selectedFeedback.booking?.date ? new Date(selectedFeedback.booking.date).toLocaleDateString() : 'N/A'}
                      </Text>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Provider Feedback */}
            <Card style={{ 
              marginBottom: 16, 
              borderRadius: 12,
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              border: 'none'
            }}>
              <Title level={4} style={{ color: 'white', marginBottom: 16 }}>
                👨‍🔧 Provider Feedback
              </Title>
              
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar size={40} icon={<ToolOutlined />} style={{ backgroundColor: '#52c41a' }} />
                    <div>
                      <Text strong style={{ color: 'white', fontSize: 14 }}>
                        {selectedFeedback.providerFeedback?.provider?.name || 'N/A'}
                      </Text>
                      <br />
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                        {selectedFeedback.providerFeedback?.provider?.email || ''}
                      </Text>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <Rate 
                      disabled 
                      value={selectedFeedback.providerFeedback?.rating || 0} 
                      style={{ fontSize: 20 }} 
                    />
                    <br />
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                      {(selectedFeedback.providerFeedback?.rating || 0)} star{(selectedFeedback.providerFeedback?.rating !== 1 ? 's' : '')}
                    </Text>
                  </div>
                </Col>
              </Row>

              <div style={{ marginTop: 16 }}>
                <Text strong style={{ color: 'white' }}>💬 Provider Comment:</Text>
                <div style={{ 
                  padding: 16, 
                  backgroundColor: 'rgba(255,255,255,0.9)', 
                  borderRadius: 8,
                  marginTop: 8,
                  minHeight: 60
                }}>
                  <Text style={{ fontSize: 14, lineHeight: 1.6 }}>
                    {selectedFeedback.providerFeedback?.comment || 'No comment provided'}
                  </Text>
                </div>
              </div>
            </Card>

            {/* Service Feedback */}
            <Card style={{ 
              marginBottom: 16, 
              borderRadius: 12,
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              border: 'none'
            }}>
              <Title level={4} style={{ color: 'white', marginBottom: 16 }}>
                🛠️ Service Feedback
              </Title>

              <Row gutter={16}>
                <Col span={12}>
                  <div>
                    <Text strong style={{ color: 'white', fontSize: 16 }}>
                      {selectedFeedback.serviceFeedback?.service?.title || 'N/A'}
                    </Text>
                    <br />
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                      Category: {selectedFeedback.serviceFeedback?.service?.category || 'N/A'}
                    </Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <Rate 
                      disabled 
                      value={selectedFeedback.serviceFeedback?.rating || 0} 
                      style={{ fontSize: 20 }} 
                    />
                    <br />
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                      {(selectedFeedback.serviceFeedback?.rating || 0)} star{(selectedFeedback.serviceFeedback?.rating !== 1 ? 's' : '')}
                    </Text>
                  </div>
                </Col>
              </Row>

              <div style={{ marginTop: 16 }}>
                <Text strong style={{ color: 'white' }}>💬 Service Comment:</Text>
                <div style={{ 
                  padding: 16, 
                  backgroundColor: 'rgba(255,255,255,0.9)', 
                  borderRadius: 8,
                  marginTop: 8,
                  minHeight: 60
                }}>
                  <Text style={{ fontSize: 14, lineHeight: 1.6 }}>
                    {selectedFeedback.serviceFeedback?.comment || 'No comment provided'}
                  </Text>
                </div>
              </div>
            </Card>

            {/* Submission Info */}
            <Card style={{ 
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              border: 'none',
              textAlign: 'center'
            }}>
              <Text strong style={{ color: 'white', fontSize: 16 }}>📅 Submitted On:</Text>
              <br />
              <Text style={{ color: 'white', fontSize: 14 }}>
                {selectedFeedback.createdAt ? new Date(selectedFeedback.createdAt).toLocaleString() : 'N/A'}
              </Text>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminFeedback;
