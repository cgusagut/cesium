/*
 * @Description:
 * @Author: your name
 * @version:
 * @Date: 2024-07-10 09:35:57
 * @LastEditors: your name
 * @LastEditTime: 2024-07-10 14:39:09
 */
import * as Cesium from "cesium";
import {
  cartesian3ToLng,
  lngToCartesian3,
  lngsToCartesian3,
  screenPositionToCartesian3,
} from "./utils/index";
import PositionStatusBar from "./utils/positionStatusBar";
import { createViewer } from "./utils/index";
import { TencentImageryProvider } from "./utils/mapPlugin";
import SkyBoxOnGround from "./utils/skyBoxRepiar";
import * as dat from "dat.gui";
const gui = new dat.GUI();
// 注册Cesium ION的token,然后就可以使用Cesium ION的资产了
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmYzRhOWExOC1mN2ZhLTRhZjQtYTM4ZC05NWFjYjA3MTFhZDkiLCJpZCI6MjE3MTYyLCJpYXQiOjE3MTg5NDEyMzV9.mlvTvTEDy4hNqrs0E3ACiE-OH7Fl0yeMaDovyxQotFE";
const viewer = createViewer();
const bar = new PositionStatusBar(viewer);

// 将上海白膜添加进来
const tileset = new Cesium.Cesium3DTileset({
  maximumScreenSpaceError: 200,
  url: " http://localhost:8888/3dtiles/3dtiles/tileset.json",
});
viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

tileset.readyPromise.then((res) => {
  // console.log(tileset.properties)//高度名称
  const conditions = [
    ["${floor} >= 100", "rgba(45, 0, 75, 0.5)"],
    ["${floor} >= 50", "rgb(102, 71, 151)"],
    ["${floor} >= 25", "rgb(170, 162, 204)"],
    ["${floor} >= 15", "rgb(198, 106, 11)"],
    ["true", "rgb(127, 59, 8)"],
  ];
  //   将着色条件,赋予给cesium3DTileStyle
  tileset.style = new Cesium.Cesium3DTileStyle({
    color: {
      conditions: conditions,
    },
  });
 
});
// 解决办法
// 加载的地图arcgis,腾讯地图,都会因为坐标系的原因,导致白膜对不上
// TencentImageryProvider插件会把wgs84坐标系下的坐标都转为cgc02
//调用方法TencentImageryProvider, 变换坐标系,使白膜与地图对齐
const tencentImageryProvider = new TencentImageryProvider({
  style: 4,
  crs: "WGS84",
});
viewer.scene.imageryLayers.addImageryProvider(tencentImageryProvider);

// 1.加载geojson数据,获取到实体信息
// 2.通过实体信息,得到坐标信息
// 3.通过坐标构造geometry
// 4.构造水域的appearance,设置material材质为water
// 加载水域或者城市道路,使用primitive加载
let positionsArray = [];
const loadRiver = async () => {
  const data = await Cesium.GeoJsonDataSource.load("/src/assets/water.json");
  // 多边形实体
  const entities = data.entities.values;
  // 通过entity获取到多边形的坐标
  entities.forEach((ent) => {
    // 通过getValue获取到多边形的坐标
    const positions = ent.polygon.hierarchy.getValue().positions;
    positionsArray.push(positions);
    // 构造primitive  instances modelMatrix appearance
  });
  // appearance material材质为water
  positionsArray.forEach((positions) => {
    let polygonGeometry = new Cesium.PolygonGeometry({
      polygonHierarchy: new Cesium.PolygonHierarchy(positions),
      ellipsoid: Cesium.Ellipsoid.WGS84,
      height: 1,
      vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
    });

    viewer.scene.primitives.add(
      new Cesium.GroundPrimitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: polygonGeometry,
          // modelMatrix: Cesium.Matrix4.IDENTITY
        }),
        appearance: new Cesium.MaterialAppearance({
          material: new Cesium.Material({
            fabric: {
              type: "Water",
              uniforms: {
                baseWaterColor: new Cesium.Color.fromCssColorString("#007acc"),
                blendColor: new Cesium.Color.fromCssColorString("#007acc"),
                normalMap: "/src/assets/waterNormals.jpg",
                frequency: 1000,
                animationSpeed: 0.2,
                amplitude: 1.0,
              },
            },
          }),
        }),
        asynchronous: true,
        show: true,
      })
    );
  });
};
loadRiver();

