import { useEffect, useState } from 'react';
import { Table, Input, DatePicker, Select, Button, Card, Space, Tag, Typography } from 'antd';
import { SearchOutlined, RedoOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import './index.less';

const { Option } = Select;
const { Title } = Typography;

interface FileItem {
  id: number;
  title: string;
  fileType: string;
  sign_date: string;
  deadline: string;
  status: '已完成' | '进行中' | '未开始' | '已过期';
  customer_name: string;
}

function Query() {
  const [data, setData] = useState<FileItem[]>([]);
  const [filteredData, setFilteredData] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [searchConditions, setSearchConditions] = useState({
    title: '',
    fileType: '',
    sign_date: null as any,
    deadline: null as any,
    keyWord: '',
    customer_name: ''
  });

  // 文件类型映射
  const fileTypeMap: { [key: string]: string } = {
    '1': '安慰函',
    '2': '保证金担保合同',
    '3': '个人保证书',
    '4': '公司保证书',
    '5': '应收账款质押协议'
  };

  // 初始加载数据
  useEffect(() => {
    fetchData();
  }, []);

  // 获取数据
  const fetchData = async (params?: any) => {
    setLoading(true);
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.keys(params).forEach(key => {
          if (params[key]) {
            queryParams.append(key, params[key]);
          }
        });
      }
      const url = `http://127.0.0.1:8000/get${queryParams.size?'?':''}${queryParams.toString()}`;
      console.log('请求URL:', url);
      
      const response = await fetch(url);
      const result = await response.json();
      console.log('result.data===',result);
      
      if (result.success) {
        setData(result.data || []);
        setFilteredData(result.data || []);
      } else {
        console.error('获取数据失败:', result.message);
        setData([]);
        setFilteredData([]);
      }
    } catch (error) {
      console.error('请求失败:', error);
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  async function getData(){
    try {
      const url = `http://127.0.0.1:8000/get`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setData(result.data || []);
        setFilteredData(result.data || []);
      } else {
        console.error('获取数据失败:', result.message);
        setData([]);
        setFilteredData([]);
      }
    }catch(error){
      console.error(error);
      
    }
  }

  useEffect(()=>{
    getData()
  },[])

  // 表格列配置 - 更新字段名
  const columns: ColumnsType<FileItem> = [
    {
      title: '文件名',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (text: string) => (
        <div className="file-name-cell">
          <FileTextOutlined className="file-icon" />
          <span className="file-name-text">{text}</span>
        </div>
      )
    },
    {
      title: '文件类型',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 120,
      render: (type: string) => (
        <Tag className={`file-type-tag file-type-${type}`}>
          {fileTypeMap[type] || type}
        </Tag>
      )
    },
    {
      title: '客户',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 120,
      render: (customer: string) => (
        <span className="customer-text">{customer}</span>
      )
    },
    {
      title: '签署日期',
      dataIndex: 'sign_date',
      key: 'sign_date',
      width: 120,
      render: (date: string) => (
        <span className="date-text">{date}</span>
      )
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 120,
      render: (date: string) => (
        <span className="date-text">{date}</span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: FileItem['status']) => (
        <span className={`status-badge status-${status}`}>
          {status}
        </span>
      )
    }
  ];

  // 处理搜索
  const handleSearch = () => {
    // 构建请求参数
    const requestParams: any = {};
    
    if (searchConditions.title) {
      requestParams.title = searchConditions.title;
    }
    
    if (searchConditions.fileType) {
      requestParams.fileType = searchConditions.fileType;
    }
    
    if (searchConditions.customer_name) {
      requestParams.customer_name = searchConditions.customer_name;
    }
    
    if (searchConditions.sign_date) {
      requestParams.sign_date = searchConditions.sign_date.format('YYYY-MM-DD');
    }
    
    if (searchConditions.deadline) {
      requestParams.deadline = searchConditions.deadline.format('YYYY-MM-DD');
    }
    
    if (searchConditions.keyWord) {
      requestParams.keyWord = searchConditions.keyWord;
    }

    console.log('搜索参数:', requestParams);
    fetchData(requestParams);
  };

  // 重置搜索
  const handleReset = () => {
    setSearchConditions({
      title: '',
      fileType: '',
      sign_date: null,
      deadline: null,
      keyWord: '',
      customer_name: ''
    });
    // 重置后重新获取所有数据
    fetchData();
  };

  // 处理输入变化
  const handleInputChange = (field: string, value: any) => {
    setSearchConditions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="query-page">
      <Card className="search-card" bordered={false}>
        <div className="search-header">
          <Title level={4} className="search-title">
            文件查询
          </Title>
        </div>
        
        <div className="search-content">
          <Space size="large" wrap className="search-row">
            <div className="search-field">
              <div className="field-label">文件名</div>
              <Input
                placeholder="输入文件名关键词"
                value={searchConditions.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="search-input"
                allowClear
              />
            </div>
            
            <div className="search-field">
              <div className="field-label">文件类型</div>
              <Select
                placeholder="选择文件类型"
                value={searchConditions.fileType || undefined}
                onChange={(value) => handleInputChange('fileType', value)}
                className="search-select"
                allowClear
              >
                <Option value='1'>安慰函</Option>
                <Option value='2'>保证金担保合同</Option>
                <Option value='3'>个人保证书</Option>
                <Option value='4'>公司保证书</Option>
                <Option value='5'>应收账款质押协议</Option>
              </Select>
            </div>
            
            <div className="search-field">
              <div className="field-label">客户</div>
              <Input
                placeholder="输入客户名称"
                value={searchConditions.customer_name}
                onChange={(e) => handleInputChange('customer_name', e.target.value)}
                className="search-input"
                allowClear
              />
            </div>
          </Space>
          
          <Space size="large" wrap className="search-row">
            <div className="search-field">
              <div className="field-label">签署日期</div>
              <DatePicker
                placeholder="选择签署日期"
                value={searchConditions.sign_date}
                onChange={(date) => handleInputChange('sign_date', date)}
                className="search-date-picker"
                allowClear
              />
            </div>
            
            <div className="search-field">
              <div className="field-label">截止日期</div>
              <DatePicker
                placeholder="选择截止日期"
                value={searchConditions.deadline}
                onChange={(date) => handleInputChange('deadline', date)}
                className="search-date-picker"
                allowClear
              />
            </div>
            
            <div className="search-field">
              <div className="field-label">关键字搜索</div>
              <Input
                placeholder="输入文件相关关键字"
                value={searchConditions.keyWord}
                onChange={(e) => handleInputChange('keyWord', e.target.value)}
                className="search-input keyword-input"
                allowClear
              />
            </div>
            
            <div className="search-actions">
              <Button 
                type="primary" 
                icon={<SearchOutlined />}
                onClick={handleSearch}
                className="search-btn"
                loading={loading}
              >
                搜索
              </Button>
              <Button 
                icon={<RedoOutlined />}
                onClick={handleReset}
                className="reset-btn"
              >
                重置
              </Button>
            </div>
          </Space>
        </div>
      </Card>

      <Card className="table-card" bordered={false}>
        <div className="table-header">
          <Title level={5} className="table-title">
            文件列表
          </Title>
          <div className="table-summary">
            共 <span className="total-count">{filteredData.length}</span> 条记录
          </div>
        </div>
        
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            className: 'table-pagination'
          }}
          className="data-table"
          locale={{
            emptyText: (
              <div className="empty-state">
                <FileTextOutlined className="empty-icon" />
                <div className="empty-text">暂无数据</div>
              </div>
            )
          }}
        />
      </Card>
    </div>
  );
}

export default Query;