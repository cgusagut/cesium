/*
 * @Description:
 * @Author: your name
 * @version:
 * @Date: 2024-07-10 09:35:57
 * @LastEditors: your name
 * @LastEditTime: 2024-07-10 14:39:09
 */
import * as Cesium from "cesium";
import {
  cartesian3ToLng,
  lngToCartesian3,
  lngsToCartesian3,
  screenPositionToCartesian3,
} from "./utils/index";
import PositionStatusBar from "./utils/positionStatusBar";
import { createViewer } from "./utils/index";
import { TencentImageryProvider } from "./utils/mapPlugin";
import SkyBoxOnGround from "./utils/skyBoxRepiar";
import * as dat from "dat.gui";
const gui = new dat.GUI();
// 注册Cesium ION的token,然后就可以使用Cesium ION的资产了
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmYzRhOWExOC1mN2ZhLTRhZjQtYTM4ZC05NWFjYjA3MTFhZDkiLCJpZCI6MjE3MTYyLCJpYXQiOjE3MTg5NDEyMzV9.mlvTvTEDy4hNqrs0E3ACiE-OH7Fl0yeMaDovyxQotFE";
const viewer = createViewer();
const bar = new PositionStatusBar(viewer);

// 将上海白膜添加进来
const tileset = new Cesium.Cesium3DTileset({
  url: " http://localhost:8888/3dtiles/3dtiles/tileset.json",
});
viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

tileset.readyPromise.then((res) => {
  // console.log(tileset.properties)//高度名称
  const conditions = [
    ["${floor} >= 100", "rgba(45, 0, 75, 0.5)"],
    ["${floor} >= 50", "rgb(102, 71, 151)"],
    ["${floor} >= 25", "rgb(170, 162, 204)"],
    ["${floor} >= 15", "rgb(198, 106, 11)"],
    ["true", "rgb(127, 59, 8)"],
  ];
  //   将着色条件,赋予给cesium3DTileStyle
  tileset.style = new Cesium.Cesium3DTileStyle({
    color: {
      conditions: conditions,
    },
  });
});

const tencentImageryProvider = new TencentImageryProvider({
  style: 4,
  crs: "WGS84",
});
viewer.scene.imageryLayers.addImageryProvider(tencentImageryProvider);


// 加载水域或者城市道路,使用primitive加载
let positionsArray = [];
const loadRiver = async () => {
  const data = await Cesium.GeoJsonDataSource.load("/src/assets/water.json");
  // 多边形实体
  const entities = data.entities.values;
  // 通过entity获取到多边形的坐标
  entities.forEach((ent) => {
    // 通过getValue获取到多边形的坐标
    const positions = ent.polygon.hierarchy.getValue().positions;
    positionsArray.push(positions);
    // 构造primitive  instances modelMatrix appearance
  });
  // appearance material材质为water
  positionsArray.forEach((positions) => {
    let polygonGeometry = new Cesium.PolygonGeometry({
      polygonHierarchy: new Cesium.PolygonHierarchy(positions),
      ellipsoid: Cesium.Ellipsoid.WGS84,
      height: 1,
      vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
    });

    viewer.scene.primitives.add(
      new Cesium.GroundPrimitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: polygonGeometry,
          // modelMatrix: Cesium.Matrix4.IDENTITY
        }),
        appearance: new Cesium.MaterialAppearance({
          material: new Cesium.Material({
            fabric: {
              type: "Water",
              uniforms: {
                baseWaterColor: new Cesium.Color.fromCssColorString("#007acc"),
                blendColor: new Cesium.Color.fromCssColorString("#007acc"),
                normalMap: "/src/assets/waterNormals.jpg",
                frequency: 1000,
                animationSpeed: 0.2,
                amplitude: 1.0,
              },
            },
          }),
        }),
        asynchronous: true,
        show: true,
      })
    );
  });
};
loadRiver();

// 根据customShader修改模型的样式  添加夜景
const renderCustomShader = () => {
  const customShader = new Cesium.CustomShader({
    uniforms: {
      u_nightTexture: {
        type: Cesium.UniformType.SAMPLER_2D,
        // 这里的图片不能直接传，而是要使用TextureUniform构造一个图片对象
        value: new Cesium.TextureUniform({
          url: "/src/assets/wall.png",
        }),
      },
    },
    varyings: {
      v_NormalMC: Cesium.VaryingType.VEC3,
    },
    // 定点着色器
    vertexShaderText: /*glsl*/ `
      void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
        v_NormalMC=vsInput.attributes.normalMC;
      }
    `,
    // 片元
    fragmentShaderText: /*glsl*/ `
      void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        vec3 positionMC=fsInput.attributes.positionMC;
        // 定义贴图的像素大小
        float width=50.;
        float height=50.;
        // 这里的实现原理类似于background-repeat
        // fract获取到小数部分用于重复贴图
        // positionMC.x/width相当于把一个三维模型的侧面展开，展开之后的x轴坐标
        float u=fract(positionMC.x/width);
        // 为什么这里不取y，而是取z呢，因为这个白膜的上方向是z不是y
        float v=fract(positionMC.z/height);
        vec3 nightCol=texture2D(u_nightTexture,vec2(u,v)).rgb;
        vec3 col=vec3(0.1,0.1,0.1);
        // 判断当前片元所在的法向量与上方向的夹角余弦，如果是大于0.9的话，说明夹角很小，已经渲染到了楼顶
        if(dot(v_NormalMC,vec3(0.,0.,1.))<0.9){
          col=nightCol;
        }
        material.diffuse=col;
      }
    `,
  });
  tileset.customShader = customShader;
};

const nightScene = gui.addFolder("夜景的添加");
const nightObj = {
  fxaa: false,
};
nightScene.add(nightObj, "fxaa").onChange((value) => {
  if(value){
    renderCustomShader()
  }else{
    tileset.customShader = null;
  }
});