// 后处理部分
// viewe.scene.postProcessStages是后处理的集合
const stages = viewer.scene.postProcessStages;
// 创建一个高亮的后处理效果
// viewer.scene.brightness =stages.add(Cesium.PostProcessStageLibrary.createBrightnessStage());
// viewer.scene.brightness.enabled = true;
//设置明亮度
// viewer.scene.brightness.uniforms.brightness = 1.5;

// 1.创建一个PostProcessStageLibrary中内置的后处理效果：Cesium.PostProcessStageLibrary.createNightVisionStage()
// 2.使用scene中内置的后处理效果 skyAtmosphere
// 3.使用postProcessStages中内置的后处理效果，比如说环境光遮蔽 场景泛光等
// 4.使用自定义后处理效果，需要自己写着色器

const psFolder = gui.addFolder("后处理");
const psObj = {
  fxaa: false,
};
psFolder.add(psObj, "fxaa").onChange((value) => {
  // 允许开启抗锯齿,刷新网页比较
  // viewer.scene.postProcessStages.fxaa.enabled = value;
  stages.fxaa.enabled = value;
});

const skyAtmosphereOpts = {
  大气层显示: true,
  // 亮度偏移
  brightnessShift: 0.1,
  // 色调改变
  hueShift: 0.5,
  // 饱和度偏移
  saturationShift: 0.1,
  // 大气层透明度
  atmosphereLightIntensity: 20,
};
const folder = gui.addFolder("大气层");
// 设置大气层
folder.add(skyAtmosphereOpts, "大气层显示").onChange((value) => {
  viewer.scene.skyAtmosphere.show = value;
});
// 亮度偏移
folder.add(skyAtmosphereOpts, "brightnessShift", 0, 1).onChange((value) => {
  viewer.scene.skyAtmosphere.brightnessShift = value;
});
// 设置色调改变
folder.add(skyAtmosphereOpts, "hueShift", 0, 1).onChange((value) => {
  viewer.scene.skyAtmosphere.hueShift = value;
});
// 饱和度偏移
folder.add(skyAtmosphereOpts, "saturationShift", 0, 1).onChange((value) => {
  viewer.scene.skyAtmosphere.saturationShift = value;
});
// 大气层光强
folder
  .add(skyAtmosphereOpts, "atmosphereLightIntensity", 0, 100)
  .onChange((value) => {
    viewer.scene.skyAtmosphere.atmosphereLightIntensity = value;
  });

const shadowOpts = {
  // 是否开启阴影
  enabled: false,
  // 阴影透明度
  darkness: 0.4,
  // 阴影大小
  size: 2048,
  // 是否使用柔和阴影
  softShadows: false,
};
const folderShadow = gui.addFolder("阴影属性");
folderShadow.add(shadowOpts, "enabled").onChange((val) => {
  viewer.scene.shadowMap.enabled = val;
});
// darkness设置的越小，阴影越深
folderShadow.add(shadowOpts, "darkness", 0, 1, 0.01).onChange((val) => {
  viewer.scene.shadowMap.darkness = val;
});
// 越大，阴影越精细
folderShadow.add(shadowOpts, "size", 1024, 4096, 1024).onChange((val) => {
  viewer.scene.shadowMap.size = val;
});
// 柔和阴影如果开启的话，在背光面会有更多的细节
folderShadow.add(shadowOpts, "softShadows").onChange((val) => {
  viewer.scene.shadowMap.softShadows = val;
});
// 加载飞机模型
// const resource=await Cesium.IonResource.fromAssetId(360956)
let flyEnt;
 const addEnt =() => {
  flyEnt =viewer.entities.add({
    position: new Cesium.Cartesian3.fromDegrees(
      121.4601040982829,
      31.11761672707175,
      100
    ),
    model: {
      uri: "/src/assets/Cesium_Air.glb",
    },
  });
  viewer.flyTo(flyEnt);
};
// 配置环境光遮蔽
const aoOPts = {
  是否开启环境光遮蔽: false,
  环境光强度: 3,
};
const folderAO = gui.addFolder("环境光选项");

