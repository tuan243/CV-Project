import numpy as np
import cv2 as cv
from matplotlib import pyplot as plt


def remove_green(img):
    """
    Docstring:
        Remove green-ish background from image given a threshold.

    Parameters
    ----------
    img : numpy.array containing 4 channel image (RGBa).
    """
    
    norm_factor = 255

    """
    Obtain the ratio of the green/red/blue
    channels based on the max-bright of 
    the pixel.
    """
    
    red_ratio = img[:, :, 2] / norm_factor
    green_ratio = img[:, :, 1] / norm_factor
    blue_ratio = img[:, :, 0] / norm_factor

    """
    Darker pixels would be around 0.
    In order to ommit removing dark pixels we
    sum .3 to make small negative numbers to be
    above 0.
    """
    
    red_vs_green = (red_ratio - green_ratio) + .3
    blue_vs_green = (blue_ratio - green_ratio) + .3
    
    """
    Now pixels below 0. value would have a
    high probability to be background green
    pixels.
    """
    red_vs_green[red_vs_green < 0] = 0
    blue_vs_green[blue_vs_green < 0] = 0

    """
    Combine the red(blue) vs green ratios to
    set an alpha layer with valid alpha-values.
    """
    alpha = (red_vs_green + blue_vs_green) * 255
    alpha[alpha > 50] = 255
    alpha[alpha <= 50] = 0 

    return alpha

src1 = cv.imread('gscropped1.png')
src2 = cv.imread('bg_out.jpg')
mask = remove_green(src1)
cv.imwrite('mask.png', mask)

masked_img = np.copy(src1)
masked_img[mask == 0] = [0, 0, 0]
cv.imwrite('masked_img.jpg',masked_img)

crop_background = np.copy(src2)
crop_background[mask != 0] = [0, 0, 0]
cv.imwrite('crop_background.jpg', crop_background)

finale_image = crop_background + masked_img
cv.imwrite('finale_image.jpg', finale_image)

cv.waitKey(0)


