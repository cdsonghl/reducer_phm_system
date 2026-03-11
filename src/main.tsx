import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import App from './App';
import './index.css';

// 启用 Ant Design 的暗黑算法，并定制品牌主色与背景色
const antdThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#1890ff',
    colorBgBase: '#0f1215',
    colorBgContainer: '#1a1f26',
    colorBgElevated: '#262c36',
    colorBorder: '#374151',
    colorTextBase: '#e5e7eb',
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    borderRadius: 6,
  },
  components: {
    Layout: {
      bodyBg: '#0f1215',
      headerBg: '#1a1f26',
      siderBg: '#1a1f26',
    },
    Card: {
      colorBgContainer: '#1a1f26',
      colorBorderSecondary: '#374151',
    },
    Table: {
      colorBgContainer: '#1a1f26',
      headerBg: '#262c36',
      headerColor: '#e5e7eb',
      borderColor: '#374151',
    }
  }
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider theme={antdThemeConfig}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