folderAO.add(aoOPts, "是否开启环境光遮蔽").onChange((val) => {
  if (val) {
    flyEnt ? viewer.flyTo(flyEnt) : addEnt();
  }
  viewer.scene.postProcessStages.ambientOcclusion.enabled = val;
});
// 环境光是物体和物体相交或靠近的时候遮挡周围漫反射光线的效果
// 所以强度设置的越大，物体上的阴影也就越大
folderAO.add(aoOPts, "环境光强度", 0, 10, 0.1).onChange((val) => {
  viewer.scene.postProcessStages.ambientOcclusion.uniforms.intensity = val;
});

// 场景泛光bloom
// 泛光效果 对全屏的泛光效果
const bloom = viewer.scene.postProcessStages.bloom;
// 泛光设置
const bloomOpts = {
  是否开启泛光效果: false,
  泛光对比度: 128,
  泛光亮度: 0.5,
  泛光delta: 1,
  泛光sigma: 2,
};
const folderBloom = gui.addFolder("泛光");

folderBloom.add(bloomOpts, "是否开启泛光效果").onChange((val) => {
  bloom.enabled = val;
});
folderBloom.add(bloomOpts, "泛光对比度", 0, 256, 32).onChange((val) => {
  bloom.uniforms.contrast = val;
});
folderBloom.add(bloomOpts, "泛光亮度", 0, 1, 0.01).onChange((val) => {
  bloom.uniforms.brightness = val;
});
folderBloom.add(bloomOpts, "泛光delta", 0, 2, 0.01).onChange((val) => {
  bloom.uniforms.delta = val;
});
folderBloom.add(bloomOpts, "泛光sigma", 0, 2, 0.01).onChange((val) => {
  bloom.uniforms.sigma = val;
});

// 自定义全局后处理效果：屏幕闪烁
const addSelfPostStage = () => {
  const selfPostStage = new Cesium.PostProcessStage({
    name: "bink",
    uniforms: {
      // 闪烁的亮度
      brightness: 1.5,
      // 闪烁的频率
      frequency: 0.5,
    },
    // 自定义后处理效果，可以添加片元着色器
    fragmentShader: /*glsl*/ `
      // cesium会送给我们两个关键属性colorTexture
      // colorTexture代表当前画布的图片
      uniform sampler2D colorTexture;
      // 用于采样的uv坐标
      varying vec2 v_textureCoordinates;
      uniform float brightness;
      uniform float frequency;
      void main(){
        vec3 canvasCol=texture2D(colorTexture,v_textureCoordinates).rgb;
        // czm_frameNumber随着渲染帧数不断变大的值，每秒变大60 
        // 所以czm_frameNumber/60.0每秒变大一个单位x * 0.5
        // iTime每秒变大0.5个单位
        // 然后使用fract函数，定义域0-正无穷  值域0-1
        float iTime=(czm_frameNumber/60.0)*frequency;
        //fract周期函数  
        iTime=fract(iTime);
        // 所以判断当iTime>0.5的时候，我们会有一半的时间处于高亮的，一半的时间是灰暗的
        if(iTime>=0.5){
          // 自定义的高亮后处理效果
          canvasCol*=brightness;
        }

        gl_FragColor=vec4(canvasCol,1.0);
      }
    `,
  });
  viewer.scene.postProcessStages.add(selfPostStage);
};
// addSelfPostStage()

// 加载天空
function getTextureUrl(type, direction) {
  return `/src/assets/skyBox/${type}/${direction}.jpg`;
}
// 经典问题，天空盒为什么是歪的？
// 天空盒源码实现;shade,p的模型矩阵不对，加一个旋转矩阵，其中天空盒的旋转矩阵要和相机的旋转矩阵保持一致才可以
// 
const addSkyBox = (type = "03") => {
  // 加载完成之后发现天空盒是歪的，因为cesium的skybox接口有问题
  viewer.scene.skyBox = new SkyBoxOnGround({
    sources: {
      positiveX: getTextureUrl(type, "px"),
      negativeX: getTextureUrl(type, "nx"),
      positiveY: getTextureUrl(type, "py"),
      negativeY: getTextureUrl(type, "ny"),
      positiveZ: getTextureUrl(type, "pz"),
      negativeZ: getTextureUrl(type, "nz"),
    },
  });
};
// addSkyBox();
// 异步执行天空就不歪了
setTimeout(function(){
  console.log("3秒后执行")
  addSkyBox()
},3000)
const skyObj = {
  天空切换: "晴天",
};
gui.add(skyObj, "天空切换", ["黄昏", "阳光明媚的下午", "晴天", "星空", "多云"]).onChange((val) => {
  switch (val) {
    case "黄昏":
      addSkyBox("01");
      break;
    case "阳光明媚的下午":
      addSkyBox("02");
      break;
    case "晴天":
      addSkyBox("03")
      break;
    case "星空":
      addSkyBox("04")
      break;
    case "多云":
      addSkyBox("05")
    default:
      break;
  }
});

