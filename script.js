import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
const { ImageSegmenter, SegmentationMask, FilesetResolver } = vision;
let imageSegmenter;
let labels;
let runningMode = "VIDEO";

const createImageSegmenter = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
    imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://cdn.glitch.global/eb18e63f-936a-4172-8bdd-9263c7a6a04a/hair_segmenter.tflite?v=1689603953377",
            delegate: "CPU"
        },
        runningMode: runningMode,
        outputCategoryMask: true,
        outputConfidenceMasks: true
    });
    labels = imageSegmenter.getLabels();
    //document.getElementById("color").value = '#de38ff';
    //demosSection.classList.remove("invisible");
};



function init(){
// Get DOM elements
let video = document.getElementById("webcam");
let canvasElement = document.getElementById("canvas1");
let canvasElement2 = document.getElementById("canvas2");


//const webcamPredictions = document.getElementById("webcamPredictions");

const canvasCtx = canvasElement.getContext("2d", { willReadFrequently: true })
const canvasCtx2 = canvasElement2.getContext("2d", { willReadFrequently: true })
let enableWebcamButton;
let webcamRunning = false;


let legendColors = [
    [0, 0, 0, 0],
    [222, 56, 255, 255],
];

function callbackForVideo(result) {

  canvasElement.style.display = 'block';
  canvasElement2.style.display = 'block';
    let imageData = canvasCtx.getImageData(0, 0, video.videoWidth, video.videoHeight).data;
    const mask = result.categoryMask.getAsFloat32Array();
    let j = 0;
    for (let i = 0; i < mask.length; ++i) {
        const maskVal = Math.round(mask[i] * 255.0);


      if(maskVal % legendColors.length === 0){
        j += 4;
      } else {
        const legendColor = legendColors[1];
        imageData[j] = (legendColor[0] + imageData[j])/2;
        imageData[j + 1] = (legendColor[1] + imageData[j + 1])/2;
        imageData[j + 2] = (legendColor[2] + imageData[j + 2])/2;
        imageData[j + 3] = (legendColor[3] + imageData[j + 3])/2;
        j += 4;
      }

    }
    const uint8Array = new Uint8ClampedArray(imageData.buffer);
    const dataNew = new ImageData(uint8Array, video.videoWidth, video.videoHeight);

  //smoother image
  canvasCtx.imageSmoothingEnabled = true;

  canvasCtx.putImageData(dataNew, 0, 0);
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }

}







const imageContainers = document.getElementsByClassName("segmentOnClick");
// Add click event listeners for the img elements.
for (let i = 0; i < imageContainers.length; i++) {
    imageContainers[i]
        .getElementsByTagName("img")[0]
        .addEventListener("click", handleClick);
}
/**
 * Demo 1: Segmented images on click and display results.
 */
