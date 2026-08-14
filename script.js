import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const { FilesetResolver, ImageSegmenter } = vision;

const statusElement = document.getElementById("status");
const webcamButton = document.getElementById("webcamButton");
const video = document.getElementById("webcam");
const webcamBase = document.getElementById("webcamBase");
const webcamOverlay = document.getElementById("webcamOverlay");
const imageUpload = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");
const uploadedImage = document.getElementById("uploadedImage");
const imageCanvas = document.getElementById("imageCanvas");
const colorInput = document.getElementById("color");
const blurInput = document.getElementById("blur");
const opacityInput = document.getElementById("opacity");

const webcamBaseContext = webcamBase.getContext("2d", { willReadFrequently: true });
const webcamOverlayContext = webcamOverlay.getContext("2d");
const imageContext = imageCanvas.getContext("2d", { willReadFrequently: true });

let imageSegmenter;
let runningMode = "IMAGE";
let webcamRunning = false;
let lastWebcamTime = -1;
let uploadedImageUrl;

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
}

function selectedColor() {
  const hex = colorInput.value.slice(1);
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
    Math.round(Number(opacityInput.value) * 255),
  ];
}

function renderMask(targetContext, width, height, result) {
  const output = targetContext.createImageData(width, height);
  const mask = result.categoryMask.getAsUint8Array();
  const color = selectedColor();

  for (let index = 0; index < mask.length; index += 1) {
    const pixel = index * 4;

    if (mask[index] > 0) {
      output.data[pixel] = color[0];
      output.data[pixel + 1] = color[1];
      output.data[pixel + 2] = color[2];
      output.data[pixel + 3] = color[3];
    }
  }

  targetContext.putImageData(output, 0, 0);
  targetContext.canvas.style.filter = `blur(${blurInput.value}px)`;
}

async function useMode(mode) {
  if (runningMode !== mode) {
    runningMode = mode;
    await imageSegmenter.setOptions({ runningMode });
  }
}

async function segmentUploadedImage() {
  if (!imageSegmenter || !uploadedImage.naturalWidth) {
    return;
  }

  await useMode("IMAGE");

  const width = uploadedImage.naturalWidth;
  const height = uploadedImage.naturalHeight;
  imageCanvas.width = width;
  imageCanvas.height = height;

  imageSegmenter.segment(uploadedImage, (result) => {
    imageContext.clearRect(0, 0, width, height);
    renderMask(imageContext, width, height, result);
    result.categoryMask.close();
  });
}

async function predictWebcam() {
  if (!webcamRunning) {
    return;
  }

  if (video.currentTime !== lastWebcamTime && video.videoWidth > 0) {
    lastWebcamTime = video.currentTime;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (webcamBase.width !== width || webcamBase.height !== height) {
      webcamBase.width = width;
      webcamBase.height = height;
      webcamOverlay.width = width;
      webcamOverlay.height = height;
    }

    webcamBaseContext.drawImage(video, 0, 0, width, height);
    imageSegmenter.segmentForVideo(video, performance.now(), (result) => {
      webcamOverlayContext.clearRect(0, 0, width, height);
      renderMask(webcamOverlayContext, width, height, result);
      result.categoryMask.close();
    });
  }

  window.requestAnimationFrame(predictWebcam);
}

function stopWebcam() {
  video.srcObject?.getTracks().forEach((track) => track.stop());
  video.srcObject = null;
  webcamRunning = false;
  webcamButton.textContent = "Enable camera";
  webcamBaseContext.clearRect(0, 0, webcamBase.width, webcamBase.height);
  webcamOverlayContext.clearRect(0, 0, webcamOverlay.width, webcamOverlay.height);
  setStatus("Camera stopped. The model is ready.");
}

async function toggleWebcam() {
  if (webcamRunning) {
    stopWebcam();
    return;
  }

  try {
    await useMode("VIDEO");
    video.srcObject = await navigator.mediaDevices.getUserMedia({ video: true });
    await video.play();
    webcamRunning = true;
    webcamButton.textContent = "Disable camera";
    setStatus("Camera active. Processing stays in this browser.");
    window.requestAnimationFrame(predictWebcam);
  } catch (error) {
    stopWebcam();
    setStatus(`Camera unavailable: ${error.message}`, true);
  }
}

imageUpload.addEventListener("change", () => {
  const [file] = imageUpload.files;
  if (!file) {
    return;
  }

  if (uploadedImageUrl) {
    URL.revokeObjectURL(uploadedImageUrl);
  }

  uploadedImageUrl = URL.createObjectURL(file);
  uploadedImage.onload = async () => {
    imagePreview.classList.remove("removed");

    try {
      await segmentUploadedImage();
      setStatus("Image processed locally.");
    } catch (error) {
      setStatus(`Could not process the image: ${error.message}`, true);
    }
  };
  uploadedImage.src = uploadedImageUrl;
});

webcamButton.addEventListener("click", toggleWebcam);
colorInput.addEventListener("input", segmentUploadedImage);
blurInput.addEventListener("input", segmentUploadedImage);
opacityInput.addEventListener("input", segmentUploadedImage);
window.addEventListener("pagehide", stopWebcam);

async function initialize() {
  try {
    const files = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm",
    );

    imageSegmenter = await ImageSegmenter.createFromOptions(files, {
      baseOptions: {
        modelAssetPath: "./models/hair_segmenter.tflite",
        delegate: "CPU",
      },
      runningMode,
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });

    webcamButton.disabled = !navigator.mediaDevices?.getUserMedia;
    setStatus("Model ready. Choose the camera or an image.");
  } catch (error) {
    setStatus(`Could not load the segmentation model: ${error.message}`, true);
  }
}

initialize();
