import { useEffect, useState } from "react";
import { Button, Form, Input, Layout, Menu, Modal, Spin, message } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ApiOutlined, DashboardOutlined, DatabaseOutlined, LineChartOutlined, SettingOutlined, ToolOutlined } from "@ant-design/icons";
import { AUTH_REQUIRED_EVENT, clearAuth, getCurrentUser, login, type AuthUser } from "@/services/auth";

const { Header, Sider, Content } = Layout;

type LoginFormValues = {
  username: string;
  password: string;
};

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [form] = Form.useForm<LoginFormValues>();

  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: "/dashboard", icon: <DashboardOutlined />, label: "可视化监控 (大屏)" },
    { key: "/acquisition", icon: <DatabaseOutlined />, label: "数据采集模块" },
    { key: "/processing", icon: <SettingOutlined />, label: "数据预处理" },
    { key: "/health", icon: <LineChartOutlined />, label: "健康状态评估" },
    { key: "/diagnosis", icon: <ToolOutlined />, label: "故障诊断" },
    { key: "/system", icon: <ApiOutlined />, label: "系统支撑管理" },
  ];

  useEffect(() => {
    const bootstrapUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setAuthChecking(false);
    };
    void bootstrapUser();
  }, []);

  useEffect(() => {
    const onAuthRequired = () => {
      setCurrentUser(null);
      setIsLoginModalOpen(true);
    };
    window.addEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
  }, []);

  const handleLogin = async () => {
    try {
      const values = await form.validateFields();
      setLoggingIn(true);
      await login(values.username, values.password);
      const user = await getCurrentUser();
      setCurrentUser(user);
      setIsLoginModalOpen(false);
      form.resetFields();
      message.success("登录成功");
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    setCurrentUser(null);
    message.success("已退出登录");
    setIsLoginModalOpen(false);
  };

  return (
    <Layout className="min-h-screen">
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} className="border-r border-gray-800">
        <div className="h-16 flex items-center justify-center m-4 text-white font-bold text-lg border-b border-gray-700">
          {collapsed ? "PHM" : "减速器 PHM 系统"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="bg-transparent"
        />
      </Sider>
      <Layout>
        <Header className="h-16 bg-panel border-b border-gray-800 px-6 flex items-center justify-between">
          <div className="text-gray-300 text-lg font-medium">PHM 云端平台层分析监测域</div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400 text-sm">当前状态: 运行中</span>
            {currentUser ? (
              <>
                <div className="h-8 px-3 rounded bg-brand-primary flex items-center justify-center text-white text-sm">
                  {currentUser.username}
                </div>
                <Button size="small" onClick={handleLogout}>
                  退出
                </Button>
              </>
            ) : (
              <Button type="primary" size="small" onClick={() => setIsLoginModalOpen(true)}>
                登录
              </Button>
            )}
          </div>
        </Header>
        <Content className="m-4 p-4 min-h-[280px] bg-panel rounded-lg border border-gray-800 overflow-auto">
          {authChecking ? (
            <div className="h-full min-h-[320px] flex items-center justify-center">
              <Spin tip="正在验证登录状态..." />
            </div>
          ) : currentUser ? (
            <Outlet />
          ) : (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-4">
              <div className="text-gray-300 text-lg">请先登录后访问系统模块</div>
              <Button type="primary" onClick={() => setIsLoginModalOpen(true)}>
                立即登录
              </Button>
            </div>
          )}
        </Content>
      </Layout>

      <Modal title="登录 PHM 后端" open={isLoginModalOpen} onCancel={() => setIsLoginModalOpen(false)} onOk={() => void handleLogin()} confirmLoading={loggingIn}>
        <Form form={form} layout="vertical" initialValues={{ username: "admin", password: "admin123" }}>
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default MainLayout;
