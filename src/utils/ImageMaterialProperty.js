/*
 * @Description:自定义materialProperty，参考了cesium源码
 * @Author: your name
 * @version:
 * @Date: 2024-07-22 15:17:54
 * @LastEditors: your name
 * @LastEditTime: 2024-07-22 15:35:00
 */
import * as Cesium from "cesium";

class ImageSelfMaterialProperty {
  constructor(color) {
    // 监听属性的变化事件
    this._definitionChanged = new Cesium.Event();
    this._color = undefined;
    this._colorSubscription = undefined;

    this.color = color;
  }

  get isConstant() {
    return false;
  }

  get definitionChanged() {
    return this._definitionChanged;
  }

  getType(time) {
    return Cesium.Material.ImageSelfMaterialType;
  }

  getValue(time, result) {
    if (!Cesium.defined(result)) {
      result = {};
    }

    result.color = Cesium.Property.getValueOrClonedDefault(
      this._color,
      time,
      Cesium.Color.WHITE,
      result.color
    );
    return result;
  }

  equals(other) {
    return (
      this === other || //
      (other instanceof ImageSelfMaterialProperty && //
        Cesium.Property.equals(this._color, other._color))
    );
  }
}

Object.defineProperties(ImageSelfMaterialProperty.prototype, {
  color: Cesium.createPropertyDescriptor("color"),
});

// 将材质放到cesium的材质引擎中

/**
 * Gets the name of the specular map material.
 * @type {string}
 * @readonly
 */
// Material is not extension
Cesium.Material.ImageSelfMaterialType = "ColoredImage";
Cesium.Material.GradientImg = "/src/assets/wallgradients.png";

Cesium.Material._materialCache.addMaterial(Cesium.Material.ImageSelfMaterialType, {
  fabric: {
    type: Cesium.Material.ImageSelfMaterialType,
    uniforms: {
      image: Cesium.Material.GradientImg,
      color: new Cesium.Color(1, 0, 0, 0.5),
    },
    source: /*glsl*/ `
        uniform vec4 color;
        uniform sampler2D image;
        czm_material czm_getMaterial(czm_materialInput materialInput)
        {
            czm_material m = czm_getDefaultMaterial(materialInput);
            // cesium会送给我们当前材质的uv坐标，也叫st
            vec2 st=materialInput.st;
            // 获取图片颜色
            vec4 textureCol=texture2D(image,st);
            m.diffuse=color.rgb;
            m.alpha=textureCol.a;
            return m;
        }
     `,
  },
  translucent: function (material) {
    return true;
  },
});

export default ImageSelfMaterialProperty;
