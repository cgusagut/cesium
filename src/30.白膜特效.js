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
import { TencentImageryProvider } from "./utils/mapPlugin";
import PositionStatusBar from './utils/positionStatusBar'
import {addTile3D,addBaseMap,renderCustomShader} from './utils/sceneMange'
import shader from './shader'
import * as dat from 'dat.gui'

const {nightShader,movingRingShader,reflectImgFs,polylineShader}=shader
// 注册Cesium ION的token,然后就可以使用Cesium ION的资产了
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3ODAzN2EzOS1kZDMzLTQ5Y2UtYjYxMi1jMzQxNTdiMTUzN2IiLCJpZCI6NDU5NDIsImlhdCI6MTYxNTYyNDQyOX0.BucgmI6OJ-7ixj7rcQ_Qyg45DkvdHmaLrFwyMYitLcI";

// 初始化Cesium入口对象viewer
const viewer = createViewer();

new PositionStatusBar(viewer)
addBaseMap(viewer)

let tilesetOuter
addTile3D(viewer,'http://localhost:8888/3dtiles/3dtiles/tileset.json',(tileset)=>{
    tilesetOuter=tileset
    // 添加customShader效果
    renderCustomShader(tileset,movingRingShader)
})

//道路流线
let road;
const addGeoDataSourceByPrimitive=(url)=>{
    const promise=Cesium.GeoJsonDataSource.load(url)
    promise.then(dataSource=>{
        // 构成primitive的三个要素instance
        const instances=[]
        const entities=dataSource.entities.values
        for(let i=0;i<entities.length;i++){
            const entity=entities[i]
            const instance=new Cesium.GeometryInstance({
                geometry:new Cesium.PolylineGeometry({
                    positions:entity.polyline.positions.getValue(),
                    width:3
                })
            })
            instances.push(instance)
        }
        // 构造appearance
        const appearance=new Cesium.PolylineMaterialAppearance({
            material:new Cesium.Material({
                fabric:{
                    uniforms:{
                        u_color:new Cesium.Color.fromCssColorString('#007acc'),
                        u_speed: 200,
                    },
                    // 传入自定义的材质着色器
                    source:polylineShader
                }
            })
        })
        road=new Cesium.Primitive({
            geometryInstances:instances,
            appearance
        })
        viewer.scene.primitives.add(road)
    })
}
addGeoDataSourceByPrimitive('/src/assets/road.json')
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

