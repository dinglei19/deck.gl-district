
import React from 'react';
import DeckGL from '@deck.gl/react';
import {DistrictLayer} from 'deck.gl-district';

const INITIAL_VIEW_STATE = {
  longitude: 118.77798864229574,
  latitude: 32.038717810344934,
  zoom: 9,
  pitch: 45,
  bearing: 45
};

const data = [
  {
    adcode: '320102',
    value: 5000
  },{
    adcode: '320104',
    value: 6000
  },{
    adcode: '320105',
    value: 7000
  }
]
document.oncontextmenu = () => {
  return false
}

export default () => {
  
  const layers = [
    new DistrictLayer({
      id: 'district-layer',
      url: ['http://119.45.14.184:8080/public/320100_full.json', 'http://119.45.14.184:8080/public/320100.json'],
      data: data,
      joinBy: ['adcode', 'adcode'],
      texture: 'http://119.45.14.184:8080/public/grid.png',
      coordinates: [113, 34, 123,34, 123, 30, 113,30],
      getHeight:(d) => {
        return d.data ? d.data.value : 4000
      },
      getFillColor: d => {
        return d.data ? [87, 63, 127] : [14, 63, 127]
      },
      pickable: true,
      autoHighlight: true,
      highlightColor: [73,253,254,122],
      opacity: 0.4,
      gradient: [0.2, 0.9],
      outlineWidth: 200,
      outlineHeght: 4030,
      outlineColor: [73,253,254],
      inlineWidth: 150,
      inlineColor: [9,104,162]
    })
  ];

  return <div style={{
    height: '800px',
    position: 'relative',
    background: '#032148'
  }}>
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      layers={layers} />
  </div>;
}