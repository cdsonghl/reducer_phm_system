import { useEffect, useMemo, useState } from "react";
import { Card, Table, Tag, message } from "antd";
import DigitalTwin from "../components/DigitalTwin";
import { DEFAULT_HIGHLIGHT_PARTS, DEVICE2_HIGHLIGHT_PARTS } from "../components/digitalTwinConfig";
import type { HighlightPart } from "../components/digitalTwinConfig";
import { HealthIndexChart } from "../components/HealthIndexChart";
import { getDevices, getHealthAlerts, getHealthTrend, type Device, type HealthAlert } from "@/services/phmApi";

type DeviceCard = Device & {
  highlightParts: HighlightPart[];
};

const Dashboard = () => {
  const [cards, setCards] = useState<DeviceCard[]>([]);
  const [trendMap, setTrendMap] = useState<Record<string, Array<{ time: string; value: number }>>>({});
  const [alerts, setAlerts] = useState<Array<HealthAlert & { deviceName: string; deviceId: string }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const deviceRes = await getDevices();
        const topDevices = deviceRes.items.slice(0, 2);
        const mappedCards = topDevices.map((d, idx) => ({
          ...d,
          highlightParts: idx === 0 ? DEFAULT_HIGHLIGHT_PARTS : DEVICE2_HIGHLIGHT_PARTS,
        }));
        setCards(mappedCards);

        const trendEntries = await Promise.all(
          topDevices.map(async (device) => {
            const trend = await getHealthTrend(device.id);
            return [device.id, trend.points.map((p) => ({ time: p.date, value: p.value }))] as const;
          })
        );
        setTrendMap(Object.fromEntries(trendEntries));

        const alertEntries = await Promise.all(
          topDevices.map(async (device) => {
            const alertRes = await getHealthAlerts(device.id);
            return alertRes.items.map((item) => ({
              ...item,
              deviceName: device.name,
              deviceId: device.id,
            }));
          })
        );
        const merged = alertEntries.flat().sort((a, b) => (a.time < b.time ? 1 : -1));
        setAlerts(merged);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "加载大屏数据失败");
      }
    };
    void load();
  }, []);

  const alertColumns = useMemo(
    () => [
      { title: "时间", dataIndex: "time", key: "time", width: 180 },
      { title: "故障设备", dataIndex: "deviceName", key: "deviceName", width: 140 },
      { title: "设备编号", dataIndex: "deviceId", key: "deviceId", width: 100 },
      { title: "触发信号", dataIndex: "rule", key: "rule" },
      {
        title: "级别",
        dataIndex: "level",
        key: "level",
        width: 90,
        render: (level: string) => {
          const color = level === "严重" ? "red" : level === "警告" ? "orange" : "green";
          return <Tag color={color}>{level}</Tag>;
        },
      },
      { title: "诊断结果", dataIndex: "desc", key: "desc" },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end text-sm text-gray-400">实时帧率: 60Hz | 边缘节点: Online</div>

      <div className="grid grid-cols-2 gap-4">
        {cards.map((device) => (
          <div key={device.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold text-gray-200">{device.name}</span>
              <Tag color="blue">{device.id}</Tag>
            </div>

            <Card title={device.name} bordered={false} size="small" className="h-[300px]" bodyStyle={{ height: "calc(100% - 46px)", padding: 0 }}>
              <DigitalTwin highlightParts={device.highlightParts} compact />
            </Card>

            <Card
              title="设备健康指标"
              bordered={false}
              size="small"
              className="h-[280px]"
              bodyStyle={{ height: "calc(100% - 46px)", padding: "8px" }}
            >
              <HealthIndexChart points={trendMap[device.id] ?? []} />
            </Card>
          </div>
        ))}
      </div>

      <Card title="实时事件告警流日志 (Event Alert)" bordered={false}>
        <Table columns={alertColumns} dataSource={alerts.map((a, idx) => ({ ...a, key: `${a.deviceId}-${a.id}-${idx}` }))} pagination={false} size="small" />
      </Card>
    </div>
  );
};

export default Dashboard;
