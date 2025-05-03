import { Layout, Select, Form, Input, Button, Collapse, Typography, Divider, Checkbox, Slider} from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useEffect, useState, useRef } from 'react';
import { useGraphConfig } from '../contexts/GraphConfigContext';
import API from './api'; 
import Visualization from './visualization'

const { Sider } = Layout;
const { Option } = Select;
const { Panel } = Collapse;
const { Title, Text } = Typography;


function applyFilters(currentGraphData, currentOrgFilter, currentMinWeight, currentPersonFilter) {
  let nodes = [...currentGraphData.nodes];
  let links = [...currentGraphData.links];

  if (currentOrgFilter && currentOrgFilter !== "All Organizations") {
    const connected = new Set();
    links.forEach(l => {
      if (l.source === currentOrgFilter || l.target === currentOrgFilter) {
        connected.add(l.source);
        connected.add(l.target);
      }
    });
    nodes = nodes.filter(n => connected.has(n.id));
    links = links.filter(l => connected.has(l.source) && connected.has(l.target));
  }

  if (currentMinWeight > 1) {
    links = links.filter(l => l.weight >= currentMinWeight);
  }

  if (currentPersonFilter && currentPersonFilter !== "Select a person") {
    links = links.filter(l => l.source === currentPersonFilter || l.target === currentPersonFilter);
  }

  const nodeIds = new Set(links.flatMap(l => [l.source, l.target]));
  nodes = nodes.filter(n => nodeIds.has(n.id));
  Visualization.render({ nodes, links }, { view: 'org-person' });
}

function applyEmailFilters(currentEmailGraphData, currentPersonPersonFilter, currentPersonPersonMinWeight) {
  let nodes = [...currentEmailGraphData.nodes];
  let links = [...currentEmailGraphData.links];

  if (currentPersonPersonFilter && currentPersonPersonFilter !== "Select a person") {
    links = links.filter(l => l.source === currentPersonPersonFilter || l.target === currentPersonPersonFilter);
  }

  if (currentPersonPersonMinWeight > 1) {
    links = links.filter(l => l.weight >= currentPersonPersonMinWeight);
  }

  const nodeIds = new Set(links.flatMap(l => [l.source, l.target]));
  nodes = nodes.filter(n => nodeIds.has(n.id));
  Visualization.render({ nodes, links }, { view: 'person-person' });
}


