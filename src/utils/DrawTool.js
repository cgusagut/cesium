/*
 * @Description: 绘制工具-初版
 * @Author: your name
 * @version:
 * @Date: 2024-07-16 14:12:59
 * @LastEditors: your name
 * @LastEditTime: 2024-07-10 14:38:06
 * @usage const drawTool=new DrawTool(viewer)
 * 激活点绘制工具
 * drawTool.active('Point')
 * 获取绘制结束之后的信息 drawTool.drawEnd  drawEnd绘制完成之后的实体,  position坐标信息 drawType
 */
import * as Cesium from 'cesium'
import {screenPositionToCartesian3,getPlotCode} from './index'
import _ from 'lodash'
class DrawTool{
    constructor(viewer){
        this.viewer=viewer
        this.scene=this.viewer.scene
        // 创建屏幕事件
        this.handler=new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)
        // rasieEvent可以触发一个事件
        this.drawEnd=new Cesium.Event()
        // 储存绘制之后的实体
        this.points=[]
        // 储存绘制完成之后的信息
        this.positions=[]
        // 绘制过程中的数组,专门服务于callbackProperty
        this.curPositions=[]
        // 绘制的实体,服务于线段,矩形,多边形等
        this.drawEntity=null
        
    }

    // 1.判断事件类型
    active(type){
        this.drawType=type
        this.registerEvents()
        this.createMarker()
    }
    // 2.注册鼠标事件
    registerEvents(){
        this.registerLeftClickEvent()
        this.registerMouseMoveEvent()
        this.registerRightClickEvent()
    }
    // 3.左键点击事件
    registerLeftClickEvent(){
        this.handler.setInputAction((e)=>{
            const cartesian=screenPositionToCartesian3(this.viewer,e.position)
            this.positions.push(cartesian)
            this.curPositions.push(cartesian)
            if(this.drawType===this.DrawTypes.point){
                console.log("绘制点")
                this.generatePoint(cartesian)
            }else if(this.drawType===this.DrawTypes.rect &&this.positions.length===1) {
                //只有第一次点击才绘制这个矩形
                this.generateRect()
            }
        },Cesium.ScreenSpaceEventType.LEFT_CLICK)
    }
    // 4.鼠标移动事件
    registerMouseMoveEvent(){
        this.handler.setInputAction((e)=>{
            const cartesian=screenPositionToCartesian3(this.viewer,e.endPosition)
            // 给Marker一个坐标
            if(this.marker){
            this.marker.style.left=e.endPosition.x+20+'px'
             this.marker.style.top=e.endPosition.y-20+'px'
            }
            // 对于矩形来说,只能保留两个坐标
            this.curPositions=[...this.positions,cartesian]
        },Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    }
    // 5.右键点击事件
    registerRightClickEvent(){
        this.handler.setInputAction((e)=>{
            console.log("结束")
            this.deActived()
            this.destroyMarker()//销毁Marker
        },Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }

    // 6.创建点实体
    generatePoint(position){
        const point=this.viewer.entities.add({
            id:getPlotCode(),
            type:"Point",
            position,
            point:{
                pixelSize:14,
                color:Cesium.Color.RED,
                outlineWidth:2,
                outlineColor:Cesium.Color.WHITE
            }
        })
        this.points.push(point)
    }
    // 7.结束绘制
    deActived(){
        if(this.drawType===this.DrawTypes.point){
        // 只有绘制类型为点实体的时候,才需要批量返回
        // 如果是多边形或者矩形,都只用返回当前绘制的一个实体
         // 这是 Cesium 中用于手动触发一个事件的方法。
        this.drawEnd.raiseEvent(this.points,_.cloneDeep(this.positions))
        }else{
            // 如果是矩形的话,将坐标转为constantProperty
            if(this.drawType===this.DrawTypes.rect){
                // 如果点击的点数量小于2，直接返回
                if(this.curPositions.length<2){
                    return
                }
                this.drawEntity.polygon.hierarchy=new Cesium.PolygonHierarchy(this.getRectFourPoints())
                this.drawEntity.polyline.positions=this.getRectFourPoints()
            }
            // 返回的是this.positions的深拷贝,后面需要就爱那个this.positions给清空
            this.drawEnd.raiseEvent(this.drawEntity,_.cloneDeep(this.positions))
        }
       
        // 每次结束绘制,将缓存的数据清空
        this.points.length=0
        this.positions.length=0
        this.curPositions.length=0
        // 不要忘记将事件清除
        this.unRegisterEvents()

    }
    unRegisterEvents(){
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }
    // 8.用户可以手动清空所有的绘制实体
   removeDrawEnt(){
        this.points.length && this.points.forEach(ent=>{
            this.viewer.entities.remove(ent)
        })
        this.drawEntity && this.viewer.entities.remove(this.drawEntity)
        this.deActived()
    }
    // 9.添加一个跟随鼠标的提示框
    createMarker(){
        this.marker=document.createElement('div')
        this.marker.innerHTML=`左键点击绘制${this.drawType},右键绘制结束`
        this.marker.className='draw-marker'
        this.viewer.cesiumWidget.container.appendChild(this.marker)
    }
    // 静态属性
    DrawTypes={
       'rect':'Rect' ,
       'point':'Point'
    }
    // 10.销毁事件marker
    destroyMarker(){
        this.marker && this.viewer.cesiumWidget.container.removeChild(this.marker)
        this.marker=null
    }
    // 11.矩形绘制
    generateRect(){
        this.drawEntity=this.viewer.entities.add({
            // id给唯一码
            id:getPlotCode(),
            type:"Rect",
            polygon:{
                // 重点:将矩形的坐标设置为callbackProperty
                // 1.构造curPosition,绘制中的坐标数组
                // 2.鼠标移动的时候,会改变这个坐标数组,从而实现动态绘制的效果
                hierarchy:new Cesium.CallbackProperty(()=>{
                    return new Cesium.PolygonHierarchy(this.getRectFourPoints())
                },false),  
 
            material:Cesium.Color.RED.withAlpha(0.6),
            perPositionHeight:true
            },
            polyline:{
               position:new Cesium.CallbackProperty(()=>{
                return new Cesium.PolygonHierarchy(this.getRectFourPoints())
               },false),
               width:1,
               material:new Cesium.PolylineDashMaterialProperty({
                color:Cesium.Color.YELLOW
               })
            }
        })
    }
    // 12.生成矩形的四个坐标
      // 获取矩形四个点
  getRectFourPoints() {
    // 如果当前绘制中的数组存在
    if (this.curPositions.length) {
      let p1 = this.curPositions[0];
      let p2 = this.curPositions[0];
      if (this.curPositions.length > 1) p2 = this.curPositions[1];

      let c1 = Cesium.Cartographic.fromCartesian(p1);
      let c2 = Cesium.Cartographic.fromCartesian(p2);
      if (c1.height < 0) c1.height = 0;
      if (c2.height < 0) c2.height = 0;
      let lls = this.getRectanglePointsByTwoPoint(c1, c2);

      // 坐标数组转为指定格式
      let ars = [
        lls[0][0],
        lls[0][1],
        c1.height,
        lls[1][0],
        lls[1][1],
        c1.height,
        lls[2][0],
        lls[2][1],
        c1.height,
        lls[3][0],
        lls[3][1],
        c1.height,
        lls[0][0],
        lls[0][1],
        c1.height,
      ];
      const result = Cesium.Cartesian3.fromDegreesArrayHeights(ars);
      return result;
    }
  }

  //   获取矩形四个点
  getRectanglePointsByTwoPoint(c1, c2) {
    //转为经纬度
    let lngLat1 = [
      Cesium.Math.toDegrees(c1.longitude),
      Cesium.Math.toDegrees(c1.latitude),
    ];
    let lngLat2 = [
      Cesium.Math.toDegrees(c2.longitude),
      Cesium.Math.toDegrees(c2.latitude),
    ];

    let lngLat3 = [
      Cesium.Math.toDegrees(c1.longitude),
      Cesium.Math.toDegrees(c2.latitude),
    ];
    let lngLat4 = [
      Cesium.Math.toDegrees(c2.longitude),
      Cesium.Math.toDegrees(c1.latitude),
    ];

    return [lngLat1, lngLat3, lngLat2, lngLat4];
  }
}
export default DrawTool
