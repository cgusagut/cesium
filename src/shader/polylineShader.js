/*
 * @Description: 道路流线
 * @Author: your name
 * @version:
 * @Date: 2024-07-22 14:08:02
 * @LastEditors: your name
 * @LastEditTime: 2024-07-22 14:24:44
 */

const polylineShader=/*glsl*/`
czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material m = czm_getDefaultMaterial(materialInput);
    // cesium会送给我们当前材质的uv坐标，也叫st
    vec2 st=materialInput.st;
    float alpha=0.3;
    // 粒子运动的速度
    float iTime=czm_frameNumber/120.;
    iTime=fract(iTime);
    vec3 col=u_color.rgb;
    if(st.s>=iTime && st.s<iTime+0.03){
        alpha=smoothstep(iTime+0.03,iTime,st.s);
        col*=2.;
    }

    m.diffuse = col.rgb;
    m.alpha=alpha;
    m.specular = 0.5;
    return m;
}
`

// const polylineShader = /*glsl*/ `
//  uniform vec4 u_color;
//                         uniform float u_speed;
//                         uniform float u_glow;
//    czm_material czm_getMaterial(czm_materialInput materialInput){
//                             czm_material material = czm_getDefaultMaterial(materialInput);
//                             vec2 st = materialInput.st;
//                             float t =fract(czm_frameNumber / u_speed);
//                             t *= 1.03;
//                             float alpha = smoothstep(t- 0.03, t, st.s) * step(-t, -st.s);
//                             alpha += 0.1;
//                             vec4 fragColor;
//                             fragColor.rgb = (u_color.rgb) / 0.5;
//                             fragColor = czm_gammaCorrect(fragColor);
//                             material.diffuse = fragColor.rgb;
//                             material.alpha = alpha;
//                             material.emission = fragColor.rgb * 1.5;
//                             return material;
//                         }
// `;

export default polylineShader;
