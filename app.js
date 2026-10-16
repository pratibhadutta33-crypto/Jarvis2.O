/* JARVIS holographic UI. AI requests go to your separately hosted backend. */
const $ = (id) => document.getElementById(id);
const API_BASE = (localStorage.getItem("jarvis_api_base") || "").replace(/\/+$/, "");
const messages = $("messages");
let cameraStream = null, gestureRecognizer = null, gestureLoop = false, lastGesture = "", lastGestureAt = 0;
let recognition = null, toastTimer;
function toast(text){const el=$("toast");el.textContent=text;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3000)}
function clock(){const d=new Date();$("clock").textContent=d.toLocaleTimeString();$("localTime").textContent=d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});$("localDate").textContent=d.toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"});}
clock();setInterval(clock,1000);
function setState(state,caption=state){$("coreStatus").textContent=state.toUpperCase();$("coreCaption").textContent=caption.toUpperCase();$("neuralValue").textContent=state.toUpperCase();}
function addMessage(role,text){const wrap=document.createElement("div");wrap.className="message "+role;const tag=document.createElement("span");tag.className="message-tag";tag.textContent=role==="user"?"YOU":"JARVIS";const p=document.createElement("p");p.textContent=text;wrap.append(tag,p);messages.appendChild(wrap);messages.scrollTop=messages.scrollHeight;return p}
function speak(text){if(!("speechSynthesis" in window)){toast("Speech output isn't supported in this browser.");return}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=1.02;u.pitch=.92;u.onstart=()=>{$("voiceStatus").textContent="VOICE OUTPUT ACTIVE"};u.onend=()=>{$("voiceStatus").textContent="VOICE STANDBY"};window.speechSynthesis.speak(u)}
function localReply(text){const t=text.toLowerCase();if(/hello|hi jarvis|hey jarvis/.test(t))return "Hello. JARVIS interface is online. Connect the secure AI backend to enable open-ended conversation.";if(/time/.test(t))return "The local time is "+new Date().toLocaleTimeString()+".";
if(/gesture|help|commands/.test(t))return "Gesture map: open palm wakes the core, thumbs up speaks the system status, victory displays help, and a closed fist puts the interface in standby. Gesture recognition must be activated first.";
if(/who are you|your name/.test(t))return "I am JARVIS, your personal holographic assistant interface, created by Tonoy.";
return "I received your message. This is local demo mode, not a real AI response. Configure the backend URL in the setup guide to connect an AI model."}
async function sendMessage(text){text=(text||"").trim();if(!text)return;$("chatInput").value="";addMessage("user",text);setState("thinking","Processing transmission");document.body.classList.add("thinking");$("connection").textContent=API_BASE?"SECURE API LINK":"LOCAL DEMO MODE";
try{if(!API_BASE)throw new Error("DEMO");const res=await fetch(API_BASE+"/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Backend request failed");addMessage("assistant",data.reply);setState("online","Transmission received");$("uplinkValue").textContent="CONNECTED";speak(data.reply)}
catch(e){const reply=e.message==="DEMO"?localReply(text):"I couldn't reach the AI server. Check your backend URL and server status. ("+e.message+")";addMessage("assistant",reply);setState("standby","Local mode");$("uplinkValue").textContent="STANDBY";if(e.message==="DEMO")$("connection").textContent="LOCAL DEMO MODE"}
finally{document.body.classList.remove("thinking")}}
$("chatForm").addEventListener("submit",e=>{e.preventDefault();sendMessage($("chatInput").value)});
document.querySelectorAll("[data-prompt]").forEach(b=>b.addEventListener("click",()=>sendMessage(b.dataset.prompt)));
$("micBtn").addEventListener("click",()=>{
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){toast("Voice input isn't supported here. Type your message instead.");return}
 if(recognition){try{recognition.stop()}catch{}}
 recognition=new SR();recognition.lang=navigator.language||"en-IN";recognition.interimResults=false;recognition.maxAlternatives=1;
 recognition.onstart=()=>{document.body.classList.add("listening");$("voiceStatus").textContent="LISTENING…";setState("listening","Voice channel open")};
 recognition.onresult=e=>{const transcript=e.results[0][0].transcript;$("chatInput").value=transcript;sendMessage(transcript)};
 recognition.onerror=e=>toast("Voice input: "+e.error+". You can type instead.");
 recognition.onend=()=>{document.body.classList.remove("listening");$("voiceStatus").textContent="VOICE STANDBY"};
 try{recognition.start()}catch(e){toast("Couldn't start voice input. Try again.")}
});
/* Ambient particle field */
const canvas=$("particles"),ctx=canvas.getContext("2d");let particles=[];
function resizeCanvas(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;canvas.style.width=innerWidth+"px";canvas.style.height=innerHeight+"px";ctx.setTransform(dpr,0,0,dpr,0,0);const count=Math.min(95,Math.floor(innerWidth/14));particles=Array.from({length:count},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,r:Math.random()*1.5+.35}))}
function drawParticles(){ctx.clearRect(0,0,innerWidth,innerHeight);for(let i=0;i<particles.length;i++){const p=particles[i];p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>innerWidth)p.vx*=-1;if(p.y<0||p.y>innerHeight)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle="rgba(92,218,255,.6)";ctx.fill();for(let j=i+1;j<particles.length;j++){const q=particles[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy);if(d<95){ctx.strokeStyle=`rgba(61,178,230,${.11*(1-d/95)})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}}}requestAnimationFrame(drawParticles)}
addEventListener("resize",resizeCanvas);resizeCanvas();drawParticles();

const gestureNames={Open_Palm:"OPEN PALM",Closed_Fist:"CLOSED FIST",Thumb_Up:"THUMBS UP",Victory:"VICTORY",Pointing_Up:"POINTING UP",ILoveYou:"I LOVE YOU",Thumb_Down:"THUMBS DOWN"};
async function startCamera(){
 if(!navigator.mediaDevices?.getUserMedia){toast("Camera needs a supported browser and HTTPS.");return}
 $("cameraBtn").disabled=true;$("cameraBtn").textContent="INITIALIZING…";
 try{
  cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false});
  $("cameraVideo").srcObject=cameraStream;await $("cameraVideo").play();$("cameraFrame");
  document.querySelector(".camera-frame").classList.add("active");$("cameraPlaceholder").hidden=true;
  if(!window.vision?.GestureRecognizer||!window.vision?.FilesetResolver)throw new Error("MediaPipe library didn't load. Check your internet connection and reload.");
  const vision=await window.vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  gestureRecognizer=await window.vision.GestureRecognizer.createFromOptions(vision,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",delegate:"GPU"},runningMode:"VIDEO",numHands:1});
  gestureLoop=true;$("gestureStatus").textContent="ACTIVE";$("gestureHint").textContent="LOCAL CAMERA TRACKING";$("cameraBtn").textContent="DISABLE CAMERA";$("cameraBtn").disabled=false;$("cameraBtn").onclick=stopCamera;toast("Gesture engine active. Try an open palm.");detectFrame();
 }catch(e){stopCamera();toast("Camera setup failed: "+e.message);$("cameraBtn").textContent="RETRY CAMERA";$("cameraBtn").disabled=false}
}
function stopCamera(){gestureLoop=false;if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;gestureRecognizer=null;$("cameraVideo").srcObject=null;document.querySelector(".camera-frame").classList.remove("active");$("cameraPlaceholder").hidden=false;$("cameraPlaceholder").querySelector("small").textContent="CAMERA DISABLED";$("gestureStatus").textContent="OFFLINE";$("gestureHint").textContent="CAMERA NOT ACTIVE";$("gestureName").textContent="NONE";$("gestureConfidence").textContent="Confidence: --";$("cameraBtn").textContent="ACTIVATE CAMERA";$("cameraBtn").disabled=false;$("cameraBtn").onclick=startCamera}
$("cameraBtn").addEventListener("click",startCamera);
function detectFrame(){if(!gestureLoop||!gestureRecognizer)return;const video=$("cameraVideo");if(video.readyState>=2){try{const result=gestureRecognizer.recognizeForVideo(video,performance.now());const top=result.gestures?.[0]?.[0];if(top){const name=top.categoryName;$("gestureName").textContent=gestureNames[name]||name.replaceAll("_"," ").toUpperCase();$("gestureConfidence").textContent="Confidence: "+Math.round(top.score*100)+"%";if(name!==lastGesture||performance.now()-lastGestureAt>3500){lastGesture=name;lastGestureAt=performance.now();onGesture(name)}}else{$("gestureName").textContent="TRACKING…";$("gestureConfidence").textContent="Hand not classified"}}catch(e){console.warn("Gesture frame error",e)}}requestAnimationFrame(detectFrame)}
function onGesture(name){if(name==="Open_Palm"){setState("online","Open palm detected");$("coreCaption").textContent="GESTURE: WAKE CORE";}else if(name==="Thumb_Up"){speak("All systems are operational. The gesture engine is active.");}else if(name==="Victory"){toast("JARVIS gesture help: open palm wakes core; thumbs up speaks status; fist sets standby.");}else if(name==="Closed_Fist"){setState("standby","Standby gesture detected");$("coreCaption").textContent="STANDBY MODE";window.speechSynthesis?.cancel();}}
/* Optional backend endpoint can be changed in console or localStorage:
   localStorage.setItem('jarvis_api_base','https://your-backend.example.com') */
