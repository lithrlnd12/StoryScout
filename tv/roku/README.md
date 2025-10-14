# Story Scout - Roku App

TikTok-style vertical feed for discovering short films and trailers on Roku TV.

## ✨ Features

### **Feed Mode**
- ✅ **Vertical feed** with Up/Down navigation (YouTube Shorts style)
- ✅ **Genre filtering** with Left/Right navigation (10 genres)
- ✅ **Auto-playing muted trailers** with looping
- ✅ **51 curated films** from Internet Archive (public domain)
- ✅ **Engagement metrics** - likes, ratings, shares
- ✅ **Safe zone compliant UI** - Title safe & Action safe zones
- ✅ **10-foot viewing optimized** - Large fonts, proper spacing

### **Full-Screen Mode**
- ✅ **Immersive viewing** - All UI elements hide automatically
- ✅ **Full video playback** - Unmuted with native Roku controls
- ✅ **Toggle UI** - Press Up/Down to show/hide interface
- ✅ **Playback controls** - Play, Pause, Fast Forward, Rewind
- ✅ **No accidental scrolling** - Smart state management

### **Interactive Features**
- ✅ **Watch Party** - Synchronized viewing across Roku, mobile, and web
- ✅ **Star rating system** - Press * to rate films (1-5 stars)
- ✅ **Like functionality** - Heart icon with count
- ✅ **Share functionality** - Share icon with count
- ✅ **Genre pills** - Dynamic filtering with visual feedback

### **Watch Party (Cross-Platform)**
- ✅ **Create party on Roku** - Host watch sessions from TV
- ✅ **6-character join codes** - Easy sharing with friends
- ✅ **Real-time participant list** - See who's watching (Roku, mobile, web)
- ✅ **Synchronized playback** - Host controls start time for all viewers
- ✅ **Lobby system** - Wait for participants before starting
- ✅ **Platform indicators** - Icons show device type (📺 Roku, 📱 Mobile, 💻 Web)

## Development Setup

### Prerequisites
- Roku device with Developer Mode enabled
- Find your Roku IP: Settings → Network → About
- Developer credentials: Set during developer mode activation

### Project Structure
```
roku/
├── manifest                    # App configuration (version, icons, splash)
├── source/                     # BrightScript code
│   ├── main.brs               # Entry point, loads content
│   └── archive-content.json   # 51 films data (Internet Archive)
├── components/                 # SceneGraph XML components
│   ├── MainScene.xml          # UI layout (safe zone compliant)
│   └── MainScene.brs          # Main logic (feed, full-screen, rating)
└── images/                     # App branding assets
    ├── channel-poster_hd.png   # 540x405 (home screen icon)
    ├── channel-poster_sd.png   # 290x218 (SD icon)
    ├── splash-screen_hd.png    # 1280x720 (HD splash)
    └── splash-screen_sd.png    # 720x480 (SD splash)
```

## 📦 How to Package and Deploy

### Step 1: Create the ZIP package
```bash
cd /mnt/c/storyscout/tv/roku
python3 -m zipfile -c StoryScout.zip components/ images/ manifest source/
```

Or using zip:
```bash
zip -r StoryScout.zip manifest source components images
```

### Step 2: Upload to Roku
1. **Enable Developer Mode on your Roku:**
   - Press Home button 3 times
   - Press Up 2 times
   - Press Right, Left, Right, Left, Right
   - Set a developer password (remember this!)
   - Roku will reboot

2. **Find your Roku's IP address:**
   - Settings → Network → About
   - Note the IP address (e.g., `192.168.x.x`)

3. **Upload the app:**
   - Open browser: `http://<your-roku-ip>`
   - Login with username `rokudev` and your developer password
   - Under **"Development Application Installer"**:
     - Click **"Choose File"**
     - Select `StoryScout.zip`
     - Click **"Install"**
   - App will auto-launch after installation

### Step 3: Testing Checklist
**Feed Mode:**
- ✅ Browse videos with **Up/Down**
- ✅ Switch genres with **Left/Right**
- ✅ Watch trailers muted (auto-looping)
- ✅ Check genre pills change color
- ✅ Verify UI is within safe zones

