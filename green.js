const videoElement = document.getElementById('videoElement');
const outputCanvas = document.getElementById('outputCanvas');
const background_picture = document.getElementById('background_picture');
const outputCtx = outputCanvas.getContext('2d');

navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  videoElement.srcObject = stream;
  videoElement.onloadedmetadata = () => {
    videoElement.play();
    outputCanvas.width = videoElement.videoWidth;
    outputCanvas.height = videoElement.videoHeight;
    background_picture.width = videoElement.videoWidth;
    background_picture.height = videoElement.videoHeight;
  };
});

function processFrame() {
  // 先將攝影機影像畫到 canvas 上
  outputCtx.drawImage(videoElement, 0, 0, outputCanvas.width, outputCanvas.height);
  
  // 取得畫面像素資料
  let frame = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  let data = frame.data;
  
  // 色鍵算法：將綠色背景的像素透明化
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    // 根據實際綠幕的色調調整門檻值，這裡範例中綠色明顯且紅藍較低
    if (g > 70 && r < 100 && b < 100) {
      data[i+3] = 0; // 設置 alpha 為 0，讓該像素透明
    }
  }
  outputCtx.putImageData(frame, 0, 0);
  
  // 在透明部分下方疊加背景圖片
  outputCtx.globalCompositeOperation = 'destination-over';
  outputCtx.drawImage(background_picture, 0, 0, outputCanvas.width, outputCanvas.height);
  outputCtx.globalCompositeOperation = 'source-over';
  
  requestAnimationFrame(processFrame);
}

videoElement.onplay = processFrame;
