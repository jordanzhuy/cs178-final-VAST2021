import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { useGraphConfig } from '../contexts/GraphConfigContext';

const Graph = ({ data }) => {
  const svgRef = useRef();
  const {
    nodeSizeMetric,
    setNodeSizeMetric,
    nodeColorMetric,
    setNodeColorMetric
  } = useGraphConfig();
  useEffect(() => {
    console.log(data)
    
    const width = 1200;
    const height = 800;

    const nodes = data.nodes;
    const links = data.relations.map(rel => ({
      ...rel,
      source: nodes[rel.from_idx],
      target: nodes[rel.to_idx]
    }));

    const sizeExtent = d3.extent(nodes, d => d[nodeSizeMetric]);
    const colorExtent = d3.extent(nodes, d => d[nodeColorMetric]);
    const sizeScale = d3.scaleLinear()
    .domain(sizeExtent)
    .range([9, 25]);

    const colorScale = d3.scaleSequential()
    .domain(colorExtent)
    .range(["#d3d3d3", "#00008b"])

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g");

    svg.call(
      d3.zoom()
        .scaleExtent([0.1, 5])
        .on("zoom", (event) => {
          container.attr("transform", event.transform);
        })
    );

    svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -4 8 8")
        .attr("refX", 16)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-4L8,0L0,4")
        .attr("fill", "none")
        .attr("stroke", "#999")
        .attr("stroke-width", 1.5);

    const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("padding", "8px")
        .style("background", "rgba(0,0,0,0.7)")
        .style("color", "#fff")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-size", "12px")
        .style("visibility", "hidden");

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id((d, i) => i).distance(100).strength(0.5))
        .force("charge", d3.forceManyBody().strength(-250))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(d => d.r + 5))

    const link = container.append("g")
        .attr("stroke", "#aaa")
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .attr("stroke-linecap", "round")
        .attr("marker-end", "url(#arrowhead)");


    const node = container.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", d => sizeScale(d[nodeSizeMetric]))
        .attr("fill", d => colorScale(d[nodeColorMetric]))
        .call(drag(simulation));

    const displayKeys = nodes.length > 0
      ? Object.keys(nodes[0]).filter(k => !["x", "y", "vx", "vy", "fx", "fy", "index"].includes(k))
      : [];

    node
      .on("mouseover", (event, d) => {
        const content = displayKeys
          .map(key => `<div><strong>${key}:</strong> ${d[key]}</div>`)
          .join("");
        tooltip.html(content)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY + 10) + "px")
          .style("visibility", "visible");
      })
      .on("mousemove", event => {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY + 10) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

      const nodeRadius = 15; // adjust to match your actual node radius
      const linkedNodeIds = new Set();
      links.forEach(d => {
        linkedNodeIds.add(d.source.id || d.source);
        linkedNodeIds.add(d.target.id || d.target);
      });

      const isolated = nodes.filter(n => !linkedNodeIds.has(n.id));
      const cx = width / 2;
      const cy = height / 2;
      const radius = 300; // distance from center for isolated nodes

      isolated.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / isolated.length;
        node.fx = cx + radius * Math.cos(angle);
        node.fy = cy + radius * Math.sin(angle);
      });

      simulation.on("tick", () => {
        link.attr("d", d => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const angle = Math.atan2(dy, dx);
      
          // shorten endpoint to avoid drawing into the node
          const offsetX = Math.cos(angle) * nodeRadius;
          const offsetY = Math.sin(angle) * nodeRadius;
      
          const x1 = d.source.x;
          const y1 = d.source.y;
          const x2 = d.target.x - offsetX;
          const y2 = d.target.y - offsetY;
      
          const dr = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 1.2;
      
          return `M${x1},${y1}A${dr},${dr} 0 0,1 ${x2},${y2}`;
        });
      
        node.attr("cx", d => d.x).attr("cy", d => d.y);
      });
      
    function drag(simulation) {
      return d3.drag()
        .on("start", event => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        })
        .on("drag", event => {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on("end", event => {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        });
    }

    return () => {
      tooltip.remove();
    };

  }, [data]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />;
};

export default Graph;
