/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "ABI35_0_0ARTTextManager.h"

#import "ABI35_0_0ARTText.h"
#import "ABI35_0_0RCTConvert+ART.h"

@implementation ABI35_0_0ARTTextManager

ABI35_0_0RCT_EXPORT_MODULE()

- (ABI35_0_0ARTRenderable *)node
{
  return [ABI35_0_0ARTText new];
}

ABI35_0_0RCT_EXPORT_VIEW_PROPERTY(alignment, CTTextAlignment)
ABI35_0_0RCT_REMAP_VIEW_PROPERTY(frame, textFrame, ABI35_0_0ARTTextFrame)

@end
