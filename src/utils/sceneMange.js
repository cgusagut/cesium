/*
 * @Description:
 * @Author: your name
 * @version:
 * @Date: 2024-07-22 09:26:57
 * @LastEditors: your name
 * @LastEditTime: 2024-07-22 11:09:27
 */
import * as Cesium from "cesium";
import { TencentImageryProvider } from "./mapPlugin";
import SkyBoxOnGround from "./skyBoxRepiar";

export const addBaseMap = (viewer) => {
  // // 高德
  // const gaodeImageryProvider = new Cesium.UrlTemplateImageryProvider({
  //     url: "https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
  //     maximumLevel: 18,
  //     minimumLevel: 1,
  //     credit: "Amap",
  //   });
  // 如果加载的底图arcgis，腾讯高德，都会因为的坐标系的原因，导致和白膜对不上
  // TencentImageryProvider插件会把wgs84坐标系下的坐标都转为cgc02
  // 腾讯底图的第四套样式是暗色系的
  const tencentImageryProvider = new TencentImageryProvider({
    style: 4,
    crs: "WGS84",
  });

  viewer.scene.imageryLayers.addImageryProvider(tencentImageryProvider);
};
 // 将上海白膜添加进来
export const addTile3D = (viewer, url, cb) => {
  const tileset = new Cesium.Cesium3DTileset({
    url: url,
  });
  viewer.scene.primitives.add(tileset);

  tileset.readyPromise.then((res) => {
    viewer.zoomTo(tileset);
    cb && cb(tileset);
  });
};

// 1.加载geojson数据，获取到实体信息
// 2.通过实体信息，得到坐标信息
// 3.通过坐标构造geometry
// 4.构造水域的appearance 设置material材质为water

// 加载水域或者城市道路，使用primitive加载
export const addRiver = async (viewer, url) => {
  const data = await Cesium.GeoJsonDataSource.load(url);
  // 多边形实体
  const entities = data.entities.values;
  // 通过entity获取到多边形的坐标
  // 水域primitive的第一部分：instances
  const instances = [];
  entities.forEach((ent) => {
    // 通过getValue获取到多边形的坐标
    console.log(ent.polygon.hierarchy.getValue().positions);
    // 构造primitive instances modelMatrix appearance
    const geometry = new Cesium.GeometryInstance({
      geometry: new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(
          ent.polygon.hierarchy.getValue().positions
        ),
        extrudedHeight: 0,
        height: 1,
        vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
      }),
    });
    instances.push(geometry);
  });
  // 水域primitive的第二部分：appearance material材质为water
  // specularMap小范围的水域，不要加这个参数，会导致一部分水域不可见
  const appearance = new Cesium.MaterialAppearance({
    material: new Cesium.Material({
      fabric: {
        type: "Water",
        uniforms: {
          // 不要添加specularMap
          baseWaterColor: new Cesium.Color.fromCssColorString("#007acc"),
          blendColor: new Cesium.Color.fromCssColorString("#007acc"),
          normalMap: "/src/assets/waterNormals.jpg",
          frequency: 1000,
          animationSpeed: 0.2,
        },
      },
    }),
  });
  const waterPrimitive = viewer.scene.primitives.add(
    new Cesium.GroundPrimitive({
      geometryInstances: instances,
      appearance,
    })
  );
  return waterPrimitive;
};
// 设置大气层
export const addPostProgreeStage = (viewer) => {
  const stages = viewer.scene.postProcessStages;
  stages.fxaa.enabled = true;
  // 设置大气层效果
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.skyAtmosphere.atmosphereLightIntensity = 0.2;
  viewer.scene.shadowMap.enabled = true;
  // 设置场景泛光
  const bloom = viewer.scene.postProcessStages.bloom;
  bloom.enabled = true;
};
// 天空盒
export const addSkyBox = (viewer) => {
  // 加载完成之后发现天空盒是歪的，因为cesium的skybox接口有问题
  viewer.scene.skyBox = new SkyBoxOnGround({
    sources: {
      positiveX: "/src/assets/skyBox/03/px.jpg",
      negativeX: "/src/assets/skyBox/03/nx.jpg",
      positiveY: "/src/assets/skyBox/03/py.jpg",
      negativeY: "/src/assets/skyBox/03/ny.jpg",
      positiveZ: "/src/assets/skyBox/03/pz.jpg",
      negativeZ: "/src/assets/skyBox/03/nz.jpg",
    },
  });
};
// 下雨天
let currentWeather;
export const addRainDay = (viewer) => {
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
  viewer.scene.postProcessStages.add(currentWeather);
};
// 下雪天
export const addSnowDay = (viewer) => {
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
  viewer.scene.postProcessStages.add(currentWeather);
};
// 雾天
export const addFogDay = (viewer) => {
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
  viewer.scene.postProcessStages.add(currentWeather);
};

