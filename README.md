# soundcloud-downloadall-helper

## Preface

If you happen to be in the oddly-specific situation where you often have private SoundCloud playlists with lots of downloadable private tracks, but you're too lazy to click on each and every download button, you're in the right place.

I mean, why spend 15 seconds on manual labor when you can spend weeks researching and writing a script instead?!

Ok but to be clear, **this is NOT a piracy tool to download or "rip" Soundcloud tracks that you don't have access and download permissions for** - the uploader **must have** enabled downloads and you **must have** access to the track/playlist.\
This is a convenience script to help you automatically generate and/or open direct download links of download-enabled tracks by use of SoundCloud's API. 

![Individual download buttons vs Download all button](https://user-images.githubusercontent.com/16717153/156406096-de39a2b2-19ae-4fc5-a1ac-448d7d97c881.png)

## Details

- Automatically searches for Client ID in SoundCloud's cross-origin scripts as opposed to inspecting network requests for it
- Uses SoundCloud's undocumented internal v2 API
- Uses `window.__sc_hydration` information

## Usage

1. Visit a private SoundCloud playlist containing **download-enabled** private tracks in your browser
2. Copy, paste, and enter the contents of `soundcloud-downloadall-helper.js` into your browser console (F12)
3. Click on the new "Download all" button

All download links are logged to the console, and should also open in new tabs/windows (depending on your browser's configuration).\
You may need to unblock pop-ups for the opening of new tabs/windows to work.

## Future Considerations

- Support public playlists with downloadable public tracks
- Tampermonkey/Greasemonkey script
- Find better way of downloading multiple files using a single action
- Proper error handling
