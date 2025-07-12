# Website Overlay Extension

A Chrome extension that allows you to display any website as an overlay frame on top of the current webpage.

## Features

- Toggle website overlays on any webpage
- **Advanced iframe bypass** - Load sites that normally block embedding (Google, Facebook, etc.)
- Multiple bypass methods with fallback support
- Customizable overlay URL and security settings
- Draggable and resizable overlay frame
- Persistent settings across browser sessions
- Clean and modern UI with error handling
- User-controlled security bypass (can be disabled)

## Installation

### For Development

1. Clone this repository:
   ```bash
   git clone <your-repository-url>
   cd promptfactory
   ```

2. Generate the required icon files:
   ```bash
   # Install ImageMagick (macOS)
   brew install imagemagick
   
   # Generate icons
   ./generate_icons.sh
   ```
   
   Or manually replace the placeholder icons in the `icons/` directory with proper PNG files:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the project directory

## Usage

1. Click the extension icon in the Chrome toolbar
2. Enter the URL of the website you want to overlay
3. Adjust the opacity using the slider
4. Click "Toggle Overlay" to show/hide the overlay
5. When the overlay is visible, you can:
   - Drag it around by clicking and holding the header
   - Close it using the X button
   - Resize it by dragging the edges

## Project Structure

```
promptfactory/
├── manifest.json       # Extension configuration
├── background.js       # Service worker for extension lifecycle
├── popup.html          # Extension popup interface
├── popup.js           # Popup functionality
├── content.js         # Content script injected into web pages
├── overlay.html        # Extension overlay interface (loaded in iframe)
├── styles.css         # Fallback styles for the overlay container
├── rules.json         # declarativeNetRequest rules for header modification
├── icons/             # Extension icons
│   ├── icon.svg       # Source SVG icon
│   ├── icon16.png     # 16x16 toolbar icon
│   ├── icon48.png     # 48x48 icon
│   └── icon128.png    # 128x128 icon
├── generate_icons.sh  # Script to generate PNG icons from SVG
└── README.md          # This file
```

## Security Bypass Methods

This extension uses a **dual-iframe approach** combined with multiple bypass techniques:

### **Architecture Overview**
1. **Content Script** creates a container iframe that loads the extension's `overlay.html`
2. **Extension HTML** (`overlay.html`) creates a second iframe that loads the target website
3. This approach bypasses many restrictions since the extension HTML is trusted

### 1. **declarativeNetRequest API** (Primary Method)
- Removes `X-Frame-Options` headers
- Removes `Content-Security-Policy` headers  
- Chrome-approved method for Manifest V3

### 2. **CORS Proxy Fallback**
- Routes requests through proxy services
- Handles sites with extreme restrictions
- User-triggered fallback option

### 3. **Enhanced Iframe Configuration**
- Custom sandbox permissions
- Referrer policy modification
- Optimized loading attributes

### 4. **Dual-Iframe Isolation**
- Extension HTML acts as intermediary
- Reduces security conflicts
- Better compatibility with restrictive sites

### 5. **User Control**
- Bypass can be enabled/disabled per user preference
- Respects user privacy and security choices
- Clear feedback when sites fail to load

## Permissions

The extension requires the following permissions:
- `activeTab`: To inject the overlay into the current tab
- `storage`: To save user preferences
- `declarativeNetRequest`: To modify response headers for iframe bypass
- `host_permissions`: To apply header modifications across all sites

## Development

### Making Changes

1. Edit the relevant files
2. Reload the extension in `chrome://extensions/`
3. Test your changes

### Key Files

- **popup.js**: Handles the extension popup logic and user interactions
- **content.js**: Manages the overlay container injection and messaging
- **overlay.html**: Extension's overlay interface with website loading logic
- **styles.css**: Fallback styles for the overlay container
- **background.js**: Handles extension lifecycle and declarativeNetRequest rules
- **rules.json**: Defines header modification rules for iframe bypass

## Troubleshooting

### Icons not showing
Run `./generate_icons.sh` after installing ImageMagick, or manually add PNG icon files.

### Extension not loading
- Check the browser console for errors
- Ensure all files referenced in `manifest.json` exist
- Verify the manifest version is compatible with your Chrome version

### Overlay not appearing
- Check if the website has Content Security Policy restrictions
- Look for errors in the page console (F12)
- Ensure the extension has permission to run on the current page

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license here]

## TODO

- [ ] Add ability to save multiple overlay presets
- [ ] Implement keyboard shortcuts
- [ ] Add option to remember overlay position
- [ ] Support for multiple overlays
- [ ] Dark mode support 