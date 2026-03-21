import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Modal, Form, Space, Table, Tag, message } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { createDevice, getDevices, getIntegrations, getRoles, type Device, type Role } from "@/services/phmApi";

type DeviceFormValues = {
  id: string;
  device_sn: string;
  name: string;
  model_type: string;
  location: string;
};

const SystemManagement = () => {
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [integration, setIntegration] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<DeviceFormValues>();

  const loadAll = async (q?: string) => {
    setLoading(true);
    try {
      const [deviceRes, roleRes, integrationRes] = await Promise.all([getDevices(q), getRoles(), getIntegrations()]);
      setDevices(deviceRes.items);
      setRoles(roleRes.items);
      setIntegration(integrationRes);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载系统管理数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const columns = useMemo(
    () => [
      { title: "设备ID", dataIndex: "id", key: "id", width: 100 },
      { title: "资产编号", dataIndex: "device_sn", key: "device_sn", width: 120 },
      { title: "设备名称", dataIndex: "name", key: "name", width: 140 },
      { title: "设备型号", dataIndex: "model_type", key: "model_type" },
      { title: "部署位置", dataIndex: "location", key: "location" },
      {
        title: "状态",
        dataIndex: "status_label",
        key: "status_label",
        render: (statusLabel: string) => {
          const color = statusLabel === "在线" ? "green" : statusLabel === "离线" ? "red" : "volcano";
          return <Tag color={color}>{statusLabel}</Tag>;
        },
      },
      { title: "最近维保时间", dataIndex: "last_maintenance", key: "last_maintenance" },
    ],
    []
  );

  const handleSearch = () => {
    void loadAll(keyword.trim() || undefined);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createDevice({
        ...values,
        status: "online",
        last_maintenance: null,
      });
      message.success("新增监控实体成功");
      setIsModalOpen(false);
      form.resetFields();
      await loadAll(keyword.trim() || undefined);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-primary">系统与资产控制中心 (SQLite 业务台账)</h1>

      <Card bordered={false} className="mb-4">
        <div className="flex justify-between mb-4">
          <Space>
            <Input
              placeholder="输入资产编号或设备名称"
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Button type="primary" className="bg-brand-primary border-brand-primary" onClick={handleSearch}>
              查询检索
            </Button>
          </Space>
          <Button icon={<PlusOutlined />} type="dashed" onClick={() => setIsModalOpen(true)}>
            新增监控实体
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={devices.map((d) => ({ ...d, key: d.id }))}
          pagination={{ pageSize: 5 }}
          size="small"
          loading={loading}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="角色与权限网关 (IAM)" bordered={false} className="h-full">
          <ul className="text-sm text-gray-400 space-y-3">
            {roles.map((role) => (
              <li key={role.id} className="flex justify-between border-b border-gray-800 pb-2">
                <span>{role.name}</span> <Tag color="blue">{role.permissions}</Tag>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="平台接口 API 配置状态" bordered={false} className="h-full">
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-gray-300 font-bold mb-1">ERP/MES 外部接口对接</p>
              <Input value={integration.erp_mes_endpoint ?? ""} disabled />
            </div>
            <div>
              <p className="text-gray-300 font-bold mb-1">通知网关 (钉钉 / 企业微信 Webhook)</p>
              <Input value={integration.notify_webhook ?? ""} disabled />
            </div>
          </div>
        </Card>
      </div>

      <Modal title="新增监控实体" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => void handleCreate()}>
        <Form form={form} layout="vertical">
          <Form.Item label="设备ID" name="id" rules={[{ required: true, message: "请输入设备ID" }]}>
            <Input placeholder="例如：C-003" />
          </Form.Item>
          <Form.Item label="资产编号" name="device_sn" rules={[{ required: true, message: "请输入资产编号" }]}>
            <Input placeholder="例如：ZJ-Heli-A3" />
          </Form.Item>
          <Form.Item label="设备名称" name="name" rules={[{ required: true, message: "请输入设备名称" }]}>
            <Input placeholder="例如：三号减速箱" />
          </Form.Item>
          <Form.Item label="设备型号" name="model_type" rules={[{ required: true, message: "请输入设备型号" }]}>
            <Input placeholder="例如：两级行星直升机主减速器" />
          </Form.Item>
          <Form.Item label="部署位置" name="location" rules={[{ required: true, message: "请输入部署位置" }]}>
            <Input placeholder="例如：2号试车台" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemManagement;
