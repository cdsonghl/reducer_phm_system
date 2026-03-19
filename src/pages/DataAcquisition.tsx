import { useState, useEffect, useMemo } from "react";
import {
  Card,
  Tag,
  Button,
  Modal,
  Form,
  Select,
  Row,
  Col,
  List,
  Spin,
  Typography,
  Popconfirm,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  DatabaseOutlined,
  ApiOutlined,
  LineChartOutlined,
  DisconnectOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";

const { Option } = Select;
const { Text } = Typography;

type BoundSource = {
  id: string;
  name: string;
  type: "mqtt" | "db";
  isRunning: boolean;
};

type Device = {
  id: number;
  name: string;
  status: "running" | "standby";
  health: number;
  boundSources: BoundSource[];
};

type TimePoint = { x: number; y: number };
type FftPoint = { freq: number; amp: number };

type SignalData = {
  timeData: TimePoint[];
  fftData: FftPoint[];
};

type BindFormValues = {
  type: "mqtt" | "db";
  sourceName: string;
};

const initialMockDevices: Device[] = [
  {
    id: 1,
    name: "ZJ-Heli-A1 (主减速器)",
    status: "running",
    health: 92,
    boundSources: [
      { id: "s1", name: "MQTT 流: X轴振动加速度", type: "mqtt", isRunning: true },
      { id: "s2", name: "MQTT 流: 油温传感器 PT100", type: "mqtt", isRunning: true },
    ],
  },
  {
    id: 2,
    name: "ZJ-Heli-A2 (备用试车台)",
    status: "standby",
    health: 100,
    boundSources: [{ id: "s3", name: "本地历史库: Y轴冲击包络段", type: "db", isRunning: false }],
  },
];

function createSignalData(sourceId: string | null): SignalData {
  if (!sourceId) return { timeData: [], fftData: [] };

  const points = 512;
  const fs = 1000;
  const t = Array.from({ length: points }).map((_, i) => i / fs);

  const f1 = sourceId === "s1" ? 80 : sourceId === "s2" ? 5 : 120;
  const f2 = sourceId === "s1" ? 240 : 15;

  const timeData = t.map((time) => {
    const val =
      sourceId === "s2"
        ? 60 + Math.sin(2 * Math.PI * f1 * time) + Math.random()
        : 2 * Math.sin(2 * Math.PI * f1 * time) +
          0.8 * Math.sin(2 * Math.PI * f2 * time) +
          (Math.random() - 0.5) * 2;
    return { x: time, y: val };
  });

  const fftData = Array.from({ length: points / 2 }).map((_, i) => {
    const freq = (i * fs) / points;
    let amp = Math.random() * (sourceId === "s2" ? 0.01 : 0.1);
    if (Math.abs(freq - f1) < 2) amp += sourceId === "s2" ? 0.5 : 2.5;
    if (Math.abs(freq - f2) < 2) amp += 1.2;
    return { freq, amp };
  });

  return { timeData, fftData };
}

const DataAcquisition = () => {
  const [devices, setDevices] = useState(initialMockDevices);
  const [selectedDevice, setSelectedDevice] = useState(initialMockDevices[0]);
  const [activeSignalId, setActiveSignalId] = useState<string | null>(initialMockDevices[0].boundSources[0].id);
  const [isBindModalVisible, setIsBindModalVisible] = useState(false);
  const [bindForm] = Form.useForm();

  const [timeData, setTimeData] = useState<TimePoint[]>(() => createSignalData(initialMockDevices[0].boundSources[0].id).timeData);
  const [fftData, setFftData] = useState<FftPoint[]>(() => createSignalData(initialMockDevices[0].boundSources[0].id).fftData);

  const applySignal = (sourceId: string | null) => {
    setActiveSignalId(sourceId);
    const next = createSignalData(sourceId);
    setTimeData(next.timeData);
    setFftData(next.fftData);
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const currentSource = selectedDevice.boundSources.find((s) => s.id === activeSignalId);

    if (currentSource?.isRunning) {
      timer = setInterval(() => {
        const next = createSignalData(activeSignalId);
        setTimeData(next.timeData);
        setFftData(next.fftData);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeSignalId, selectedDevice]);

  const handleDeviceSwitch = (device: Device) => {
    setSelectedDevice(device);
    applySignal(device.boundSources.length > 0 ? device.boundSources[0].id : null);
  };

  const timeOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      grid: { left: "5%", right: "5%", top: "10%", bottom: "15%" },
      xAxis: { type: "value", name: "Time (s)", splitLine: { show: false }, axisLine: { lineStyle: { color: "#9ca3af" } } },
      yAxis: {
        type: "value",
        name: "Amplitude",
        splitLine: { lineStyle: { color: "#374151", type: "dashed" } },
        axisLine: { lineStyle: { color: "#9ca3af" } },
      },
      series: [
        {
          type: "line",
          showSymbol: false,
          data: timeData.map((d) => [d.x, d.y]),
          itemStyle: { color: "#1890ff" },
          lineStyle: { width: 1.5 },
        },
      ],
    }),
    [timeData]
  );

  const fftOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      grid: { left: "5%", right: "5%", top: "10%", bottom: "15%" },
      xAxis: {
        type: "value",
        name: "Frequency (Hz)",
        splitLine: { show: false },
        axisLine: { lineStyle: { color: "#9ca3af" } },
      },
      yAxis: {
        type: "value",
        name: "Magnitude",
        splitLine: { lineStyle: { color: "#374151", type: "dashed" } },
        axisLine: { lineStyle: { color: "#9ca3af" } },
      },
      series: [
        {
          type: "line",
          showSymbol: false,
          data: fftData.map((d) => [d.freq, d.amp]),
          itemStyle: { color: "#faad14" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(250, 173, 20, 0.4)" },
                { offset: 1, color: "rgba(250, 173, 20, 0.1)" },
              ],
            },
          },
        },
      ],
    }),
    [fftData]
  );

  const handleBindSubmit = (values: BindFormValues) => {
    const newSource: BoundSource = {
      id: `s_new_${Date.now()}`,
      name: `${values.type === "mqtt" ? "MQTT 流" : "本地历史库"}: ${values.sourceName}`,
      type: values.type,
      isRunning: values.type === "mqtt",
    };

    const updatedDevices = devices.map((d) => {
      if (d.id === selectedDevice.id) {
        const updatedDevice = { ...d, boundSources: [...d.boundSources, newSource] };
        setSelectedDevice(updatedDevice);
        if (!activeSignalId) applySignal(newSource.id);
        return updatedDevice;
      }
      return d;
    });

    setDevices(updatedDevices);
    setIsBindModalVisible(false);
    bindForm.resetFields();
  };

  const handleUnbind = (sourceId: string) => {
    const updatedDevices = devices.map((d) => {
      if (d.id === selectedDevice.id) {
        const updatedSources = d.boundSources.filter((s) => s.id !== sourceId);
        const updatedDevice = { ...d, boundSources: updatedSources };
        setSelectedDevice(updatedDevice);
        if (activeSignalId === sourceId) {
          applySignal(updatedSources.length > 0 ? updatedSources[0].id : null);
        }
        return updatedDevice;
      }
      return d;
    });
    setDevices(updatedDevices);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-primary">物理设备与多源数据采集绑定中心</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsBindModalVisible(true)}>
          绑定新数据源/测点
        </Button>
      </div>

      <Row gutter={16} className="flex-1">
        <Col span={6} className="h-full">
          <Card title="物理监控清单" className="h-full" bodyStyle={{ padding: 0 }}>
            <List
              itemLayout="horizontal"
              dataSource={devices}
              renderItem={(item) => (
                <List.Item
                  className={`p-4 cursor-pointer transition-colors border-l-4 ${selectedDevice.id === item.id ? "bg-gray-800 border-brand-primary" : "hover:bg-gray-800 border-transparent"}`}
                  onClick={() => handleDeviceSwitch(item)}
                >
                  <List.Item.Meta
                    title={<Text className={selectedDevice.id === item.id ? "text-brand-primary" : "text-gray-300"}>{item.name}</Text>}
                    description={
                      <div className="mt-2 space-y-1 text-xs">
                        <div>
                          状态: <Tag color={item.status === "running" ? "green" : "default"}>{item.status}</Tag>
                        </div>
                        <div>绑定源: {item.boundSources.length} 路传感器</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col span={18}>
          <div className="space-y-4">
            <Card title={`${selectedDevice.name} - 已绑定数据源矩阵`} size="small">
              <div className="flex flex-wrap gap-3">
                {selectedDevice.boundSources.map((source) => (
                  <Card.Grid
                    key={source.id}
                    className={`w-64 p-3 cursor-pointer rounded border ${activeSignalId === source.id ? "border-brand-primary bg-blue-900/20" : "border-gray-700 hover:border-gray-500"}`}
                    onClick={() => applySignal(source.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-200 truncate flex-1 mr-2">{source.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {source.type === "mqtt" ? <ApiOutlined className="text-green-500" /> : <DatabaseOutlined className="text-orange-400" />}
                        <Popconfirm
                          title="确认解绑该数据源？"
                          description="解绑后将停止接收该通道的数据。"
                          onConfirm={(e) => {
                            e?.stopPropagation();
                            handleUnbind(source.id);
                          }}
                          onCancel={(e) => e?.stopPropagation()}
                          okText="确认解绑"
                          cancelText="取消"
                          okButtonProps={{ danger: true }}
                        >
                          <Tooltip title="解绑此数据源">
                            <Button
                              type="text"
                              size="small"
                              icon={<DisconnectOutlined />}
                              danger
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-60 hover:opacity-100"
                            />
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${source.isRunning ? "bg-green-500" : "bg-gray-500"}`}></span>
                      {source.isRunning ? "实时高频流接入中" : "静态点位/历史录像"}
                    </div>
                  </Card.Grid>
                ))}
                {selectedDevice.boundSources.length === 0 && <span className="text-gray-500 p-4">该设备暂未绑定任何采集通道</span>}
              </div>
            </Card>

            <Row gutter={16}>
              <Col span={12}>
                <Card title={<><LineChartOutlined /> 实时时域观察 (Waveform)</>} size="small" className="border-gray-800">
                  {!timeData.length && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Spin /></div>}
                  <ReactECharts option={timeOption} style={{ height: 260 }} />
                </Card>
              </Col>
              <Col span={12}>
                <Card title={<><LineChartOutlined /> 实时频域谱图 (FFT)</>} size="small" className="border-gray-800">
                  {!fftData.length && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Spin /></div>}
                  <ReactECharts option={fftOption} style={{ height: 260 }} />
                </Card>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>

      <Modal
        title={`为设备 [${selectedDevice.name}] 挂载新数据源`}
        open={isBindModalVisible}
        onCancel={() => setIsBindModalVisible(false)}
        onOk={() => bindForm.submit()}
        okText="确认绑定"
      >
        <Form form={bindForm} layout="vertical" onFinish={handleBindSubmit}>
          <Form.Item label="数据源通道类型" name="type" initialValue="mqtt" rules={[{ required: true }]}>
            <Select>
              <Option value="mqtt"><ApiOutlined /> MQTT 实时消息队列订阅</Option>
              <Option value="db"><DatabaseOutlined /> 关系型数据库 (MySQL/InfluxDB)</Option>
            </Select>
          </Form.Item>
          <Form.Item label="通道测点名称/Topic 路由" name="sourceName" rules={[{ required: true }]}>
            <Select placeholder="请选择工厂物理网关中的可用通道">
              <Option value="Z轴高频振动位移传感器">Z轴高频振动位移传感器</Option>
              <Option value="机舱旁侧声学/噪音复合监测">机舱旁侧声学/噪音复合监测</Option>
              <Option value="Y轴冲击包络段">Y轴冲击包络段</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DataAcquisition;
