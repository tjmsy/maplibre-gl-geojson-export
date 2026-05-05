class GeoJsonExportControl {
  constructor() {
    this.map = null;

    // state
    this.selectedLayers = new Set();

    // ui refs
    this.container = null;
    this.panel = null;
    this.toggleBtn = null;

    // event management
    this._panelDisposers = [];

    // bind
    this._onToggle = this._onToggle.bind(this);
  }

  // -------------------------
  // MapLibre lifecycle
  // -------------------------

  onAdd(map) {
    this.map = map;
    this.container = this._createUI();
    return this.container;
  }

  onRemove() {
    this._disposePanelEvents();

    this.toggleBtn?.removeEventListener("click", this._onToggle); 

    this.container?.remove();
    this.container = null;
    this.panel = null;
    this.map = null;
  }

  // -------------------------
  // UI
  // -------------------------

  _createUI() {
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const group = document.createElement("div");

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.textContent = "📑";
    toggleBtn.addEventListener("click", this._onToggle);
    this.toggleBtn = toggleBtn;

    const panel = this._createPanel();
    this.panel = panel;

    group.appendChild(toggleBtn);
    group.appendChild(panel);
    container.appendChild(group);

    return container;
  }

  _createPanel() {
    const panel = document.createElement("div");

    Object.assign(panel.style, {
      display: "none",
      background: "white",
      padding: "6px",
      border: "1px solid #ccc",
      borderRadius: "4px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      maxHeight: "250px",
      overflowY: "auto",
      minWidth: "180px",
      marginTop: "4px",
    });

    return panel;
  }

  // -------------------------
  // Toggle / Close
  // -------------------------

  _onToggle(e) {
    const isOpen = this.panel.style.display === "block";

    if (isOpen) {
      this._closePanel();
      return;
    }

    this._rebuildPanel();
    this.panel.style.display = "block";

    setTimeout(() => {
      const onDocClick = (ev) => {
        if (!this.container.contains(ev.target)) {
          this._closePanel();
        }
      };

      document.addEventListener("click", onDocClick);

      this._panelDisposers.push(() => {
        document.removeEventListener("click", onDocClick);
      });
    }, 0);
  }

  _closePanel() {
    this.panel.style.display = "none";
    this._disposePanelEvents();
  }

  // -------------------------
  // Panel build
  // -------------------------

  _rebuildPanel() {
    this._disposePanelEvents();
    this.panel.innerHTML = "";
    this.selectedLayers.clear();

    this.panel.appendChild(this._createDescription());

    const layers = this._collectLayers();

    layers.forEach((layerInfo) => {
      const row = this._createLayerRow(layerInfo);
      this.panel.appendChild(row);
    });

    this.panel.appendChild(this._createExportButton());
  }

  _createLayerRow(layerInfo) {
    const label = document.createElement("label");
    label.style.display = "block";
    label.style.fontSize = "12px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    const isVisible = this._isLayerVisible(layerInfo);
    checkbox.checked = isVisible;

    if (isVisible) {
      this.selectedLayers.add(layerInfo);
    }

    const onChange = (e) => {
      this._toggleLayerVisibility(layerInfo, e.target.checked);
    };

    checkbox.addEventListener("change", onChange);

    this._panelDisposers.push(() => {
      checkbox.removeEventListener("change", onChange);
    });

    label.appendChild(checkbox);
    label.appendChild(
      document.createTextNode(`${layerInfo.source}:${layerInfo.sourceLayer}`),
    );

    return label;
  }

  _createDescription() {
    const desc = document.createElement("div");

    desc.textContent = "Select layers to show/hide. Visible layers will be exported";

    Object.assign(desc.style, {
      fontSize: "11px",
      color: "#555",
      marginBottom: "6px",
      lineHeight: "1.4",
    });

    return desc;
  }

  _createExportButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Export geoJSON";

    Object.assign(btn.style, {
      all: "unset",
      display: "block",
      marginTop: "8px",
      padding: "3px 6px",
      border: "1px solid #888",
      borderRadius: "4px",
      background: "#fff",
      cursor: "pointer",
      width: "auto",
      height: "auto",
      lineHeight: "normal",
      fontSize: "12px",
    });

    const onMouseOver = () => {
      btn.style.background = "#f0f0f0";
    };
    const onMouseOut = () => {
      btn.style.background = "#fff";
    };

    btn.addEventListener("mouseover", onMouseOver);
    btn.addEventListener("mouseout", onMouseOut);

    const onClick = () => {
      const geoJSON = this._getFeatures();
      this._downloadGeoJSON(geoJSON, "exported_data.geojson");
    };

    btn.addEventListener("click", onClick);

    this._panelDisposers.push(() => {
      btn.removeEventListener("click", onClick);
      btn.removeEventListener("mouseover", onMouseOver);
      btn.removeEventListener("mouseout", onMouseOut);
    });

    return btn;
  }

  // -------------------------
  // Map logic
  // -------------------------

  _collectLayers() {
    const style = this.map.getStyle();
    const seen = new Set();
    const layers = [];

    style.layers.forEach((layer) => {
      if (layer.source && layer["source-layer"]) {
        const key = `${layer.source}:${layer["source-layer"]}`;

        if (!seen.has(key)) {
          seen.add(key);
          layers.push({
            source: layer.source,
            sourceLayer: layer["source-layer"],
          });
        }
      }
    });

    return layers;
  }

  _isLayerVisible(layerInfo) {
    const style = this.map.getStyle();

    const relevantLayers = style.layers.filter(
      (l) =>
        l.source === layerInfo.source &&
        l["source-layer"] === layerInfo.sourceLayer,
    );

    if (relevantLayers.length === 0) return false;

    return relevantLayers.some((l) => {
      const v = this.map.getLayoutProperty(l.id, "visibility");
      return v !== "none";
    });
  }

  _toggleLayerVisibility(layerInfo, visible) {
    const style = this.map.getStyle();

    const relevantLayers = style.layers.filter(
      (l) =>
        l.source === layerInfo.source &&
        l["source-layer"] === layerInfo.sourceLayer,
    );

    relevantLayers.forEach((l) => {
      this.map.setLayoutProperty(
        l.id,
        "visibility",
        visible ? "visible" : "none",
      );
    });

    if (visible) {
      this.selectedLayers.add(layerInfo);
    } else {
      this.selectedLayers.delete(layerInfo);
    }
  }

  _getFeatures() {
    let allFeatures = [];

    this.selectedLayers.forEach(({ source, sourceLayer }) => {
      const features = this.map.querySourceFeatures(source, {
        sourceLayer,
      });

      allFeatures = allFeatures.concat(
        features.map((feature) => {
          const f = feature.toJSON();

          return {
            ...f,
            properties: {
              ...f.properties,
              _source: source,
              _sourceLayer: sourceLayer,
            },
          };
        }),
      );
    });

    return {
      type: "FeatureCollection",
      features: allFeatures,
    };
  }

  _downloadGeoJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  // -------------------------
  // Event cleanup
  // -------------------------

  _disposePanelEvents() {
    this._panelDisposers.forEach((dispose) => dispose());
    this._panelDisposers = [];
  }
}

export default GeoJsonExportControl;
