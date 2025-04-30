console.log("App module loaded");

(function () {
  let currentGraphData = null;
  let currentEmailGraphData = null;
  let currentGraphType = 'org-person';

  let currentOrgFilter = null;
  let currentPersonFilter = null;
  let currentMinWeight = 1;

  let currentPersonPersonFilter = null;
  let currentPersonPersonMinWeight = 1;

  function init() {
    if (typeof Visualization === "undefined") return showError("Visualization module failed to load");
    if (typeof API === "undefined") return showError("API module failed to load");

    Visualization.init("#visualization");
    setupTabSwitching();

    API.checkAvailable().then((available) => {
      if (!available) return showError("Backend API not available");
      fetchAndRenderGraph();
      fetchAndRenderEmailGraph();
    });
  }

  function setupTabSwitching() {
    document.querySelectorAll(".tab-button").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        currentGraphType = btn.dataset.tab;

        document.querySelectorAll(".org-person-tab").forEach(el => {
          el.style.display = currentGraphType === 'org-person' ? "block" : "none";
        });
        document.querySelectorAll(".person-person-tab").forEach(el => {
          el.style.display = currentGraphType === 'person-person' ? "block" : "none";
        });

        if (currentGraphType === 'org-person') {
          Visualization.render(currentGraphData);
        } else {
          Visualization.render(currentEmailGraphData);
        }
      });
    });
  }

  async function fetchAndRenderGraph() {
    try {
      const data = await API.fetchGraphData({});
      currentGraphData = data;
      initOrgFilter();
      initPersonFilter();
      if (currentGraphType === 'org-person') Visualization.render(data);
    } catch (err) {
      showError("Failed to load org-person graph");
    }
  }

  async function fetchAndRenderEmailGraph() {
    try {
      const data = await API.fetchEmailGraphData();
      currentEmailGraphData = data;
      initPersonPersonFilter();
    } catch (err) {
      showError("Failed to load person-person graph");
    }
  }

  function initOrgFilter() {
    const select = document.getElementById("orgFilter");
    const button = document.getElementById("applyOrgFilter");
    if (!select || !button) return;

    select.innerHTML = '<option value="">All Organizations</option>';
    currentGraphData.nodes.filter(n => n.label === 'ORG').forEach(org => {
      const option = document.createElement("option");
      option.value = org.id;
      option.textContent = org.id;
      select.appendChild(option);
    });

    button.onclick = () => {
      currentOrgFilter = select.value || null;
      applyFilters();
    };
  }

  function initPersonFilter() {
    const select = document.getElementById("personFilter");
    const minInput = document.getElementById("minWeight");
    const button = document.getElementById("applyPersonFilter");
    if (!select || !minInput || !button) return;

    select.innerHTML = '<option value="">Select a person</option>';
    currentGraphData.nodes.filter(n => n.label === 'PERSON').forEach(p => {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = p.id;
      select.appendChild(option);
    });

    button.onclick = () => {
      currentPersonFilter = select.value || null;
      currentMinWeight = parseInt(minInput.value) || 1;
      applyFilters();
    };
  }

  function applyFilters() {
    let nodes = [...currentGraphData.nodes];
    let links = [...currentGraphData.links];

    if (currentOrgFilter) {
      const connected = new Set();
      links.forEach(l => {
        if (l.source === currentOrgFilter || l.target === currentOrgFilter) {
          connected.add(l.source); connected.add(l.target);
        }
      });
      nodes = nodes.filter(n => connected.has(n.id));
      links = links.filter(l => connected.has(l.source) && connected.has(l.target));
    }

    if (currentMinWeight > 1) {
      links = links.filter(l => l.weight >= currentMinWeight);
    }

    if (currentPersonFilter) {
      links = links.filter(l => l.source === currentPersonFilter || l.target === currentPersonFilter);
    }

    const nodeIds = new Set(links.flatMap(l => [l.source, l.target]));
    nodes = nodes.filter(n => nodeIds.has(n.id));
    Visualization.render({ nodes, links });
  }

  function initPersonPersonFilter() {
    const select = document.getElementById("person-person-select");
    const weightInput = document.getElementById("personMinWeight");
    const button = document.getElementById("applyPersonPersonFilter");
    if (!select || !button || !weightInput) return;

    select.innerHTML = '<option value="">Select a person</option>';
    currentEmailGraphData.nodes.forEach(p => {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = p.id;
      select.appendChild(option);
    });

    button.onclick = () => {
      currentPersonPersonFilter = select.value || null;
      currentPersonPersonMinWeight = parseInt(weightInput.value) || 1;
      applyEmailFilters();
    };
  }

  function applyEmailFilters() {
    let nodes = [...currentEmailGraphData.nodes];
    let links = [...currentEmailGraphData.links];

    if (currentPersonPersonFilter) {
      links = links.filter(l => l.source === currentPersonPersonFilter || l.target === currentPersonPersonFilter);
    }

    if (currentPersonPersonMinWeight > 1) {
      links = links.filter(l => l.weight >= currentPersonPersonMinWeight);
    }

    const connectedIds = new Set(links.flatMap(l => [l.source, l.target]));
    nodes = nodes.filter(n => connectedIds.has(n.id));

    Visualization.render({ nodes, links });
  }

  function showError(msg) {
    const el = document.getElementById("errorMessage");
    if (el) {
      el.textContent = `Error: ${msg}`;
      el.style.display = "block";
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
