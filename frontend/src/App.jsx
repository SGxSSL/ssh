import React, { useEffect, useState, useRef } from 'react';
import { Layout, Button, Row, Col, Table, Tag, Timeline, Space, Form, Input, Card, message } from 'antd';
import { listApprovals, createDummy, runAgent, listAudit, approve, login } from './api';
import { ClockCircleOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;

function formatPendingHours(submitted) {
  const then = new Date(submitted);
  const diff = (Date.now() - then.getTime()) / 3600 / 1000;
  return diff.toFixed(1);
}

function SLAStatusTag({ approval }) {
  if (approval.status === 'APPROVED') return <Tag color="green">Approved</Tag>;
  if (approval.status === 'ESCALATED') return <Tag color="red">Escalated</Tag>;
  const pending = parseFloat(formatPendingHours(approval.submitted_at));
  if (pending > approval.sla_hours) return <Tag color="red">SLA BREACHED</Tag>;
  return <Tag color="orange">Pending</Tag>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [audit, setAudit] = useState([]);
  const pollingRef = useRef(null);

  const load = async () => {
    try {
      // Requesters only see their own items; others see all
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
      message.success(`Logged in as ${res.username} (${res.role})`);
    } catch (err) {
      message.error("Login failed: Invalid credentials");
    }
  };

  const onLogout = () => {
    setUser(null);
    clearInterval(pollingRef.current);
  };

  const onCreate = async () => {
    await createDummy(user.username);
    load();
    message.info("New approval request created");
  };

  const onRunAgent = async () => {
    await runAgent();
    load();
    message.info("Agent execution completed");
  };

  const onApprove = async (id) => {
    await approve(id);
    load();
    message.success("Approval granted");
  };

  const isApprover = ['APPROVER', 'CHAIR', 'FINANCE'].includes(user?.role);

  const columns = [
    { title: 'Vendor', dataIndex: 'vendor_name', key: 'vendor' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: v => `$${v}` },
    { title: 'Status', key: 'status', render: (_, r) => <SLAStatusTag approval={r} /> },
    { title: 'SLA (hrs)', dataIndex: 'sla_hours', key: 'sla' },
    { title: 'Pending (hrs)', key: 'pending', render: (_, r) => formatPendingHours(r.submitted_at) },
    { title: 'Escalation', dataIndex: 'escalation_level', key: 'esc', render: l => l || 0 },
    { title: 'Requester', dataIndex: 'requester', key: 'requester' },
    {
      title: 'Actions', key: 'actions', render: (_, r) => (
        <Space>
          {isApprover && (
            <Button size="small" type="primary" onClick={() => onApprove(r.id)} disabled={r.status === 'APPROVED'}>
              Approve
            </Button>
          )}
          {user?.role === 'REQUESTER' && <span style={{ fontSize: 12, color: '#999' }}>Locked</span>}
        </Space>
      )
    }
  ];

  if (!user) {
    return (
      <Layout style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
        <Card title="AI Purchasing Committee - Login" style={{ width: 450, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>
            <strong>Demo credentials:</strong> (all passwords: <code>pass123</code>)<br />
            - Requesters: <code>requester1</code>, <code>requester2</code><br />
            - <code>reviewer</code> (Standard Approver)<br />
            - <code>chair</code> (Escalation Level 1)<br />
            - <code>finance</code> (Escalation Level 2)
          </p>
          <Form onFinish={onLogin} layout="vertical">
            <Form.Item name="username" rules={[{ required: true, message: 'Please input your username!' }]}>
              <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: 'Please input your password!' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large">Login</Button>
            </Form.Item>
          </Form>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ color: '#fff', padding: '0 24px' }}>
        <Row justify="space-between" align="middle" style={{ width: '100%' }}>
          <Col><h3 style={{ color: '#fff', margin: 0 }}>AI-Powered Purchasing Committee</h3></Col>
          <Col>
            <Space size="large">
              <span style={{ color: '#ccc' }}>Logged in as: <strong>{user.username}</strong> ({user.role})</span>
              {user.role === 'REQUESTER' && (
                <Button type="primary" onClick={onCreate}>Create New Approval</Button>
              )}
              {isApprover && (
                <Button type="primary" danger onClick={onRunAgent}>Run Agent</Button>
              )}
              <Button onClick={onLogout}>Logout</Button>
            </Space>
          </Col>
        </Row>
      </Header>
      <Content style={{ padding: 24, overflowY: 'auto' }}>
        <Row gutter={24}>
          <Col span={16}>
            <Card title="Approval Requests" variant="borderless" className="shadow-smooth">
              <Table dataSource={approvals} columns={columns} rowKey="id" />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Agent Activity" variant="borderless" className="shadow-smooth">
              <Timeline
                items={audit.map((it, i) => ({
                  key: i,
                  dot: <ClockCircleOutlined />,
                  color: it.action === 'reminder' ? 'orange' : it.action === 'escalation' ? 'red' : 'blue',
                  children: (
                    <>
                      <div style={{ fontWeight: 'bold' }}>{it.action.toUpperCase()}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{new Date(it.timestamp).toLocaleString()}</div>
                      <div style={{ marginTop: 4, fontStyle: 'italic' }}>{it.message || it.approval_id}</div>
                    </>
                  )
                }))}
              />
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
