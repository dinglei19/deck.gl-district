import { Layer, project } from '@deck.gl/core';
import { Model, Geometry } from '@luma.gl/engine';
import { Texture2D } from '@luma.gl/webgl';
import GL from '@luma.gl/constants';
import vs from './image-layer-vertext.glsl';
import fs from './image-layer-fragment.glsl';

export default class ImageLayer extends Layer {
  getShaders() {
    return super.getShaders({
      vs,
      fs,
      modules: [project]
    });
  }

  initializeState() {
    
  }

  draw() {
    const { model, show = true } = this.state;
    if (show) {
      model.draw();
    }
  }

  updateState({ props, oldProps, changeFlags }) {
    super.updateState({ props, oldProps, changeFlags });
    if (changeFlags.extensionsChanged) {
      const { gl } = this.context;
      this.setState({ model: this._getModel(gl) });
      this.getAttributeManager().invalidateAll();
    }
  }

  _getModel(gl) {
    const {
      texture,
      coordinates = [45.00, 65.0, 165.00, 65.0, 165.0, 0.0, 45.0, 0.0]
    } = this.props;
    const textureTmp = new Texture2D(gl, {
      data: texture,
      parameters: {
        [GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
        [GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
        [GL.TEXTURE_WRAP_S]: GL.REPEAT,
        [GL.TEXTURE_WRAP_T]: GL.REPEAT
      },
      pixelStore: {
        [GL.UNPACK_FLIP_Y_WEBGL]: true
      },
      mipmaps: true
    });
    return new Model(gl, ({
      ...this.getShaders(),
      geometry: new Geometry({
        indices: { size: 1, value: new Uint16Array([0, 1, 2, 2, 3, 0]) },
        attributes: {
          positions: {
            size: 2,
            value: new Float32Array(coordinates)
          },
          uv: {
            size: 2,
            value: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1])
          }
        }
      }),
      uniforms: {
        texture: textureTmp
      }
    }));
  }
}

ImageLayer.layerName = 'ImageLayer';
