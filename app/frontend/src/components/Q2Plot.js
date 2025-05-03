import { useEffect, useRef } from 'react';
import { useGraphConfig } from '../contexts/GraphConfigContext';
import Plotly from 'plotly.js-dist-min';

const Q2Plot = ({ entity, source }) => {
  const entityRef = useRef();
  const sourceRef = useRef();
  const articleRef = useRef();
  const sourceArticleRef = useRef();

  const {
    q2Entity,
    q2Source,
  } = useGraphConfig();


  useEffect(() => {
    if (!q2Entity) return;
    fetch(`/api/q2/data?entity=${encodeURIComponent(q2Entity)}`)
      .then(res => res.json())
      .then(data => {
        Plotly.newPlot(entityRef.current, [{
          x: data.map(d => d.x),
          y: data.map(d => d.y),
          type: 'bar',
          marker: { color: data.map(d => d.y), colorscale: 'RdBu', cmin: -1, cmax: 1 },
          hovertemplate: 'Source: %{x}<br>Sentiment: %{y}<extra></extra>'
        }], {
          title: {
            text: `Sentiment of "${q2Entity}" across News Sources`,
            font: { size: 18 },
            x: 0.5,
            xanchor: 'center'
          },
          margin: { t: 60, l: 40 },
          xaxis: { title: 'Source', automargin: true },
          yaxis: { title: 'Sentiment', range: [-1, 1] }
        });

        entityRef.current.on('plotly_hover', function(eventData) {
          const point = eventData.points[0];
          const idx = data.findIndex(d => d.x === point.x);
          articleRef.current.textContent = data[idx]?.content || "";
        });
      });
  }, [q2Entity]);

  useEffect(() => {
    if (!q2Source) return;
    fetch(`/api/q2/source_entity_heatmap?source=${encodeURIComponent(q2Source)}`)
      .then(res => res.json())
      .then(data => {
        Plotly.newPlot(sourceRef.current, [{
          x: data.entities,
          y: data.sentiments,
          type: 'bar',
          marker: { color: data.sentiments, colorscale: 'RdBu', cmin: -1, cmax: 1 },
          hovertemplate: 'Entity: %{x}<br>Sentiment: %{y}<extra></extra>'
        }], {
          title: {
            text: `Sentiment of "${q2Source}" toward Entities`,
            font: { size: 18 },
            x: 0.5,
            xanchor: 'center'
          },
          margin: { t: 60, l: 40 },
          xaxis: { title: 'Entity', automargin: true },
          yaxis: { title: 'Sentiment', range: [-1, 1] }
        });

        sourceRef.current.on('plotly_hover', function(eventData) {
          const point = eventData.points[0];
          const idx = data.entities.indexOf(point.x);
          sourceArticleRef.current.textContent = data.contents[idx] || "";
        });
      });
  }, [q2Source]);

  return (
  <div style={{ padding: 24 }}>
    <div style={{ display: "flex", gap: 24 }}>
      {/* Left column: entity heatmap + article */}
      <div style={{ flex: 1 }}>
        <div ref={entityRef} />
        <div
          ref={articleRef}
          style={{ padding: 16, border: "1px solid #ddd", marginTop: 8 }}
        />
      </div>

      {/* Right column: source heatmap + article */}
      <div style={{ flex: 1 }}>
        <div ref={sourceRef} />
        <div
          ref={sourceArticleRef}
          style={{ padding: 16, border: "1px solid #ddd", marginTop: 8 }}
        />
      </div>
    </div>
  </div>
    
  );
};

export default Q2Plot;