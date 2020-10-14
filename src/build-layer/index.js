import {
  Layer, project32, gouraudLighting, picking, COORDINATE_SYSTEM
} from '@deck.gl/core';
import GL from '@luma.gl/constants';
import {
  Model, Geometry, hasFeature, FEATURES
} from '@luma.gl/core';
import { setParameters } from '@luma.gl/gltools';
import PolygonTesselator from './polygon-tesselator';

import getVertex from './build-layer-vertex.glsl';
import getFragment from './build-layer-fragment.glsl';

const DEFAULT_COLOR = [0, 0, 0, 255];
const defaultProps = {
  gradient: { type: 'array', value: [1, 1] },
  elevationScale: { type: 'number', min: 0, value: 1 },
  getPolygon: { type: 'accessor', value: (f) => f.polygon },
  // Accessor for extrusion height
  getElevation: { type: 'accessor', value: 1000 },
  // Accessor for colors
  getFillColor: { type: 'accessor', value: DEFAULT_COLOR },
  material: true,
  opacity: { type: 'number', min: 0, value: 1 }
};

const ATTRIBUTE_TRANSITION = {
  enter: (value, chunk) => (chunk.length ? chunk.subarray(chunk.length - value.length) : value)
};

export default class BuildLayer extends Layer {
  getShaders(type) {
    return super.getShaders({
      vs: getVertex(type),
      fs: getFragment(),
      defines: {},
      modules: [project32, gouraudLighting, picking]
    });
  }

  initializeState() {
    const { gl, viewport } = this.context;
    let { coordinateSystem } = this.props;
    if (viewport.isGeospatial && coordinateSystem === COORDINATE_SYSTEM.DEFAULT) {
      coordinateSystem = COORDINATE_SYSTEM.LNGLAT;
    }
    this.setState({
      numInstances: 0,
      polygonTesselator: new PolygonTesselator({
        fp64: this.use64bitPositions(),
        IndexType: !gl || hasFeature(gl, FEATURES.ELEMENT_INDEX_UINT32) ? Uint32Array : Uint16Array
      })
    });

    const attributeManager = this.getAttributeManager();
    const noAlloc = true;

    attributeManager.remove(['instancePickingColors']);

    attributeManager.add({
      indices: {
        size: 1,
        isIndexed: true,
        update: this.calculateIndices,
        noAlloc
      },
      positions: {
        size: 3,
        type: GL.DOUBLE,
        fp64: this.use64bitPositions(),
        transition: ATTRIBUTE_TRANSITION,
        accessor: 'getPolygon',
        update: this.calculatePositions,
        noAlloc,
        shaderAttributes: {
          positions: {
            vertexOffset: 0,
            divisor: 0
          },
          instancePositions: {
            vertexOffset: 0,
            divisor: 1
          },
          nextPositions: {
            vertexOffset: 1,
            divisor: 1
          }
        }
      },
      vertexValid: {
        size: 1,
        divisor: 1,
        type: GL.UNSIGNED_BYTE,
        update: this.calculateVertexValid,
        noAlloc
      },
      elevations: {
        size: 1,
        transition: ATTRIBUTE_TRANSITION,
        accessor: 'getElevation',
        shaderAttributes: {
          elevations: {
            divisor: 0
          },
          instanceElevations: {
            divisor: 1
          }
        }
      },
      fillColors: {
        alias: 'colors',
        size: this.props.colorFormat.length,
        type: GL.UNSIGNED_BYTE,
        normalized: true,
        transition: ATTRIBUTE_TRANSITION,
        accessor: 'getFillColor',
        defaultValue: DEFAULT_COLOR,
        shaderAttributes: {
          fillColors: {
            divisor: 0
          },
          instanceFillColors: {
            divisor: 1
          }
        }
      },
      pickingColors: {
        size: 3,
        type: GL.UNSIGNED_BYTE,
        accessor: (object, { index, target: value }) => this.encodePickingColor(
          object && object.__source ? object.__source.index : index, value
        ),
        shaderAttributes: {
          pickingColors: {
            divisor: 0
          },
          instancePickingColors: {
            divisor: 1
          }
        }
      }
    });
  }

  getPickingInfo(params) {
    const info = super.getPickingInfo(params);
    const { object, index } = info;

    if (object && object.__source) {
      // data is wrapped
      info.object = this.props.data.find((d) => d.__source.index === index);
    }
    return info;
  }

