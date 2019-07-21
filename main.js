let segmentedImg; //ảnh lưu kết quả segment
let mask; //mask dùng để lọc foreground từ ảnh nền xanh lá
let imgLoadedCount = 0;
let check1 = 0;
let check2 = 0;

//Hàm tạo mask từ ảnh nền phông xanh lá bằng cách dùng cv.inRange để bắt màu xanh lá cây
function CreateMask(img) {
    let hsvImg = new cv.Mat();
    cv.cvtColor(img, hsvImg, cv.COLOR_RGB2HSV, 0);
    let dst = new cv.Mat();
    let low = new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [40, 100, 100, 0]);
    let high = new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [80, 255, 255, 255]);
    cv.inRange(hsvImg, low, high, dst);
    low.delete(); high.delete();
    return dst;
}

//Hàm xử lý cộng 2 ảnh đầu vào kết hợp với mask cho ra ảnh đích 
function processImg(src1, src2, theMask) {
    let theDst = new cv.Mat();
    let maskInv = new cv.Mat();
    let imgBg = new cv.Mat();
    let imgFg = new cv.Mat(); 
    cv.cvtColor(src1, src1, cv.COLOR_RGBA2RGB);
    cv.cvtColor(src2, src2, cv.COLOR_RGBA2RGB);

    cv.resize(src2, src2, src1.size());
    cv.bitwise_not(theMask, maskInv);
    cv.bitwise_and(src1, src1, imgFg, maskInv);
    cv.bitwise_and(src2, src2, imgBg, theMask);

    cv.add(imgFg, imgBg, theDst);
    cv.imshow('canvasOutputId', theDst);

    theDst.delete(); maskInv.delete(); imgBg.delete(); imgFg.delete();
}

// event click cho nút Try It, sau khi đã đưa vào 2 ảnh đầu vào
let tryItBtn = document.getElementById('tryit-btn');
tryItBtn.addEventListener('click', () => {
    imgLoadedCount = check1 + check2;
    if (imgLoadedCount < 2) {
        alert('Vui lòng nhập đủ 2 ảnh đầu vào')
        return;
    }
    modified = false;
    let src1 = cv.imread('canvasInputId1');
    let src2 = cv.imread('canvasInputId2');
    if(!src1 || !src2)
        return;
    let imgFg = new cv.Mat(); 
    let maskInv = new cv.Mat();

    // Tạo mask từ ảnh nền xanh lá
    mask = CreateMask(src1);
    
    // Xử lý cho ra ảnh đích
    processImg(src1, src2, mask);

    // maskInv và imgFg sẽ được dùng cho phần segmentation dưới đây
    // sử dụng thuật toán watershed để segmentation
    // https://docs.opencv.org/3.4/d7/d1c/tutorial_js_watershed.html
    cv.bitwise_not(mask, maskInv);
    cv.bitwise_and(src1, src1, imgFg, maskInv);
    
    let M = cv.Mat.ones(3, 3, cv.CV_8U);
    let opening = new cv.Mat();
    let sureBg = new cv.Mat();
    let distTrans = new cv.Mat();
    let sureFg = new cv.Mat();
    let unknown = new cv.Mat();
    let markers = new cv.Mat();
    
    cv.erode(maskInv, maskInv, M);
    cv.dilate(maskInv, opening, M);
    cv.dilate(opening, sureBg, M, new cv.Point(-1, -1), 3);

    cv.distanceTransform(opening, distTrans, cv.DIST_L2, 5);
    cv.normalize(distTrans, distTrans, 1, 0, cv.NORM_INF);

    cv.threshold(distTrans, sureFg, 0.7 * 1, 255, cv.THRESH_BINARY);

    sureFg.convertTo(sureFg, cv.CV_8U, 1, 0);

    cv.subtract(sureBg, sureFg, unknown);

    cv.connectedComponents(sureFg, markers);
    for (let i = 0; i < markers.rows; i++) {
        for (let j = 0; j < markers.cols; j++) {
            markers.intPtr(i, j)[0] = markers.ucharPtr(i, j)[0] + 1;
            if (unknown.ucharPtr(i, j)[0] == 255) {
                markers.intPtr(i, j)[0] = 0;
            }
        }
    }

    cv.cvtColor(imgFg, imgFg, cv.COLOR_RGBA2RGB, 0);
    cv.watershed(imgFg, markers);

    // lưu kết quả segment cho thao tác chỉnh sửa
    segmentedImg = markers.clone();

    downloadBtn.disabled = false;

    src1.delete(); src2.delete(); imgFg.delete(); maskInv.delete(); opening.delete();
    M.delete(); sureBg.delete(); distTrans.delete(); sureFg.delete(); unknown.delete(); markers.delete();
});

// click event để chỉnh sửa ảnh, khi click vào 1 segment của ảnh sẽ làm ẩn/hiện segment đó trên ảnh đích
let canvasOutput = document.getElementById('canvasOutputId');
let modified = false;
canvasOutput.addEventListener('click', e => {
    let label;
    if(segmentedImg) {
        label = segmentedImg.intPtr(e.layerY, e.layerX)[0];
    }
    
    if(label == -1)
        return;
    if(!mask || !segmentedImg)
        return;
    let src1 = cv.imread('canvasInputId1');
    let src2 = cv.imread('canvasInputId2');

    if (modified == false) {
        for (let i = 0; i < mask.rows; i++) {
            for (let j = 0; j < mask.cols; j++) {
                if (segmentedImg.intPtr(i, j)[0] == -1)
                    mask.ucharPtr(i, j)[0] = 255;
            }
        }
        modified = true;
    }
    // chỉnh sửa mask khi click vào segment
    if (label != 1) {
        for (let i = 0; i < mask.rows; i++) {
            for (let j = 0; j < mask.cols; j++) {
                if (segmentedImg.intPtr(i, j)[0] == label) {
                    if (mask.ucharPtr(i, j)[0] == 255)
                        mask.ucharPtr(i, j)[0] = 0;
                    else mask.ucharPtr(i, j)[0] = 255;
                }
            }
        }
    }

    //cộng lại 2 image theo mask mới
    processImg(src1, src2, mask);
    src1.delete(); src2.delete();
});

// event click cho nút download ảnh
let downloadBtn = document.getElementById('download-btn');
downloadBtn.addEventListener('click', () =>{
    let download = document.getElementById('download');
    let image = canvasOutput.toDataURL('image/jpg');
    download.setAttribute('href', image);
});

//Load ảnh từ file input element và hiện lên canvas
let inputElement1 = document.getElementById("fileInput1");
let inputElement2 = document.getElementById("fileInput2");

let img1 = new Image();
let img2 = new Image();

inputElement1.addEventListener("change", (e) => {
    img1.src = URL.createObjectURL(e.target.files[0]);
}, false);

inputElement2.addEventListener("change", (e) => {
    img2.src = URL.createObjectURL(e.target.files[0]);
}, false);

img1.onload = () => {
    check1 = 1;
    let canvas = document.getElementById('canvasInputId1');
    let context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    let mat = cv.imread(img1);
    cv.imshow('canvasInputId1', mat);
    imgLoadedCount++;
    mat.delete;
}

img2.onload = () => {
    check2 = 1;
    let canvas = document.getElementById('canvasInputId2');
    let context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    let mat = cv.imread(img2);
    cv.imshow('canvasInputId2', mat);
    imgLoadedCount++;
    mat.delete;
}