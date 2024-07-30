/*
 * @Description: 
 * @Author: your name
 * @version: 
 * @Date: 2024-07-22 11:00:58
 * @LastEditors: your name
 * @LastEditTime: 2024-07-22 11:13:16
 */
const reflectImgFs=/*glsl*/`
vec3 getReflectImgCol(vec3 positionEC,vec3 normalEC){
    // 参考webgl中环境贴图的实现逻辑，获取到从模型到眼睛的方向向量
    vec3 eyeToSurfaceDir=normalize(-positionEC);
    vec3 worldNormal=normalize(normalEC);
    vec3 direction=reflect(eyeToSurfaceDir,worldNormal);
    vec2 uv=vec2(direction.x,direction.z);
    return texture2D(u_envTexture,uv).rgb;
}


void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
    // positionEC是物体在眼睛坐标系下的坐标
    vec3 positionMC=fsInput.attributes.positionMC;
    vec3 positionEC=fsInput.attributes.positionEC;
    vec3 normalEC=fsInput.attributes.normalEC;
    vec3 baseCol=vec3(0.0,0.5,0.8);
    float czm_height=positionMC.z-u_baseHeight;
    //1.获取到0-1范围的高度czm_h
    float czm_h=clamp(czm_height/u_maxHeight,0.0,1.0);
    vec3 col=getReflectImgCol(positionEC,normalEC);
    // 判断当前片元所在的法向量与上方向的夹角余弦，如果是大于0.9的话，说明夹角很小，已经渲染到了楼顶
    if(dot(v_NormalMC,vec3(0.,0.,1.))>0.9){
      col=baseCol;
    }
    vec3 finCol=mix(baseCol,col,u_envRate);
    finCol*=czm_h;
    material.diffuse=finCol;
  }
`

export default reflectImgFs