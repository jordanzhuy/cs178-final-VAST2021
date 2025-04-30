console.log("Visualization module loaded");

const Visualization = (function () {
  let svg, simulation, width, height, linkGroup, nodeGroup;
  let tooltip;

  function init(selector) {
    const container = document.querySelector(selector);
    width = container.clientWidth || 800;
    height = container.clientHeight || 600;

    svg = d3.select("#graph")
      .attr("width", width)
      .attr("height", height);

    linkGroup = svg.append("g").attr("class", "links");
    nodeGroup = svg.append("g").attr("class", "nodes");

    tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "8px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2));
  }

  function render(graphData, visualOptions = {}) {
    console.log("Visualization: Rendering graph");
    const allGraphData = graphData;

    const linkedNodeIds = new Set();
    graphData.links.forEach(link => {
      linkedNodeIds.add(typeof link.source === "object" ? link.source.id : link.source);
      linkedNodeIds.add(typeof link.target === "object" ? link.target.id : link.target);
    });

    const filteredNodes = graphData.nodes.filter(node => linkedNodeIds.has(node.id));

    svg.selectAll(".links > *").remove();
    svg.selectAll(".nodes > *").remove();

    const links = graphData.links.map(d => ({ ...d }));
    const nodes = filteredNodes.map(d => ({ ...d }));

    const nodeDegree = {};
    links.forEach(link => {
      const src = typeof link.source === "object" ? link.source.id : link.source;
      const tgt = typeof link.target === "object" ? link.target.id : link.target;
      nodeDegree[src] = (nodeDegree[src] || 0) + 1;
      nodeDegree[tgt] = (nodeDegree[tgt] || 0) + 1;
    });

    const nodeMap = {};
    nodes.forEach(node => {
      nodeMap[node.id] = node;
      node.x = node.y = node.vx = node.vy = null;
    });

    const link = linkGroup.selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-width", d => Math.max(1, Math.sqrt(d.weight)))
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .on("mouseover", function (event, d) {
        const source = typeof d.source === "object" ? d.source.id : d.source;
        const target = typeof d.target === "object" ? d.target.id : d.target;

        let tooltipContent = `<strong>${source} → ${target}</strong><br>Weight: ${d.weight}`;

        if (d.subjects && d.subjects.length > 0) {
          tooltipContent += "<br><br><strong>Subjects:</strong><br>";
          tooltipContent += d.subjects.slice(0, 5).map(s => `• ${s}`).join("<br>");
        }

        tooltip
          .style("visibility", "visible")
          .html(tooltipContent)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));

    const node = nodeGroup.selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", d => 2 + Math.sqrt(nodeDegree[d.id] || 1) * 2)
      .attr("fill", d => d.label === "ORG" ? "#1f77b4" : "#2ca02c")
      .on("mouseover", function (event, d) {
        const connectedLinks = links.filter(link => {
          const source = typeof link.source === "object" ? link.source.id : link.source;
          const target = typeof link.target === "object" ? link.target.id : link.target;
          return source === d.id || target === d.id;
        });

        let tooltipContent = `<strong>${d.id}</strong><br>Type: ${d.label}<br><br>`;
        const hasOrg = allGraphData.nodes.some(n => n.label === "ORG");

        if (hasOrg && d.label === "PERSON") {
          const seen = new Set();
          const orgWeights = connectedLinks.map(link => {
            const source = typeof link.source === "object" ? link.source.id : link.source;
            const target = typeof link.target === "object" ? link.target.id : link.target;
            if (source === d.id) {
              const org = allGraphData.nodes.find(n => n.id === target);
              if (org?.label === "ORG" && !seen.has(target)) {
                seen.add(target);
                return `${target}: ${link.weight}`;
              }
            }
            if (target === d.id) {
              const org = allGraphData.nodes.find(n => n.id === source);
              if (org?.label === "ORG" && !seen.has(source)) {
                seen.add(source);
                return `${source}: ${link.weight}`;
              }
            }
            return null;
          }).filter(Boolean);

          tooltipContent += "Organization Weights:<br>" + (orgWeights.length > 0 ? orgWeights.join("<br>") : "(None)");
        } else {
          tooltipContent += "<strong>Connections:</strong><br>";
          connectedLinks.forEach(link => {
            const source = typeof link.source === "object" ? link.source.id : link.source;
            const target = typeof link.target === "object" ? link.target.id : link.target;
            const other = source === d.id ? target : source;
            tooltipContent += `• ${other} (weight: ${link.weight})<br>`;
          });
        }

        tooltip
          .style("visibility", "visible")
          .html(tooltipContent)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"))
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("title").text(d => d.id);

    const label = nodeGroup.selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text(d => d.label === "ORG" ? d.id : "")
      .attr("font-size", "10px")
      .attr("fill", "black")
      .style("pointer-events", "none")
      .attr("text-anchor", "middle")
      .attr("dy", "-1em");

    simulation.nodes(nodes).on("tick", ticked);
    simulation.force("link").links(links);
    simulation.alpha(1).restart();

    function ticked() {
      link
        .attr("x1", d => Math.max(0, Math.min(width, nodeMap[d.source.id || d.source].x)))
        .attr("y1", d => Math.max(0, Math.min(height, nodeMap[d.source.id || d.source].y)))
        .attr("x2", d => Math.max(0, Math.min(width, nodeMap[d.target.id || d.target].x)))
        .attr("y2", d => Math.max(0, Math.min(height, nodeMap[d.target.id || d.target].y)));

      node
        .attr("cx", d => Math.max(0, Math.min(width, d.x)))
        .attr("cy", d => Math.max(0, Math.min(height, d.y)));

      label
        .attr("x", d => Math.max(0, Math.min(width, d.x)))
        .attr("y", d => Math.max(0, Math.min(height, d.y)));
    }

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = d.x;
      d.fy = d.y;
    }
  }

  return {
    init,
    render,
  };
})();
