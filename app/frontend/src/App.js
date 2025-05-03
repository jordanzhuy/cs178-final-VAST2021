import React, { useState } from 'react';
import { LaptopOutlined, NotificationOutlined, UserOutlined } from '@ant-design/icons';
import { Breadcrumb, Layout, Menu, theme, Splitter, Slider} from 'antd';
import QuestionHeader from './components/QuestionHeader';
import SidebarFilter from './components/Sidebar'
import { GraphConfigProvider } from './contexts/GraphConfigContext';
import Graph from './components/Graph';
const { Header, Content, Sider } = Layout;


const App = () => {
  const [currentQ, setCurrentQ] = useState('Q1');
  const [selectedGraph, setSelectedGraph] = useState('Org-Person');
  const [data, setData] = useState({ nodes: [], relations: [] });

  return (
    <GraphConfigProvider>
    <Layout>
      <QuestionHeader currentQ={currentQ} setCurrentQ={setCurrentQ} />
      <Layout>
        <SidebarFilter
          currentQ={currentQ}
          setData={setData}
        />
        <Layout.Content style={{ padding: 24 }}>
          <Graph data={data} />
        </Layout.Content>
      </Layout>
    </Layout>
    </GraphConfigProvider>
  );
};

export default App;