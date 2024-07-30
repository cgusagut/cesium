/*
 * @Description: 扫描光圈shader
 * @Author: your name
 * @version:
 * @Date: 2024-07-22 09:42:42
 * @LastEditors: your name
 * @LastEditTime: 2024-07-22 10:57:43
 */
const movingRingShader = /*glsl*/ `
// 添加点光源,传入positionWC 光源颜色 光源半径  光源位置
vec3 PointLight(vec3 positionWC,vec3 lightCol,float lightRadius,vec3 lightPosition){
    // 计算当前片元距离光源的距离 length可以计算向量的模
    float lightDis=length(lightPosition-positionWC);
    // 计算点光源强度因子
    float intensity=pow(clamp(1.0-lightDis/lightRadius,0.0,1.0),2.0);
    // 计算光源颜色   往外不断衰减
    return lightCol*intensity;
}

vec3 movingCol(vec3 positionMC,float czm_h){
  vec3 col=vec3(0.0,0.5,0.9);
  float iTime=czm_frameNumber/120.;
//   动态设置光圈移动速度
  iTime*=u_ringSpeed;
//   给iTime一个周期函数，让其在0-1之间不断地来回变化
  iTime=abs(fract(iTime)*2.-1.);

  // vec3 col1=vec3(1.,0.,0.);
  // vec3 col2=vec3(0.,0.,1.);
  // // 可以在两个颜色之间做渐变色效果
  // col=mix(col1,col2,czm_h);
    col*=czm_h;
//   将刚才的0.5用iTime进行替换，可以转为流动光线
  if(czm_h<iTime+0.01 && czm_h>iTime){
    // 设置光圈颜色为白色
    col=vec3(0.,1.,1.);
  }
  // X轴Y轴扫光
  float iTimeScan=abs(fract(czm_frameNumber/1200.)*2.-1.);
  // u_min-u_max
  float range=mix(u_min,u_max,iTimeScan);
  bool isRingX=(range+u_scanWidth>positionMC.x && positionMC.x>range);
  bool isRingY=(range+u_scanWidth>positionMC.y && positionMC.y>range);
  if(isRingX || isRingY ){
    col=vec3(1.,0.,0.);
  }
  return col;
}   

void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
  // positionMC 模型坐标 (米)
  vec3 positionMC=fsInput.attributes.positionMC;
//   当前片元的世界坐标positionWC
  vec3 positionWC=fsInput.attributes.positionWC;
  float czm_height=positionMC.z-u_baseHeight;
//   1.获取到0-1范围的高度czm_h
  float czm_h=clamp(czm_height/u_maxHeight,0.0,1.0);
  // 光圈
  vec3 movingRingCol=movingCol(positionMC,czm_h);
  // 点光源
  vec3 pointCol=PointLight(positionWC,u_lightColor,u_lightRadius,u_lightPosition);

  material.diffuse=movingRingCol+pointCol;
}
`;
export default movingRingShader;