const SidebarFilter = ({ currentQ, setData }) => {
  const {
    nodeSizeMetric,
    setNodeSizeMetric,
    nodeColorMetric,
    setNodeColorMetric,
    q2Entity,
    setQ2Entity,
    q2Source,
    setQ2Source
  } = useGraphConfig();

  const [graphSource, setGraphSource] = useState("article")
  const [Q3Graph, setQ3Graph] = useState("org-person")
    
  const [entities, setEntities] = useState([]);
  const [sources, setSources] = useState([]);

  const [pendingFilters, setPendingFilters] = useState({ 
    minEdgeRefCount: 0,
    similarityThreshold: 0.5 });

  const [Q3PendingFilters, setQ3PendingFilters] = useState({
    organization: "All Organizations",
    person: "Select a person",
    min_cooccurence: 1,
    person_2: "Select a person",
    min_connection: 1
  })

  const [Q3Data, setQ3Data] = useState({nodes: [], links:[]})


  useEffect(() => {
    const fetchAndRenderQ3Data = async () => {
      if (Q3Graph == 'org-person'){
        const data = await API.fetchGraphData({ dataset: graphSource });
        setQ3Data(data);
        applyFilters(data, Q3PendingFilters.organization, Q3PendingFilters.min_cooccurence, Q3PendingFilters.person);
      }
      else if (Q3Graph == 'person-person') {
        const data = await API.fetchEmailGraphData();
        setQ3Data(data);
        applyEmailFilters(data, Q3PendingFilters.person_2, Q3PendingFilters.min_connection);
      }
      
    }
    if (currentQ == 1 && nodeSizeMetric && nodeColorMetric){
      getData(currentQ);
    }
    else if (currentQ == 2){
      fetch("/api/q2/entities").then(res => res.json()).then(res => {
        setEntities(res);
        setQ2Entity(res[0]);
      });
      fetch("/api/q2/sources").then(res => res.json()).then(res => {
        setSources(res);
        setQ2Source(res[0]);
      });
    }
    else if (currentQ == 3 && graphSource){
      Visualization.init("#visualization");
      fetchAndRenderQ3Data();
      
    }
    
  }, [currentQ, nodeSizeMetric, nodeColorMetric, graphSource, Q3Graph]);

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

  const Q1Config = () => (
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
    )

  const Q1Filters = () => (
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

      <Button type="dashed" block onClick={() => {
            setPendingFilters({
              minEdgeRefCount: 0,
              similarityThreshold: 0.5
            })
          }}>
          Reset Filters
        </Button>
    </Form>
  )
    

  const Q2Filters = () => (
    <Form layout="vertical">
      <Form.Item label="Select Entity">
        <Select
          value={q2Entity}
          onChange={val => setQ2Entity(val)}
        >
          {entities.map(ent => (
            <Option key={ent} value={ent}>{ent}</Option>
          ))}
        </Select>
      </Form.Item>
  
      <Form.Item label="Select Source">
        <Select
          value={q2Source}
          onChange={val => setQ2Source(val)}
        >
          {sources.map(src => (
            <Option key={src} value={src}>{src}</Option>
          ))}
        </Select>
      </Form.Item>
    </Form>
  );

  const Q3Config = () => {
    const graphSelect = 
    <Form.Item label="Select Graph">
      <Select value={Q3Graph} onChange={setQ3Graph}>
        <Option value="org-person">Organization-Person</Option>
        <Option value="person-person">Person-Person</Option>
      </Select>
    </Form.Item>
    const datasetSelect = 
    <Form.Item label="Select Dataset">
    <Select value={graphSource} onChange={setGraphSource}>
      <Option value="article">Artricle Level</Option>
      <Option value="sentence">Sentence Level</Option>
    </Select>
    </Form.Item>
    if (Q3Graph == "org-person") {
      return (<Form layout="vertical" style={{ flex: 1 }}> 
      {graphSelect}
      {datasetSelect}
      </Form>)
    }
    else {
      return (<Form layout="vertical" style={{ flex: 1 }}> 
        {graphSelect}
        </Form>)
    }
  }
    
  
    
  const Q3Filters = () => {
    const orgPersonFilter = (<Form layout="vertical">
      <Title level={5}>Organization Filter</Title>
      <Form.Item label="Select Organization">
        <Select value={Q3PendingFilters.organization || "All Organizations"}
        onChange={val => setQ3PendingFilters(prev => ({ ...prev, organization: val }))}>
          <option value={"All Organizations"} textContent = {"All Organizations"}></option>
            {
            Q3Data.nodes.filter(n => n.label === 'ORG').map(org => 
              <option value= {org.id} textContent = {org.id}></option>
            )
            }
        </Select>

      </Form.Item>
      <Divider></Divider>
      <Title level={5}>Person Co-occurrence Filter</Title>
      <Form.Item label="Select Person">
        <Select value={Q3PendingFilters.person || "Select a person"}
          onChange={val => setQ3PendingFilters(prev => ({ ...prev, person: val }))}>
          <option value={"Select a person"} textContent = {"Select a person"}></option>
          {Q3Data.nodes.filter(n => n.label === 'PERSON').map(p => 
            <option value= {p.id} textContent = {p.id}></option>
            )
          }
        </Select>

      </Form.Item>


      <Form.Item label="Minimum co-occurance">
        <Slider
          min={1}
          max={50}
          step={1}
          value={Q3PendingFilters.min_cooccurence}
          onChange={val => setQ3PendingFilters(prev => ({ ...prev, min_cooccurence: val }))}
        />
      </Form.Item>

      <Button type="primary" block onClick={() => {applyFilters(Q3Data, Q3PendingFilters.organization, Q3PendingFilters.min_cooccurence, Q3PendingFilters.person)}}>
        Apply Filters
      </Button>
      <Button style={{marginTop: 10}} type="dashed" block onClick={() => {
          setQ3PendingFilters(prev => ({...prev,
            organization: "All Organizations",
            min_cooccurence: 1,
            person: "Select a person"
          }))
        }}>
        Reset Filters
      </Button>
      </Form>)

    const personPersonFilter = (
      <Form>
      <Title level={5}>Person-Person Filter</Title>
      <Form.Item label="Select Person">
        <Select value={Q3PendingFilters.person_2 || "Select a person"}
        onChange={val => setQ3PendingFilters(prev => ({ ...prev, person_2: val }))}>
          <option value={"Select a person"} textContent = {"Select a person"}></option>
            {
            Q3Data.nodes.filter(n => n.label === 'PERSON').map(org => 
              <option value= {org.id} textContent = {org.id}></option>
            )
            }
        </Select>

      </Form.Item>

      <Form.Item label="Minimum connection">
        <Slider
          min={1}
          max={50}
          step={1}
          value={Q3PendingFilters.min_connection}
          onChange={val => setQ3PendingFilters(prev => ({ ...prev, min_connection: val }))}
        />
      </Form.Item>
      <Button type="primary" block onClick={() => {applyEmailFilters(Q3Data, Q3PendingFilters.person_2, Q3PendingFilters.min_connection)}}>
        Apply Filters
      </Button>
      <Button style={{marginTop: 10}} type="dashed" block onClick={() => {
          setQ3PendingFilters(prev => ({...prev,
            min_connection: 1,
            person_2: "Select a person"
          }))
        }}>
        Reset Filters
      </Button>
      </Form>
    )

    if (Q3Graph == 'org-person'){
      return orgPersonFilter;
    }
    else if (Q3Graph == 'person-person'){
      return personPersonFilter;
    }
  }


  const renderConfig = () => {
    switch (Number(currentQ)) {
      case 1: return Q1Config();
      case 2: return null;
      case 3: return Q3Config();
      default: return <div>Unsupported question selected</div>;
    }
  };
  
  const renderFilters = () => {
    switch (Number(currentQ)) {
      case 1: return Q1Filters();
      case 2: return Q2Filters();
      case 3: return Q3Filters();
      default: return <div>Unsupported question selected</div>;
    }
  };

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
          
          {renderConfig()}
        </Panel>
      </Collapse>

      <Divider></Divider>

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
         {renderFilters()}
        </Panel>
      </Collapse>
     
    </Sider>
  );
};

export default SidebarFilter;