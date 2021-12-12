
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

var globalGain = audioCtx.createGain();
globalGain.connect(audioCtx.destination);


const trebleNoteToFreq = {
  'd4'    :293.66,
  'ds4'   :311.13,
  'e4'    :329.63,
  'f4'    :349.23,
  'fs4'   :369.99,
  'g4'    :392.00,
  'gs4'   :415.30,
  'a4'    :440.00,
  'as4'   :466.16,
  'b4'    :493.88,
  'c5'    :523.25,
  'cs5'   :554.37,
  'd5'    :587.33
}

const bassNoteToFreq = {
  'd2'    :73.42,
  'ds2'   :77.78,
  'e2'    :82.41,
  'f2'    :87.31,
  'fs2'   :92.50,
  'g2'    :98.00,
  'gs2'   :103.83,
  'a2'    :110.00,
  'as2'   :116.54,
  'b2'    :123.47,
  'c3'    :130.81,
  'cs3'   :138.59,
  'd3'    :146.83
}

var samplesNames = ['ride', 'crash', 'hat2', 'hat1',
                    'shaker', 'clap', 'rim2', 'rim1',
                    'snare', 'tom', 'kick']


var trebleAmOnOff = 0;
var trebleAmFreq = 100;

var bassAmOnOff = 0;
var bassAmFreq = 100;

var trebleLPFOnOff = 0;
var trebleLPFFreq = 10000;

var bassLPFOnOff = 0;
var bassLPFFreq = 10000;

var trebleVibOnOff = 0;
var trebleVibFreq = 10;
var trebleVibDepth = 50;

// var trebleDelayOnOff = 0;
// var trebleDelayTime = 1;
// var trebleDelayFeedback = 0.5;

var sampleLPFOnOff = {}
for(var name of samplesNames){
  sampleLPFOnOff[name] = 0;
}
var sampleLPFFreqs = {}
for(var name of samplesNames){
  sampleLPFFreqs[name] = 10000;
}

var convolveAlternative = 0;
var convolveVice = 0;
var convolveTrump = 0;
async function createConv(file) {
    let convolver = audioCtx.createConvolver();
    // load impulse response from file
    let response     = await fetch("samples/"+file+".mp3");
    let arraybuffer  = await response.arrayBuffer();
    convolver.buffer = await audioCtx.decodeAudioData(arraybuffer);
    return convolver;
}


var sampleSources = {}
for (var name of samplesNames){
    var sampleElement = document.getElementById(name);
    var sampleSource = audioCtx.createMediaElementSource(sampleElement);
    sampleSources[name] = [sampleElement, sampleSource]
}


var sampleChains;
async function initSamples(){
  sampleChains = {};
  for (var name in sampleSources){
    let sampleElement = sampleSources[name][0];
    let sampleSource = sampleSources[name][1];
    sampleSource.disconnect()
    var sampleGain = audioCtx.createGain();

    if(sampleLPFOnOff[name]){
      var lowPassFilter = audioCtx.createBiquadFilter();
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.value = sampleLPFFreqs[name];
    }
    if(convolveAlternative){
      var altConvolve = await createConv("alternative");
    }
    if(convolveVice){
      var viceConvolve = await createConv("mrvicepres")
    }
    if(convolveTrump){
      var trumpConvolve = await createConv("trump")
    }

    chain = sampleSource;
    if(sampleLPFOnOff[name]){
      chain = chain.connect(lowPassFilter);
    }
    if(convolveAlternative){
      chain = chain.connect(altConvolve);
    }
    if(convolveVice){
      chain = chain.connect(viceConvolve);
    }
    if(convolveTrump){
      chain = chain.connect(trumpConvolve);
    }
    chain = chain.connect(sampleGain).connect(globalGain)

    var sampleNodes = {"element" : sampleElement, "gain" : sampleGain}
    if(sampleLPFOnOff[name]){
      sampleNodes["lowPassFilter"] = lowPassFilter;
    }
    sampleChains[name] = sampleNodes
  }
  return null;
}




