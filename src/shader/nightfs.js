/*
 * @Description: 夜景贴图
 * @Author: your name
 * @version: 
 * @Date: 2024-07-22 09:40:13
 * @LastEditors: your name
 * @LastEditTime: 2024-07-22 09:40:13
 */
const nightShader=/*glsl*/`
void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
  // positionMC 模型坐标 (米)
  vec3 positionMC=fsInput.attributes.positionMC;
  // positionWC世界坐标 positionEC眼睛坐标系下的坐标
  // 定义贴图50m*50m
  float width=50.;
  float height=50.;
  // 这里的实现原理类似于background-repeat
  // fract获取到小数部分用于重复贴图
  // positionMC.x/width相当于把一个三维模型的侧面展开，展开之后的x轴坐标
  float u=fract(positionMC.y/width);
  // 这里采用的是上海白膜，Y轴取z坐标的值，如果是用武汉的白膜，Y轴取y坐标的值
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
`
export default nightShader