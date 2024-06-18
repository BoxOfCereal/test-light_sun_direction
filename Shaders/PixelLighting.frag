#version 120

#define MULTIPLYER 0.8
#define DIFFUSE_MULTIPLYER 2.5
#define PIXELATE 2
#define LOG2 1.442695

uniform sampler2D Texture0;
uniform sampler2D normalMap;
uniform float enabledLights;
varying vec3 position;
varying vec3 normal;
//varying float fogFactor;
uniform vec2 resolution;
uniform float usesNormalMap;
//uniform vec3 color;
uniform float normalFlip;

void main()
{
	//vec2 st = gl_FragCoord.st/resolution;
	//gl_FragColor = vec4(st.x,st.y,0.0,1.0);
	//return;
	//gl_FragColor = vec4(color.x,color.y,color.z,1.0);
	//return;

	if (gl_FragCoord.z < position.z) {
		gl_FragColor = vec4(1, 1, 1, 1); 
		return;
	};
	/*gl_FogFragCoord = length(position);
	float fogFactor = 1 - exp2( -gl_Fog.density * 
					   gl_Fog.density * 
					   gl_FogFragCoord * 
					   gl_FogFragCoord * 
					   LOG2 );
	fogFactor = clamp(fogFactor, 0.0, 1.0);*/
	//float fogFactor = 1.0 - (gl_Fog.end + gl_FragCoord.z/gl_FragCoord.w) / (gl_Fog.end - gl_Fog.start);
	//fogFactor += 1.0;
	//fogFactor /= 2.0;
	//fogFactor = clamp(fogFactor, 0.0, 1.0);
	float depth = gl_FragCoord.z / gl_FragCoord.w;
	float fogFactor = (gl_Fog.end - depth) / (gl_Fog.end - gl_Fog.start);
	fogFactor = clamp(fogFactor, 0.0, 1.0);
	//float fogFactor = gl_Fog.start - (gl_Fog.end + ) / ;

	vec4 finalColor = gl_LightSource[0].sun / gl_LightSource[0].quadraticAttenuation * MULTIPLYER;
	vec3 lengthVector = gl_LightSource[0].position.xyz;
	vec3 normalizedLengthVector = normalize(lengthVector);
	float vectorLength = length(lengthVector);


//NormalMaps
	vec3 newNormal = normalize (texture2D(normalMap,gl_TexCoord[0].st).xyz*2.0 - 1.0);
	newNormal.y*=normalFlip;	//invert if directx normal
	vec3 fragTangent;
	vec3 fragBitangent;

	vec3 edge1 = dFdx(position);
	vec3 edge2 = dFdy(position);
	vec2 deltaUV1 = dFdx(gl_TexCoord[0].st);
	vec2 deltaUV2 = dFdy(gl_TexCoord[0].st);
	float f = 1.0 / (deltaUV1.x * deltaUV2.y - deltaUV2.x * deltaUV1.y);
	fragTangent = normalize(f * (deltaUV2.y * edge1 - deltaUV1.y * edge2));	
	fragBitangent = normalize(f * (-deltaUV2.x * edge1 + deltaUV1.x * edge2));

	vec3 T = normalize(fragTangent);
	vec3 B = normalize(fragBitangent);
	vec3 N = normalize(normal);
	mat3 TBN = mat3(T, B, N);
	vec3 normalWorld = normalize(TBN * newNormal);
	newNormal = normalWorld;

	//TODO: Replace conditional with a multiply or something
	if(usesNormalMap == 0) {
		newNormal = normal;
	}
//End_NormalMaps


	float NdotL = dot(newNormal, normalizedLengthVector);
		
	//Causes walls to light up when look at from the side (causes entire scene to light, should be world-based not screen/view-based)
	if (NdotL > 0.0) {
		float lightIntensity = max(0.0, NdotL);
		finalColor += lightIntensity * (gl_LightSource[0].diffuse / gl_LightSource[0].quadraticAttenuation * DIFFUSE_MULTIPLYER);
	};
	
	
	for (int i = 1; i < enabledLights; i++) {
		lengthVector = gl_LightSource[i].position.xyz - position;
		normalizedLengthVector = normalize(lengthVector);
		vectorLength = length(lengthVector);
		NdotL = dot(newNormal, normalizedLengthVector);
		if (NdotL > 0.0) {
			if (gl_LightSource[i].quadraticAttenuation > 0) {
				float lightAttenuation = NdotL * (1.f - vectorLength / gl_LightSource[i].quadraticAttenuation);
				if (gl_LightSource[i].spotCutoff == 180) {
					if (vectorLength < gl_LightSource[i].quadraticAttenuation) {
						finalColor += lightAttenuation * (gl_LightSource[i].diffuse / gl_LightSource[i].quadraticAttenuation * DIFFUSE_MULTIPLYER);
					};
				} else {
					float spotEffect = dot(normalize(gl_LightSource[i].spotDirection), -normalizedLengthVector);
					
					//Cutoff
					float outterCutoff = gl_LightSource[i].spotCosCutoff + 0.05;
					float innerCutoff = gl_LightSource[i].spotCosCutoff;
					float cutoffDifference = innerCutoff-outterCutoff;
					float cutoffEffect = 1 - clamp((spotEffect - outterCutoff) / cutoffDifference, 0.0, 1.0);
					
					if(spotEffect > gl_LightSource[i].spotCosCutoff) {
						float lightIntensity = max(0.0, lightAttenuation * cutoffEffect);
						lightIntensity*=100;
	
						finalColor += lightIntensity * (gl_LightSource[i].diffuse / gl_LightSource[i].quadraticAttenuation * DIFFUSE_MULTIPLYER);
					};
				};
			};
		};
	};
	
	finalColor.a = 1;
	vec4 texColor = texture2D(Texture0,gl_TexCoord[0].st);
	vec4 fogColor = gl_Fog.color;
	fogColor.a = texColor.a;
    	gl_FragColor = mix(fogColor, texColor * finalColor, fogFactor);  
}