var trebleOscs;
var bassOscs;
function initTrebleOscs(){
  trebleOscs = {};
  for (var key in trebleNoteToFreq) {
      // MAKE THE OSCILLATOR
      let osc = audioCtx.createOscillator();
      let gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(trebleNoteToFreq[key], audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);

      // MAKE THE EFFECTS
      if(trebleAmOnOff){
        var trebleModulatorFreq = audioCtx.createOscillator();
        trebleModulatorFreq.frequency.value = trebleAmFreq;
        var trebleModulated = audioCtx.createGain();
        var trebleDepth = audioCtx.createGain();
        trebleDepth.gain.value = 0.5;
        trebleModulated.gain.value = 1.0 - trebleDepth.gain.value;
        trebleModulatorFreq.connect(trebleDepth);
        trebleDepth.connect(trebleModulated.gain);
      }
      if(trebleLPFOnOff){
        var lowPassFilter = audioCtx.createBiquadFilter();
        lowPassFilter.type = "lowpass";
        lowPassFilter.frequency.value = trebleLPFFreq;
      }
      // if(trebleDelayOnOff){
      //   var delayNode = audioCtx.createDelay(2);
      //   delayNode.delayTime.setValueAtTime(trebleDelayTime, audioCtx.currentTime);
      //   var feedbackNode = audioCtx.createGain();
      //   feedbackNode.gain.setValueAtTime(trebleDelayFeedback, audioCtx.currentTime);
      // }
      if(trebleVibOnOff){
        var vibOsc = audioCtx.createOscillator();
        var vibIndex = audioCtx.createGain();
        vibIndex.gain.value = trebleVibDepth;
        vibOsc.frequency.value = trebleVibFreq;

        vibOsc.connect(vibIndex);
        vibIndex.connect(osc.frequency);
        vibOsc.start();
      }

      // CONNECT IT ALL
      var chain;
      if(trebleAmOnOff){
        chain = osc.connect(trebleModulated);
      } else {
        chain = osc;
      }
      if(trebleLPFOnOff){
        chain = chain.connect(lowPassFilter)
      }
      chain = chain.connect(gain)
      // if(trebleDelayOnOff){
      //   chain.connect(globalGain)
      //   delayNode.connect(feedbackNode);
      //   feedbackNode.connect(delayNode);
      //   chain = chain.connect(delayNode);
      // }
      chain = chain.connect(globalGain)

      // INSERT INTO THE TREBLEOSCS DICTIONARY
      var oscNodes = {"osc" : osc, "gain" : gain}
      if (trebleAmOnOff){
        oscNodes["trebleModulatorFreq"] = trebleModulatorFreq;
      }
      if(trebleLPFOnOff){
        oscNodes["lowPassFilter"] = lowPassFilter;
      }
      // if(trebleDelayOnOff){
      //   oscNodes["delay"] = delayNode;
      //   oscNodes["feedback"] = feedbackNode;
      // }
      if(trebleVibOnOff){
        oscNodes["vibOsc"] = vibOsc;
        oscNodes["vibIndex"] = vibIndex;
      }
      trebleOscs[key] = oscNodes;
  }
}


function initBassOscs(){
  bassOscs = {};
  for (var key in bassNoteToFreq) {
      // MAKE THE OSCILLATOR
      let osc = audioCtx.createOscillator();
      let gain = audioCtx.createGain();
      osc.frequency.value = bassNoteToFreq[key];
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      osc.type = 'sawtooth';

      // MAKE THE EFFECTS
      if(bassAmOnOff){
        var bassModulatorFreq = audioCtx.createOscillator();
        bassModulatorFreq.frequency.value = bassAmFreq;
        var bassModulated = audioCtx.createGain();
        var bassDepth = audioCtx.createGain();
        bassDepth.gain.value = 0.5;
        bassModulated.gain.value = 1.0 - bassDepth.gain.value;
        bassModulatorFreq.connect(bassDepth);
        bassDepth.connect(bassModulated.gain);
      }
      if(bassLPFOnOff){
        var lowPassFilter = audioCtx.createBiquadFilter();
        lowPassFilter.type = "lowpass";
        lowPassFilter.frequency.value = bassLPFFreq;
      }

      // CONNECT IT ALL
      var chain;
      if(bassAmOnOff){
        chain = osc.connect(bassModulated);
      } else {
        chain = osc;
      }
      if(bassLPFOnOff){
        chain = chain.connect(lowPassFilter)
      }
      chain = chain.connect(gain)
      chain = chain.connect(globalGain)


      // INSERT INTO THE BASSOSCS DICTIONARY
      var oscNodes = {"osc" : osc, "gain" : gain}
      if (bassAmOnOff){
        oscNodes["bassModulatorFreq"] = bassModulatorFreq;
      }
      if(bassLPFOnOff){
        oscNodes["lowPassFilter"] = lowPassFilter;
      }
      bassOscs[key] = oscNodes;
  }
}

