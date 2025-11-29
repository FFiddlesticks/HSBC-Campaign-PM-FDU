import { Button, Card, Col, Row, Table, message, Tag, Badge, Modal, Input, Form } from 'antd';
import ReactECharts from 'echarts-for-react';
import './index.less';
// import { dataSource } from './../../const/mock'
import { useState } from 'react';
import { dataSourceList, dataSourceListPre } from './../../const/dashBoardData';
import { useSelector } from 'react-redux';

const columns = [
  {
    title: '文件名',
    dataIndex: 'fileName',
    key: 'fileName',
  },
  {
    title: '签署日期',
    dataIndex: 'signDate',
    key: 'signDate',
  },
  {
    title: '截止日期',
    dataIndex: 'deadline',
    key: 'deadline',
    render: (text: string) => {
      if (!text) return <span>-</span>;
      const now = new Date();
      const deadline = new Date(text);
      const msPerDay = 1000 * 60 * 60 * 24;
      const diff = Math.ceil((deadline.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / msPerDay);
      let statusClass = '';
      if (diff <= 3) statusClass = 'deadline-urgent';
      else if (diff <= 7) statusClass = 'deadline-warning';
      return (
        <Tag className={`deadline-tag ${statusClass}`}>
          {text}
        </Tag>
      );
    },
  },
  {
    title: '客户名',
    dataIndex: 'clientName',
    key: 'clientName',
  },
  // 操作 列 — 单行发送行为将在组件内部处理（以便更新状态）
  {
    title: '操作',
    key: 'action',
    render: () => null,
  },
];

const cloumnsDat=[[19, 0, 0, 2, 9, 7, 0, 0, 0, 0, 0, 0],[20, 0, 0, 2, 10, 8, 0, 0, 0, 0, 0, 0]]

function Home() {
  const [filedId, setFieldId] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [dataSource,setDataSource]=useState(dataSourceList[1])
  const isUpload=useSelector(state=>(state as any)?.data?.isUpload)
  
  // const [data, setData] = useState(
  //   dataSource.map((it: any) => ({ ...it, status: it.status || '' }))
  // );
  const [sending, setSending] = useState(false);
  // 邮件草稿状态
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailTargets, setEmailTargets] = useState<any[]>([]); // target records
  const [emailType, setEmailType] = useState<'single' | 'batch'>('single');
  const [emailDraft, setEmailDraft] = useState({ to: localStorage.getItem('authUser') || '', cc: '', subject: '', body: '' });

  // 单条或批量发送提醒并更新状态（模拟 2s 后端）
  // 打开发送邮件草稿窗口（单条或批量）
  const sendReminder = (target: any, type: 'single' | 'batch' = 'single') => {
    setEmailType(type);
    const targets = type === 'single' ? [target] : (target || []);
    setEmailTargets(targets);

    // 生成默认主题和正文
    const fileNames = targets.map((t: any) => t.fileName).filter(Boolean);
    let subject = '';
    if (type === 'single') subject = `【Reminder: ${fileNames[0] || 'Document'}】`;
    else {
      const snippet = fileNames.slice(0, 3).join(', ');
      // 三个以上文件名时加省略号
      subject = `[Expiration Reminder: ${snippet}${fileNames.length > 3 ? '...' : ''}]`;
    }

    const recipient = localStorage.getItem('authUser') || '';
    const lines = [] as string[];
    if (type === 'single') {
      // lines.push('Dear Client,');
      // lines.push('');
      lines.push(`This is a gentle reminder regarding the document "${fileNames[0] || 'Document'}".`);
      lines.push('According to our records, this document is approaching its expiry date.');
      lines.push('');
      lines.push('Please arrange for renewal at your earliest convenience.');
      lines.push('');
      lines.push('Best Regards,');
      lines.push('Project Argus System');
      lines.push('HSBC');
    } else {
      lines.push('This is a gentle reminder that the following documents are approaching their expiry date:');
      fileNames.forEach((f: string) => lines.push(`- ${f}`));
      lines.push('Please arrange for renewal at your earliest convenience.');
      lines.push('');
      lines.push('Best Regards,');
      lines.push('Project Argus System');
      lines.push('HSBC');
    }

    setEmailDraft({
      to: recipient,
      cc: '',
      subject,
      body: lines.join('\n')
    });

    setEmailModalVisible(true);
  };

  // 柱状图配置选项 - 使用更柔和的颜色
  const barChartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: ['1周', '2周', '3周', '4周', '5周', '6周', '7周', '8周', '9周', '10周', '11周', '12周']
    },
    yAxis: {
      type: 'value',
      name: '数量'
    },
    series: [
      {
        name: '到期文档',
        type: 'bar',
        data: isUpload?cloumnsDat[1]:cloumnsDat[0],
        itemStyle: {
          color: '#1890ff'
        }
      }
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
  };

  const field = ['1天内', '7天内', '30天内', '90天内'];
  // const fieldCount = [5, 20, 40, 200];

  const selectField = (idx: number) => {
    setFieldId(idx);
    setDataSource(isUpload?dataSourceList[idx]:dataSourceListPre[idx])
    setSelectedRowKeys([]);
  };

  const handleBatchReminder = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要发送提醒的文件');
      return;
    }
    const selectedKeySet = new Set(selectedRowKeys.map(k => String(k)));
    const selectedRecords = dataSource.filter((it: any) => selectedKeySet.has(String(it.fileCode ?? it.key)));
    sendReminder(selectedRecords, 'batch');
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div className="home-page">
      <Row className="summary-row">
        <Col span={24}>
          <Card className="summary-card">
            <div className="time-filter">
              {field.map((item, idx: number) => (
                <Button
                  key={idx}
                  className={`filter-btn ${filedId === idx ? 'filter-btn-active' : ''}`}
                  onClick={() => selectField(idx)}
                >
                  {item}
                </Button>
              ))}
            </div>
            <div className="summary-content">
              <h3 className="summary-title">
                最近{field[filedId]}，有 <span className="highlight-count">{dataSource.length}</span> 份文件即将到期
              </h3>
              <span className="summary-desc">请及时处理这些即将到期的文件</span>
            </div>
          </Card>
        </Col>
      </Row>

      <Row className="chart-row">
        <Col span={24}>
          <Card className="chart-card">
            <div className="chart-header">
              <h4 className="chart-title">未来90天到期文件统计</h4>
            </div>
            <ReactECharts
              option={barChartOption}
              className="chart-container"
              opts={{ renderer: 'svg' }}
            />
          </Card>
        </Col>
      </Row>

      <Row className="table-row">
        <Col span={24}>
          <Card className="table-card">
            <div className="table-header">
              <div className="table-actions">
                <Button
                  type="primary"
                  className="batch-reminder-btn"
                  onClick={handleBatchReminder}
                  disabled={selectedRowKeys.length === 0 || sending}
                  loading={sending}
                >
                  一键发送提醒 ({selectedRowKeys.length})
                </Button>
                <span className="selected-count">
                  已选择 {selectedRowKeys.length} 个文件
                </span>
              </div>
            </div>

            <Table
              dataSource={dataSource}
              columns={(() => {
                return [
                  ...columns.slice(0, 4),
                  {
                    title: '操作',
                    key: 'action',
                    render: (_: any, record: any) => (
                      <Button
                        type="link"
                        size="small"
                        className="reminder-btn"
                        onClick={() => sendReminder(record, 'single')}
                        loading={sending}
                        disabled={sending}
                      >
                        发送到期提醒
                      </Button>
                    ),
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status: string) => (
                      status === 'reminded' ?
                        <Badge status="success" text="已提醒" className="reminded-badge" /> :
                        <span className="not-reminded">未提醒</span>
                    ),
                  },
                ];
              })()}
              rowSelection={rowSelection}
              pagination={false}
              rowKey={(record: any) => record.fileCode || record.key}
              className="file-table"
            />

            {/* 邮件草稿模态框 */}
            <Modal
              title={emailType === 'single' ? '发送邮件提醒' : '发送邮件提醒（批量）'}
              open={emailModalVisible}
              onCancel={() => setEmailModalVisible(false)}
              onOk={() => {
                // 立即发送（模拟）：更新对应行的状态并关闭
                setSending(true);
                message.loading({ content: '发送邮件中...', key: 'mailSending', duration: 0 });
                setTimeout(() => {
                  const codes = emailTargets.map(r => String(r.fileCode ?? r.key));
                  const codeSet = new Set(codes);
                  setDataSource(prev => prev.map((it: any) => (codeSet.has(String(it.fileCode ?? it.key)) ? { ...it, status: 'reminded' } : it)));
                  setEmailModalVisible(false);
                  setSending(false);
                  setSelectedRowKeys([]);
                  message.success({ content: '邮件发送成功，相关行已标记为 已提醒', key: 'mailSending' });
                }, 2000);
              }}
              width={800}
              okText="发送"
              cancelText="取消"
            >
              <Form layout="vertical">
                <Form.Item label="收件人 (To)">
                  <Input value={emailDraft.to} onChange={(e) => setEmailDraft(prev => ({ ...prev, to: e.target.value }))} />
                </Form.Item>
                <Form.Item label="抄送 (CC)">
                  <Input value={emailDraft.cc} onChange={(e) => setEmailDraft(prev => ({ ...prev, cc: e.target.value }))} />
                </Form.Item>
                <Form.Item label="邮件标题 (Subject)">
                  <Input value={emailDraft.subject} onChange={(e) => setEmailDraft(prev => ({ ...prev, subject: e.target.value }))} />
                </Form.Item>
                <Form.Item label="邮件内容 (Body)">
                  <Input.TextArea rows={8} value={emailDraft.body} onChange={(e) => setEmailDraft(prev => ({ ...prev, body: e.target.value }))} />
                </Form.Item>
              </Form>
            </Modal>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Home;