/*
 * @Description: 鼠标位置提示工具
 * @Author: your name
 * @version:
 * @Date: 2024-07-10 15:21:13
 * @LastEditors: your name
 * @LastEditTime: 2024-07-10 15:55:39
 * @useage:new PositionStatusBar(viewer)
 */
import * as Cesium from "cesium";
import { screenPositionToCartesian3, cartesian3ToLng } from "./index";
// 只需要传值参数viewer
class PositionStatusBar {
  constructor(viewer) {
    this.viewer = viewer;
    this.createDom();
    this.initEvent();
  }

  // 创建鼠标提示工具的dom元素
  createDom() {
    this.barContainer = document.createElement("div");
    // div的类名
    this.barContainer.className = "position-bar";
    // 把这个提示工具放在cesium容器下面
    this.viewer.cesiumWidget.container.appendChild(this.barContainer);
    // 鼠标所在的经度div
    this.divLng = document.createElement("div");
    this.barContainer.appendChild(this.divLng);
    // 鼠标所在的纬度div
    this.divLat = document.createElement("div");
    this.barContainer.appendChild(this.divLat);
    // 鼠标所在的海拔
    this.divHeight = document.createElement("div");
    this.barContainer.appendChild(this.divHeight);

    // 相机朝向(角度)
    this.divCameraHeading = document.createElement("div");
    this.barContainer.appendChild(this.divCameraHeading);
    // 相机俯仰角
    this.divCameraPitch = document.createElement("div");
    this.barContainer.appendChild(this.divCameraPitch);
    // 相机高度
    this.divCameraHeight = document.createElement("div");
    this.barContainer.appendChild(this.divCameraHeight);
  }

  initEvent() {
    // 创建屏幕空间事件，监听鼠标触发的移动事件
    this.eventHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.eventHandler.setInputAction((e) => {
      const { startPosition } = e;
      // 屏幕坐标转笛卡尔3
      const cartesian = screenPositionToCartesian3(this.viewer, startPosition);
      // 屏幕坐标可能转笛卡尔的时候会是undefined
      if (cartesian) {
        // 笛卡尔3转经纬度
        const { lng, lat, height } = cartesian3ToLng(this.viewer, cartesian);
        this.divLng.textContent = `经度:${lng.toFixed(4)}`;
        this.divLat.textContent = `纬度:${lat.toFixed(4)}`;
        this.divHeight.textContent = `海拔:${height.toFixed(4)}`;
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    // 使用camera.changed监听相机的变化
    this.viewer.scene.camera.changed.addEventListener((e) => this.cameraEvent(e));
  }
  cameraEvent() {
    // console.log(this.viewer.scene.camera)
    // roll的值一般都是0，
    const { heading, pitch, position } = this.viewer.scene.camera;
    if (position) {
      // 弧度数据转为角度数据
      const headingDegree = Cesium.Math.toDegrees(heading);
      const pitchDegree = Cesium.Math.toDegrees(pitch);
      // position是Cartesian3,笛卡尔3转经纬度获取高度
      const { height } = cartesian3ToLng(this.viewer, position);
      // innerHTML            .textContent安全性 简洁性
      this.divCameraHeading.textContent = `相机朝向:${headingDegree.toFixed(2)}`;
      this.divCameraPitch.textContent = `相机俯仰:${pitchDegree.toFixed(2)}`;
      this.divCameraHeight.textContent = `相机高度:${height.toFixed(2)}`;
    }
  }
  // 显示
  show() {
    this.barContainer.style.display = "block";
  }
  // 隐藏
  hide() {
    this.barContainer.style.display = "none";
  }
  //销毁
  destroy() {
    this.viewer.cesiumWidget.container.removeChild(this.barContainer);
    // 移除事件
    this.eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    this.viewer.scene.camera.changed.removeEventListener(this.cameraEvent);
  }
}

export default PositionStatusBar;