function startTrebleOscs(){
    for (var key in trebleOscs){
        trebleOscs[key]["osc"].start();
        if (trebleAmOnOff){
          trebleOscs[key]["trebleModulatorFreq"].start();
        }
    }
}

function startBassOscs(){
    for (var key in bassOscs){
        bassOscs[key]["osc"].start();
        if (bassAmOnOff){
          bassOscs[key]["bassModulatorFreq"].start();
        }
    }
}

function stopTrebleOscs(){
    for (var key in trebleOscs){
        trebleOscs[key]["osc"].stop();
        if (trebleAmOnOff){
          trebleOscs[key]["trebleModulatorFreq"].stop();
        }
    }
}

function stopBassOscs(){
    for (var key in bassOscs){
        bassOscs[key]["osc"].stop();
        if (bassAmOnOff){
          bassOscs[key]["bassModulatorFreq"].stop();
        }
    }
}



function updateTrebleAMFreq(val) {
  if(trebleAmOnOff){
    trebleAmFreq = val;
    for(var key in trebleOscs){
      trebleOscs[key]["trebleModulatorFreq"].frequency.value = trebleAmFreq;
    }
  }
};

function updateBassAMFreq(val) {
  if(bassAmOnOff){
    bassAmFreq = val;
    for(var key in bassOscs){
      bassOscs[key]["bassModulatorFreq"].frequency.value = bassAmFreq;
    }
  }
};

function updateTVibFreq(val){
  if(trebleVibOnOff){
    trebleVibFreq = val;
    for(var key in trebleOscs){
      trebleOscs[key]["vibOsc"].frequency.value = trebleVibFreq;
    }
  }
}

function updateTVibDepth(val){
  if(trebleVibOnOff){
    trebleVibDepth = val;
    for(var key in trebleOscs){
      trebleOscs[key]["vibIndex"].gain.value = trebleVibDepth;
    }
  }
}

// function updateTDelayTime(val){
//   if(trebleDelayOnOff){
//     trebleDelayTime = val;
//     for(var key in trebleOscs){
//       trebleOscs[key]["delay"].delayTime.setValueAtTime(trebleDelayTime, audioCtx.currentTime);
//     }
//   }
// }
//
// function updateTDelayFeedback(val){
//   if(trebleDelayOnOff){
//     trebleDelayFeedback = val;
//     for(var key in trebleOscs){
//       trebleOscs[key]["feedback"].gain.setValueAtTime(trebleDelayFeedback, audioCtx.currentTime);
//     }
//   }
// }

function updateTrebleLPFFreq(val) {
  if(trebleLPFOnOff){
    trebleLPFFreq = val;
    for(var key in trebleOscs){
      trebleLPFFreq = val;
      trebleOscs[key]["lowPassFilter"].frequency.value = trebleLPFFreq;
    }
  }
}

function updateBassLPFFreq(val) {
  if(bassLPFOnOff){
    bassLPFFreq = val;
    for(var key in bassOscs){
      bassOscs[key]["lowPassFilter"].frequency.value = bassLPFFreq;
    }
  }
}


function updateSampleLPFFreq(id, val) {
  var name = id.split("_")[0]
  if(sampleLPFOnOff[name]){
    sampleLPFFreqs[name] = val
    sampleChains[name]["lowPassFilter"].frequency.value = sampleLPFFreqs[name];
  }
}



var beat;
var bpm = 120;
function updateBPM(val) {
    bpm = val;
};



var enabledInsts = {
  "b1":   new Set(),
  "b2":   new Set(),
  "b3":   new Set(),
  "b4":   new Set(),
  "b5":   new Set(),
  "b6":   new Set(),
  "b7":   new Set(),
  "b8":   new Set(),
  "b9":   new Set(),
  "b10":  new Set(),
  "b11":  new Set(),
  "b12":  new Set(),
  "b13":  new Set(),
  "b14":  new Set(),
  "b15":  new Set(),
  "b16":  new Set()
}


var trailEnabled = 0;
var enabledIds = [];
var trailFactor = 5;

