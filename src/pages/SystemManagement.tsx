import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input, Modal, Form, Space, Table, Tag, Typography, message } from "antd";
import { CopyOutlined, DownloadOutlined, PlusOutlined, QrcodeOutlined, SearchOutlined } from "@ant-design/icons";
import { QRCodeCanvas } from "qrcode.react";
import QRCode from "qrcode";
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
  const [qrDevice, setQrDevice] = useState<Device | null>(null);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [batchPrinting, setBatchPrinting] = useState(false);
  const singleQrCanvasRef = useRef<HTMLDivElement | null>(null);
  const [form] = Form.useForm<DeviceFormValues>();

  const qrStatusUrl = useMemo(() => {
    if (!qrDevice) return "";
    if (typeof window === "undefined") return `/health?device_id=${encodeURIComponent(qrDevice.id)}`;
    return `${window.location.origin}/health?device_id=${encodeURIComponent(qrDevice.id)}`;
  }, [qrDevice]);

  const buildStatusUrl = (deviceId: string) => {
    if (typeof window === "undefined") return `/health?device_id=${encodeURIComponent(deviceId)}`;
    return `${window.location.origin}/health?device_id=${encodeURIComponent(deviceId)}`;
  };

  const selectedDevices = useMemo(
    () => devices.filter((device) => selectedDeviceIds.includes(device.id)),
    [devices, selectedDeviceIds]
  );

  const downloadSingleQr = () => {
    if (!qrDevice) {
      message.warning("请先选择设备二维码");
      return;
    }
    const canvas = singleQrCanvasRef.current?.querySelector("canvas");
    if (!canvas) {
      message.error("二维码画布尚未生成，请稍后重试");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `device-qr-${qrDevice.id}.png`;
    link.click();
  };

  const openBatchPrint = async (targetDevices: Device[]) => {
    if (targetDevices.length === 0) {
      message.warning("请先勾选需要打印二维码的设备");
      return;
    }

    setBatchPrinting(true);
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      setBatchPrinting(false);
      message.error("浏览器拦截了打印窗口，请允许弹窗后重试");
      return;
    }

    try {
      const escapeHtml = (value: string) =>
        value
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");

      const withQrImage = await Promise.all(
        targetDevices.map(async (device) => {
          const url = buildStatusUrl(device.id);
          const qrPng = await QRCode.toDataURL(url, {
            width: 340,
            margin: 1,
            errorCorrectionLevel: "M",
          });
          return { device, url, qrPng };
        })
      );

      const pageSize = 12;
      const pages: Array<Array<(typeof withQrImage)[number]>> = [];
      for (let i = 0; i < withQrImage.length; i += pageSize) {
        pages.push(withQrImage.slice(i, i + pageSize));
      }

      const pageHtml = pages
        .map((pageDevices, pageIndex) => {
          const cards = pageDevices
            .map(({ device, url, qrPng }) => {
              return `
                <section class="qr-card">
                  <img class="qr-img" src="${qrPng}" alt="二维码-${escapeHtml(device.id)}" />
                  <div class="name">${escapeHtml(device.name)}</div>
                  <div class="meta">设备ID: ${escapeHtml(device.id)}</div>
                  <div class="meta">资产编号: ${escapeHtml(device.device_sn)}</div>
                  <div class="meta">部署位置: ${escapeHtml(device.location)}</div>
                  <div class="url">${escapeHtml(url)}</div>
                </section>
              `;
            })
            .join("");

          return `<main class="page ${pageIndex < pages.length - 1 ? "break-after" : ""}">${cards}</main>`;
        })
        .join("");

      popup.document.open();
      popup.document.write(`
        <!doctype html>
        <html lang="zh-CN">
          <head>
            <meta charset="utf-8" />
            <title>设备二维码批量打印</title>
            <style>
              @page { size: A4 portrait; margin: 8mm; }
              * { box-sizing: border-box; }
              html, body { margin: 0; padding: 0; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; color: #111827; }
              .page {
                min-height: calc(297mm - 16mm);
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                grid-auto-rows: 1fr;
                gap: 6mm;
                align-content: start;
                padding: 0;
              }
              .break-after { page-break-after: always; }
              .qr-card {
                border: 1px solid #d1d5db;
                border-radius: 3mm;
                padding: 4mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                min-height: 66mm;
              }
              .qr-img { width: 34mm; height: 34mm; image-rendering: pixelated; }
              .name {
                margin-top: 2mm;
                font-size: 12px;
                font-weight: 700;
                text-align: center;
                line-height: 1.3;
              }
              .meta {
                margin-top: 1mm;
                font-size: 10px;
                text-align: center;
                line-height: 1.3;
                word-break: break-all;
              }
              .url {
                margin-top: 1.2mm;
                font-size: 8px;
                color: #4b5563;
                text-align: center;
                word-break: break-all;
              }
              @media screen {
                body { background: #f3f4f6; padding: 8mm; }
                .page { background: #ffffff; margin: 0 auto 8mm auto; width: 194mm; padding: 0; }
              }
            </style>
          </head>
          <body>
            ${pageHtml}
            <script>
              window.onload = function () {
                var imgs = Array.prototype.slice.call(document.images || []);
                Promise.all(
                  imgs.map(function (img) {
                    if (img.complete) return Promise.resolve();
                    return new Promise(function (resolve) {
                      img.onload = resolve;
                      img.onerror = resolve;
                    });
                  })
                ).then(function () {
                  setTimeout(function () {
                    window.print();
                  }, 200);
                });
              };
            </script>
          </body>
        </html>
      `);
      popup.document.close();
    } catch (error) {
      popup.close();
      message.error(error instanceof Error ? error.message : "生成批量二维码失败");
    } finally {
      setBatchPrinting(false);
    }
  };

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
      {
        title: "设备二维码",
        key: "qr_code",
        width: 120,
        render: (_: unknown, record: Device) => (
          <Button size="small" icon={<QrcodeOutlined />} onClick={() => setQrDevice(record)}>
            查看
          </Button>
        ),
      },
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
          <Space>
            <Button
              icon={<QrcodeOutlined />}
              onClick={() => void openBatchPrint(selectedDevices)}
              disabled={selectedDevices.length === 0 || batchPrinting}
            >
              {batchPrinting ? "正在生成打印页..." : "二维码批量导出打印(A4)"}
            </Button>
            <Button icon={<PlusOutlined />} type="dashed" onClick={() => setIsModalOpen(true)}>
              新增监控实体
            </Button>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={devices.map((d) => ({ ...d, key: d.id }))}
          pagination={{ pageSize: 5 }}
          size="small"
          loading={loading}
          rowSelection={{
            selectedRowKeys: selectedDeviceIds,
            onChange: (keys) => setSelectedDeviceIds(keys as string[]),
          }}
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

      <Modal
        title={qrDevice ? `${qrDevice.name} 专属二维码` : "设备二维码"}
        open={Boolean(qrDevice)}
        onCancel={() => setQrDevice(null)}
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={downloadSingleQr}>
            下载二维码(PNG)
          </Button>,
          <Button
            key="copy"
            icon={<CopyOutlined />}
            onClick={async () => {
              if (!qrStatusUrl) return;
              try {
                if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(qrStatusUrl);
                  message.success("状态页链接已复制");
                } else {
                  message.warning("当前浏览器不支持剪贴板自动复制，请手动复制");
                }
              } catch {
                message.error("复制失败，请手动复制链接");
              }
            }}
          >
            复制状态页链接
          </Button>,
          <Button key="close" type="primary" onClick={() => setQrDevice(null)}>
            关闭
          </Button>,
        ]}
      >
        {qrDevice ? (
          <div ref={singleQrCanvasRef} className="flex flex-col items-center gap-4">
            <QRCodeCanvas value={qrStatusUrl} size={220} includeMargin level="M" />
            <Typography.Text className="text-center">
              扫码后可直达设备状态页：<br />
              <Typography.Text copyable>{qrStatusUrl}</Typography.Text>
            </Typography.Text>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default SystemManagement;
