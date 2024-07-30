/*
 * @Description: 工具类
 * @Author: your name
 * @version:
 * @Date: 2024-07-10 14:12:59
 * @LastEditors: your name
 * @LastEditTime: 2024-07-10 14:38:06
 */

import *as Cesium from 'cesium'
/**
 * 笛卡尔3转经纬度
 * @param {Cesium.Cartesian3} cartesianPosition : 笛卡尔三维坐标
 * @param {Cesium.Viewer} viewer : program程序对象
 */
export const cartesian3ToLng = (viewer, cartesianPosition) => {
    // 通过这种方式获取的ellipsoid对象，你可以进一步用于执行与地球表面相关的各种空间几何运算
    const ellipsoid = viewer.scene.globe.ellipsoid;
    // cartographic是一个弧度制数据
    const cartographic = ellipsoid.cartesianToCartographic(cartesianPosition);
    // 将弧度制数据转换
    const lat = Cesium.Math.toDegrees(cartographic.latitude);
    const lng = Cesium.Math.toDegrees(cartographic.longitude);
    const alt = cartographic.height;
    return {
      lng,lat,height:alt
    }
  };
/**
 * 经纬度转笛卡尔3
 * @param {Object} positionLng :经纬度坐标(lng, lat,alt)
 */
export const lngToCartesian3=(positionLng)=>{
    const {lng,lat,height}=positionLng
    //第一种方式：直接转换:
    const cartesian3Position=Cesium.Cartesian3.fromDegrees(lng, lat, height)
    return cartesian3Position
}

/**
 * 经纬度数组转笛卡尔3
 * @param {Array<{lng,lat,height}>} positionLngs : 经纬度数组
 */
export const lngsToCartesian3=(positionLngs)=>{
    const result=[]
    if(positionLngs.length){
        positionLngs.forEach(position=>{
            const {lng,lat,height}=position
            result.push(lng,lat,height)
        })
        return Cesium.Cartesian3.fromDegreesArrayHeights(result)
    }else{
        return result
    }
}

/**
 * 屏幕坐标转笛卡尔3
 * @param {Cesium.Viewer} viewer : viewer
 * @param {Cesium.Cartesian2} position2d : 笛卡尔2维
 */
export const screenPositionToCartesian3=(viewer,position)=>{
  // viewer.camera.getPickRay():这个方法接收一个屏幕坐标，并返回一个射线，该射线从摄像机的位置出发，穿过屏幕坐标点，指向无限远
  // viewer.scene.globe.pick：这个方法从给定的屏幕坐标投射一条光线（射线），然后检查该光线是否与地球相交。如果相交，它将返回交点的Cartesian3坐标。如果未找到交点，则返回undefined。
  let cartesian = viewer.scene.globe.pick(viewer.camera.getPickRay(position),viewer.scene);
    if(!cartesian){//另一方法  射线法
      // viewer.scene.globe.ellipsoid 返回的是当前使用的椭球体模型的引用。
      // pickEllipsoid()沿着屏幕坐标 position 指向的方向发射一条射线，然后计算这条射线与地球椭球体相交的点。如果射线确实与椭球体相交，那么 pickEllipsoid 将返回一个 Cartesian3 对象，表示地球表面上的点的笛卡尔坐标；否则，它将返回 undefined。
        cartesian = viewer.scene.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid);
    }
    return cartesian
}

export const saveSight=(viewer)=>{
    // 点击按钮，查看一下相机状态
    console.log(viewer.camera);
    const { position, heading, pitch, roll } = viewer.camera;
    const cemeraInfo = {
      position,
      heading,
      pitch,
      roll,
    };
    // 将数据保存在本地存储里面
    window.localStorage.setItem("cameraInfo", JSON.stringify(cemeraInfo));
}
// 设置飞行视图
export const flyToDefaultSight = (viewer) => {
    const cameraInfo =
      JSON.parse(window.localStorage.getItem("cameraInfo")) || {};
    if (Object.keys(cameraInfo).length) {
      const { position, heading, pitch, roll } = cameraInfo;
      // 第一种视角设置方法，setView，直接将视角挪移到目标位置
      // viewer.camera.setView({
      //   destination: position,
      //   orientation: {
      //     heading,
      //     pitch,
      //     roll,
      //   },
      // });
      // 第二种视角设置的方法，flyTo
      viewer.camera.flyTo({
          destination: position,
          orientation: {
            heading,
            pitch,
            roll,
          },
          // 数值是秒，不是毫秒
          duration:2,
          // 监听相机飞跃之后的事件
          complete:()=>{
            // 可以高亮实体
          }
        })
    } else {
      viewer.camera.flyHome()
    }
  };

