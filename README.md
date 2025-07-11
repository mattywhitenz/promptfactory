# Website Overlay Extension

A Chrome extension that allows you to display any website as an overlay frame on top of the current webpage.

## Features

- Toggle website overlays on any webpage
- Customizable overlay URL and opacity
- Draggable overlay frame
- Persistent settings across browser sessions
- Clean and modern UI

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
├── styles.css         # Styles for the overlay
├── icons/             # Extension icons
│   ├── icon.svg       # Source SVG icon
│   ├── icon16.png     # 16x16 toolbar icon
│   ├── icon48.png     # 48x48 icon
│   └── icon128.png    # 128x128 icon
├── generate_icons.sh  # Script to generate PNG icons from SVG
└── README.md          # This file
```

## Permissions

The extension requires the following permissions:
- `activeTab`: To inject the overlay into the current tab
- `storage`: To save user preferences

## Development

### Making Changes

1. Edit the relevant files
2. Reload the extension in `chrome://extensions/`
3. Test your changes

### Key Files

- **popup.js**: Handles the extension popup logic and user interactions
- **content.js**: Manages the overlay frame injection and behavior
- **styles.css**: Contains all styling for the overlay frame
- **background.js**: Handles extension lifecycle and messaging

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