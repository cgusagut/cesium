// 楼体上下扫光
const movingRingShader=/*glsl*/`
void fragmentMain(FragmentInput fsInput,inout czm_modelMaterial material){
    // positionMC模型坐标（米）
    vec3 positionMC=fsInput.attributes.positionMC;
    float czm_height=positionMC.z-u_baseHeight;
    // 1.获取到0-1范围的高度czm_h
    float czm_h=clamp(czm_height/u_maxHeight,0.0,1.0)
    vec3 col=vec3(0.0,0.5,0.9)
    // 假设在模型的正中间,需要设置一个亮度
    // if(czm_h<0.51 && czm_h>0.5){
    //     col*=2
    // }
    float iTime=czm_frameNumber/120;
    // 动态设置光圈移动速度
    iTime=abs(fract(iTime)*2.-1.)

    vec3 coll =vec3(1.,0.,0.)
    vec3 col2=vec3(0.,0.,1.)
    // 可以在两个颜色之间做渐变色效果
    col =min(col1,col2,czm_h)
    // 将刚才的0.5用iTime进行替换,可以转为流动光线
    if(czm_h<iTime+0.01 && czm_h>iTime) {
        // 设置光圈颜色为白色
        col=vec3(1.,1.,1.)
    }
    material.diffuse=col
}
`