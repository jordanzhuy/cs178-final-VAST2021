import React, { useState, useEffect } from 'react';
import { LaptopOutlined, NotificationOutlined, UserOutlined } from '@ant-design/icons';
import { Breadcrumb, Layout, Menu, theme, Splitter, Slider} from 'antd';
import QuestionHeader from './components/QuestionHeader';
import SidebarFilter from './components/Sidebar'
import { GraphConfigProvider } from './contexts/GraphConfigContext';
import Graph from './components/Graph';

const { Header, Content, Sider } = Layout;



const App = () => {
  const [currentQ, setCurrentQ] = useState(1);
  const [selectedGraph, setSelectedGraph] = useState('Org-Person');
  const [data, setData] = useState({ nodes: [], relations: [] });

  const renderGraph = (Q) => {
    switch (Number(Q)) {
      case 1: return <Graph data={data} />;
      case 2: return null;
      case 3: {return <div id="visualization" class="vis_container"><svg id="graph" height={800}></svg></div>};
      default: return <div>Unsupported question selected</div>;
    }
  }
  useEffect(() => {
    if (currentQ != 1){
      setData({ nodes: [], relations: [] })
    }
  }, [currentQ])

  return (
    <GraphConfigProvider>
    <Layout>
      <QuestionHeader currentQ={currentQ} setCurrentQ={setCurrentQ} />
      <Layout>
        <SidebarFilter
          currentQ={currentQ}
          setData={setData}
        />
        <Layout.Content style={{ padding: 24}}>
        {renderGraph(currentQ)}
        </Layout.Content>
      </Layout>
    </Layout>
    </GraphConfigProvider>
  );
};

export default App;