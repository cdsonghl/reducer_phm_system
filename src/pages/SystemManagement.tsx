import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input, Modal, Form, Space, Table, Tag, Typography, message } from "antd";
import { CopyOutlined, DownloadOutlined, PlusOutlined, QrcodeOutlined, SearchOutlined } from "@ant-design/icons";
import { QRCodeCanvas } from "qrcode.react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { createDevice, getDevices, getIntegrations, getRoles, type Device, type Role } from "@/services/phmApi";

type DeviceFormValues = {
  id: string;
  device_sn: string;
  name: string;
  model_type: string;
  location: string;
};

const PDF_COLUMNS = 3;
const PDF_ROWS = 4;
const PDF_PAGE_SIZE = PDF_COLUMNS * PDF_ROWS;

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("二维码图片加载失败"));
    image.src = dataUrl;
  });
}

function splitTextByWidth(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  if (!text) return [""];

  const lines: string[] = [];
  let current = "";

  for (const char of text) {
    const next = current + char;
    if (context.measureText(next).width <= maxWidth || current.length === 0) {
      current = next;
      continue;
    }

    lines.push(current);
    current = char;
    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (last.length > 0 && context.measureText(`${last}...`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = last.length === 0 ? "..." : `${last}...`;
  }

  return lines;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: string,
  lineHeight: number,
  maxLines: number,
  color = "#111827"
): number {
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "top";

  const lines = splitTextByWidth(context, text, maxWidth, maxLines);
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });

  return y + lines.length * lineHeight;
}

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
    try {
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

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const canvasWidth = 1240;
      const canvasHeight = 1754;
      const marginX = 44;
      const marginY = 52;
      const gapX = 24;
      const gapY = 24;
      const cardWidth = Math.floor((canvasWidth - marginX * 2 - gapX * (PDF_COLUMNS - 1)) / PDF_COLUMNS);
      const cardHeight = Math.floor((canvasHeight - marginY * 2 - gapY * (PDF_ROWS - 1)) / PDF_ROWS);

      for (let pageStart = 0; pageStart < withQrImage.length; pageStart += PDF_PAGE_SIZE) {
        if (pageStart > 0) {
          pdf.addPage("a4", "portrait");
        }

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvasWidth;
        pageCanvas.height = canvasHeight;
        const context = pageCanvas.getContext("2d");
        if (!context) {
          throw new Error("当前浏览器不支持Canvas，无法生成PDF");
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        const pageDevices = withQrImage.slice(pageStart, pageStart + PDF_PAGE_SIZE);

        for (let index = 0; index < pageDevices.length; index += 1) {
          const { device, url, qrPng } = pageDevices[index];
          const row = Math.floor(index / PDF_COLUMNS);
          const col = index % PDF_COLUMNS;
          const cardX = marginX + col * (cardWidth + gapX);
          const cardY = marginY + row * (cardHeight + gapY);

          context.strokeStyle = "#d1d5db";
          context.lineWidth = 2;
          context.strokeRect(cardX, cardY, cardWidth, cardHeight);

          const qrImage = await loadImageFromDataUrl(qrPng);
          const qrSize = Math.min(180, cardWidth - 56);
          const qrX = cardX + Math.floor((cardWidth - qrSize) / 2);
          const qrY = cardY + 18;
          context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

          const textX = cardX + 16;
          const textWidth = cardWidth - 32;
          let textY = qrY + qrSize + 12;

          textY = drawWrappedText(
            context,
            `设备名称: ${device.name}`,
            textX,
            textY,
            textWidth,
            '600 16px "Microsoft YaHei", "PingFang SC", sans-serif',
            20,
            2
          );
          textY = drawWrappedText(
            context,
            `设备ID: ${device.id}`,
            textX,
            textY + 2,
            textWidth,
            '500 14px "Microsoft YaHei", "PingFang SC", sans-serif',
            18,
            1
          );
          textY = drawWrappedText(
            context,
            `资产编号: ${device.device_sn}`,
            textX,
            textY + 1,
            textWidth,
            '500 14px "Microsoft YaHei", "PingFang SC", sans-serif',
            18,
            1
          );
          textY = drawWrappedText(
            context,
            `部署位置: ${device.location}`,
            textX,
            textY + 1,
            textWidth,
            '500 13px "Microsoft YaHei", "PingFang SC", sans-serif',
            17,
            2
          );
          drawWrappedText(
            context,
            `状态页: ${url}`,
            textX,
            textY + 2,
            textWidth,
            '400 11px "Microsoft YaHei", "PingFang SC", sans-serif',
            14,
            3,
            "#4b5563"
          );
        }

        const pageData = pageCanvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(pageData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      }

      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      const fileName = `设备二维码_A4_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.pdf`;
      pdf.save(fileName);
      message.success(`PDF 已生成并下载，共 ${Math.ceil(withQrImage.length / PDF_PAGE_SIZE)} 页`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "生成二维码PDF失败");
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
              {batchPrinting ? "正在生成PDF..." : "二维码批量导出PDF(A4)"}
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
