/*
 * @Description: 工具类
 * @Author: your name
 * @version:
 * @Date: 2024-07-10 14:12:59
 * @LastEditors: your name
 * @LastEditTime: 2024-07-22 17:01:15
 */
import * as Cesium from "cesium";

//获取唯一码 时间不可能重复
export const getPlotCode=()=>{
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
 * 笛卡尔3转经纬度
 * @param {Cesium.Cartesian3} cartesianPosition : 笛卡尔三维坐标
 * @param {Cesium.Viewer} viewer : program程序对象
 */
export const cartesian3ToLng = (viewer, cartesianPosition) => {
  const ellipsoid = viewer.scene.globe.ellipsoid;
  // cartographic是一个弧度制数据
  const cartographic = ellipsoid.cartesianToCartographic(cartesianPosition);
  // 将弧度制数据转换
  const lat = Cesium.Math.toDegrees(cartographic.latitude);
  const lng = Cesium.Math.toDegrees(cartographic.longitude);
  const alt = cartographic.height;
  return {
    lng,
    lat,
    height: alt,
  };
};

/**
 * 经纬度转笛卡尔3
 * @param {Object} positionLng : 经纬度坐标{lng,lat,height}
 */
export const lngToCartesian3 = (positionLng) => {
  const { lng, lat, height } = positionLng;
  //第一种方式：直接转换:
  const cartesian3Position = Cesium.Cartesian3.fromDegrees(lng, lat, height);
  return cartesian3Position;
};

/**
 * 经纬度数组转笛卡尔3
 * @param {Array<{lng,lat,height}>} positionLngs : 经纬度数组
 */
export const lngsToCartesian3 = (positionLngs) => {
  const result = [];
  if (positionLngs.length) {
    positionLngs.forEach((position) => {
      const { lng, lat, height } = position;
      result.push(lng, lat, height);
    });
    return Cesium.Cartesian3.fromDegreesArrayHeights(result);
  } else {
    return result;
  }
};

export function getPositionHeight(position) {
  const cartographic = Cesium.Cartographic.fromCartesian(position);
  return cartographic.height;
}

export function get2PositionDistance(p1, p2) {
  let lngLat1 = cartesian3ToLng(p1);
  let lngLat2 = cartesian3ToLng(p2);
  return distance(lngLat1, lngLat2);
}

//获取一个圆的边缘坐标
export const generateCirclePoints = (center, radius) => {
  let points = [];
  for (let i = 0; i < 360; i += 2) {
    points.push(getCirclePoint(center[0], center[1], i, radius));
  }
  return points;
};

const getCirclePoint = (lon, lat, angle, radius) => {
  let dx = radius * Math.sin((angle * Math.PI) / 180.0);
  let dy = radius * Math.cos((angle * Math.PI) / 180.0);
  let ec = 6356725 + ((6378137 - 6356725) * (90.0 - lat)) / 90.0;
  let ed = ec * Math.cos((lat * Math.PI) / 180);
  let newLon = ((dx / ed + (lon * Math.PI) / 180.0) * 180.0) / Math.PI;
  let newLat = ((dy / ec + (lat * Math.PI) / 180.0) * 180.0) / Math.PI;
  return [newLon, newLat];
};

//笛卡尔坐标转为经纬度
export function cartesian3ToDegreesHeight(position) {
  let c = Cesium.Cartographic.fromCartesian(position);
  return [
    Cesium.Math.toDegrees(c.longitude),
    Cesium.Math.toDegrees(c.latitude),
    c.height,
  ];
}

//计算两个点的距离
export function distance(lngLat1, lngLat2) {
  let radLat1 = (lngLat1[1] * Math.PI) / 180.0;
  let radLat2 = (lngLat2[1] * Math.PI) / 180.0;
  let a = radLat1 - radLat2;
  let b = (lngLat1[0] * Math.PI) / 180.0 - (lngLat2[0] * Math.PI) / 180.0;
  let s =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin(a / 2), 2) +
          Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)
      )
    );
  s = s * 6378.137;
  s = Math.round(s * 10000) / 10;
  return s;
}

