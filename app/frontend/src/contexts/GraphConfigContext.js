import React, { createContext, useContext, useState } from 'react';

const GraphConfigContext = createContext();

export const GraphConfigProvider = ({ children }) => {
  const [nodeSizeMetric, setNodeSizeMetric] = useState('pagerank');
  const [nodeColorMetric, setNodeColorMetric] = useState('referenced_by_count');

  return (
    <GraphConfigContext.Provider value={{
      nodeSizeMetric,
      setNodeSizeMetric,
      nodeColorMetric,
      setNodeColorMetric,
    }}>
      {children}
    </GraphConfigContext.Provider>
  );
};

export const useGraphConfig = () => useContext(GraphConfigContext);