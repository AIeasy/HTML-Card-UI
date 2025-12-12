const fallback = {
  columns: [{ key: "status", label: "Status" }],
  rows: [{ status: "UI loaded correctly" }]
};
let originalData = fallback;
let filteredRows = fallback.rows;
let activeFilters = {};
let selectedCard = null;  // Track selected card

// Columns that support inline filtering - use the KEY not the label
const FILTERABLE_COLUMNS = {
  risk_rank: "Risk Rank",
  impact: "Impact",
  probability: "Probability"
};

function getUniqueValues(rows, key) {
  const values = rows.map(r => r[key]).filter(Boolean);
  console.log(`Unique values for ${key}:`, [...new Set(values)]);
  return [...new Set(values)];
}

function applyFilters() {
  filteredRows = originalData.rows.filter(row =>
    Object.entries(activeFilters).every(
      ([key, value]) => !value || row[key] === value
    )
  );
  console.log("Filtered rows:", filteredRows.length);
  selectedCard = null;  // Clear selection when filtering
  renderCards();
}

function selectCard(row, cardElement) {
  // Deselect previous card
  if (selectedCard) {
    selectedCard.element.style.border = "1px solid #e5e7eb";
    const oldButton = selectedCard.element.querySelector('.source-button');
    if (oldButton) oldButton.remove();
  }
  
  // Select new card
  selectedCard = { row, element: cardElement };
  cardElement.style.border = "2px solid #3b82f6";
  
  // Add "Trace Source" button
  const sourceButton = document.createElement("button");
  sourceButton.className = "source-button";
  sourceButton.textContent = "🔍 Trace Source";
  sourceButton.style.cssText = `
    margin-top: 12px;
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    width: 100%;
    transition: background 0.2s ease;
  `;
  
  sourceButton.onmouseenter = () => {
    sourceButton.style.background = "#2563eb";
  };
  sourceButton.onmouseleave = () => {
    sourceButton.style.background = "#3b82f6";
  };
  
  sourceButton.onclick = (e) => {
    e.stopPropagation();
    traceSource(row);
  };
  
  cardElement.appendChild(sourceButton);
}

function traceSource(row) {
  console.log("Tracing source for:", row);
  
  // Create user-facing summary
  const summary = createSourceSummary(row);
  
  // Create machine-readable payload for LLM
  const llmPayload = {
    action: "trace_source",
    card_data: row,
    request: "Please find the page number or source document reference for this risk item."
  };
  
  // Send message to parent
  window.parent.postMessage(
    {
      type: "ui_component_user_message",
      message: 'User-facing summary from your UI component',
      llmMessage: JSON.stringify({ /* optional machine-readable payload */ })
    },
    window.origin === "null" ? "*" : window.origin
  );
  
  console.log("Source trace request sent:", {
    message: summary,
    llmPayload: llmPayload
  });
}

function createSourceSummary(row) {
  // Build a human-readable summary from the card data
  const parts = [];
  
  originalData.columns.forEach(col => {
    const value = row[col.key];
    if (value && value !== "—") {
      parts.push(`${col.label}: ${value}`);
    }
  });
  
  return `Find source for: ${parts.join(", ")}`;
}

function renderControls() {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";
  
  // Check which filterable columns exist in the actual data
  const availableFilters = Object.keys(FILTERABLE_COLUMNS).filter(key =>
    originalData.columns.some(col => col.key === key)
  );
  
  console.log("Available filters:", availableFilters);
  
  if (availableFilters.length === 0) return;
  
  availableFilters.forEach(filterKey => {
    const filterGroup = document.createElement("span");
    filterGroup.style.marginRight = "16px";
    
    const labelEl = document.createElement("label");
    labelEl.textContent = FILTERABLE_COLUMNS[filterKey] + ": ";
    
    const select = document.createElement("select");
    const uniqueValues = getUniqueValues(originalData.rows, filterKey);
    select.innerHTML = `
      <option value="">All</option>
      ${uniqueValues
        .map(v => `<option value="${v}">${v}</option>`)
        .join("")}
    `;
    select.value = activeFilters[filterKey] || "";
    select.onchange = () => {
      activeFilters[filterKey] = select.value;
      applyFilters();
    };
    
    filterGroup.appendChild(labelEl);
    filterGroup.appendChild(select);
    controls.appendChild(filterGroup);
  });
}

function renderCards() {
  console.log("renderCards called");
  console.log("Filtered rows count:", filteredRows.length);
  
  const root = document.getElementById("root");
  if (!root) {
    console.error("Root element not found!");
    return;
  }
  
  root.innerHTML = "";
  
  if (filteredRows.length === 0) {
    root.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">No data to display</div>';
    return;
  }
  
  // Create grid container
  const grid = document.createElement("div");
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
    padding: 8px;
  `;
  
  filteredRows.forEach((row, rowIndex) => {
    console.log(`Rendering card ${rowIndex}:`, row);
    
    const card = document.createElement("div");
    card.style.cssText = `
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      cursor: pointer;
    `;
    
    // Add hover effect
    card.onmouseenter = () => {
      if (selectedCard?.element !== card) {
        card.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
        card.style.transform = "translateY(-2px)";
      }
    };
    card.onmouseleave = () => {
      if (selectedCard?.element !== card) {
        card.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
        card.style.transform = "translateY(0)";
      }
    };
    
    // Add click handler for card selection
    card.onclick = () => {
      selectCard(row, card);
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
        word-wrap: break-word;
      `;
      
      // USE THE KEY to access row data
      const value = row[col.key];
      console.log(`  ${col.label} (${col.key}):`, value);
      fieldValue.textContent = value ?? "—";
      
      field.appendChild(fieldLabel);
      field.appendChild(fieldValue);
      card.appendChild(field);
    });
    
    grid.appendChild(card);
  });
  
  root.appendChild(grid);
  console.log("Cards rendered successfully");
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
  
  if (payload.rows.length === 0) {
    console.warn("Payload has no rows");
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
  console.log(`  ${payload.columns.length} columns`);
  console.log(`  ${payload.rows.length} rows`);
  
  return true;
}

/* ---------- INITIAL ---------- */
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, rendering fallback data");
  renderCards();
});

/* ---------- RECEIVE PAYLOAD ---------- */
window.addEventListener("message", (event) => {
  console.log("Raw message received:", event.data);
  
  let data = event.data;
  
  // Handle wrapped format
  if (data?.type === "ui_component_render_card_dropdown" && data?.source === "agentos") {
    console.log("Detected card_dropdown format from agentos");
    data = data.payload;
  } else if (data?.type === "ui_component_render" && data?.source === "agentos") {
    console.log("Detected standard render format from agentos");
    data = data.payload;
  }
  
  // Validate and process
  if (data?.columns && data?.rows) {
    console.log("Processing data with columns and rows");
    
    if (validatePayload(data)) {
      originalData = data;
      filteredRows = data.rows;
      activeFilters = {};
      selectedCard = null;  // Clear selection on new data
      console.log("Data updated successfully, rendering cards");
      console.log("Columns:", originalData.columns);
      console.log("Rows sample:", originalData.rows[0]);
      renderCards();
    }
  } else {
    console.warn("Message format not recognized or missing columns/rows");
  }
});

// Expose a test function to window for debugging
window.loadData = function(data) {
  console.log("loadData called with:", data);
  window.postMessage(data, "*");
};

console.log("render.js loaded successfully");
