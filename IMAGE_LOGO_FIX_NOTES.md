# Image and Logo Fix Notes

The originally uploaded logo image at `/home/ubuntu/upload/IMG_1069.webp` is a wide dark image containing the real 6+1 wordmark/artwork treatment. It is very low contrast when viewed directly, but it is the user-provided brand image.

The current app asset `/home/ubuntu/webdev-static-assets/six-plus-one-clean-stacked-logo.png` is a tall stacked white `6 + 1` mark. The user has repeatedly said not to use this stacked/text-style/fallback treatment for the loading page and left-side/top-left app logo. The fix should switch the loading animation and app logo to a web-project-safe URL generated from the actual uploaded image asset instead.

Participant photos are stored as `participants.profilePhotoUrl` and `profilePhotoKey`, but the public registration helper currently creates site-native participant rows without accepting/persisting a profile photo. The UI also only shows avatars in some surfaces, so a central robust `ProfilePhoto` helper and registration upload path should be used.

The reward/paid section has no image field in `reward_catalogue`; if the UI previously attempted remote imagery or blank URLs, the reliable fix is to render deterministic local visual tiles/monograms or add explicit stable image handling rather than broken `<img>` references. If actual product images are required later, the schema should gain a stored image URL/key and images should be uploaded through the web-project static asset/storage workflow.


## Additional uploaded screenshot inspection — May 06

`IMG_8843.PNG` is a mobile screenshot of the unauthenticated landing/entry page. It shows the intended dark grid poster system, a vertical 6+1 mark at the left edge, a gold register/login bar, and the challenge pitch with the fail cost shown as £25. It appears to be a styling/reference screenshot rather than a separate reward or participant image asset.

`IMG_8844.PNG` is a mobile screenshot of the authenticated My Day view. It confirms the desired left/top 6+1 logo placement and sharp poster hierarchy, but it is also a full-page reference screenshot rather than a standalone image that should be used inside reward cards or paid/payment records.