let canvasClick;
async function handleClick(event) {
    // Do not segmented if imageSegmenter hasn't loaded
    if (imageSegmenter === undefined) {
        return;
    }
    canvasClick = event.target.parentElement.getElementsByTagName("canvas")[0];
    canvasClick.classList.remove("removed");
    canvasClick.width = event.target.naturalWidth;
    canvasClick.height = event.target.naturalHeight;
    const cxt = canvasClick.getContext("2d");
    cxt.clearRect(0, 0, canvasClick.width, canvasClick.height);
    cxt.drawImage(event.target, 0, 0, canvasClick.width, canvasClick.height);
    event.target.style.opacity = 0;
    canvasClick.filter = "blur(10px)";
    //canvasClick.opacity = '.9';
    // if VIDEO mode is initialized, set runningMode to IMAGE
    if (runningMode === "VIDEO") {
        runningMode = "IMAGE";
        await imageSegmenter.setOptions({
            runningMode: runningMode
        });
    }
    // imageSegmenter.segment() when resolved will call the callback function.
    imageSegmenter.segment(event.target, callback);
}
function callback(result) {
    const cxt = canvasClick.getContext("2d");
    const { width, height } = result.categoryMask;
    let imageData = cxt.getImageData(0, 0, width, height).data;
    canvasClick.width = width;
    canvasClick.height = height;
    let category = "";
    const mask = result.categoryMask.getAsUint8Array();
    for (let i in mask) {
        if (mask[i] > 0) {
            category = labels[mask[i]];
        }
      
        if(mask[i] % legendColors.length == 1){
        const legendColor = legendColors[1];
        imageData[i * 4] = (legendColor[0] + imageData[i * 4]) / 2;
        imageData[i * 4 + 1] = (legendColor[1] + imageData[i * 4 + 1]) / 2;
        imageData[i * 4 + 2] = (legendColor[2] + imageData[i * 4 + 2]) / 2;
        imageData[i * 4 + 3] = (legendColor[3] + imageData[i * 4 + 3]) / 2;
        }
    }
    const uint8Array = new Uint8ClampedArray(imageData.buffer);
    const dataNew = new ImageData(uint8Array, width, height);
    canvasClick.imageSmoothingEnabled = true;
    cxt.putImageData(dataNew, 0, 0);
    const p = event.target.parentNode.getElementsByClassName("classification")[0];
    p.classList.remove("removed");
    p.innerText = "Category: " + category;
}



/********************************************************************
// Continuously grab image from webcam stream and segmented it.
********************************************************************/
// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
// Get segmentation from the webcam
let lastWebcamTime = -1;
async function predictWebcam() {

    if (video.currentTime === lastWebcamTime) {
        if (webcamRunning === true) {
            window.requestAnimationFrame(predictWebcam);
        }
        return;
    }
    lastWebcamTime = video.currentTime;
    canvasCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    canvasCtx2.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    // Do not segmented if imageSegmenter hasn't loaded
    if (imageSegmenter === undefined) {
        return;
    }
    // if image mode is initialized, create a new segmented with video runningMode
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await imageSegmenter.setOptions({
            runningMode: runningMode
        });
    }
    let startTimeMs = performance.now();
    // Start segmenting the stream.
    imageSegmenter.segmentForVideo(video, startTimeMs, callbackForVideo);
}
// Enable the live webcam view and start imageSegmentation.
async function enableCam(event) {
    if (imageSegmenter === undefined) {
        return;
    }
    if (webcamRunning === true) {
        webcamRunning = false;
        // turn off video stream;

        enableWebcamButton.innerText = "ENABLE SEGMENTATION";
    }
    else {
        webcamRunning = true;
        enableWebcamButton.innerText = "DISABLE SEGMENTATION";
    }
    // getUsermedia parameters.
    const constraints = {
        video: true
    };
    video = document.getElementById("webcam");
    // Activate the webcam stream.
    video.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
    video.addEventListener("loadeddata", predictWebcam);
    video.play();
    video.style.display = 'none';
}

// If webcam supported, add event listener to button.
if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
}
else {
    console.warn("getUserMedia() is not supported by your browser");
}




//FOR TESTING ONLY: ADD CONTROLS FOR COLOR, OPACITY AND BLUR
// Convert hex color code to RGB color code
  const hexToRgb = hex =>
      hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b)
         .substring(1).match(/.{2}/g)
         .map(x => parseInt(x, 16))


  function colVal() {
        let d = document.getElementById("color").value;
        let hex = hexToRgb(d);
        hex[3] = 255;
        console.log(hex);
        legendColors[1] = hex;
    }

    function blurVal() {
          let x = document.getElementById("blur").value;
          console.log(x);
          document.getElementById('canvas1').style.filter = 'blur('+x+'px)';
      }

    function opVal() {
          let z = document.getElementById("opacity").value;
          console.log(z);
          document.getElementById('canvas1').style.opacity = z;
      }

 document.getElementById("color").addEventListener("input", colVal);
 document.getElementById("blur").addEventListener("input", blurVal);
 document.getElementById("opacity").addEventListener("input", opVal);



}
createImageSegmenter();
init();