  draw({ uniforms }) {
    const { elevationScale } = this.props;
    const {
      topModel, sideModel, polygonTesselator, show = true
    } = this.state;
    const { gl } = this.context;
    const renderUniforms = { ...uniforms, elevationScale };

    setParameters(gl, {
      [gl.CULL_FACE]: true,
      [gl.CULL_FACE_MODE]: GL.FRONT
    });
    // Note: the order is important
    if (sideModel && show) {
      sideModel.setInstanceCount(polygonTesselator.instanceCount - 1);
      sideModel.setUniforms(renderUniforms).draw();
    }
    setParameters(gl, {
      [gl.CULL_FACE_MODE]: GL.BACK
    });
    if (topModel && show) {
      topModel.setVertexCount(polygonTesselator.vertexCount);
      topModel.setUniforms(renderUniforms).draw();
    }

    setParameters(gl, {
      [gl.CULL_FACE]: false
    });
  }

  updateState(updateParams) {
    super.updateState(updateParams);

    this.updateGeometry(updateParams);

    const { props, oldProps, changeFlags } = updateParams;
    const attributeManager = this.getAttributeManager();

    const regenerateModels = changeFlags.extensionsChanged
            || props.filled !== oldProps.filled
            || props.extruded !== oldProps.extruded;

    if (regenerateModels) {
      if (this.state.models) {
        this.state.models.forEach((model) => model.delete());
      }

      this.setState(this._getModels(this.context.gl));
      attributeManager.invalidateAll();
    }
  }

  updateGeometry({ props, changeFlags }) {
    const geometryConfigChanged = changeFlags.dataChanged
            || (changeFlags.updateTriggersChanged
            && (
              changeFlags.updateTriggersChanged.all
                || changeFlags.updateTriggersChanged.getPolygon
            ));

    // When the geometry config  or the data is changed,
    // tessellator needs to be invoked
    if (geometryConfigChanged) {
      const { polygonTesselator } = this.state;
      const buffers = props.data.attributes || {};
      polygonTesselator.updateGeometry({
        data: props.data,
        normalize: props._normalize,
        geometryBuffer: buffers.getPolygon,
        buffers,
        getGeometry: props.getPolygon,
        positionFormat: props.positionFormat,
        fp64: this.use64bitPositions(),
        dataChanged: changeFlags.dataChanged
      });

      this.setState({
        numInstances: polygonTesselator.instanceCount,
        startIndices: polygonTesselator.vertexStarts
      });

      if (!changeFlags.dataChanged) {
        this.getAttributeManager().invalidateAll();
      }
    }
  }

  _getModels(gl) {
    const { id, gradient, opacity } = this.props;

    const sideShaders = this.getShaders('side');
    const sideModel = new Model(
      gl,
      ({
        ...sideShaders,
        id: `${id}-side`,
        geometry: new Geometry({
          drawMode: GL.TRIANGLE_FAN,
          attributes: {
            // top right - top left - bootom left - bottom right
            vertexPositions: {
              size: 2,
              value: new Float32Array([1, 1, 0, 1, 0, 0, 1, 0])
            }
          }
        }),
        uniforms: {
          gradient
        },
        instanceCount: 0,
        isInstanced: 1
      })
    );

    const topShaders = this.getShaders('top');
    const topModel = new Model(
      gl,
      ({
        ...topShaders,
        id: `${id}-top`,
        drawMode: GL.TRIANGLES,
        attributes: {
          vertexPositions: new Float32Array([0, 1])
        },
        uniforms: {
          gradient,
          opacity
        },
        isIndexed: true
      })
    );

    sideModel.userData.excludeAttributes = { indices: true };
    return {
      models: [sideModel, topModel],
      topModel,
      sideModel
    };
  }

  calculateIndices(attribute) {
    const { polygonTesselator } = this.state;
    attribute.startIndices = polygonTesselator.indexStarts;
    attribute.value = polygonTesselator.get('indices');
  }

  calculatePositions(attribute) {
    const { polygonTesselator } = this.state;
    attribute.startIndices = polygonTesselator.vertexStarts;
    attribute.value = polygonTesselator.get('positions');
  }

  calculateVertexValid(attribute) {
    attribute.value = this.state.polygonTesselator.get('vertexValid');
  }
}

BuildLayer.layerName = 'BuildLayer';
BuildLayer.defaultProps = defaultProps;
