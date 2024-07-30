/*
 * @Description:模型压平 
 * @Author: your name
 * @version: 
 * @Date: 2024-07-22 09:36:04
 * @LastEditors: your name
 * @LastEditTime: 2024-07-23 10:08:41
 */
import * as Cesium from "cesium";
import { createViewer } from "./utils";
import PositionStatusBar from './utils/positionStatusBar'
import {addTile3D,addBaseMap,addPostProgreeStage} from './utils/sceneMange'
import * as dat from 'dat.gui'
import DrawTool from './utils/DrawTool-complete'


// 注册Cesium ION的token,然后就可以使用Cesium ION的资产了
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3ODAzN2EzOS1kZDMzLTQ5Y2UtYjYxMi1jMzQxNTdiMTUzN2IiLCJpZCI6NDU5NDIsImlhdCI6MTYxNTYyNDQyOX0.BucgmI6OJ-7ixj7rcQ_Qyg45DkvdHmaLrFwyMYitLcI";

// 初始化Cesium入口对象viewer
const viewer = createViewer();

// addPostProgreeStage(viewer)
// 坐标的位置
new PositionStatusBar(viewer)
addBaseMap(viewer)

const drawTool=new DrawTool(viewer)

// 将武汉模型添加进来
const position=new Cesium.Cartesian3.fromDegrees(114.30,30.50,0)
const m=Cesium.Transforms.eastNorthUpToFixedFrame(position)
const tileset=viewer.scene.primitives.add(
    new Cesium.Cesium3DTileset({
        url : 'http://localhost:8888/AGI_HQ/AGI_HQ/tileset.json'
    })
)
tileset.readyPromise.then(res=>{
    tileset.root.transform=m
    viewer.scene.primitives.add(tileset);
    viewer.zoomTo(tileset)
})

const btn=document.createElement('button')
btn.textContent='开始单线分析'
btn.id = "btn";
document.body.appendChild(btn)

btn.onclick=()=>{
    // 激活线段绘制
    drawTool.active(drawTool.DrawTypes.Polyline)

    // 监听绘制结束事件
    drawTool.DrawEndEvent.addEventListener((ent,positions)=>{
        // 将绘制工具产生的实体清除
        drawTool.removeAllDrawEnts()
        // 只有两个点才能进行通视分析
        if(positions?.length!==2){
            return
        }
        const startPoint=positions[0]
        const endPoint=positions[1]
        // 创建起点和终点的实体label
        generateLabel('start',startPoint)
        generateLabel('end',endPoint)
        // 开始分析
        startAnalysis(startPoint,endPoint)
    })
}

const startAnalysis=(startPoint,endPoint)=>{
    // 构造一个方向向量
    // 通过方向向量创建射线ray
    // 调用pickFromRay得到碰撞的交点坐标
    // 通过坐标渲染line
    let direction=Cesium.Cartesian3.subtract(endPoint,startPoint,new Cesium.Cartesian3())
    direction=Cesium.Cartesian3.normalize(direction,new Cesium.Cartesian3())
    const ray=new Cesium.Ray(startPoint,direction)
    const interection=viewer.scene.pickFromRay(ray,[tileset])
    //使用起点，交点，终点，三点完成polyline绘制
    handleResult(interection,startPoint,endPoint)
}

let points = [];
// 添加点
const generateLabel = (type, position) => {
  let text = type == "start" ? "观察起点" : "观察终点";
  const point = viewer.entities.add({
    position: position,
    label: {
      text: text,
      fillColor: Cesium.Color.WHITE,
      scale: 0.5,
      font: "normal 34px MicroSoft YaHei",
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000),
      scaleByDistance: new Cesium.NearFarScalar(500, 1, 1500, 0.4),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -20),
      outlineWidth: 3,
      outlineColor: Cesium.Color.BLACK,
    },
    point: {
      color: Cesium.Color.BLUE,
      pixelSize: 5,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      scaleByDistance: new Cesium.NearFarScalar(1000, 1, 4200, 0.4),
      disableDepthTestDistance: 500,
    },
  });
  points.push(point);
};

// 三点完成polyline绘制
let resultLines = [];
const handleResult = (result, startPosition, endPosition) => {
  // 如果是场景模型的交互点，排除交互点是地球表面
  if (Cesium.defined(result) && Cesium.defined(result.object)) {
    resultLines.push(
      drawLine([startPosition, result.position], Cesium.Color.GREEN)
    );
    resultLines.push(
      drawLine([result.position, endPosition], Cesium.Color.RED)
    );
  }
};

const drawLine = (positions, color) => {
    return viewer.entities.add({
      polyline: {
        positions: positions,
        width: 2,
        material: color,
        depthFailMaterial: color,
      },
    });
};

