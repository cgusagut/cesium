/*
 * @Description: 模型压平工具
 * @Author: your name
 * @version:
 * @Date: 2024-07-22 16:52:02
 * @LastEditors: your name
 * @LastEditTime: 2024-07-22 17:22:16
 */
import * as Cesium from "cesium";

class TileFlatten {
  /**
   * 笛卡尔3转经纬度
   * @param {Cesium.Cesium3DTileset} tile : 当前需要压平的模型
   * @param {Array<Cesium.Cartesian3>} flattenPositions : 压平区域的笛卡尔坐标数组
   * @param {Number} flattenHeight : 压平的高度
   */
  constructor(tile, flattenPositions, flattenHeight) {
    this.tile = tile;
    this.flattenPositions = flattenPositions;
    this.flattenHeight = flattenHeight;
    // 将笛卡尔坐标转到当前的模型坐标
    this.flattenModelPositions = this.calculateModelPosition();
    console.log(this.flattenModelPositions);
    this.startFlatten()
  }

  // 计算模型坐标
  calculateModelPosition() {
    // 获取到模型矩阵
    console.log(this.tile);
    console.log(this.tile.root.transform);
    console.log(this.tile.root.computedTransform);

    const m = this.tile.root.computedTransform.clone();
    // 求模型矩阵的逆
    const inverseM = Cesium.Matrix4.inverseTransformation(
      m,
      new Cesium.Matrix4()
    );
    const newModelPositions = [];
    this.flattenPositions.forEach((position) => {
      // 将笛卡尔坐标转为模型坐标
      const positionMC = Cesium.Matrix4.multiplyByPoint(
        inverseM,
        position,
        new Cesium.Cartesian3()
      );
      // 这里y要取反，因为cesium笛卡尔坐标系和模型坐标系y轴方向相反
      newModelPositions.push([positionMC.x, -positionMC.y]);
    });
    return newModelPositions;
  }

  // 使用网上的算法，计算当前渲染的片元是否在多边形内部
  // 如果在多边形内部,将模型的z轴调整为压平高度
  startFlatten() {
    // 从网上找的glsl代码，判断点是否在多边形内：https://blog.csdn.net/qq_40043761/article/details/117700084
    //由于shader只能传固定长度，所以这里的长度要写成定好的，并且不能长度不能为0;
    //二三维一样的，改下类型就行了，一般只用判断是否在平面内
    const shaderIsInPolygon = /*glsl*/ `bool pointInPolygon(vec2 p, vec2 points[${this.flattenPositions.length}]){
        bool inside = false;
        const int length = ${this.flattenPositions.length};
        for (int i = 0; i < length; i++) {
          float xi = points[i].x;
          float yi = points[i].y;
          float xj;
          float yj;
          if (i == 0) {
            xj = points[length - 1].x;
            yj = points[length - 1].y;
          } else {
            xj = points[i - 1].x;
            yj = points[i - 1].y; 
          }
          bool intersect = ((yi > p.y) != (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
          if (intersect) {
            inside = !inside;
          }
        }
        return inside;
      }`;
    const customShader=new Cesium.CustomShader({
        uniforms:{
            u_height:{
                type:Cesium.UniformType.FLOAT,
                value:this.flattenHeight
            }
        },
        vertexShaderText:shaderIsInPolygon+/*glsl*/`
          void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {`
            +this.getStr()+
          /*glsl*/`
            // 在着色器中，通过字符串的方式，将多边形的坐标数组传进来
            vec3 positionMC=vsInput.attributes.positionMC;
            vec2 targetPoint=vec2(positionMC.x,positionMC.z);
            bool isInside=pointInPolygon(targetPoint,vs);
            if(isInside){
                vsOutput.positionMC.y=u_height;
            }
          }
        `
    })
    this.tile.customShader=customShader
  }

  changeHeight(height){
    this.flattenHeight=height
    if(!Number.isNaN(height)){
        this.tile.customShader.setUniform('u_height',this.flattenHeight)
    }
  }

  getStr() {
    let str = "vec2 vs[" + this.flattenModelPositions.length + "];\n";
    this.flattenModelPositions.forEach((item, index) => {
      str += "vs[" + index + "] = vec2(" + item[0] + "," + item[1] + ");\n";
    });
    console.log(str);
    return str;
  }

  removeFlatten(){
    this.tile.customShader=null
  }
}

export default TileFlatten;
