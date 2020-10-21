
---
title: 快速开始
order: 4
---

deck.gl Layer，三维行政区划地图， 支持边界颜色自定义，高度自定义，颜色自定义

## 使用
**using modules**

```javascript
import { DistrictLayer } from 'deck.gl-district';
```

## 构造函数

参数：
- id `String` layerId唯一值
- url `Array` 行政区划数据地址 `url[0]`行政区划数据 `url[1]`区划边界数据（可以不存在）
- data `Array` 传入数据，可以根据`joinBy`字段和行政区划数据进行合并
- joinBy `Array [string, string]` 第一个值为空间数据字段，第二个为传入数据字段名
- pickable `Boolean` 是否可以点击 r,g,b 值范围0-255
- autoHighlight `Boolean` 是否hover高亮（必须pickable为true）
- highlightColor `Array` 高亮颜色
- texture `String` 底图图片（可以不存在）
- coordinates `Array` [左上， 右上，右下，左下]经纬度  底图图片覆盖的位置 
- getHeight `(Function, optional)` 该方法用于根据optional计算区划的高度
- getFillColor `(Function, optional)` 该方法用于根据optional计算区划的颜色
- opacity `Number` 透明度（顶部透明度）
- gradient `Array [Number, Number]` 侧边透明度， `gradient[0]`最底部，`gradient[1]`最顶部 
- outlineWidth `Number` 边界边框宽度
- outlineHeight `Number` 边界边框高度
- outlineColor `Array` 边界边框颜色 r,g,b 值范围0-255
- inlineWidth `Number` 内区划线宽度
- inlineColor `Number` 内区划线颜色 r,g,b 值范围0-255
- onClick `(Function, optional)` 点击回调方法（必须pickable为true）
- onHover `(Function, optional)` hover回调方法（必须pickable为true）


## 案例
<code src="./examples/district.jsx">