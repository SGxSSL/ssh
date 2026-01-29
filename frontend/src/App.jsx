import React, { useEffect, useState, useRef } from 'react';
import { Layout, Button, Row, Col, Table, Tag, Timeline, Space } from 'antd';
import { listApprovals, createDummy, runAgent, listAudit, approve } from './api';
import { ClockCircleOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;

function formatPendingHours(submitted) {
  const then = new Date(submitted);
  const diff = (Date.now() - then.getTime()) / 3600 / 1000;
  return diff.toFixed(1);
}

function SLAStatusTag({ approval }) {
  if (approval.status === 'APPROVED') return <Tag color="green">Approved</Tag>;
  if (approval.status === 'ESCALATED') return <Tag color="red">Escalated</Tag>;
  // PENDING
  const pending = parseFloat(formatPendingHours(approval.submitted_at));
  if (pending > approval.sla_hours) return <Tag color="red">SLA BREACHED</Tag>;
  return <Tag color="orange">Pending</Tag>;
}

export default function App() {
  const [approvals, setApprovals] = useState([]);
  const [audit, setAudit] = useState([]);
  const pollingRef = useRef(null);

  const load = async () => {
    const a = await listApprovals();
    setApprovals(a);
    const au = await listAudit();
    setAudit(au);
  };

  useEffect(() => {
    load();
    pollingRef.current = setInterval(load, 5000);
    return () => clearInterval(pollingRef.current);
  }, []);

  const onCreate = async () => {
    await createDummy();
    load();
  };

  const onRunAgent = async () => {
    await runAgent();
    load();
  };

  const onApprove = async (id) => {
    await approve(id);
    load();
  };

  const columns = [
    { title: 'Vendor', dataIndex: 'vendor_name', key: 'vendor' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: v => `$${v}` },
    { title: 'Status', key: 'status', render: (_, r) => <SLAStatusTag approval={r} /> },
    { title: 'SLA (hrs)', dataIndex: 'sla_hours', key: 'sla' },
    { title: 'Pending (hrs)', key: 'pending', render: (_, r) => formatPendingHours(r.submitted_at) },
    { title: 'Escalation', dataIndex: 'escalation_level', key: 'esc', render: l => l || 0 },
    {
      title: 'Actions', key: 'actions', render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => onApprove(r.id)} disabled={r.status !== 'PENDING'}>Approve</Button>
        </Space>
      )
    }
  ];

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ color: '#fff' }}>
        <Row justify="space-between">
          <Col><h3 style={{ color: '#fff' }}>AI-Powered Purchasing Committee - Prototype</h3></Col>
          <Col>
            <Space>
              <Button onClick={onCreate}>Create Dummy Approval</Button>
              <Button type="primary" onClick={onRunAgent}>Run Agent</Button>
            </Space>
          </Col>
        </Row>
      </Header>
      <Content style={{ padding: 16 }}>
        <Row gutter={16}>
          <Col span={16}>
            <Table dataSource={approvals} columns={columns} rowKey="id" />
          </Col>
          <Col span={8}>
            <h4>Agent Activity</h4>
            <Timeline>
              {audit.map((it, i) => (
                <Timeline.Item key={i} dot={<ClockCircleOutlined />} color={it.action === 'reminder' ? 'orange' : it.action === 'escalation' ? 'red' : 'blue'}>
                  <div><strong>{it.action}</strong> — {it.approval_id}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{new Date(it.timestamp).toLocaleString()}</div>
                  {it.message && <div style={{ marginTop: 6 }}>{it.message}</div>}
                </Timeline.Item>
              ))}
            </Timeline>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
