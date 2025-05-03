import React, { createContext, useContext, useState } from 'react';

const GraphConfigContext = createContext();

export const GraphConfigProvider = ({ children }) => {
  const [nodeSizeMetric, setNodeSizeMetric] = useState('pagerank');
  const [nodeColorMetric, setNodeColorMetric] = useState('referenced_by_count');
  const [q2Entity, setQ2Entity] = useState(null);
  const [q2Source, setQ2Source] = useState(null);

  return (
    <GraphConfigContext.Provider value={{
      nodeSizeMetric,
      setNodeSizeMetric,
      nodeColorMetric,
      setNodeColorMetric,
      q2Entity,
      setQ2Entity,
      q2Source,
      setQ2Source
    }}>
      {children}
    </GraphConfigContext.Provider>
  );
};

export const useGraphConfig = () => useContext(GraphConfigContext);