function updateTrailFactor(val){
  trailFactor = val;
}

function toggleEnableInst(id){
  var args = id.split("_")
  let b = args[args.length-1]
  if(enabledInsts[b].has(id)){
    enabledInsts[b].delete(id)
    document.getElementById(id).src="images/greydot.png"
  } else {
    enabledInsts[b].add(id)
    enabledIds.push(id)
    trail()
    document.getElementById(id).src="images/greendot.svg"
  }
}

function trail(){
  if (trailEnabled && enabledIds.length > trailFactor){
    let delId = enabledIds.shift();
    let args = delId.split("_");
    let b = args[args.length-1];
    if(enabledInsts[b].has(delId)){
      enabledInsts[b].delete(delId);
      document.getElementById(delId).src="images/greydot.png"
    }
  }
}



var mouseoverEnabled = 0;
function mouseoverEnable(id){
  if (mouseoverEnabled) {
    toggleEnableInst(id);
  }
}


function toggleTrebleAM(id){
  if(trebleAmOnOff == 0){
    stopTrebleOscs();
    trebleAmOnOff = 1;
    initTrebleOscs();
    startTrebleOscs();
    document.getElementById(id).src="images/greendot.svg"
  } else {
    stopTrebleOscs();
    trebleAmOnOff = 0;
    initTrebleOscs();
    startTrebleOscs();
    document.getElementById(id).src="images/greydot.png"
  }
}

function toggleBassAM(id){
  if(bassAmOnOff == 0){
    stopBassOscs();
    bassAmOnOff = 1;
    initBassOscs();
    startBassOscs();
    document.getElementById(id).src="images/greendot.svg"
  } else {
    stopBassOscs();
    bassAmOnOff = 0;
    initBassOscs();
    startBassOscs();
    document.getElementById(id).src="images/greydot.png"
  }
}

function toggelTrebleVib(id){
  if(trebleVibOnOff == 0){
    stopTrebleOscs();
    trebleVibOnOff = 1;
    initTrebleOscs();
    startTrebleOscs();
    document.getElementById(id).src="images/greendot.svg"
  } else {
    stopTrebleOscs();
    trebleVibOnOff = 0;
    initTrebleOscs();
    startTrebleOscs();
    document.getElementById(id).src="images/greydot.png"
  }
}

// function toggleTrebleDelay(id){
//   if(trebleDelayOnOff == 0){
//     stopTrebleOscs();
//     trebleDelayOnOff = 1;
//     initTrebleOscs();
//     startTrebleOscs();
//     document.getElementById(id).src="images/greendot.svg"
//   } else {
//     stopTrebleOscs();
//     trebleDelayOnOff = 0;
//     initTrebleOscs();
//     startTrebleOscs();
//     document.getElementById(id).src="images/greydot.png"
//   }
// }

function toggleTrebleLPF(id){
  if(trebleLPFOnOff == 0){
    stopTrebleOscs();
    trebleLPFOnOff = 1;
    initTrebleOscs();
    startTrebleOscs();
    document.getElementById(id).src="images/greendot.svg"
  } else {
    stopTrebleOscs();
    trebleLPFOnOff = 0;
    initTrebleOscs();
    startTrebleOscs();
    document.getElementById(id).src="images/greydot.png"
  }
}

function toggleBassLPF(id){
  if(bassLPFOnOff == 0){
    stopBassOscs();
    bassLPFOnOff = 1;
    initBassOscs();
    startBassOscs();
    document.getElementById(id).src="images/greendot.svg"
  } else {
    stopBassOscs();
    bassLPFOnOff = 0;
    initBassOscs();
    startBassOscs();
    document.getElementById(id).src="images/greydot.png"
  }
}

function toggleSampleLPF(id){
  let sampleName = id.split("_")[0];
  if(sampleLPFOnOff[sampleName] == 0){
    sampleLPFOnOff[sampleName] = 1;
    initSamples();
    document.getElementById(id).src="images/greendot.svg"
  } else {
    sampleLPFOnOff[sampleName] = 0;
    initSamples();
    document.getElementById(id).src="images/greydot.png"
  }
}

function toggleAltConv(id){
  if(convolveAlternative == 0){
    convolveAlternative = 1;
    initSamples()
    document.getElementById(id).src="images/greendot.svg"
  } else {
    convolveAlternative = 0;
    initSamples()
    document.getElementById(id).src="images/greydot.png"
  }
}

