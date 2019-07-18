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

let tryitBtn = document.getElementById('tryit-btn');


tryitBtn.addEventListener('click', () => {
    let src1 = cv.imread('canvasInputId1');
    let src2 = cv.imread('canvasInputId2');
    let mask = CreateMask(src1);
    let maskInv = new cv.Mat();
    cv.bitwise_not(mask, maskInv);

    let imgBg = new cv.Mat();
    let imgFg = new cv.Mat(); 

    cv.bitwise_and(src1, src1, imgFg, maskInv);

    cv.bitwise_and(src2, src2, imgBg, mask);

    let dst = new cv.Mat();
    cv.add(imgFg, imgBg, dst);

    cv.imshow('canvasOutputId', dst);
    // let dst = new cv.Mat();
    // To distinguish the input and output, we graying the image.
    // You can try different conversions.
    // cv.cvtColor(src, dst, cv.COLOR_RGB2GRAY);
    // cv.imshow('canvasOutputId', dst);
    // src.delete();
    // dst.delete();
}) 

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
    console.log(mat);
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