**Full-Screen Mode:**
- ✅ Press **OK** to enter full-screen
- ✅ Verify all UI disappears
- ✅ Video plays unmuted with controls
- ✅ Test **Play/Pause/FF/Rewind**
- ✅ Press **Up/Down** to toggle UI
- ✅ Press **OK** or **Back** to exit

**Star Rating:**
- ✅ Press **\*** (asterisk) to open rating
- ✅ Verify "Star Rating Coming Soon!" message
- ✅ Message auto-dismisses after 2 seconds

## 🎮 Navigation Controls

### **Feed Mode (Default)**
| Button | Action |
|--------|--------|
| **↑ Up** | Previous video in feed |
| **↓ Down** | Next video in feed |
| **← Left** | Previous genre (cycles through) |
| **→ Right** | Next genre (cycles through) |
| **OK** | Enter full-screen watch mode |
| **\* (Asterisk)** | Open Watch Party menu |
| **Back** | Exit app |

### **Full-Screen Mode (After pressing OK)**
| Button | Action |
|--------|--------|
| **↑ Up / ↓ Down** | Toggle UI visibility (show/hide) |
| **OK** | Exit full-screen, return to feed |
| **Back** | Exit full-screen, return to feed |
| **Play** | Resume playback |
| **Pause** | Pause playback |
| **Fast Forward** | Skip forward 10 seconds |
| **Rewind** | Skip backward 10 seconds |

### **Watch Party Mode**
| Button | Action |
|--------|--------|
| **↑ Up / ↓ Down** | Navigate menu options |
| **OK** | Select menu option / Start party (host only) |
| **Back** | Close Watch Party menu/lobby |

### **UI States**
- **Feed Mode + UI Visible** → Default state, all controls visible
- **Full-Screen + UI Hidden** → Immersive viewing, just video
- **Full-Screen + UI Visible** → Watching with info overlay
- **Watch Party Lobby** → Waiting for participants, showing join code

## 🎬 Content Source

All videos are from **Internet Archive** (public domain):
- ✅ **51 curated films** across 10 genres
- ✅ **Direct MP4 URLs** - No API keys needed
- ✅ **Mix of classics and indie films**
- ✅ **Genres**: All, Comedy, Horror, Sci-Fi, Action, Drama, Animation, Family, Mystery, Documentary

### Content Data Format
Each film in `archive-content.json` includes:
```json
{
  "title": "Film Title",
  "genre": "Comedy",
  "synopsis": "Film description...",
  "trailerVideoId": "https://archive.org/download/...",
  "likes": 1234,
  "reviews": 56,
  "shares": 78
}
```

## 🔧 Troubleshooting

### Video Issues
**Video won't play:**
- ✅ Check Roku internet connection
- ✅ Verify Internet Archive URLs are accessible
- ✅ Test with a different video (Up/Down to browse)
- ✅ Check Roku logs: `http://<your-roku-ip>:8080/`

**Video is laggy/buffering:**
- ✅ Internet Archive servers may be slow
- ✅ Try a different film from the feed
- ✅ Check Roku network speed in Settings

### Installation Issues
**App won't install:**
- ✅ Ensure Developer Mode is enabled on Roku
- ✅ Verify IP address is correct (Settings → Network)
- ✅ Check ZIP file includes: `manifest`, `source/`, `components/`, `images/`
- ✅ Try rebooting Roku device

**"Invalid package" error:**
- ✅ Ensure `manifest` file is in root of ZIP (not nested in folder)
- ✅ Verify all file paths are relative (no absolute paths)
- ✅ Check manifest has proper formatting (no special characters)

**Silent crash (black screen):**
- ✅ Verify all images exist: `images/channel-poster_hd.png`, `splash-screen_hd.png`, etc.
- ✅ Check BrightScript syntax in `.brs` files
- ✅ Look for missing `then` keywords in if statements

### UI Issues
**Genre pills are cut off:**
- ✅ This means safe zones aren't being respected
- ✅ Verify `genreRow` translation is `[200, 118]` (within title safe)
- ✅ Check TV overscan settings (should be off)

