let segmentedImg;
let mask;

function CreateMask(img) {
    let hsvImg = new cv.Mat();
    cv.cvtColor(img, hsvImg, cv.COLOR_RGB2HSV, 0);
    let dst = new cv.Mat();
    let low = new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [40, 100, 100, 0]);
    let high = new cv.Mat(hsvImg.rows, hsvImg.cols, hsvImg.type(), [80, 255, 255, 255]);
    cv.inRange(hsvImg, low, high, dst);
    cv.imshow('canvasOutputId', dst);
    low.delete(); high.delete();
    return dst;
}

function click(e) {
    console.log('clicked');
}

let canvasOutput = document.getElementById('canvasOutputId');
let modified = false;
canvasOutput.addEventListener('click', e => {
    // let mat = cv.imread(e.target.id);
    let src1 = cv.imread('canvasInputId1');
    let src2 = cv.imread('canvasInputId2');
    // console.log(e.path[0].id);
    
    let label;
    if(segmentedImg) {
        label = segmentedImg.intPtr(e.layerY, e.layerX)[0];
    }
    // console.log(mask.channels());
    if(modified == false) {
        for (let i = 0; i < mask.rows; i++) {
            for (let j = 0; j < mask.cols; j++) {
                if (segmentedImg.intPtr(i, j)[0] == -1)
                    mask.ucharPtr(i, j)[0] = 255;
            }
        }
        modified = true;
    }
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
    processImg(src1, src2, mask);
    cv.imshow('canvasOutputId2', mask);
});

let tryitBtn = document.getElementById('tryit-btn');

tryitBtn.addEventListener('click', () => {
    modified = false;
    let src1 = cv.imread('canvasInputId1');
    let src2 = cv.imread('canvasInputId2');
    // let imgBg = new cv.Mat();
    let imgFg = new cv.Mat(); 
    let maskInv = new cv.Mat();
    let opening = new cv.Mat();
    // let dst = new cv.Mat();
   
    mask = CreateMask(src1);

    processImg(src1, src2, mask);
    // console.log('mask: ', mask.type());
    cv.bitwise_not(mask, maskInv);
    cv.bitwise_and(src1, src1, imgFg, maskInv);
    // cv.bitwise_and(src2, src2, imgBg, mask);

    // cv.add(imgFg, imgBg, dst);

    // cv.imshow('canvasOutputId', dst);

    let M = cv.Mat.ones(3, 3, cv.CV_8U);
    // let newMaskInv = new cv.Mat();
    let sureBg = new cv.Mat();
    let distTrans = new cv.Mat();
    let sureFg = new cv.Mat();
    let unknown = new cv.Mat();
    let markers = new cv.Mat();
    cv.erode(maskInv, maskInv, M);
    cv.dilate(maskInv, opening, M);
    cv.dilate(opening, sureBg, M, new cv.Point(-1, -1), 3);

    // distance transform
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
    let newImgFg = imgFg.clone();

    cv.cvtColor(newImgFg, newImgFg, cv.COLOR_RGBA2RGB, 0);
    cv.watershed(newImgFg, markers);

    segmentedImg = markers;
    // draw barriers
});

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
    let canvas = document.getElementById('canvasInputId1');
    let context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    let mat = cv.imread(img1);
    cv.imshow('canvasInputId1', mat);
    mat.delete;
}

img2.onload = () => {
    let canvas = document.getElementById('canvasInputId2');
    let context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    let mat = cv.imread(img2);
    cv.imshow('canvasInputId2', mat);
    console.log(mat);
    mat.delete;
}