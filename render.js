const fallback = {
  columns: [{ key: "status", label: "Status" }],
  rows: [{ status: "UI loaded correctly" }]
};
let originalData = fallback;
let filteredRows = fallback.rows;
let activeFilters = {};

// Columns that support inline filtering
const FILTERABLE_COLUMNS = {
  risk_type: "Risk type",
  responsible_department: "Responsible Department"
};

function getUniqueValues(rows, key) {
  return [...new Set(rows.map(r => r[key]).filter(Boolean))];
}

function applyFilters() {
  filteredRows = originalData.rows.filter(row =>
    Object.entries(activeFilters).every(
      ([key, value]) => !value || row[key] === value
    )
  );
  renderCards();
}

function renderControls() {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";
  
  // Render filter dropdowns for filterable columns
  Object.entries(FILTERABLE_COLUMNS).forEach(([key, label]) => {
    const filterGroup = document.createElement("span");
    filterGroup.style.marginRight = "16px";
    
    const labelEl = document.createElement("label");
    labelEl.textContent = label + ": ";
    
    const select = document.createElement("select");
    select.innerHTML = `
      <option value="">All</option>
      ${getUniqueValues(originalData.rows, key)
        .map(v => `<option value="${v}">${v}</option>`)
        .join("")}
    `;
    select.value = activeFilters[key] || "";
    select.onchange = () => {
      activeFilters[key] = select.value;
      applyFilters();
    };
    
    filterGroup.appendChild(labelEl);
    filterGroup.appendChild(select);
    controls.appendChild(filterGroup);
  });
}

function renderCards() {
  const root = document.getElementById("root");
  root.innerHTML = "";
  
  // Create grid container
  const grid = document.createElement("div");
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
    padding: 8px;
  `;
  
  filteredRows.forEach(row => {
    const card = document.createElement("div");
    card.style.cssText = `
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    `;
    
    // Add hover effect
    card.onmouseenter = () => {
      card.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
      card.style.transform = "translateY(-2px)";
    };
    card.onmouseleave = () => {
      card.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
      card.style.transform = "translateY(0)";
    };
    
    originalData.columns.forEach((col, index) => {
      const field = document.createElement("div");
      field.style.cssText = `
        margin-bottom: ${index === originalData.columns.length - 1 ? '0' : '12px'};
      `;
      
      const fieldLabel = document.createElement("div");
      fieldLabel.style.cssText = `
        font-size: 11px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      `;
      fieldLabel.textContent = col.label;
      
      const fieldValue = document.createElement("div");
      fieldValue.style.cssText = `
        font-size: 14px;
        color: #111827;
        line-height: 1.4;
      `;
      fieldValue.textContent = row[col.key] ?? "—";
      
      field.appendChild(fieldLabel);
      field.appendChild(fieldValue);
      card.appendChild(field);
    });
    
    grid.appendChild(card);
  });
  
  root.appendChild(grid);
  renderControls();
}

function validatePayload(payload) {
  console.log("Validating payload:", payload);
  
  if (!payload || typeof payload !== 'object') {
    console.error("Invalid payload: not an object");
    return false;
  }
  
  if (!Array.isArray(payload.columns)) {
    console.error("Invalid payload: columns is not an array");
    return false;
  }
  
  if (!Array.isArray(payload.rows)) {
    console.error("Invalid payload: rows is not an array");
    return false;
  }
  
  // Validate columns structure
  for (let i = 0; i < payload.columns.length; i++) {
    const col = payload.columns[i];
    if (!col.key || typeof col.key !== 'string') {
      console.error(`Invalid column at index ${i}: missing or invalid 'key'`);
      return false;
    }
    if (!col.label || typeof col.label !== 'string') {
      console.error(`Invalid column at index ${i}: missing or invalid 'label'`);
      return false;
    }
  }
  
  console.log("Payload validation successful");
  return true;
}

/* ---------- INITIAL ---------- */
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, rendering fallback data");
  renderCards();
});

/* ---------- RECEIVE PAYLOAD ---------- */
window.addEventListener("message", (event) => {
  console.log("Message received:", event.data);
  
  const data = event.data;
  
  // Check if it's the old format with type/source wrapper
  if (data?.type === "ui_component_render" && data?.source === "agentos") {
    console.log("Detected wrapped format (type/source)");
    if (validatePayload(data.payload)) {
      originalData = data.payload;
      filteredRows = data.payload.rows;
      activeFilters = {};
      console.log("Data updated from wrapped format");
      renderCards();
    }
  } 
  // Check if it's the direct schema format
  else if (data?.columns && data?.rows) {
    console.log("Detected direct schema format");
    if (validatePayload(data)) {
      originalData = data;
      filteredRows = data.rows;
      activeFilters = {};
      console.log("Data updated from direct schema");
      renderCards();
    }
  } else {
    console.warn("Message format not recognized");
  }
});

// Expose a test function to window for debugging
window.loadData = function(data) {
  console.log("loadData called with:", data);
  window.postMessage(data, "*");
};

console.log("render.js loaded successfully");
