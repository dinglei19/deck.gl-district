import { CompositeLayer } from '@deck.gl/core';
import { load } from '@loaders.gl/core';
import { JSONLoader } from '@loaders.gl/json';
import BuildLayer from '../build-layer/index';
import PathLayer from '../path-layer/path-layer';
import TextLayer from '../text-layer/text-layer';
import ImageLayer from '../image-layer/index';

import { getGeojsonFeatures, separateGeojsonFeatures } from './geojson';

const defaultLineColor = [0, 0, 0, 255];
const defaultFillColor = [0, 0, 0, 255];

const defaultProps = {
  // Text properties
  fontFamily: 'Monaco, monospace',

  fontWeight: 'normal',
  // Text accessors
  getText: { type: 'accessor', value: (x) => x.text },
  getTextSize: { type: 'accessor', value: 12 },
  getTextColor: { type: 'accessor', value: [0, 0, 0, 255] },
  // fill
  getFillColor: { type: 'accessor', value: defaultFillColor },
  elevationScale: 1,
  getElevation: { type: 'accessor', value: 0 },
  gradient: [1, 1],
  // outline
  lineWidthUnits: 'meters',
  outline: true,
  outlineWidth: 1,
  outlineColor: defaultLineColor,
  outlineHeght: 0,
  // inline
  inline: true,
  inlineWidth: 1,
  inlineColor: defaultLineColor,
  // Shared accessors
  getPosition: { type: 'accessor', value: (x) => x.position }
};

function getCoordinates(f) {
  return f.geometry.coordinates;
}

function getPath(f) {
  return f.geometry.coordinates[0];
}

export default class DistrictLayer extends CompositeLayer {
  initializeState() {
    this.state = {
      districtFeature: [],
      districtFullFeature: [],
      textFeature: []
    };
  }

  updateState({ props, changeFlags }) {
    if (!changeFlags.dataChanged) {
      return;
    }
    const { url = [] } = props;
    const loads = [];
    if (Array.isArray(url)) {
      url.map((urlitem) => {
        loads.push(load(urlitem, JSONLoader));
      });
      Promise.all(loads).then((geojsonArray) => {
        this.handleGeometry(geojsonArray);
      });
    }
  }

  handleGeometry(geojsonArray = []) {
    if (geojsonArray.length > 0) {
      const wrapFeature = this.getSubLayerRow.bind(this);
      const districtFeature = separateGeojsonFeatures(
        getGeojsonFeatures(geojsonArray[1]), wrapFeature
      ).polygonFeatures;
      let districtFullFeature = [];
      const textFeature = [];
      const adcodes = [];
      if (geojsonArray.length === 2) {
        this.mergeData(geojsonArray[0]);
        districtFullFeature = separateGeojsonFeatures(
          getGeojsonFeatures(geojsonArray[0]), wrapFeature
        ).polygonFeatures;
      }
      if (districtFullFeature.length > 0) {
        districtFullFeature.forEach((item) => {
          // eslint-disable-next-line no-underscore-dangle
          const { adcode } = item.__source.object.properties;
          if (adcodes.indexOf(adcode) === -1) {
            adcodes.push(adcode);
            textFeature.push({
              center: item.__source.object.properties.center,
              name: item.__source.object.properties.name,
              data: item.__source.object.properties.data
            });
          }
        });
      }

      this.setState({
        districtFeature,
        districtFullFeature,
        textFeature
      });
    }
  }

  mergeData(FeatureCollection) {
    const { data = [], joinBy = ['adcode', 'adcode'] } = this.props;
    const joinByFirst = [];
    data.map((item) => {
      if (item[joinBy[1]]) joinByFirst.push(item[joinBy[1]]);
    });
    FeatureCollection.features.map((item) => {
      const result = this.findDataItem(data, joinBy, item.properties[joinBy[0]]);
      if (result) {
        item.properties.data = result;
      }
    });
  }

  findDataItem(data, joinBy, field) {
    let result = false;
    data.map((item) => {
      if (`${item[joinBy[1]]}` === `${field}`) result = item;
    });
    return result;
  }

  renderLayers() {
    const { districtFeature, districtFullFeature, textFeature } = this.state;
    const {
      getFillColor,
      gradient,
      texture,
      coordinates,
      getHeight,
      outline,
      outlineWidth,
      outlineColor,
      outlineHeght,
      inline,
      inlineColor,
      inlineWidth,
      opacity
    } = this.props;

    const imageLayer = texture && new ImageLayer({
      id: `${this.props.id}-background`,
      pickable: false,
      texture,
      coordinates
    });
    const buildLayer = new BuildLayer(this.getSubLayerProps({
      id: `${this.props.id}-extrued`,
      data: districtFullFeature,
      getPolygon: getCoordinates,
      getElevation: (d) => getHeight(d.__source.object.properties),
      getFillColor: (d) => getFillColor(d.__source.object.properties),
      opacity,
      gradient
    }));
    const inlinePathLayer = inline && new PathLayer(this.getSubLayerProps({
      id: `${this.props.id}-inlinepath`,
      data: districtFullFeature,
      widthUnits: 'meters',
      pickable: false,
      rounded: true,
      getPath,
      getHeight: (d) => getHeight(d.__source.object.properties) * 1.005,
      getColor: inlineColor,
      opacity: 1,
      getWidth: inlineWidth
    }));
    const outlinePathLayer = outline && new PathLayer(this.getSubLayerProps({
      id: `${this.props.id}-outlinepath`,
      data: districtFeature,
      pickable: false,
      widthUnits: 'meters',
      rounded: true,
      getPath,
      getHeight: outlineHeght,
      getColor: outlineColor,
      opacity: 1,
      getWidth: outlineWidth
    }));
    
    const textLayer = new TextLayer(this.getSubLayerProps({
      id: `${this.props.id}-text`,
      data: textFeature,
      pickable: false,
      sizeScale: 30,
      sizeUnits: 'meters',
      getPosition: (d) => [d.center[0], d.center[1], getHeight(d) * 1.005],
      getText: (d) => d.name,
      getColor: [255, 255, 255],
      getSize: 80,
      billboard: false,
      opacity: 1,
      fontWeight: 'bold',
      fontFamily: 'Monaco, monospace'
    }));

    return [
      imageLayer,
      buildLayer,
      inlinePathLayer,
      outlinePathLayer,
      textLayer
    ];
  }
}

DistrictLayer.defaultProps = defaultProps;
DistrictLayer.layerName = 'DistrictLayer';