const weatherObj = {
  天气切换: "",
};
let currentWeatherStage;
gui.add(weatherObj, "天气切换", ["雨天", "雪天", "雾天"]).onChange((val) => {
  if (currentWeatherStage) {
      console.log("已清空")
      viewer.scene.postProcessStages.remove(currentWeatherStage);
  }
  switch (val) {
      case "雨天":
        currentWeatherStage = addRainDay();
        break;
      case "雪天":
        currentWeatherStage = addSnowDay();
        break;
      case "雾天":
        currentWeatherStage = addFogDay();
        break;
      default:
        currentWeatherStage = null;
        break;
    }
});
// 加载雨天的天气
const folderRain = gui.addFolder("雨天参数");
const rainObj = {
  u_Speed: 0.5,
  u_rainSize: 2,
};
folderRain.add(rainObj, "u_Speed", 0.1, 3).onChange((val) => {
  if (currentWeather) {
    currentWeather.uniforms.u_Speed = val;
  }
});

folderRain.add(rainObj, "u_rainSize", 0.5, 3).onChange((val) => {
  if (currentWeather) {
    currentWeather.uniforms.u_rainSize = val;
  }
});
let currentWeather;
// 下雨加闪电
const addRainDay = () => {
  currentWeather = new Cesium.PostProcessStage({
    name: "rain",
    uniforms: {
      u_Speed: 0.5,
      u_rainSize: 2,
    },
    fragmentShader: /*glsl*/ `
    uniform sampler2D colorTexture;
    uniform float u_Speed;
    uniform float u_rainSize;
    varying vec2 v_textureCoordinates;
    // 随机数 glsl当中的随机数都是用算法模拟的
    float hash(float x){
      return fract(sin(x*133.3)*13.13);
    }

    float rand(float x)
    {
        return fract(sin(x)*75154.32912);
    }
    
    float rand3d(vec3 x)
    {
        return fract(375.10297 * sin(dot(x, vec3(103.0139,227.0595,31.05914))));
    }
    
    float noise(float x)
    {
        float i = floor(x);
        float a = rand(i), b = rand(i+1.);
        float f = x - i;
        return mix(a,b,f);
    }
    
    float perlin(float x)
    {
        float r=0.,s=1.,w=1.;
        for (int i=0; i<6; i++) {
            s *= 2.0;
            w *= 0.5;
            r += w * noise(s*x);
        }
        return r;
    }
    
    float noise3d(vec3 x)
    {
        vec3 i = floor(x);
        float i000 = rand3d(i+vec3(0.,0.,0.)), i001 = rand3d(i+vec3(0.,0.,1.));
        float i010 = rand3d(i+vec3(0.,1.,0.)), i011 = rand3d(i+vec3(0.,1.,1.));
        float i100 = rand3d(i+vec3(1.,0.,0.)), i101 = rand3d(i+vec3(1.,0.,1.));
        float i110 = rand3d(i+vec3(1.,1.,0.)), i111 = rand3d(i+vec3(1.,1.,1.));
        vec3 f = x - i;
        return mix(mix(mix(i000,i001,f.z), mix(i010,i011,f.z), f.y),
                   mix(mix(i100,i101,f.z), mix(i110,i111,f.z), f.y), f.x);
    }
    
    float perlin3d(vec3 x)
    {
        float r = 0.0;
        float w = 1.0, s = 1.0;
        for (int i=0; i<5; i++) {
            w *= 0.5;
            s *= 2.0;
            r += w * noise3d(s * x);
        }
        return r;
    }
    
    float f(float y)
    {
        float w = 0.4; // width of strike
        return w * (perlin(2. * y) - 0.5);
    }
    
    float plot(vec2 p, float d, bool thicker)
    {
        if (thicker) d += 5. * abs(f(p.y + 0.001) - f(p.y));
        return smoothstep(d, 0., abs(f(p.y) - p.x));
    }

    vec3 renderlightning(vec2 uv){
      float x = czm_frameNumber/180. + 0.1;

      float m = 0.5; // max duration of strike
      float i = floor(x/m);
      float f = x/m - i;
      float k = 0.5; // frequency of strikes
      float n = noise(i);
      float t = ceil(n-k); // occurrence
      float d = max(0., n-k) / (1.-k); // duration
      float o = ceil(t - f - (1. - d)); // occurrence with duration
      float gt = 0.3; // glare duration
      float go = ceil(t - f - (1. - gt)); // glare occurrence

      float lightning = 0.;
      float light = 0.;

      if (o == 1.) {
          vec2 uv2 = uv;
          uv2.y += i * 2.; // select type of lightning
          float p = (noise(i+10.) - 0.5) * 2.; // position of lightning
          uv2.x -= p;

          float strike = plot(uv2, 0.01, true);
          float glow = plot(uv2, 0.04, false);
          float glow2 = plot(uv2, 1.5, false);
      
          lightning = strike * 0.4 + glow * 0.15;
      
          float h = noise(i+5.); // height
          lightning *= smoothstep(h, h+0.05, uv.y + perlin(1.2*uv.x + 4.*h)*0.03);
          lightning += glow2 * 0.3;
          light = smoothstep(5., 0., abs(uv.x - p));
      }
      return vec3(lightning);
    }
  
    void main(void){
      // 时间，思考，可以通过time调节降雨的大小
      float time = (czm_frameNumber / 60.0)*u_Speed;
      // 当前画布的uv坐标 （0,1） czm_viewport是ceisum着色器的内置变量 （0,1920）
      vec2 resolution = czm_viewport.zw;
      // 0-3
      // 给uv坐标做了自适应处理与居中处理
      vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);
      uv*=u_rainSize;
      vec3 c=vec3(.6,.7,.8);
      // 当前雨水的斜率
      float a=-.4;
      float si=sin(a),co=cos(a);
      // 倾斜了uv坐标
      uv*=mat2(co,-si,si,co);
      uv*=length(uv+vec2(0,4.9))*.3+1.;

      float v=1.-sin(hash(floor(uv.x*100.))*2.);
      float b=clamp(abs(sin(20.*time*v+uv.y*(5./(2.+v))))-.95,0.,1.)*20.;
      c*=v*b; 
      // 最后将雨水颜色vec4(c,1)和画布颜色texture2D(colorTexture, v_textureCoordinates)融合
      vec4 col=texture2D(colorTexture, v_textureCoordinates);
      // 雨水颜色
      vec4 rainCol=vec4(c,1.);

      // 闪电颜色
      vec2 uvLightning=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);

      vec3 lightningCol=renderlightning(uvLightning);

      // 不使用mix函数进行融合，而是直接相加，可以让界面不变昏暗
      gl_FragColor = col+vec4(c,1.)+vec4(lightningCol,1.);  
    }`,
  });
  return viewer.scene.postProcessStages.add(currentWeather);
};
// 添加降雪效果
const addSnowDay = () => {
  currentWeather = new Cesium.PostProcessStage({
    name: "snow",
    uniforms: {
      u_Speed: 0.5,
      u_rainSize: 2,
    },
    fragmentShader: /*glsl*/ `
      /////// I started playing around with some other things 
      /////// and then I looked out the window and felt inspired :)
      uniform sampler2D colorTexture;
      varying vec2 v_textureCoordinates;
      void main()
      {
          float snow = 0.0;
          vec2 resolution = czm_viewport.zw;
          float iTime=czm_frameNumber/120.;
          float gradient = (1.0-float(gl_FragCoord.y / resolution.x))*0.4;
          float random = fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))* 43758.5453);
          for(int k=0;k<6;k++){
              for(int i=0;i<12;i++){
                  float cellSize = 2.0 + (float(i)*3.0);
		      	float downSpeed = 0.3+(sin(iTime*0.4+float(k+i*20))+1.0)*0.00008;
                  vec2 uv = (gl_FragCoord.xy / resolution.x)+vec2(0.01*sin((iTime+float(k*6185))*0.6+float(i))*(5.0/float(i)),downSpeed*(iTime+float(k*1352))*(1.0/float(i)));
                  vec2 uvStep = (ceil((uv)*cellSize-vec2(0.5,0.5))/cellSize);
                  float x = fract(sin(dot(uvStep.xy,vec2(12.9898+float(k)*12.0,78.233+float(k)*315.156)))* 43758.5453+float(k)*12.0)-0.5;
                  float y = fract(sin(dot(uvStep.xy,vec2(62.2364+float(k)*23.0,94.674+float(k)*95.0)))* 62159.8432+float(k)*12.0)-0.5;
            
                  float randomMagnitude1 = sin(iTime*2.5)*0.7/cellSize;
                  float randomMagnitude2 = cos(iTime*2.5)*0.7/cellSize;
              
                  float d = 5.0*distance((uvStep.xy + vec2(x*sin(y),y)*randomMagnitude1 + vec2(y,x)*randomMagnitude2),uv.xy);
              
                  float omiVal = fract(sin(dot(uvStep.xy,vec2(32.4691,94.615)))* 31572.1684);
                  if(omiVal<0.08?true:false){
                      float newd = (x+1.0)*0.4*clamp(1.9-d*(15.0+(x*6.3))*(cellSize/1.4),0.0,1.0);
                      /*snow += d<(0.08+(x*0.3))/(cellSize/1.4)?
                          newd
                          :newd;*/
                      snow += newd;
                  }
              }
          }
          vec4 snowCol = vec4(snow)+gradient*vec4(0.4,0.8,1.0,0.0) + random*0.01;
          vec4 col=texture2D(colorTexture,v_textureCoordinates);

          gl_FragColor=col+snowCol;
      }
    `,
  });
 return viewer.scene.postProcessStages.add(currentWeather);
};
// 雾化天气，算法来自webgl编程指南
const addFogDay = () => {
  currentWeather = new Cesium.PostProcessStage({
    name: "fog",
    uniforms: {
      u_near: 200,
      u_far: 50000,
      u_fogCol: new Cesium.Color.fromCssColorString("#ddd"),
    },
    fragmentShader: /*glsl*/ `
      /////// I started playing around with some other things 
      /////// and then I looked out the window and felt inspired :)
      uniform sampler2D colorTexture;
      varying vec2 v_textureCoordinates;
      // 雾化的近面距离
      uniform float u_near;
      // 雾化的远面距离
      uniform float u_far;
      // 雾的颜色
      uniform vec4 u_fogCol;
      // cesium会送给我们一个深度纹理
      uniform sampler2D depthTexture;

      // 计算当前片元与相机之间的距离
      float getDistance(sampler2D depthTexture, vec2 texCoords) 
      { 
          //它用于将从深度纹理中读取到的深度值进行解压缩，以便在着色器中进行深度测试和深度值比较等操作。
          //深度纹理通常用于实现阴影效果、深度检测等功能。
          //在Cesium中，深度值通常被存储在一个16位的纹理单元中，这个值被压缩成0到1之间的浮点数，以便节省显存空间。
          float depth = czm_unpackDepth(texture2D(depthTexture, texCoords)); 
          //若深度值为0，则返回无穷远
          if (depth == 0.0) { 
              return czm_infinity; 
          } 
          //将窗口坐标系(即屏幕坐标系)下的像素坐标转换为相机坐标系下的坐标
          vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth); 
          //返回物体离相机的距离
          return -eyeCoordinate.z / eyeCoordinate.w; 
      }

      void main()
      {
        float distanceFragment=getDistance(depthTexture,v_textureCoordinates);
        // 场景本身的颜色
        vec4 col=texture2D(colorTexture,v_textureCoordinates);
        // 计算雾化因子 (距离-近面距离)/(远面距离-近面距离)
        float fogRate=clamp((distanceFragment-u_near)/(u_far-u_near),0.0,1.0);
        // 最后得到的颜色=本身的颜色和雾化因子颜色做一个混入
        gl_FragColor=mix(col,u_fogCol,fogRate);
      }
    `,
  });
 return viewer.scene.postProcessStages.add(currentWeather);
};