function toggleViceConv(id){
  if(convolveVice == 0){
    convolveVice = 1;
    initSamples()
    document.getElementById(id).src="images/greendot.svg"
  } else {
    convolveVice = 0;
    initSamples()
    document.getElementById(id).src="images/greydot.png"
  }
}

function toggleTrumpConv(id){
  if(convolveTrump == 0){
    convolveTrump = 1;
    initSamples()
    document.getElementById(id).src="images/greendot.svg"
  } else {
    convolveTrump = 0;
    initSamples()
    document.getElementById(id).src="images/greydot.png"
  }
}

function playEnabledInsts(){
  //SET GLOBAL GAIN
  let gval;
  if (enabledInsts["b"+(beat+1).toString()].size > 0){
    gval = 0.95/(enabledInsts["b"+(beat+1).toString()]).size;
  } else {
    gval = 0;
  }

  globalGain.gain.setTargetAtTime(gval, audioCtx.currentTime, 0.00001)

  //PLAY INSTRUMENTS
  for(var id of enabledInsts["b"+(beat+1).toString()]){
    playFromId(id)
  }
}

function playFromId(id){
  var args = id.split("_")
  if (args[0] == "sine"){
    playSine(args[1], args[2])
  } else if (args[0] == "saw"){
    playSaw(args[1], args[2])
  } else {
    playSample(args[0], args[1])
  }

}


function playSine(note, beat){
  console.log("hello")
  console.log(trebleVibFreq)
  console.log(trebleVibDepth)
  trebleOscs[note]["gain"].gain.setTargetAtTime(0.9, audioCtx.currentTime+0.001, 0.005)
  trebleOscs[note]["gain"].gain.setTargetAtTime(0.00001, audioCtx.currentTime+0.05, 0.005)
}

function playSaw(note, beat){
  let maxAmp = bassAmOnOff ? 0.7 : 0.8;
  bassOscs[note]["gain"].gain.setTargetAtTime(maxAmp, audioCtx.currentTime+0.001, 0.005)
  bassOscs[note]["gain"].gain.setTargetAtTime(0.00001, audioCtx.currentTime+0.05, 0.005)
}

function playSample(name, beat){
  if (convolveAlternative || convolveVice || convolveTrump){
    var maxAmp = 3
  } else {
    var maxAmp = 0.8
  }
  sampleChains[name]["element"].currentTime = 0;
  sampleChains[name]["gain"].gain.setTargetAtTime(maxAmp, audioCtx.currentTime+0.0001, 0.001)
  sampleChains[name]["gain"].gain.setTargetAtTime(0.00001, audioCtx.currentTime+0.05, 0.005)
  sampleChains[name]["element"].play()
}


function doOneSixteenth(){
  updateBeatImage()
  playEnabledInsts()
  beat = (beat+1)%16
}




// MAIN START STOP BUTTON
var intervalReturn;
var audioPlaying = 0;
const start_stop = document.getElementById("startbutton");
start_stop.addEventListener('click', function() {
    if (!(audioPlaying)){
      initTrebleOscs();
      initBassOscs();
      startTrebleOscs();
      startBassOscs();
      initSamples();
      beat = 0;
      audioPlaying = 1;
      intervalReturn = setInterval(doOneSixteenth, 60000 / (bpm*4))
    } else {
      stopTrebleOscs();
      stopBassOscs();
      clearBeatImage();
      beat = 0;
      audioPlaying = 0;
      clearInterval(intervalReturn)
    }
});


const msvrElement = document.getElementById("mouseoverbutton");
msvrElement.addEventListener('click', function(){
  mouseoverEnabled = 1 - mouseoverEnabled;
})


const clearTrebleElement = document.getElementById("cleartreblebutton");
clearTrebleElement.addEventListener('click', function(){
  for(var note in trebleNoteToFreq){
    for(var b in enabledInsts){
      let id = "sine_"+note+"_"+b;
      if(enabledInsts[b].has(id)){
        enabledInsts[b].delete(id);
        document.getElementById(id).src="images/greydot.png"
      }
    }
  }
})

