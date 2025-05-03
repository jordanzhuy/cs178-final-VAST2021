import { Layout, Select, Form, Input, Button, Collapse, Typography, Divider, Checkbox, Slider} from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useEffect, useState, useRef } from 'react';
import { useGraphConfig } from '../contexts/GraphConfigContext';
const { Sider } = Layout;
const { Option } = Select;
const { Panel } = Collapse;
const { Title, Text } = Typography;

const SidebarFilter = ({ currentQ, setData }) => {
  const {
    nodeSizeMetric,
    setNodeSizeMetric,
    nodeColorMetric,
    setNodeColorMetric
  } = useGraphConfig();

  const [pendingFilters, setPendingFilters] = useState({ 
    minEdgeRefCount: 0,
    similarityThreshold: 0.5 });

  useEffect(() => {
    if (nodeSizeMetric && nodeColorMetric){
      getData();
    }
    
  }, [nodeSizeMetric, nodeColorMetric]);

  async function getData() {
  
      fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filters: {
            min_edge_count: pendingFilters.minEdgeRefCount,
            similarity_threshold: pendingFilters.similarityThreshold
          },
          configs: {
            node_size: nodeSizeMetric,
            node_color: nodeColorMetric,
          }
        })
      })
        .then(res => res.json())
        .then(data => setData(data))
        .catch(err => console.error('Error fetching data:', err));
  }
  
  return (
    <Sider
      width={300}
      style={{
        background: '#fff',
        padding: 16,
        marginLeft: 16,
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Collapse defaultActiveKey={['1']} ghost expandIconPosition="right">
        <Panel
          header={
            <span>
              <SettingOutlined style={{ marginRight: 8 }} />
              Graph Configuration
            </span>
          }
          key="1"
        >
      
      <Form layout="vertical" style={{ flex: 1 }}>
        <Form.Item label="Node Size">
          <Select value={nodeSizeMetric} onChange={setNodeSizeMetric}>
            <Option value="pagerank">PageRank</Option>
            <Option value="hits_hub">HITS Hub Score</Option>
            <Option value="hits_auth">HITS Authority Score</Option>
            <Option value="referenced_by_count">Referenced By</Option>
            <Option value="references_to_others_count">References Others</Option>
            <Option value="reference_diff">References Others - Referenced By</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Node Color">
          <Select value={nodeColorMetric} onChange={setNodeColorMetric}>
            <Option value="pagerank">PageRank</Option>
            <Option value="hits_hub">HITS Hub Score</Option>
            <Option value="hits_auth">HITS Authority Score</Option>
            <Option value="referenced_by_count">Referenced By</Option>
            <Option value="references_to_others_count">References Others</Option>
            <Option value="reference_diff">References Others - Referenced By</Option>
          </Select>
        </Form.Item>
      </Form>
      </Panel>
      </Collapse>
      <Collapse defaultActiveKey={['1']} ghost expandIconPosition="right">
        <Panel
          header={
            <span>
              <SettingOutlined style={{ marginRight: 8 }} />
              Filter Settings
            </span>
          }
          key="1"
        >
         <Form layout="vertical">
          <Form.Item label="Minimum Reference Count of edge">
            <Slider
              min={0}
              max={20}
              step={1}
              value={pendingFilters.minEdgeRefCount}
              onChange={val => setPendingFilters(prev => ({ ...prev, minEdgeRefCount: val }))}
            />
          </Form.Item>


          <Form.Item label="Similarity Threshold">
            <Slider
              min={0.5}
              max={1}
              step={0.01}
              value={pendingFilters.similarityThreshold}
              onChange={val => setPendingFilters(prev => ({ ...prev, similarityThreshold: val }))}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" block onClick={getData}>
              Apply Filters
            </Button>
          </Form.Item>
        </Form>
        </Panel>
      </Collapse>
     
    </Sider>
  );
};

export default SidebarFilter;