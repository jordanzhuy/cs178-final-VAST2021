document.addEventListener("DOMContentLoaded", () => {
    const entitySelect = document.getElementById("entity-select");
    const sourceSelect = document.getElementById("source-entity-select");
    const heatmapContainer = document.getElementById("heatmap");
    const sourceEntityHeatmapContainer = document.getElementById("source-entity-heatmap");
    const articleContent = document.getElementById("article-content");
    const sourceEntityContent = document.getElementById("source-entity-article-content");

    // Load entities for dropdown
    fetch("/entities")
        .then(res => res.json())
        .then(entities => {
            entities.forEach(entity => {
                const option = document.createElement("option");
                option.value = entity;
                option.textContent = entity;
                entitySelect.appendChild(option);
            });
            if (entities.length > 0) {
                entitySelect.value = entities[0];
                loadEntityHeatmap(entities[0]);
            }
        });

    entitySelect.addEventListener("change", () => {
        loadEntityHeatmap(entitySelect.value);
    });

    function loadEntityHeatmap(entity) {
        fetch(`/data?entity=${encodeURIComponent(entity)}`)
            .then(res => res.json())
            .then(data => {
                const sources = data.map(d => d.x);
                const sentiments = data.map(d => d.y);
                const contents = data.map(d => d.content);
                Plotly.newPlot(heatmapContainer, [{
                    x: sources,
                    y: sentiments,
                    text: contents,
                    type: 'bar',
                    marker: { color: sentiments, colorscale: 'RdBu', cmin: -1, cmax: 1 },
                    hovertemplate: 'Source: %{x}<br>Sentiment: %{y}<extra></extra>'
                }], {
                    title: `Sentiment of "${entity}" across News Sources`,
                    margin: { t: 40, l: 40 },
                    xaxis: { title: 'Source', automargin: true },
                    yaxis: { title: 'Average Sentiment', range: [-1, 1] }
                });
    
                heatmapContainer.on('plotly_hover', function(eventData) {
                    const point = eventData.points[0];
                    if (point && point.x) {
                        const rowLabel = point.x;  // this is the source name
                        const idx = sources.indexOf(rowLabel);  // use the y-axis label to look up
                        if (idx !== -1) {
                            articleContent.textContent = contents[idx];
                        }
                    }
                });
                //heatmapContainer.on('plotly_unhover', () => articleContent.textContent = "");
            });
    }
    

    // Load sources for dropdown
    fetch("/sources")
        .then(res => res.json())
        .then(sources => {
            sources.forEach(source => {
                const option = document.createElement("option");
                option.value = source;
                option.textContent = source;
                sourceSelect.appendChild(option);
            });
            if (sources.length > 0) {
                sourceSelect.value = sources[0];
                loadSourceEntityHeatmap(sources[0]);
            }
        });

    sourceSelect.addEventListener("change", () => {
        loadSourceEntityHeatmap(sourceSelect.value);
    });

    function loadSourceEntityHeatmap(source) {
        fetch(`/source_entity_heatmap?source=${encodeURIComponent(source)}`)
            .then(res => res.json())
            .then(data => {
                Plotly.newPlot(sourceEntityHeatmapContainer, [{
                    x: data.entities,
                    y: data.sentiments,
                    text: data.contents,
                    type: 'bar',
                    marker: { color: data.sentiments, colorscale: 'RdBu', cmin: -1, cmax: 1 },
                    hovertemplate: 'Entity: %{x}<br>Sentiment: %{y}<extra></extra>'
                }], {
                    title: `Sentiment of "${source}" toward Entities`,
                    margin: { t: 40, l: 40 },
                    xaxis: { title: 'Entity', automargin: true },
                    yaxis: { title: 'Average Sentiment', range: [-1, 1] }
                });
                
    
                sourceEntityHeatmapContainer.on('plotly_hover', function(eventData) {
                    const point = eventData.points[0];
                    if (point && point.x) {
                        const rowLabel = point.x;  // this is the entity name
                        const idx = data.entities.indexOf(rowLabel);
                        if (idx !== -1) {
                            sourceEntityContent.textContent = data.contents[idx];
                        }
                    }
                });
                //sourceEntityHeatmapContainer.on('plotly_unhover', () => sourceEntityContent.textContent = "");
            });
    }
    

});
