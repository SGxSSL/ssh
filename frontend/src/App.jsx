import React, { useEffect, useState, useRef } from 'react';
import { Layout, Button, Row, Col, Table, Tag, Timeline, Space, Form, Input, Card, message, Statistic, Progress, Avatar, Tooltip, Divider } from 'antd';
import { listApprovals, createDummy, runAgent, listAudit, approve, login } from './api';
import {
  ClockCircleOutlined,
  UserOutlined,
  LockOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  DollarOutlined,
  LogoutOutlined,
  PlusOutlined,
  RobotOutlined,
  HistoryOutlined
} from '@ant-design/icons';

const { Header, Content } = Layout;

function formatPendingHours(submitted) {
  const then = new Date(submitted);
  const diff = (Date.now() - then.getTime()) / 3600 / 1000;
  return diff.toFixed(1);
}

function SLAProgress({ approval }) {
  if (approval.status === 'APPROVED') return <Progress percent={100} size="small" status="success" />;

  const pending = parseFloat(formatPendingHours(approval.submitted_at));
  const percent = Math.min(100, Math.round((pending / approval.sla_hours) * 100));

  let status = 'normal';
  if (percent >= 100) status = 'exception';
  else if (percent >= 50) status = 'active';

  return (
    <Tooltip title={`${pending}h / ${approval.sla_hours}h SLA`}>
      <div className="sla-progress-bar">
        <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{percent}% Consumed</span>
          <span style={{ fontWeight: 600, color: percent >= 100 ? '#ff4d4f' : percent >= 50 ? '#faad14' : '#52c41a' }}>
            {approval.status}
          </span>
        </div>
        <Progress percent={percent} size="small" showInfo={false} strokeColor={percent >= 100 ? '#ff4d4f' : percent >= 50 ? '#faad14' : '#52c41a'} status={status} />
      </div>
    </Tooltip>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [audit, setAudit] = useState([]);
  const pollingRef = useRef(null);

  const load = async () => {
    if (!user) return;
    try {
      const filter = user?.role === 'REQUESTER' ? user.username : null;
      const a = await listApprovals(filter);
      setApprovals(a);
      const au = await listAudit();
      setAudit(au);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  useEffect(() => {
    if (user) {
      load();
      pollingRef.current = setInterval(load, 5000);
      return () => clearInterval(pollingRef.current);
    }
  }, [user]);

  const onLogin = async (values) => {
    try {
      const res = await login(values.username, values.password);
      setUser(res);
      message.success(`Welcome back, ${res.username}`);
    } catch (err) {
      message.error("Access Denied: Please check your credentials");
    }
  };

  const onLogout = () => {
    setUser(null);
    clearInterval(pollingRef.current);
  };

  const onCreate = async () => {
    await createDummy(user.username);
    message.loading({ content: 'Initiating approval workflow...', key: 'create' });
    setTimeout(() => {
      load();
      message.success({ content: 'Request submitted to Purchasing Committee', key: 'create', duration: 2 });
    }, 1000);
  };

  const onRunAgent = async () => {
    message.loading({ content: 'Agent scanning pending requests...', key: 'agent', icon: <RobotOutlined /> });
    await runAgent();
    setTimeout(() => {
      load();
      message.success({ content: 'Agent audit complete. Notifications dispatched.', key: 'agent', duration: 3 });
    }, 1200);
  };

  const onApprove = async (id) => {
    await approve(id);
    load();
    message.success("Item successfully approved");
  };

  const isApprover = ['APPROVER', 'CHAIR', 'FINANCE'].includes(user?.role);

  // Stats calculation
  const stats = {
    pending: approvals.filter(a => a.status === 'PENDING').length,
    warnings: approvals.filter(a => {
      const p = parseFloat(formatPendingHours(a.submitted_at));
      return a.status === 'PENDING' && p >= (a.sla_hours * 0.5) && p < a.sla_hours;
    }).length,
    breached: approvals.filter(a => a.status === 'ESCALATED' || parseFloat(formatPendingHours(a.submitted_at)) >= a.sla_hours).length,
    totalValue: approvals.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()
  };

  const columns = [
    {
      title: 'Vendor',
      dataIndex: 'vendor_name',
      key: 'vendor',
      render: (text) => <span style={{ fontWeight: 600, color: '#0f172a' }}>{text}</span>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: v => (
        <Space size="small">
          <DollarOutlined style={{ color: '#10b981' }} />
          <span style={{ fontWeight: 500 }}>{v.toLocaleString()}</span>
        </Space>
      )
    },
    {
      title: 'Lifecycle & SLA Status',
      key: 'sla',
      width: 280,
      render: (_, r) => <SLAProgress approval={r} />
    },
    {
      title: 'Requester',
      dataIndex: 'requester',
      key: 'requester',
      render: (r) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />
          <span style={{ fontSize: '13px' }}>{r}</span>
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, r) => (
        <Space>
          {r.status === 'ESCALATED' && <Tag color="error" icon={<AlertOutlined />}>Escalated</Tag>}
          {r.status === 'APPROVED' && <Tag color="success" icon={<CheckCircleOutlined />}>Approved</Tag>}

          {isApprover && r.status !== 'APPROVED' && (
            <Button type="primary" size="middle" shape="round" onClick={() => onApprove(r.id)} icon={<CheckCircleOutlined />}>
              Approve
            </Button>
          )}

          {user?.role === 'REQUESTER' && r.status === 'PENDING' && (
            <Tag color="processing" icon={<InfoCircleOutlined />}>In Review</Tag>
          )}
        </Space>
      )
    }
  ];

  if (!user) {
    return (
      <div className="login-container" style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Card className="login-card glass-card" style={{ width: 450 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div className="logo-text" style={{ fontSize: '2rem', marginBottom: 8 }}>AI Approval Agent</div>
            <div style={{ color: '#64748b' }}>AI-Powered Approval Orchestration</div>
          </div>

          <Divider orientation="left" style={{ margin: '0 0 20px 0' }}>Demo Access</Divider>
          <Row gutter={[8, 8]} style={{ marginBottom: 24 }}>
            <Col span={12}><Tag className="glass-card" style={{ width: '100%', margin: 0, padding: 8 }}>Requester: <b>requester1</b></Tag></Col>
            <Col span={12}><Tag className="glass-card" style={{ width: '100%', margin: 0, padding: 8 }}>Approver: <b>finance</b></Tag></Col>
          </Row>

          <Form onFinish={onLogin} layout="vertical" size="large">
            <Form.Item name="username" rules={[{ required: true, message: 'Identity required' }]}>
              <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Username" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: 'Credential required' }]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Password" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" htmlType="submit" block className="btn-primary-gradient">
                Sign In to Dashboard
              </Button>
            </Form.Item>
            <div style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
              All passwords are <b>pass123</b>
            </div>
          </Form>
        </Card>
      </div>
    );
  }

  return (
    <Layout className="dashboard-layout">
      <Header className="header-active" style={{ padding: '0 40px', height: '72px' }}>
        <Row justify="space-between" align="middle" style={{ height: '100%' }}>
          <Col>
            <div className="logo-text">AI Approval Agent</div>
          </Col>
          <Col>
            <Space size="large">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>{user.username}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize' }}>{user.role}</span>
              </div>
              <Divider type="vertical" style={{ height: '32px' }} />
              <Tooltip title="Log out">
                <Button type="text" icon={<LogoutOutlined />} onClick={onLogout} />
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Header>

      <Content style={{ padding: '32px 40px' }}>
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Row gutter={24}>
              <Col span={6}>
                <Card className="glass-card stat-card" bordered={false}>
                  <Statistic
                    title={<span style={{ color: '#64748b' }}>Pending Approvals</span>}
                    value={stats.pending}
                    prefix={<ClockCircleOutlined style={{ color: '#3b82f6' }} />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card className="glass-card stat-card" bordered={false}>
                  <Statistic
                    title={<span style={{ color: '#64748b' }}>SLA Warnings</span>}
                    value={stats.warnings}
                    prefix={<AlertOutlined style={{ color: '#f59e0b' }} />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card className="glass-card stat-card" bordered={false}>
                  <Statistic
                    title={<span style={{ color: '#64748b' }}>Critical Breaches</span>}
                    value={stats.breached}
                    prefix={<InfoCircleOutlined style={{ color: '#ef4444' }} />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card className="glass-card stat-card" bordered={false}>
                  <Statistic
                    title={<span style={{ color: '#64748b' }}>Total Portfolio</span>}
                    value={stats.totalValue}
                    prefix={<DollarOutlined style={{ color: '#10b981' }} />}
                  />
                </Card>
              </Col>
            </Row>
          </Col>

          <Col span={17}>
            <Card
              className="glass-card"
              title={<span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Approval Queue</span>}
              extra={
                <Space>
                  {user.role === 'REQUESTER' && (
                    <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={onCreate} className="btn-primary-gradient">
                      Add Request
                    </Button>
                  )}
                  {isApprover && (
                    <Button shape="round" icon={<RobotOutlined />} onClick={onRunAgent}>
                      Invoke Agent
                    </Button>
                  )}
                </Space>
              }
              bordered={false}
            >
              <Table
                dataSource={approvals}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 6 }}
              />
            </Card>
          </Col>

          <Col span={7}>
            <Card
              className="glass-card"
              title={
                <Space>
                  <HistoryOutlined />
                  <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Agent Activity</span>
                </Space>
              }
              bordered={false}
            >
              <div className="timeline-panel">
                <Timeline
                  items={audit
                    .filter(it => it.actor === 'agent')
                    .map((it, i) => ({
                      key: i,
                      dot: <ClockCircleOutlined style={{ fontSize: '16px' }} />,
                      color: it.action === 'reminder' ? 'orange' : it.action === 'escalation' ? 'red' : 'blue',
                      children: (
                        <div className={`agent-activity-item ${it.action}`}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>{it.action}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(it.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                            {it.message || `Processed approval ${it.approval_id.slice(0, 8)}...`}
                          </div>
                        </div>
                      )
                    }))}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
