import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { ApiOutlined, DatabaseOutlined, DisconnectOutlined, LineChartOutlined, PlusOutlined } from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import { createSource, deleteSource, getDevices, getFft, getSources, getWaveform, type Device, type Source } from "@/services/phmApi";

const { Option } = Select;
const { Text } = Typography;

type BindFormValues = {
  type: "mqtt" | "db";
  sourceName: string;
};

const DataAcquisition = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>();
  const [sources, setSources] = useState<Source[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string>();
  const [waveform, setWaveform] = useState<Array<{ time: string; value: number }>>([]);
  const [fft, setFft] = useState<Array<{ freq: number; amp: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignalLoading, setIsSignalLoading] = useState(false);
  const [isBindModalVisible, setIsBindModalVisible] = useState(false);
  const [bindForm] = Form.useForm<BindFormValues>();

  const selectedDevice = useMemo(
    () => devices.find((d) => d.id === selectedDeviceId),
    [devices, selectedDeviceId]
  );

  const activeSource = useMemo(
    () => sources.find((s) => s.source_id === activeSourceId),
    [sources, activeSourceId]
  );

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const deviceRes = await getDevices();
      setDevices(deviceRes.items);
      if (deviceRes.items.length > 0) {
        setSelectedDeviceId((prev) => prev ?? deviceRes.items[0].id);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载设备列表失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSources = useCallback(async (deviceId: string) => {
    try {
      const sourceRes = await getSources(deviceId);
      setSources(sourceRes.items);
      if (sourceRes.items.length === 0) {
        setActiveSourceId(undefined);
        setWaveform([]);
        setFft([]);
        return;
      }
      setActiveSourceId((prev) => sourceRes.items.find((s) => s.source_id === prev)?.source_id ?? sourceRes.items[0].source_id);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载数据源失败");
    }
  }, []);

  const loadSignal = useCallback(async (sourceId: string) => {
    setIsSignalLoading(true);
    try {
      const [waveRes, fftRes] = await Promise.all([getWaveform(sourceId), getFft(sourceId)]);
      setWaveform(waveRes.points);
      setFft(fftRes.bins);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载信号数据失败");
    } finally {
      setIsSignalLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (!selectedDeviceId) return;
    void loadSources(selectedDeviceId);
  }, [selectedDeviceId, loadSources]);

  useEffect(() => {
    if (!activeSourceId) return;
    void loadSignal(activeSourceId);
    const timer =
      activeSource?.is_running === true
        ? setInterval(() => {
            void loadSignal(activeSourceId);
          }, 2000)
        : undefined;
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeSourceId, activeSource?.is_running, loadSignal]);

  const timeOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      grid: { left: "5%", right: "5%", top: "10%", bottom: "15%" },
      xAxis: {
        type: "category",
        data: waveform.map((d) => d.time.slice(11, 19)),
        axisLine: { lineStyle: { color: "#9ca3af" } },
      },
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
          data: waveform.map((d) => d.value),
          itemStyle: { color: "#1890ff" },
          lineStyle: { width: 1.5 },
        },
      ],
    }),
    [waveform]
  );

  const fftOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      grid: { left: "5%", right: "5%", top: "10%", bottom: "15%" },
      xAxis: {
        type: "value",
        name: "Frequency (Hz)",
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
          data: fft.map((d) => [d.freq, d.amp]),
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
    [fft]
  );

  const handleBindSubmit = async (values: BindFormValues) => {
    if (!selectedDeviceId) return;
    try {
      await createSource(selectedDeviceId, {
        name: `${values.type === "mqtt" ? "MQTT 流" : "本地历史库"}: ${values.sourceName}`,
        source_type: values.type,
        topic_route: values.sourceName,
        is_running: values.type === "mqtt",
      });
      message.success("数据源绑定成功");
      setIsBindModalVisible(false);
      bindForm.resetFields();
      await loadSources(selectedDeviceId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "数据源绑定失败");
    }
  };

  const handleUnbind = async (sourceId: string) => {
    try {
      await deleteSource(sourceId);
      message.success("已解绑该数据源");
      if (selectedDeviceId) {
        await loadSources(selectedDeviceId);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "解绑失败");
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-primary">物理设备与多源数据采集绑定中心</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsBindModalVisible(true)} disabled={!selectedDeviceId}>
          绑定新数据源/测点
        </Button>
      </div>

      <Row gutter={16} className="flex-1">
        <Col span={6} className="h-full">
          <Card title="物理监控清单" className="h-full" bodyStyle={{ padding: 0 }}>
            <List
              loading={isLoading}
              itemLayout="horizontal"
              dataSource={devices}
              renderItem={(item) => (
                <List.Item
                  className={`p-4 cursor-pointer transition-colors border-l-4 ${
                    selectedDeviceId === item.id ? "bg-gray-800 border-brand-primary" : "hover:bg-gray-800 border-transparent"
                  }`}
                  onClick={() => setSelectedDeviceId(item.id)}
                >
                  <List.Item.Meta
                    title={<Text className={selectedDeviceId === item.id ? "text-brand-primary" : "text-gray-300"}>{item.name}</Text>}
                    description={
                      <div className="mt-2 space-y-1 text-xs">
                        <div>
                          状态: <Tag color={item.status_label === "在线" ? "green" : "default"}>{item.status_label}</Tag>
                        </div>
                        <div>资产编号: {item.device_sn}</div>
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
            <Card title={`${selectedDevice?.name ?? "-"} - 已绑定数据源矩阵`} size="small">
              <div className="flex flex-wrap gap-3">
                {sources.map((source) => (
                  <Card.Grid
                    key={source.source_id}
                    className={`w-64 p-3 cursor-pointer rounded border ${
                      activeSourceId === source.source_id ? "border-brand-primary bg-blue-900/20" : "border-gray-700 hover:border-gray-500"
                    }`}
                    onClick={() => setActiveSourceId(source.source_id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-200 truncate flex-1 mr-2">{source.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {source.source_type === "mqtt" ? (
                          <ApiOutlined className="text-green-500" />
                        ) : (
                          <DatabaseOutlined className="text-orange-400" />
                        )}
                        <Popconfirm
                          title="确认解绑该数据源？"
                          description="解绑后将停止接收该通道的数据。"
                          onConfirm={(e) => {
                            e?.stopPropagation();
                            void handleUnbind(source.source_id);
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
                      <span className={`w-2 h-2 rounded-full ${source.is_running ? "bg-green-500" : "bg-gray-500"}`}></span>
                      {source.is_running ? "实时高频流接入中" : "静态点位/历史录像"}
                    </div>
                  </Card.Grid>
                ))}
                {sources.length === 0 && <span className="text-gray-500 p-4">该设备暂未绑定任何采集通道</span>}
              </div>
            </Card>

            <Row gutter={16}>
              <Col span={12}>
                <Card title={<><LineChartOutlined /> 实时时域观察 (Waveform)</>} size="small" className="border-gray-800">
                  {isSignalLoading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Spin /></div>}
                  <ReactECharts option={timeOption} style={{ height: 260 }} />
                </Card>
              </Col>
              <Col span={12}>
                <Card title={<><LineChartOutlined /> 实时频域谱图 (FFT)</>} size="small" className="border-gray-800">
                  {isSignalLoading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Spin /></div>}
                  <ReactECharts option={fftOption} style={{ height: 260 }} />
                </Card>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>

      <Modal
        title={`为设备 [${selectedDevice?.name ?? "-"}] 挂载新数据源`}
        open={isBindModalVisible}
        onCancel={() => setIsBindModalVisible(false)}
        onOk={() => bindForm.submit()}
        okText="确认绑定"
      >
        <Form form={bindForm} layout="vertical" onFinish={(values) => void handleBindSubmit(values)}>
          <Form.Item label="数据源通道类型" name="type" initialValue="mqtt" rules={[{ required: true }]}>
            <Select>
              <Option value="mqtt">
                <ApiOutlined /> MQTT 实时消息队列订阅
              </Option>
              <Option value="db">
                <DatabaseOutlined /> 关系型数据库 (MySQL/InfluxDB)
              </Option>
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
