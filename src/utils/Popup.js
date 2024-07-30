/*
 * @Description: 单个气泡框管理
 * @Author: your name
 * @version: 
 * @Date: 2024-07-16 09:46:17
 * @LastEditors: your name
 * @LastEditTime: 2024-07-16 10:42:02
 * @usage const popupHandler=new Popup(viewer)
 * @添加气泡框 popupHandler.addPopup(htmlContent,position,options)
 * @删除气泡框 popupHandler.removePopup()
 */
import * as Cesium from 'cesium'

class Popup{
  // 1.接收viewer,定义值
  constructor(viewer){
    // 为了代码提示，先用Cesium.Viewer
    // this.viewer=new  Cesium.Viewer()
    this.viewer=viewer
    this.scene=this.viewer.scene
    // 添加一个数组,保存气泡框得数据
    this.popups=[]
  }
    /**
    * 添加气泡框
    * @param {Sting} containerID 气泡框容器
    * @param {String} htmlContent : html dom 元素
    * @param {Cesium.Cartesian3} position : 笛卡尔3维坐标
    * @param {Object} options : 气泡框配置选项
    */
  //  2.创建添加气泡框的方法
  addPopup(containerID,htmlContent,position,options={}){
    // 创建一个气泡框的容器，并将其添加到cesium的widgets中
    const target=document.getElementById(containerID)//获取这个id的dom做判断
    if(target){
      // 如果当前dom中已经存在了这个container,直接返回
      console.warn('该ID已存在,请使用其他ID')
      return
    }
    //创建Dom元素
    const container=document.createElement('div')
    container.id=containerID
    // 添加到容器中
    this.viewer.cesiumWidget.container.appendChild(container)
    // 将html dom 元素赋值给气泡框
    container.innerHTML=htmlContent//赋值
    container.className='popup'//类名
    container.style.position='absolute'//定位
    //将气泡框的位置以及dom都保存起来
    this.popups.push({
      id:containerID,
      position,//坐标
      container,//DOM元素
      options
    })
    // 通过坐标,渲染气泡框的位置
    this.renderPostion(position,container,options)
  }
  // 3.监听相机事件,更新气泡框的位置
renderPostion(position,container,options){
  this.viewer.camera.percentageChanged=0.01// 设置监听的频率
  this.viewer.camera.changed.addEventListener(()=>this.updatePopups())
}
//4.遍历多个气泡框
updatePopups(){
  this.popups.length && this.popups.forEach(popup=>{
    const {position,container,options}=popup
    this.updatePopup(position,container,options)
  })
}

//5.更新单个气泡框
updatePopup(position,container,options){
  const {offset} =options
  let offsetReal=[0,0]
  // 如果用户向自定义偏移值,做适配
  if(Cesium.defined(offset)&&Cesium.defined(options)){
    offsetReal=offset
  }
  // 整个屏幕的高度
  const canvasHeight=this.viewer.scene.canvas.height
  //世界坐标转屏幕坐标,返回一个笛卡尔坐标
  const positionCar2=Cesium.SceneTransforms.wgs84ToWindowCoordinates(this.scene,position)
  // 设置气泡框的bottom,并向上位移
  container.style.bottom=canvasHeight-positionCar2.y+offsetReal[0] + 'px'
  // 将气泡框在水平方向上,向左位移它自身的1/2
  //offsetWidth 是一个属性，它属于浏览器提供的 DOM (Document Object Model) 元素的属性集合，用来获取元素的布局宽度
  const offsetWidth=container.offsetWidth
  container.style.left=positionCar2.x-offsetWidth/2+offsetReal[1]+'px'
}
// 6.删除弹窗
removePopup(){
  const {container}=this.popups[0]
  console.log(container)
  if(container){
    this.viewer.cesiumWidget.container.removeChild(container)
    // 清除popup的监听事件
    this.viewer.scene.postRender.removeEventListener(this.updatePopup,this)
    this.popup=null
  }
}
}
export default Popup