import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Form, Select, Switch, notification, message } from "antd";
import ReactECharts from "echarts-for-react";
import { getDevices, getFeatureStream, getProcessingConfig, updateProcessingConfig, type Device } from "@/services/phmApi";

const { Option } = Select;

const FEATURES = [
  { key: "rms", label: "RMS（均方根值）", unit: "g" },
  { key: "p2p", label: "峰峰值", unit: "g" },
  { key: "energy", label: "绝对能量", unit: "J" },
];

type DataPoint = { time: string; raw: number; denoised: number };

type ConfigFormValues = {
  window_size: number;
  algorithm: string;
  remove_anomaly: boolean;
  calc_features: boolean;
};

const DataProcessing = () => {
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>();
  const [selectedFeature, setSelectedFeature] = useState<string>("rms");
  const [streamData, setStreamData] = useState<DataPoint[]>([]);
  const [form] = Form.useForm<ConfigFormValues>();

  const featureCfg = FEATURES.find((f) => f.key === selectedFeature) ?? FEATURES[0];

  const loadConfig = useCallback(async (deviceId: string) => {
    try {
      const config = await getProcessingConfig(deviceId);
      form.setFieldsValue({
        window_size: config.window_size,
        algorithm: config.algorithm,
        remove_anomaly: config.remove_anomaly,
        calc_features: config.calc_features,
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载预处理配置失败");
    }
  }, [form]);

  const loadFeatureData = useCallback(async (deviceId: string, feature: string) => {
    try {
      const res = await getFeatureStream(deviceId, feature);
      setStreamData(res.points);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载特征流失败");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const deviceRes = await getDevices();
        setDevices(deviceRes.items);
        if (deviceRes.items.length > 0) {
          setSelectedDeviceId(deviceRes.items[0].id);
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "加载设备列表失败");
      }
    };
    void init();
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) return;
    void loadConfig(selectedDeviceId);
  }, [selectedDeviceId, loadConfig]);

  useEffect(() => {
    if (!selectedDeviceId) return;
    void loadFeatureData(selectedDeviceId, selectedFeature);
    const timer = setInterval(() => {
      void loadFeatureData(selectedDeviceId, selectedFeature);
    }, 2000);
    return () => clearInterval(timer);
  }, [selectedDeviceId, selectedFeature, loadFeatureData]);

  const chartOption = useMemo(
    () => ({
      tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
      legend: {
        data: ["原始值", "去噪后"],
        textStyle: { color: "#9ca3af" },
        bottom: 0,
      },
      grid: { left: "4%", right: "4%", bottom: "14%", containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: streamData.map((d) => d.time.slice(11, 19)),
        axisLine: { lineStyle: { color: "#9ca3af" } },
        axisLabel: { color: "#9ca3af", fontSize: 10, rotate: 30, interval: 4 },
      },
      yAxis: {
        type: "value",
        name: featureCfg.unit,
        nameTextStyle: { color: "#9ca3af" },
        axisLine: { lineStyle: { color: "#9ca3af" } },
        splitLine: { lineStyle: { color: "#374151" } },
      },
      series: [
        {
          name: "原始值",
          type: "line",
          symbol: "none",
          smooth: false,
          lineStyle: { color: "#6b7280", type: "dashed", width: 1.5 },
          itemStyle: { color: "#6b7280" },
          data: streamData.map((d) => d.raw),
        },
        {
          name: "去噪后",
          type: "line",
          symbol: "none",
          smooth: true,
          lineStyle: { color: "#1890ff", width: 2 },
          itemStyle: { color: "#1890ff" },
          areaStyle: { color: "#1890ff", opacity: 0.07 },
          data: streamData.map((d) => d.denoised),
        },
      ],
    }),
    [streamData, featureCfg]
  );

  const handleApply = async () => {
    if (!selectedDeviceId) return;
    try {
      setLoading(true);
      const values = await form.validateFields();
      await updateProcessingConfig(values, selectedDeviceId);
      notification.success({
        message: "流处理配置已下发",
        description: "Flink 窗口计算队列已更新，新特征提取策略生效。",
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : "配置下发失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-brand-primary">数据预处理与特征工程引擎</h1>
        <Select
          value={selectedDeviceId}
          onChange={setSelectedDeviceId}
          style={{ width: 260 }}
          options={devices.map((d) => ({ label: `[${d.device_sn}] ${d.name}`, value: d.id }))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="流处理窗口与去噪策略参数" className="h-full">
          <Form form={form} layout="vertical" initialValues={{ window_size: 1024, algorithm: "wavelet", remove_anomaly: true, calc_features: true }}>
            <Form.Item label="滑动计算窗口大小 (Sliding Window)" name="window_size">
              <Select>
                <Option value={512}>512 pts</Option>
                <Option value={1024}>1024 pts</Option>
                <Option value={2048}>2048 pts</Option>
                <Option value={4096}>4096 pts</Option>
              </Select>
            </Form.Item>

            <Form.Item label="数据去噪算法库" name="algorithm">
              <Select>
                <Option value="ma">1. 滑动平均法 (MA)</Option>
                <Option value="sg">2. Savitzky-Golay 滤波</Option>
                <Option value="svd">3. 奇异值分解去噪</Option>
                <Option value="wavelet">4. 小波多尺度去噪 (Wavelet)</Option>
                <Option value="emd">5. 经验模态分解 (EMD)</Option>
                <Option value="eemd">6. 集成经验模态分解 (EEMD)</Option>
              </Select>
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item label="异常极值裁切" name="remove_anomaly" valuePropName="checked">
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
              <Form.Item label="31项统计特征集联算" name="calc_features" valuePropName="checked">
                <Switch checkedChildren="运行" unCheckedChildren="挂起" />
              </Form.Item>
            </div>

            <Button type="primary" onClick={() => void handleApply()} loading={loading} className="w-full">
              重置 Flink 实时算子拓扑
            </Button>
          </Form>
        </Card>

        <Card
          title="特征值实时趋势（原始 vs 去噪，每2秒更新）"
          className="h-full lg:col-span-2"
          extra={
            <Select value={selectedFeature} onChange={setSelectedFeature} style={{ width: 160 }} size="small">
              {FEATURES.map((f) => (
                <Option key={f.key} value={f.key}>
                  {f.label}
                </Option>
              ))}
            </Select>
          }
        >
          <ReactECharts option={chartOption} style={{ height: 340 }} notMerge lazyUpdate />
        </Card>
      </div>
    </div>
  );
};

export default DataProcessing;
