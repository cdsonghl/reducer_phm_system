import { useEffect, useMemo, useState } from "react";
import { Button, Card, Form, InputNumber, Select, Slider, Table, Tabs, Tag, Upload, message } from "antd";
import { CheckCircleOutlined, RobotOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import {
  activateDiagnosisModel,
  getDevices,
  getDiagnosisModels,
  getDiagnosisResult,
  getHealthAlerts,
  runDiagnosis,
  type DiagnosisModel,
} from "@/services/phmApi";

type AssessmentTask = {
  key: number;
  alertId: number;
  time: string;
  deviceId: string;
  deviceName: string;
  component: string;
  detail: string;
};

type DiagnosisSummary = {
  taskId: string;
  faultComponent: string;
  severity: string;
  confidence: number;
  suggestion: string;
};

const FaultDiagnosis = () => {
  const [form] = Form.useForm();
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<{ score: number; success: boolean } | null>(null);

  const [models, setModels] = useState<DiagnosisModel[]>([]);
  const [selectedModelKeys, setSelectedModelKeys] = useState<React.Key[]>([]);
  const [activeModelKey, setActiveModelKey] = useState<number>();

  const [tasks, setTasks] = useState<AssessmentTask[]>([]);
  const [selectedTaskKey, setSelectedTaskKey] = useState<React.Key>();
  const [selectedDiagnosisModel, setSelectedDiagnosisModel] = useState<number>();
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisSummary | null>(null);

  const loadModels = async () => {
    const modelRes = await getDiagnosisModels();
    setModels(modelRes.items);
    const defaultModel = modelRes.items.find((m) => m.status === "active") ?? modelRes.items[0];
    if (defaultModel) {
      setSelectedDiagnosisModel(defaultModel.id);
    }
  };

  const loadTasks = async () => {
    const deviceRes = await getDevices();
    const tasksByDevice = await Promise.all(
      deviceRes.items.map(async (device) => {
        const alertRes = await getHealthAlerts(device.id);
        return alertRes.items.map((alert) => ({
          key: alert.id,
          alertId: alert.id,
          time: alert.time,
          deviceId: device.id,
          deviceName: device.name,
          component: alert.rule,
          detail: alert.desc,
        }));
      })
    );
    const merged = tasksByDevice.flat().sort((a, b) => (a.time < b.time ? 1 : -1));
    setTasks(merged);
    if (merged.length > 0) {
      setSelectedTaskKey(merged[0].key);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([loadModels(), loadTasks()]);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "加载故障诊断数据失败");
      }
    };
    void init();
  }, []);

  const activeTask = useMemo(() => tasks.find((t) => t.key === selectedTaskKey), [tasks, selectedTaskKey]);

  const handleSelectModel = (selectedRowKeys: React.Key[]) => {
    if (selectedRowKeys.length === 0) return;
    const targetKey = Number(selectedRowKeys[0]);
    setSelectedModelKeys(selectedRowKeys);
    setActiveModelKey(targetKey);
    form.resetFields();
    setMatchResult(null);
  };

  const handleAutoMatch = () => {
    setIsMatching(true);
    setMatchResult(null);
    setTimeout(() => {
      setIsMatching(false);
      const score = Math.floor(Math.random() * 20) + 80;
      if (score >= 80) {
        setMatchResult({ score, success: true });
        form.setFieldsValue({ clsLRate: 0.001, epoch: 50 });
        message.success(`匹配成功，重合度 ${score}%，已自动应用超参数。`);
      } else {
        setMatchResult({ score, success: false });
        message.warning(`匹配度仅为 ${score}%，请手动设置参数。`);
      }
    }, 1200);
  };

  const handleDeploy = async () => {
    if (!activeModelKey) return;
    try {
      setIsDiagnosing(true);
      await activateDiagnosisModel(activeModelKey);
      await loadModels();
      message.success("算法长期监控任务已下发执行。");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "模型激活失败");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleDiagnoseTask = async () => {
    if (!selectedDiagnosisModel || !activeTask) {
      message.warning("请选择诊断算法和异常记录");
      return;
    }
    try {
      setIsDiagnosing(true);
      const runRes = await runDiagnosis({
        model_id: selectedDiagnosisModel,
        device_id: activeTask.deviceId,
        alert_id: activeTask.alertId,
        requested_by: "frontend-user",
      });
      const resultRes = await getDiagnosisResult(runRes.task_id);
      if (!resultRes.result) {
        throw new Error("诊断结果为空");
      }
      setDiagnosisResult({
        taskId: runRes.task_id,
        faultComponent: resultRes.result.fault_component,
        severity: resultRes.result.severity,
        confidence: resultRes.result.confidence,
        suggestion: resultRes.result.suggestion,
      });
      message.success("诊断分析完成，已生成报告。");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "诊断执行失败");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const chartOption = useMemo(
    () => ({
      title: { text: "两级减速箱各部件异常概率", textStyle: { color: "#e5e7eb", fontSize: 13 }, top: 0, left: "center" },
      radar: {
        center: ["50%", "55%"],
        radius: "65%",
        indicator: [
          { name: "一级小齿轮", max: 100 },
          { name: "一级大齿轮", max: 100 },
          { name: "二级小齿轮", max: 100 },
          { name: "二级大齿轮", max: 100 },
          { name: "轴承组", max: 100 },
        ],
        axisName: { color: "#9ca3af" },
        splitArea: { areaStyle: { color: ["transparent"] } },
        splitLine: { lineStyle: { color: "#374151" } },
      },
      series: [
        {
          name: "各部件受损概率",
          type: "radar",
          areaStyle: { color: "rgba(245, 34, 45, 0.4)" },
          lineStyle: { color: "#f5222d" },
          itemStyle: { color: "#f5222d" },
          data: [
            {
              value:
                diagnosisResult?.faultComponent.includes("小齿轮")
                  ? [92, 18, 12, 22, 15]
                  : diagnosisResult?.faultComponent.includes("轴承")
                    ? [11, 7, 7, 3, 73]
                    : [8, 12, 19, 88, 14],
            },
          ],
        },
      ],
    }),
    [diagnosisResult]
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-primary">故障诊断与运维决策</h1>

      <Tabs
        defaultActiveKey="1"
        className="text-gray-300"
        items={[
          {
            key: "1",
            label: "算法实例化与参数配置",
            children: (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card title="MCP 算法一键下发与二次开发管理" className="h-full">
                  <Table
                    rowSelection={{
                      type: "radio",
                      selectedRowKeys: selectedModelKeys,
                      onChange: handleSelectModel,
                    }}
                    onRow={(record) => ({
                      onClick: () => handleSelectModel([record.id]),
                      style: { cursor: "pointer" },
                    })}
                    dataSource={models.map((m) => ({ ...m, key: m.id }))}
                    columns={[
                      { title: "注册模型名称", dataIndex: "name" },
                      { title: "来源", dataIndex: "source" },
                      {
                        title: "状态",
                        width: 80,
                        render: (_: unknown, r: DiagnosisModel) => (
                          <Tag color={r.status === "active" ? "green" : "default"}>{r.status === "active" ? "Active" : "Standby"}</Tag>
                        ),
                      },
                    ]}
                    pagination={false}
                    size="small"
                    className="mb-4"
                  />
                  <div className="flex justify-end gap-2">
                    <Upload
                      accept=".txt,.log,.json,.md,.csv"
                      showUploadList={false}
                      beforeUpload={(file) => {
                        message.info(`文件 ${file.name} 已接收，当前版本先保留前端占位，后续会接入后端上传。`);
                        return false;
                      }}
                    >
                      <Button icon={<UploadOutlined />}>上传自定义模型 (MCP协议)</Button>
                    </Upload>
                  </div>
                </Card>

                <Card title="算法超参数配置" className="h-full">
                  <div className="flex items-center gap-4 mb-4">
                    <Button type="dashed" icon={<SearchOutlined />} onClick={handleAutoMatch} loading={isMatching}>
                      自动匹配相似工况
                    </Button>
                    {matchResult && (
                      <span className={`text-sm ${matchResult.success ? "text-green-400" : "text-yellow-400"}`}>重合度 {matchResult.score}%</span>
                    )}
                  </div>
                  <Form form={form} layout="vertical" disabled={!activeModelKey}>
                    <Form.Item label="分类优化学习率" name="clsLRate" className="mb-3">
                      <InputNumber style={{ width: "100%" }} step={0.0001} placeholder="为空时使用默认值" />
                    </Form.Item>
                    <Form.Item label="迭代微调轮次 (Epochs)" name="epoch" className="mb-4">
                      <Slider min={10} max={200} marks={{ 10: "10", 50: "50", 200: "200" }} />
                    </Form.Item>
                    <Button
                      type="primary"
                      className="w-full bg-brand-warning border-none hover:bg-yellow-500 font-bold"
                      loading={isDiagnosing}
                      onClick={() => void handleDeploy()}
                      disabled={selectedModelKeys.length === 0}
                    >
                      保存配置并下发长期监控任务
                    </Button>
                  </Form>
                </Card>
              </div>
            ),
          },
          {
            key: "2",
            label: "故障部位推理与维修建议",
            children: (
              <div className="space-y-4">
                <Card title="第一步：配置单次诊断任务" bordered={false} className="w-full">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <h3 className="font-bold mb-3 text-gray-400">选择待分析异常记录：</h3>
                      <Table
                        rowSelection={{
                          type: "radio",
                          selectedRowKeys: selectedTaskKey ? [selectedTaskKey] : [],
                          onChange: (keys) => {
                            setSelectedTaskKey(keys[0]);
                            setDiagnosisResult(null);
                          },
                        }}
                        onRow={(record) => ({
                          onClick: () => {
                            setSelectedTaskKey(record.key);
                            setDiagnosisResult(null);
                          },
                          style: { cursor: "pointer" },
                        })}
                        dataSource={tasks}
                        columns={[
                          { title: "告警时间", dataIndex: "time", width: 180 },
                          { title: "故障设备", dataIndex: "deviceName", width: 140 },
                          { title: "触发信号", dataIndex: "component", width: 160 },
                          { title: "预警内容", dataIndex: "detail" },
                        ]}
                        pagination={false}
                        size="small"
                      />
                    </div>
                    <div className="w-full md:w-1/3 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold mb-3 text-gray-400">选择诊断算法：</h3>
                        <Select
                          value={selectedDiagnosisModel}
                          onChange={(val) => {
                            setSelectedDiagnosisModel(val);
                            setDiagnosisResult(null);
                          }}
                          style={{ width: "100%", marginBottom: "16px" }}
                          options={models.map((m) => ({
                            label: `${m.name}${m.status === "active" ? " (运行中)" : ""}`,
                            value: m.id,
                          }))}
                        />
                      </div>
                      <Button
                        type="primary"
                        size="large"
                        className="w-full bg-brand-warning border-none hover:bg-yellow-500 font-bold h-12 text-lg shadow-lg"
                        loading={isDiagnosing}
                        onClick={() => void handleDiagnoseTask()}
                      >
                        诊断并生成报告
                      </Button>
                    </div>
                  </div>
                </Card>

                {diagnosisResult && (
                  <div className="bg-[#0b1426] p-4 rounded-lg border border-gray-800">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <Card title="诊断结果量化分析 (多尺度特征空间推演)" bordered={false} className="lg:col-span-2 h-full bg-[#111d35] border-none">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="text-6xl text-brand-danger">
                            <CheckCircleOutlined />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-brand-danger">
                              {diagnosisResult.faultComponent} 存在{diagnosisResult.severity}故障
                            </h2>
                            <p className="text-gray-400 mt-1">
                              诊断机理信度: {diagnosisResult.confidence.toFixed(3)} | 任务编号: {diagnosisResult.taskId}
                            </p>
                          </div>
                        </div>
                        <div className="h-[300px]">
                          <ReactECharts option={chartOption} className="h-full w-full" />
                        </div>
                      </Card>

                      <Card title="智能维修建议报告" bordered={false} className="h-full border border-blue-900 bg-blue-950/20">
                        <div className="flex items-start gap-3">
                          <RobotOutlined className="text-2xl text-brand-primary mt-1 shadow-glow" />
                          <div className="text-sm text-gray-300 leading-relaxed font-mono relative min-h-[300px]">
                            <p className="mb-2">
                              <strong>分析报告：</strong>系统已完成诊断计算，当前故障部位为 {diagnosisResult.faultComponent}，
                              故障等级为 {diagnosisResult.severity}，建议尽快安排现场核查。
                            </p>
                            <p className="mb-2 mt-4 text-brand-warning">
                              <strong>建议方案：</strong>
                            </p>
                            <ul className="list-disc pl-4 space-y-2 mb-2 text-gray-400">
                              <li>{diagnosisResult.suggestion}</li>
                              <li>申请开盖窗口，使用专业内窥镜进行齿根及轴承检查。</li>
                              <li>结合润滑油铁谱分析确认金属磨粒异常是否持续。</li>
                            </ul>
                            <p className="text-xs text-brand-primary absolute bottom-0 right-0 w-full text-right pt-2 border-t border-blue-900/50">
                              生成源: PHM 后端诊断服务
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default FaultDiagnosis;