//模型变换函数
export  const updateModelMatrix=(params,tileset)=>{
    // 使用参数中的经纬度坐标,构造一个模型矩阵    如果只要平移缩放这两行代码就可以了
    const position =new Cesium.Cartesian3.fromDegrees(params.tx,params.ty,params.tz)
    const m=Cesium.Transforms.eastNorthUpToFixedFrame(position)
    //分别构造xyz轴上的三阶旋转矩阵
    const mx=Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(params.rx))
    const my=Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(params.ry))
    const mz=Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(params.rz))
    //将三阶旋转矩阵 升阶
    let rotateX=Cesium.Matrix4.fromRotationTranslation(mx)
    let rotateY=Cesium.Matrix4.fromRotationTranslation(my)
    let rotateZ=Cesium.Matrix4.fromRotationTranslation(mz)
    //旋转,平移矩阵相乘,将旋转作用到平移上,因为先平移后旋转
    Cesium.Matrix4.multiply(m,rotateX,m)
    Cesium.Matrix4.multiply(m,rotateY,m)
    Cesium.Matrix4.multiply(m,rotateZ,m)
    //构造缩放矩阵
    const sclarMartrix=Cesium.Matrix4.fromUniformScale(params.scale)
    // 将缩放矩阵作用到m矩阵上
    Cesium.Matrix4.multiply(m,sclarMartrix,m)
    //赋值给tileset
    tileset._root.transform = m;
    // return m 
}

// 基础代码+修改操作习惯封装
export const createViewer=()=>{
  const viewer = new Cesium.Viewer("cesium_container", {
    // 是否展示时间轴
    timeline: true,
    // 是否展示动画控件
    animation: false,
    // 是否展示点击模型之后的弹窗
    infoBox: true,
    // 右上角的四个控件
    homeButton: false, //关闭复位按钮
    fullscreenButton: false, //隐藏全屏按钮
    geocoder: false, //隐藏导航功能
    sceneModePicker: false, //隐藏二三维模式切换功能
    navigationHelpButton: false, //是否显示导航帮助按钮
    baseLayerPicker: true, //是否显示底图的切换
    shouldAnimate: true,
  });
  changeControl(viewer)
  return viewer
}
const changeControl=(viewer)=>{
  // 倾斜视图，鼠标右键旋转  
viewer.scene.screenSpaceCameraController.tiltEventTypes=[
  Cesium.CameraEventType.RIGHT_DRAG,
];
// 设置缩放
viewer.scene.screenSpaceCameraController.zoomEventTypes=[
  Cesium.CameraEventType.MIDDLE_DRAG,//指当用户在屏幕上使用鼠标中键拖动时触发的相机缩放事件。
  Cesium.CameraEventType.WHEEL,//指当用户滚动鼠标滚轮时触发的相机缩放事件。
  Cesium.CameraEventType.PINCH// 指在支持触摸操作的设备上，用户通过两指捏合或张开来触发的相机缩放事件。
];
// 设置拖拽
viewer.scene.screenSpaceCameraController.rotateEventTypes=[
  Cesium.CameraEventType.LEFT_DRAG,//设置指定了当用户在屏幕上按下鼠标左键并拖动时，会触发相机的旋转事件。
]
}

// 随时间生成随机id
//获取唯一码 时间不可能重复
export const getPlotCode=()=> {
  const date = new Date();
  let code = date.getFullYear() + "";
  code += date.getMonth() + 1;
  code += date.getDate();
  code += date.getHours();
  code += date.getMinutes();
  code += date.getSeconds();
  code += date.getMilliseconds();
  return code;
}


/**
 * todo1:笛卡尔3坐标转经纬度（带地形高程）
 * @param {Array<{lng,lat,height}>} positionLngs : 经纬度数组
 */

/**
 * todo2:不带高程的经纬度坐标转为带地形高程的经纬度坐标
 * @param {Array<{lng,lat,height}>} positionLngs : 经纬度数组
 */