//
//  ABI34_0_0AIRGoogleMapOverlay.h
//
//  Created by Taro Matsuzawa on 5/3/17.
//

#ifdef ABI34_0_0HAVE_GOOGLE_MAPS

#import <Foundation/Foundation.h>
#import <GoogleMaps/GoogleMaps.h>
#import <ReactABI34_0_0/ABI34_0_0RCTBridge.h>
#import "ABI34_0_0AIRMapCoordinate.h"
#import "ABI34_0_0AIRGoogleMap.h"

@interface ABI34_0_0AIRGoogleMapOverlay : UIView

@property (nonatomic, strong) GMSGroundOverlay *overlay;
@property (nonatomic, copy) NSString *imageSrc;
@property (nonatomic, strong, readonly) UIImage *overlayImage;
@property (nonatomic, copy) NSArray *boundsRect;
@property (nonatomic, readonly) GMSCoordinateBounds *overlayBounds;

@property (nonatomic, weak) ABI34_0_0RCTBridge *bridge;

@end

#endif
