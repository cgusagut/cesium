/*
 * @Description:
 * @Author: your name
 * @version:
 * @Date: 2024-07-22 09:36:04
 * @LastEditors: your name
 * @LastEditTime: 2024-07-22 11:08:21
 */
import * as Cesium from "cesium";
import { createViewer } from "./utils";
import PositionStatusBar from "./utils/positionStatusBar";
import { addTile3D, addBaseMap, renderCustomShader } from "./utils/sceneMange";
import shader from "./shader";
import ImageBasedLighting from "cesium/Source/Scene/ImageBasedLighting";
import * as dat from "dat.gui";
import ImageSelfMaterialProperty from "./utils/ImageMaterialProperty";

const { nightShader, movingRingShader, reflectImgFs, polylineShader } = shader;
// 注册Cesium ION的token,然后就可以使用Cesium ION的资产了
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3ODAzN2EzOS1kZDMzLTQ5Y2UtYjYxMi1jMzQxNTdiMTUzN2IiLCJpZCI6NDU5NDIsImlhdCI6MTYxNTYyNDQyOX0.BucgmI6OJ-7ixj7rcQ_Qyg45DkvdHmaLrFwyMYitLcI";

// 初始化Cesium入口对象viewer
const viewer = createViewer();

new PositionStatusBar(viewer);
addBaseMap(viewer);

let tilesetOuter;
addTile3D(
  viewer,
  "http://localhost:8888/3dtiles/3dtiles/tileset.json",
  (tileset) => {
    tilesetOuter = tileset;
    // 添加customShader效果
    renderCustomShader(tileset, reflectImgFs);
  }
);
// 自定义光锥
const addCone = () => {
  // 构造geometry
  const cylinderGeometry = new Cesium.CylinderGeometry({
    length: 3000,
    topRadius: 0,
    bottomRadius: 1000,
  });
  const position = new Cesium.Cartesian3.fromDegrees(121.58, 31.236);
  // 从坐标处构造模型矩阵,为什么要将这个图元向上提升一半的高度?
  // 光锥的中心在高度的一半
  const modelMaytrix = Cesium.Matrix4.multiplyByTranslation(
    Cesium.Transforms.eastNorthUpToFixedFrame(position),
    new Cesium.Cartesian3(0, 0, 1500),
    new Cesium.Matrix4()
  );
  const coneInstance = new Cesium.GeometryInstance({
    geometry: cylinderGeometry,
    modelMatrix: modelMaytrix,
  });

  const appearance = new Cesium.MaterialAppearance({
    material: new Cesium.Material({
      fabric: {
        type: "coneMaterial",
        uniforms: {
          color: new Cesium.Color.fromCssColorString("#007acc"),
          color1: new Cesium.Color.fromCssColorString("#FF0000"),
        },
        source: /*glsl*/ `
                 uniform vec4 color;  
                 uniform vec4 color1; 
            czm_material czm_getMaterial(czm_materialInput materialInput)
        {
            // 初始化默认材质
            czm_material material = czm_getDefaultMaterial(materialInput);
            // 获取纹理坐标   通常表示纹理坐标 (s, t)，对应于 UV 坐标系中的 (u, v)
            vec2 st = materialInput.st;
            // 计算时间变量  czm_frameNumber: 当前帧数，通常是一个整数值  fract(): 返回一个小数部分，这里用来计算一个周期性的变化，每 10 帧循环一次
            float time=fract(czm_frameNumber/10.0);
            // 计算 Alpha 透明度的变化  step(): 如果 time 大于等于 0.5，则返回 1.0；否则返回 0.0。
            float isAlpha= step(0.5,time);
            // 计算距离中心的距离  distance(): 计算纹理坐标 st 到点 (0.5, 0.5) 的欧几里得距离，即到图像中心的距离
            float dis = distance(st, vec2(0.5)); 
            // 设置材质属性
            // material.diffuse = color.rgb;
            if(isAlpha>=1.0){
                material.diffuse = color.rgb;
             }else{
                 material.diffuse = color1.rgb;
            }
            // 设置材质的漫反射颜色为 color 的 RGB 分量。
            if(isAlpha>=1.0){
                material.alpha = color.a * dis *2.0;
             }else{
                 material.alpha = color.a * dis *1.5;
            }
      
             // 设置材质的高光系数为 0.5。
            material.specular = 0.5;
             return material;
        }
                `,
      },
      translucent: false
    }),
    faceForward: false, // 当绘制的三角面片法向不能朝向视点时，自动翻转法向，从而避免法向计算后发黑等问题
    closed: true // 是否为封闭体，实际上执行的是是否进行背面裁剪
  });
  const primitive = new Cesium.Primitive({
    geometryInstances: [coneInstance],
    appearance,
  });
  viewer.scene.primitives.add(primitive);
  // viewer.zoomTo(primitive)
};

addCone();