**Text is too small:**
- ✅ Fonts are optimized for 10-foot viewing
- ✅ If still small, adjust TV zoom/picture settings
- ✅ Minimum font size is 22px (industry standard)

## 🎨 UI Design Specifications

### Roku Safe Zones (FHD 1920x1080)
- **Title Safe Zone**: 1534x866, offset (192, 106) - All text
- **Action Safe Zone**: 1726x970, offset (96, 53) - All interactive elements

### Key Measurements
```
Top Genre Bar:
- Background: Y=106, Height=70px
- Pills: Start at X=200, Y=118
- Pill Size: 160x50px
- Spacing: 20px between pills

Bottom Info Card:
- Position: X=200, Y=850
- Size: 700x180px
- Accent Line: 6px pink (#E91E63)

Right Action Bar:
- Position: X=1680, Y=380
- Icon Spacing: 150px vertical
- Width: 120px
```

### Color Palette
- **Background**: `#0F121A` (Dark Navy)
- **Primary Accent**: `#E91E63` (Pink/Magenta)
- **Secondary Accent**: `#00E5FF` (Cyan)
- **Pill Selected**: `#E91E63` (Pink)
- **Pill Unselected**: `#1F2937` (Dark Gray)
- **Text Primary**: `#FFFFFF` (White)
- **Text Secondary**: `#8B92A8` (Light Gray)
- **Text Tertiary**: `#D1D5DB` (Lighter Gray)

## 📋 Completed Features

- ✅ Vertical video feed with 51 films
- ✅ Genre filtering system (10 genres)
- ✅ Full-screen watch mode
- ✅ Toggle UI visibility
- ✅ Video playback controls
- ✅ **Cross-platform Watch Party** (Roku ↔ Mobile ↔ Web)
- ✅ Watch Party lobby with join codes
- ✅ Synchronized playback across devices
- ✅ Real-time participant tracking
- ✅ Star rating system (placeholder)
- ✅ Safe zone compliance
- ✅ 10-foot viewing optimization
- ✅ Brand icons and splash screens
- ✅ Internet Archive integration

## 🚀 Future Enhancements

- [ ] Join Watch Party from Roku (currently create-only)
- [ ] Implement full star rating UI (1-5 stars with selection)
- [ ] Add Firebase authentication
- [ ] Save user ratings to database
- [ ] Implement like/share functionality
- [ ] Add "Watch Later" list
- [ ] Search and filter features
- [ ] YouTube Creative Commons integration
- [ ] More content sources (Vimeo, etc.)
- [ ] Roku Channel Store submission
- [ ] Fire TV port

## 🎉 Watch Party Technical Details

### Architecture
- **Backend**: Firebase Cloud Functions (`us-central1-story-scout.cloudfunctions.net`)
- **Database**: Firestore real-time sync
- **Roku Implementation**: BrightScript Task nodes (background threading)
- **Communication**: RESTful HTTP with JSON

### Key Components
**Roku Files:**
- `components/WatchPartyTask.xml/brs` - Background HTTP operations
- `components/MainScene.xml/brs` - UI and lobby management

**API Endpoints:**
- `POST /createWatchParty` - Host creates party, returns join code
- `POST /joinWatchParty` - Participant joins with code
- `GET /getWatchParty?code=XXX` - Poll for party state updates
- `POST /updateWatchPartyState` - Host updates playback state

### Debugging
**Enable Roku logs:**
```powershell
# PowerShell (Windows)
$client = New-Object System.Net.Sockets.TcpClient('192.168.x.x', 8085)
$stream = $client.GetStream()
$reader = New-Object System.IO.StreamReader($stream)
while ($true) {
    $line = $reader.ReadLine()
    if ($line) { Write-Host $line }
}
```

**Common Issues:**
- **Font rendering**: Use default fonts or simple `color="0xFFFFFFFF"` format
- **Thread violations**: All HTTP must use Task nodes (not roUrlTransfer on render thread)
- **Label text not showing**: Check font is valid and color format is correct
- **Observer timing**: Set `observeField()` BEFORE setting input fields or `control="RUN"`
