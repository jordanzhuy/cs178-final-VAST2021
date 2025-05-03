import { Layout, Menu } from 'antd';
const { Header } = Layout;

const QuestionHeader = ({ currentQ, setCurrentQ }) => (
  <Header>
    <Menu
      theme="dark"
      mode="horizontal"
      selectedKeys={[currentQ]}
      onClick={(e) => setCurrentQ(e.key)}
      items={[
        { key: 1, label: 'Q1' },
        { key: 2, label: 'Q2' },
        { key: 3, label: 'Q3' },
      ]}
    />
  </Header>
);

export default QuestionHeader;