/**
 * 屏幕坐标转笛卡尔3
 * @param {Cesium.Viewer} viewer : viewer
 * @param {Cesium.Cartesian2} position2d : 笛卡尔2维
 */
export const screenPositionToCartesian3 = (viewer, position) => {
  let cartesian = viewer.scene.globe.pick(
    viewer.camera.getPickRay(position),
    viewer.scene
  );
  if (!cartesian) {
    cartesian = viewer.scene.camera.pickEllipsoid(
      position,
      viewer.scene.globe.ellipsoid
    );
  }
  return cartesian;
};

export const saveSight = (viewer) => {
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
};

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
      duration: 2,
      // 监听相机飞跃之后的事件
      complete: () => {
        // 可以高亮实体
      },
    });
  } else {
    viewer.camera.flyHome();
  }
};

// 模型变换函数
export const updateModelMatrix = (params, tileset) => {
  //根据经纬度控制模型的位置
  let position = Cesium.Cartesian3.fromDegrees(params.tx, params.ty, params.tz);
  let m = Cesium.Transforms.eastNorthUpToFixedFrame(position);

  //旋转
  //  根据角度，获取到3阶旋转矩阵
  let mx = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(params.rx));
  let my = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(params.ry));
  let mz = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(params.rz));
  //   根据3阶旋转矩阵，获取到4阶旋转矩阵
  let rotationX = Cesium.Matrix4.fromRotationTranslation(mx);
  let rotationY = Cesium.Matrix4.fromRotationTranslation(my);
  let rotationZ = Cesium.Matrix4.fromRotationTranslation(mz);

  //旋转、平移矩阵相乘
  Cesium.Matrix4.multiply(m, rotationX, m);
  Cesium.Matrix4.multiply(m, rotationY, m);
  Cesium.Matrix4.multiply(m, rotationZ, m);

  //   构造缩放矩阵
  const _scale = Cesium.Matrix4.fromUniformScale(params.scale);
  Cesium.Matrix4.multiply(m, _scale, m);
  //赋值给tileset
  tileset._root.transform = m;
};

const changeControl = (viewer) => {
  // 修改倾斜视图的操作
  viewer.scene.screenSpaceCameraController.tiltEventTypes = [
    Cesium.CameraEventType.RIGHT_DRAG,
  ];

  // 修改缩放设置
  viewer.scene.screenSpaceCameraController.zoomEventTypes = [
    Cesium.CameraEventType.MIDDLE_DRAG,
    Cesium.CameraEventType.WHEEL,
  ];

  // 设置拖拽
  viewer.scene.screenSpaceCameraController.rotateEventTypes = [
    Cesium.CameraEventType.LEFT_DRAG,
  ];
};

export const createViewer = () => {
  // 初始化Cesium入口对象viewer
  const viewer = new Cesium.Viewer("cesium_container", {
    // 是否展示时间轴
    timeline: true,
    // 是否展示动画控件
    animation: false,
    // 是否展示点击模型之后的弹窗
    infoBox: false,
    // 右上角的四个控件
    homeButton: false, //关闭复位按钮
    fullscreenButton: false, //隐藏全屏按钮
    geocoder: false, //隐藏导航功能
    sceneModePicker: false, //隐藏二三维模式切换功能
    navigationHelpButton: false, //是否显示导航帮助按钮
    baseLayerPicker: false, //是否显示底图的切换
    shouldAnimate: true,
  });

  changeControl(viewer);
  return viewer
};
/**
 * todo1:笛卡尔3坐标转经纬度（带地形高程）scene.globe.sampleHeight
 * @param {Array<{lng,lat,height}>} positionLngs : 经纬度数组
 */

/**
 * todo2:不带高程的经纬度坐标转为带地形高程的经纬度坐标
 * @param {Array<{lng,lat,height}>} positionLngs : 经纬度数组
 */
