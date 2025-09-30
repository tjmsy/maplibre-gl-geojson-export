import UIManager from "./UIManager.js";

class GeoJsonExport {
  constructor() {
    this.map = null;
    this.selectedLayers = new Set();
    this.uiManager = new UIManager(this);
  }

  collectLayers() {
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

  getFeatures() {
    let allFeatures = [];
    this.selectedLayers.forEach(({ source, sourceLayer }) => {
      const features = this.map.querySourceFeatures(source, { sourceLayer });
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
        })
      );
    });
    return { type: "FeatureCollection", features: allFeatures };
  }

  downloadGeoJSON(data, filename) {
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

  onAdd(map) {
    this.map = map;
    this.container = this.uiManager.createUI(this.map);
    return this.container;
  }

  onRemove() {
    this.container.remove();
    this.container = null;
    this.map = null;
  }
}

export default GeoJsonExport;