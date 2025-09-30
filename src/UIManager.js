class UIManager {
  constructor(controller) {
    this.controller = controller;
  }

  createUI(map) {
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const group = document.createElement("div");
    group.style.position = "relative";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.textContent = "📑";
    group.appendChild(toggleBtn);

    const panel = this.createPanel(map);
    group.appendChild(panel);

    toggleBtn.addEventListener("click", () => {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    container.appendChild(group);
    return container;
  }

  createPanel(map) {
    const panel = document.createElement("div");
    Object.assign(panel.style, {
      display: "none",
      top: "100%",
      right: "0",
      background: "white",
      padding: "6px",
      border: "1px solid #ccc",
      borderRadius: "4px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      maxHeight: "250px",
      overflowY: "auto",
      minWidth: "180px",
    });

    const layers = this.controller.collectLayers();
    layers.forEach((layerInfo) => {
      const id = `${layerInfo.source}-${layerInfo.sourceLayer}`;
      const label = document.createElement("label");
      label.style.display = "block";
      label.style.fontSize = "12px";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = id;
      checkbox.checked = true;
      this.controller.selectedLayers.add(layerInfo);

      checkbox.addEventListener("change", (e) => {
        const style = map.getStyle();
        const relevantLayers = style.layers.filter(
          (l) =>
            l.source === layerInfo.source &&
            l["source-layer"] === layerInfo.sourceLayer
        );

        relevantLayers.forEach((l) =>
          map.setLayoutProperty(
            l.id,
            "visibility",
            e.target.checked ? "visible" : "none"
          )
        );

        if (e.target.checked) {
          this.controller.selectedLayers.add(layerInfo);
        } else {
          this.controller.selectedLayers.delete(layerInfo);
        }
      });

      label.appendChild(checkbox);
      label.appendChild(
        document.createTextNode(`${layerInfo.source}:${layerInfo.sourceLayer}`)
      );
      panel.appendChild(label);
    });

    const exportBtn = this.createExportButton();
    panel.appendChild(exportBtn);

    return panel;
  }

  createExportButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Export geoJSON";
    Object.assign(btn.style, {
      display: "block",
      marginTop: "8px",
      padding: "3px 3px",
      border: "1px solid #888",
      borderRadius: "4px",
      background: "#fff",
      cursor: "pointer",
      width: "auto",
      height: "auto",
      lineHeight: "normal",
    });

    btn.addEventListener("mouseover", () => {
      btn.style.background = "#f0f0f0";
    });
    btn.addEventListener("mouseout", () => {
      btn.style.background = "#fff";
    });

    btn.addEventListener("click", () => {
      const geoJSON = this.controller.getFeatures();
      this.controller.downloadGeoJSON(geoJSON, "exported_data.geojson");
    });

    return btn;
  }
}

export default UIManager;