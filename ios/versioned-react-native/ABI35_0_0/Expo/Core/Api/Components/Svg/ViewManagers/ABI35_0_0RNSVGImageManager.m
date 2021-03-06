/**
 * Copyright (c) 2015-present, Horcrux.
 * All rights reserved.
 *
 * This source code is licensed under the MIT-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "ABI35_0_0RNSVGImageManager.h"
#import "ABI35_0_0RNSVGVBMOS.h"
#import "ABI35_0_0RNSVGImage.h"
#import "ABI35_0_0RCTConvert+RNSVG.h"

@implementation ABI35_0_0RNSVGImageManager

ABI35_0_0RCT_EXPORT_MODULE()

- (ABI35_0_0RNSVGRenderable *)node
{
    ABI35_0_0RNSVGImage *svgImage = [ABI35_0_0RNSVGImage new];
    svgImage.bridge = self.bridge;

    return svgImage;
}

ABI35_0_0RCT_EXPORT_VIEW_PROPERTY(x, ABI35_0_0RNSVGLength*)
ABI35_0_0RCT_EXPORT_VIEW_PROPERTY(y, ABI35_0_0RNSVGLength*)
ABI35_0_0RCT_EXPORT_VIEW_PROPERTY(imagewidth, ABI35_0_0RNSVGLength*)
ABI35_0_0RCT_EXPORT_VIEW_PROPERTY(imageheight, ABI35_0_0RNSVGLength*)
ABI35_0_0RCT_CUSTOM_VIEW_PROPERTY(width, id, ABI35_0_0RNSVGImage)
{
    view.imagewidth = [ABI35_0_0RCTConvert ABI35_0_0RNSVGLength:json];
}
ABI35_0_0RCT_CUSTOM_VIEW_PROPERTY(height, id, ABI35_0_0RNSVGImage)
{
    view.imageheight = [ABI35_0_0RCTConvert ABI35_0_0RNSVGLength:json];
}
ABI35_0_0RCT_EXPORT_VIEW_PROPERTY(src, id)
ABI35_0_0RCT_EXPORT_VIEW_PROPERTY(align, NSString)
ABI35_0_0RCT_EXPORT_VIEW_PROPERTY(meetOrSlice, ABI35_0_0RNSVGVBMOS)

@end
