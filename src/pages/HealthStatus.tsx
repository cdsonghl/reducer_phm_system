import { useEffect, useMemo, useState } from "react";
import { Card, Select, Table, Tag, message } from "antd";
import { HealthIndexChart } from "../components/HealthIndexChart";
import { getDevices, getHealthAlerts, getHealthTrend, type Device, type HealthAlert } from "@/services/phmApi";

const HealthStatus = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>();
  const [trendPoints, setTrendPoints] = useState<Array<{ time: string; value: number }>>([]);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await getDevices();
        setDevices(res.items);
        if (res.items.length > 0) {
          setSelectedDeviceId(res.items[0].id);
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "加载设备列表失败");
      }
    };
    void init();
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) return;
    const load = async () => {
      try {
        const [trendRes, alertRes] = await Promise.all([getHealthTrend(selectedDeviceId), getHealthAlerts(selectedDeviceId)]);
        setTrendPoints(trendRes.points.map((p) => ({ time: p.date, value: p.value })));
        setAlerts(alertRes.items);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "加载健康状态数据失败");
      }
    };
    void load();
  }, [selectedDeviceId]);

  const activeDevice = useMemo(() => devices.find((d) => d.id === selectedDeviceId), [devices, selectedDeviceId]);

  const alertColumns = [
    { title: "告警时间", dataIndex: "time", key: "time" },
    { title: "规则/测点", dataIndex: "rule", key: "rule" },
    {
      title: "级别",
      dataIndex: "level",
      key: "level",
      render: (level: string) => {
        const color = level === "严重" ? "#f5222d" : level === "警告" ? "#faad14" : "#1890ff";
        return <Tag color={color}>{level}</Tag>;
      },
    },
    { title: "告警描述", dataIndex: "desc", key: "desc" },
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <Select
          value={selectedDeviceId}
          onChange={setSelectedDeviceId}
          style={{ width: 360 }}
          size="large"
          options={devices.map((d) => ({
            value: d.id,
            label: `[${d.device_sn}] ${d.name} - ${d.location}`,
          }))}
        />
        <p className="text-gray-400 text-sm">此模块基于联自适应直方图与 31 项衍生特征构建时变转速健康指标，并执行自动告警研判流。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        <Card title="量化健康指标趋势 (综合特征汇聚)" className="h-full flex flex-col" bodyStyle={{ flex: 1, padding: "8px" }}>
          <HealthIndexChart points={trendPoints} />
        </Card>

        <Card
          title={`异常检测与告警跟踪 (${activeDevice?.name ?? "-"})`}
          className="h-full flex flex-col"
          bodyStyle={{ flex: 1, overflow: "auto" }}
        >
          <Table
            columns={alertColumns}
            dataSource={alerts.map((a) => ({ ...a, key: a.id }))}
            pagination={false}
            size="middle"
            className="w-full"
          />
        </Card>
      </div>
    </div>
  );
};

export default HealthStatus;