const clearBassElement = document.getElementById("clearbassbutton");
clearBassElement.addEventListener('click', function(){
  for(var note in bassNoteToFreq){
    for(var b in enabledInsts){
      let id = "saw_"+note+"_"+b;
      if(enabledInsts[b].has(id)){
        enabledInsts[b].delete(id);
        document.getElementById(id).src="images/greydot.png"
      }
    }
  }
})

const clearSampleElement = document.getElementById("clearsamplesbutton");
clearSampleElement.addEventListener('click', function(){
  for(var name of samplesNames){
    for(var b in enabledInsts){
      let id = name+"_"+b;
      if(enabledInsts[b].has(id)){
        enabledInsts[b].delete(id);
        document.getElementById(id).src="images/greydot.png"
      }
    }
  }
})


document.getElementById("trailbutton").addEventListener('click', function(){
  trailEnabled = 1 - trailEnabled;
})


function updateBeatImage(){
  if (beat == 0){
    document.getElementById("b1").src='images/yellowdot.png';
    document.getElementById("b16").src='images/whitedot.jpg';
  } else if (beat == 1){
    document.getElementById("b2").src='images/yellowdot.png';
    document.getElementById("b1").src='images/whitedot.jpg';
  } else if (beat == 2){
    document.getElementById("b3").src='images/yellowdot.png';
    document.getElementById("b2").src='images/whitedot.jpg';
  } else if (beat == 3){
    document.getElementById("b4").src='images/yellowdot.png';
    document.getElementById("b3").src='images/whitedot.jpg';
  } else if (beat == 4){
    document.getElementById("b5").src='images/yellowdot.png';
    document.getElementById("b4").src='images/whitedot.jpg';
  } else if (beat == 5){
    document.getElementById("b6").src='images/yellowdot.png';
    document.getElementById("b5").src='images/whitedot.jpg';
  } else if (beat == 6){
    document.getElementById("b7").src='images/yellowdot.png';
    document.getElementById("b6").src='images/whitedot.jpg';
  } else if (beat == 7){
    document.getElementById("b8").src='images/yellowdot.png';
    document.getElementById("b7").src='images/whitedot.jpg';
  } else if (beat == 8){
    document.getElementById("b9").src='images/yellowdot.png';
    document.getElementById("b8").src='images/whitedot.jpg';
  } else if (beat == 9){
    document.getElementById("b10").src='images/yellowdot.png';
    document.getElementById("b9").src='images/whitedot.jpg';
  } else if (beat == 10){
    document.getElementById("b11").src='images/yellowdot.png';
    document.getElementById("b10").src='images/whitedot.jpg';
  } else if (beat == 11){
    document.getElementById("b12").src='images/yellowdot.png';
    document.getElementById("b11").src='images/whitedot.jpg';
  } else if (beat == 12){
    document.getElementById("b13").src='images/yellowdot.png';
    document.getElementById("b12").src='images/whitedot.jpg';
  } else if (beat == 13){
    document.getElementById("b14").src='images/yellowdot.png';
    document.getElementById("b13").src='images/whitedot.jpg';
  } else if (beat == 14){
    document.getElementById("b15").src='images/yellowdot.png';
    document.getElementById("b14").src='images/whitedot.jpg';
  } else if (beat == 15){
    document.getElementById("b16").src='images/yellowdot.png';
    document.getElementById("b15").src='images/whitedot.jpg';
  }

}

function clearBeatImage(){
  document.getElementById("b1").src='images/whitedot.jpg';
  document.getElementById("b2").src='images/whitedot.jpg';
  document.getElementById("b3").src='images/whitedot.jpg';
  document.getElementById("b4").src='images/whitedot.jpg';
  document.getElementById("b5").src='images/whitedot.jpg';
  document.getElementById("b6").src='images/whitedot.jpg';
  document.getElementById("b7").src='images/whitedot.jpg';
  document.getElementById("b8").src='images/whitedot.jpg';
  document.getElementById("b9").src='images/whitedot.jpg';
  document.getElementById("b10").src='images/whitedot.jpg';
  document.getElementById("b11").src='images/whitedot.jpg';
  document.getElementById("b12").src='images/whitedot.jpg';
  document.getElementById("b13").src='images/whitedot.jpg';
  document.getElementById("b14").src='images/whitedot.jpg';
  document.getElementById("b15").src='images/whitedot.jpg';
  document.getElementById("b16").src='images/whitedot.jpg';

}










// comment
