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

// 使用 MediaPipe SelfieSegmentation 做 AI 去背
const selfieSegmentation = new SelfieSegmentation({ locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;
}});
selfieSegmentation.setOptions({ modelSelection: 0 });
selfieSegmentation.onResults(onResults);

async function processFrame() {
    await selfieSegmentation.send({ image: videoElement });
    requestAnimationFrame(processFrame);
}

function onResults(results) {
    // 1. 建立臨時畫布，先用 AI 分割結果獲得去背影像
    let tempCanvas = document.createElement("canvas");
    let tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = outputCanvas.width;
    tempCanvas.height = outputCanvas.height;
    
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    // 繪製原始影像
    tempCtx.drawImage(results.image, 0, 0, tempCanvas.width, tempCanvas.height);
    
    // 用分割遮罩過濾（只保留人物部分）
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(results.segmentationMask, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.globalCompositeOperation = 'source-over';
    
    // 2. 鏡像翻轉（若需要鏡像效果）
    const flippedCanvas = document.createElement("canvas");
    flippedCanvas.width = tempCanvas.width;
    flippedCanvas.height = tempCanvas.height;
    const flippedCtx = flippedCanvas.getContext("2d");
    
    flippedCtx.save();
    flippedCtx.scale(-1, 1);
    flippedCtx.drawImage(tempCanvas, -tempCanvas.width, 0);
    flippedCtx.restore();
    
    // 3. 對 AI 去背後的結果進行綠幕色鍵過濾，將殘留的綠色像素透明化
    let imageData = flippedCtx.getImageData(0, 0, flippedCanvas.width, flippedCanvas.height);
    let data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2];
        // 若像素為綠色（根據實際綠幕調整門檻）
        if (g > 100 && r < 100 && b < 100) {
            data[i+3] = 0; // 透明化該像素
        }else if (g > 150 && r < 120 && b < 120) {
            data[i+3] = 0; // 透明化該像素
        }
    }
    flippedCtx.putImageData(imageData, 0, 0);
    
    // 4. 輸出：先繪製背景圖片，再疊加處理後的影像
    outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    outputCtx.drawImage(background_picture, 0, 0, outputCanvas.width, outputCanvas.height);
    outputCtx.drawImage(flippedCanvas, 0, 0);
}

videoElement.onplay = processFrame;