export const removeWeather = (viewer) => {
  currentWeather && viewer.scene.postProcessStages.remove(currentWeather);
  currentWeather = null;
};
// 夜景
// export const renderCustomShader = (tile) => {
//   const customShader = new Cesium.CustomShader({
//     uniforms: {
//       u_nightTexture: {
//         type: Cesium.UniformType.SAMPLER_2D,
//         // 这里的图片不能直接传，而是要使用TextureUniform构造一个图片对象
//         value: new Cesium.TextureUniform({
//           url: "/src/assets/wall.png",
//         }),
//       },
//     },
//     varyings: {
//       v_NormalMC: Cesium.VaryingType.VEC3,
//     },
//     // 定点着色器
//     vertexShaderText: /*glsl*/ `
//       void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
//         v_NormalMC=vsInput.attributes.normalMC;
//       }
//     `,
//     // 片元
//     fragmentShaderText: /*glsl*/ `
//       void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
//         vec3 positionMC=fsInput.attributes.positionMC;
//         // 定义贴图的像素大小
//         float width=50.;
//         float height=50.;
//         // 这里的实现原理类似于background-repeat
//         // fract获取到小数部分用于重复贴图
//         // positionMC.x/width相当于把一个三维模型的侧面展开，展开之后的x轴坐标
//         float u=fract(positionMC.x/width);
//         // 为什么这里不取y，而是取z呢，因为这个白膜的上方向是z不是y
//         float v=fract(positionMC.z/height);
//         vec3 nightCol=texture2D(u_nightTexture,vec2(u,v)).rgb;
//         vec3 col=vec3(0.1,0.1,0.1);
//         // 判断当前片元所在的法向量与上方向的夹角余弦，如果是大于0.9的话，说明夹角很小，已经渲染到了楼顶
//         if(dot(v_NormalMC,vec3(0.,0.,1.))<0.9){
//           col=nightCol;
//         }
//         material.diffuse=col;
//       }
//     `,
//   });
//   tile.customShader = customShader;
// };

export const renderCustomShader = (tile, shaderStr) => {
  const raidus=tile.boundingSphere.radius
  const customShader = new Cesium.CustomShader({
    uniforms: {
      u_nightTexture: {
        type: Cesium.UniformType.SAMPLER_2D,
        // 这里的图片不能直接传，而是要使用TextureUniform构造一个图片对象
        value: new Cesium.TextureUniform({
          url: "/src/assets/wall.png",
        }),
      },
      // 最高高度
      u_maxHeight: {
        type: Cesium.UniformType.FLOAT,
        value: 320.0,
      },
      // 地下模型的值
      u_baseHeight: {
        type: Cesium.UniformType.FLOAT,
        value: 380.0,
      },
      // 光圈速度
      u_ringSpeed: {
        type: Cesium.UniformType.FLOAT,
        value: 0.6,
      },
      // 光圈坐标
      // [121.44835554037566, 31.2328027614941]
      u_lightPosition: {
        type: Cesium.UniformType.VEC3,
        value: Cesium.Cartesian3.fromDegrees(
          121.4632,
          31.2415,
          1
        ),
      },
      u_lightColor: {
        type: Cesium.UniformType.VEC3,
        value: Cesium.Color.fromCssColorString("#e5c41a"),
      },
      u_lightRadius: {
        type: Cesium.UniformType.FLOAT,
        value: 2000,
      },
      u_envTexture:{
        type:Cesium.UniformType.SAMPLER_2D,
        value:new Cesium.TextureUniform({
          url:'/src/assets/pic.jpg'
        })
      },
      u_envRate:{
        type:Cesium.UniformType.FLOAT,
        value:0.5
      },
      u_min:{
        type:Cesium.UniformType.FLOAT,
        value:-raidus/4
    },
       u_max:{
        type:Cesium.UniformType.FLOAT,
        value:raidus/4
    },
    // 扫光面积
    u_scanWidth:{
      type:Cesium.UniformType.FLOAT,
      value:100.0
    }
    },
  
    varyings: {
      v_NormalMC: Cesium.VaryingType.VEC3,
    },
    vertexShaderText: /*glsl*/ `
          void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
            v_NormalMC=vsInput.attributes.normalMC;
          }
        `,
    fragmentShaderText: shaderStr,
  });
  tile.customShader = customShader;
};
