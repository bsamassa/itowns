/**
* 
* @author AD IGN
* Class generating shaders for projective texturing for one photo. This class can be used 
* to texture any mesh. We need to set the matrix of Orientation of the projector
* and its projective camera information.
*/

define (['GraphicEngine','lib/three','Ori','Shader','Utils','Draw'],
function (graphicEngine, THREE, Ori, Shader, Utils,Draw) {

            window.requestAnimSelectionAlpha = (function(){
                         return  window.requestAnimationFrame || 
                         window.webkitRequestAnimationFrame   || 
                         window.mozRequestAnimationFrame      || 
                         window.oRequestAnimationFrame        || 
                         window.msRequestAnimationFrame       || 
                         function(callback, element){
                             window.setTimeout(callback, 1000 / 60);
                         };
               })();
    
        var _initiated = false;
        var _alphaP = 1;
        var _shaderMat = null;
	var tabImages = [];  // Get the 20 images (>=10) to pass to shaders . Img at indice 0 is 21, 1 is 22, ... 10 is 21bis, 11 is 22bis... 19 is 43 bis
	var tabTranslations =[];
	var tabRotations=[];
	//initImages();    // Prepare image loading space used in the shaders, 20 img
	var tabMatrices = [];//var matrice21 //proj_cam* mv_current_21* rot21
	var tabMatMVP = [];
        var pat=new RegExp("-[0-9][0-9]-");  // To detect and change camera number
        
        var _texture = null;
        var _mobileVersion = 0;

        var _translation = new THREE.Vector4(0.,0.,0.,1.);
        var _matOriPos = null;  
        
        var _proj_cam  = new THREE.Matrix4(  1129.284,	0,	0.,	0.,
                                           0.,        1129.284,	0.,	0.,
                                           1042.178,  1020.435,	0.,	1.,
                                           0.,          0.,     0.,	0.);
        var _matMVP = null;                                 
                                           

        var rot21 = new THREE.Matrix4(	1,0,0,0,
                                        0,1,0,0,
                                        0,0,1,0,
                                        0,0,0,1);

        var mat300;


     
        var ProjectiveTexturingPhoto = {
         
            imgName:'',
            nbL2Loaded : 0,     // Indicate the number of image loaded at level2 
                             // If 10 then we can load level 3
                             // This technic allow to not load level 3 when navigating fast
                          
                
         init: function(matRot){
             
             _mobileVersion = graphicEngine.isMobileEnvironment() ? 1:0;
                // 1286	4	1621404,789	8173125,316	2295,630	0,1450	0,1570	-32,5938	209374,8182	1286.tif
             var posTest = new THREE.Vector3(1621404.789,8173125.316,2295.630);
             var rotX = 0.1450;
             var rotY = 0.1570;
             var rotZ = -32.5938; // axe des Z dans itowns too, ROLL
             var projItowns = new OpenLayers.Projection("EPSG:2154");
             var projCASQY  = new OpenLayers.Projection("EPSG:3949");  // Lambert93 CC49
             var p1 = new OpenLayers.Geometry.Point(posTest.x, posTest.y);
             p1 = p1.transform(projCASQY, projItowns);
             console.log(p1);
             
             //this.initPosOrientationCameraMatrice(p1.x,p1.z,p1.y,rotX,rotY,rotZ);
             this.initPosOrientationCameraMatrice(0,0,0,rotX,rotY,rotZ);
             
             this.initMatrices();
             
             this.initTranslations(p1,posTest.z);
             _initiated = true;
             
             this.createShaderForImage();
             
         },
         
         
         
         // Get Orientation matrices for camera, relatif
         // all cam in the same local ref
         initPosOrientationCameraMatrice: function(x,y,z,heading,pitch,roll){
            
          // _matOriPos = this.computeMatOriFromHeadingPitchRoll(heading,pitch,roll);
              heading = parseFloat(heading) / 180 * Math.PI ;  // Deg to Rad // Axe Y
              pitch   = parseFloat(pitch)   / 180 * Math.PI ;  // Deg to Rad // axe X
              roll    = parseFloat(roll)    / 180 * Math.PI ;  // Deg to Rad   // axe Z
             var m = new THREE.Matrix4();
             m.makeRotationFromEuler(new THREE.Euler(roll,0,0,"ZYX"));
             //m.makeRotationZ(Math.PI/2);
           _matOriPos = m;

         },
         

          computeMatOriFromHeadingPitchRoll: function(heading,pitch,roll){
              
              heading = parseFloat(heading) / 180 * Math.PI ;  // Deg to Rad // Axe Y
              pitch   = parseFloat(pitch)   / 180 * Math.PI ;  // Deg to Rad // axe X
              roll    = parseFloat(roll)    / 180 * Math.PI ;  // Deg to Rad   // axe Z
              console.log("heading,pitch,roll ",heading,pitch,roll );
              
              // With quaternion  //set rotation.order to "YXZ", which is equivalent to "heading, pitch, and roll"
              var q = new THREE.Quaternion();
              //q.setFromEuler(new THREE.Euler(heading,pitch,roll,'YXZ'),true);
              q.setFromEuler(new THREE.Euler(roll,heading,pitch,'YXZ'),true);
              var matTotale = new THREE.Matrix4().makeRotationFromQuaternion(q);//qRoll);//quater);
              
              return matTotale;//.transpose(); //mat2 //matRotation;
          },
          
          
          getProjCam: function(num){
               
              _proj_cam = new THREE.Matrix4( 200,	0,	0.,	0.,
                                             0.,       200,	0.,	0.,
                                             200,      200,	0.,	1.,
                                             0.,        0.,     0.,	0.);
                                           
          },
              
                
         // Initialize matrices using global rotation (21) and local for each cam
         initMatrices: function(){
             
            _matMVP = new THREE.Matrix4().multiplyMatrices(_matOriPos,_proj_cam).transpose();  // Don't forget to transpose before sending to GPU
           
            // _matMVP = require("ProjectiveTexturing2").getTabMatrices()[0];//new THREE.Matrix4();
            console.log("_matMVP",_matMVP);

         },
         
         
         // Init translation using cam pos in applanix ref and global rotation
         initTranslations: function(point,alti){
             
             var zero = graphicEngine.getZeroAsVec3D();
             _translation = new THREE.Vector4(point.x - zero.x,alti - zero.y,point.y - zero.z);
             console.log(_translation);
             Draw.drawSphereAt(_translation,20);
             //var translation300 = Ori.getSommet(300).clone().applyProjection( rot21.clone()); translation300.w = 1;
             //tabTranslations.push(translation300);

             
         },
         
         
        // Init Images, Rotations and Translations
	initImages: function(){

            for(var i = 0; i< 10; ++i){
                var img = new Image(); img.crossOrigin = 'anonymous';
                tabImages.push(img);
                tabRotations.push(rot21);
            }
	},
         
         
       createShaderForImage: function(imgUrl,qlt){

           
            var width = 1920;
            var height = 1080;

            var distoAndMax300 = new THREE.Vector4(0,0,0,0);//Ori.getDistortionAndR2ForCamAsVec4(300);

            var wid = _mobileVersion == 1 ? 512:1024;
            var uniforms5 = {
                
                    //disto_and_max_tab:{type: 'fv1', value: arrAllDistoandMax},
                    intrinsic300: {type:"v4",value:distoAndMax300},

                    alpha:{type:'f',value:_alphaP},
                    fog:  { type: "i", value: 0 }, 

                    mvpp_current_0:{type: 'm4',value: _matMVP},
                    factorTranslation0:{type:"v4",value: _translation},

                    texture0: {
                            type: 't',
                            value: THREE.ImageUtils.loadTexture("http://www.itowns.fr/casqy/obliques/499_1286S.jpg")  
                    }
                   
            };

            // create the shader material for Three
            _shaderMat = new THREE.ShaderMaterial({
                    uniforms:     	uniforms5,
                    vertexShader:   Shader.shaders['shaderTextureProjectivePhoto.vs'],
                    fragmentShader: Shader.shaders['shaderTextureProjectivePhoto.fs'],
                    side: THREE.BackSide,   
                    transparent:true
            });

            return _shaderMat;
	},

        changePanoTextureAfterloading: function (imgName,wid,qlt,translation,rotation,nbLevel){

             //console.log("changePanoTextureAfterloading");
             this.imgName = imgName;
             this.nbL2Loaded = 0;
             require("Cartography3D").tweenGeneralOpacity();
                          
             this.chargeOneImageCam(imgName,'texture1',1,wid,qlt,translation,rotation,6,nbLevel);
             this.chargeOneImageCam(imgName,'texture2',2,wid,qlt,translation,rotation,7,nbLevel);
             this.chargeOneImageCam(imgName,'texture3',3,wid,qlt,translation,rotation,8,nbLevel);
             this.chargeOneImageCam(imgName,'texture4',4,wid,qlt,translation,rotation,9,nbLevel);
             this.chargeOneImageCam(imgName,'texture0',0,wid,qlt,translation,rotation,5,nbLevel);
        },
        
          changePanoTextureAfterloadingTurboTruckMode: function (imgName,wid,qlt,translation,rotation,nbLevel){
            
             //console.log("changePanoTextureAfterloading");
             this.imgName = imgName;
             this.nbL2Loaded = 0;
             this.chargeOneImageCam(imgName,'texture1',1,512,85,translation,rotation,6,0);
    
        },
        
        
         // Load an Image(html) then use it as a texture. Wait loading before passing to the shader to avoid black effect
         // Param nbLevel means if we load a better level or not. 0 or 1
        chargeOneImageCam: function (imgName,nameTexture,num,wid,qlt,translation,rotation,numImg,nbLevel){
           
            // We tell the shader that the actual new texture has to become the old one to make a new transition with the real new one just loaded.
            if(_mobileVersion==0){
                _shaderMat.uniforms[nameTexture].value =_shaderMat.uniforms[nameTexture+'bis'].value;
                _shaderMat.uniforms['factorTranslation'+num].value = tabTranslations[numImg];
                _shaderMat.uniforms['mvpp_current_'+num].value = tabMatrices[numImg];
            }

            var translationPlusSom = translation.clone().add((Ori.getSommet(300+num).clone().applyProjection( rotation.clone()))); translationPlusSom.w = 1;
            tabTranslations[numImg] = translationPlusSom; 		
            tabMatrices[numImg] = (new THREE.Matrix4().multiplyMatrices( rotation.clone(),tabMatMVP[numImg - 5].clone()) ).transpose();
              
            // Load the new image
            var img = new Image(); img.crossOrigin = 'anonymous';
            var that = this;
            img.onload = function () { 
                
                _shaderMat.uniforms['indice_time'+num].value = .8; //if(num==1) console.log('now!');
                _shaderMat.uniforms['mvpp_current_'+num+'bis'].value = tabMatrices[numImg];
                _shaderMat.uniforms['factorTranslation'+num+'bis'].value = translationPlusSom;
                
                _shaderMat.uniforms[nameTexture+'bis'].value = new THREE.Texture(this,THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping, THREE.LinearFilter,THREE.LinearFilter,THREE.RGBFormat);
                _shaderMat.uniforms[nameTexture+'bis'].value.needsUpdate = true;
                if(nbLevel==1) that.changeQuality(imgName,nameTexture,num,512,qlt,numImg);  // Load level 2
                //if(graphicEngine.getSpeedTurnCam() != 0.1 && num == 3) graphicEngine.setSpeedTurnCam(0.1);
            };
            img.src = "http://www.itowns.fr/cgi-bin/iipsrv.fcgi?FIF=/iipimagesV2/"+imgName.replace(pat,"-30"+num+"-")+".jp2&WID="+wid+"&QLT="+qlt+"&CVT=JPEG";
        },
        
        
           // Load Better Quality. Level 2 (512@50) and 3 (1920@80).
           changeQuality: function(imgName,nameTexture,num,wid,qlt){
               
                var that = this;
                var img = new Image(); img.crossOrigin = 'anonymous';
                img.src = "http://www.itowns.fr/cgi-bin/iipsrv.fcgi?FIF=/iipimagesV2/"+imgName.replace(pat,"-30"+num+"-")+".jp2&WID="+wid+"&QLT="+qlt+"&CVT=JPEG";
                img.onload = function () { 
                        //tabImages[num+5] = this;
                        _shaderMat.uniforms[nameTexture+'bis'].value = new THREE.Texture(this,THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping, THREE.LinearFilter,THREE.LinearFilter,THREE.RGBFormat);
                        _shaderMat.uniforms[nameTexture+'bis'].value.needsUpdate = true;
                        if(qlt == 50) that.nbL2Loaded++; 
                        if(graphicEngine.getSpeedTurnCam() != 0.1 && num == 3) {graphicEngine.setSpeedTurnCam(0.1); } //require("Cartography3D").setOpacity(0.4);
                }
           },
           
               
           
           // Recursive function
           // After load image load next one etc at same level
           changeQualitySerial: function(tabImageToLoad,imgName,wid,qlt){

                    var num = tabImageToLoad.shift(); 
                    var nameTexture = 'texture'+num;
                    var that = this;
                    var img = new Image(); img.crossOrigin = 'anonymous';
                    img.src = "http://www.itowns.fr/cgi-bin/iipsrv.fcgi?FIF=/iipimagesV2/"+imgName.replace(pat,"-30"+num+"-")+".jp2&WID="+wid+"&QLT="+qlt+"&CVT=JPEG";
                    img.onload = function () { 
                        
                        if (that.imgName == imgName){
                            //tabImages[num+5] = this;
                            tabImages[parseInt(num)+5] = this;
                            _shaderMat.uniforms[nameTexture+'bis'].value = new THREE.Texture(this,THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping, THREE.LinearFilter,THREE.LinearFilter,THREE.RGBFormat);
                            _shaderMat.uniforms[nameTexture+'bis'].value.needsUpdate = true;

                            if(qlt == 50) that.nbL2Loaded++;
                            if(tabImageToLoad.length>0) that.changeQualitySerial(tabImageToLoad,imgName,wid,qlt); 
                       }
                            
                    }  
           },    
           
           
           loadQualityLevel: function(wid,qlt,imgName){

                //setTimeout(function(){ProjectiveTexturing.loadQualityLevelNow(1920,80,imgName);},2000);  
                setTimeout(function(){ProjectiveTexturing2.loadQualityLevelNowSerial(wid,qlt,imgName);},2000);  
           },
           
  
           // Serial launch
           loadQualityLevelNowSerial: function(wid,qlt,imgName){

                if (this.imgName==imgName){    // Means that we are still in the same image
                   console.log(this.imgName);
                   console.log('load level3');   // waiting for higher resolution
                   var tabImageToLoad = ['0','1','2','3','4'];
                   this.changeQualitySerial(tabImageToLoad,this.imgName,wid,qlt);
               }

               //this.nbL2Loaded = 0;
           },

           
           // Return a i,j coordinate in the image where it projects from a 3D position. Same as the original GPU code
           groundToImage: function(pos){

                var newpos0 = pos.clone().sub( _shaderMat.uniforms['factorTranslation0bis'].value); 
                var newpos1 = pos.clone().sub( _shaderMat.uniforms['factorTranslation1bis'].value); 
                var newpos2 = pos.clone().sub( _shaderMat.uniforms['factorTranslation2bis'].value); 
                var newpos3 = pos.clone().sub( _shaderMat.uniforms['factorTranslation3bis'].value); 
                var newpos4 = pos.clone().sub( _shaderMat.uniforms['factorTranslation4bis'].value); 
                
                var v_texcoord0bis =  _shaderMat.uniforms['mvpp_current_0bis'].value.multiplyVector4( new THREE.Vector4(newpos0.x, newpos0.y,newpos0.z,1));
                var v_texcoord1bis =  _shaderMat.uniforms['mvpp_current_1bis'].value.multiplyVector4( new THREE.Vector4(newpos1.x, newpos1.y,newpos1.z,1));
                var v_texcoord2bis =  _shaderMat.uniforms['mvpp_current_2bis'].value.multiplyVector4( new THREE.Vector4(newpos2.x, newpos2.y,newpos2.z,1));
                var v_texcoord3bis =  _shaderMat.uniforms['mvpp_current_3bis'].value.multiplyVector4( new THREE.Vector4(newpos3.x, newpos3.y,newpos3.z,1));
                var v_texcoord4bis =  _shaderMat.uniforms['mvpp_current_4bis'].value.multiplyVector4( new THREE.Vector4(newpos4.x, newpos4.y,newpos4.z,1));

                var corrected0bis = this.correctDistortionAndCoord(_shaderMat.uniforms['intrinsic300'].value, v_texcoord0bis.clone());
                var corrected1bis = this.correctDistortionAndCoord(_shaderMat.uniforms['intrinsic301'].value, v_texcoord1bis.clone());
                var corrected2bis = this.correctDistortionAndCoord(_shaderMat.uniforms['intrinsic302'].value, v_texcoord2bis.clone());
                var corrected3bis = this.correctDistortionAndCoord(_shaderMat.uniforms['intrinsic303'].value, v_texcoord3bis.clone());
                var corrected4bis = this.correctDistortionAndCoord(_shaderMat.uniforms['intrinsic304'].value, v_texcoord4bis.clone());
                
                // z is actually representing w
                var coordImage;
                if(corrected0bis.x > 0 && corrected0bis.y>0 && corrected0bis.z >0)
                        {coordImage = corrected0bis; coordImage.z = 0;}
                 else
                   if(corrected1bis.x > 0 && corrected1bis.y>0 && corrected1bis.z >0)
                        {coordImage = corrected1bis; coordImage.z = 1;}
                  else
                    if(corrected2bis.x > 0 && corrected2bis.y>0 && corrected2bis.z >0)
                        {coordImage = corrected2bis; coordImage.z = 2;}
                  else
                    if(corrected3bis.x > 0 && corrected3bis.y>0 && corrected3bis.z >0)
                        {coordImage = corrected3bis; coordImage.z = 3;}
                  else
                    if(corrected4bis.x > 0 && corrected4bis.y>0 && corrected4bis.z >0)
                        {coordImage = corrected4bis; coordImage.z = 4;}
                
                var pat = new RegExp("-[0-9][0-9]-");  // To detect and change camera number
                console.log(this.imgName);
                var imgName = this.imgName.replace(pat,"-30"+coordImage.z+"-").replace(/^.*[\\\/]/, '');
                var infoIJ = {i: coordImage.x*2048,j: coordImage.y*2048, imgName:imgName};
                return infoIJ;
               
           },
          

        
           correctDistortionAndCoord: function(dist,v_texcoord){
               
                 var cpps = 1042.178;
                 var lpps = 1020.435;
                 var width = 2048.0;
                 var height = 2048.0;
                 // vec2 pps = vec2(cpps,lpps);
            
                //var v = v_texcoord.xy/v_texcoord.w - pps;
                var v_b = new THREE.Vector3(v_texcoord.x/v_texcoord.w - cpps,
                                            v_texcoord.y/v_texcoord.w - lpps,
                                            0);
                            
                var v2 = v_b.dot(v_b);

                if(v2>dist.w) 
                    return new THREE.Vector3(-2.,-2.,-2.); // false;
                
                var  r = v2*(dist.x+v2*(dist.y+v2*dist.z));

                //var  normCoord = v_texcoord.xy/(v_texcoord.w) + r*v;
                var  normCoord = new THREE.Vector3(v_texcoord.x/v_texcoord.w + r*v_b.x,
                                                   v_texcoord.y/v_texcoord.w + r*v_b.y,
                                                   0);

                return new THREE.Vector3(normCoord.x/width , 1. - normCoord.y/height, v_texcoord.w); 
                //vec2(normCoord.x/width , 1. - normCoord.y/height); 
        },
                
           changeDistortion: function(){
            
            if(_shaderMat.uniforms['r3'].value != 0.){
                
                _shaderMat.uniforms['r3'].value = 0.;
                _shaderMat.uniforms['r5'].value = 0.;
                _shaderMat.uniforms['r7'].value = 0.;

                _shaderMat.uniforms['r30'].value = 0.;
                _shaderMat.uniforms['r50'].value = 0.;
                _shaderMat.uniforms['r70'].value = 0.;

            }
            else
                {

                _shaderMat.uniforms['r3'].value = -1.414241e-007;
                _shaderMat.uniforms['r5'].value = 3.56829e-014;
                _shaderMat.uniforms['r7'].value = -4.239262e-021;

                _shaderMat.uniforms['r30'].value = -1.335994e-007;
                _shaderMat.uniforms['r50'].value = 3.335513e-014;
                _shaderMat.uniforms['r70'].value = -3.928705e-021;
            }
              
            _shaderMat.uniforms['r3'].value.needsUpdate = true;
            _shaderMat.uniforms['r5'].value.needsUpdate = true;
            _shaderMat.uniforms['r7'].value.needsUpdate = true;
            _shaderMat.uniforms['r30'].value.needsUpdate = true;
            _shaderMat.uniforms['r50'].value.needsUpdate = true;
            _shaderMat.uniforms['r70'].value.needsUpdate = true;
        },
        
        
        changeBlending: function(){
            
            if( _shaderMat.uniforms['blendingOn'].value == 1)
                   _shaderMat.uniforms['blendingOn'].value = 0;
               else
                   _shaderMat.uniforms['blendingOn'].value = 1;

           _shaderMat.uniforms['blendingOn'].value.needsUpdate = true;
            
        },


       getShaderMat: function(){
          return _shaderMat;  
        },
        
        
        isInitiated: function(){
            return _initiated;
        },
       
        
        tweenGeneralOpacity: function(){
            console.log(" tweenGeneralOpacity");
            var i = _shaderMat.uniforms.alpha.value;
            if(i>0){
                i -= (1- (i-0.01))*0.02;
                if(i<0) i=0;
                _shaderMat.uniforms.alpha.value = i;
            }	
           requestAnimSelectionAlpha(this.tweenGeneralOpacity.bind(this));
        },
        
        tweenGeneralOpacityUp: function(){
            //console.log(" tweenGeneralOpacity", _shaderMat.uniforms.alpha.value);
            var i = _shaderMat.uniforms.alpha.value;
            if(i<1){
                i += ((i+0.01))*0.04;
                if(i>1) i=1;   
                _shaderMat.uniforms.alpha.value = i;
                
                requestAnimSelectionAlpha(this.tweenGeneralOpacityUp.bind(this));
            }	
          
        },
        
        
        setGeneralOpacity: function(value){
            _alphaP = value;
            _shaderMat.uniforms.alpha.value = _alphaP;
        },
        
        
        setFogValue: function(v){
           _shaderMat.uniforms.fog.value = v;
        },
        	
                
	tweenAllIndiceTimes: function (){
           
            this.tweenIndiceTime(0);
            this.tweenIndiceTime(1);
            this.tweenIndiceTime(2);
            this.tweenIndiceTime(3);
            this.tweenIndiceTime(4);
          
            if(this.nbL2Loaded==5 && _mobileVersion==0) {           // Test to load Level 3
                    this.nbL2Loaded=0;
                    this.loadQualityLevel(2048,80,this.imgName);
            }

            requestAnimSelectionAlpha(this.tweenAllIndiceTimes.bind(this));
	},
	
        
	tweenIndiceTime: function (num){

            var i = _shaderMat.uniforms['indice_time'+num].value;
            if(i>0){
                i -= (1- (i-0.01))*0.08;
                if(i<0) i=0;
                _shaderMat.uniforms['indice_time'+num].value = i;
            }	
	},
        
        
        setIndiceTimeCam: function(num,time){
            _shaderMat.uniforms['indice_time'+num].value = time;
        },
	
        
        setRotationHeading: function(rot){
                
           rot21 = rot;
        }
        
        
     }
     return ProjectiveTexturingPhoto
  }
  
)
         